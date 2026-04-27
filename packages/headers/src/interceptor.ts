import type { Interceptor } from '@webbridge-native/core';
import { hasHeader } from '@webbridge-native/core';
import { buildUserAgent } from './user-agent';

export interface HeaderInterceptorOptions {
  /** User-Agent 모드: 'browser-like' | 'native' | 커스텀 문자열 | false */
  userAgent?: 'browser-like' | 'native' | string | false;
  /** Accept-Language: 'auto' | 커스텀 문자열 | false */
  acceptLanguage?: 'auto' | string | false;
  /** Accept-Encoding 자동 주입 */
  acceptEncoding?: boolean;
  /** Accept 헤더 기본값 주입 */
  accept?: boolean;
  /** Origin 헤더 */
  origin?: string | false;
}

const DEFAULT_ACCEPT =
  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
const DEFAULT_ACCEPT_LANGUAGE = 'en-US,en;q=0.9';
const DEFAULT_ACCEPT_ENCODING = 'gzip, deflate';

/**
 * Header normalizer 인터셉터.
 * 브라우저가 자동으로 첨부하는 헤더를 RN 요청에도 추가한다.
 * 이미 설정된 헤더는 덮어쓰지 않는다.
 */
export function headerInterceptor(
  options?: HeaderInterceptorOptions,
): Interceptor {
  const opts = options ?? {};

  const userAgent =
    opts.userAgent !== false
      ? buildUserAgent(opts.userAgent ?? 'browser-like')
      : null;

  const acceptLanguage =
    opts.acceptLanguage === false
      ? null
      : opts.acceptLanguage === 'auto' || opts.acceptLanguage === undefined
        ? DEFAULT_ACCEPT_LANGUAGE
        : opts.acceptLanguage;

  const acceptEncoding =
    opts.acceptEncoding !== false ? DEFAULT_ACCEPT_ENCODING : null;

  const accept = opts.accept !== false ? DEFAULT_ACCEPT : null;

  const origin = opts.origin === false ? null : (opts.origin ?? null);

  return async (request, next) => {
    const headers = { ...request.headers };

    if (userAgent && !hasHeader(headers, 'User-Agent')) {
      headers['User-Agent'] = userAgent;
    }

    if (acceptLanguage && !hasHeader(headers, 'Accept-Language')) {
      headers['Accept-Language'] = acceptLanguage;
    }

    if (acceptEncoding && !hasHeader(headers, 'Accept-Encoding')) {
      headers['Accept-Encoding'] = acceptEncoding;
    }

    if (accept && !hasHeader(headers, 'Accept')) {
      headers['Accept'] = accept;
    }

    if (origin && !hasHeader(headers, 'Origin')) {
      headers['Origin'] = origin;
    }

    return next({ ...request, headers });
  };
}
