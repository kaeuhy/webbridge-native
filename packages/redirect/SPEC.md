# SPEC.md — @webbridge-native/redirect

> **Redirect 정밀 제어 — 브라우저와 동일한 3xx 처리.**

## 패키지 정보

| 항목 | 내용 |
|---|---|
| 이름 | `@webbridge-native/redirect` |
| Tier | 2 |
| 의존성 | `@webbridge-native/core` |

## 기능 체크리스트

- [ ] 301/302/303 → method를 GET으로 변경, body 제거
- [ ] 307/308 → method/body 유지
- [ ] Max 5 redirects (초과 시 에러)
- [ ] Cross-origin 시 Authorization 헤더 strip
- [ ] `redirect: 'manual'` → 3xx 응답 그대로 반환
- [ ] `redirect: 'error'` → 3xx 시 에러 throw
- [ ] `redirect: 'follow'` → 자동 follow (기본)
- [ ] Response.redirected = true, Response.url = 최종 URL
- [ ] core Interceptor 타입 준수

## 금지 사항

- any 타입 금지
- 외부 의존성 금지
