---
description: 분기별 경쟁 환경 점검 — 새 경쟁자, RN 본가 변화, MSW 변경 감지.
---

# 경쟁 환경 점검

## 실행 (분기마다 1회 또는 사용자 트리거)

1. **RN 본가 DevTools 변경 확인**
   - `npm view react-native versions --json` 으로 최신 버전 확인
   - RN 릴리즈 노트/CHANGELOG에서 Network DevTools 관련 변경 검색
   - 키워드: "Network", "DevTools", "inspector", "CDP", "fetch", "cookie"
   - mock 가시성 흡수 여부 판단

2. **MSW 변경 확인**
   - `npm view msw versions --json`
   - `msw/native` 변경 사항 확인
   - breaking change 여부 분석
   - 우리 mock 패키지 영향 평가

3. **새 경쟁자 검색**
   - npm 검색: "react-native cookies", "react-native network", "react-native mock"
   - GitHub 검색: 최근 6개월 내 star 100+ 신규 프로젝트
   - 우리와 기능 겹침 분석

4. **기존 경쟁자 변화 확인**
   - `@react-native-cookies/cookies` 최신 릴리즈
   - `react-native-nitro-cookies` 진행 상황
   - Radon IDE Network Inspector 업데이트
   - `@react-native-community/fetch` 변경

5. **우리 차별점 유효성 재확인**
   - `bootstrap/01-INTENT.md`의 "기존 솔루션과 비교" 표 대비 변화 식별
   - 차별점이 약화된 영역 식별
   - 새로 강화된 영역 식별

## 보고 형식

```
경쟁 환경 점검 — <날짜>

RN 본가:
  현재 최신: <버전>
  DevTools 변경: <있음/없음> — <상세>
  mock 가시성 흡수: <아직 안 함 / 부분 / 완전>

MSW:
  현재 최신: <버전>
  breaking change: <있음/없음>
  우리 영향: <없음 / 마이그레이션 필요>

새 경쟁자:
  - <이름>: <한 줄 설명>. 우리와 겹침: <영역>

차별점 상태:
  유지: <목록>
  약화: <목록>
  강화: <목록>

권장 행동:
  - ...
```

6. **결과 저장**
   - `docs/COMPETITIVE_LANDSCAPE.md`에 날짜별 항목 추가
   - 차별점 변화가 크면 사용자에게 `01-INTENT.md` 업데이트 제안

7. **사용자 보고**
   - 위 보고 형식으로 출력
   - 즉시 행동 필요 항목 강조
