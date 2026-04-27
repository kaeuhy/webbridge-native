# 04-IMPLEMENTATION.md — Native Bridge 핵심 구현

> **이 문서는 "가장 어려운 기술 문제"를 어떻게 풀 것인가를 설명한다.**

---

## 핵심 문제

### MSW가 RN DevTools Network 탭에 안 보이는 이유

```
일반적인 fetch 흐름:
  JS fetch() → Native 네트워크 레이어 → 서버 → 응답
                    ↑
              Network 탭이 감시하는 지점

MSW가 가로챈 흐름:
  JS fetch() → MSW 인터셉터 → 가짜 응답 반환
                    ↑
              여기서 끝. Native 레이어 도달 안 함
```

MSW는 JS의 fetch를 monkey-patch. RN DevTools는 **Native 네트워크 레이어**를 감시. 결과: JS 레벨에서 처리된 요청은 안 보임.

**WebBridge Native가 만드는 것**: "Service Worker의 RN 버전". 네이티브 스택과 협조하는 mock 메커니즘.

---

## 두 가지 구현 경로

### 경로 A: In-App Local HTTP Server

```
JS fetch('https://api.example.com/users')
   ↓
[JS 인터셉터] URL을 http://localhost:RANDOM/proxy로 rewrite
   ↓
Native 네트워크 레이어  ← DevTools가 본다 ✓
   ↓
앱 안 HTTP 서버 (GCDWebServer / NanoHTTPD)
   ↓
[Bridge] JS 핸들러
   ↓
응답 → 다시 native → JS fetch에 전달
```

### 경로 B: Native-Level Interceptor (메인 채택)

```
JS fetch('https://api.example.com/users')
   ↓
Native 네트워크 레이어  ← DevTools가 요청 기록 ✓
   ↓
[Mock Interceptor] short-circuit (실제 네트워크 안 나감)
   ↓
[Bridge] JS 핸들러
   ↓
가짜 응답을 native가 받은 것처럼 반환  ← DevTools가 응답도 기록 ✓
```

### 두 경로 비교

| 항목 | 경로 A | 경로 B |
|---|---|---|
| URL 변형 | localhost rewrite | 원본 그대로 |
| 난이도 | 중간 | 높음 |
| HTTPS | 어려움 | 쉬움 |
| DevTools 표시 | localhost로 | 원본 URL |
| MSW 유사도 | 다름 | 매우 유사 |

### 채택: 경로 B (메인) + 경로 A (Fallback)

PoC에서 경로 B의 DevTools 가시성이 안 나오면 즉시 경로 A로 전환 가능하게 설계.

---

## 컴포넌트 구성 (5개)

### 1. JS Public API
```typescript
import { setupServer, http, HttpResponse } from '@webbridge-native/mock';
const server = setupServer(/* handlers */);
server.listen();
```

### 2. Handler Registry & Matcher
`@mswjs/interceptors` 매칭 로직 재활용.

### 3. Native Interceptor Module
- iOS: `NSURLProtocol` 서브클래스 등록
- Android: OkHttp `Interceptor` 추가

### 4. Native ↔ JS Bridge
**핵심 난점**: 네이티브의 동기적 응답 계약 vs RN Bridge의 비동기성.

### 5. Response Synthesizer
JS 응답 객체를 네이티브 HTTP 응답으로 변환.

---

## 가장 어려운 문제: 비동기 Bridge 위에서 동기 응답 만들기

### Android 해결 (OkHttp)

```kotlin
class MockInterceptor(private val bridge: ReactBridge) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()

        val future = CompletableFuture<MockResponse?>()
        bridge.askJS(request.toJSON()) { result ->
            future.complete(result)
        }

        val mockResponse = future.get(5, TimeUnit.SECONDS)

        return if (mockResponse != null) {
            buildOkHttpResponse(request, mockResponse)
        } else {
            chain.proceed(request)
        }
    }
}
```

OkHttp 인터셉터는 별도 스레드 풀 → 블로킹해도 메인 스레드 안 막음.

### iOS 해결 (NSURLProtocol)

```swift
class MockURLProtocol: URLProtocol {
    override class func canInit(with request: URLRequest) -> Bool {
        return MockRegistry.shared.hasHandler(for: request)
    }

    override func startLoading() {
        Bridge.shared.askJS(request: request) { [weak self] mockResponse in
            guard let self = self else { return }

            if let mock = mockResponse {
                let httpResponse = HTTPURLResponse(
                    url: self.request.url!,
                    statusCode: mock.status,
                    httpVersion: "HTTP/1.1",
                    headerFields: mock.headers
                )!
                self.client?.urlProtocol(self, didReceive: httpResponse, cacheStoragePolicy: .notAllowed)
                self.client?.urlProtocol(self, didLoad: mock.body)
                self.client?.urlProtocolDidFinishLoading(self)
            } else {
                let newRequest = self.request as URLRequest
                URLSession.shared.dataTask(with: newRequest) { ... }.resume()
            }
        }
    }
}
```

---

## DevTools 인터셉터 순서 함정 (가장 미묘)

### 문제

OkHttp 인터셉터 두 종류:
- **Application Interceptor**: 캐시·재시도 *이전* 호출
- **Network Interceptor**: 실제 네트워크 직전 호출

RN 네트워크 인스펙터(0.73+ CDP, 그 이전 Flipper)는 보통 **Network Interceptor**로 동작.

### 함정

mock을 Application Interceptor로 등록하고 short-circuit하면:
- DevTools가 보는 Network Interceptor에 도달 안 함
- 결과: **DevTools에 안 보임** ← 의도와 정반대

### 해결

mock은 반드시 **Network Interceptor로 등록**. OkHttp 버전별 테스트 필수.

### iOS는 단순

`NSURLProtocol.registerClass()` 등록 시 모든 NSURLSession에 대해 `canInit`이 가장 먼저 호출됨. 단, custom configuration 사용 시 `protocolClasses`에 명시 추가 필요.

---

## RN 0.73+ 새 아키텍처 대응

- iOS: `RCTNetworking`이 NSURLSession 사용 → NSURLProtocol 트릭 통함
- Android: OkHttp 기반 그대로
- TurboModule: 코드젠/스펙 정의 필요

---

## 단계별 구현 로드맵

### Phase 1: JS-only PoC
JS 레벨 MSW 호환만. API 형태 굳힘.

### Phase 2: Android Native Interceptor
OkHttp + Bridge. **DevTools 가시성 검증 필수**.

### Phase 3: iOS NSURLProtocol
포팅 + Alamofire 등 호환 검증.

### Phase 4: Bridge 안정화
타임아웃, 에러, 핸들러 hot-reload, 동시 요청, 큰 body.

### Phase 5: DX 마감
Metro 플러그인, dev/prod 분기 (Babel plugin), Jest 핸들러 공유.

---

## 검증해야 할 핵심 가정 (PoC 우선)

1. **OkHttp Network Interceptor short-circuit → RN DevTools 표시?**
2. **iOS NSURLProtocol → RN DevTools 표시?**
3. **Bridge 왕복 50ms 이내?**

→ Day 1 PoC 목표.

---

## 정리

핵심: **"브라우저 Service Worker가 RN 네트워크 스택과 협조하는 그 협조 지점"**.

필요한 것:
1. MSW와 동일한 JS DSL
2. 네이티브 인터셉터
3. 둘을 연결하는 Bridge

**기술 리스크**: DevTools 인터셉터 순서.
**구현 리스크**: 비동기 Bridge 위 동기 응답.
