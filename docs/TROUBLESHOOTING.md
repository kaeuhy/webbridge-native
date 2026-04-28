# Troubleshooting — WebBridge Native 알려진 문제 카탈로그

> **이 문서는 운영 중 자동으로 확장된다.**
> 새 문제 해결 시 `/add-troubleshoot-entry`로 항목이 추가된다.
> 기존 항목 수정/삭제는 사용자 승인 필요.

---
---

## 사용 방법 (Claude Code에게)

새 문제에 부딪혔을 때:
1. 먼저 이 카탈로그(또는 `docs/TROUBLESHOOTING.md`)에서 검색
2. 매칭되면 해당 항목의 "해결" 단계 따름
3. 매칭 없으면 정상 진단 절차 진행
4. 새 문제 해결 후 `/add-troubleshoot-entry`로 카탈로그에 추가

검색 키워드는 각 항목의 "키워드" 섹션 활용.

## 항목 형식

```
## TS-NNN: 한 줄 제목

### 증상 (Symptom)
사용자가 보는 것

### 진단 (Diagnosis)
원인과 확인 방법

### 해결 (Fix)
단계별 해결

### 예방 (Prevention)
재발 방지

### 관련
키워드, 이슈 링크 등
```

---

# A. Build & Tooling 카테고리

## TS-001: pnpm install 시 lockfile 충돌

### 증상
- `pnpm install --frozen-lockfile` 실패
- 에러: `ERR_PNPM_OUTDATED_LOCKFILE`
- main 브랜치 PR rebase 후 자주 발생

### 진단
- 동시에 머지된 PR들이 의존성을 추가/변경
- pnpm-lock.yaml이 package.json과 불일치

### 해결
1. `git fetch origin main`
2. `git rebase origin/main`
3. 충돌 발생 시 `pnpm-lock.yaml`은 우리 것 버리고 main 것 사용:
   ```bash
   git checkout --theirs pnpm-lock.yaml
   pnpm install  # 우리 변경 사항 반영
   git add pnpm-lock.yaml
   git rebase --continue
   ```
4. 푸시 (force-with-lease 사용):
   ```bash
   git push --force-with-lease
   ```

### 예방
- PR 작업 시작 전 `git pull --rebase origin main`
- 의존성 변경은 별도 작은 PR로 분리

### 키워드
lockfile, conflict, frozen-lockfile, OUTDATED, pnpm

---

## TS-002: Turborepo 캐시 부패

### 증상
- 코드 변경했는데 테스트가 이전 결과 반환
- "✓ cached" 메시지가 비정상적으로 자주 보임

### 진단
- Turborepo 로컬 캐시가 손상됨

### 해결
```bash
pnpm turbo run test --force  # 캐시 무시 1회
# 또는
rm -rf .turbo node_modules/.cache
pnpm install
pnpm verify
```

### 키워드
turbo, cache, stale

---

## TS-003: TypeScript 버전 불일치

### 증상
- `error TS5023: Unknown compiler option`
- monorepo 안에서 패키지마다 다른 TS 동작

### 진단
- 각 패키지의 `node_modules/typescript`가 다른 버전을 가지고 있음

### 해결
1. root `package.json`에서 typescript 버전 통일:
   ```json
   { "devDependencies": { "typescript": "5.4.x" } }
   ```
2. 모든 패키지의 typescript 의존성 제거 (root에서 hoisting)
3. `pnpm install` 재실행
4. `pnpm verify`

### 키워드
typescript, version, mismatch, tsconfig

---

## TS-004: Node 버전 불일치

### 증상
- 로컬은 통과, CI는 실패 (또는 반대)
- `Unsupported engine` 경고

### 진단
- 로컬 Node 버전과 CI matrix가 다름

### 해결
1. `package.json`의 `engines.node` 확인:
   ```json
   { "engines": { "node": ">=20" } }
   ```
2. `.nvmrc` 추가:
   ```
   20
   ```
3. CI matrix에 동일 버전 명시
4. `nvm use` 또는 `volta pin node@20`

### 키워드
node, engine, version, nvm, volta

---

# B. Test 카테고리

## TS-101: Jest "Cannot find module"

### 증상
- 로컬 import는 잘 되는데 Jest 실행 시 모듈 못 찾음
- monorepo 패키지 간 import에서 발생

### 진단
- Jest moduleResolution이 monorepo workspace 인식 못 함
- TS path alias 설정 누락

### 해결
1. `jest.config.js`에 `moduleNameMapper` 추가:
   ```js
   moduleNameMapper: {
     '^@webbridge-native/(.*)$': '<rootDir>/packages/$1/src',
   }
   ```
2. 또는 ts-jest가 tsconfig path 읽도록:
   ```js
   preset: 'ts-jest',
   transform: {
     '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
   }
   ```

### 키워드
jest, module not found, moduleResolution, monorepo

---

## TS-102: Harness가 RN context 없이 실행됨

### 증상
- `pnpm harness:wpt` 실행 시 `react-native` 모듈 import 실패
- "navigator is not defined" 같은 에러

### 진단
- Harness가 Node 환경에서 RN 의존 코드를 직접 import 시도

### 해결
1. Harness는 RN 시뮬레이터/디바이스에서 실행되어야 함
2. Detox 또는 Maestro 사용:
   ```bash
   detox build --configuration ios.sim.debug
   detox test --configuration ios.sim.debug
   ```
3. Pure JS 로직 테스트는 일반 Jest에서, RN 통합은 Detox로 분리

### 키워드
harness, detox, maestro, navigator, react-native context

---

## TS-103: WPT 테스트가 false positive

### 증상
- WPT 테스트는 통과한다고 보고
- 실제로는 동작 안 함

### 진단
- harness runner가 결과를 잘못 파싱
- exit code 와 JSON output이 어긋남

### 해결
1. harness runner 코드 검증:
   ```js
   // 잘못된 예: process.exit 누락
   console.log(JSON.stringify(results));

   // 올바른 예
   console.log(JSON.stringify(results));
   process.exit(results.failed > 0 ? 1 : 0);
   ```
2. JSON output schema 검증 추가
3. CI에서 결과 schema validate

### 키워드
wpt, harness, false positive, exit code

---

# C. Native (iOS/Android) 카테고리

## TS-201: iOS pod install 실패

### 증상
- `Unable to find a specification for...`
- Xcode 빌드 직전에 실패

### 진단
- CocoaPods 캐시 부패
- M1/M2 Mac에서 arch 문제
- iOS 배포 타겟 미스매치

### 해결
1. Pod 캐시 정리:
   ```bash
   cd apps/example-basic/ios
   rm -rf Pods Podfile.lock
   pod cache clean --all
   pod install --repo-update
   ```
2. M1/M2: `arch -x86_64 pod install` 또는 Rosetta로 터미널 실행
3. iOS deployment target 통일 (보통 iOS 13.0+):
   ```ruby
   # Podfile
   platform :ios, '13.0'
   ```

### 키워드
pod install, CocoaPods, ios, deployment target, M1, arm64

---

## TS-202: Android Gradle 빌드 실패 (Kotlin 버전)

### 증상
- `Module was compiled with an incompatible version of Kotlin`

### 진단
- 우리 패키지의 Kotlin 버전과 RN 호스트 앱의 버전 차이

### 해결
1. `android/build.gradle`에서 RN 권장 Kotlin 버전 확인
2. 우리 native 모듈에서 동일 버전 사용:
   ```gradle
   buildscript {
       ext.kotlin_version = rootProject.ext.kotlinVersion ?: '1.8.0'
   }
   ```
3. Gradle clean: `./gradlew clean`

### 키워드
gradle, kotlin, version, compatibility, android

---

## TS-203: NSURLProtocol이 등록되지 않음

### 증상
- iOS에서 Mock 응답이 전혀 트리거되지 않음
- DevTools에도 안 보임

### 진단
- `URLSessionConfiguration`이 default가 아닌 경우 `NSURLProtocol.registerClass()` 만으로는 부족
- Alamofire, custom URLSession 사용 시 발생

### 해결
1. RN 기본 fetch는 default config를 쓰므로 보통 OK
2. 커스텀 라이브러리 사용 시 사용자가 명시적으로 등록 필요:
   ```swift
   let config = URLSessionConfiguration.default
   config.protocolClasses = [MockURLProtocol.self] + (config.protocolClasses ?? [])
   ```
3. README에 한계 명시: "AFNetworking, Alamofire 사용 시 별도 설정 필요"

### 키워드
NSURLProtocol, URLSession, alamofire, custom config, ios

---

## TS-204: OkHttp Network Interceptor에서 short-circuit이 DevTools에 안 보임

### 증상
- Mock 응답은 동작
- 하지만 RN DevTools Network 탭에 표시 안 됨
- 가장 위험한 회귀 — 프로젝트 핵심 가치 무너짐

### 진단
- mock을 Application Interceptor에 등록했음 (Network보다 위)
- 또는 OkHttp 새 버전에서 인스펙터 위치 변경

### 해결
1. Application Interceptor → Network Interceptor로 변경:
   ```kotlin
   // 잘못된 예
   client.addInterceptor(MockInterceptor(...))

   // 올바른 예
   client.addNetworkInterceptor(MockInterceptor(...))
   ```
2. 단, Network Interceptor는 chain.proceed() 호출 시 실제 connection을 생성하려 함
3. short-circuit 시 fake Response 빌드 시 `protocol(Protocol.HTTP_1_1)`, `request(req)` 명시

### 예방
- `/poc devtools-visibility`를 RN 신버전 출시마다 재실행
- harness에 가시성 회귀 테스트 추가

### 키워드
okhttp, interceptor, network interceptor, devtools, visibility, regression

---

## TS-205: TurboModule 코드젠 미실행

### 증상
- 새 native 메서드 추가했는데 JS에서 못 부름
- "TurboModule X not found"

### 진단
- `react-native-codegen`이 spec 변경을 인식 못 함

### 해결
1. spec 파일이 `Native<Name>.ts` 명명 규칙을 따르는지 확인
2. `package.json`의 codegenConfig 확인:
   ```json
   {
     "codegenConfig": {
       "name": "WebBridgeNativeSpec",
       "type": "modules",
       "jsSrcsDir": "./src"
     }
   }
   ```
3. iOS: `pod install` 다시 (codegen 자동 트리거)
4. Android: `./gradlew clean assembleDebug` (codegen 트리거)

### 키워드
turbomodule, codegen, NativeModule, spec, jsSrcsDir

---

# D. JavaScript / TypeScript 카테고리

## TS-301: AbortController 동작 차이

### 증상
- 브라우저에서는 정상 abort, RN에서는 abort 무시됨

### 진단
- RN < 0.60에서 AbortController 미지원
- 일부 RN 버전에서 fetch가 signal 무시

### 해결
1. RN 0.73+ 만 지원하도록 명시 (`engines.react-native`)
2. 우리 코드에서 polyfill 또는 명시적 처리
3. README에 한계 명시

### 키워드
AbortController, signal, abort, fetch, RN compatibility

---

## TS-302: FormData boundary 차이

### 증상
- multipart 요청이 서버에서 파싱 안 됨
- 브라우저는 OK

### 진단
- RN의 FormData 직렬화가 표준과 미묘하게 다름
- file 필드 처리 특히 다름

### 해결
1. `headers` 패키지가 FormData 감지 시 boundary 자동 생성
2. file 필드는 RN의 `{ uri, type, name }` 형식 변환 필요:
   ```typescript
   if (value && typeof value === 'object' && 'uri' in value) {
     // RN file → Blob 변환
   }
   ```
3. 백엔드와 boundary 형식 검증

### 키워드
FormData, multipart, boundary, file upload, RN

---

## TS-303: Response.body 스트림 미지원

### 증상
- `response.body.getReader()` 호출 시 undefined
- 큰 파일 다운로드 시 메모리 폭발

### 진단
- RN의 Response가 ReadableStream을 제대로 구현 안 함

### 해결
1. 단기: 큰 응답은 `response.text()`/`response.json()` 직접 사용
2. 장기: 우리 패키지에서 polyfill 제공 검토
3. 사용자에게 limitation 문서화

### 키워드
ReadableStream, response.body, streaming, RN limitation

---

# E. CI/CD & GitHub 카테고리

## TS-401: GitHub Actions에서 macOS runner 느림

### 증상
- iOS 빌드 잡이 30분+ 소요
- 다른 잡 1-2분과 대비

### 진단
- macOS runner가 Linux 대비 비싸고 느림
- pod install이 매번 처음부터

### 해결
1. CocoaPods 캐시:
   ```yaml
   - uses: actions/cache@v4
     with:
       path: apps/example-basic/ios/Pods
       key: ${{ runner.os }}-pods-${{ hashFiles('**/Podfile.lock') }}
   ```
2. iOS 빌드는 PR 머지 직전만 (pre-merge gate)
3. 일상 PR에서는 lint/typecheck/test만

### 키워드
github actions, macos, runner, slow, cocoapods cache, iOS build time

---

## TS-402: npm publish 토큰 만료

### 증상
- release.yml 실패: `401 Unauthorized`
- 토큰 만료 알림 없이

### 진단
- npm token에 만료일 있음 (보통 1년)

### 해결
1. **Claude는 자동 처리 금지** — 사용자에게 즉시 보고
2. 사용자가:
   ```bash
   npm token create --read-only=false --automation
   gh secret set NPM_TOKEN
   ```
3. release.yml에서 provenance 옵션 추가하면 OIDC로 토큰 회전 부담 줄임

### 예방
- 캘린더 reminder (만료 1개월 전)
- npm provenance 사용으로 token 의존도 줄이기

### 키워드
npm publish, NPM_TOKEN, 401, unauthorized, provenance, OIDC

---

## TS-403: PR check가 영원히 pending

### 증상
- `gh pr checks` 가 pending 상태로 멈춤

### 진단
- GitHub Actions queue 적체
- 또는 self-hosted runner가 응답 없음

### 해결
1. `gh run list` 로 실행 중인 워크플로우 확인
2. 30분 이상 pending이면 cancel:
   ```bash
   gh run cancel <id>
   gh run rerun <id>
   ```
3. GitHub Status 페이지 확인: https://www.githubstatus.com

### 키워드
github actions, pending, queue, runner, cancel

---

# F. Operations 카테고리

## TS-501: Stale 라벨 자동 부착이 너무 공격적

### 증상
- 사용자 항의: 활동 있는 이슈에 stale 부착
- 메인테이너 검토 중 이슈도 stale 처리

### 진단
- 30일 기준이 너무 짧음
- 또는 라벨 검사 로직이 자식 코멘트 미반영

### 해결
1. 기준 60일로 완화
2. `assignee` 있는 이슈는 stale 제외:
   ```bash
   gh issue list --search "updated:<... -no:assignee"
   ```
3. `pinned`, `priority` 라벨 있으면 제외

### 키워드
stale, label, automation, false positive

---

## TS-502: Issue 트리아지가 카테고리 잘못 분류

### 증상
- bug 같은 보고가 question으로 분류
- 또는 반대

### 진단
- LLM 분류 휴리스틱이 모호한 케이스에 약함

### 해결
1. 모호한 경우 `needs-triage` 유지 + 사용자에게 보고
2. 분류 신뢰도 기준 낮으면 자동 분류 안 함
3. 사용자가 자주 재분류하는 패턴이면 CLAUDE.md에 사례 추가

### 키워드
triage, classification, accuracy, llm

---

# G. Architecture 카테고리

## TS-601: Layer 3 인터셉터 순서 의존성

### 증상
- 일부 시나리오에서만 쿠키가 안 첨부됨
- 캐시 hit 시에만 발생

### 진단
- cache 인터셉터가 cookie 인터셉터보다 먼저 short-circuit
- 캐시된 응답 반환하면서 cookie jar 업데이트 누락

### 해결
1. 인터셉터 순서 정책 정립:
   ```typescript
   // 등록 순서 = chain 순서
   client.use(headerInterceptor);   // 항상 먼저
   client.use(cookieInterceptor);   // 헤더 다음
   client.use(cacheInterceptor);    // 쿠키 첨부 후 캐시 lookup
   client.use(redirectInterceptor); // 캐시 다음
   client.use(mockInterceptor);     // 마지막 short-circuit
   client.use(nativeBridge);        // 실제 요청
   ```
2. 각 인터셉터의 onRequest/onResponse 분리하여 응답 시에도 cookie 업데이트
3. Layer 3 모든 컴포넌트의 순서 의존성 문서화

### 키워드
interceptor, order, chain, cookie, cache, race

---

## TS-602: 메모리 누수 (장시간 실행 시)

### 증상
- 앱이 시간이 지날수록 메모리 사용 증가
- 특히 mock + cache 같이 쓸 때

### 진단
- mock 핸들러 등록 해제 안 됨
- cache 디스크 LRU evict 안 동작

### 해결
1. mock: `server.close()` 호출 시 모든 핸들러 정리
2. cache: 주기적 evict 검증 테스트 추가
3. perf-bench harness에 long-running 시나리오 추가

### 키워드
memory leak, long running, cache evict, handler cleanup

---

# H. 사용자 (외부) 환경 카테고리

## TS-701: Expo 환경에서 동작 안 함

### 증상
- `react-native-mmkv` 또는 native 모듈 사용 불가

### 진단
- Expo Go는 native 모듈 추가 불가
- Bare workflow 또는 EAS Build 필요

### 해결
1. README에 명시: "EAS Build 또는 Bare Workflow 필요"
2. Expo plugin 제공:
   ```js
   // app.config.js
   plugins: ['@webbridge-native/expo-plugin']
   ```
3. Expo Go 사용자에게는 graceful 안내

### 키워드
expo, expo go, eas build, bare workflow, native module

---

## TS-702: New Architecture (Fabric/TurboModule) 비활성 환경

### 증상
- TurboModule 등록 실패
- "new architecture not enabled"

### 진단
- 사용자 RN 0.73+ 라도 New Arch가 기본 비활성

### 해결
1. **현재 정책**: New Arch만 지원 (단순함)
2. README에 활성화 방법 명시:
   - iOS: `RCT_NEW_ARCH_ENABLED=1 pod install`
   - Android: `gradle.properties`의 `newArchEnabled=true`
3. Bridge 모드 fallback은 기술 부채 — Tier 4까지 가지 않음

### 키워드
new architecture, fabric, turbomodule, bridgeless, RCT_NEW_ARCH_ENABLED

---

# I. 회귀 / 상위 의존성 카테고리

## TS-801: RN 0.74로 업데이트 후 DevTools 가시성 깨짐

### 증상
- 이전 RN에서 보이던 mock이 0.74에서 안 보임

### 진단
- RN 네트워크 인스펙터가 새 CDP 메서드로 이주
- OkHttp Network Interceptor 위치 변경 가능성

### 해결
1. 즉시 `/poc devtools-visibility` 재실행
2. 실패 시 인터셉터 재배치 검토 (TS-204 참고)
3. RN issue tracker 검색
4. 마이그레이션 가이드 작성

### 예방
- RN beta 버전부터 PoC 실행
- harness에 RN 버전 matrix 추가

### 키워드
react-native upgrade, 0.74, devtools, regression, CDP

---

## TS-802: tough-cookie 같은 dependency가 RN에서 fail

### 증상
- 빌드는 되지만 런타임 에러
- "stream is not defined" 등

### 진단
- Node.js 전용 의존성을 RN에 가져옴
- 우리는 직접 사용 금지지만, transitive dep으로 들어올 수 있음

### 해결
1. `pnpm why tough-cookie` 로 의존 경로 추적
2. 직접 의존이면 제거
3. transitive면 alternative 라이브러리 검토 또는 polyfill
4. CLAUDE.md에 "Node 전용 의존성 의심 명단" 유지

### 키워드
tough-cookie, node only, RN compatibility, transitive, stream

---

# 카테고리 인덱스

| 카테고리 | TS 번호 범위 | 항목 수 |
|---|---|---|
| Build & Tooling | TS-001 ~ TS-099 | 4 |
| Test | TS-101 ~ TS-199 | 3 |
| Native (iOS/Android) | TS-201 ~ TS-299 | 5 |
| JavaScript / TypeScript | TS-301 ~ TS-399 | 3 |
| CI/CD & GitHub | TS-401 ~ TS-499 | 3 |
| Operations | TS-501 ~ TS-599 | 2 |
| Architecture | TS-601 ~ TS-699 | 2 |
| 사용자 환경 | TS-701 ~ TS-799 | 2 |
| 회귀 / 상위 의존성 | TS-801 ~ TS-899 | 2 |

**합계: 26개 항목 (시드)**

운영 중 자동 확장되며, 6개월 후 100+ 항목 도달 예상.

---

## 자가 확장 규칙 (`/add-troubleshoot-entry`)

새 항목 추가 시:
1. 적절한 카테고리(A-I) 선택
2. 그 카테고리의 다음 번호 사용
3. 모든 섹션(증상/진단/해결/예방/키워드) 채움
4. 카테고리 인덱스 업데이트
5. 커밋: `docs(troubleshoot): add TS-NNN <제목>`

기존 항목 수정/삭제는 사용자 승인 필요.
