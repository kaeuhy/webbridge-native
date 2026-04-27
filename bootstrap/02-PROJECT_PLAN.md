# 02-PROJECT_PLAN.md — Tier 1~4 로드맵

> **이 문서는 "무엇을 만들 것인가"의 정답지다.**
> 패키지 추가/제거나 Tier 변경은 사용자 승인 없이 하지 마라.

---

## 프로젝트 메타데이터

| 항목 | 내용 |
|---|---|
| 프로젝트명 | WebBridge Native |
| GitHub | `webbridge-native` |
| npm scope | `@webbridge-native` |
| 라이선스 | MIT |
| 언어 | TypeScript, Swift (iOS), Kotlin (Android) |
| 패키지 구조 | Monorepo (pnpm + Turborepo + Changesets) |
| 타겟 RN | 0.73+ (New Architecture 우선) |
| 개발 방식 | Harness-Driven Vibe Coding |

---

## 4-Layer 아키텍처 (요약)

```
┌──────────────────────────────────────────────────────┐
│ Layer 4: Developer-Facing API                        │
│  → MSW DSL, drop-in fetch, DevTools Panel            │
├──────────────────────────────────────────────────────┤
│ Layer 3: Web Semantics Engine                        │
│  → CookieJar, Cache, CORS, Header, Redirect          │
├──────────────────────────────────────────────────────┤
│ Layer 2: Request Pipeline                            │
│  → Standard Request/Response, Interceptor Chain      │
├──────────────────────────────────────────────────────┤
│ Layer 1: Native Network Bridge                       │
│  → NSURLProtocol (iOS), OkHttp Interceptor (Android) │
└──────────────────────────────────────────────────────┘
```

상세는 `03-ARCHITECTURE.md` 참고.

---

## Repository 구조

```
webbridge-native/
├── packages/
│   ├── core/                   # 핵심 인터페이스, 타입, 파이프라인
│   ├── native-bridge/          # iOS/Android native modules
│   ├── cookies/                # CookieJar (Tier 1)
│   ├── headers/                # Header normalizer (Tier 1)
│   ├── mock/                   # MSW-compatible mocking (Tier 1)
│   ├── cache/                  # HTTP Cache (Tier 2)
│   ├── redirect/               # Redirect handler (Tier 2)
│   ├── devtools/               # DevTools panel (Tier 2)
│   ├── cors/                   # CORS simulator (Tier 3)
│   ├── sse/                    # EventSource polyfill (Tier 3)
│   ├── adapter-axios/          # Axios adapter (Tier 4)
│   ├── adapter-react-query/    # React Query 통합 (Tier 4)
│   └── preset/                 # Tier 1 묶음 편의 패키지
├── apps/
│   ├── example-basic/          # 최소 예제 앱
│   ├── example-full/           # 모든 기능 예제
│   └── playground/             # 인터랙티브 테스트
├── harness/
│   ├── wpt-runner/             # Web Platform Tests
│   ├── browser-comparator/     # 브라우저 vs RN 비교
│   ├── e2e-scenarios/          # 시나리오 통합 테스트
│   └── perf-bench/             # 성능 벤치마크
├── docs/                       # Docusaurus
│   ├── TROUBLESHOOTING.md      # 알려진 문제 카탈로그 (자가 확장)
│   └── CHANGELOG.md            # Changesets 자동 생성
├── scripts/                    # PoC 및 도구
├── tooling/                    # 빌드, 린트, CI 공통
├── .changeset/                 # Changesets
├── .claude/
│   ├── commands/               # 슬래시 명령 (10개+)
│   └── agents/                 # 서브에이전트
├── .github/
│   ├── ISSUE_TEMPLATE/         # bug, feature, question
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── workflows/              # ci.yml, release.yml
│   └── labels.yml              # 라벨 정의
├── CLAUDE.md                   # 프로젝트 헌법
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── README.md
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 패키지별 책임 매트릭스

| 패키지 | 책임 | 의존성 | Tier |
|---|---|---|---|
| `@webbridge-native/core` | Request/Response, Interceptor 인터페이스 | 없음 | 1 |
| `@webbridge-native/native-bridge` | Native interceptor 등록 및 JS 통신 | core | 1 |
| `@webbridge-native/cookies` | RFC 6265 쿠키 jar, 영속화 | core, MMKV | 1 |
| `@webbridge-native/headers` | UA, Accept-*, Origin 자동주입 | core | 1 |
| `@webbridge-native/mock` | MSW DSL, 핸들러 매칭 | core | 1 |
| `@webbridge-native/cache` | RFC 7234 HTTP 캐시 | core, FS | 2 |
| `@webbridge-native/redirect` | Redirect 정밀 제어 | core, cookies | 2 |
| `@webbridge-native/devtools` | 인스펙터 UI | core, Tier 1 전체 | 2 |
| `@webbridge-native/cors` | dev-only CORS 시뮬레이터 | core | 3 |
| `@webbridge-native/sse` | EventSource polyfill | core | 3 |
| `@webbridge-native/preset` | Tier 1 일괄 설정 | Tier 1 전체 | - |

---

# Tier 1 — MVP

> **"있는 것만으로 80% 해결"**

## Tier 1.1 — `@webbridge-native/native-bridge`

### 문제
- JS-only 라이브러리는 Native 네트워크 레이어를 거치지 않아 DevTools에 안 보임
- 비동기 Bridge 위에서 동기적 응답 합성 필요

### 해결 방향
- iOS: `NSURLProtocol` 서브클래스 등록, `URLSessionConfiguration.protocolClasses`에 추가
- Android: OkHttp `Interceptor` (Network Interceptor 단계)
- TurboModule 기반 양방향 통신, request ID 매칭

### 구현 체크리스트
- [ ] iOS NSURLProtocol 서브클래스 (`MockURLProtocol.swift`)
- [ ] Android OkHttp Interceptor (`MockInterceptor.kt`)
- [ ] TurboModule 스펙 정의 (`NativeWebBridge.ts`)
- [ ] Request ID 기반 비동기 매칭
- [ ] 5초 timeout + cancel
- [ ] RN 0.73+ Bridgeless 호환성
- [ ] DevTools 가시성 PoC (Day 1 최우선)

### Acceptance Criteria
- iOS/Android 모두에서 mock 응답이 RN DevTools Network 탭에 표시
- 핸들러 등록 → 첫 요청까지 100ms 이내
- 동시 50개 요청 처리

## Tier 1.2 — `@webbridge-native/cookies`

### 문제
- iOS NSHTTPCookieStorage 부분 동작, Android OkHttp 기본 비활성
- `credentials: 'include'` 플랫폼별 상이
- SameSite, HttpOnly, Secure 처리 비일관

### 해결 방향
- RFC 6265 준수 쿠키 jar 직접 구현
- MMKV 기반 영속화

### 구현 체크리스트
- [ ] Cookie 파서 (Set-Cookie → Cookie 객체)
- [ ] Domain matching (RFC 6265 §5.1.3)
- [ ] Path matching (§5.1.4)
- [ ] Expires/Max-Age 처리
- [ ] Secure flag (HTTPS only)
- [ ] HttpOnly flag (JS API에서 숨김)
- [ ] SameSite=Strict/Lax/None
- [ ] CookieStore (메모리)
- [ ] PersistentCookieStore (MMKV)
- [ ] Public Suffix List 통합
- [ ] 도메인별 limit (50/domain)
- [ ] Debounced flush
- [ ] Cookie clear API

### Public API
```typescript
import { CookieJar } from '@webbridge-native/cookies';

const jar = new CookieJar({ persistent: true });
await jar.setCookie('session=abc; Path=/; HttpOnly', 'https://api.example.com');
const header = await jar.getCookieHeader('https://api.example.com/users');
await jar.clear('example.com');
```

### Acceptance Criteria
- WPT 쿠키 테스트 90%+
- 앱 재시작 후 쿠키 유지
- 동시 100개 cookie 처리 시 1ms 이내

## Tier 1.3 — `@webbridge-native/headers`

### 문제
- 브라우저 자동 헤더(UA, Accept-Language 등) 부재
- Origin/Referer 미주입

### 구현 체크리스트
- [ ] User-Agent 빌더 (3가지 모드: browser-like / native / custom)
- [ ] Accept-Language 자동
- [ ] Accept-Encoding 자동
- [ ] Origin 헤더 옵션 (dev only)
- [ ] FormData boundary 자동
- [ ] 사용자 정의 헤더 merge

### Public API
```typescript
import { headerInterceptor } from '@webbridge-native/headers';

const interceptor = headerInterceptor({
  userAgent: 'browser-like',
  acceptLanguage: 'auto',
  origin: 'https://myapp.local',
});
```

## Tier 1.4 — `@webbridge-native/mock`

### 문제
- MSW는 RN에서 DevTools 가시성 없음

### 해결 방향
- MSW v2와 100% 동일 DSL
- `@mswjs/interceptors` 매칭 로직 재활용
- native-bridge 결합

### 구현 체크리스트
- [ ] `setupServer()` API
- [ ] `http.get/post/put/delete/patch`
- [ ] `HttpResponse.json/text/error()`
- [ ] Path parameter, wildcard
- [ ] Request body 파싱
- [ ] Passthrough
- [ ] Handler reset/use
- [ ] Unhandled request 정책
- [ ] Jest 환경 핸들러 공유

### Public API
```typescript
import { setupServer, http, HttpResponse } from '@webbridge-native/mock';

const server = setupServer(
  http.get('https://api.example.com/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'Alice' });
  }),
);
server.listen();
```

## Tier 1 통합: `@webbridge-native/preset`

```typescript
import { setupWebBridge } from '@webbridge-native/preset';

setupWebBridge({
  cookies: true,
  headers: { userAgent: 'browser-like' },
  mock: { handlers: [...] },
});
```

## Tier 1 마일스톤
- **M1.1** (Week 1-2): native-bridge PoC, DevTools 가시성 검증
- **M1.2** (Week 3-4): cookies + WPT 통과
- **M1.3** (Week 5): headers + mock
- **M1.4** (Week 6): preset + example app
- **M1.5** (Week 7-8): 문서, **v0.1.0 alpha** 릴리즈

---

# Tier 2 — 실용성 강화

## Tier 2.1 — `@webbridge-native/cache`

### 구현 체크리스트
- [ ] `Cache-Control` 모든 directive
- [ ] `ETag` + `If-None-Match` (304)
- [ ] `Last-Modified` + `If-Modified-Since`
- [ ] `Vary` 헤더
- [ ] `stale-while-revalidate`, `stale-if-error`
- [ ] LRU evict
- [ ] 메모리 + 디스크 2계층
- [ ] Cache invalidation API
- [ ] Cache stats (hit rate)

## Tier 2.2 — `@webbridge-native/redirect`

### 구현 체크리스트
- [ ] 301/302/303 → method GET
- [ ] 307/308 → method/body 유지
- [ ] Max 5 redirects
- [ ] Cross-origin Authorization strip
- [ ] `redirect: 'manual'` 정확
- [ ] 쿠키 jar 재계산
- [ ] Response.redirected/url 반영

## Tier 2.3 — `@webbridge-native/devtools`

### 구현 체크리스트
- [ ] 요청/응답 타임라인
- [ ] 쿠키 jar 실시간 보기/편집
- [ ] 캐시 엔트리 보기/clear
- [ ] Mock 핸들러 매칭 로그
- [ ] HAR 1.2 export
- [ ] curl 복사
- [ ] 필터링
- [ ] Production 자동 제거 (Babel plugin)

## Tier 2 마일스톤
- **M2.1** (Week 9-12): cache
- **M2.2** (Week 13-14): redirect
- **M2.3** (Week 15-18): devtools
- **M2.4** (Week 19): **v0.5.0 beta**

---

# Tier 3 — 고급 호환성

## Tier 3.1 — `@webbridge-native/cors`
Dev-only CORS 시뮬레이터. preflight 자동, `Access-Control-Allow-*` 검증.

## Tier 3.2 — `@webbridge-native/sse`
W3C EventSource spec 준수. 자동 재연결, last-event-id.

## Tier 3 마일스톤
- **M3.1** (Week 20-22): CORS
- **M3.2** (Week 23-24): SSE
- **M3.3** (Week 25): **v0.8.0**

---

# Tier 4 — 생태계 통합

- `@webbridge-native/adapter-axios`
- `@webbridge-native/adapter-react-query`
- `@webbridge-native/adapter-apollo`
- Migration 가이드 (MSW, axios, react-native-cookies)

---

## 버저닝 전략
- Semantic Versioning 엄격
- 모든 패키지 동일 버전 (Lerna fixed mode 또는 Changesets fixed)
- Changesets로 changelog 자동화
- npm publish는 GitHub Release를 통해서만

## 릴리즈 단계
- **v0.1.0**: Tier 1 완성, public alpha
- **v0.5.0**: Tier 2 완성, public beta
- **v0.8.0**: Tier 3 완성
- **v1.0.0**: Tier 4 완성, API 안정화 보증

## 위험 요소

| 위험 | 영향 | 대응 |
|---|---|---|
| RN 신버전 NSURLProtocol/OkHttp 변경 | 높음 | 버전별 matrix CI, `06-OPERATIONS.md`의 sync-upstream 플로우 |
| DevTools 가시성 미작동 | 매우 높음 | Day 1 PoC로 최우선 검증 |
| WPT 호환률 저조 | 중간 | 정직 공개, 미달 사유 문서화 |
| 메인테이너 burnout | 높음 | Tier 1 후 피드백 단계 의무 |
| MSW v3 breaking | 중간 | adapter 패턴 격리, sync-upstream으로 자동 감지 |

## 성공 정의 (1년)
- Tier 1, 2 완성, v0.5.0 릴리즈
- GitHub stars 1,000+
- 월 npm 다운로드 10,000+
- 프로덕션 case study 5+
- WPT 호환 90%+
