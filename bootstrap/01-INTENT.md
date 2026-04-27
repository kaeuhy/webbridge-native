# 01-INTENT.md — 이 프로젝트가 정말 풀려는 문제

> **이 문서는 의심스러울 때 돌아올 기준점이다.**
> 다른 모든 문서가 이 문서와 충돌한다면, 이 문서가 우선한다.

---

## 한 문장

> "왜 내 fetch가 브라우저에서는 되는데 React Native에서는 안 되지?"
> 라는 질문을 RN 개발자들이 다시는 받지 않게 만든다.

---

## 프로젝트 정체성

- **이름**: WebBridge Native
- **GitHub repo**: `webbridge-native`
- **npm scope**: `@webbridge-native`
- **태그라인**: "Browser-compatible networking for React Native"

## 한 단락 설명

브라우저에서 fetch는 그냥 동작한다. 쿠키가 자동 저장되고, `User-Agent`가 자동으로 붙고, `Cache-Control`이 존중되고, `Set-Cookie`의 `SameSite`가 정확히 처리되고, DevTools Network 탭에서 모든 요청이 보인다. React Native에서는 이 중 어떤 것도 보장되지 않는다. WebBridge Native는 이 격차를 통합 패키지로 메운다. MSW 스타일 mock도 함께 제공하되, 단순 mock 라이브러리가 아니라 **"브라우저 네트워크 시맨틱의 RN 이식판"** 을 지향한다.

이름의 의미: **WebBridge** — 웹과 네이티브 사이의 다리. **Native** — JS-only 솔루션이 아니라 진짜 네이티브 레이어와 협조한다는 강조.

---

## 측정 가능한 성공 기준

- 동일한 `fetch()` 코드가 브라우저와 RN에서 동일한 결과 반환
- WPT(Web Platform Tests) 호환률 90% 이상 (cookies, cache, redirect)
- MSW 사용자가 import 경로만 변경하여 마이그레이션 가능
- RN DevTools Network 탭에 mock 응답이 자동 표시
- iOS와 Android 모두에서 동일하게 동작

---

## 절대 잃지 말 것 (의심스러우면 여기로 돌아와라)

이 4가지 원칙은 어떤 상황에서도 흔들리지 않는다.

### 원칙 1. 브라우저 호환이 최우선
RN의 관습이나 편의보다 **웹 표준이 항상 우위**. "RN에서는 보통 이렇게 한다"는 우리 기준이 아니다. "브라우저는 이렇게 한다"가 기준.

### 원칙 2. Native 가시성
모든 요청은 native 레이어(NSURLSession/OkHttp)를 거친다. JS 레벨에서 short-circuit하지 않는다. 그래야 DevTools가 본다.

### 원칙 3. Opt-out 가능
모든 기능은 개별로 끌 수 있다. 사용자가 "쿠키만 자동 관리, 캐시는 끄기"를 선택할 수 있어야 한다. 단일 거대 모듈은 만들지 않는다.

### 원칙 4. Production-safe
Dev 전용 기능(DevTools 패널, CORS 시뮬레이터 등)은 프로덕션 빌드 시 Babel 플러그인으로 자동 제거. 번들 사이즈 부담을 주지 않는다.

---

## 거부할 유혹

다음 같은 말이 나오면 멈추고 이 문서를 다시 읽어라.

- ❌ "RN에서는 보통 이렇게 해요" — 우리는 "보통"을 깨러 왔다.
- ❌ "성능을 위해 표준을 살짝 어기죠" — 어기지 않는다.
- ❌ "테스트는 나중에 추가하죠" — 안 된다. **harness 먼저, 코드 나중**.
- ❌ "iOS만 먼저 하고 Android는 다음에" — 두 플랫폼은 항상 동시에 간다.
- ❌ "이건 axios 사용자 안 받아도 돼요" — fetch 표준 준수 → 모든 클라이언트 자동 호환.
- ❌ "MSW v2랑 살짝 다르게 만들죠" — DSL 호환은 절대 양보 불가.

---

## 기존 솔루션과 비교

2025년 현재, RN 네트워킹 영역에는 **각각 한 조각만 푸는** 부분 솔루션들이 존재한다. 통합하는 곳은 없다.

| 솔루션 | 푸는 문제 | 안 푸는 문제 |
|---|---|---|
| MSW (`msw/native`) | RN에서 MSW DSL 사용 가능 | RN DevTools에 mock 안 보임. 시맨틱 통합 없음 |
| Radon IDE Network Inspector | iOS NSURLSession 스위즐, Android fetch/XHR 캡처 | IDE 종속. 라이브러리 아님. mock/cookies/cache 미제공 |
| `@react-native-cookies/cookies` | 쿠키 단순 get/set | 자동 관리 없음. RFC 6265 미준수. SameSite 미처리 |
| `react-native-nitro-cookies` | Nitro Modules 기반 동기 쿠키 API | 여전히 수동 관리. 자동 첨부/파싱 없음 |
| `fetch-cookie` | Node.js 환경 쿠키 자동 첨부 | RN 비호환 가능. 영속화/SameSite 부재 |
| `react-native-network-logger` | 네트워크 요청 인스펙션 | 인스펙터만. mock 없음. 시맨틱 보강 없음 |
| `@react-native-community/fetch` | 스트리밍 fetch 폴리필 | CORS/cookie 한계를 인정만 함. 해결 안 함 |
| RN 본가 0.81+ DevTools | fetch/XHR 자동 기록 시작 | mock 가시성 미보장. 시맨틱 통합 없음. 외부 라이브러리 우회 가능 |

**WebBridge Native의 통합 가치**: cookies + cache + redirect + headers + CORS 시맨틱을 한 곳에서 브라우저 표준 준수로 제공하면서, MSW 호환 mock과 native 가시성까지 결합하는 라이브러리는 현재 존재하지 않는다.

---

## 환경 변화 추적 의무

### RN 본가의 Network DevTools 진화

- RN 0.76 (2024.10): React Native DevTools 출시. Network 패널 미포함.
- RN 0.81+ (2025): fetch, XMLHttpRequest, `<Image>` 네트워크 요청 자동 기록 시작.
- 단, RN 본가 인스펙터의 인터셉트 위치는 **fetch/XHR JS 레벨**이며, 외부 네트워킹 라이브러리/폴리필이 이를 우회할 수 있다고 공식 문서에 명시됨.
- RN 본가가 cookie 기반 인증에 대해 **"currently unstable"** 이라고 공식 인정. iOS 302 리다이렉트 시 Set-Cookie 처리 부정확.

### 우리 가치의 시간축 시나리오

1. **현재**: native-bridge의 DevTools 가시성 + 시맨틱 통합이 모두 가치.
2. **RN 본가가 mock 가시성 흡수 시**: native-bridge의 단순 가시성 가치 약화 → 무게중심을 **시맨틱 통합 패키지**(cookies/cache/redirect)로 이동. 이 영역은 RN 본가가 절대 흡수 못 함.
3. **장기**: 브라우저 시맨틱 호환 자체가 핵심 가치. DevTools 가시성은 부가 가치로 전환.

### 분기별 환경 재평가

매 분기 `/daily-checkup` 또는 별도 명령으로 다음을 점검한다:
- RN 신버전의 Network DevTools 변경 사항
- MSW 메이저 변경
- 새 경쟁자 등장 여부
- 우리 차별점 유효성 재확인

결과는 `docs/COMPETITIVE_LANDSCAPE.md`에 누적하여 추적한다.

---

## 비-목표 (이건 우리가 하지 않는다)

- GraphQL 클라이언트 구현 (Apollo/urql 등이 우리 위에서 동작하면 됨)
- 상태관리 (React Query/SWR과 통합만 제공)
- 인증서 pinning (별도 라이브러리의 영역)
- 백엔드 mock 서버 (`json-server` 등이 그 영역)
- 네이티브 모듈의 일반적 통신 (오직 HTTP 영역만)

---

## 이 문서를 다시 읽어야 할 때

다음 상황이 오면 코드 작업을 멈추고 이 문서로 돌아와라:

1. "이 기능을 추가할까?"라는 결정 앞에서 망설일 때
2. 두 가지 구현 방식 사이에서 갈등할 때
3. 사용자에게 "이건 RN 한계입니다"라고 말하고 싶어질 때 → 한 번 더 의심
4. 일정 압박으로 표준을 어기고 싶어질 때
5. 새 의존성을 추가하고 싶을 때

이 문서를 다시 읽으면 90%의 결정은 자명해진다.
