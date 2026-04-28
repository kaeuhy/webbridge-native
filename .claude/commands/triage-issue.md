---
description: GitHub 이슈를 분석하고 분류한다.
---

# 이슈 트리아지

대상: #$ARGUMENTS

## 실행
1. `gh issue view $ARGUMENTS --json number,title,body,labels,author,createdAt`
2. 본문 분석:
   - 카테고리 식별: bug | feature request | question | duplicate | invalid
   - 영향 패키지 식별: cookies / cache / mock / native-bridge / ...
   - 심각도: critical / high / medium / low
   - 재현 가능성: yes / no / needs-info
3. 라벨 자동 부착:
   - `gh issue edit $ARGUMENTS --add-label "<labels>"`
   - 카테고리 라벨 1개 + 패키지 라벨 1개 + 심각도 1개
4. 중복 검색:
   - `gh issue list --search "<유사 키워드>"` 실행.
   - 중복 의심 시 사용자에게 확인 요청.
5. 정보 부족 시:
   - "needs-info" 라벨 부착
   - `gh issue comment`으로 추가 정보 요청 (07-GITHUB_WORKFLOW.md 템플릿)
6. 명백한 버그 + 재현 정보 충분 시:
   - 자동으로 `/handle-bug` 흐름으로 진입할지 사용자에게 제안
7. 트리아지 결과 보고:
   ```
   #142: "쿠키가 앱 재시작 후 사라짐"
   카테고리: bug
   패키지: cookies
   심각도: high
   재현 가능: yes (재현 단계 명확)
   라벨 부착: bug, package: cookies, severity: high
   중복: 없음
   다음 행동 제안: /handle-bug 142
   ```
