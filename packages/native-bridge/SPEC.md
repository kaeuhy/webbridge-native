# SPEC.md — @webbridge-native/native-bridge

> **Tier 1.1 — 프로젝트의 핵심 차별점**

## 목적

모든 HTTP 요청을 native 네트워크 레이어(iOS NSURLProtocol / Android OkHttp Interceptor)를 통해 라우팅하여:
1. RN DevTools Network 탭에서 mock 응답이 보이게 한다
2. "브라우저 Service Worker의 RN 버전"을 구현한다
3. JS-only 솔루션과의 차별점을 확보한다

## Public API

### `createNativeBridgeInterceptor(options?)`

```typescript
import { createNativeBridgeInterceptor } from '@webbridge-native/native-bridge';

const interceptor = createNativeBridgeInterceptor({
  mockServer,          // MockServer 인스턴스
  requestHandler,      // 커스텀 요청 핸들러 (MockServer보다 우선)
  timeoutMs: 5000,     // 타임아웃 (기본 5000ms)
  fallbackToFetch: true, // native 미설치 시 globalThis.fetch 폴백
});

client.use(interceptor); // terminal 위치에 등록

// 정리
interceptor.dispose();
```

### Preset 통합

```typescript
import { setupWebBridge } from '@webbridge-native/preset';

const { client, dispose } = setupWebBridge({
  cookies: true,
  headers: { userAgent: 'browser-like' },
  mock: { handlers: [...] },
  nativeBridge: true,  // ← native bridge 활성화
});
```

### 저수준 API

```typescript
import { NativeBridgeModule, RequestRegistry } from '@webbridge-native/native-bridge';
import { serializeResponse, deserializeRequest } from '@webbridge-native/native-bridge';
```

## 아키텍처

```
JS fetch() → 인터셉터 체인 (headers/cookies/custom)
  → nativeBridgeInterceptor (terminal)
    → Native 레이어 진입 (DevTools 감시)
    → Native → JS 이벤트: "이 요청 핸들러 있나?"
    → JS: findHandler() 매칭
    → Mock 응답 → native로 전달 → DevTools에 응답 표시
    → 또는 핸들러 없음 → 실제 네트워크 요청 진행
```

### 컴포넌트 구성

| 컴포넌트 | 파일 | 역할 |
|----------|------|------|
| TurboModule 스펙 | `NativeWebBridge.ts` | iOS/Android codegen 입력 |
| JS Bridge 래퍼 | `NativeBridgeModule.ts` | 이벤트 수신 + 핸들러 매칭 |
| Terminal 인터셉터 | `native-bridge-interceptor.ts` | WebBridgeClient 체인 통합 |
| 요청 레지스트리 | `request-registry.ts` | 대기 중인 요청 Map + 타임아웃 |
| 직렬화 | `serialization.ts` | Request/Response ↔ bridge 변환 |

### Native 컴포넌트

| 플랫폼 | 파일 | 역할 |
|--------|------|------|
| iOS | `MockURLProtocol.swift` | NSURLProtocol 서브클래스 |
| iOS | `WebBridgeNativeModule.swift` | RCTEventEmitter TurboModule |
| iOS | `MockRegistry.swift` | DispatchQueue 기반 스레드세이프 레지스트리 |
| iOS | `ResponseSynthesizer.swift` | JS 응답 → HTTPURLResponse |
| Android | `MockInterceptor.kt` | OkHttp **Network** Interceptor |
| Android | `WebBridgeNativeModule.kt` | TurboModule 구현 |
| Android | `MockRegistry.kt` | ConcurrentHashMap + CompletableFuture |
| Android | `ResponseSynthesizer.kt` | JS 응답 → OkHttp Response |
| Android | `OkHttpInterceptorManager.kt` | Network Interceptor 관리 |

## Acceptance Criteria

### 기능
- [ ] iOS/Android 모두에서 mock 응답이 RN DevTools Network 탭에 표시
- [ ] 핸들러 등록 → 첫 요청까지 100ms 이내
- [ ] 동시 50개 요청 처리 (모두 5초 내 응답)
- [ ] Bridge 왕복 시간 50ms 이내
- [ ] RN 0.73+ Bridgeless 호환
- [ ] TurboModule 미링크 시 자동 globalThis.fetch 폴백

### 인터셉터 순서
- [ ] Android: Network Interceptor로 등록 (Application Interceptor 아님)
- [ ] iOS: URLProtocol.registerClass()로 등록
- [ ] 재귀 방지: 처리 완료 태그 (WebBridgeHandled)

### 직렬화
- [ ] text body: UTF-8 string 그대로 전달
- [ ] ArrayBuffer body: base64 인코딩/디코딩
- [ ] null body: 정상 처리
- [ ] rawHeaders (Set-Cookie 등 다중 값): 보존

### 타임아웃
- [ ] 5초 타임아웃 시 자동 passthrough (실제 네트워크 요청)
- [ ] 타임아웃 전 resolve 시 타이머 취소

### Preset 통합
- [ ] `setupWebBridge({ nativeBridge: true })` 동작
- [ ] native bridge 활성 시 mock 인터셉터 체인에서 제거 (native 내부에서 매칭)
- [ ] dispose() 호출 시 native 인터셉터 해제

## 비동기 Bridge 전략

### Android
OkHttp Interceptor는 워커 스레드에서 실행 → `CompletableFuture.get(5s)` 블로킹 안전.

### iOS
`NSURLProtocol.startLoading()`은 이미 비동기 → 콜백 패턴 자연스러움.

## 보안 고려사항

- 프로덕션 빌드에서 native-bridge를 완전히 제외 가능 (dev-only dependency)
- mock 핸들러 데이터는 메모리에만 존재 (영속화 없음)
- Bridge 통신은 앱 내부 프로세스 간 (외부 네트워크 노출 없음)
