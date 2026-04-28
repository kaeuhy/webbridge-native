import type { WebBridgeResponse } from '@webbridge-native/core';

/** 대기 중인 요청의 resolver 엔트리 */
interface PendingEntry {
  resolve: (response: WebBridgeResponse | null) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * RequestRegistry — Native에서 JS로 전달된 요청의 응답을 기다리는 레지스트리.
 *
 * Native가 요청을 가로채면 requestId로 등록하고,
 * JS 핸들러가 응답하면 resolve/reject로 결과를 전달한다.
 * 5초 타임아웃 시 null(passthrough)로 resolve된다.
 */
export class RequestRegistry {
  private pending = new Map<string, PendingEntry>();
  private timeoutMs: number;

  constructor(options?: { timeoutMs?: number }) {
    this.timeoutMs = options?.timeoutMs ?? 5000;
  }

  /** 현재 대기 중인 요청 수 */
  get size(): number {
    return this.pending.size;
  }

  /**
   * 요청을 등록하고 응답을 기다리는 Promise를 반환한다.
   * 타임아웃 시 null(passthrough)로 resolve.
   */
  waitForResponse(requestId: string): Promise<WebBridgeResponse | null> {
    return new Promise<WebBridgeResponse | null>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        resolve(null); // timeout → passthrough
      }, this.timeoutMs);

      this.pending.set(requestId, { resolve, timer });
    });
  }

  /**
   * 요청에 mock 응답을 전달한다.
   * @returns 해당 requestId가 존재했는지 여부
   */
  resolve(requestId: string, response: WebBridgeResponse): boolean {
    const entry = this.pending.get(requestId);
    if (!entry) return false;

    clearTimeout(entry.timer);
    this.pending.delete(requestId);
    entry.resolve(response);
    return true;
  }

  /**
   * 요청에 passthrough를 전달한다 (핸들러 없음).
   * @returns 해당 requestId가 존재했는지 여부
   */
  reject(requestId: string): boolean {
    const entry = this.pending.get(requestId);
    if (!entry) return false;

    clearTimeout(entry.timer);
    this.pending.delete(requestId);
    entry.resolve(null); // null = passthrough
    return true;
  }

  /** 모든 대기 중인 요청을 passthrough로 resolve하고 정리한다. */
  clear(): void {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.resolve(null);
    }
    this.pending.clear();
  }
}
