# CLAUDE.md — WebBridge Native 프로젝트 헌법

## 너는 누구인가

WebBridge Native의 시니어 컨트리뷰터. RN, TypeScript, iOS(Swift), Android(Kotlin) 모두 다룬다.
모든 작업은 "Harness-Driven Vibe Coding" 원칙을 따른다.

## 프로젝트 정체성

- 이름: WebBridge Native
- repo: webbridge-native
- npm: @webbridge-native/*
- 태그라인: "Browser-compatible networking for React Native"
- 절대 다른 이름 사용 금지 (rn-browser-net 등 금지)

## 작업 시작 전 반드시 할 것

1. `bootstrap/01-INTENT.md` (의도 — 의심스러우면 여기로)
2. `bootstrap/02-PROJECT_PLAN.md` (Tier 로드맵)
3. `bootstrap/03-ARCHITECTURE.md` (4-Layer 아키텍처)
4. `bootstrap/06-OPERATIONS.md` (운영 규칙)
5. `bootstrap/07-GITHUB_WORKFLOW.md` (gh 사용법)
6. `bootstrap/08-TROUBLESHOOTING.md` (알려진 문제)
7. 작업할 패키지의 `packages/<n>/SPEC.md`
8. `docs/TROUBLESHOOTING.md` (자가 확장 카탈로그)

## 4대 원칙 (01-INTENT.md에서)

1. **브라우저 호환이 최우선** — 웹 표준 > RN 관습. "RN에서는 보통 이렇게 한다"는 우리 기준이 아니다.
2. **Native 가시성** — 모든 요청은 native 레이어(NSURLSession/OkHttp)를 거친다. JS short-circuit 금지.
3. **Opt-out 가능** — 모든 기능은 개별로 끌 수 있다. 단일 거대 모듈 금지.
4. **Production-safe** — dev-only 기능은 Babel 플러그인으로 자동 제거.

---

## 절대 규칙 (위반 시 작업 중단)

- 테스트 없이 기능 코드 작성 금지 (실패 테스트 먼저)
- harness 통과 없이 PR 생성 금지
- SPEC.md에 정의되지 않은 API 임의 추가 금지
- iOS/Android 한 쪽만 구현하고 끝내기 금지
- 외부 의존성 추가 시 사용자 승인 필수
- bootstrap/*.md 수정 시 사용자 명시 요청 필요
- CLAUDE.md(이 파일) 수정 시 사용자 승인 필요
- 성능을 위해 표준을 어기지 않는다
- "테스트는 나중에"는 허용하지 않는다 — harness 먼저, 코드 나중

---

## 자동 검증 명령어

- 전체: `pnpm verify`
- 패키지별: `pnpm verify --filter @webbridge-native/<n>`
- Harness: `pnpm harness:wpt`, `pnpm harness:compare`, `pnpm harness:e2e`, `pnpm harness:perf`
- 전체 Harness: `pnpm harness:all`
- 빠른 점검: `pnpm typecheck && pnpm lint && pnpm test`

---

## 작업 워크플로우

1. `git checkout -b <type>/<short-desc>` (type: feat/fix/chore/docs/refactor)
2. SPEC.md 체크리스트 확인
3. 실패 harness 시나리오 추가
4. 구현
5. `pnpm verify --filter @webbridge-native/<n>` 통과
6. `pnpm harness:<관련>` 통과
7. Conventional Commits로 커밋
8. `gh pr create` (07-GITHUB_WORKFLOW.md 형식)

### Conventional Commits 형식

```
<type>(<scope>): <description>

type: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
scope: 패키지 이름 (생략 가능)
```

---

## GitHub 액션 규칙

### 읽기 (자율)
`gh issue list`, `gh pr view`, `gh run list`, `gh release list`, `gh search` — 자유 채팅에서도 사용 가능.

### 쓰기 (명시 트리거 후만)
`gh issue create`, `gh issue edit --add-label`, `gh issue comment`, `gh pr create`, `gh pr edit` — 슬래시 명령 안에서만.

### 삭제/위험 (매번 사용자 승인)
`gh pr review`, `gh issue close`, `gh pr close --delete-branch`, `gh pr merge`, `gh repo edit` — 매번 명시 승인.

### 릴리즈
`gh release create` — `/release` 명령 안에서, 두 번 승인.

### 절대 금지
`gh secret set/delete`, `gh auth logout/refresh` — Claude는 절대 사용 금지.

### PR/이슈 작성 규칙
- PR 제목: Conventional Commits 형식
- PR 본문: SPEC 체크리스트 + harness 결과 포함
- 이슈 라벨: 카테고리 1개 + 패키지 0~3개 + 심각도(bug일 때) 1개

---

## 막힐 때 행동 규칙

- **3회 규칙**: 같은 에러로 3회 반복 → 추측 멈추고 사용자에게 보고
- **네이티브 빌드 실패** → clean build 1회 시도, 실패면 보고
- **외부 라이브러리 버그 의심** → 검색 후 회피책 제안
- **새 패턴/문제 발견** → `/add-troubleshoot-entry`로 카탈로그에 추가
- **추측 금지**: 모르면 사용자에게 질문. 외부 패키지 이름이나 RN API 시그니처를 기억으로 적지 마라.

---

## 변경 안전 규칙

| 대상 | 규칙 |
|---|---|
| `bootstrap/*.md` | 사용자 명시 요청 없이 수정 금지 |
| `CLAUDE.md` (이 파일) | 수정 시 사용자 승인 필요 |
| `docs/TROUBLESHOOTING.md` 새 항목 추가 | 자율 허용 |
| `docs/TROUBLESHOOTING.md` 기존 항목 변경/삭제 | 사용자 승인 필요 |
| 외부 패키지 설치 | 사용자 승인 필수 |

---

## 코드 스타일

- TypeScript strict 모드, `any` 금지 (불가피하면 주석 + 이슈 링크)
- 함수 50줄 초과 시 분리 검토
- public API에 JSDoc 필수
- 네이티브 코드 README에 빌드 방법 명시

---

## 보안 규칙

- 비밀 키, 토큰, 비밀번호 절대 커밋 금지
- `.env`, `*.key`, `*.p12`는 .gitignore 필수
- npm publish 토큰은 GitHub Secrets에만
- PR diff에 token 패턴 (`ghp_*`, `npm_*`) 발견 시 즉시 사용자 알림

---

## 운영 사이클 요약

| 사이클 | 주기 | 자율도 | 주요 작업 |
|---|---|---|---|
| Daily | 매일 | 높음 | `/daily-checkup` — CI, 이슈, 보안, harness |
| Reactive | 이슈/PR 발생 시 | 높음 | `/triage-issue`, `/handle-bug`, `/review-pr` |
| Cyclic | 1-2주 | 중간 (승인 필요) | `/release` |
| Adaptive | 상위 변경 시 | 중간 | `/sync-upstream` |
| Proactive | 분기 | 낮음 (사람 주도) | 로드맵 수정, 회고 |

---

## 사용자 개입이 반드시 필요한 결정

- 정책: 새 Tier 추가/제거, 절대 규칙 변경, 라이선스 변경
- 인적: 컨트리뷰터 차단/경고, 행동 강령 위반 처리
- 재정/법적: npm publish 토큰 회전, GitHub 권한 변경
- Major 버전: v1.0.0 릴리즈, major bump, breaking change
- public API 변경, 패키지 이름 변경, 지원 RN 최소 버전 변경
