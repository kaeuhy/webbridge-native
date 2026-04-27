# SPEC.md — @webbridge-native/cookies

> **이 문서는 cookies 패키지의 단일 명세서다.**
> 구현은 이 문서의 체크리스트를 위에서부터 순서대로 따른다.
> SPEC에 없는 API를 임의로 추가하지 마라.

---

## 패키지 정보

| 항목 | 내용 |
|---|---|
| 이름 | `@webbridge-native/cookies` |
| Tier | 1 (MVP) |
| 의존성 | `@webbridge-native/core`, MMKV (영속화) |
| 준거 표준 | RFC 6265 (HTTP State Management Mechanism) |
| 목표 WPT 통과율 | 90%+ (cookies suite) |

---

## 문제 정의

| 항목 | 브라우저 | React Native |
|---|---|---|
| 자동 저장/전송 | 자동 | 부분적 |
| Domain/Path 매칭 | 자동 | 수동 |
| Expires/Max-Age | 자동 | 미흡 |
| Secure/HttpOnly | 자동 | 부분적 |
| SameSite | 자동 | 거의 없음 |
| 영속화 | 자동 | 라이브러리별 상이 |
| document.cookie | 부분 가능 | 없음 |

iOS의 `NSHTTPCookieStorage`는 부분 동작, Android의 OkHttp는 쿠키 기본 비활성.
`credentials: 'include'` 동작이 플랫폼별로 상이.

---

## Public API

```typescript
import { CookieJar } from '@webbridge-native/cookies';

// 기본 사용
const jar = new CookieJar({ persistent: true });
await jar.setCookie('session=abc; Path=/; HttpOnly', 'https://api.example.com');
const header = await jar.getCookieHeader('https://api.example.com/users');
await jar.clear('example.com');

// Interceptor로 사용 (core의 Interceptor 타입 준수)
import { cookieInterceptor } from '@webbridge-native/cookies';
client.use(cookieInterceptor({ jar }));
```

### CookieJar

| 메서드 | 설명 |
|---|---|
| `constructor(options?)` | `{ persistent?: boolean }` — 기본 메모리, persistent면 MMKV |
| `setCookie(header: string, url: string): Promise<void>` | Set-Cookie 헤더 파싱 후 저장 |
| `getCookieHeader(url: string): Promise<string>` | 해당 URL에 맞는 Cookie 헤더 문자열 반환 |
| `getCookies(url: string): Promise<Cookie[]>` | 해당 URL에 맞는 Cookie 객체 배열 반환 |
| `clear(domain?: string): Promise<void>` | 도메인 지정 시 해당만, 미지정 시 전체 삭제 |
| `removeExpired(): Promise<void>` | 만료된 쿠키 정리 |

### cookieInterceptor

| 옵션 | 설명 |
|---|---|
| `jar: CookieJar` | 사용할 CookieJar 인스턴스 |

요청 시 `Cookie` 헤더 자동 첨부, 응답 시 `Set-Cookie` 파싱하여 jar 업데이트.

---

## 기능 체크리스트

구현 순서는 이 목록의 위에서부터 아래로.

### 파싱
- [ ] Cookie 파서 (Set-Cookie 헤더 → Cookie 객체)
- [ ] 속성 파싱: Domain, Path, Expires, Max-Age, Secure, HttpOnly, SameSite

### RFC 6265 매칭
- [ ] Domain matching (RFC 6265 §5.1.3)
- [ ] Path matching (RFC 6265 §5.1.4)
- [ ] Secure flag 검증 (HTTPS only)
- [ ] HttpOnly flag 처리 (JS API에서 숨김)
- [ ] SameSite=Strict 처리
- [ ] SameSite=Lax 처리
- [ ] SameSite=None 처리 (Secure 필수)

### 만료
- [ ] Expires 속성 처리
- [ ] Max-Age 속성 처리 (Expires보다 우선)
- [ ] 만료된 쿠키 자동 필터링

### 저장소
- [ ] CookieStore (메모리)
- [ ] PersistentCookieStore (MMKV 기반)
- [ ] 도메인별 limit (50/domain, RFC 6265 §6.1)
- [ ] 전체 limit (3000개)
- [ ] Debounced flush (메모리 → MMKV, 500ms)

### 보안
- [ ] Public Suffix List 통합 (supercookie 방지)
- [ ] Cross-site 쿠키 격리

### 통합
- [ ] CookieJar 통합 클래스
- [ ] cookieInterceptor (core Interceptor 타입 준수)
- [ ] Cookie clear API

---

## 완료 정의 (Definition of Done)

이 패키지가 "완료"되려면 아래 모든 조건을 충족해야 한다:

1. **위 기능 체크리스트 전항목 체크**
2. **WPT cookies suite 통과율 90%+** (`pnpm harness:wpt -- --suite=cookies`)
3. **Browser Comparator 쿠키 시나리오 통과** (`pnpm harness:compare -- --scenario=cookies`)
4. **앱 재시작 후 쿠키 유지** (PersistentCookieStore 검증)
5. **동시 100개 cookie 처리 시 1ms 이내** (`pnpm harness:perf`)
6. **iOS, Android 양쪽 통합 테스트 통과**
7. **JSDoc 완비** (모든 public API)

---

## 금지 사항

- `tough-cookie` 직접 의존 금지 (Node.js 전용, RN 비호환 — TS-802 참고)
- `document.cookie` 폴리필 제공 금지 (보안 위험, 비-목표)
- 플랫폼별 분기 처리 금지 — 순수 JS로 구현, native 쿠키 저장소 사용 안 함
- `any` 타입 사용 금지

---

## 참고 문서

- [RFC 6265 — HTTP State Management Mechanism](https://tools.ietf.org/html/rfc6265)
- [RFC 6265bis (SameSite 등 확장)](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html)
- [Public Suffix List](https://publicsuffix.org/)
- [WPT cookies tests](https://github.com/nicknisi/web-platform-tests/tree/master/cookies)
- `bootstrap/03-ARCHITECTURE.md` — Layer 3 Cookie Jar 위치
- `bootstrap/04-IMPLEMENTATION.md` — Bridge 연동 방식
- `bootstrap/08-TROUBLESHOOTING.md` — TS-802 (tough-cookie RN 비호환)

---

## 테스트 전략

| 레벨 | 도구 | 범위 |
|---|---|---|
| Unit | Jest | 파서, 매칭, 만료, 저장소 각각 |
| Integration | Jest + mock store | CookieJar 전체 흐름 |
| WPT | harness/wpt-runner | RFC 6265 준수 |
| Browser Compare | harness/browser-comparator | 브라우저와 동일 결과 |
| E2E | harness/e2e-scenarios | 로그인 → 세션 유지 → 재시작 |
| Perf | harness/perf-bench | 100개 동시 처리 1ms 이내 |
