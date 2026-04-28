# 07-GITHUB_WORKFLOW.md — `gh` CLI 기반 GitHub 자동화 매뉴얼

> **이 문서는 GitHub 관련 모든 자동화의 단일 출처(Single Source of Truth)다.**
> Claude Code는 이 문서의 형식과 규칙을 따라 모든 GitHub 작업을 수행한다.

---

## 사전 조건 (사용자 환경)

Claude Code가 `gh` 명령을 사용하려면:

```bash
gh --version          # 2.40+ 필요
gh auth status        # 인증되어 있어야 함

# 인증 안 되어 있으면 사용자가:
gh auth login

# 권한 확인 (필요한 scope):
# - repo (전체 권한)
# - workflow (workflow 트리거)
# - read:discussion, write:discussion (Discussions 사용 시)
```

Claude Code는 `gh auth status`를 실행 전 확인. 인증 안 되어 있으면 사용자에게 위 명령 안내하고 중단.

---

## 권한 분류표

다음 표는 Claude Code의 자율성 수준을 결정한다.

| 액션 | 자율성 | 트리거 |
|---|---|---|
| `gh issue list/view` | 자율 | 자유 채팅 가능 |
| `gh pr list/view/diff` | 자율 | 자유 채팅 가능 |
| `gh run list/view` | 자율 | 자유 채팅 가능 |
| `gh release list/view` | 자율 | 자유 채팅 가능 |
| `gh search` | 자율 | 자유 채팅 가능 |
| `gh issue create` | 슬래시 명령 | 명령 안에서만 |
| `gh issue edit --add-label` | 슬래시 명령 | 명령 안에서만 |
| `gh issue comment` | 슬래시 명령 | 명령 안에서만 |
| `gh pr create` | 슬래시 명령 | 명령 안에서만 |
| `gh pr edit` | 슬래시 명령 | 명령 안에서만 |
| `gh pr review` | 사용자 명시 승인 | 매번 |
| `gh issue close` | 사용자 명시 승인 | 매번 |
| `gh pr close --delete-branch` | 사용자 명시 승인 | 매번 |
| `gh pr merge` | 사용자 명시 승인 | 매번 |
| `gh release create` | `/release` 명령 안에서 | 명령 내 두 번 승인 |
| `gh repo edit` | 사용자 명시 승인 | 매번 |
| `gh secret set/delete` | **금지** | Claude는 절대 사용 금지 |
| `gh auth logout/refresh` | **금지** | Claude는 절대 사용 금지 |

---

# 1. 라벨 분류 체계 (Label Taxonomy)

부트스트랩 Step 5에서 `.github/labels.yml`에 정의하고 `gh label create`로 생성.

## 1.1 카테고리 라벨 (이슈 종류)
```yaml
- name: bug
  color: "d73a4a"
  description: "확인된 버그"
- name: feature
  color: "a2eeef"
  description: "새 기능 제안"
- name: enhancement
  color: "84b6eb"
  description: "기존 기능 개선"
- name: question
  color: "d876e3"
  description: "사용 질문"
- name: documentation
  color: "0075ca"
  description: "문서 관련"
- name: duplicate
  color: "cfd3d7"
  description: "중복"
- name: invalid
  color: "e4e669"
  description: "잘못된 이슈"
- name: wontfix
  color: "ffffff"
  description: "수정 안 함"
```

## 1.2 패키지 라벨 (영향 영역)
```yaml
- name: "package: core"
  color: "1d76db"
- name: "package: native-bridge"
  color: "1d76db"
- name: "package: cookies"
  color: "1d76db"
- name: "package: headers"
  color: "1d76db"
- name: "package: mock"
  color: "1d76db"
- name: "package: cache"
  color: "1d76db"
- name: "package: redirect"
  color: "1d76db"
- name: "package: devtools"
  color: "1d76db"
- name: "package: cors"
  color: "1d76db"
- name: "package: sse"
  color: "1d76db"
```

## 1.3 Tier 라벨
```yaml
- name: "tier-1"
  color: "5319e7"
- name: "tier-2"
  color: "5319e7"
- name: "tier-3"
  color: "5319e7"
- name: "tier-4"
  color: "5319e7"
```

## 1.4 심각도 라벨
```yaml
- name: "severity: critical"
  color: "b60205"
  description: "프로덕션 다운, 즉시 처리"
- name: "severity: high"
  color: "d93f0b"
  description: "주요 기능 영향"
- name: "severity: medium"
  color: "fbca04"
  description: "일부 영향"
- name: "severity: low"
  color: "0e8a16"
  description: "미미한 영향"
```

## 1.5 상태 라벨
```yaml
- name: "needs-triage"
  color: "ededed"
  description: "분류 대기"
- name: "needs-info"
  color: "fef2c0"
  description: "추가 정보 필요"
- name: "needs-repro"
  color: "fef2c0"
  description: "재현 방법 필요"
- name: "in-progress"
  color: "0052cc"
  description: "작업 중"
- name: "blocked"
  color: "b60205"
  description: "다른 이슈/외부 차단"
- name: "stale"
  color: "ededed"
  description: "30일 활동 없음"
- name: "good-first-issue"
  color: "7057ff"
  description: "신규 컨트리뷰터용"
- name: "help-wanted"
  color: "008672"
- name: "regression"
  color: "b60205"
  description: "이전엔 되던 기능 깨짐"
- name: "security"
  color: "b60205"
  description: "보안 이슈"
- name: "upstream-sync"
  color: "5319e7"
  description: "상위 의존성 변경"
- name: "breaking-change"
  color: "b60205"
  description: "API 호환성 깨짐"
```

## 1.6 라벨 부착 규칙

이슈에 부착되는 라벨 조합:
- 카테고리: 정확히 1개 (bug, feature, ...)
- 패키지: 0~3개 (해당되는 모든 패키지)
- Tier: 0~1개 (해당하면)
- 심각도: bug일 때 정확히 1개
- 상태: 0~다수 (현재 상태에 따라)

PR에 부착되는 라벨:
- 카테고리: 1개
- 패키지: 1~다수

---

# 2. 이슈 템플릿

`.github/ISSUE_TEMPLATE/` 폴더에 다음 3종.

## 2.1 `bug_report.yml`

```yaml
name: 🐛 Bug Report
description: 확인된 버그 리포트
labels: ["bug", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        버그 리포트 감사합니다. 아래 정보를 가능한 한 자세히 적어주세요.

  - type: input
    id: package
    attributes:
      label: 영향 패키지
      description: 어느 패키지에서 발생했나요?
      placeholder: "@webbridge-native/cookies"
    validations:
      required: true

  - type: input
    id: version
    attributes:
      label: 버전
      placeholder: "0.2.1"
    validations:
      required: true

  - type: input
    id: rn-version
    attributes:
      label: React Native 버전
      placeholder: "0.74.0"
    validations:
      required: true

  - type: dropdown
    id: platform
    attributes:
      label: 플랫폼
      multiple: true
      options:
        - iOS
        - Android
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: 무엇이 잘못되었나요?
      description: 기대한 동작과 실제 동작의 차이를 설명해주세요.
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: 재현 단계
      description: |
        1. ...
        2. ...
        3. ...
      placeholder: |
        1. CookieJar 인스턴스 생성
        2. setCookie 호출
        3. 앱 재시작
        4. getCookieHeader 호출 → 빈 문자열 반환됨
    validations:
      required: true

  - type: textarea
    id: minimum-repro
    attributes:
      label: 최소 재현 코드 (있으면)
      render: typescript

  - type: textarea
    id: logs
    attributes:
      label: 관련 로그/에러
      render: shell
```

## 2.2 `feature_request.yml`

```yaml
name: 🚀 Feature Request
description: 새 기능 제안
labels: ["feature", "needs-triage"]
body:
  - type: textarea
    id: problem
    attributes:
      label: 어떤 문제를 해결하나요?
      description: |
        "X를 하고 싶은데 현재 Y라서 못 한다" 형식으로
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: 제안하는 해결책

  - type: textarea
    id: alternatives
    attributes:
      label: 검토한 대안

  - type: dropdown
    id: scope
    attributes:
      label: 영향 범위
      options:
        - 단일 패키지
        - 여러 패키지
        - 전체 아키텍처
        - Breaking Change
```

## 2.3 `question.yml`

```yaml
name: ❓ Question
description: 사용 방법 질문
labels: ["question", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        ⚠️ 잠깐! [Discussions](https://github.com/<owner>/webbridge-native/discussions)이
        질문에 더 적합할 수 있습니다.

  - type: textarea
    id: question
    attributes:
      label: 질문
    validations:
      required: true

  - type: textarea
    id: tried
    attributes:
      label: 시도해본 것
```

---

# 3. PR 템플릿

`.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## 변경 사항

<!-- 무엇을 왜 변경했는지 -->

## 관련 이슈

<!-- Fixes #N, Closes #N, Related to #N -->

## 종류

- [ ] 🐛 Bug fix (기존 동작 변경 없음)
- [ ] 🚀 New feature (기존 동작 변경 없음)
- [ ] 💥 Breaking change (기존 동작 변경)
- [ ] 📝 Documentation
- [ ] 🔧 Refactor (기능 변경 없음)
- [ ] ⚡ Performance
- [ ] ✅ Test
- [ ] 🤖 CI/CD

## 체크리스트

- [ ] CLAUDE.md의 절대 규칙을 위반하지 않음
- [ ] SPEC.md에 정의된 API만 사용
- [ ] 테스트 추가/업데이트
- [ ] 관련 harness 시나리오 통과
- [ ] iOS, Android 양쪽 검증
- [ ] 문서 업데이트 (필요 시)
- [ ] Conventional Commits 준수
- [ ] Changesets 추가 (`pnpm changeset`)

## 스크린샷/로그 (해당 시)

<!-- 시각적 변경 또는 출력 예시 -->

## 추가 컨텍스트

<!-- 리뷰어가 알아야 할 것 -->
```

---

# 4. 표준 메시지 템플릿

Claude Code가 GitHub에 작성하는 모든 텍스트는 이 템플릿을 따른다.

## 4.1 PR 제목 (Conventional Commits)

```
<type>(<scope>): <description>

예:
feat(cookies): add SameSite=None enforcement
fix(native-bridge): handle URLSession custom config
docs: update migration guide for MSW v3
chore(deps): bump tough-cookie to 4.1.4
test(harness): add WPT cookie suite
refactor(core): extract Request/Response types
perf(cache): use LRU instead of FIFO
ci: add Android matrix for OkHttp 5.x
```

`type`: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
`scope`: 패키지 이름 (생략 가능)

## 4.2 PR 본문 (자동 구현 시)

```markdown
## 변경 사항
@webbridge-native/cookies 패키지 구현 완료.
SPEC.md의 13개 체크리스트 항목 모두 완성.

## 관련 이슈
Closes #1 (Day 1 PoC)
Implements packages/cookies/SPEC.md

## SPEC.md 체크리스트
- [x] Cookie 파서
- [x] Domain matching (RFC 6265 §5.1.3)
- [x] Path matching (§5.1.4)
- [x] Expires/Max-Age 처리
- [x] Secure flag
- [x] HttpOnly flag
- [x] SameSite=Strict/Lax/None
- [x] CookieStore (메모리)
- [x] PersistentCookieStore (MMKV)
- [x] Public Suffix List 통합
- [x] 도메인별 limit (50/domain)
- [x] CookieJar 통합 클래스
- [x] React Native 통합 테스트

## Harness 결과
- WPT cookies suite: 92% (94/102 통과)
- Browser comparator: cookie-flow 시나리오 통과
- E2E login flow: 통과

## 수동 검증
- iOS example app: 로그인 → 새로고침 → 세션 유지 ✓
- Android example app: 동일 시나리오 ✓

## 종류
- [x] 🚀 New feature (기존 동작 변경 없음)

## 체크리스트
- [x] CLAUDE.md 절대 규칙 위반 없음
- [x] SPEC.md 범위 내
- [x] 테스트 추가
- [x] Harness 통과
- [x] iOS/Android 검증
- [x] README.md 업데이트
- [x] Conventional Commits
- [x] Changesets 추가
```

## 4.3 이슈 코멘트 — 정보 요청

```markdown
이슈 보고 감사합니다! 분석을 위해 추가 정보가 필요합니다:

**환경 정보**
- React Native 버전: ?
- @webbridge-native/<package> 버전: ?
- 플랫폼 (iOS/Android): ?
- 디바이스 (시뮬레이터/실기기): ?

**재현 단계**
가능하면 최소 재현 코드를 공유해주실 수 있을까요?
[Snack](https://snack.expo.dev) 링크도 좋습니다.

**관련 로그**
다음 명령으로 로그를 켜고 다시 시도해주세요:
\`\`\`typescript
import { setLogLevel } from '@webbridge-native/core';
setLogLevel('debug');
\`\`\`

응답 주시면 빠르게 도와드리겠습니다.
```

## 4.4 이슈 코멘트 — 트리아지 결과 요약

```markdown
**트리아지 결과**

- 카테고리: bug
- 영향 패키지: cookies
- 심각도: high
- 재현 가능: 확인됨

작업 시작합니다. 진행 상황은 PR로 추적합니다.
```

## 4.5 이슈 코멘트 — 중복 안내

```markdown
이 이슈는 #<원본> 의 중복으로 보입니다. 추적을 한 곳으로 모으기 위해 이 이슈는 닫고 원본에 의견을 남겨주시면 감사하겠습니다. 잘못 판단했다면 알려주세요.
```

## 4.6 이슈 코멘트 — 해결 알림

```markdown
v0.2.1로 수정되었습니다. 다음 명령으로 업데이트해주세요:

\`\`\`bash
pnpm up @webbridge-native/cookies@latest
\`\`\`

문제가 계속되면 다시 열어주세요.
```

## 4.7 PR 리뷰 코멘트 — 자동 1차 리뷰

```markdown
**자동 1차 리뷰 결과**

- ✅ CI 통과
- ✅ CLAUDE.md 절대 규칙 준수
- ✅ Conventional Commits
- ⚠️ SPEC.md에 없는 새 메서드 `CookieJar.purgeExpired()` 추가됨
  - SPEC을 먼저 업데이트하거나, 메서드를 internal로 변경 필요
- ⚠️ Android 변경만 있음 (iOS도 함께 가야 함)
- ✅ 테스트 추가됨

**권장 변경**
1. `purgeExpired()`를 SPEC.md에 추가하는 별도 PR 먼저 또는 이 PR에서 함께
2. iOS의 동등한 변경 추가

기여 감사합니다! 위 두 가지 처리해주시면 머지 가능합니다.
```

## 4.8 GitHub Release 노트

```markdown
## What's New in v0.2.0

### 🚀 Features
- **cookies**: SameSite=None enforcement for secure contexts (#42)
- **mock**: passthrough support for partial mocking (#51)

### 🐛 Bug Fixes
- **native-bridge**: handle URLSession custom configuration on iOS (#48)
- **cookies**: fix cookie expiration race on app restart (#53)

### 📝 Documentation
- Migration guide from MSW v2 (#55)
- Architecture docs translated to Korean (#58)

### 💔 Breaking Changes
None.

### 🙏 Contributors
@user1, @user2, @user3 — thank you!

---

**Full Changelog**: https://github.com/<owner>/webbridge-native/compare/v0.1.5...v0.2.0
```

---

# 5. CI/CD 워크플로우

`.github/workflows/` 에 다음 두 파일.

## 5.1 `ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm verify
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: "**/test-results.json"

  harness-wpt:
    runs-on: ubuntu-latest
    needs: unit
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm harness:wpt
      - name: Upload WPT results
        uses: actions/upload-artifact@v4
        with:
          name: wpt-results
          path: harness/wpt-runner/results.json

  harness-compare:
    runs-on: ubuntu-latest
    needs: unit
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: microsoft/playwright-github-action@v1
      - run: pnpm install --frozen-lockfile
      - run: pnpm harness:compare

  build-ios:
    runs-on: macos-latest
    needs: unit
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: cd apps/example-basic/ios && pod install
      - run: pnpm --filter example-basic ios --simulator "iPhone 15"

  build-android:
    runs-on: ubuntu-latest
    needs: unit
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-java@v4
        with:
          distribution: zulu
          java-version: 17
      - run: pnpm install --frozen-lockfile
      - run: cd apps/example-basic/android && ./gradlew assembleDebug
```

## 5.2 `release.yml`

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    if: contains(github.event.head_commit.message, 'chore(release)')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write  # npm provenance
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: pnpm install --frozen-lockfile
      - run: pnpm verify
      - run: pnpm publish -r --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

# 6. Branch Protection 권장 설정

부트스트랩 Step 5에서 Claude는 자동으로 설정 못 함 (권한 문제). 대신 사용자에게 다음 설정 안내:

`Settings → Branches → Branch protection rules → main`:
- ✅ Require pull request before merging
- ✅ Require status checks to pass: `unit`, `harness-wpt`, `harness-compare`, `build-ios`, `build-android`
- ✅ Require branches to be up to date
- ✅ Do not allow force pushes (단, maintainers는 예외 가능)
- ✅ Restrict deletions

---

# 7. Discussions 활용 (선택)

질문, 아이디어, 일반 토론은 Issues가 아닌 Discussions로:

```bash
gh extension install yusukebe/gh-discussion
gh discussion create --title "..." --body "..." --category "ideas"
```

카테고리:
- 📣 Announcements (메인테이너만)
- 💡 Ideas (기능 아이디어)
- 🙏 Q&A (질문 → 답변 채택 가능)
- 🗣 General (자유 토론)
- 🎉 Show and tell (사용자 사례 공유)

`/triage-issue`에서 question 카테고리는 Discussion으로 이동 안내.

---

# 8. 컨트리뷰터 응대 가이드

## 8.1 첫 PR 머지 시
사용자(메인테이너)가 직접 환영 코멘트 작성. Claude는 자동 작성 안 함.

## 8.2 비활성 컨트리뷰터의 stale PR
7일 무응답 시 nudge 코멘트 (Claude 자동):
```
안녕하세요! 이 PR이 7일째 활동이 없네요. 진행에 어려움이 있으면 알려주세요.
14일 더 활동 없으면 close하고 작업을 가져갈 다른 분이 진행할 수 있게 하겠습니다.
```

14일 더 후 (총 21일):
```
오랜 시간 응답이 없어 close합니다. 언제든 다시 열어주시면 환영입니다.
```

## 8.3 무례한 코멘트 / Code of Conduct 위반
Claude는 자동 처리 안 함. 즉시 사용자(메인테이너)에게 보고.

---

# 9. 마일스톤 운영

각 Tier 마일스톤을 GitHub 마일스톤으로 연결:

```bash
gh api repos/:owner/:repo/milestones \
  -f title="v0.1.0 alpha (Tier 1)" \
  -f description="cookies, headers, mock, native-bridge" \
  -f due_on="2026-06-30T00:00:00Z"
```

이슈 생성 시 자동으로 적절한 마일스톤 부착:
- bug + tier-1 → Tier 1 마일스톤
- feature + tier-3 → Tier 3 마일스톤
- 미분류 → backlog

---

# 10. 자주 사용하는 gh 명령 모음

Claude Code가 자주 사용할 명령들:

## 조회
```bash
# 오늘 등록된 이슈
gh issue list --search "created:>$(date -d '1 day ago' +%Y-%m-%d)"

# 트리아지 미수행
gh issue list --label "needs-triage" --json number,title,createdAt

# 내가 처리해야 할 PR
gh pr list --search "review-requested:@me"

# CI 실패 PR
gh pr list --json number,title,statusCheckRollup \
  --jq '.[] | select(.statusCheckRollup[].conclusion == "FAILURE")'
```

## 생성
```bash
# 이슈
gh issue create \
  --title "..." \
  --body-file body.md \
  --label "bug,severity: high,package: cookies"

# PR
gh pr create \
  --title "fix(cookies): ..." \
  --body-file pr_body.md \
  --label "bug,package: cookies"

# 릴리즈
gh release create v0.2.0 \
  --title "v0.2.0" \
  --notes-file release_notes.md
```

## 액션
```bash
# 라벨 부착
gh issue edit 142 --add-label "bug,package: cookies"

# 코멘트
gh issue comment 142 --body-file comment.md

# Close
gh issue close 142 --comment "수정됨 in #145"

# Workflow 재실행
gh run rerun <id>
```

---

# 11. 보안 규칙

- `gh secret set/delete`는 절대 자율 실행 금지
- `.env` 또는 token 파일 커밋 검사: pre-commit hook으로 자동
- PR diff에 token 패턴 검색 (예: `ghp_*`, `npm_*`) → 발견 시 즉시 사용자 알림
- Dependabot security alert 자동 처리 → 이슈로 변환

---

# 12. 정리

이 문서가 정의하는 것:

1. **권한**: 읽기/쓰기/위험 액션 분류
2. **라벨**: 일관된 분류 체계
3. **템플릿**: 모든 이슈/PR/코멘트의 형식
4. **자동화**: CI/CD, 릴리즈
5. **응대**: 컨트리뷰터 가이드

Claude Code는 모든 GitHub 작업에서 이 문서를 참조한다. 이 문서에 없는 패턴이 발생하면 사용자에게 보고하고 결정을 위임한다.
