# @webbridge-native/native-bridge

> RN Native 네트워크 레이어 통합. iOS NSURLProtocol + Android OkHttp.

## Problem

RN의 JS 레벨 네트워크 가로채기는 DevTools Network 탭에 표시되지 않습니다. Native 레이어를 거치지 않기 때문입니다.

## Solution

iOS `NSURLProtocol`과 Android `OkHttp Network Interceptor`를 통해 모든 요청이 Native 레이어를 거치게 합니다. DevTools에서 mock 응답까지 보입니다.

## 설치

```bash
pnpm add @webbridge-native/native-bridge @webbridge-native/core
```

## 사용법

```typescript
import { nativeBridgeInterceptor } from '@webbridge-native/native-bridge';

client.use(nativeBridgeInterceptor({ timeout: 5000 }));
// 인터셉터 체인의 마지막(terminal)에 위치
```

## 요구 사항

- React Native 0.73+ (New Architecture, TurboModule)
- iOS 13.0+ / Android API 24+

## License

MIT
