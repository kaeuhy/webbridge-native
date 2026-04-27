// @webbridge-native/cors
// Dev-only CORS simulator for WebBridge Native

export { corsInterceptor } from './interceptor';
export type { CorsInterceptorOptions } from './interceptor';
export { checkCorsHeaders, isSimpleRequest } from './cors-check';
export type { CorsCheckResult } from './cors-check';
