#!/usr/bin/env node
'use strict';

/**
 * PoC: DevTools Visibility — Day 1 최우선 검증
 *
 * 목표:
 *   NSURLProtocol(iOS) / OkHttp Network Interceptor(Android) 합성 응답이
 *   RN DevTools Network 탭에 표시되는지 검증.
 *
 * 이 PoC가 실패하면 경로 B(Native-Level Interceptor)를 포기하고
 * 경로 A(In-App Local HTTP Server)로 전환해야 한다.
 *
 * 검증할 가정 3가지:
 *   1. OkHttp Network Interceptor에서 short-circuit한 응답이 RN DevTools에 표시되는가?
 *   2. iOS NSURLProtocol로 합성한 응답이 RN DevTools에 표시되는가?
 *   3. Bridge 왕복 시간이 50ms 이내인가?
 *
 * 실행 방법:
 *   이 스크립트는 RN 앱 내에서 실행해야 합니다.
 *   Node.js 단독 실행 시 가정 검증 계획만 출력합니다.
 *
 * Usage: node scripts/poc-devtools-visibility.js
 */

const POC_VERSION = '0.1.0';

// --- 가정 정의 ---

const assumptions = [
  {
    id: 'A1',
    title: 'OkHttp Network Interceptor short-circuit → RN DevTools 표시',
    platform: 'Android',
    critical: true,
    steps: [
      '1. OkHttp client에 Network Interceptor 등록',
      '2. 인터셉터에서 chain.proceed() 호출 없이 fake Response 빌드',
      '   - Response.Builder().protocol(Protocol.HTTP_1_1).code(200).body(...)',
      '3. RN에서 fetch("https://mock.test/api/users") 호출',
      '4. RN DevTools(CDP) Network 탭에서 요청/응답 확인',
    ],
    successCriteria: 'DevTools Network 탭에 https://mock.test/api/users 요청과 200 응답이 표시됨',
    failureAction: '경로 A(localhost proxy)로 전환',
    references: [
      'bootstrap/04-IMPLEMENTATION.md — 경로 B 설명',
      'bootstrap/08-TROUBLESHOOTING.md — TS-204 (OkHttp Network Interceptor)',
    ],
  },
  {
    id: 'A2',
    title: 'iOS NSURLProtocol 합성 응답 → RN DevTools 표시',
    platform: 'iOS',
    critical: true,
    steps: [
      '1. MockURLProtocol: URLProtocol 서브클래스 등록',
      '2. canInit(with:)에서 mock 대상 URL 매칭',
      '3. startLoading()에서 합성 HTTPURLResponse + body 전달',
      '4. RN에서 fetch("https://mock.test/api/users") 호출',
      '5. RN DevTools(CDP) Network 탭에서 요청/응답 확인',
    ],
    successCriteria: 'DevTools Network 탭에 https://mock.test/api/users 요청과 200 응답이 표시됨',
    failureAction: '경로 A(localhost proxy)로 전환',
    references: [
      'bootstrap/04-IMPLEMENTATION.md — iOS NSURLProtocol 구현',
      'bootstrap/08-TROUBLESHOOTING.md — TS-203 (NSURLProtocol 미등록)',
    ],
  },
  {
    id: 'A3',
    title: 'Native ↔ JS Bridge 왕복 50ms 이내',
    platform: 'Both',
    critical: true,
    steps: [
      '1. Native 인터셉터에서 JS로 요청 정보 전송 (TurboModule)',
      '2. JS에서 mock 응답 생성',
      '3. JS → Native로 응답 반환',
      '4. 전체 왕복 시간 측정 (native timestamp 기준)',
    ],
    successCriteria: '왕복 시간 중앙값 < 50ms (100회 측정)',
    failureAction: '비동기 처리 최적화 또는 응답 캐싱 검토',
    references: [
      'bootstrap/04-IMPLEMENTATION.md — 비동기 Bridge 위 동기 응답',
    ],
  },
];

// --- 실행 ---

function printPocPlan() {
  console.log('='.repeat(60));
  console.log(`  WebBridge Native — DevTools Visibility PoC v${POC_VERSION}`);
  console.log('='.repeat(60));
  console.log();
  console.log('이 PoC는 프로젝트의 핵심 가정을 검증합니다.');
  console.log('아래 3가지 가정이 모두 통과해야 경로 B(Native-Level Interceptor)를 진행합니다.');
  console.log();

  for (const a of assumptions) {
    console.log('-'.repeat(60));
    console.log(`[${a.id}] ${a.title}`);
    console.log(`  플랫폼: ${a.platform}`);
    console.log(`  치명적: ${a.critical ? 'YES — 실패 시 아키텍처 전환' : 'NO'}`);
    console.log();
    console.log('  검증 단계:');
    for (const step of a.steps) {
      console.log(`    ${step}`);
    }
    console.log();
    console.log(`  성공 기준: ${a.successCriteria}`);
    console.log(`  실패 시: ${a.failureAction}`);
    console.log();
    console.log('  참고:');
    for (const ref of a.references) {
      console.log(`    - ${ref}`);
    }
    console.log();
  }

  console.log('='.repeat(60));
  console.log('  실행 방법');
  console.log('='.repeat(60));
  console.log();
  console.log('  이 PoC는 실제 RN 앱 환경에서 실행해야 합니다.');
  console.log();
  console.log('  Android:');
  console.log('    1. apps/example-basic에 MockInterceptor.kt 추가');
  console.log('    2. OkHttp client.addNetworkInterceptor(MockInterceptor())');
  console.log('    3. Chrome DevTools (chrome://inspect) 또는 RN DevTools에서 Network 탭 확인');
  console.log();
  console.log('  iOS:');
  console.log('    1. apps/example-basic에 MockURLProtocol.swift 추가');
  console.log('    2. URLProtocol.registerClass(MockURLProtocol.self)');
  console.log('    3. Safari Web Inspector 또는 RN DevTools에서 Network 탭 확인');
  console.log();
  console.log('  Bridge 벤치마크:');
  console.log('    1. TurboModule 스펙 정의');
  console.log('    2. 100회 왕복 측정, 중앙값 출력');
  console.log();
  console.log('='.repeat(60));
  console.log('  결과 보고 형식');
  console.log('='.repeat(60));
  console.log();
  console.log('  각 가정별:');
  console.log('    ✓/✗ [A1] <제목>');
  console.log('      결과: <상세>');
  console.log('      증거: <스크린샷 경로 또는 로그>');
  console.log('      결론: 경로 B 진행 가능 / 경로 A 전환 필요');
  console.log();
}

// 환경 감지
const isRN = typeof global !== 'undefined' && typeof global.nativeCallSyncHook !== 'undefined';

if (isRN) {
  // TODO: RN 환경에서 실제 PoC 실행
  // - Native 인터셉터 등록
  // - fetch 호출
  // - DevTools 가시성 확인 (수동)
  // - Bridge 왕복 시간 측정
  console.log('RN 환경 감지됨. PoC 실행 준비...');
  console.log('TODO: 실제 PoC 구현은 native-bridge 패키지 최초 구현 시 완성');
} else {
  // Node.js 환경 — 계획만 출력
  printPocPlan();
}
