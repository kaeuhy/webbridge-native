import type { WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';
import type { MockServer } from '@webbridge-native/mock';
import { findHandler } from '@webbridge-native/mock';
import { RequestRegistry } from './request-registry';
import {
  deserializeRequest,
  serializeResponse,
  type BridgeRequestPayload,
} from './serialization';

/** onRequestIntercepted 이벤트 이름 */
const REQUEST_EVENT = 'onRequestIntercepted';

/**
 * JS 핸들러 콜백 타입.
 * Native에서 가로챈 요청을 JS에서 처리할 때 호출된다.
 */
export type RequestHandler = (
  request: WebBridgeRequest,
) => Promise<WebBridgeResponse | null>;

export interface NativeBridgeModuleOptions {
  /** 요청 타임아웃 (ms). 기본 5000. */
  timeoutMs?: number;
}

/**
 * NativeBridgeModule — TurboModule 래퍼.
 *
 * Native 이벤트를 수신하여 JS 핸들러로 라우팅하고,
 * 결과를 Native로 다시 전달한다.
 *
 * TurboModule이 없는 환경(테스트, 미설치)에서는
 * isAvailable = false가 되어 폴백 모드로 동작한다.
 */
export class NativeBridgeModule {
  private nativeModule: NativeModuleType | null = null;
  private eventEmitter: EventEmitterType | null = null;
  private subscription: EventSubscriptionType | null = null;
  private registry: RequestRegistry;
  private mockServer: MockServer | null = null;
  private customHandler: RequestHandler | null = null;
  private installed = false;
  private warnedOnce = false;

  constructor(options?: NativeBridgeModuleOptions) {
    this.registry = new RequestRegistry({
      timeoutMs: options?.timeoutMs ?? 5000,
    });
    this.tryLoadNativeModule();
  }

  /** Native 모듈이 사용 가능한지 여부 */
  get isAvailable(): boolean {
    return this.nativeModule !== null;
  }

  /** 현재 활성 상태인지 여부 */
  get isInstalled(): boolean {
    return this.installed;
  }

  /**
   * MockServer 참조를 설정한다.
   * Native에서 가로챈 요청을 MockServer의 핸들러로 매칭한다.
   */
  setMockServer(server: MockServer | null): void {
    this.mockServer = server;
  }

  /**
   * 커스텀 요청 핸들러를 설정한다.
   * MockServer보다 우선 호출된다.
   */
  setRequestHandler(handler: RequestHandler | null): void {
    this.customHandler = handler;
  }

  /**
   * Native 인터셉터를 활성화한다.
   * 이벤트 리스너를 등록하고 native install()을 호출한다.
   */
  install(): void {
    if (this.installed) return;

    if (!this.nativeModule) {
      this.warnOnce();
      return;
    }

    this.subscription = this.eventEmitter?.addListener(
      REQUEST_EVENT,
      (payload: BridgeRequestPayload) => {
        this.handleNativeRequest(payload).catch((err) => {
          console.error('[WebBridge NativeBridge] Error handling request:', err);
        });
      },
    ) ?? null;

    this.nativeModule.install();
    this.installed = true;
  }

  /**
   * Native 인터셉터를 비활성화한다.
   * 이벤트 리스너를 제거하고 대기 중인 요청을 모두 passthrough한다.
   */
  uninstall(): void {
    if (!this.installed) return;

    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }

    this.nativeModule?.uninstall();
    this.registry.clear();
    this.installed = false;
  }

  /**
   * Native에서 가로챈 요청을 처리한다.
   * 1. BridgeRequestPayload → WebBridgeRequest 변환
   * 2. customHandler 또는 MockServer 핸들러 매칭
   * 3. 결과를 resolveRequest/rejectRequest로 native에 전달
   */
  private async handleNativeRequest(
    payload: BridgeRequestPayload,
  ): Promise<void> {
    const request = deserializeRequest(payload);
    const requestId = payload.requestId;

    try {
      // 1. 커스텀 핸들러 먼저 시도
      if (this.customHandler) {
        const response = await this.customHandler(request);
        if (response) {
          this.nativeModule?.resolveRequest(
            requestId,
            serializeResponse(response),
          );
          return;
        }
      }

      // 2. MockServer 핸들러 매칭
      if (this.mockServer?.isActive) {
        const match = findHandler(this.mockServer.handlers, request);
        if (match) {
          const response = await match.handler.resolver({
            params: match.params,
            request,
          });
          this.nativeModule?.resolveRequest(
            requestId,
            serializeResponse(response),
          );
          return;
        }
      }

      // 3. 핸들러 없음 → passthrough
      this.nativeModule?.rejectRequest(requestId);
    } catch (err) {
      console.error(
        `[WebBridge NativeBridge] Handler error for ${request.method} ${request.url}:`,
        err,
      );
      // 에러 시 passthrough (실제 네트워크로 진행)
      this.nativeModule?.rejectRequest(requestId);
    }
  }

  /** TurboModule 로드 시도 */
  private tryLoadNativeModule(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const NativeWebBridge = require('./NativeWebBridge').default;
      if (NativeWebBridge) {
        this.nativeModule = NativeWebBridge;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { NativeEventEmitter } = require('react-native');
        this.eventEmitter = new NativeEventEmitter(NativeWebBridge);
      }
    } catch {
      // 모듈 없음 — 폴백 모드
      this.nativeModule = null;
      this.eventEmitter = null;
    }
  }

  private warnOnce(): void {
    if (this.warnedOnce) return;
    this.warnedOnce = true;
    console.warn(
      '[WebBridge NativeBridge] Native module not available. ' +
        'Falling back to globalThis.fetch. ' +
        'Install @webbridge-native/native-bridge and rebuild your app to enable native bridge.',
    );
  }
}

// Internal types for native module interface (avoids importing RN types at top level)
type NativeModuleType = {
  install(): void;
  uninstall(): void;
  resolveRequest(requestId: string, responseJSON: string): void;
  rejectRequest(requestId: string): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

type EventEmitterType = {
  addListener(
    eventName: string,
    listener: (payload: BridgeRequestPayload) => void,
  ): EventSubscriptionType;
};

type EventSubscriptionType = {
  remove(): void;
};
