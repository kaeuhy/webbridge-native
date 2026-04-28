/**
 * WebBridge Native PoC-B 데모 — 시맨틱 통합 검증.
 *
 * 시나리오: 로그인 → Set-Cookie 자동 저장 → 다음 요청에 Cookie 자동 첨부
 * 이 PoC는 RN 본가가 절대 흡수 못 하는 핵심 가치를 검증함.
 */

import { setupWebBridge } from '@webbridge-native/preset';
import { http, HttpResponse } from '@webbridge-native/mock';

export async function runPocB() {
  console.log('=== PoC-B: 시맨틱 통합 검증 ===\n');

  const { client, cookieJar, dispose } = setupWebBridge({
    cookies: true,
    headers: { userAgent: 'browser-like' },
    mock: {
      handlers: [
        // 1. 로그인 → Set-Cookie 발행
        http.post('https://api.example.com/login', () =>
          HttpResponse.json(
            { success: true, user: 'demo' },
            {
              status: 200,
              headers: { 'Set-Cookie': 'session=abc123; Path=/; HttpOnly; Max-Age=3600' },
            },
          ),
        ),

        // 2. /me → Cookie 확인
        http.get('https://api.example.com/me', ({ request }) => {
          const cookie = request.headers['Cookie'] || '';
          if (cookie.includes('session=abc123')) {
            return HttpResponse.json({ user: 'demo', authenticated: true });
          }
          return HttpResponse.json({ error: 'unauthorized' }, { status: 401 });
        }),
      ],
    },
    skipDefaultTerminal: true,
  });

  try {
    // Step 1: 로그인
    console.log('Step 1: POST /login');
    const loginRes = await client.fetch('https://api.example.com/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'demo@example.com', password: 'pass' }),
    });
    console.log(`  Status: ${loginRes.status}`);
    console.log(`  Body: ${loginRes.body}`);
    console.log(`  CookieJar size: ${cookieJar!.size}`);

    // Step 2: 인증된 API 호출
    console.log('\nStep 2: GET /me (cookie auto-attached)');
    const meRes = await client.fetch('https://api.example.com/me');
    console.log(`  Status: ${meRes.status}`);
    console.log(`  Body: ${meRes.body}`);

    // 검증
    const meData = JSON.parse(meRes.body as string);
    if (meData.authenticated) {
      console.log('\n✓ PoC-B 통과: 시맨틱 통합 동작 확인');
      console.log('  - Set-Cookie 자동 저장 ✓');
      console.log('  - Cookie 자동 첨부 ✓');
      console.log('  - MSW 호환 mock ✓');
      return true;
    } else {
      console.log('\n✗ PoC-B 실패: 쿠키 자동 첨부 미동작');
      return false;
    }
  } finally {
    dispose();
  }
}

// Node.js에서 직접 실행 가능
if (typeof require !== 'undefined' && require.main === module) {
  runPocB().then((ok) => process.exit(ok ? 0 : 1));
}
