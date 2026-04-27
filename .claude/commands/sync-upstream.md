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
   msw 2.4.0 → 2.6.1
   변경:
     - HttpResponse.error() 시그니처 변경 (breaking)
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
