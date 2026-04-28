/**
 * @webbridge-native/native-bridge
 *
 * Native network bridge for WebBridge Native.
 * iOS NSURLProtocol과 Android OkHttp Interceptor를 통해
 * 모든 요청을 native 레이어에서 처리하여 DevTools 가시성을 확보한다.
 *
 * @example
 * ```typescript
 * import { createNativeBridgeInterceptor } from '@webbridge-native/native-bridge';
 * import { WebBridgeClient } from '@webbridge-native/core';
 *
 * const client = new WebBridgeClient();
 * const bridge = createNativeBridgeInterceptor({ mockServer });
 * client.use(bridge);
 *
 * // cleanup
 * bridge.dispose();
 * ```
 */

export { createNativeBridgeInterceptor } from './native-bridge-interceptor';
export type { NativeBridgeInterceptorOptions } from './native-bridge-interceptor';

export { NativeBridgeModule } from './NativeBridgeModule';
export type {
  NativeBridgeModuleOptions,
  RequestHandler,
} from './NativeBridgeModule';

export { RequestRegistry } from './request-registry';

export {
  serializeRequest,
  deserializeRequest,
  serializeResponse,
  deserializeResponse,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from './serialization';
export type {
  BridgeRequestPayload,
  BridgeResponsePayload,
} from './serialization';
