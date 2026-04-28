import { checkCorsHeaders, isSimpleRequest } from './cors-check';
import { corsInterceptor } from './interceptor';
import { createRequest, createResponse } from '@webbridge-native/core';
import type { WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';

type NextFn = (request: WebBridgeRequest) => Promise<WebBridgeResponse>;

describe('isSimpleRequest', () => {
  it('GET with no custom headers is simple', () => {
    expect(isSimpleRequest('GET', {})).toBe(true);
  });

  it('POST with text/plain is simple', () => {
    expect(isSimpleRequest('POST', { 'Content-Type': 'text/plain' })).toBe(true);
  });

  it('PUT is not simple', () => {
    expect(isSimpleRequest('PUT', {})).toBe(false);
  });

  it('DELETE is not simple', () => {
    expect(isSimpleRequest('DELETE', {})).toBe(false);
  });

  it('POST with application/json is not simple', () => {
    expect(isSimpleRequest('POST', { 'Content-Type': 'application/json' })).toBe(false);
  });

  it('GET with Authorization is not simple', () => {
    expect(isSimpleRequest('GET', { Authorization: 'Bearer token' })).toBe(false);
  });
});

describe('checkCorsHeaders', () => {
  it('allows with matching origin', () => {
    const result = checkCorsHeaders(
      'https://myapp.local', 'GET', {},
      { 'Access-Control-Allow-Origin': 'https://myapp.local' },
    );
    expect(result.allowed).toBe(true);
  });

  it('allows with wildcard origin', () => {
    const result = checkCorsHeaders(
      'https://myapp.local', 'GET', {},
      { 'Access-Control-Allow-Origin': '*' },
    );
    expect(result.allowed).toBe(true);
  });

  it('blocks with missing ACAO header', () => {
    const result = checkCorsHeaders('https://myapp.local', 'GET', {}, {});
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Missing');
  });

  it('blocks with wrong origin', () => {
    const result = checkCorsHeaders(
      'https://myapp.local', 'GET', {},
      { 'Access-Control-Allow-Origin': 'https://other.com' },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not allowed');
  });

  it('blocks wildcard with credentials', () => {
    const result = checkCorsHeaders(
      'https://myapp.local', 'GET', {},
      { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': 'true' },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('credentials');
  });

  it('blocks non-simple method without Allow-Methods', () => {
    const result = checkCorsHeaders(
      'https://myapp.local', 'DELETE', {},
      { 'Access-Control-Allow-Origin': '*' },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('DELETE');
  });

  it('allows non-simple method with matching Allow-Methods', () => {
    const result = checkCorsHeaders(
      'https://myapp.local', 'DELETE', {},
      { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, DELETE' },
    );
    expect(result.allowed).toBe(true);
  });

  it('blocks non-simple header without Allow-Headers', () => {
    const result = checkCorsHeaders(
      'https://myapp.local', 'GET', { 'X-Custom': 'value' },
      { 'Access-Control-Allow-Origin': '*' },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('X-Custom');
  });

  it('allows non-simple header with matching Allow-Headers', () => {
    const result = checkCorsHeaders(
      'https://myapp.local', 'GET', { 'X-Custom': 'value' },
      { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Custom' },
    );
    expect(result.allowed).toBe(true);
  });
});

describe('corsInterceptor', () => {
  it('passes same-origin requests through', async () => {
    const interceptor = corsInterceptor({ origin: 'https://example.com' });
    const next: NextFn = async () => createResponse({ status: 200 });
    const res = await interceptor(createRequest('https://example.com/api'), next);
    expect(res.status).toBe(200);
  });

  it('warn mode allows cross-origin but logs warning', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const interceptor = corsInterceptor({ origin: 'https://myapp.local', mode: 'warn' });
    const next: NextFn = async () => createResponse({ status: 200, headers: {} });

    const res = await interceptor(createRequest('https://api.other.com/data'), next);
    expect(res.status).toBe(200);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[CORS]'));
    warnSpy.mockRestore();
  });

  it('enforce mode throws on CORS violation', async () => {
    const interceptor = corsInterceptor({ origin: 'https://myapp.local', mode: 'enforce' });
    const next: NextFn = async () => createResponse({ status: 200, headers: {} });

    await expect(
      interceptor(createRequest('https://api.other.com/data'), next),
    ).rejects.toThrow('[CORS]');
  });

  it('enforce mode allows with proper CORS headers', async () => {
    const interceptor = corsInterceptor({ origin: 'https://myapp.local', mode: 'enforce' });
    const next: NextFn = async () =>
      createResponse({ status: 200, headers: { 'Access-Control-Allow-Origin': 'https://myapp.local' } });

    const res = await interceptor(createRequest('https://api.other.com/data'), next);
    expect(res.status).toBe(200);
  });
});
