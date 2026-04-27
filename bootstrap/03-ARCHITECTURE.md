# 03-ARCHITECTURE.md — 기술 아키텍처

> **이 문서는 "어떻게 만들 것인가"의 정답지다.**

---

## 핵심 컨셉

**"브라우저 네트워크 동작을 RN에 이식하는 4-Layer 호환 레이어"**

```
┌─────────────────────────────────────────────────────────┐
│  Layer 4: Developer-Facing API                          │
│  - MSW-compatible handler DSL                           │
│  - Browser-like fetch (drop-in replacement)             │
│  - DevTools panel / inspector                           │
└─────────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Web Semantics Engine (JS)                     │
│  - Cookie Jar (RFC 6265 + SameSite)                     │
│  - HTTP Cache (RFC 7234)                                │
│  - CORS simulator (optional, dev-only)                  │
│  - Redirect handler                                     │
│  - Header normalizer (UA, Accept-*, Origin 자동주입)    │
└─────────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Request Pipeline                              │
│  - Request/Response 표준 객체 (Fetch spec 준수)         │
│  - Interceptor chain (mock, log, transform...)          │
│  - Mock matcher                                         │
└─────────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Native Network Bridge                         │
│  - iOS: NSURLProtocol / URLSession                      │
│  - Android: OkHttp Interceptor                          │
│  - 요청을 native에 위임 → DevTools 가시성 확보          │
└─────────────────────────────────────────────────────────┘
```

---

## 설계 원칙

1. **Browser-Compatible by Default**
2. **Opt-out Friendly** (`{ cookies: false }` 등)
3. **Native Visibility First** (Layer 1 필수)
4. **Modular Packages** (필요한 것만 설치)
5. **Production-Safe** (dev-only 자동 제거)
6. **Test Harness Driven** (WPT 검증)

---

## 데이터 흐름 (요청 한 건의 여정)

```
JS 코드
  fetch('https://api.example.com/users', { credentials: 'include' })
    ↓
Layer 4: Drop-in fetch → 표준 Request 객체 생성
    ↓
Layer 3: Web Semantics
  → Cookie Jar에서 해당 URL 쿠키 → Cookie 헤더 첨부
  → Header Normalizer가 User-Agent, Accept-Language 자동 주입
  → Cache Lookup: 유효한 캐시 있으면 304 conditional 준비
    ↓
Layer 2: Interceptor Chain
  → Mock Matcher 매칭 시도
    → 매칭됨: Mock 응답 생성 → Native로 위임 (가시성 위해)
    → 매칭 안됨: 실제 요청 진행
    ↓
Layer 1: Native Bridge
  → NSURLProtocol / OkHttp Interceptor를 통해 native 진입
  → DevTools가 여기서 요청 관찰
  → 실제 네트워크 또는 합성 응답
    ↓ (응답)
Layer 3: 응답 처리
  → Set-Cookie 파싱 → Cookie Jar 업데이트
  → Cache-Control 파싱 → HTTP Cache 저장
  → 3xx면 Redirect Handler 동작
    ↓
Layer 4: 표준 Response 반환
```

---

# 브라우저 vs React Native: 차이점 전수조사

## 1. 쿠키 → `cookies` 패키지

| 항목 | 브라우저 | RN |
|---|---|---|
| 자동 저장/전송 | 자동 | 부분 |
| Domain/Path | 자동 | 수동 |
| Expires/Max-Age | 자동 | 미흡 |
| Secure/HttpOnly | 자동 | 부분 |
| SameSite | 자동 | 거의 없음 |
| 영속화 | 자동 | 라이브러리별 |
| document.cookie | 부분 가능 | 없음 |

## 2. 헤더 → `headers` 패키지

| 헤더 | 브라우저 | RN |
|---|---|---|
| User-Agent | Mozilla/5.0... | CFNetwork/okhttp |
| Accept | text/html,... | */* |
| Accept-Language | OS 언어 자동 | 비어있음 |
| Accept-Encoding | gzip, deflate, br | 다름 |
| Origin | 자동 | 없음 |
| Referer | 자동 | 없음 |

## 3. CORS → `cors` 패키지

| 항목 | 브라우저 | RN |
|---|---|---|
| Same-Origin Policy | 강제 | 없음 |
| preflight | 자동 | 없음 |
| Access-Control-* 검증 | 자동 | 없음 |

## 4. 캐시 → `cache` 패키지

| 항목 | 브라우저 | RN |
|---|---|---|
| Cache-Control | 충실 | 부분 |
| ETag/If-None-Match | 자동 | 명시 필요 |
| Last-Modified | 자동 | 미흡 |
| Vary | 자동 | 미묘 |
| stale-while-revalidate | 있음 | 거의 없음 |

## 5. 리다이렉트 → `redirect` 패키지

| 항목 | 브라우저 | RN |
|---|---|---|
| 자동 follow | 있음 | 있음 |
| redirect: 'manual' | 정확 | buggy |
| 5회 제한 | 표준 | 다양 |
| Method 변경 (3xx별) | 정확 | 부분 |
| Cross-origin Auth strip | 자동 | 없음 |

## 6. fetch API 시맨틱 → `core` 패키지

| 기능 | 브라우저 | RN |
|---|---|---|
| Response.body 스트림 | 있음 | 부분 |
| Response.formData() | 있음 | 누락 |
| AbortController | 안정 | buggy |
| FormData 직렬화 | 표준 | 다름 |
| Blob | 완전 | 제한 |
| 에러 메시지 | 표준 | 다름 |

## 7. 보안

| 항목 | 브라우저 | RN |
|---|---|---|
| HTTPS 강제 | 강제 | 느슨 |
| Mixed content 차단 | 자동 | 없음 |
| 인증서 pinning | 별도 | 라이브러리 별도 |

## 8. WebSocket / SSE → `sse` 패키지

| 항목 | 브라우저 | RN |
|---|---|---|
| WebSocket | 표준 | 호환 |
| EventSource | 지원 | **미지원** |

## 9. 스토리지

| 항목 | 브라우저 | RN |
|---|---|---|
| localStorage | 있음 | 없음 |
| IndexedDB | 있음 | 없음 |
| Cache API | 있음 | 없음 |

(스토리지는 향후 확장 후보)

---

## 각 Layer의 책임 상세

### Layer 1: Native Network Bridge
**책임**: 모든 요청을 native 스택을 거치게 → DevTools 가시성 확보. 동시에 mock 응답 합성을 native 인터셉터 체인 내에서 수행.

**핵심 컴포넌트**:
- iOS `MockURLProtocol`
- Android `MockInterceptor` (OkHttp Network Interceptor)
- TurboModule 기반 비동기 매칭

**가장 큰 리스크**: DevTools가 보는 인터셉터 단계에서 mock 처리. 자세한 건 `04-IMPLEMENTATION.md`.

### Layer 2: Request Pipeline

```typescript
type Interceptor = (
  req: Request,
  next: (req: Request) => Promise<Response>
) => Promise<Response>;

client.use(cookieInterceptor);
client.use(cacheInterceptor);
client.use(headerInterceptor);
client.use(mockInterceptor);
client.use(nativeBridgeInterceptor); // 마지막
```

### Layer 3: Web Semantics Engine
모든 컴포넌트는 `@webbridge-native/core`의 `Interceptor` 타입을 따름. 사용자가 원하는 조합으로 사용 가능.

### Layer 4: Developer-Facing API

3가지 진입점:

**1. Drop-in fetch**
```typescript
import { fetch } from '@webbridge-native/preset';
const res = await fetch('https://api.example.com/me');
```

**2. 글로벌 fetch 패치**
```typescript
import { installGlobalFetch } from '@webbridge-native/preset';
installGlobalFetch();
```

**3. MSW 호환 Mock**
```typescript
import { setupServer, http, HttpResponse } from '@webbridge-native/mock';
const server = setupServer(/* handlers */);
server.listen();
```

**4. DevTools Panel**
```typescript
import { DevToolsPanel } from '@webbridge-native/devtools';
<Stack.Screen name="__DevTools" component={DevToolsPanel} />
```

---

## 차별점 (포지셔닝)

| 비교 | 한계 | WebBridge Native 차별점 |
|---|---|---|
| MSW | RN에서 Network 탭 미가시 | Native bridge로 가시성 + 시맨틱 통합 |
| react-native-cookies | 단순 read/write | 자동 관리 + RFC 6265 |
| Reactotron / Flipper | 관찰만 | 시맨틱 자체를 브라우저와 일치 |
| axios + interceptors | axios 종속 | fetch 표준 → 모든 클라이언트 호환 |

---

## 검증 가정 (PoC 우선)

1. **OkHttp Network Interceptor에서 short-circuit이 RN DevTools에 표시되는가?** — 안 되면 경로 B 무너짐
2. **iOS NSURLProtocol 응답이 RN DevTools에 표시되는가?**
3. **Bridge 왕복 시간이 50ms 이내인가?**

→ Day 1 PoC 목표.
