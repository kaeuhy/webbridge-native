import type { Cookie } from './cookie';
import { parseSetCookie } from './parser';
import { shouldSendCookie, domainMatch } from './matching';
import { CookieStore } from './store';

export interface CookieJarOptions {
  /**
   * 영속화 활성화 여부.
   * true면 PersistentCookieStore 사용 (MMKV 기반).
   * 현재는 메모리 전용, MMKV 통합은 native-bridge 구현 후 추가.
   */
  persistent?: boolean;
}

/**
 * RFC 6265 준수 쿠키 관리자.
 *
 * @example
 * ```typescript
 * const jar = new CookieJar();
 * await jar.setCookie('session=abc; Path=/; HttpOnly', 'https://api.example.com');
 * const header = await jar.getCookieHeader('https://api.example.com/users');
 * ```
 */
export class CookieJar {
  private store: CookieStore;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly persistent: boolean;

  constructor(options?: CookieJarOptions) {
    this.persistent = options?.persistent ?? false;
    this.store = new CookieStore();
  }

  /**
   * Set-Cookie 헤더를 파싱하여 저장한다.
   * 쿠키가 이미 만료 상태(Max-Age=0, 과거 Expires)면 기존 쿠키를 제거한다.
   */
  async setCookie(header: string, url: string): Promise<void> {
    const cookie = parseSetCookie(header, url);
    if (!cookie) return;

    // 만료된 쿠키면 제거 목적
    if (cookie.expires !== undefined && cookie.expires <= Date.now()) {
      this.store.removeExpired();
      this.schedulePersist();
      return;
    }

    this.store.set(cookie);
    this.schedulePersist();
  }

  /**
   * 주어진 URL에 전송할 Cookie 헤더 문자열을 반환한다.
   * RFC 6265 §5.4 기반 정렬.
   */
  async getCookieHeader(url: string): Promise<string> {
    const cookies = await this.getCookies(url);
    if (cookies.length === 0) return '';
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  }

  /**
   * 주어진 URL에 매칭되는 Cookie 객체 배열을 반환한다.
   * RFC 6265 §5.4 정렬: 경로 길이 내림차순, 같으면 creationTime 오름차순.
   */
  async getCookies(url: string): Promise<Cookie[]> {
    const now = Date.now();
    this.store.removeExpired(now);

    const allCookies = this.store.getAll();
    const matched = allCookies.filter((c) => shouldSendCookie(c, url, now));

    // 정렬: 경로 길이 내림차순, creationTime 오름차순
    matched.sort((a, b) => {
      const pathDiff = b.path.length - a.path.length;
      if (pathDiff !== 0) return pathDiff;
      return a.creationTime - b.creationTime;
    });

    // lastAccessTime 갱신 — clone하여 반환 (store 내부 객체 직접 수정 방지)
    return matched.map((cookie) => {
      const updated = { ...cookie, lastAccessTime: now };
      this.store.set(updated); // store에도 반영
      return updated;
    });
  }

  /**
   * 특정 도메인 또는 전체 쿠키를 삭제한다.
   */
  async clear(domain?: string): Promise<void> {
    this.store.clear(domain);
    this.schedulePersist();
  }

  /**
   * 만료된 쿠키를 정리한다.
   */
  async removeExpired(): Promise<void> {
    this.store.removeExpired();
    this.schedulePersist();
  }

  /** 저장된 전체 쿠키 수 */
  get size(): number {
    return this.store.size;
  }

  /** 내부 저장소 접근 (테스트용) */
  getStore(): CookieStore {
    return this.store;
  }

  /** 리소스 정리 (타이머 해제). */
  dispose(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private schedulePersist(): void {
    if (!this.persistent) return;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.persist();
    }, 500);
  }

  private persist(): void {
    // TODO: MMKV 영속화 구현 (native-bridge 통합 후)
    // const data = this.store.serialize();
    // mmkv.set('webbridge-cookies', data);
  }
}
