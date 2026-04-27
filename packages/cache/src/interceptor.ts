import type { Interceptor } from '@webbridge-native/core';
import { getHeader } from '@webbridge-native/core';
import { HttpCache } from './store';
import { parseCacheControl, isCacheable } from './cache-control';

const textEncoder = new TextEncoder();

export interface CacheInterceptorOptions {
  /** 사용할 HttpCache 인스턴스 */
  cache: HttpCache;
}

/**
 * HTTP Cache 인터셉터.
 * 요청 시 캐시 lookup, 응답 시 Cache-Control 기반 저장.
 * RFC 7234 준수.
 */
export function cacheInterceptor(options: CacheInterceptorOptions): Interceptor {
  const { cache } = options;

  return async (request, next) => {
    // 비-GET 요청: 캐시 무효화 후 통과 (RFC 7234 §4.4)
    if (request.method !== 'GET') {
      const response = await next(request);
      if (response.ok) {
        cache.delete(request.url);
      }
      return response;
    }

    // 캐시 lookup (요청 헤더 전달하여 Vary 매칭)
    const entry = cache.get(request.url, request.headers);

    if (entry) {
      // Fresh → 캐시 응답 반환
      if (cache.isFresh(entry)) {
        return { ...entry.response, headers: { ...entry.response.headers, 'X-Cache': 'HIT' } };
      }

      // Conditional request 준비
      const conditionalHeaders = { ...request.headers };
      if (entry.etag) {
        conditionalHeaders['If-None-Match'] = entry.etag;
      }
      if (entry.lastModified) {
        conditionalHeaders['If-Modified-Since'] = entry.lastModified;
      }

      const response = await next({ ...request, headers: conditionalHeaders });

      // 304 → 캐시된 body 재사용 + storedAt 갱신
      if (response.status === 304) {
        const directives = parseCacheControl(getHeader(response.headers, 'cache-control'));
        cache.set(
          request.url,
          { ...entry, storedAt: Date.now(), maxAge: directives.maxAge ?? entry.maxAge },
          extractVaryHeaders(request.headers, getHeader(response.headers, 'vary')),
        );
        return {
          ...entry.response,
          headers: { ...entry.response.headers, ...response.headers, 'X-Cache': 'REVALIDATED' },
        };
      }

      // 새 응답 → 캐시 갱신
      storeIfCacheable(cache, request, response);
      return { ...response, headers: { ...response.headers, 'X-Cache': 'MISS' } };
    }

    // 캐시 없음 → 정상 요청
    const response = await next(request);
    storeIfCacheable(cache, request, response);
    return { ...response, headers: { ...response.headers, 'X-Cache': 'MISS' } };
  };
}

function storeIfCacheable(
  cache: HttpCache,
  request: { method: string; url: string; headers: Record<string, string> },
  response: { status: number; headers: Record<string, string>; body: string | ArrayBuffer | null },
): void {
  const directives = parseCacheControl(getHeader(response.headers, 'cache-control'));

  if (!isCacheable(request.method, response.status, directives)) return;

  // Vary: * 는 캐시 불가 (RFC 7234 §4.1)
  const varyValue = getHeader(response.headers, 'vary');
  if (varyValue === '*') return;

  const bodySize = typeof response.body === 'string'
    ? textEncoder.encode(response.body).byteLength
    : response.body instanceof ArrayBuffer
      ? response.body.byteLength
      : 0;

  cache.set(
    request.url,
    {
      response: {
        url: request.url,
        status: response.status,
        statusText: '',
        headers: response.headers,
        body: response.body,
        ok: response.status >= 200 && response.status < 300,
        redirected: false,
        type: 'basic',
      },
      storedAt: Date.now(),
      maxAge: directives.maxAge ?? 0,
      etag: getHeader(response.headers, 'etag'),
      lastModified: getHeader(response.headers, 'last-modified'),
      size: bodySize,
      varyFields: varyValue ? varyValue.split(',').map((s) => s.trim().toLowerCase()) : undefined,
      staleWhileRevalidate: directives.staleWhileRevalidate,
      staleIfError: directives.staleIfError,
    },
    extractVaryHeaders(request.headers, varyValue),
  );
}

function extractVaryHeaders(
  requestHeaders: Record<string, string>,
  varyHeader?: string,
): Record<string, string> | undefined {
  if (!varyHeader || varyHeader === '*') return undefined;
  const result: Record<string, string> = {};
  const fields = varyHeader.split(',').map((s) => s.trim().toLowerCase());
  for (const field of fields) {
    for (const [key, value] of Object.entries(requestHeaders)) {
      if (key.toLowerCase() === field) {
        result[field] = value;
      }
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
