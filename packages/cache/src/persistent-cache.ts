/**
 * 영속 HTTP 캐시 — 메모리 LRU + 디스크 스토리지 2계층.
 *
 * 메모리 캐시 miss 시 디스크에서 복원.
 * 캐시 저장 시 메모리 + 디스크 동시 저장.
 */

import { HttpCache } from './store';
import type { HttpCacheOptions, CacheEntry } from './store';

/** 디스크 스토리지 어댑터 인터페이스 */
export interface CacheStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  getAllKeys(): string[];
}

const CACHE_PREFIX = '@wb-cache:';

export interface PersistentCacheOptions extends HttpCacheOptions {
  /** 디스크 스토리지 어댑터 (MMKV, AsyncStorage 등) */
  storage: CacheStorageAdapter;
  /** 디스크 flush 간격 (ms). 기본 1000. */
  flushInterval?: number;
}

/**
 * 2계층 HTTP 캐시.
 * HttpCache를 확장하여 디스크 영속화를 추가.
 */
export class PersistentHttpCache extends HttpCache {
  private storage: CacheStorageAdapter;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushInterval: number;
  private pendingWrites: Set<string> = new Set();

  constructor(options: PersistentCacheOptions) {
    super(options);
    this.storage = options.storage;
    this.flushInterval = options.flushInterval ?? 1000;
    this.loadFromDisk();
  }

  /** 캐시 저장 + 디스크 write 예약 */
  override set(
    url: string,
    entry: Omit<CacheEntry, 'url' | 'varyKey'>,
    varyHeaders?: Record<string, string>,
  ): void {
    super.set(url, entry, varyHeaders);
    this.pendingWrites.add(url);
    this.scheduleFlush();
  }

  /** 캐시 삭제 + 디스크에서도 삭제 */
  override delete(url: string): boolean {
    const result = super.delete(url);
    // 디스크에서 해당 URL의 모든 캐시 삭제
    const keys = this.storage.getAllKeys();
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX + url)) {
        this.storage.removeItem(key);
      }
    }
    return result;
  }

  /** 전체 삭제 + 디스크도 삭제 */
  override clear(): void {
    super.clear();
    const keys = this.storage.getAllKeys();
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        this.storage.removeItem(key);
      }
    }
  }

  /** 리소스 정리 */
  dispose(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  /** 디스크에서 캐시 복원 */
  private loadFromDisk(): void {
    const keys = this.storage.getAllKeys();
    for (const key of keys) {
      if (!key.startsWith(CACHE_PREFIX)) continue;
      const data = this.storage.getItem(key);
      if (!data) continue;

      try {
        const entry: CacheEntry = JSON.parse(data);
        // 만료되었으면 디스크에서도 삭제
        if (!this.isFresh(entry)) {
          this.storage.removeItem(key);
          continue;
        }
        // 메모리에 복원
        super.set(entry.url, entry);
      } catch {
        this.storage.removeItem(key);
      }
    }
  }

  /** 대기 중인 쓰기를 디스크에 flush */
  private flush(): void {
    // 현재 메모리 캐시의 각 엔트리를 디스크에 저장
    // pendingWrites에 있는 URL만
    for (const url of this.pendingWrites) {
      const entry = this.get(url);
      if (entry) {
        const key = CACHE_PREFIX + url + '|' + entry.varyKey;
        this.storage.setItem(key, JSON.stringify(entry));
      }
    }
    this.pendingWrites.clear();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, this.flushInterval);
  }
}
