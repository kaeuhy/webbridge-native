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
 * NOTE: 실제 네트워크 스트리밍은 RN 환경(native-bridge 통합) 후 완성.
 * 현재는 인터페이스 + 이벤트 디스패치 로직만 구현.
 */
export class EventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly url: string;
  readonly withCredentials: boolean;

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

    // TODO: 실제 연결은 RN 환경에서 native-bridge 또는 fetch 스트리밍으로 구현
    // this.connect();
  }

  /** 연결을 닫는다. */
  close(): void {
    this.readyState = EventSource.CLOSED;
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
        origin: new URL(this.url).origin,
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
