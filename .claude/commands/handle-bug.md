---
description: 버그 이슈를 받아 재현 → 수정 → PR까지.
---

# 버그 처리

대상 이슈: #$ARGUMENTS

## 실행 (순서 엄수)

1. **이슈 정독**
   - `gh issue view $ARGUMENTS`
   - 재현 단계, 환경, 기대/실제 동작 확인
   - 정보 부족 시 `/triage-issue`로 재진입 제안하고 중단

2. **재현 시도**
   - 이슈에 명시된 환경 재구성 (RN 버전, 패키지 버전)
   - 재현 코드를 `harness/e2e-scenarios/repro/issue-$ARGUMENTS.yaml`에 저장
   - 재현되면 OK, 안 되면 사용자에게 환경 차이 보고

3. **이슈에 진행 코멘트**
   - `gh issue comment $ARGUMENTS --body "재현 확인. 수정 작업 시작합니다."`

4. **브랜치**
   - `git checkout -b fix/issue-$ARGUMENTS`

5. **실패 테스트 추가**
   - 재현 시나리오를 정식 회귀 테스트로 추가
   - 테스트가 정말 실패하는지 먼저 확인 (`pnpm test`)

6. **원인 분석 및 수정**
   - 관련 코드 추적
   - 최소 변경으로 수정
   - 부수 효과 확인

7. **검증**
   - `pnpm verify --filter <영향 패키지>`
   - `pnpm harness:e2e -- --filter repro/issue-$ARGUMENTS`
   - 두 플랫폼 빌드

8. **트러블슈팅 카탈로그 업데이트**
   - `/add-troubleshoot-entry`로 이번 패턴을 docs/TROUBLESHOOTING.md에 추가

9. **커밋 & PR**
   - `git commit -m "fix(<package>): <한 줄 요약> (#$ARGUMENTS)"`
   - `gh pr create --title "fix: ..." --body-file <PR_body>`
   - PR 본문에 `Fixes #$ARGUMENTS` 포함
   - 라벨: `bug`, 영향 패키지

10. **이슈에 PR 링크 코멘트**
    - `gh issue comment $ARGUMENTS --body "PR #<n> 으로 수정 작업 진행 중입니다."`

11. **사용자 보고**
    - 재현 여부, 원인, 변경 파일, PR URL
