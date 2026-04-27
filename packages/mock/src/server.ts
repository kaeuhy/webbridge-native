import type { Interceptor, WebBridgeResponse } from '@webbridge-native/core';
import { createResponse } from '@webbridge-native/core';
import type { RequestHandler } from './handler';
import { findHandler } from './handler';

export type UnhandledRequestStrategy = 'warn' | 'error' | 'bypass';

export interface SetupServerOptions {
  /** 매칭되지 않은 요청 처리 방식 (기본: 'warn') */
  onUnhandledRequest?: UnhandledRequestStrategy;
}

/**
 * MSW v2 호환 mock 서버.
 *
 * @example
 * ```typescript
 * const server = setupServer(
 *   http.get('/api/users', () => HttpResponse.json([]))
 * );
 * server.listen();
 * ```
 */
export class MockServer {
  private initialHandlers: RequestHandler[];
  private runtimeHandlers: RequestHandler[] = [];
  private active = false;
  private onUnhandledRequest: UnhandledRequestStrategy;

  constructor(
    handlers: RequestHandler[],
    options?: SetupServerOptions,
  ) {
    this.initialHandlers = [...handlers];
    this.onUnhandledRequest = options?.onUnhandledRequest ?? 'warn';
  }

  /** mock 인터셉터를 활성화한다. */
  listen(): void {
    this.active = true;
  }

  /** mock 인터셉터를 비활성화하고 런타임 핸들러를 초기화한다. */
  close(): void {
    this.active = false;
    this.runtimeHandlers = [];
  }

  /**
   * 런타임 핸들러를 제거한다.
   * 인자가 있으면 초기 핸들러를 교체한다 (MSW v2 호환).
   */
  resetHandlers(...newHandlers: RequestHandler[]): void {
    this.runtimeHandlers = [];
    if (newHandlers.length > 0) {
      this.initialHandlers = newHandlers;
    }
  }

  /** 런타임 핸들러를 추가한다 (앞에 prepend — 우선순위 높음). */
  use(...handlers: RequestHandler[]): void {
    this.runtimeHandlers.unshift(...handlers);
  }

  /** 서버가 활성 상태인지 반환한다. */
  get isActive(): boolean {
    return this.active;
  }

  /** 등록된 모든 핸들러 (runtime + initial). */
  get handlers(): RequestHandler[] {
    return [...this.runtimeHandlers, ...this.initialHandlers];
  }

  /**
   * core Interceptor 타입에 맞는 인터셉터를 반환한다.
   * WebBridgeClient.use()에 등록하여 사용.
   */
  createInterceptor(): Interceptor {
    return async (request, next) => {
      if (!this.active) {
        return next(request);
      }

      const match = findHandler(this.handlers, request);

      if (!match) {
        return this.handleUnmatched(request, next);
      }

      const response = await match.handler.resolver({
        params: match.params,
        request,
      });

      return response;
    };
  }

  private async handleUnmatched(
    request: { url: string; method: string },
    next: Parameters<Interceptor>[1],
  ): Promise<WebBridgeResponse> {
    switch (this.onUnhandledRequest) {
      case 'error':
        throw new Error(
          `[WebBridge Mock] Unhandled ${request.method} ${request.url}`,
        );
      case 'bypass':
        return next(request as Parameters<typeof next>[0]);
      case 'warn':
      default:
        console.warn(
          `[WebBridge Mock] Warning: unhandled ${request.method} ${request.url}`,
        );
        return next(request as Parameters<typeof next>[0]);
    }
  }
}

/**
 * MSW v2 호환 setupServer.
 */
export function setupServer(
  ...handlers: RequestHandler[]
): MockServer {
  return new MockServer(handlers);
}
