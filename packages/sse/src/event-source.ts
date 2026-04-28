import { parseEventStream, parseRetryField } from './event-parser';

export interface EventSourceOptions {
  /** 추가 헤더 */
  headers?: Record<string, string>;
  /** credentials 포함 여부 */
  withCredentials?: boolean;
}

type EventHandler = (event: MessageEvent) => void;
type OpenHandler = () => void;
type ErrorHandler = (error: Event) => void;

/** W3C MessageEvent 호환 */
interface MessageEvent {
  type: string;
  data: string;
  lastEventId: string;
  origin: string;
}

interface Event {
  type: string;
}

/**
 * W3C EventSource 폴리필.
 *
 * RN은 EventSource를 기본 지원하지 않으므로 폴리필 제공.
 * 자동 재연결, last-event-id 지원.
 *
 * fetch streaming 기반 연결. 순수 JS/TS로 RN에서 동작.
 */
export class EventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly url: string;
  readonly withCredentials: boolean;
  private readonly origin: string;

  readyState: number = EventSource.CONNECTING;

  onopen: OpenHandler | null = null;
  onmessage: EventHandler | null = null;
  onerror: ErrorHandler | null = null;

  private listeners: Map<string, Set<EventHandler>> = new Map();
  private lastEventId = '';
  private retryDelay = 3000;
  private headers: Record<string, string>;

  constructor(url: string, options?: EventSourceOptions) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;
    this.headers = options?.headers ? { ...options.headers } : {};

    let parsedOrigin = '';
    try { parsedOrigin = new URL(url).origin; } catch { /* invalid URL */ }
    this.origin = parsedOrigin;

    this.connect();
  }

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null = null;

  /** 서버에 연결한다. fetch streaming 기반. */
  private connect(): void {
    if (this.readyState === EventSource.CLOSED) return;

    // 이전 연결이 있으면 abort하여 좀비 방지
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const fetchHeaders: Record<string, string> = {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...this.headers,
    };
    if (this.lastEventId) {
      fetchHeaders['Last-Event-ID'] = this.lastEventId;
    }

    globalThis.fetch(this.url, {
      headers: fetchHeaders,
      signal: this.abortController.signal,
      cache: 'no-store',
    }).then(async (response) => {
      if (!response.ok) {
        this._handleError();
        this.scheduleReconnect();
        return;
      }

      this._handleOpen();

      if (!response.body) {
        // body stream 미지원 환경 → 전체 text 읽기 (fallback)
        const text = await response.text();
        this._handleChunk(text);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (this.readyState === EventSource.CLOSED) break;

        buffer += decoder.decode(value, { stream: true });

        // 완전한 이벤트 블록만 처리 (이중 개행으로 구분)
        const parts = buffer.split('\n\n');
        if (parts.length > 1) {
          // 마지막 부분은 아직 완성되지 않은 버퍼
          buffer = parts.pop()!;
          for (const part of parts) {
            if (part.trim()) {
              this._handleChunk(part + '\n\n');
            }
          }
        }
      }

      // 연결 종료 → 재연결
      if (this.readyState !== EventSource.CLOSED) {
        this._handleError();
        this.scheduleReconnect();
      }
    }).catch((err) => {
      if (err.name === 'AbortError') return;
      if (this.readyState === EventSource.CLOSED) return;
      this._handleError();
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.readyState === EventSource.CLOSED) return;
    this.reconnectTimer = setTimeout(() => {
      if (this.readyState === EventSource.CLOSED) return;
      this.connect();
    }, this.retryDelay);
  }

  /** 연결을 닫는다. */
  close(): void {
    this.readyState = EventSource.CLOSED;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /** 이벤트 리스너를 등록한다. */
  addEventListener(type: string, handler: EventHandler): void {
    let handlers = this.listeners.get(type);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(type, handlers);
    }
    handlers.add(handler);
  }

  /** 이벤트 리스너를 제거한다. */
  removeEventListener(type: string, handler: EventHandler): void {
    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) this.listeners.delete(type);
    }
  }

  /** 수신된 chunk를 처리한다 (내부용 / 테스트용). */
  _handleChunk(chunk: string): void {
    if (this.readyState === EventSource.CLOSED) return;

    // retry 필드 처리
    const retry = parseRetryField(chunk);
    if (retry !== undefined) {
      this.retryDelay = retry;
    }

    const events = parseEventStream(chunk);

    for (const event of events) {
      if (event.lastEventId) {
        this.lastEventId = event.lastEventId;
      }

      const messageEvent: MessageEvent = {
        type: event.type,
        data: event.data,
        lastEventId: this.lastEventId,
        origin: this.origin,
      };

      // 'message' 이벤트는 onmessage 핸들러로
      if (event.type === 'message' && this.onmessage) {
        this.onmessage(messageEvent);
      }

      // addEventListener로 등록된 핸들러
      const handlers = this.listeners.get(event.type);
      if (handlers) {
        for (const handler of handlers) {
          handler(messageEvent);
        }
      }
    }
  }

  /** 연결 성공 시 호출 (내부용). */
  _handleOpen(): void {
    this.readyState = EventSource.OPEN;
    if (this.onopen) this.onopen();
  }

  /** 에러 발생 시 호출 (내부용). */
  _handleError(): void {
    if (this.readyState === EventSource.CLOSED) return;
    this.readyState = EventSource.CONNECTING;
    if (this.onerror) this.onerror({ type: 'error' });
  }

  /** 현재 retry delay를 반환한다. */
  get currentRetryDelay(): number {
    return this.retryDelay;
  }

  /** 마지막 이벤트 ID를 반환한다. */
  get currentLastEventId(): string {
    return this.lastEventId;
  }
}
