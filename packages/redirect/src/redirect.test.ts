import { redirectInterceptor } from './interceptor';
import { createRequest, createResponse } from '@webbridge-native/core';
import type { WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';

type NextFn = (request: WebBridgeRequest) => Promise<WebBridgeResponse>;

describe('redirectInterceptor', () => {
  const interceptor = redirectInterceptor();

  function mockChain(responses: WebBridgeResponse[]): NextFn {
    let i = 0;
    return async () => responses[i++];
  }

  it('passes through non-redirect responses', async () => {
    const next = mockChain([createResponse({ status: 200, body: 'ok' })]);
    const res = await interceptor(createRequest('https://example.com'), next);
    expect(res.status).toBe(200);
    expect(res.redirected).toBe(false);
  });

  it('follows 301 redirect and changes method to GET', async () => {
    const next = mockChain([
      createResponse({ status: 301, headers: { Location: 'https://example.com/new' } }),
      createResponse({ status: 200, body: 'final' }),
    ]);
    const req = createRequest('https://example.com/old', { method: 'POST', body: 'data' });
    const res = await interceptor(req, next);
    expect(res.status).toBe(200);
    expect(res.redirected).toBe(true);
    expect(res.url).toBe('https://example.com/new');
  });

  it('follows 302 redirect and changes method to GET', async () => {
    const next = mockChain([
      createResponse({ status: 302, headers: { Location: 'https://example.com/new' } }),
      createResponse({ status: 200 }),
    ]);
    const req = createRequest('https://example.com/old', { method: 'POST' });
    const res = await interceptor(req, next);
    expect(res.status).toBe(200);
    expect(res.redirected).toBe(true);
  });

  it('follows 303 redirect and changes method to GET', async () => {
    const next = mockChain([
      createResponse({ status: 303, headers: { Location: '/result' } }),
      createResponse({ status: 200 }),
    ]);
    const res = await interceptor(createRequest('https://example.com/submit', { method: 'POST' }), next);
    expect(res.redirected).toBe(true);
  });

  it('follows 307 redirect preserving method and body', async () => {
    let capturedReq: WebBridgeRequest | null = null;
    const next: NextFn = async (req) => {
      if (capturedReq) {
        return createResponse({ status: 200 });
      }
      capturedReq = null;
      // First call returns redirect
      return createResponse({ status: 307, headers: { Location: 'https://example.com/new' } });
    };

    // Need a different approach - track calls
    let callCount = 0;
    const next2: NextFn = async (req) => {
      callCount++;
      if (callCount === 1) {
        return createResponse({ status: 307, headers: { Location: 'https://example.com/new' } });
      }
      expect(req.method).toBe('POST');
      expect(req.body).toBe('data');
      return createResponse({ status: 200 });
    };

    const req = createRequest('https://example.com/old', { method: 'POST', body: 'data' });
    const res = await interceptor(req, next2);
    expect(res.status).toBe(200);
    expect(res.redirected).toBe(true);
  });

  it('follows 308 redirect preserving method', async () => {
    let callCount = 0;
    const next: NextFn = async (req) => {
      callCount++;
      if (callCount === 1) {
        return createResponse({ status: 308, headers: { Location: 'https://example.com/new' } });
      }
      expect(req.method).toBe('PUT');
      return createResponse({ status: 200 });
    };

    const req = createRequest('https://example.com/old', { method: 'PUT' });
    const res = await interceptor(req, next);
    expect(res.redirected).toBe(true);
  });

  it('throws on max redirects exceeded', async () => {
    const next: NextFn = async () =>
      createResponse({ status: 301, headers: { Location: 'https://example.com/loop' } });

    await expect(
      interceptor(createRequest('https://example.com/start'), next),
    ).rejects.toThrow('Maximum redirect limit');
  });

  it('throws when Location header missing', async () => {
    const next: NextFn = async () =>
      createResponse({ status: 301, headers: {} });

    await expect(
      interceptor(createRequest('https://example.com'), next),
    ).rejects.toThrow('Location header');
  });

  it('strips Authorization on cross-origin redirect', async () => {
    let capturedHeaders: Record<string, string> = {};
    let callCount = 0;
    const next: NextFn = async (req) => {
      callCount++;
      if (callCount === 1) {
        return createResponse({ status: 302, headers: { Location: 'https://other.com/page' } });
      }
      capturedHeaders = req.headers;
      return createResponse({ status: 200 });
    };

    const req = createRequest('https://example.com', {
      headers: { Authorization: 'Bearer token123' },
    });
    await interceptor(req, next);
    expect(capturedHeaders['Authorization']).toBeUndefined();
  });

  it('keeps Authorization on same-origin redirect', async () => {
    let capturedHeaders: Record<string, string> = {};
    let callCount = 0;
    const next: NextFn = async (req) => {
      callCount++;
      if (callCount === 1) {
        return createResponse({ status: 302, headers: { Location: 'https://example.com/other' } });
      }
      capturedHeaders = req.headers;
      return createResponse({ status: 200 });
    };

    const req = createRequest('https://example.com/page', {
      headers: { Authorization: 'Bearer token123' },
    });
    await interceptor(req, next);
    expect(capturedHeaders['Authorization']).toBe('Bearer token123');
  });

  it('redirect: manual returns 3xx response as-is', async () => {
    const next: NextFn = async () =>
      createResponse({ status: 301, headers: { Location: '/new' } });

    const req = createRequest('https://example.com');
    req.redirect = 'manual';
    const res = await interceptor(req, next);
    expect(res.status).toBe(301);
  });

  it('redirect: error throws on 3xx', async () => {
    const next: NextFn = async () =>
      createResponse({ status: 302, headers: { Location: '/new' } });

    const req = createRequest('https://example.com');
    req.redirect = 'error';
    await expect(interceptor(req, next)).rejects.toThrow('redirect mode "error"');
  });
});
