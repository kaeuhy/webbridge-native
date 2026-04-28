import { createNativeBridgeInterceptor } from '../native-bridge-interceptor';
import type { WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';
import { createRequest, createResponse } from '@webbridge-native/core';
import { MockServer, http, HttpResponse } from '@webbridge-native/mock';

// Mock globalThis.fetch
const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;

// NativeWebBridge TurboModule은 테스트에서 null (폴백 모드)
jest.mock('../NativeWebBridge', () => ({ default: null }));
jest.mock('react-native', () => ({
  TurboModuleRegistry: { get: () => null },
  NativeEventEmitter: jest.fn(),
}));

function createMockFetchResponse(
  body: string,
  init?: { status?: number; headers?: Record<string, string> },
): Response {
  const status = init?.status ?? 200;
  const headers = new Headers(init?.headers ?? { 'Content-Type': 'application/json' });
  return {
    url: '',
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    ok: status >= 200 && status < 300,
    redirected: false,
    headers,
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('createNativeBridgeInterceptor', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('fallback mode (no native module)', () => {
    it('should fall back to globalThis.fetch when native module unavailable', async () => {
      mockFetch.mockResolvedValue(
        createMockFetchResponse('{"users":[]}'),
      );

      const interceptor = createNativeBridgeInterceptor();
      const request = createRequest('https://api.example.com/users');
      const next = jest.fn();

      const response = await interceptor(request, next);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(response.status).toBe(200);
      expect(response.body).toBe('{"users":[]}');
      expect(next).not.toHaveBeenCalled();

      interceptor.dispose();
    });

    it('should match mock handlers in fallback mode', async () => {
      const server = new MockServer([
        http.get('https://api.example.com/users', () =>
          HttpResponse.json({ users: ['Alice', 'Bob'] }),
        ),
      ]);
      server.listen();

      const interceptor = createNativeBridgeInterceptor({
        mockServer: server,
      });
      const request = createRequest('https://api.example.com/users');
      const next = jest.fn();

      const response = await interceptor(request, next);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(JSON.parse(response.body as string)).toEqual({
        users: ['Alice', 'Bob'],
      });

      server.close();
      interceptor.dispose();
    });

    it('should fall through to fetch for unmatched requests', async () => {
      const server = new MockServer([
        http.get('https://api.example.com/users', () =>
          HttpResponse.json({ users: [] }),
        ),
      ]);
      server.listen();

      mockFetch.mockResolvedValue(
        createMockFetchResponse('{"posts":[]}'),
      );

      const interceptor = createNativeBridgeInterceptor({
        mockServer: server,
      });
      // 매칭되지 않는 URL
      const request = createRequest('https://api.example.com/posts');
      const next = jest.fn();

      const response = await interceptor(request, next);

      expect(mockFetch).toHaveBeenCalled();
      expect(response.body).toBe('{"posts":[]}');

      server.close();
      interceptor.dispose();
    });

    it('should use custom requestHandler when provided', async () => {
      const customHandler = jest.fn().mockResolvedValue(
        createResponse({
          status: 200,
          body: 'custom response',
          headers: { 'X-Custom': 'true' },
        }),
      );

      const interceptor = createNativeBridgeInterceptor({
        requestHandler: customHandler,
      });
      const request = createRequest('https://api.example.com/custom');
      const next = jest.fn();

      const response = await interceptor(request, next);

      expect(customHandler).toHaveBeenCalledWith(request);
      expect(response.body).toBe('custom response');
      expect(response.headers['X-Custom']).toBe('true');

      interceptor.dispose();
    });

    it('should prioritize custom handler over MockServer', async () => {
      const server = new MockServer([
        http.get('https://api.example.com/data', () =>
          HttpResponse.json({ source: 'mock' }),
        ),
      ]);
      server.listen();

      const customHandler = jest.fn().mockResolvedValue(
        createResponse({ status: 200, body: '{"source":"custom"}' }),
      );

      const interceptor = createNativeBridgeInterceptor({
        mockServer: server,
        requestHandler: customHandler,
      });
      const request = createRequest('https://api.example.com/data');
      const next = jest.fn();

      const response = await interceptor(request, next);
      expect(response.body).toBe('{"source":"custom"}');

      server.close();
      interceptor.dispose();
    });

    it('should throw when fallback is disabled and no handler matches', async () => {
      const interceptor = createNativeBridgeInterceptor({
        fallbackToFetch: false,
      });
      const request = createRequest('https://api.example.com/nope');
      const next = jest.fn();

      await expect(interceptor(request, next)).rejects.toThrow(
        'No handler for GET https://api.example.com/nope',
      );

      interceptor.dispose();
    });

    it('should pass signal to globalThis.fetch', async () => {
      const controller = new AbortController();
      mockFetch.mockResolvedValue(createMockFetchResponse('ok'));

      const interceptor = createNativeBridgeInterceptor();
      const request = createRequest('https://api.example.com/data', {
        signal: controller.signal,
      });
      const next = jest.fn();

      await interceptor(request, next);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ signal: controller.signal }),
      );

      interceptor.dispose();
    });

    it('should handle POST with body', async () => {
      const server = new MockServer([
        http.post('https://api.example.com/users', ({ request }) =>
          HttpResponse.json({ created: true }),
        ),
      ]);
      server.listen();

      const interceptor = createNativeBridgeInterceptor({
        mockServer: server,
      });
      const request = createRequest('https://api.example.com/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name":"Alice"}',
      });
      const next = jest.fn();

      const response = await interceptor(request, next);
      expect(response.status).toBe(200);
      expect(JSON.parse(response.body as string)).toEqual({ created: true });

      server.close();
      interceptor.dispose();
    });

    it('should handle inactive mock server (bypass to fetch)', async () => {
      const server = new MockServer([
        http.get('https://api.example.com/users', () =>
          HttpResponse.json({ users: [] }),
        ),
      ]);
      // NOT calling server.listen() — inactive

      mockFetch.mockResolvedValue(
        createMockFetchResponse('{"from":"network"}'),
      );

      const interceptor = createNativeBridgeInterceptor({
        mockServer: server,
      });
      const request = createRequest('https://api.example.com/users');
      const next = jest.fn();

      const response = await interceptor(request, next);
      expect(mockFetch).toHaveBeenCalled();
      expect(response.body).toBe('{"from":"network"}');

      interceptor.dispose();
    });
  });

  describe('dispose', () => {
    it('should be callable multiple times without error', () => {
      const interceptor = createNativeBridgeInterceptor();
      expect(() => {
        interceptor.dispose();
        interceptor.dispose();
      }).not.toThrow();
    });
  });

  describe('path params and wildcards in mock', () => {
    it('should match path params in fallback mode', async () => {
      const server = new MockServer([
        http.get('https://api.example.com/users/:id', ({ params }) =>
          HttpResponse.json({ id: params.id, name: 'User' }),
        ),
      ]);
      server.listen();

      const interceptor = createNativeBridgeInterceptor({
        mockServer: server,
      });
      const request = createRequest('https://api.example.com/users/42');
      const next = jest.fn();

      const response = await interceptor(request, next);
      const body = JSON.parse(response.body as string);
      expect(body.id).toBe('42');
      expect(body.name).toBe('User');

      server.close();
      interceptor.dispose();
    });

    it('should match wildcards in fallback mode', async () => {
      const server = new MockServer([
        http.get('https://cdn.example.com/*', () =>
          HttpResponse.text('asset data'),
        ),
      ]);
      server.listen();

      const interceptor = createNativeBridgeInterceptor({
        mockServer: server,
      });
      const request = createRequest(
        'https://cdn.example.com/images/logo.png',
      );
      const next = jest.fn();

      const response = await interceptor(request, next);
      expect(response.body).toBe('asset data');

      server.close();
      interceptor.dispose();
    });
  });
});
