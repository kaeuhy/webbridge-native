# Competitive Landscape — WebBridge Native 경쟁 환경 추적

> **이 문서는 `/check-competitive-landscape` 명령으로 분기마다 자동 업데이트된다.**

---

## 2026-04-27 — 초기 조사

### RN 본가
- RN 0.76 (2024.10): React Native DevTools 출시. Network 패널 미포함.
- RN 0.81+ (2025): fetch, XHR, `<Image>` 네트워크 요청 자동 기록 시작.
- 인터셉트 위치: fetch/XHR JS 레벨. 외부 라이브러리 우회 가능.
- Cookie 기반 인증: "currently unstable" (공식 문서 인정).
- mock 가시성: 미보장.

### 직접 경쟁자
| 솔루션 | 푸는 문제 | 안 푸는 문제 |
|---|---|---|
| MSW (`msw/native`) | RN에서 MSW DSL 사용 | DevTools에 mock 안 보임, 시맨틱 통합 없음 |
| Radon IDE Network Inspector | iOS NSURLSession 스위즐, Android fetch/XHR 캡처 | IDE 종속, mock/cookies/cache 미제공 |

### 부분 솔루션
| 솔루션 | 영역 | 한계 |
|---|---|---|
| `@react-native-cookies/cookies` | 쿠키 get/set | 자동 관리 없음, RFC 6265 미준수 |
| `react-native-nitro-cookies` | 동기 쿠키 API | 수동 관리, 자동 첨부 없음 |
| `fetch-cookie` | Node.js 쿠키 첨부 | RN 비호환 가능 |
| `react-native-network-logger` | 네트워크 인스펙션 | mock 없음 |
| `@react-native-community/fetch` | 스트리밍 fetch | CORS/cookie 한계 인정만 |

### 차별점 상태
- **유지**: 시맨틱 통합 (cookies+cache+redirect+headers+CORS), MSW 호환 mock, 브라우저 표준 준수
- **약화 가능성**: native-bridge 단순 DevTools 가시성 (RN 본가 흡수 중)
- **강화**: 통합 라이브러리로서의 유일성

---

_다음 점검: 2026 Q3 (`/check-competitive-landscape` 실행)_
