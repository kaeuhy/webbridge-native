// @webbridge-native/preset
// Tier 1 convenience bundle for WebBridge Native

import { WebBridgeClient } from '@webbridge-native/core';
import type { Interceptor } from '@webbridge-native/core';
import { CookieJar, cookieInterceptor } from '@webbridge-native/cookies';
import { headerInterceptor } from '@webbridge-native/headers';
import type { HeaderInterceptorOptions } from '@webbridge-native/headers';
import type { RequestHandler } from '@webbridge-native/mock';
import { MockServer } from '@webbridge-native/mock';
import { createNativeBridgeInterceptor } from '@webbridge-native/native-bridge';
import type { NativeBridgeInterceptorOptions } from '@webbridge-native/native-bridge';

export interface WebBridgeOptions {
  /** 쿠키 자동 관리 활성화 (기본: true) */
  cookies?: boolean | { persistent?: boolean };
  /** 헤더 자동 주입 옵션 */
  headers?: HeaderInterceptorOptions | false;
  /** Mock 핸들러 */
  mock?: { handlers: RequestHandler[] } | false;
  /** 추가 인터셉터 */
  interceptors?: Interceptor[];
  /**
   * Native bridge 활성화 옵션.
   * true로 설정하면 native 레이어를 통해 요청을 라우팅하여 DevTools 가시성을 확보한다.
   * Native 모듈 미설치 시 자동으로 globalThis.fetch 폴백.
   */
  nativeBridge?: boolean | { timeoutMs?: number };
  /** true면 기본 terminal interceptor(globalThis.fetch)를 추가하지 않는다. 직접 terminal을 등록해야 한다. */
  skipDefaultTerminal?: boolean;
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

  // Mock interceptor 및 native bridge 분기
  let mockServer: MockServer | null = null;
  let nativeBridgeDispose: (() => void) | null = null;

  if (opts.mock) {
    mockServer = new MockServer(opts.mock.handlers);
    mockServer.listen();
  }

  if (opts.nativeBridge && !opts.skipDefaultTerminal) {
    // Native bridge 모드: mock 매칭은 native bridge 내부에서 수행
    // mock 인터셉터를 체인에 넣지 않음 (native에서 가로챈 요청으로 JS 핸들러 매칭)
    const bridgeOpts: NativeBridgeInterceptorOptions = {
      mockServer: mockServer ?? undefined,
      timeoutMs:
        typeof opts.nativeBridge === 'object'
          ? opts.nativeBridge.timeoutMs
          : undefined,
    };

    // Additional interceptors (native bridge 전에)
    if (opts.interceptors) {
      for (const interceptor of opts.interceptors) {
        client.use(interceptor);
      }
    }

    const bridge = createNativeBridgeInterceptor(bridgeOpts);
    client.use(bridge);
    nativeBridgeDispose = () => bridge.dispose();
  } else {
    // 기존 모드: mock 인터셉터를 체인에 직접 등록
    if (mockServer) {
      client.use(mockServer.createInterceptor());
    }

    // Additional interceptors
    if (opts.interceptors) {
      for (const interceptor of opts.interceptors) {
        client.use(interceptor);
      }
    }

    // Terminal interceptor — 체인의 마지막.
    if (!opts.skipDefaultTerminal) {
      client.use(async (request) => {
        const res = await globalThis.fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body ?? undefined,
          signal: request.signal,
        });
        const body = await res.text();
        return {
          url: res.url || request.url,
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          body,
          ok: res.ok,
          redirected: res.redirected,
          type: 'basic' as const,
        };
      });
    }
  }

  return {
    client,
    cookieJar,
    mockServer,
    dispose() {
      if (mockServer) mockServer.close();
      if (cookieJar) cookieJar.dispose();
      if (nativeBridgeDispose) nativeBridgeDispose();
    },
  };
}

// Re-export key types for convenience
export { WebBridgeClient } from '@webbridge-native/core';
export type { WebBridgeRequest, WebBridgeResponse, Interceptor } from '@webbridge-native/core';
export { CookieJar } from '@webbridge-native/cookies';
export { headerInterceptor } from '@webbridge-native/headers';
export { setupServer, http, HttpResponse } from '@webbridge-native/mock';
export { createNativeBridgeInterceptor } from '@webbridge-native/native-bridge';
