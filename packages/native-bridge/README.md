# @webbridge-native/native-bridge

> RN DevTools Network 탭에서 모든 요청을 볼 수 있게 하는 네이티브 브릿지.

## 왜 필요한가?

MSW 같은 JS-only mock은 native 레이어를 거치지 않아 RN DevTools에 보이지 않습니다.

```
❌ JS fetch() → MSW 가로채기 → 가짜 응답 (DevTools: 아무것도 없음)
✅ JS fetch() → Native 레이어(DevTools 감시) → Bridge → JS 핸들러 → 합성 응답(DevTools에 표시)
```

`native-bridge`는 **브라우저 Service Worker의 RN 버전**입니다.

## 설치

```bash
pnpm add @webbridge-native/native-bridge
```

iOS:
```bash
cd ios && pod install
```

## 사용법

### Preset과 함께 (권장)

```typescript
import { setupWebBridge, http, HttpResponse } from '@webbridge-native/preset';

const { client, dispose } = setupWebBridge({
  cookies: true,
  headers: { userAgent: 'browser-like' },
  mock: {
    handlers: [
      http.get('https://api.myapp.com/users', () =>
        HttpResponse.json([{ id: 1, name: 'Alice' }]),
      ),
    ],
  },
  nativeBridge: true, // DevTools 가시성 활성화
});

const res = await client.fetch('https://api.myapp.com/users');
// RN DevTools Network 탭에서 이 요청이 보입니다

dispose(); // 정리
```

### 단독 사용

```typescript
import { WebBridgeClient } from '@webbridge-native/core';
import { createNativeBridgeInterceptor } from '@webbridge-native/native-bridge';
import { MockServer, http, HttpResponse } from '@webbridge-native/mock';

const server = new MockServer([
  http.get('https://api.myapp.com/users', () =>
    HttpResponse.json([{ id: 1, name: 'Alice' }]),
  ),
]);
server.listen();

const client = new WebBridgeClient();
const bridge = createNativeBridgeInterceptor({
  mockServer: server,
  timeoutMs: 5000,
});

client.use(bridge); // terminal 인터셉터로 등록

const res = await client.fetch('https://api.myapp.com/users');
// DevTools에 요청/응답이 표시됩니다

bridge.dispose();
server.close();
```

## 옵션

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `mockServer` | - | MockServer 인스턴스. native에서 가로챈 요청을 핸들러로 매칭 |
| `requestHandler` | - | 커스텀 요청 핸들러 (MockServer보다 우선) |
| `timeoutMs` | `5000` | JS 핸들러 응답 대기 타임아웃 (ms) |
| `fallbackToFetch` | `true` | Native 모듈 미설치 시 globalThis.fetch 폴백 |

## 아키텍처

```
JS 인터셉터 체인 (headers → cookies → custom)
  → nativeBridgeInterceptor (terminal)
    → Native HTTP 레이어 (DevTools 감시 지점)
    → iOS: NSURLProtocol / Android: OkHttp Network Interceptor
    → Bridge: JS에 "핸들러 있나?" 이벤트 발행
    → JS: findHandler() 매칭
    → Mock 응답 → Native로 합성 반환 (DevTools에 응답 표시)
    → 또는 핸들러 없음 → 실제 네트워크 요청 진행
```

### 플랫폼별 구현

| 플랫폼 | 인터셉터 | 비동기 전략 |
|--------|----------|-------------|
| **iOS** | `NSURLProtocol` 서브클래스 | 콜백 (startLoading은 이미 비동기) |
| **Android** | OkHttp **Network** Interceptor | `CompletableFuture.get(5s)` (워커 스레드 블로킹) |

### 폴백 모드

Native 모듈이 링크되지 않은 환경(테스트, Expo Go 등)에서는 자동으로 `globalThis.fetch` 기반 terminal로 동작합니다. 기능적 차이 없이 DevTools 가시성만 비활성화됩니다.

## 동시 요청

50개 이상의 동시 요청을 안전하게 처리합니다:
- **JS**: `Map` 기반 레지스트리 (싱글 스레드)
- **Android**: `ConcurrentHashMap` + `CompletableFuture`
- **iOS**: `DispatchQueue` + 배리어 쓰기

## 요구 사항

- React Native 0.73+ (New Architecture / TurboModule)
- iOS 13.4+
- Android minSdk 24+

## License

MIT
