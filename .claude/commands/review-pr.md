---
description: 외부 컨트리뷰터 PR을 자동 1차 리뷰.
---

# PR 리뷰

대상: #$ARGUMENTS

## 실행
1. `gh pr view $ARGUMENTS --json title,body,files,labels,author`
2. `gh pr diff $ARGUMENTS`
3. 자동 점검 항목:
   - [ ] CI 통과? (`gh pr checks $ARGUMENTS`)
   - [ ] CLAUDE.md 절대 규칙 위반?
   - [ ] SPEC.md에 정의된 API만 사용?
   - [ ] 테스트 추가됨?
   - [ ] iOS/Android 양쪽 변경?
   - [ ] Conventional Commits 준수?
   - [ ] 외부 의존성 추가? (있으면 의심)
4. 점검 결과 PR 코멘트로 게시
5. 결정:
   - 모든 항목 통과 → "approve" 권장 (사용자에게 확인 후 `gh pr review --approve`)
   - 1-2개 사소한 문제 → "request changes" 코멘트 자동 작성
   - 큰 문제 → 사용자에게 보고하고 직접 리뷰 요청
6. 사용자 승인 후에만 실제 review 액션 실행
