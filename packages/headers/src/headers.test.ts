import { headerInterceptor } from './interceptor';
import { buildUserAgent } from './user-agent';
import type { WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';
import { createRequest, createResponse } from '@webbridge-native/core';

const mockNext = async (req: WebBridgeRequest): Promise<WebBridgeResponse> => {
  return createResponse({ status: 200, body: JSON.stringify(req.headers) });
};

async function getInjectedHeaders(
  options?: Parameters<typeof headerInterceptor>[0],
  existingHeaders?: Record<string, string>,
): Promise<Record<string, string>> {
  const interceptor = headerInterceptor(options);
  const request = createRequest('https://example.com/', {
    headers: existingHeaders,
  });
  const response = await interceptor(request, mockNext);
  return JSON.parse(response.body as string);
}

describe('buildUserAgent', () => {
  it('returns browser-like UA', () => {
    const ua = buildUserAgent('browser-like');
    expect(ua).toContain('Mozilla');
    expect(ua).toContain('WebBridgeNative');
  });

  it('returns native UA', () => {
    const ua = buildUserAgent('native');
    expect(ua).toBe('WebBridgeNative/0.1');
  });

  it('returns custom string as-is', () => {
    const ua = buildUserAgent('MyApp/2.0');
    expect(ua).toBe('MyApp/2.0');
  });
});

describe('headerInterceptor', () => {
  it('injects default headers', async () => {
    const headers = await getInjectedHeaders();
    expect(headers['User-Agent']).toContain('Mozilla');
    expect(headers['Accept-Language']).toBe('en-US,en;q=0.9');
    expect(headers['Accept-Encoding']).toBe('gzip, deflate');
    expect(headers['Accept']).toContain('text/html');
  });

  it('does not overwrite existing headers', async () => {
    const headers = await getInjectedHeaders({}, {
      'User-Agent': 'CustomAgent',
      'Accept-Language': 'ko-KR',
    });
    expect(headers['User-Agent']).toBe('CustomAgent');
    expect(headers['Accept-Language']).toBe('ko-KR');
  });

  it('respects userAgent: false', async () => {
    const headers = await getInjectedHeaders({ userAgent: false });
    expect(headers['User-Agent']).toBeUndefined();
  });

  it('respects userAgent: native', async () => {
    const headers = await getInjectedHeaders({ userAgent: 'native' });
    expect(headers['User-Agent']).toBe('WebBridgeNative/0.1');
  });

  it('respects custom userAgent string', async () => {
    const headers = await getInjectedHeaders({ userAgent: 'MyApp/3.0' });
    expect(headers['User-Agent']).toBe('MyApp/3.0');
  });

  it('respects acceptLanguage: false', async () => {
    const headers = await getInjectedHeaders({ acceptLanguage: false });
    expect(headers['Accept-Language']).toBeUndefined();
  });

  it('respects custom acceptLanguage string', async () => {
    const headers = await getInjectedHeaders({ acceptLanguage: 'ja-JP' });
    expect(headers['Accept-Language']).toBe('ja-JP');
  });

  it('respects acceptEncoding: false', async () => {
    const headers = await getInjectedHeaders({ acceptEncoding: false });
    expect(headers['Accept-Encoding']).toBeUndefined();
  });

  it('injects Origin when specified', async () => {
    const headers = await getInjectedHeaders({ origin: 'https://myapp.local' });
    expect(headers['Origin']).toBe('https://myapp.local');
  });

  it('does not inject Origin by default', async () => {
    const headers = await getInjectedHeaders();
    expect(headers['Origin']).toBeUndefined();
  });

  it('respects origin: false', async () => {
    const headers = await getInjectedHeaders({ origin: false });
    expect(headers['Origin']).toBeUndefined();
  });

  it('calls next and returns response', async () => {
    const interceptor = headerInterceptor();
    const request = createRequest('https://example.com/');
    const response = await interceptor(request, async () =>
      createResponse({ status: 201 }),
    );
    expect(response.status).toBe(201);
  });
});
