import type { Interceptor } from '@webbridge-native/core';
import { getHeader } from '@webbridge-native/core';
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
    const setCookieHeaders = getSetCookieHeaders(response);
    for (const header of setCookieHeaders) {
      await jar.setCookie(header, request.url);
    }

    return response;
  };
}

/**
 * 응답에서 Set-Cookie 값들을 추출한다.
 * rawHeaders가 있으면 배열로, 없으면 단일 헤더에서 안전하게 분리.
 */
function getSetCookieHeaders(response: {
  headers: Record<string, string>;
  rawHeaders?: Record<string, string[]>;
}): string[] {
  // rawHeaders에 set-cookie 배열이 있으면 사용 (다중 Set-Cookie 지원)
  if (response.rawHeaders) {
    for (const [key, values] of Object.entries(response.rawHeaders)) {
      if (key.toLowerCase() === 'set-cookie') {
        return values;
      }
    }
  }

  // fallback: 단일 헤더에서 추출
  const value = getHeader(response.headers, 'set-cookie');
  if (!value) return [];

  // Set-Cookie를 콤마로 분리할 때 날짜의 콤마와 구분해야 함.
  // RFC 6265: Set-Cookie 날짜는 "Thu, 01 Dec 2025 00:00:00 GMT" 형태.
  // 안전한 분리: 콤마 뒤에 공백+알파벳(쿠키이름=)이 오는 경우만 분리.
  return splitSetCookieString(value);
}

/**
 * 콤마로 결합된 Set-Cookie 문자열을 안전하게 분리한다.
 * 날짜의 콤마(Thu, 01...)와 쿠키 경계의 콤마를 구분한다.
 */
function splitSetCookieString(header: string): string[] {
  const cookies: string[] = [];
  let current = '';
  let i = 0;

  while (i < header.length) {
    if (header[i] === ',') {
      // 콤마 뒤의 내용이 새 쿠키 시작인지 확인
      // 새 쿠키: "name=" 패턴 (공백 건너뛰고 알파벳+등호)
      const rest = header.slice(i + 1).trimStart();
      if (/^[^\s;,=]+=/.test(rest)) {
        cookies.push(current.trim());
        current = '';
        i++;
        continue;
      }
    }
    current += header[i];
    i++;
  }

  if (current.trim()) {
    cookies.push(current.trim());
  }

  return cookies;
}
