// @webbridge-native/preset
// Tier 1 convenience bundle for WebBridge Native

import { WebBridgeClient } from '@webbridge-native/core';
import type { Interceptor } from '@webbridge-native/core';
import { CookieJar, cookieInterceptor } from '@webbridge-native/cookies';
import { headerInterceptor } from '@webbridge-native/headers';
import type { HeaderInterceptorOptions } from '@webbridge-native/headers';
import type { RequestHandler } from '@webbridge-native/mock';
import { MockServer } from '@webbridge-native/mock';

export interface WebBridgeOptions {
  /** 쿠키 자동 관리 활성화 (기본: true) */
  cookies?: boolean | { persistent?: boolean };
  /** 헤더 자동 주입 옵션 */
  headers?: HeaderInterceptorOptions | false;
  /** Mock 핸들러 */
  mock?: { handlers: RequestHandler[] } | false;
  /** 추가 인터셉터 */
  interceptors?: Interceptor[];
}

export interface WebBridgeInstance {
  /** 설정된 HTTP 클라이언트 */
  client: WebBridgeClient;
  /** CookieJar 인스턴스 (cookies 활성화 시) */
  cookieJar: CookieJar | null;
  /** MockServer 인스턴스 (mock 활성화 시) */
  mockServer: MockServer | null;
  /** 모든 리소스 정리 */
  dispose(): void;
}

/**
 * Tier 1 기능을 한 번에 설정한다.
 *
 * @example
 * ```typescript
 * const { client, cookieJar } = setupWebBridge({
 *   cookies: true,
 *   headers: { userAgent: 'browser-like' },
 * });
 * const res = await client.fetch('https://api.example.com/me');
 * ```
 */
export function setupWebBridge(options?: WebBridgeOptions): WebBridgeInstance {
  const opts = options ?? {};
  const client = new WebBridgeClient();

  // Headers interceptor
  let headersOpts: HeaderInterceptorOptions | undefined;
  if (opts.headers !== false) {
    headersOpts =
      typeof opts.headers === 'object' ? opts.headers : undefined;
    client.use(headerInterceptor(headersOpts));
  }

  // Cookie interceptor
  let cookieJar: CookieJar | null = null;
  if (opts.cookies !== false) {
    const persistent =
      typeof opts.cookies === 'object'
        ? opts.cookies.persistent ?? false
        : false;
    cookieJar = new CookieJar({ persistent });
    client.use(cookieInterceptor({ jar: cookieJar }));
  }

  // Mock interceptor
  let mockServer: MockServer | null = null;
  if (opts.mock) {
    mockServer = new MockServer(opts.mock.handlers);
    mockServer.listen();
    client.use(mockServer.createInterceptor());
  }

  // Additional interceptors
  if (opts.interceptors) {
    for (const interceptor of opts.interceptors) {
      client.use(interceptor);
    }
  }

  return {
    client,
    cookieJar,
    mockServer,
    dispose() {
      if (mockServer) mockServer.close();
    },
  };
}

// Re-export key types for convenience
export { WebBridgeClient } from '@webbridge-native/core';
export type { WebBridgeRequest, WebBridgeResponse, Interceptor } from '@webbridge-native/core';
export { CookieJar } from '@webbridge-native/cookies';
export { headerInterceptor } from '@webbridge-native/headers';
export { setupServer, http, HttpResponse } from '@webbridge-native/mock';
