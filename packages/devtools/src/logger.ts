import type { WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';

/** 기록된 요청/응답 쌍 */
export interface RequestLogEntry {
  id: string;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  status: number;
  responseHeaders: Record<string, string>;
  responseBody: string | null;
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * 요청 로거 — 모든 요청/응답을 기록.
 * DevTools UI의 데이터 소스.
 */
export class RequestLogger {
  private entries: RequestLogEntry[] = [];
  private maxEntries: number;

  constructor(options?: { maxEntries?: number }) {
    this.maxEntries = options?.maxEntries ?? 500;
  }

  /** 요청/응답 쌍을 기록한다. */
  log(
    request: WebBridgeRequest,
    response: WebBridgeResponse,
    startTime: number,
    endTime: number,
  ): void {
    const entry: RequestLogEntry = {
      id: request.id,
      url: request.url,
      method: request.method,
      requestHeaders: { ...request.headers },
      requestBody: typeof request.body === 'string' ? request.body : null,
      status: response.status,
      responseHeaders: { ...response.headers },
      responseBody: typeof response.body === 'string' ? response.body : null,
      startTime,
      endTime,
      duration: endTime - startTime,
    };

    this.entries.push(entry);

    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }

  /** 모든 기록을 반환한다. */
  getEntries(): RequestLogEntry[] {
    return [...this.entries];
  }

  /** 필터링된 기록을 반환한다. */
  filter(predicate: (entry: RequestLogEntry) => boolean): RequestLogEntry[] {
    return this.entries.filter(predicate);
  }

  /** 기록을 초기화한다. */
  clear(): void {
    this.entries = [];
  }

  /** 기록 수를 반환한다. */
  get size(): number {
    return this.entries.length;
  }

  /** HAR 1.2 형식으로 export한다. */
  toHAR(): object {
    return {
      log: {
        version: '1.2',
        creator: { name: 'WebBridge Native DevTools', version: '0.1.0' },
        entries: this.entries.map((e) => ({
          startedDateTime: new Date(e.startTime).toISOString(),
          time: e.duration,
          request: {
            method: e.method,
            url: e.url,
            headers: Object.entries(e.requestHeaders).map(([name, value]) => ({ name, value })),
            bodySize: e.requestBody?.length ?? 0,
          },
          response: {
            status: e.status,
            headers: Object.entries(e.responseHeaders).map(([name, value]) => ({ name, value })),
            content: { size: e.responseBody?.length ?? 0, text: e.responseBody ?? '' },
            bodySize: e.responseBody?.length ?? 0,
          },
        })),
      },
    };
  }

  /** curl 명령으로 변환한다. */
  toCurl(entry: RequestLogEntry): string {
    const esc = (s: string) => s.replace(/'/g, "'\\''");
    const parts = [`curl -X ${entry.method}`];
    for (const [key, value] of Object.entries(entry.requestHeaders)) {
      parts.push(`-H '${esc(key)}: ${esc(value)}'`);
    }
    if (entry.requestBody) {
      parts.push(`-d '${esc(entry.requestBody)}'`);
    }
    parts.push(`'${esc(entry.url)}'`);
    return parts.join(' \\\n  ');
  }
}
