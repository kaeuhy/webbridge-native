/**
 * DevTools Panel — React Native 인앱 네트워크 인스펙터.
 *
 * React 의존성 없이 순수 데이터 레이어만 제공.
 * 실제 UI 렌더링은 React Native 컴포넌트에서 이 데이터를 소비.
 *
 * @example
 * ```typescript
 * import { DevToolsPanel } from '@webbridge-native/devtools';
 *
 * const panel = new DevToolsPanel(logger);
 * panel.onUpdate((entries) => {
 *   // UI 업데이트
 * });
 * panel.setFilter({ method: 'GET', status: 200 });
 * ```
 */

import type { RequestLogEntry } from './logger';
import { RequestLogger } from './logger';

export interface PanelFilter {
  /** URL 검색 (부분 일치) */
  url?: string;
  /** HTTP 메서드 필터 */
  method?: string;
  /** 상태 코드 필터 (정확 일치) */
  status?: number;
  /** 최소 상태 코드 */
  minStatus?: number;
  /** 최대 상태 코드 */
  maxStatus?: number;
}

export interface PanelEntry extends RequestLogEntry {
  /** 캐시 상태 (X-Cache 헤더에서 추출) */
  cacheStatus: string | null;
  /** 응답 크기 (bytes, 근사) */
  responseSize: number;
}

export type PanelUpdateCallback = (entries: PanelEntry[]) => void;

/**
 * DevTools 패널 데이터 레이어.
 * RequestLogger를 감싸서 필터링, 검색, 통계를 제공.
 */
export class DevToolsPanel {
  private logger: RequestLogger;
  private filter: PanelFilter = {};
  private callbacks: Set<PanelUpdateCallback> = new Set();
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(logger: RequestLogger) {
    this.logger = logger;
  }

  /** 필터 설정. 설정 즉시 콜백 호출. */
  setFilter(filter: PanelFilter): void {
    this.filter = filter;
    this.notifyUpdate();
  }

  /** 현재 필터 반환. */
  getFilter(): PanelFilter {
    return { ...this.filter };
  }

  /** 필터링된 엔트리 반환. */
  getEntries(): PanelEntry[] {
    const raw = this.logger.getEntries();
    return raw
      .filter((e) => this.matchesFilter(e))
      .map((e) => this.toPanelEntry(e));
  }

  /** 업데이트 콜백 등록. UI가 이 콜백으로 리렌더링. */
  onUpdate(callback: PanelUpdateCallback): () => void {
    this.callbacks.add(callback);
    // 등록 즉시 현재 데이터 전달
    callback(this.getEntries());

    // 해제 함수 반환
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /** 주기적 자동 업데이트 시작 (ms). */
  startPolling(intervalMs: number = 1000): void {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      this.notifyUpdate();
    }, intervalMs);
  }

  /** 자동 업데이트 중지. */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /** 요약 통계. */
  getSummary(): {
    total: number;
    success: number;
    error: number;
    cached: number;
    avgDuration: number;
    totalSize: number;
  } {
    const entries = this.getEntries();
    const total = entries.length;
    const success = entries.filter((e) => e.status >= 200 && e.status < 300).length;
    const error = entries.filter((e) => e.status >= 400 || e.status === 0).length;
    const cached = entries.filter((e) => e.cacheStatus === 'HIT').length;
    const avgDuration = total > 0
      ? entries.reduce((sum, e) => sum + e.duration, 0) / total
      : 0;
    const totalSize = entries.reduce((sum, e) => sum + e.responseSize, 0);

    return { total, success, error, cached, avgDuration: Math.round(avgDuration), totalSize };
  }

  /** 리소스 정리. */
  dispose(): void {
    this.stopPolling();
    this.callbacks.clear();
  }

  private matchesFilter(entry: RequestLogEntry): boolean {
    const f = this.filter;
    if (f.url && !entry.url.includes(f.url)) return false;
    if (f.method && entry.method !== f.method.toUpperCase()) return false;
    if (f.status !== undefined && entry.status !== f.status) return false;
    if (f.minStatus !== undefined && entry.status < f.minStatus) return false;
    if (f.maxStatus !== undefined && entry.status > f.maxStatus) return false;
    return true;
  }

  private toPanelEntry(entry: RequestLogEntry): PanelEntry {
    return {
      ...entry,
      cacheStatus: entry.responseHeaders['X-Cache'] ?? entry.responseHeaders['x-cache'] ?? null,
      responseSize: entry.responseBody?.length ?? 0,
    };
  }

  private notifyUpdate(): void {
    const entries = this.getEntries();
    for (const cb of this.callbacks) {
      cb(entries);
    }
  }
}
