---
description: Tier 전체 회귀 검증.
---

# Tier 회귀 검증

대상: Tier $ARGUMENTS

## 실행
1. `bootstrap/02-PROJECT_PLAN.md`에서 Tier 패키지 목록 확인
2. 각 패키지에 `pnpm verify --filter <pkg>`
3. `pnpm harness:all`
4. 실패 정리:
   ```
   ❌ @webbridge-native/cookies — WPT samesite-lax-post 실패
       기대: cookie not sent
       실제: cookie sent
       위치: src/cookie-jar.ts:142
   ```
5. 자동 수정 시도 (각 항목 최대 3회).
6. 못 고치는 건 GitHub 이슈 자동 생성 (라벨: `bug`, `tier-$ARGUMENTS`).
7. 이슈 URL과 함께 사용자 보고.
