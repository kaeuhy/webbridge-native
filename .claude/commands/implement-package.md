---
description: 패키지를 자동 구현. SPEC.md → 테스트 → 구현 → 검증 → PR.
---

# 패키지 자동 구현

대상: $ARGUMENTS

## 실행 순서 (절대 건너뛰지 마라)

1. **사전 점검**
   - `packages/$ARGUMENTS/SPEC.md` 읽기. 없으면 중단.
   - CLAUDE.md 워크플로우 재확인.
   - `git status` 깨끗한지 확인. 더러우면 중단.

2. **이슈 확인**
   - `gh issue list --label "package: $ARGUMENTS"` 실행.
   - 관련 이슈가 있으면 PR 본문에 "Closes #N" 포함.

3. **브랜치**
   - `git checkout -b feat/$ARGUMENTS-impl`

4. **하네스 시나리오**
   - SPEC의 "완료 정의"를 보고 해당 harness에 실패 시나리오 추가.

5. **체크리스트 순회 구현**
   - SPEC의 "기능 체크리스트"를 위에서부터 하나씩.
   - 각 항목 후 `pnpm test --filter @webbridge-native/$ARGUMENTS`.
   - 실패 시 즉시 수정. 3회 반복 실패 시 보고.

6. **하네스 통과 확인**
   - `pnpm harness:wpt -- --suite=$ARGUMENTS`.
   - 통과율 < 90%면 실패 케이스 분석 후 추가 수정.

7. **양쪽 플랫폼 검증**
   - iOS: `pnpm --filter example-basic ios`
   - Android: `pnpm --filter example-basic android`
   - 한쪽 실패 → 보고.

8. **커밋 & 푸시**
   - `git add -A`
   - `git commit -m "feat($ARGUMENTS): <기능 요약>"`
   - `git push -u origin feat/$ARGUMENTS-impl`

9. **PR 생성**
   - `gh pr create` (07-GITHUB_WORKFLOW.md 템플릿)
   - 본문에 SPEC 체크리스트 + harness 결과 포함
   - 라벨: `package: $ARGUMENTS`, 적절한 tier
   - 사용자에게 PR URL 보고

## 보고 형식
각 단계 끝에 한 줄:
`[1/9] 사전 점검 완료. SPEC 13개 항목 확인.`
`[5/9] 7번째 항목 (SameSite=Lax) 구현 중. 12/14 테스트 통과.`
