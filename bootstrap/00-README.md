# 00-README.md — Claude Code 진입점

> **이 파일은 Claude Code가 가장 먼저 읽어야 할 진입점이다.**
> 사람(프로젝트 오너)은 `HOW_TO_USE.md`부터 읽는다.

---

## 너(Claude Code)에게

이 폴더는 **WebBridge Native** 오픈소스 프로젝트의 모든 사전 설계 문서다. 너는 이 문서들을 읽고, 빈 폴더에서 실제 프로젝트를 부트스트랩하고, 그 이후 모든 일상 운영(버그 처리, 버전 업데이트, 릴리즈, 이슈 트리아지)까지 자율적으로 수행해야 한다.

사용자(프로젝트 오너)는 이미 이 문서들의 내용을 알고 있다. 너만 모를 뿐이다. 그러므로 추측하지 말고 **반드시 문서를 먼저 읽어라**.

---

## 프로젝트명

- **공식 이름**: WebBridge Native
- **GitHub repo**: `webbridge-native`
- **npm scope**: `@webbridge-native`
- **패키지 예**: `@webbridge-native/core`, `@webbridge-native/cookies`, `@webbridge-native/mock`

이 이름들을 모든 코드/문서에서 일관되게 사용하라. 절대 `rn-browser-net`이나 다른 이름을 쓰지 마라.

---

## 작업 시작 전 반드시 읽을 순서

다음 8개 문서를 **이 순서대로** 끝까지 읽어라. 한 글자도 건너뛰지 마라.

1. `01-INTENT.md` — 프로젝트가 풀려는 문제의 본질 (북극성)
2. `02-PROJECT_PLAN.md` — Tier 1~4 로드맵, 패키지 구조, 마일스톤
3. `03-ARCHITECTURE.md` — 4-Layer 기술 아키텍처, 브라우저 vs RN 차이
4. `04-IMPLEMENTATION.md` — Native Bridge 핵심 구현 디테일
5. `05-AUTOMATION.md` — 자가 자동화 인프라 (슬래시 명령, 하네스, 훅)
6. `06-OPERATIONS.md` — 일상 운영 (버그 처리, 버전 관리, 릴리즈)
7. `07-GITHUB_WORKFLOW.md` — `gh` CLI 기반 모든 GitHub 자동화
8. `08-TROUBLESHOOTING.md` — 알려진 문제와 해결법 카탈로그

이 8개를 다 읽기 전까지는 **절대 어떤 코드도 쓰지 마라**.

---

## 읽었다는 증거 제출 (필수)

8개 문서를 다 읽으면 다음 정확한 형식으로 보고하라. 사용자 승인 전까지 어떤 파일도 만들지 마라.

```
[BOOTSTRAP READING REPORT]

✓ 01-INTENT.md
   한 줄 요약: <직접 작성. 절대 잃지 말 것 4가지를 한 줄씩 요약>

✓ 02-PROJECT_PLAN.md
   Tier 1 패키지: <목록>
   첫 마일스톤: <내용>

✓ 03-ARCHITECTURE.md
   4-Layer 이름: <Layer 1~4 한 단어씩>
   가장 큰 리스크: <식별한 1개>

✓ 04-IMPLEMENTATION.md
   가장 어려운 기술 문제: <한 줄>
   채택한 해결 경로: <경로 A or B 와 이유>

✓ 05-AUTOMATION.md
   슬래시 명령 수: <개수>
   하네스 4종: <이름들>

✓ 06-OPERATIONS.md
   운영 사이클 종류: <daily/weekly/monthly 등 식별>
   사용자 개입이 필요한 결정: <식별한 항목들>

✓ 07-GITHUB_WORKFLOW.md
   gh CLI 사용 시나리오: <개수>
   라벨 분류 체계: <카테고리들>

✓ 08-TROUBLESHOOTING.md
   초기 카탈로그 항목 수: <개수>
   카테고리: <목록>

[QUESTIONS] (있으면 적고, 없으면 "없음")
- ...

[READY TO PROCEED?] 사용자 승인 대기 중.
```

---

## 부트스트랩 작업 8단계

사용자 승인 후, 다음 8단계를 **한 번에 하나씩** 진행하라. 각 단계 완료 시 사용자에게 보고하고 다음 단계로 가도 되는지 명시적으로 물어라.

### Step 1. Monorepo 스캐폴딩
- pnpm workspace + Turborepo
- `02-PROJECT_PLAN.md`의 "Repository 구조"를 그대로 따른다
- 빈 패키지라도 `package.json`은 있어야 함
- 모든 패키지명은 `@webbridge-native/<n>`
- `pnpm install` 통과까지 확인

### Step 2. CLAUDE.md (프로젝트 헌법) 작성
- `05-AUTOMATION.md`의 1절 + `06-OPERATIONS.md`의 행동 규칙 + `07-GITHUB_WORKFLOW.md`의 GitHub 규칙을 통합
- 프로젝트 루트에 위치
- 절대 규칙, 자동 검증 명령어, 작업 워크플로우, GitHub 액션 규칙, 에러 대응 규칙 모두 포함

### Step 3. 슬래시 명령 작성 (10개 이상)
- `.claude/commands/` 폴더에 다음 모든 명령 파일 생성:
  - `implement-package.md` (구현)
  - `verify-tier.md` (회귀 검증)
  - `poc.md` (PoC)
  - `triage-issue.md` (이슈 트리아지)
  - `handle-bug.md` (버그 처리)
  - `release.md` (릴리즈)
  - `sync-upstream.md` (상위 의존성 변경 대응)
  - `review-pr.md` (PR 리뷰)
  - `daily-checkup.md` (일일 점검)
  - `add-troubleshoot-entry.md` (트러블슈팅 자가 확장)
- 각 명령의 상세 내용은 `05-AUTOMATION.md`와 `06-OPERATIONS.md` 참고

### Step 4. Harness 골격 작성
- `harness/wpt-runner/`, `harness/browser-comparator/`, `harness/e2e-scenarios/`, `harness/perf-bench/`
- 각각 `run.js` 빈 골격
- **반드시 JSON 결과를 stdout으로 출력**
- exit code 규약: 통과 0, 부분 실패 1, 인프라 오류 2

### Step 5. GitHub 인프라 셋업
- `.github/ISSUE_TEMPLATE/` (bug, feature, question 3종)
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ci.yml` (lint, typecheck, test, harness)
- `.github/workflows/release.yml` (Changesets 기반)
- `.github/labels.yml` (라벨 정의 — `07-GITHUB_WORKFLOW.md` 참고)
- 라벨은 `gh label create`로 자동 생성
- Branch protection은 권한 문제로 자동 설정 불가 → 사용자에게 가이드

### Step 6. 첫 패키지 SPEC.md 작성
- `packages/cookies/SPEC.md`
- `02-PROJECT_PLAN.md`의 Tier 1.2 cookies 명세를 SPEC 형식으로
- 완료 정의, 기능 체크리스트, 금지 사항, 참고 문서 모두 포함

### Step 7. PoC 스크립트 작성
- `scripts/poc-devtools-visibility.js`
- 목표: NSURLProtocol 합성 응답이 RN DevTools에 표시되는지 검증
- 이게 통과해야 전체 프로젝트가 의미 있음

### Step 8. 초기 README + 트러블슈팅 시드
- 프로젝트 루트 `README.md` (배지, 한 줄 설명, 빠른 시작)
- `docs/TROUBLESHOOTING.md` (`08-TROUBLESHOOTING.md`의 초기 카탈로그를 시드로)
- 첫 GitHub 이슈 자동 생성: "Day 1 PoC: DevTools 가시성 검증"
- 첫 마일스톤 생성: "v0.1.0 alpha"

---

## 작업 행동 규칙

### 일반 규칙
- **추측 금지**: 모르면 사용자에게 질문. 외부 패키지 이름이나 RN API 시그니처를 기억으로 적지 마라.
- **외부 패키지 설치 금지**: 새 npm 패키지 추가 전 사용자 승인.
- **3회 규칙**: 같은 에러로 3회 막히면 시도 멈추고 보고.
- **빌드 검증**: 각 단계 끝에 `pnpm install` 또는 `pnpm typecheck`가 통과해야 함.
- **커밋 단위**: 각 Step을 별도 커밋으로. Conventional Commits 사용.

### GitHub 액션 규칙 (중요)
- **읽기 작업은 자율**: `gh issue list`, `gh pr view`, `gh run list` 등은 승인 없이 사용 가능.
- **쓰기 작업은 명시 트리거 후만**: `gh issue create`, `gh pr create`, `gh release create`는 사용자가 명시적으로 슬래시 명령을 실행했거나, 부트스트랩 Step 5처럼 계획에 명시된 경우에만.
- **삭제/덮어쓰기는 항상 승인**: `gh issue close`, `gh pr close`, force push 등은 매번 승인.
- **자세한 규칙은 `07-GITHUB_WORKFLOW.md` 참고**

### 변경 안전 규칙
- 부트스트랩 문서(`bootstrap/*.md`)는 사용자 명시 요청 없이 수정 금지
- `CLAUDE.md`는 운영 중에도 사용자 승인 필요 (헌법은 자주 안 바꾼다)
- `08-TROUBLESHOOTING.md`(또는 `docs/TROUBLESHOOTING.md`) — 새 항목 추가는 자유. 단 기존 항목 변경/삭제는 승인 필요.

---

## 첫 행동 (지금 당장)

이 메시지를 받은 직후, 다른 어떤 행동보다 먼저:

1. `01-INTENT.md`부터 `08-TROUBLESHOOTING.md`까지 8개 파일을 순서대로 읽는다
2. 위 명시된 `[BOOTSTRAP READING REPORT]` 형식으로 요약 보고
3. 사용자 승인 대기

이게 첫 행동이다. 사용자가 "Step 1 진행해"라고 하기 전까지는 코드를 만들지 않는다.
