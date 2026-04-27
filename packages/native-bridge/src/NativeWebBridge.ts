/* eslint-disable @typescript-eslint/no-require-imports */
declare function require(id: string): Record<string, unknown>;

/**
 * TurboModule 스펙 — Native ↔ JS 브릿지 인터페이스.
 *
 * RN 0.73+ New Architecture 전용.
 * 실제 RN 환경에서는 TurboModuleRegistry.getEnforcing()으로 취득.
 * 테스트/Node.js 환경에서는 mock 구현 사용.
 */
export interface NativeWebBridgeSpec {
  /**
   * 요청을 native 네트워크 레이어로 전달하고 응답을 받는다.
   * @param requestJson - 직렬화된 요청 JSON
   * @returns 직렬화된 응답 JSON
   */
  sendRequest(requestJson: string): Promise<string>;

  /**
   * mock 핸들러가 이 요청을 처리할 것임을 native에 알린다.
   * Native 인터셉터는 이 요청에 대해 JS 응답을 대기한다.
   */
  registerMockHandler(requestId: string): void;

  /**
   * JS에서 생성한 mock 응답을 native로 전달한다.
   * Native 인터셉터가 이 응답을 합성하여 DevTools에 표시한다.
   */
  respondToMock(requestId: string, responseJson: string): void;

  /**
   * 진행 중인 요청을 취소한다.
   */
  cancelRequest(requestId: string): void;
}

/**
 * Native 모듈 접근자.
 * RN 환경에서는 TurboModuleRegistry에서 가져오고,
 * 비-RN 환경에서는 fallback 구현을 사용한다.
 */
let nativeModule: NativeWebBridgeSpec | null = null;

/** Native 모듈을 설정한다 (테스트용). */
export function setNativeModule(mod: NativeWebBridgeSpec | null): void {
  nativeModule = mod;
}

/** Native 모듈을 가져온다. */
export function getNativeModule(): NativeWebBridgeSpec {
  if (nativeModule) return nativeModule;

  // RN 환경 감지
  try {
    const rn = require('react-native') as {
      TurboModuleRegistry: {
        getEnforcing: (name: string) => NativeWebBridgeSpec;
      };
    };
    const mod = rn.TurboModuleRegistry.getEnforcing('WebBridgeNative');
    nativeModule = mod;
    return mod;
  } catch {
    throw new Error(
      '@webbridge-native/native-bridge: Native module not available. ' +
        'Ensure react-native is installed and New Architecture is enabled.',
    );
  }
}
