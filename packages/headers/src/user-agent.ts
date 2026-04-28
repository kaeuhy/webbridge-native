/**
 * User-Agent 빌더.
 *
 * 3가지 모드:
 * - 'browser-like': 브라우저와 유사한 User-Agent 문자열
 * - 'native': RN 네이티브 기본값 (CFNetwork/okhttp)
 * - string: 사용자 지정 값 그대로 사용
 */
export function buildUserAgent(
  mode: 'browser-like' | 'native' | string,
): string {
  switch (mode) {
    case 'browser-like':
      return 'Mozilla/5.0 (compatible; WebBridgeNative/0.1; React Native)';
    case 'native':
      return 'WebBridgeNative/0.1';
    default:
      return mode;
  }
}
