# SPEC.md — @webbridge-native/native-bridge

> **Native Network Bridge — 모든 요청을 native 스택 경유시켜 DevTools 가시성 확보.**

## 패키지 정보

| 항목 | 내용 |
|---|---|
| 이름 | `@webbridge-native/native-bridge` |
| Tier | 1 |
| 의존성 | `@webbridge-native/core` |
| 언어 | TypeScript, Swift (iOS), Kotlin (Android) |
| 타겟 | RN 0.73+ (New Architecture, TurboModule) |

## 핵심 역할

1. JS에서 생성된 요청을 native 네트워크 레이어로 전달
2. Native에서 mock 응답을 합성하여 DevTools에 표시
3. JS ↔ Native 간 request ID 기반 비동기 매칭
4. 인터셉터 체인의 마지막(terminal) 인터셉터로 동작

## Public API

```typescript
import { nativeBridgeInterceptor } from '@webbridge-native/native-bridge';

// WebBridgeClient의 마지막 인터셉터로 등록
client.use(nativeBridgeInterceptor());
```

### nativeBridgeInterceptor

Terminal interceptor — `next()`를 호출하지 않고 native로 요청을 위임한다.
- 요청을 native 모듈로 전달
- native에서 실제 네트워크 또는 mock 합성 응답 반환
- 응답을 WebBridgeResponse로 변환하여 반환

### NativeWebBridge (TurboModule)

```typescript
interface Spec extends TurboModule {
  sendRequest(requestJson: string): Promise<string>;
  registerMockHandler(requestId: string): void;
  respondToMock(requestId: string, responseJson: string): void;
  cancelRequest(requestId: string): void;
}
```

## 기능 체크리스트

### JS 레이어
- [ ] TurboModule 스펙 정의 (`NativeWebBridge.ts`)
- [ ] nativeBridgeInterceptor (core Interceptor 타입 준수)
- [ ] Request → JSON 직렬화
- [ ] JSON → Response 역직렬화
- [ ] Request ID 기반 비동기 매칭
- [ ] 5초 timeout + cancel
- [ ] AbortSignal 연동

### iOS (Swift)
- [ ] MockURLProtocol (NSURLProtocol 서브클래스)
- [ ] canInit(with:) — mock 대상 판별
- [ ] startLoading() — Bridge를 통해 JS에 요청, 합성 응답 반환
- [ ] stopLoading() — 취소 처리
- [ ] URLSessionConfiguration.protocolClasses 등록

### Android (Kotlin)
- [ ] MockInterceptor (OkHttp Network Interceptor)
- [ ] intercept() — Bridge를 통해 JS에 요청, 합성 응답 반환
- [ ] CompletableFuture 기반 동기 대기
- [ ] 5초 timeout
- [ ] OkHttpClient.addNetworkInterceptor() 등록

### 공통
- [ ] RN 0.73+ Bridgeless 호환
- [ ] DevTools 가시성 검증 (PoC-C)
- [ ] 동시 50개 요청 처리

## 완료 정의

1. 위 체크리스트 전항목 체크
2. PoC-C 3개 가정 모두 통과
3. iOS/Android 양쪽 DevTools에서 mock 응답 표시
4. 동시 50개 요청 처리 시 안정

## 금지 사항

- Objective-C, Java 사용 금지 (Swift, Kotlin만)
- JS 레벨 short-circuit 금지 (반드시 native 경유)
- any 타입 금지
