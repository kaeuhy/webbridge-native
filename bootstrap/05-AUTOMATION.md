# 05-AUTOMATION.md — 자가 자동화 인프라 설계

> **이 문서는 Claude Code가 "자율 구현 시스템"을 만드는 설계도다.**
> 너가 만드는 인프라이자 너 자신이 따를 규칙.

---

## 핵심 발상

> **사용자가 한 줄 던지면, Claude Code가 알아서 모든 것을 한다.**

이게 가능하려면:
1. **명확한 규칙** (CLAUDE.md)
2. **자기 검증 인프라** (Harness)
3. **표준화된 명령** (Slash Commands)
4. **자동 트리거** (Hooks)
5. **GitHub 운영 자동화** (`gh` CLI 통합 — 자세한 건 `07-GITHUB_WORKFLOW.md`)
6. **문제 카탈로그** (`08-TROUBLESHOOTING.md`)

---

## 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│ 사용자 입력 (한 줄)                                         │
│ 예: "/handle-bug 쿠키가 앱 재시작 후 사라짐"                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ CLAUDE.md (프로젝트 헌법) — 모든 행동의 기준                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Slash Commands (10개+) — 표준화된 워크플로우                │
│  /implement-package, /verify-tier, /poc                     │
│  /triage-issue, /handle-bug, /release                       │
│  /sync-upstream, /review-pr, /daily-checkup                 │
│  /add-troubleshoot-entry                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Decision Matrix — 각 상황별 자율 vs 사용자 승인 결정         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 실행 도구                                                   │
│  - Hooks (파일 저장 시 자동 typecheck)                      │
│  - Harness (검증의 객관화)                                  │
│  - gh CLI (GitHub 자동화)                                   │
│  - Subagents (영역별 전문가)                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 자가 학습                                                   │
│  - 새 문제 해결 시 docs/TROUBLESHOOTING.md에 자동 추가      │
│  - CLAUDE.md의 행동 규칙은 사용자 승인 후 보강              │
└─────────────────────────────────────────────────────────────┘
```

---

# 1. CLAUDE.md — 프로젝트 헌법

부트스트랩 Step 2에서 다음 내용으로 프로젝트 루트에 작성한다. **이게 너의 모든 행동을 규정한다**.

````markdown
# CLAUDE.md — WebBridge Native 프로젝트 헌법

## 너는 누구인가
WebBridge Native의 시니어 컨트리뷰터. RN, TypeScript, iOS(Swift), Android(Kotlin) 모두 다룬다.
모든 작업은 "Harness-Driven Vibe Coding" 원칙을 따른다.

## 프로젝트 정체성
- 이름: WebBridge Native
- repo: webbridge-native
- npm: @webbridge-native/*
- 절대 다른 이름 사용 금지

## 작업 시작 전 반드시 할 것
1. `bootstrap/01-INTENT.md` (의도)
2. `bootstrap/02-PROJECT_PLAN.md` (Tier)
3. `bootstrap/03-ARCHITECTURE.md` (4-Layer)
4. `bootstrap/06-OPERATIONS.md` (운영)
5. `bootstrap/07-GITHUB_WORKFLOW.md` (gh 사용법)
6. `bootstrap/08-TROUBLESHOOTING.md` (알려진 문제)
7. 작업할 패키지의 `packages/<n>/SPEC.md`
8. `docs/TROUBLESHOOTING.md` (자가 확장 카탈로그)

## 절대 규칙 (위반 시 작업 중단)
- 테스트 없이 기능 코드 작성 금지 (실패 테스트 먼저)
- harness 통과 없이 PR 생성 금지
- SPEC.md에 정의되지 않은 API 임의 추가 금지
- iOS/Android 한 쪽만 구현하고 끝내기 금지
- 외부 의존성 추가 시 사용자 승인 필수
- bootstrap/*.md 수정 시 사용자 명시 요청 필요
- CLAUDE.md(이 파일) 수정 시 사용자 승인 필요

## 자동 검증 명령어
- 전체: `pnpm verify`
- 패키지별: `pnpm verify --filter @webbridge-native/<n>`
- Harness: `pnpm harness:wpt`, `pnpm harness:compare`, `pnpm harness:e2e`
- 빠른 점검: `pnpm typecheck && pnpm lint && pnpm test`

## 작업 워크플로우
1. `git checkout -b <type>/<short-desc>` (type: feat/fix/chore/docs/refactor)
2. SPEC.md 체크리스트 확인
3. 실패 harness 시나리오 추가
4. 구현
5. `pnpm verify --filter` 통과
6. `pnpm harness:<관련>` 통과
7. Conventional Commits로 커밋
8. `gh pr create` (07-GITHUB_WORKFLOW.md 형식)

## GitHub 액션 규칙
- 읽기 (자율): `gh issue list`, `gh pr view`, `gh run list`
- 쓰기 (명시 트리거 후): `gh issue create`, `gh pr create`, `gh release create`
- 삭제/덮어쓰기 (매번 승인): `gh issue close`, `gh pr close --delete-branch`, force push
- 댓글 작성: 슬래시 명령 안에서만, 형식은 07-GITHUB_WORKFLOW.md

## 막힐 때 행동 규칙
- 같은 에러 3회 반복 → 추측 멈추고 보고
- 네이티브 빌드 실패 → clean build 1회 시도, 실패면 보고
- 외부 라이브러리 버그 의심 → 검색 후 회피책 제안
- 새 패턴/문제 발견 → /add-troubleshoot-entry로 카탈로그에 추가

## 코드 스타일
- TS strict, no `any` (불가피하면 주석 + 이슈 링크)
- 함수 50줄 초과 시 분리 검토
- public API JSDoc 필수
- 네이티브 코드 README에 빌드 방법 명시

## 보안 규칙
- 비밀 키, 토큰, 비밀번호 절대 커밋 금지
- `.env`, `*.key`, `*.p12`는 .gitignore 필수
- npm publish 토큰은 GitHub Secrets에만
- 사용자 코드에 우리 로깅 라이브러리가 비밀 출력 시 즉시 마스킹
````

---

# 2. SPEC.md — 패키지별 명세서 (변동 없음)

패키지마다 `packages/<n>/SPEC.md`. 형식은 부트스트랩 Step 6에서 cookies 패키지 예시로 작성. `02-PROJECT_PLAN.md`의 각 패키지 절을 SPEC 형식으로 변환.

---

# 3. Harness — 검증 객관화

## 4가지 하네스

### Harness 1: WPT Runner
- WPT의 fetch/cookie/cache 부분을 RN 위에서
- Detox 또는 Maestro
- 통과율 README 배지

### Harness 2: Browser Comparator
- Playwright vs RN 디바이스 응답 비교
- 매 PR 자동

### Harness 3: E2E Scenarios
- YAML 기반 시나리오

```yaml
scenario: login_flow
steps:
  - request: POST /login {email, password}
    expect: 200, Set-Cookie present
  - request: GET /me
    expect: 200, Cookie 헤더 첨부됨
```

### Harness 4: Performance Bench
- 1000 req/sec 처리 시 메모리/CPU
- 회귀 감지

## 출력 규약 (필수)

모든 harness는 stdout에 JSON, exit code 0/1/2.

```json
{
  "harness": "wpt",
  "suite": "cookies",
  "passed": 87,
  "failed": 13,
  "passRate": 0.87,
  "failures": [
    {
      "test": "Set-Cookie SameSite=Lax cross-site POST",
      "expected": "cookie not sent",
      "actual": "cookie sent",
      "file": "wpt/cookies/samesite/lax-post.html"
    }
  ]
}
```

## package.json 스크립트

```json
{
  "scripts": {
    "verify": "turbo run typecheck lint test",
    "verify:full": "pnpm verify && pnpm harness:all",
    "harness:wpt": "node harness/wpt-runner/run.js",
    "harness:compare": "node harness/browser-comparator/run.js",
    "harness:e2e": "node harness/e2e-scenarios/run.js",
    "harness:perf": "node harness/perf-bench/run.js",
    "harness:all": "pnpm harness:wpt && pnpm harness:compare && pnpm harness:e2e",
    "poc:devtools-visibility": "node scripts/poc-devtools-visibility.js"
  }
}
```

---

# 4. Hooks — 자동 트리거

`.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/auto-typecheck.js \"$CLAUDE_FILE_PATH\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '작업 종료. pnpm verify 권장.'"
          }
        ]
      }
    ]
  }
}
```

`scripts/auto-typecheck.js`는 변경 파일에서 패키지를 추론해 해당 패키지만 typecheck.

---

# 5. Slash Commands (총 10개)

`.claude/commands/` 폴더에 다음 모든 파일 작성.

## 5.1 `/implement-package <name>`

`.claude/commands/implement-package.md`:

````markdown
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
````

## 5.2 `/verify-tier <n>`

`.claude/commands/verify-tier.md`:

````markdown
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
````

## 5.3 `/poc <feature>`

`.claude/commands/poc.md`:

````markdown
---
description: 위험 가정을 작은 PoC로 검증.
---

# PoC 검증

가정: $ARGUMENTS

## 행동
1. `scripts/poc-*.js` 중 관련 있는지 확인.
2. 없으면 `scripts/poc-<topic>.js` 새로 작성.
3. 최소 코드. 프로덕션 품질 신경 쓰지 마라.
4. 결과:
   ```
   ✓ 가정: NSURLProtocol 합성 응답이 RN DevTools에 표시
     결과: 표시됨 (artifacts/poc-devtools-1.png)
     결론: 경로 B 진행 가능
   ```
5. 결과를 GitHub Discussion에 자동 게시 (선택, 사용자 승인 시).
````

## 5.4 `/triage-issue <issue-number>`

`.claude/commands/triage-issue.md`:

````markdown
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
   - `gh issue comment` 으로 추가 정보 요청 (07-GITHUB_WORKFLOW.md 템플릿)
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
````

## 5.5 `/handle-bug <issue-number>`

`.claude/commands/handle-bug.md`:

````markdown
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
   - 다음에 같은 문제 발생 시 즉시 해결 가능하게

9. **커밋 & PR**
   - `git commit -m "fix(<package>): <한 줄 요약> (#$ARGUMENTS)"`
   - `gh pr create --title "fix: ..." --body-file <PR_body>`
   - PR 본문에 `Fixes #$ARGUMENTS` 포함
   - 라벨: `bug`, 영향 패키지

10. **이슈에 PR 링크 코멘트**
    - `gh issue comment $ARGUMENTS --body "PR #<n> 으로 수정 작업 진행 중입니다."`

11. **사용자 보고**
    - 재현 여부, 원인, 변경 파일, PR URL
````

## 5.6 `/release <version>`

`.claude/commands/release.md`:

````markdown
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
````

## 5.7 `/sync-upstream <package>`

`.claude/commands/sync-upstream.md`:

````markdown
---
description: 상위 의존성(MSW, RN, OkHttp 등) 변경 추적 및 대응.
---

# 상위 의존성 동기화

대상: $ARGUMENTS (msw | react-native | okhttp | http-cache-semantics | tough-cookie | all)

## 실행
1. 각 의존성의 latest 버전 확인
   - msw: `npm view msw versions --json`
   - RN: `npm view react-native versions --json`
   - OkHttp: maven central API
2. 현재 사용 버전과 비교
3. 변경 로그/CHANGELOG 확인
   - `gh api repos/<owner>/<repo>/releases` 또는 npm registry
4. Breaking change 여부 분석:
   - public API 변경?
   - 인터셉터 동작 변경?
   - 메이저 버전 점프?
5. 영향 평가:
   - 우리 코드의 어느 부분이 영향받나
   - 우리 harness가 깨질지 예상
6. 보고 형식:
   ```
   📦 msw 2.4.0 → 2.6.1
   변경:
     - `HttpResponse.error()` 시그니처 변경 (breaking)
     - 새 path matcher 패턴 (additive)
   영향 받는 우리 파일:
     - packages/mock/src/response-builder.ts
   추천 행동:
     - mock 패키지의 response-builder 마이그레이션 필요
   ```
7. 마이그레이션 작업이 필요하면:
   - GitHub 이슈 자동 생성 (라벨: `upstream-sync`, 영향 패키지)
   - 마일스톤: 다음 minor 버전
   - 사용자에게 작업 진행 여부 질문
````

## 5.8 `/review-pr <pr-number>`

`.claude/commands/review-pr.md`:

````markdown
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
````

## 5.9 `/daily-checkup`

`.claude/commands/daily-checkup.md`:

````markdown
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
   - `gh issue list --search "updated:<$(date -d '30 days ago' +%Y-%m-%d)"`
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
📅 Daily Checkup — 2026-04-27

🔴 즉시 조치 필요 (2):
  - CI 실패: main 브랜치 cookies 패키지 빌드 실패 (#run/12345)
  - 보안: tough-cookie HIGH 등급 취약점 발견

🟡 검토 필요 (3):
  - 신규 이슈 5개 (트리아지 미수행)
  - stale PR: #87 (12일째 응답 없음)
  - msw 2.6.1 출시 (breaking change 가능성)

🟢 양호:
  - harness 회귀 없음
  - 모든 의존성 최신
```
````

## 5.10 `/add-troubleshoot-entry`

`.claude/commands/add-troubleshoot-entry.md`:

````markdown
---
description: 방금 해결한 문제를 트러블슈팅 카탈로그에 추가.
---

# 트러블슈팅 카탈로그 자가 확장

## 실행
1. 직전 작업/대화 컨텍스트에서 문제와 해결을 추출
2. 다음 형식으로 `docs/TROUBLESHOOTING.md`에 항목 추가:
   ```markdown
   ## TS-NNN: <한 줄 제목>

   ### 증상 (Symptom)
   - 사용자가 무엇을 보는가
   - 어떤 에러 메시지

   ### 진단 (Diagnosis)
   - 왜 발생하는가
   - 어떻게 확인하는가

   ### 해결 (Fix)
   - 단계별 해결 방법
   - 코드 변경 예시

   ### 예방 (Prevention)
   - 다음에 같은 문제 안 생기게 하는 방법

   ### 관련
   - 이슈: #N
   - PR: #M
   - 키워드: <검색용>
   ```
3. TS 번호는 기존 최댓값 + 1
4. 카테고리(Build/Test/Native/JS/CI)에 따라 적절한 섹션에 삽입
5. 커밋: `docs(troubleshoot): add TS-NNN <제목>`
````

---

# 6. Decision Matrix — 자율 vs 승인

| 상황 | 행동 | 사용자 승인 |
|---|---|---|
| 코드 작성 (SPEC 범위 내) | 자율 | ❌ |
| 테스트 추가 | 자율 | ❌ |
| 새 슬래시 명령 실행 | 자율 (트리거가 사용자) | ❌ |
| `gh issue view`, `gh pr view` | 자율 | ❌ |
| `gh issue create` | 슬래시 명령 안에서만 | ❌ (명령이 곧 승인) |
| `gh pr create` | 슬래시 명령 안에서만 | ❌ |
| `gh issue close`, `gh pr close` | ✅ | 매번 |
| `gh release create` | 슬래시 명령 안에서만 | ✅ (release 명령 내에서 재확인) |
| `npm publish` | CI 자동 | 사용자가 release 승인 시 위임 |
| 외부 패키지 추가 | ✅ | 매번 |
| `bootstrap/*.md` 수정 | ✅ | 매번 (명시 요청 필요) |
| `CLAUDE.md` 수정 | ✅ | 매번 |
| `docs/TROUBLESHOOTING.md` 추가 | 자율 | ❌ |
| `docs/TROUBLESHOOTING.md` 기존 항목 수정/삭제 | ✅ | 매번 |
| force push | ✅ | 매번 |
| 비밀/토큰 처리 | 절대 금지 | — |

---

# 7. (옵션) Subagents

`.claude/agents/native-bridge-expert.md`:

```markdown
---
description: iOS NSURLProtocol과 Android OkHttp Interceptor 전문가
tools: Read, Edit, Bash, Grep
---

너는 native networking 전문가. 다음만 담당:
- packages/native-bridge/ios/
- packages/native-bridge/android/
- packages/native-bridge/src/

## 행동
- TurboModule spec 변경 시 codegen 재실행
- iOS Swift, Android Kotlin
- Obj-C, Java 새로 추가 금지
- 빌드 검증 필수
- 모르는 영역은 메인 에이전트에 위임
```

`.claude/agents/harness-engineer.md`:

```markdown
---
description: 테스트 하네스 작성/운영 전문가
tools: Read, Edit, Bash, Glob
---

다음만 만진다:
- harness/wpt-runner/
- harness/browser-comparator/
- harness/e2e-scenarios/
- harness/perf-bench/

## 행동
- JSON stdout 출력
- exit code: 0/1/2
- 새 시나리오 추가 시 README도 업데이트
```

`.claude/agents/release-manager.md`:

```markdown
---
description: 릴리즈 전 검증과 changelog 관리
tools: Read, Edit, Bash
---

`/release` 명령 실행 시 메인 에이전트에서 위임받는다. 다음만 담당:
- .changeset/ 검증
- CHANGELOG.md 정합성
- semver 위반 감지
- npm publish 사후 검증
```

---

# 8. 사용자 명령 시나리오 (확장판)

## A: 처음 시작 — Day 1 PoC
```
/poc devtools-visibility
```

## B: Tier 1 한 패키지 구현
```
/implement-package cookies
```

## C: 회귀 점검
```
/verify-tier 1
```

## D: 신규 이슈 트리아지
```
/triage-issue 142
```

## E: 버그 처리
```
/handle-bug 142
```

## F: 릴리즈
```
/release 0.2.0
```

## G: 외부 PR 리뷰
```
/review-pr 87
```

## H: 매일 아침
```
/daily-checkup
```

## I: 상위 의존성 점검
```
/sync-upstream all
```

## J: 자유 형식 — 매크로 진행
```
오늘 Tier 1 끝까지 가자.
PoC 통과 상태에서 cookies → headers → mock 순으로 /implement-package 차례로 실행.
각 패키지 PR 만들고, 막히면 즉시 보고하고 다음 안 넘어가.
```

## K: 자유 형식 — 운영 위임
```
GitHub 이슈 새로 들어온 거 다 트리아지하고, 명백한 버그는 /handle-bug 진행해줘.
복잡한 거나 결정 필요한 건 보고만 해.
```

---

# 9. 핵심 성공 요인

## 1. 검증의 객관화
"잘 됨"이 사용자 의견이나 Claude 자체 판단이 아니라 **harness exit code**로 결정.

## 2. SPEC.md 명확성
"쿠키 잘 동작하게" → 처리 불가. "RFC 6265 §5.1.3 통과, WPT 90%+" → 처리 가능.

## 3. 에러 시 멈추는 규칙
"3회 규칙"이 자율성의 안전장치.

## 4. GitHub 액션의 명확한 트리거
명시 슬래시 명령만 쓰기 액션 트리거. 자유 채팅에서는 읽기만.

## 5. 자가 학습
새 문제 해결 시 카탈로그에 자동 추가 → 다음에 같은 문제 빠르게 해결.
