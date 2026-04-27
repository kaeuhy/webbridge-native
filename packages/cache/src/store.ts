import type { WebBridgeResponse } from '@webbridge-native/core';

export interface CacheEntry {
  url: string;
  response: WebBridgeResponse;
  storedAt: number;
  maxAge: number;
  etag?: string;
  lastModified?: string;
  varyKey: string;
  size: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

export interface HttpCacheOptions {
  /** 최대 엔트리 수 (기본: 500) */
  maxEntries?: number;
  /** 최대 크기 바이트 (기본: 50MB) */
  maxSize?: number;
}

export interface CacheStats {
  entries: number;
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

/**
 * 메모리 LRU HTTP 캐시.
 */
export class HttpCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxEntries: number;
  private maxSize: number;
  private currentSize = 0;
  private hits = 0;
  private misses = 0;

  constructor(options?: HttpCacheOptions) {
    this.maxEntries = options?.maxEntries ?? 500;
    this.maxSize = options?.maxSize ?? 50 * 1024 * 1024;
  }

  /** 캐시에서 응답을 가져온다. */
  get(url: string, varyHeaders?: Record<string, string>): CacheEntry | null {
    const key = this.buildKey(url, varyHeaders);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // LRU: 접근 시 맨 뒤로 이동
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry;
  }

  /** 응답을 캐시에 저장한다. */
  set(
    url: string,
    entry: Omit<CacheEntry, 'url' | 'varyKey'>,
    varyHeaders?: Record<string, string>,
  ): void {
    const key = this.buildKey(url, varyHeaders);
    const varyKey = this.buildVaryKey(varyHeaders);

    // 기존 엔트리 제거
    const existing = this.cache.get(key);
    if (existing) {
      this.currentSize -= existing.size;
      this.cache.delete(key);
    }

    const fullEntry: CacheEntry = { ...entry, url, varyKey };

    // 크기 제한 확인
    this.currentSize += fullEntry.size;
    this.cache.set(key, fullEntry);

    this.evict();
  }

  /** 특정 URL의 캐시를 삭제한다. */
  delete(url: string): boolean {
    // 해당 URL의 모든 vary 변형 삭제
    let deleted = false;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.url === url) {
        this.currentSize -= entry.size;
        this.cache.delete(key);
        deleted = true;
      }
    }
    return deleted;
  }

  /** 전체 캐시를 삭제한다. */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /** 캐시 통계를 반환한다. */
  stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      entries: this.cache.size,
      size: this.currentSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /** 엔트리가 아직 유효한지 확인한다. */
  isFresh(entry: CacheEntry, now?: number): boolean {
    const currentTime = now ?? Date.now();
    const age = (currentTime - entry.storedAt) / 1000;
    return age < entry.maxAge;
  }

  /** 엔트리가 stale-while-revalidate 범위 내인지 확인한다. */
  isStaleRevalidatable(entry: CacheEntry, now?: number): boolean {
    if (entry.staleWhileRevalidate === undefined) return false;
    const currentTime = now ?? Date.now();
    const age = (currentTime - entry.storedAt) / 1000;
    return age < entry.maxAge + entry.staleWhileRevalidate;
  }

  private buildKey(url: string, varyHeaders?: Record<string, string>): string {
    return `${url}|${this.buildVaryKey(varyHeaders)}`;
  }

  private buildVaryKey(varyHeaders?: Record<string, string>): string {
    if (!varyHeaders || Object.keys(varyHeaders).length === 0) return '';
    const sorted = Object.entries(varyHeaders).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return sorted.map(([k, v]) => `${k}=${v}`).join('&');
  }

  private evict(): void {
    // 엔트리 수 제한
    while (this.cache.size > this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey === undefined) break;
      const entry = this.cache.get(firstKey);
      if (entry) this.currentSize -= entry.size;
      this.cache.delete(firstKey);
    }

    // 크기 제한
    while (this.currentSize > this.maxSize && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey === undefined) break;
      const entry = this.cache.get(firstKey);
      if (entry) this.currentSize -= entry.size;
      this.cache.delete(firstKey);
    }
  }
}
