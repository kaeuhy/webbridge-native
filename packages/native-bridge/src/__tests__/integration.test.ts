/**
 * Integration tests — native-bridge가 core, mock 패키지와 올바르게 통합되는지 검증.
 * Native 모듈 없이 JS-only 폴백 모드에서 테스트.
 */
import { WebBridgeClient, createRequest, createResponse } from '@webbridge-native/core';
import type { Interceptor, WebBridgeResponse } from '@webbridge-native/core';
import { MockServer, http, HttpResponse } from '@webbridge-native/mock';
import { createNativeBridgeInterceptor } from '../native-bridge-interceptor';

// Mock native module as unavailable
jest.mock('../NativeWebBridge', () => ({ default: null }));
jest.mock('react-native', () => ({
  TurboModuleRegistry: { get: () => null },
  NativeEventEmitter: jest.fn(),
}));

// Mock globalThis.fetch
const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;

function createMockFetchResponse(
  body: string,
  init?: { status?: number; headers?: Record<string, string> },
): Response {
  const status = init?.status ?? 200;
  const headers = new Headers(init?.headers ?? {});
  return {
    url: '',
    status,
    statusText: status === 200 ? 'OK' : '',
    ok: status >= 200 && status < 300,
    redirected: false,
    headers,
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('integration: WebBridgeClient + native-bridge interceptor', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should work as terminal interceptor in client chain', async () => {
    const server = new MockServer([
      http.get('https://api.example.com/users', () =>
        HttpResponse.json([{ id: 1, name: 'Alice' }]),
      ),
    ]);
    server.listen();

    const client = new WebBridgeClient();
    const bridge = createNativeBridgeInterceptor({ mockServer: server });
    client.use(bridge);

    const response = await client.fetch('https://api.example.com/users');
    expect(response.status).toBe(200);
    const body = JSON.parse(response.body as string);
    expect(body).toEqual([{ id: 1, name: 'Alice' }]);

    server.close();
    bridge.dispose();
  });

  it('should chain with other interceptors (headers, cookies)', async () => {
    const server = new MockServer([
      http.get('https://api.example.com/me', ({ request }) => {
        return HttpResponse.json({
          ua: request.headers['User-Agent'] || 'none',
          cookie: request.headers['Cookie'] || 'none',
        });
      }),
    ]);
    server.listen();

    // 간단한 헤더 인터셉터
    const headerInterceptor: Interceptor = async (req, next) => {
      req.headers['User-Agent'] = 'WebBridgeNative/0.3';
      return next(req);
    };

    // 간단한 쿠키 인터셉터
    const cookieInterceptor: Interceptor = async (req, next) => {
      req.headers['Cookie'] = 'session=abc123';
      return next(req);
    };

    const client = new WebBridgeClient();
    const bridge = createNativeBridgeInterceptor({ mockServer: server });

    client.use(headerInterceptor);
    client.use(cookieInterceptor);
    client.use(bridge); // terminal

    const response = await client.fetch('https://api.example.com/me');
    const body = JSON.parse(response.body as string);
    expect(body.ua).toBe('WebBridgeNative/0.3');
    expect(body.cookie).toBe('session=abc123');

    server.close();
    bridge.dispose();
  });

  it('should pass through to real network for unmatched requests', async () => {
    const server = new MockServer([
      http.get('https://api.example.com/mock', () =>
        HttpResponse.json({ source: 'mock' }),
      ),
    ]);
    server.listen();

    mockFetch.mockResolvedValue(
      createMockFetchResponse('{"source":"network"}'),
    );

    const client = new WebBridgeClient();
    const bridge = createNativeBridgeInterceptor({ mockServer: server });
    client.use(bridge);

    // Mock 매칭됨
    const r1 = await client.fetch('https://api.example.com/mock');
    expect(JSON.parse(r1.body as string).source).toBe('mock');
    expect(mockFetch).not.toHaveBeenCalled();

    // Mock 매칭 안 됨 → 실제 네트워크
    const r2 = await client.fetch('https://api.example.com/real');
    expect(JSON.parse(r2.body as string).source).toBe('network');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    server.close();
    bridge.dispose();
  });

  it('should support runtime handler management', async () => {
    const server = new MockServer([
      http.get('https://api.example.com/users', () =>
        HttpResponse.json({ count: 0 }),
      ),
    ]);
    server.listen();

    const client = new WebBridgeClient();
    const bridge = createNativeBridgeInterceptor({ mockServer: server });
    client.use(bridge);

    // 초기 핸들러
    const r1 = await client.fetch('https://api.example.com/users');
    expect(JSON.parse(r1.body as string).count).toBe(0);

    // 런타임 핸들러 추가 (우선순위 높음)
    server.use(
      http.get('https://api.example.com/users', () =>
        HttpResponse.json({ count: 42 }),
      ),
    );

    const r2 = await client.fetch('https://api.example.com/users');
    expect(JSON.parse(r2.body as string).count).toBe(42);

    // 런타임 핸들러 리셋 → 초기 핸들러로 복원
    server.resetHandlers();

    const r3 = await client.fetch('https://api.example.com/users');
    expect(JSON.parse(r3.body as string).count).toBe(0); // 초기 핸들러

    server.close();
    bridge.dispose();
  });

  it('should handle error responses', async () => {
    const server = new MockServer([
      http.get('https://api.example.com/fail', () =>
        HttpResponse.json({ error: 'not found' }, { status: 404 }),
      ),
      http.post('https://api.example.com/error', () =>
        HttpResponse.error(),
      ),
    ]);
    server.listen();

    const client = new WebBridgeClient();
    const bridge = createNativeBridgeInterceptor({ mockServer: server });
    client.use(bridge);

    const r1 = await client.fetch('https://api.example.com/fail');
    expect(r1.status).toBe(404);
    expect(r1.ok).toBe(false);

    const r2 = await client.fetch('https://api.example.com/error', {
      method: 'POST',
    });
    expect(r2.type).toBe('error');

    server.close();
    bridge.dispose();
  });

  it('should support all HTTP methods', async () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
    const handlers = methods.map((method) =>
      http[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch'](
        'https://api.example.com/resource',
        () => HttpResponse.json({ method }),
      ),
    );

    const server = new MockServer(handlers);
    server.listen();

    const client = new WebBridgeClient();
    const bridge = createNativeBridgeInterceptor({ mockServer: server });
    client.use(bridge);

    for (const method of methods) {
      const response = await client.fetch('https://api.example.com/resource', {
        method,
      });
      const body = JSON.parse(response.body as string);
      expect(body.method).toBe(method);
    }

    server.close();
    bridge.dispose();
  });
});

describe('integration: stress test', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should handle 50 concurrent requests', async () => {
    const server = new MockServer([
      http.get('https://api.example.com/items/:id', ({ params }) =>
        HttpResponse.json({ id: params.id }),
      ),
    ]);
    server.listen();

    const client = new WebBridgeClient();
    const bridge = createNativeBridgeInterceptor({ mockServer: server });
    client.use(bridge);

    const promises = Array.from({ length: 50 }, (_, i) =>
      client.fetch(`https://api.example.com/items/${i}`),
    );

    const responses = await Promise.all(promises);

    expect(responses).toHaveLength(50);
    for (let i = 0; i < 50; i++) {
      const body = JSON.parse(responses[i].body as string);
      expect(body.id).toBe(String(i));
    }

    server.close();
    bridge.dispose();
  });

  it('should handle mixed mock and passthrough requests concurrently', async () => {
    const server = new MockServer([
      http.get('https://api.example.com/mock/:id', ({ params }) =>
        HttpResponse.json({ source: 'mock', id: params.id }),
      ),
    ]);
    server.listen();

    mockFetch.mockImplementation(async (url) => {
      return createMockFetchResponse(
        JSON.stringify({ source: 'network', url: String(url) }),
      );
    });

    const client = new WebBridgeClient();
    const bridge = createNativeBridgeInterceptor({ mockServer: server });
    client.use(bridge);

    const promises: Promise<WebBridgeResponse>[] = [];
    for (let i = 0; i < 25; i++) {
      promises.push(client.fetch(`https://api.example.com/mock/${i}`));
      promises.push(client.fetch(`https://api.example.com/real/${i}`));
    }

    const responses = await Promise.all(promises);
    expect(responses).toHaveLength(50);

    let mockCount = 0;
    let networkCount = 0;
    for (const r of responses) {
      const body = JSON.parse(r.body as string);
      if (body.source === 'mock') mockCount++;
      if (body.source === 'network') networkCount++;
    }
    expect(mockCount).toBe(25);
    expect(networkCount).toBe(25);

    server.close();
    bridge.dispose();
  });
});
