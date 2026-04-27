#!/usr/bin/env node
'use strict';

/**
 * PoC: WebBridge Native — 3단계 검증 계획
 *
 * 04-IMPLEMENTATION.md의 PoC-A/B/C 구조를 반영.
 *
 * - PoC-A: 현재 환경 베이스라인 (가장 먼저)
 * - PoC-B: 시맨틱 통합 PoC (PoC-A 결과 무관 진행)
 * - PoC-C: 인터셉터 순서 및 Bridge 검증 (기존 가정 보존)
 *
 * Usage: node scripts/poc-devtools-visibility.js
 */

const POC_VERSION = '0.2.0';

const pocPhases = [
  {
    phase: 'PoC-A',
    title: '현재 환경 베이스라인',
    priority: '가장 먼저, 1일',
    goal: 'RN 최신 안정 버전 + msw/native에서 mock 응답이 RN DevTools Network 탭에 보이는지 단순 확인.',
    steps: [
      '1. RN 최신 안정 버전으로 빈 프로젝트 생성',
      '2. msw + msw/native 설치',
      '3. 간단한 mock 핸들러 등록 (http.get → HttpResponse.json)',
      '4. fetch() 호출',
      '5. RN DevTools Network 탭에서 mock 응답 표시 여부 확인',
    ],
    branches: [
      {
        id: 'A-1',
        condition: '보임',
        action: [
          'native-bridge의 차별점이 "단순 가시성"에서 "RN 본가가 안 잡는 영역"으로 이동',
          '(예: 커스텀 네이티브 모듈, 서드파티 HTTP 라이브러리, 시맨틱 보강 후 합성한 응답)',
          '→ 무게중심을 시맨틱 통합 패키지(cookies/cache)로 이동',
        ],
      },
      {
        id: 'A-2',
        condition: '안 보임',
        action: [
          '기존 가설 유지, native-bridge가 그대로 핵심',
          '→ PoC-C의 인터셉터 검증이 프로젝트 성패를 결정',
        ],
      },
    ],
    references: [
      'bootstrap/01-INTENT.md — 환경 변화 추적 의무',
      'https://reactnative.dev/docs/react-native-devtools',
    ],
  },
  {
    phase: 'PoC-B',
    title: '시맨틱 통합 PoC',
    priority: 'PoC-A 결과 무관 진행',
    goal: 'cookies 자동 관리 + 캐시 첨부가 한 fetch 호출에서 일관 동작하는지 검증.',
    steps: [
      '1. WebBridgeClient에 cookieInterceptor + headerInterceptor 등록',
      '2. POST /login 호출 → 서버가 Set-Cookie 응답',
      '3. CookieJar가 자동으로 쿠키 저장 확인',
      '4. GET /me 호출 → Cookie 헤더 자동 첨부 확인',
      '5. 서버 Cache-Control 헤더 존중 확인 (향후 cache 패키지)',
    ],
    significance: '이 PoC는 RN 본가가 절대 흡수 못 하는 우리 핵심 가치를 검증함.',
    references: [
      'packages/cookies/SPEC.md — CookieJar API',
      'packages/core/SPEC.md — Interceptor 체인',
    ],
  },
  {
    phase: 'PoC-C',
    title: '인터셉터 순서 및 Bridge 검증',
    priority: 'PoC-A 결과와 무관하게 경로 B 기술 검증',
    goal: 'Native-Level Interceptor 경로의 기술적 실현 가능성 검증.',
    assumptions: [
      {
        id: 'C-1',
        title: 'OkHttp Network Interceptor short-circuit → RN DevTools 표시',
        platform: 'Android',
        steps: [
          '1. OkHttp client에 Network Interceptor 등록',
          '2. 인터셉터에서 chain.proceed() 호출 없이 fake Response 빌드',
          '   - Response.Builder().protocol(Protocol.HTTP_1_1).code(200).body(...)',
          '3. RN에서 fetch("https://mock.test/api/users") 호출',
          '4. RN DevTools(CDP) Network 탭에서 요청/응답 확인',
        ],
        successCriteria: 'DevTools Network 탭에 요청과 200 응답이 표시됨',
        failureAction: '경로 A(localhost proxy)로 전환',
      },
      {
        id: 'C-2',
        title: 'iOS NSURLProtocol 합성 응답 → RN DevTools 표시',
        platform: 'iOS',
        steps: [
          '1. MockURLProtocol: URLProtocol 서브클래스 등록',
          '2. canInit(with:)에서 mock 대상 URL 매칭',
          '3. startLoading()에서 합성 HTTPURLResponse + body 전달',
          '4. RN에서 fetch("https://mock.test/api/users") 호출',
          '5. RN DevTools(CDP) Network 탭에서 요청/응답 확인',
        ],
        successCriteria: 'DevTools Network 탭에 요청과 200 응답이 표시됨',
        failureAction: '경로 A(localhost proxy)로 전환',
      },
      {
        id: 'C-3',
        title: 'Native ↔ JS Bridge 왕복 50ms 이내',
        platform: 'Both',
        steps: [
          '1. Native 인터셉터에서 JS로 요청 정보 전송 (TurboModule)',
          '2. JS에서 mock 응답 생성',
          '3. JS → Native로 응답 반환',
          '4. 전체 왕복 시간 측정 (native timestamp 기준)',
        ],
        successCriteria: '왕복 시간 중앙값 < 50ms (100회 측정)',
        failureAction: '비동기 처리 최적화 또는 응답 캐싱 검토',
      },
    ],
    references: [
      'bootstrap/04-IMPLEMENTATION.md — 경로 B, Native Interceptor',
      'bootstrap/08-TROUBLESHOOTING.md — TS-203, TS-204',
    ],
  },
];

// --- 출력 ---

function printPocPlan() {
  console.log('='.repeat(60));
  console.log(`  WebBridge Native — PoC Plan v${POC_VERSION}`);
  console.log('='.repeat(60));
  console.log();
  console.log('3단계 PoC로 핵심 가정과 가치를 검증합니다.');
  console.log('(04-IMPLEMENTATION.md PoC-A/B/C 구조 반영)');
  console.log();

  for (const poc of pocPhases) {
    console.log('='.repeat(60));
    console.log(`  ${poc.phase}: ${poc.title}`);
    console.log(`  우선순위: ${poc.priority}`);
    console.log('='.repeat(60));
    console.log();
    console.log(`  목표: ${poc.goal}`);
    console.log();

    if (poc.steps) {
      console.log('  검증 단계:');
      for (const step of poc.steps) {
        console.log(`    ${step}`);
      }
      console.log();
    }

    if (poc.branches) {
      console.log('  결과별 분기:');
      for (const branch of poc.branches) {
        console.log(`    [${branch.id}] ${branch.condition}:`);
        for (const action of branch.action) {
          console.log(`      ${action}`);
        }
      }
      console.log();
    }

    if (poc.significance) {
      console.log(`  의의: ${poc.significance}`);
      console.log();
    }

    if (poc.assumptions) {
      for (const a of poc.assumptions) {
        console.log(`  --- [${a.id}] ${a.title} (${a.platform}) ---`);
        console.log('  단계:');
        for (const step of a.steps) {
          console.log(`    ${step}`);
        }
        console.log(`  성공 기준: ${a.successCriteria}`);
        console.log(`  실패 시: ${a.failureAction}`);
        console.log();
      }
    }

    console.log('  참고:');
    for (const ref of poc.references) {
      console.log(`    - ${ref}`);
    }
    console.log();
  }

  console.log('='.repeat(60));
  console.log('  결과 보고 형식');
  console.log('='.repeat(60));
  console.log();
  console.log('  PoC-A:');
  console.log('    결과: A-1 (보임) / A-2 (안 보임)');
  console.log('    증거: <스크린샷>');
  console.log('    결론: 무게중심 이동 필요 / 기존 유지');
  console.log();
  console.log('  PoC-B:');
  console.log('    결과: 통과 / 실패');
  console.log('    시나리오: 로그인 → 쿠키 자동 저장 → 자동 첨부');
  console.log('    결론: 시맨틱 통합 가치 검증 완료 / 구현 수정 필요');
  console.log();
  console.log('  PoC-C:');
  console.log('    각 가정별:');
  console.log('    ✓/✗ [C-1] OkHttp Network Interceptor');
  console.log('    ✓/✗ [C-2] iOS NSURLProtocol');
  console.log('    ✓/✗ [C-3] Bridge 왕복 시간');
  console.log('    결론: 경로 B 진행 / 경로 A 전환');
  console.log();
}

const isRN = typeof global !== 'undefined' && typeof global.nativeCallSyncHook !== 'undefined';

if (isRN) {
  console.log('RN 환경 감지됨. PoC 실행 준비...');
  console.log('TODO: 실제 PoC 구현은 native-bridge 패키지 최초 구현 시 완성');
} else {
  printPocPlan();
}
