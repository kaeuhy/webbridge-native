import type { Cookie } from './cookie';

/** 도메인별 쿠키 제한 (RFC 6265 §6.1) */
const MAX_COOKIES_PER_DOMAIN = 50;
/** 전체 쿠키 제한 */
const MAX_COOKIES_TOTAL = 3000;

/**
 * 메모리 기반 쿠키 저장소.
 */
export class CookieStore {
  /** domain → Cookie[] */
  protected cookies: Map<string, Cookie[]> = new Map();

  /** 쿠키를 저장한다. 같은 name+domain+path면 덮어쓴다. */
  set(cookie: Cookie): void {
    const domain = cookie.domain;
    let list = this.cookies.get(domain);
    if (!list) {
      list = [];
      this.cookies.set(domain, list);
    }

    // 같은 키(name+domain+path)의 기존 쿠키 제거
    const existingIndex = list.findIndex(
      (c) => c.name === cookie.name && c.path === cookie.path,
    );
    // 클론하여 caller의 객체를 변경하지 않음
    let stored = { ...cookie };

    if (existingIndex !== -1) {
      // 기존 쿠키의 creationTime 유지 (RFC 6265 §5.3 step 11)
      stored = { ...stored, creationTime: list[existingIndex].creationTime };
      list.splice(existingIndex, 1);
    }

    list.push(stored);

    // 도메인별 제한 적용 — 오래된 것 먼저 제거
    if (list.length > MAX_COOKIES_PER_DOMAIN) {
      list.sort((a, b) => a.lastAccessTime - b.lastAccessTime);
      list.splice(0, list.length - MAX_COOKIES_PER_DOMAIN);
    }

    // 전체 제한 적용
    this.enforceGlobalLimit();
  }

  /** 특정 도메인의 모든 쿠키를 반환한다. */
  getByDomain(domain: string): Cookie[] {
    return this.cookies.get(domain) ?? [];
  }

  /** 모든 쿠키를 반환한다. */
  getAll(): Cookie[] {
    const result: Cookie[] = [];
    for (const list of this.cookies.values()) {
      result.push(...list);
    }
    return result;
  }

  /** 만료된 쿠키를 제거한다. */
  removeExpired(now?: number): void {
    const currentTime = now ?? Date.now();
    for (const [domain, list] of this.cookies.entries()) {
      const filtered = list.filter(
        (c) => c.expires === undefined || c.expires > currentTime,
      );
      if (filtered.length === 0) {
        this.cookies.delete(domain);
      } else {
        this.cookies.set(domain, filtered);
      }
    }
  }

  /** 특정 쿠키를 name+domain+path로 삭제한다. */
  remove(name: string, domain: string, path: string): boolean {
    const list = this.cookies.get(domain);
    if (!list) return false;
    const idx = list.findIndex((c) => c.name === name && c.path === path);
    if (idx === -1) return false;
    list.splice(idx, 1);
    if (list.length === 0) this.cookies.delete(domain);
    return true;
  }

  /** 특정 도메인 또는 전체 쿠키를 삭제한다. */
  clear(domain?: string): void {
    if (domain) {
      this.cookies.delete(domain);
    } else {
      this.cookies.clear();
    }
  }

  /** 전체 쿠키 수를 반환한다. */
  get size(): number {
    let count = 0;
    for (const list of this.cookies.values()) {
      count += list.length;
    }
    return count;
  }

  /** 직렬화 (영속화용) */
  serialize(): string {
    const entries: [string, Cookie[]][] = [];
    for (const [domain, list] of this.cookies.entries()) {
      entries.push([domain, list]);
    }
    return JSON.stringify(entries);
  }

  /** 역직렬화 */
  deserialize(data: string): void {
    try {
      const entries: [string, Cookie[]][] = JSON.parse(data);
      this.cookies.clear();
      for (const [domain, list] of entries) {
        this.cookies.set(domain, list);
      }
    } catch {
      // 파싱 실패 시 무시
    }
  }

  private enforceGlobalLimit(): void {
    if (this.size <= MAX_COOKIES_TOTAL) return;

    // 모든 쿠키를 lastAccessTime 순으로 정렬, 오래된 것부터 제거
    const all = this.getAll().sort(
      (a, b) => a.lastAccessTime - b.lastAccessTime,
    );
    const toRemove = all.length - MAX_COOKIES_TOTAL;
    const removeKeys = new Set(
      all.slice(0, toRemove).map((c) => `${c.name}\0${c.domain}\0${c.path}`),
    );

    for (const [domain, list] of this.cookies.entries()) {
      const filtered = list.filter(
        (c) => !removeKeys.has(`${c.name}\0${c.domain}\0${c.path}`),
      );
      if (filtered.length === 0) {
        this.cookies.delete(domain);
      } else {
        this.cookies.set(domain, filtered);
      }
    }
  }
}
