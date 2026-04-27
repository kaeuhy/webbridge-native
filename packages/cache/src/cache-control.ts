/**
 * Cache-Control 헤더 파싱 결과.
 */
export interface CacheDirectives {
  maxAge?: number;
  sMaxAge?: number;
  noCache: boolean;
  noStore: boolean;
  mustRevalidate: boolean;
  isPublic: boolean;
  isPrivate: boolean;
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

/**
 * Cache-Control 헤더 문자열을 파싱한다.
 */
export function parseCacheControl(header: string | undefined): CacheDirectives {
  const result: CacheDirectives = {
    noCache: false,
    noStore: false,
    mustRevalidate: false,
    isPublic: false,
    isPrivate: false,
  };

  if (!header) return result;

  const parts = header.split(',');

  for (const part of parts) {
    const trimmed = part.trim().toLowerCase();
    const [key, val] = trimmed.split('=').map((s) => s.trim());

    switch (key) {
      case 'max-age': {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 0) result.maxAge = n;
        break;
      }
      case 's-maxage': {
        const n = parseInt(val, 10);
        if (!isNaN(n)) result.sMaxAge = n;
        break;
      }
      case 'no-cache':
        result.noCache = true;
        break;
      case 'no-store':
        result.noStore = true;
        break;
      case 'must-revalidate':
        result.mustRevalidate = true;
        break;
      case 'public':
        result.isPublic = true;
        break;
      case 'private':
        result.isPrivate = true;
        break;
      case 'stale-while-revalidate': {
        const n = parseInt(val, 10);
        if (!isNaN(n)) result.staleWhileRevalidate = n;
        break;
      }
      case 'stale-if-error': {
        const n = parseInt(val, 10);
        if (!isNaN(n)) result.staleIfError = n;
        break;
      }
    }
  }

  return result;
}

/**
 * 응답이 캐시 가능한지 판단한다.
 */
export function isCacheable(
  method: string,
  status: number,
  directives: CacheDirectives,
): boolean {
  if (method !== 'GET') return false;
  if (directives.noStore) return false;
  if (![200, 203, 204, 206, 300, 301, 308, 404, 405, 410, 414, 501].includes(status)) {
    return false;
  }
  if (directives.maxAge !== undefined) return true;
  if (directives.isPublic) return true;
  return false;
}
