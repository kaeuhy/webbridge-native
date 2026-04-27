import type { Interceptor } from '@webbridge-native/core';
import type { CookieJar } from './jar';

export interface CookieInterceptorOptions {
  /** 사용할 CookieJar 인스턴스 */
  jar: CookieJar;
}

/**
 * Cookie 인터셉터 — 요청에 Cookie 헤더를 첨부하고, 응답의 Set-Cookie를 파싱한다.
 * core의 Interceptor 타입을 준수한다.
 */
export function cookieInterceptor(
  options: CookieInterceptorOptions,
): Interceptor {
  const { jar } = options;

  return async (request, next) => {
    // 요청: Cookie 헤더 첨부
    const cookieHeader = await jar.getCookieHeader(request.url);
    if (cookieHeader) {
      request = {
        ...request,
        headers: {
          ...request.headers,
          Cookie: cookieHeader,
        },
      };
    }

    // 다음 인터셉터 실행
    const response = await next(request);

    // 응답: Set-Cookie 파싱
    const setCookieHeaders = getSetCookieHeaders(response.headers);
    for (const header of setCookieHeaders) {
      await jar.setCookie(header, request.url);
    }

    return response;
  };
}

/**
 * 응답 헤더에서 Set-Cookie 값을 추출한다.
 * 헤더가 콤마로 구분되어 있거나 단일 값일 수 있다.
 */
function getSetCookieHeaders(headers: Record<string, string>): string[] {
  // 헤더 이름은 대소문자 무시
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'set-cookie') {
      // 단순 분리 — 실제로 Set-Cookie는 여러 헤더로 전달되지만
      // Record<string, string>에서는 콤마 구분 or 단일 값
      // 날짜에 콤마가 포함되므로 안전한 분리가 어려움
      // → 단일 값으로 처리 (여러 Set-Cookie는 배열 지원 필요)
      return [value];
    }
  }
  return [];
}
