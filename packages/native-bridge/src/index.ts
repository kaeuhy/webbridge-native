// @webbridge-native/native-bridge
// iOS/Android native network bridge for WebBridge Native

export { nativeBridgeInterceptor } from './interceptor';
export type { NativeBridgeInterceptorOptions } from './interceptor';
export { getNativeModule, setNativeModule } from './NativeWebBridge';
export type { NativeWebBridgeSpec } from './NativeWebBridge';
export { serializeRequest, deserializeResponse } from './serialization';
export type { SerializedRequest, SerializedResponse } from './serialization';
