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

    // 타이머와 리스너를 추적하여 정리
    let timerId: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;

    try {
      const responseJson = await Promise.race([
        nativeModule.sendRequest(requestJson),
        new Promise<never>((_, reject) => {
          timerId = setTimeout(() => {
            try { nativeModule.cancelRequest(request.id); } catch { /* ignore */ }
            reject(new Error(`Request timeout after ${timeout}ms (id: ${request.id})`));
          }, timeout);
        }),
        ...(request.signal ? [new Promise<never>((_, reject) => {
          abortListener = () => {
            try { nativeModule.cancelRequest(request.id); } catch { /* ignore */ }
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          };
          request.signal!.addEventListener('abort', abortListener, { once: true });
        })] : []),
      ]);

      return deserializeResponse(responseJson, request.url);
    } finally {
      // 타이머와 리스너 정리 (누수 방지)
      if (timerId !== undefined) clearTimeout(timerId);
      if (abortListener && request.signal) {
        request.signal.removeEventListener('abort', abortListener);
      }
    }
  };
}
