# 06-OPERATIONS.md — 일상 운영 매뉴얼

> **이 문서는 프로젝트가 시작된 후 발생하는 모든 운영 시나리오를 다룬다.**
> 부트스트랩이 "어떻게 시작하나"라면, 이 문서는 "어떻게 계속하나"다.

---

## 운영 사이클 개요

오픈소스 프로젝트는 시간 축에 따라 5종류 활동이 반복된다:

| 사이클 | 주기 | 트리거 | 주요 작업 |
|---|---|---|---|
| **Daily** | 매일 | `/daily-checkup` | CI 점검, stale 정리, 보안 audit |
| **Reactive** | 이슈/PR 발생 시 | 알림 | 트리아지, 버그 처리, 리뷰 |
| **Cyclic** | 1-2주마다 | 사람 결정 | 릴리즈, 마일스톤 정리 |
| **Adaptive** | 상위 변경 시 | 알림/주기 점검 | sync-upstream, 마이그레이션 |
| **Proactive** | 분기 | 사람 결정 | 로드맵 수정, 회고 |

각 사이클별로 Claude Code의 자율성 수준이 다르다. Daily/Reactive는 거의 완전 자율, Cyclic/Adaptive는 사용자 승인 후 자율, Proactive는 사람이 주도하고 Claude는 보조.

---

# 1. Daily Operations (자율도: 높음)

매일 한 번 사용자가 `/daily-checkup`을 실행한다. 또는 cron으로 자동 실행도 가능 (GitHub Action으로 매일 09:00 UTC).

## 1.1 점검 체크리스트

### CI 상태
```bash
gh run list --limit 10 --json status,conclusion,workflowName,createdAt
```
- 실패: 즉시 분석. 재현 가능하면 이슈 자동 생성.
- 인프라 일시 오류 의심: 한 번 재실행 (`gh run rerun <id>`), 그래도 실패면 이슈.

### 신규 이슈 트리아지
```bash
gh issue list --label "needs-triage" --state open --json number,title,createdAt
```
- 24시간 이상 트리아지 안 된 이슈: 자동 `/triage-issue` 실행.
- 24시간 미만: 알림만 (사용자가 수동 처리할 수도).

### Stale 이슈/PR 정리
- 30일 활동 없는 이슈: `stale` 라벨 부착, 7일 후에도 변동 없으면 자동 close (사용자 옵션).
- 7일 활동 없는 PR: 작성자에게 nudge 코멘트 + 라벨.

```bash
# 30일 stale 이슈
gh issue list --search "updated:<$(date -d '30 days ago' +%Y-%m-%d) -label:stale" \
  --json number,title,updatedAt
```

### 보안 audit
```bash
pnpm audit --json > /tmp/audit.json
```
- HIGH/CRITICAL: 즉시 이슈 자동 생성 (라벨: `security`, `priority: critical`).
- MEDIUM: 다음 minor 릴리즈 전 처리 — 마일스톤 부착.
- LOW: 무시.

### 상위 의존성 변경 감지
일주일에 한 번 (월요일) `/sync-upstream all` 자동 실행. 결과를 Discussion에 게시.

### Harness 회귀 모니터링
```bash
pnpm harness:all > /tmp/harness-today.json
diff <(git show main:harness-baseline.json) /tmp/harness-today.json
```
- 통과율 하락 발견: 즉시 이슈 + 라벨 `regression`.

## 1.2 출력 포맷

```
📅 Daily Checkup — 2026-04-27

🔴 즉시 조치 (2):
  1. CI 실패: cookies 패키지 빌드 실패 (gh run/12345)
     원인 분석: pnpm-lock 충돌
     조치 제안: lockfile 재생성 PR 자동 생성?
  2. 보안: tough-cookie HIGH 취약점 (CVE-2026-XXXX)
     영향 패키지: @webbridge-native/cookies
     조치 제안: 4.1.4로 upgrade

🟡 검토 필요 (3):
  - 신규 이슈 5개 (트리아지 미수행) → /triage-issue 자동 실행하시겠습니까?
  - Stale PR: #87 (12일째 응답 없음, 작성자: external-contributor)
  - msw 2.6.1 출시 (breaking 가능성) → /sync-upstream msw 권장

🟢 양호:
  - harness 회귀 없음 (WPT cookies 92%, cache 80%)
  - 의존성 최신
  - main 빌드 통과
```

---

# 2. Reactive Operations (자율도: 높음)

GitHub에서 이슈/PR 발생 시. 알림은 GitHub 자체 또는 webhook으로 받지만, Claude Code가 직접 push 알림을 받진 않는다. 사용자가 알림 보고 슬래시 명령으로 트리거.

## 2.1 신규 이슈 처리 흐름

```
사용자: /triage-issue 142
  ↓
Claude: 이슈 분석 → 라벨 부착 → 카테고리 결정
  ↓
[bug + 명확한 재현]   → /handle-bug 142 제안
[feature request]     → /add-feature-discussion 제안 (또는 사용자 결정)
[question]            → answer-question 흐름 (코멘트로 답변)
[needs-info]          → 코멘트로 정보 요청
[duplicate]           → close + 원본 링크
[invalid]             → 사용자에게 보고하고 close 권유
```

## 2.2 버그 처리 흐름 (`/handle-bug`)

`05-AUTOMATION.md`의 5.5절 참고. 핵심 단계:
1. 재현 → `harness/e2e-scenarios/repro/` 에 시나리오 추가
2. 회귀 테스트 작성 (실패 확인)
3. 수정
4. 검증
5. 트러블슈팅 카탈로그 자동 업데이트
6. PR 생성

## 2.3 PR 리뷰 흐름 (`/review-pr`)

외부 컨트리뷰터 PR이 들어오면:
- CI 자동 검증
- CLAUDE.md 절대 규칙 위반 검사
- SPEC 외 API 추가 검사
- 코멘트로 1차 리뷰
- 사용자 승인 후 approve/request-changes

## 2.4 Question 처리

이슈가 질문(`question` 라벨)인 경우:
1. `docs/TROUBLESHOOTING.md`에서 검색
2. 매칭되면 해당 항목 링크 + 한 줄 답변 코멘트
3. 매칭 없으면 사용자에게 답변 작성 요청
4. 답변 후 좋은 Q&A는 `/add-troubleshoot-entry`로 카탈로그화

---

# 3. Cyclic Operations (자율도: 중간 — 사용자 승인 필요)

## 3.1 릴리즈 사이클

### 릴리즈 주기
- **Patch (x.y.Z)**: 버그 수정 누적되면. 보통 1-2주마다.
- **Minor (x.Y.0)**: 새 기능 추가 시. 보통 4-6주.
- **Major (X.0.0)**: Breaking change. 6개월-1년.

### 릴리즈 체크리스트 (`/release` 내부 동작)

사용자가 `/release 0.2.0` 트리거 시 Claude Code가:

**Phase 1: 사전 검증** (실패 시 중단)
- [ ] `git status` clean
- [ ] main 브랜치
- [ ] `git pull --ff-only` 성공
- [ ] `pnpm verify` 통과
- [ ] `pnpm harness:all` 통과
- [ ] 미반영 changeset 존재
- [ ] 영향 패키지 목록 출력 → 사용자 승인 1차

**Phase 2: 버전 업데이트**
- [ ] `pnpm changeset version` 실행
- [ ] CHANGELOG.md, package.json 변경 사항 출력 → 사용자 승인 2차

**Phase 3: 릴리즈 게시**
- [ ] `git commit -m "chore(release): v0.2.0"`
- [ ] `git tag v0.2.0`
- [ ] `git push origin main --tags`
- [ ] `gh release create v0.2.0 --notes-file <CHANGELOG 본문>`

**Phase 4: 모니터링**
- [ ] CI(release.yml)가 npm publish 트리거 확인
- [ ] `gh run watch` 로 publish 완료까지
- [ ] 실패 시 즉시 사용자 알림

**Phase 5: 사후**
- [ ] 마일스톤 close
- [ ] 다음 마일스톤 자동 생성
- [ ] 공지 텍스트 초안 생성:
  - 트위터/X용 (280자)
  - dev.to 블로그용 (긴 글)
  - Discussion announcement용
  - 사용자가 직접 게시 (자동 게시 안 함)

## 3.2 마일스톤 정리

매 릴리즈 후:
- 닫힌 마일스톤의 미해결 이슈를 다음 마일스톤으로 이동 또는 backlog로
- 새 마일스톤 만들 때 `02-PROJECT_PLAN.md`의 다음 마일스톤 매핑

## 3.3 ROADMAP.md 갱신

분기마다 `docs/ROADMAP.md` 업데이트. 이건 사용자 주도 — Claude는 현재 진행 상황 요약만 제공.

---

# 4. Adaptive Operations (자율도: 중간)

상위 의존성 변경 시 대응. 가장 자주 마주치는 시나리오들:

## 4.1 RN 새 버전 출시

`/sync-upstream react-native` 트리거. Claude Code가:

1. 최신 RN 버전 확인
2. CHANGELOG의 networking/CDP 관련 변경 확인
3. 우리에게 영향 가능한 변경:
   - NSURLProtocol 등록 방식
   - OkHttp 버전 변경
   - TurboModule 스펙 변경
   - DevTools 인스펙터 동작
4. 영향 평가 보고
5. 마이그레이션 작업 이슈 자동 생성

### 흔한 케이스

**Case A: RN 0.74 출시**
- OkHttp 4.x → 5.x로 업데이트되었을 가능성
- → `04-IMPLEMENTATION.md`의 Network Interceptor 동작 재검증 필요
- → harness PR 통과 확인이 결정적

**Case B: RN의 CDP 인스펙터 동작 변경**
- → 우리 mock의 가시성이 깨질 수 있음
- → 즉시 PoC 재실행 (`/poc devtools-visibility`)

## 4.2 MSW 메이저 버전 업

MSW v2 → v3 같은 상황. Claude Code가:

1. `@mswjs/interceptors` API 변경 분석
2. 우리 `mock` 패키지의 영향 식별
3. 이중 지원 전략 검토:
   - 기존 v2 사용자 호환 유지 vs 마이그레이션 강제
4. 마이그레이션 가이드 작성 자동 시작 (`docs/migration/msw-v3.md`)

## 4.3 OkHttp 메이저 버전 업

OkHttp 5.x로 업데이트되면:
- `Interceptor` 인터페이스 변경 가능
- `Response.Builder` API 변경 가능
- → 즉시 Android 패키지 회귀 테스트

## 4.4 React Native 의존성 (MMKV, react-native-fs 등)

- MMKV 새 메이저 버전: cookies 패키지 영향
- react-native-fs deprecated → expo-file-system으로 마이그레이션 검토
- → cache 패키지 영향

## 4.5 Node.js 새 LTS

`tooling/` 의 Node 버전 업데이트. CI matrix 업데이트. 큰 영향 없는 경우가 보통.

---

# 5. Proactive Operations (자율도: 낮음 — 사람 주도)

분기마다 사람이 주도하고 Claude는 보조.

## 5.1 분기별 회고

분기 끝에 사용자가 `Claude, 지난 분기 요약해줘` 같은 자유 명령. Claude Code가:

1. 닫힌 이슈/PR 통계
2. 통과한 마일스톤
3. 새 컨트리뷰터 수
4. 다운로드 추세 (npm stats)
5. 보고 받은 버그 카테고리 분포
6. 가장 많은 시간 쓴 영역

→ 사람이 이를 보고 다음 분기 전략 결정.

## 5.2 ROADMAP 수정

`02-PROJECT_PLAN.md`의 Tier/마일스톤이 바뀌어야 한다고 사용자가 판단할 때. 사용자가 결정하고 Claude는 문서 업데이트만.

## 5.3 새 컨트리뷰터 온보딩

새 컨트리뷰터가 나타나면 (PR/Discussion):
- "good first issue" 라벨 이슈 추천
- CONTRIBUTING.md 링크 코멘트
- 첫 PR 머지 시 환영 코멘트 (사람이 직접)

---

# 6. 사용자 개입이 반드시 필요한 결정

다음은 Claude Code가 절대 자율로 결정하지 않는다:

## 6.1 정책 결정
- 새 Tier 추가/제거
- 절대 규칙 추가/완화
- 라이선스 변경
- 코드 오너십 정책

## 6.2 인적 사항
- 컨트리뷰터 차단/경고
- 행동 강령 위반 처리
- 외부 협업 결정

## 6.3 재정/법적
- npm publish 토큰 회전
- GitHub 권한 변경
- 후원/펀딩 결정

## 6.4 Major 버전 결정
- v1.0.0 릴리즈 결정 (API stability 보장)
- Major version bump 결정

## 6.5 Breaking Change
- public API 변경
- 패키지 이름 변경
- 지원 RN 최소 버전 변경

이런 항목은 Claude가 옵션을 제시하고 분석을 제공하지만, 최종 결정은 사람이.

---

# 7. 에러 처리 카탈로그

운영 중 자주 마주치는 실패 패턴과 대응:

## 7.1 CI 실패

### Pattern: 갑자기 lockfile 충돌
- **진단**: 동시 PR이 lockfile 변경
- **대응**: `pnpm install` 재실행, 새 lockfile 커밋, 충돌 PR rebase 안내

### Pattern: 네이티브 빌드 실패 (iOS/Android)
- **진단**: Xcode/AGP 버전 차이
- **대응**: clean build 1회 시도, 실패 시 사용자에게 환경 확인 요청, 이슈 생성

### Pattern: harness 한 시나리오만 일관 실패
- **진단**: 회귀 가능성
- **대응**: git bisect로 원인 커밋 식별, 자동 revert PR 제안

## 7.2 npm publish 실패

### Pattern: 권한 에러
- **진단**: 토큰 만료
- **대응**: 사용자에게 즉시 알림. publish 자동 재시도 금지.

### Pattern: 버전 충돌
- **진단**: Changesets와 npm registry 불일치
- **대응**: 분석 보고. 수동 개입 필요.

## 7.3 GitHub API 에러

### Pattern: rate limit
- **진단**: gh API 호출 제한 초과
- **대응**: 잠시 대기 (자동 backoff), 그래도 실패 시 사용자 보고

### Pattern: 권한 에러
- **진단**: gh auth 만료
- **대응**: `gh auth status` 확인 안내. 자동 재인증 시도 금지.

## 7.4 사용자 입력 모호

### Pattern: 슬래시 명령 인자 부정확
- 예: `/handle-bug abc` (숫자 아님)
- **대응**: 정확한 형식 안내, 다시 입력 요청

### Pattern: 매크로 명령 모호
- 예: "오늘 작업 다 해줘"
- **대응**: 무엇을 "오늘 작업"으로 볼지 명확화 요청. 추측 금지.

---

# 8. 자가 학습 메커니즘

## 8.1 Troubleshooting Catalog Self-Extension

새 문제 해결 시 `/add-troubleshoot-entry`로 자동 추가. 이게 시간이 지날수록 강력해진다.

## 8.2 CLAUDE.md 진화

운영 중 새로 발견된 패턴은 CLAUDE.md에 추가하면 다음 작업부터 적용. 단, **CLAUDE.md 수정은 항상 사용자 승인 필요**.

추가 후보 발견 시 Claude Code가 사용자에게 제안:
```
운영 중 발견한 패턴: "PR 생성 시 항상 영향 패키지 라벨 부착"
이걸 CLAUDE.md의 GitHub 액션 규칙에 추가할까요?
```

## 8.3 SPEC.md 업데이트

새 요구사항이 발견되면 SPEC.md 업데이트. 이건 자율 (사용자 승인 안 필요), 다만 변경 사항은 PR 본문에 명시.

---

# 9. 운영 메트릭 (선택)

장기 운영 건강도 측정:

| 메트릭 | 목표 | 측정 |
|---|---|---|
| 이슈 평균 응답 시간 | < 24h | trigae 라벨 부착까지 |
| 이슈 평균 해결 시간 | < 7d (bug), < 30d (feature) | close까지 |
| PR 평균 머지 시간 | < 3d | first review까지 |
| harness 통과율 | > 90% (90일 이동평균) | daily checkup |
| 외부 컨트리뷰터 수 | 분기 +5 | gh API |
| npm 다운로드 (월) | 분기 +20% | npm-stat |

`/daily-checkup`에 이 메트릭 추적 옵션 추가 가능.

---

# 10. 정리

운영의 핵심은:

1. **Daily는 자동, Reactive는 슬래시 명령으로**: 일상은 거의 손 안 가게.
2. **Cyclic은 승인 게이트 명확히**: 릴리즈처럼 위험한 건 승인 절차 두 번.
3. **Adaptive는 즉시 감지**: 상위 변경을 늦게 발견하면 마이그레이션 비용 증가.
4. **Proactive는 사람이**: 전략은 사람이, 실행은 Claude가.
5. **자가 학습으로 시간이 지날수록 강해진다**: 트러블슈팅 카탈로그가 핵심.
