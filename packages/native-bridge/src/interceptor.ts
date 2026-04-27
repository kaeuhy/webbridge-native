import type { Interceptor } from '@webbridge-native/core';
import { getNativeModule } from './NativeWebBridge';
import { serializeRequest, deserializeResponse } from './serialization';

const DEFAULT_TIMEOUT_MS = 5000;

export interface NativeBridgeInterceptorOptions {
  /** 요청 타임아웃 (ms). 기본 5000. */
  timeout?: number;
}

/**
 * Native Bridge 인터셉터 — 인터셉터 체인의 마지막(terminal)에 위치.
 *
 * 요청을 native 네트워크 레이어로 전달하고, 응답을 WebBridgeResponse로 반환한다.
 * next()를 호출하지 않는 terminal interceptor.
 *
 * @example
 * ```typescript
 * client.use(cookieInterceptor);
 * client.use(headerInterceptor);
 * client.use(nativeBridgeInterceptor()); // 마지막
 * ```
 */
export function nativeBridgeInterceptor(
  options?: NativeBridgeInterceptorOptions,
): Interceptor {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;

  return async (request) => {
    // AbortSignal 체크
    if (request.signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    const nativeModule = getNativeModule();
    const requestJson = serializeRequest(request);

    // 타임아웃 + AbortSignal 경쟁
    const responseJson = await Promise.race([
      nativeModule.sendRequest(requestJson),
      createTimeoutPromise(timeout, request.id),
      createAbortPromise(request.signal, request.id),
    ]);

    return deserializeResponse(responseJson, request.url);
  };
}

function createTimeoutPromise(
  ms: number,
  requestId: string,
): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      // 타임아웃 시 native에 취소 요청
      try {
        getNativeModule().cancelRequest(requestId);
      } catch {
        // native 모듈 없으면 무시
      }
      reject(new Error(`Request timeout after ${ms}ms (id: ${requestId})`));
    }, ms);
  });
}

function createAbortPromise(
  signal: AbortSignal | undefined,
  requestId: string,
): Promise<never> {
  if (!signal) return new Promise(() => {}); // never resolves

  return new Promise((_, reject) => {
    if (signal.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }
    signal.addEventListener('abort', () => {
      try {
        getNativeModule().cancelRequest(requestId);
      } catch {
        // ignore
      }
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }, { once: true });
  });
}
