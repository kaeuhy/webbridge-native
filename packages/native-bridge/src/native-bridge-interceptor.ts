import type {
  Interceptor,
  WebBridgeRequest,
  WebBridgeResponse,
} from '@webbridge-native/core';
import type { MockServer } from '@webbridge-native/mock';
import { findHandler } from '@webbridge-native/mock';
import { NativeBridgeModule } from './NativeBridgeModule';
import type { RequestHandler } from './NativeBridgeModule';

export interface NativeBridgeInterceptorOptions {
  /**
   * MockServer 인스턴스.
   * 설정 시 native에서 가로챈 요청을 MockServer 핸들러로 매칭한다.
   */
  mockServer?: MockServer;

  /**
   * 커스텀 요청 핸들러.
   * MockServer보다 우선 호출된다.
   */
  requestHandler?: RequestHandler;

  /**
   * 요청 타임아웃 (ms). 기본 5000.
   */
  timeoutMs?: number;

  /**
   * Native 모듈 사용 불가 시 폴백으로 globalThis.fetch 사용 여부.
   * 기본 true.
   */
  fallbackToFetch?: boolean;
}

/**
 * Native bridge 인터셉터를 생성한다.
 *
 * 이 인터셉터는 체인의 **terminal** 위치에 배치된다.
 * - Native 모듈 사용 가능: 요청을 native 레이어로 라우팅 (DevTools 가시성)
 * - Native 모듈 미설치: globalThis.fetch 폴백
 *
 * @example
 * ```typescript
 * const interceptor = createNativeBridgeInterceptor({
 *   mockServer,
 *   timeoutMs: 5000,
 * });
 * client.use(interceptor);
 * ```
 */
export function createNativeBridgeInterceptor(
  options?: NativeBridgeInterceptorOptions,
): Interceptor & { dispose: () => void } {
  const opts = options ?? {};

  const bridgeModule = new NativeBridgeModule({
    timeoutMs: opts.timeoutMs,
  });

  if (opts.mockServer) {
    bridgeModule.setMockServer(opts.mockServer);
  }

  if (opts.requestHandler) {
    bridgeModule.setRequestHandler(opts.requestHandler);
  }

  // Native 모듈이 사용 가능하면 install
  if (bridgeModule.isAvailable) {
    bridgeModule.install();
  }

  const interceptor: Interceptor = async (
    request: WebBridgeRequest,
  ): Promise<WebBridgeResponse> => {
    // Native bridge가 활성 상태면 native를 통해 처리
    // (실제 처리는 native → JS 이벤트 → handleNativeRequest에서 수행)
    // 여기서는 native bridge가 없는 경우의 JS-only 폴백 처리를 담당
    if (!bridgeModule.isAvailable || !bridgeModule.isInstalled) {
      return handleFallback(request, opts);
    }

    // Native bridge 활성 시에도 JS 체인에서 도달한 요청은
    // native 레이어가 가로채서 처리하므로,
    // 여기서는 globalThis.fetch를 통해 native 레이어로 진입시킨다.
    // Native 인터셉터가 이 fetch를 가로채서 mock 처리 또는 실제 네트워크로 분기한다.
    return executeFetch(request);
  };

  const dispose = (): void => {
    bridgeModule.uninstall();
  };

  return Object.assign(interceptor, { dispose });
}

/**
 * Native 모듈 미설치 시 폴백 처리.
 * MockServer가 있으면 JS에서 직접 매칭, 없으면 globalThis.fetch.
 */
async function handleFallback(
  request: WebBridgeRequest,
  options: NativeBridgeInterceptorOptions,
): Promise<WebBridgeResponse> {
  // 커스텀 핸들러 먼저 시도 (우선순위 높음)
  if (options.requestHandler) {
    const response = await options.requestHandler(request);
    if (response) return response;
  }

  // JS-only mock 매칭 시도
  if (options.mockServer?.isActive) {
    const match = findHandler(options.mockServer.handlers, request);
    if (match) {
      return match.handler.resolver({
        params: match.params,
        request,
      });
    }
  }

  // globalThis.fetch 폴백
  if (options.fallbackToFetch !== false) {
    return executeFetch(request);
  }

  throw new Error(
    `[WebBridge NativeBridge] No handler for ${request.method} ${request.url} ` +
      'and fallback is disabled.',
  );
}

/**
 * globalThis.fetch를 사용하여 실제 네트워크 요청을 수행한다.
 */
async function executeFetch(
  request: WebBridgeRequest,
): Promise<WebBridgeResponse> {
  const res = await globalThis.fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body ?? undefined,
    signal: request.signal,
  });

  const body = await res.text();

  // rawHeaders 추출 (Set-Cookie 등 다중 값 헤더)
  const rawHeaders: Record<string, string[]> = {};
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (!rawHeaders[lower]) {
      rawHeaders[lower] = [];
    }
    rawHeaders[lower].push(value);
  });

  return {
    url: res.url || request.url,
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    rawHeaders,
    body,
    ok: res.ok,
    redirected: res.redirected,
    type: 'basic',
  };
}
