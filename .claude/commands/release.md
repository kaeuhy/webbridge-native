---
description: 릴리즈 절차를 자동으로 수행.
---

# 릴리즈

대상 버전: $ARGUMENTS (예: 0.2.0)

## 사전 검증 (실패 시 즉시 중단)
1. `git status` 깨끗
2. `git branch --show-current` == `main`
3. `git pull --ff-only origin main` 성공
4. `pnpm verify` 통과
5. `pnpm harness:all` 통과
6. 미반영 changeset 확인: `pnpm changeset status`
7. 버전 올라갈 패키지 목록 출력. 사용자 승인 대기.

## 사용자 승인 후
8. `pnpm changeset version` (CHANGELOG.md, package.json 자동 업데이트)
9. 변경 사항 검토 출력. 사용자 재승인.

## 사용자 재승인 후
10. `git add -A && git commit -m "chore(release): v$ARGUMENTS"`
11. `git tag v$ARGUMENTS`
12. `git push origin main --tags`
13. GitHub Release 생성:
    ```
    gh release create v$ARGUMENTS \
      --title "v$ARGUMENTS" \
      --notes-file <CHANGELOG에서 추출한 본문>
    ```
14. CI가 npm publish 트리거하는지 확인 (release.yml)
15. publish 완료 모니터링 (`gh run watch`)
16. 마일스톤 닫기: `gh api repos/:owner/:repo/milestones/<id> -X PATCH -f state=closed`
17. 다음 마일스톤 자동 생성
18. 트위터/Discord/Discussion 공지 텍스트 초안 생성 (사용자가 직접 게시)
