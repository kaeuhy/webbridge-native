---
description: 매일 아침 한 번 — 프로젝트 건강 점검.
---

# Daily Checkup

## 점검 항목

1. **CI 상태**
   - `gh run list --limit 10`
   - 실패 있으면 분석 보고

2. **신규 이슈**
   - `gh issue list --label "needs-triage" --state open`
   - 트리아지되지 않은 이슈 목록

3. **stale 이슈** (30일 이상 활동 없음)
   - `gh issue list --search "updated:<$(date -v-30d +%Y-%m-%d)"`
   - stale 라벨 부착 제안

4. **stale PR**
   - `gh pr list --state open --json updatedAt`
   - 7일 이상 활동 없는 PR

5. **의존성 보안**
   - `pnpm audit`
   - 새 보안 이슈 있으면 보고

6. **상위 의존성 변경**
   - `/sync-upstream all`의 빠른 버전

7. **harness 회귀**
   - 마지막 main 커밋 기준 harness 결과
   - 회귀 발견 시 이슈 자동 생성

## 출력
일일 리포트 형식:
```
Daily Checkup — <날짜>

즉시 조치 필요 (N):
  - ...

검토 필요 (N):
  - ...

양호:
  - ...
```
