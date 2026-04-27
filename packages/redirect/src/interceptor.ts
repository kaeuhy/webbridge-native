import type { Interceptor } from '@webbridge-native/core';
import { deleteHeader, getHeader, generateRequestId } from '@webbridge-native/core';

const MAX_REDIRECTS = 5;

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);
/** 301/302/303 → method를 GET으로 변경, body 제거 (브라우저 동작 준수) */
const METHOD_CHANGE_STATUS = new Set([301, 302, 303]);

/**
 * Redirect 인터셉터 — 브라우저와 동일한 3xx 처리.
 *
 * - `redirect: 'follow'` (기본): 자동 follow, 최대 5회
 * - `redirect: 'manual'`: 3xx 응답 그대로 반환
 * - `redirect: 'error'`: 3xx 시 에러 throw
 */
export function redirectInterceptor(): Interceptor {
  return async (request, next) => {
    const mode = request.redirect ?? 'follow';

    if (mode !== 'follow') {
      const response = await next(request);

      if (REDIRECT_STATUS.has(response.status)) {
        if (mode === 'error') {
          throw new TypeError(
            `Redirect response (${response.status}) received with redirect mode "error"`,
          );
        }
        return response;
      }
      return response;
    }

    // follow mode
    let currentRequest = request;
    let redirectCount = 0;

    while (true) {
      const response = await next(currentRequest);

      if (!REDIRECT_STATUS.has(response.status)) {
        return {
          ...response,
          redirected: redirectCount > 0,
          url: currentRequest.url,
        };
      }

      redirectCount++;
      if (redirectCount > MAX_REDIRECTS) {
        throw new TypeError(
          `Maximum redirect limit (${MAX_REDIRECTS}) exceeded`,
        );
      }

      const location = getHeader(response.headers, 'location');
      if (!location) {
        throw new TypeError('Redirect response missing Location header');
      }

      const redirectUrl = resolveUrl(location, currentRequest.url);

      // Cross-origin 시 민감 헤더 제거 (브라우저 동작 준수)
      let headers = { ...currentRequest.headers };
      if (isCrossOrigin(currentRequest.url, redirectUrl)) {
        headers = deleteHeader(headers, 'Authorization');
        headers = deleteHeader(headers, 'Cookie');
        headers = deleteHeader(headers, 'Proxy-Authorization');
      }

      if (METHOD_CHANGE_STATUS.has(response.status)) {
        currentRequest = {
          ...currentRequest,
          url: redirectUrl,
          method: 'GET',
          body: null,
          headers,
          id: generateRequestId(),
        };
      } else {
        currentRequest = {
          ...currentRequest,
          url: redirectUrl,
          headers,
          id: generateRequestId(),
        };
      }
    }
  };
}

function resolveUrl(location: string, base: string): string {
  try {
    return new URL(location, base).href;
  } catch {
    throw new TypeError(
      `Invalid redirect Location: "${location}" (base: "${base}")`,
    );
  }
}

function isCrossOrigin(url1: string, url2: string): boolean {
  try {
    return new URL(url1).origin !== new URL(url2).origin;
  } catch {
    return true;
  }
}
