import { cookieInterceptor } from './interceptor';
import { createResponse } from '@webbridge-native/core';
import type { WebBridgeRequest, WebBridgeResponse, Interceptor } from '@webbridge-native/core';

function createTestRequest(url: string): WebBridgeRequest {
  return {
    id: 'test-1',
    url,
    method: 'GET',
    headers: {},
    body: null,
  };
}

describe('cookieInterceptor error handling', () => {
  it('wraps getCookieHeader errors with context', async () => {
    const faultyJar = {
      getCookieHeader: async () => {
        throw new Error('storage corrupted');
      },
      setCookie: async () => {},
      dispose: () => {},
    };

    const interceptor = cookieInterceptor({ jar: faultyJar as any });
    const next = async (req: WebBridgeRequest) =>
      createResponse({ status: 200 });

    const request = createTestRequest('https://api.example.com/test');

    await expect(interceptor(request, next)).rejects.toThrow(
      '[WebBridge Cookie] Failed to get cookie header for https://api.example.com/test: storage corrupted',
    );
  });

  it('wraps setCookie errors with context', async () => {
    const faultyJar = {
      getCookieHeader: async () => '',
      setCookie: async () => {
        throw new Error('write failed');
      },
      dispose: () => {},
    };

    const interceptor = cookieInterceptor({ jar: faultyJar as any });
    const next = async (req: WebBridgeRequest) =>
      createResponse({
        status: 200,
        headers: { 'Set-Cookie': 'test=value; Path=/' },
      });

    const request = createTestRequest('https://api.example.com/test');

    await expect(interceptor(request, next)).rejects.toThrow(
      '[WebBridge Cookie] Failed to set cookie from https://api.example.com/test: write failed',
    );
  });

  it('works normally when jar operates correctly', async () => {
    let storedCookies: string[] = [];

    const jar = {
      getCookieHeader: async () => 'session=abc',
      setCookie: async (header: string) => {
        storedCookies.push(header);
      },
      dispose: () => {},
    };

    const interceptor = cookieInterceptor({ jar: jar as any });
    let capturedCookieHeader = '';

    const next = async (req: WebBridgeRequest) => {
      capturedCookieHeader = req.headers['Cookie'] ?? '';
      return createResponse({
        status: 200,
        headers: { 'Set-Cookie': 'new=value; Path=/' },
      });
    };

    const request = createTestRequest('https://api.example.com/test');
    const response = await interceptor(request, next);

    expect(response.status).toBe(200);
    expect(capturedCookieHeader).toBe('session=abc');
    expect(storedCookies).toContain('new=value; Path=/');
  });
});
