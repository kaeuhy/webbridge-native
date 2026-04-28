/**
 * TurboModule 스펙 — React Native codegen 입력 파일.
 *
 * 이 파일은 iOS/Android native 모듈의 인터페이스를 정의한다.
 * RN 0.73+ New Architecture (TurboModule)에서 codegen이 이 스펙을 읽어
 * native 측 인터페이스를 자동 생성한다.
 *
 * 주의: TurboModule codegen은 complex nested type을 지원하지 않으므로,
 * 응답 데이터는 JSON string으로 전달한다.
 */

import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Native 인터셉터를 등록한다.
   * iOS: URLProtocol.registerClass(MockURLProtocol.self)
   * Android: OkHttp에 MockInterceptor 추가
   */
  install(): void;

  /**
   * Native 인터셉터를 해제한다.
   */
  uninstall(): void;

  /**
   * JS → Native: mock 응답을 전달한다.
   * Native는 이 응답을 HTTP 응답으로 합성하여 반환한다.
   * @param requestId - 요청 식별자
   * @param responseJSON - JSON 직렬화된 BridgeResponsePayload
   */
  resolveRequest(requestId: string, responseJSON: string): void;

  /**
   * JS → Native: 핸들러 없음을 알린다.
   * Native는 실제 네트워크 요청을 진행한다.
   * @param requestId - 요청 식별자
   */
  rejectRequest(requestId: string): void;

  /**
   * 이벤트 리스너 등록 (RCTEventEmitter 호환).
   */
  addListener(eventName: string): void;

  /**
   * 이벤트 리스너 제거 (RCTEventEmitter 호환).
   */
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.get<Spec>('WebBridgeNative');
