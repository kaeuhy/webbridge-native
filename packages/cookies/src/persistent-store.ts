import { CookieStore } from './store';

/**
 * 영속화 스토리지 인터페이스.
 * MMKV, AsyncStorage, 또는 커스텀 스토리지를 주입할 수 있다.
 */
export interface PersistenceAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_KEY = '@webbridge-native/cookies';

/**
 * 영속 쿠키 저장소.
 * 메모리 CookieStore를 래핑하고, 변경 시 PersistenceAdapter에 flush.
 */
export class PersistentCookieStore extends CookieStore {
  private adapter: PersistenceAdapter;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly flushDelay: number;

  constructor(adapter: PersistenceAdapter, options?: { flushDelay?: number }) {
    super();
    this.adapter = adapter;
    this.flushDelay = options?.flushDelay ?? 500;
    this.load();
  }

  /** 스토리지에서 쿠키를 로드한다. */
  private load(): void {
    const data = this.adapter.getItem(STORAGE_KEY);
    if (data) {
      this.deserialize(data);
      // 로드 후 만료된 쿠키 정리
      this.removeExpired();
    }
  }

  /** 변경 시 debounced flush. */
  schedulePersist(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.flushDelay);
  }

  /** 즉시 스토리지에 저장. */
  flush(): void {
    const data = this.serialize();
    this.adapter.setItem(STORAGE_KEY, data);
  }

  /** 리소스 정리. */
  dispose(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    // 마지막 flush
    this.flush();
  }

  /** 전체 삭제 + 스토리지도 삭제. */
  override clear(domain?: string): void {
    super.clear(domain);
    if (!domain) {
      this.adapter.removeItem(STORAGE_KEY);
    } else {
      this.schedulePersist();
    }
  }
}
