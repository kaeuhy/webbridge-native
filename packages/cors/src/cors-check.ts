/** CORS 검사 결과 */
export interface CorsCheckResult {
  allowed: boolean;
  reason?: string;
}

/** Simple request 판별용 메서드/헤더 */
const SIMPLE_METHODS = new Set(['GET', 'HEAD', 'POST']);
const SIMPLE_HEADERS = new Set([
  'accept', 'accept-language', 'content-language', 'content-type',
]);
const SIMPLE_CONTENT_TYPES = new Set([
  'application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain',
]);

/** 요청이 simple request인지 판별한다 (preflight 불필요). */
export function isSimpleRequest(
  method: string,
  headers: Record<string, string>,
): boolean {
  if (!SIMPLE_METHODS.has(method)) return false;

  for (const key of Object.keys(headers)) {
    if (!SIMPLE_HEADERS.has(key.toLowerCase())) return false;
  }

  const contentType = getHeader(headers, 'content-type');
  if (contentType && !SIMPLE_CONTENT_TYPES.has(contentType.split(';')[0].trim().toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * 응답의 CORS 헤더를 검사한다.
 *
 * @param requestOrigin - 요청의 Origin
 * @param requestMethod - 요청 HTTP 메서드
 * @param requestHeaders - 요청 헤더
 * @param responseHeaders - 응답 헤더
 */
export function checkCorsHeaders(
  requestOrigin: string,
  requestMethod: string,
  requestHeaders: Record<string, string>,
  responseHeaders: Record<string, string>,
): CorsCheckResult {
  const allowOrigin = getHeader(responseHeaders, 'access-control-allow-origin');

  if (!allowOrigin) {
    return { allowed: false, reason: 'Missing Access-Control-Allow-Origin header' };
  }

  if (allowOrigin !== '*' && allowOrigin !== requestOrigin) {
    return {
      allowed: false,
      reason: `Origin "${requestOrigin}" not allowed. Server allows: "${allowOrigin}"`,
    };
  }

  // Credentials와 wildcard 충돌
  const allowCredentials = getHeader(responseHeaders, 'access-control-allow-credentials');
  if (allowCredentials === 'true' && allowOrigin === '*') {
    return {
      allowed: false,
      reason: 'Cannot use wildcard Access-Control-Allow-Origin with credentials',
    };
  }

  // 비-simple 메서드 검사
  if (!SIMPLE_METHODS.has(requestMethod)) {
    const allowMethods = getHeader(responseHeaders, 'access-control-allow-methods');
    if (!allowMethods) {
      return { allowed: false, reason: `Method "${requestMethod}" not allowed (no Allow-Methods header)` };
    }
    if (allowMethods.trim() !== '*') {
      const methods = allowMethods.split(',').map((m) => m.trim().toUpperCase());
      if (!methods.includes(requestMethod)) {
        return { allowed: false, reason: `Method "${requestMethod}" not in allowed methods: ${allowMethods}` };
      }
    }
  }

  // 비-simple 헤더 검사
  const nonSimpleHeaders = Object.keys(requestHeaders).filter(
    (h) => !SIMPLE_HEADERS.has(h.toLowerCase()),
  );
  if (nonSimpleHeaders.length > 0) {
    const allowHeaders = getHeader(responseHeaders, 'access-control-allow-headers');
    if (!allowHeaders) {
      return { allowed: false, reason: `Headers [${nonSimpleHeaders.join(', ')}] not allowed (no Allow-Headers header)` };
    }
    if (allowHeaders.trim() === '*') {
      return { allowed: true };
    }
    const allowed = allowHeaders.split(',').map((h) => h.trim().toLowerCase());
    for (const header of nonSimpleHeaders) {
      if (!allowed.includes(header.toLowerCase())) {
        return { allowed: false, reason: `Header "${header}" not in allowed headers: ${allowHeaders}` };
      }
    }
  }

  return { allowed: true };
}

function getHeader(headers: Record<string, string>, name: string): string | undefined {
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === name.toLowerCase()) return value;
  }
  return undefined;
}
