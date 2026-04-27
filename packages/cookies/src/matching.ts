import type { Cookie } from './cookie';

/**
 * RFC 6265 §5.1.3 — 도메인 매칭.
 * cookie.domain이 requestDomain과 일치하거나, requestDomain의 부모 도메인이면 true.
 */
export function domainMatch(
  cookieDomain: string,
  requestDomain: string,
): boolean {
  const cd = cookieDomain.toLowerCase();
  const rd = requestDomain.toLowerCase();

  if (cd === rd) return true;
  if (rd.endsWith('.' + cd)) return true;

  return false;
}

/**
 * RFC 6265 §5.1.4 — 경로 매칭.
 */
export function pathMatch(cookiePath: string, requestPath: string): boolean {
  if (cookiePath === requestPath) return true;

  if (
    requestPath.startsWith(cookiePath) &&
    (cookiePath.endsWith('/') || requestPath[cookiePath.length] === '/')
  ) {
    return true;
  }

  return false;
}

/**
 * 주어진 URL에 대해 쿠키가 전송 가능한지 판단한다.
 * RFC 6265 §5.4 기반.
 */
export function shouldSendCookie(
  cookie: Cookie,
  url: string,
  now?: number,
): boolean {
  const currentTime = now ?? Date.now();

  // 만료 체크
  if (cookie.expires !== undefined && cookie.expires <= currentTime) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname || '/';
  const isSecure = parsed.protocol === 'https:';

  // Domain 매칭
  if (!domainMatch(cookie.domain, hostname)) {
    return false;
  }

  // Path 매칭
  if (!pathMatch(cookie.path, pathname)) {
    return false;
  }

  // Secure 체크
  if (cookie.secure && !isSecure) {
    return false;
  }

  return true;
}
