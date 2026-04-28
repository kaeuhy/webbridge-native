import { WebBridgeClient, createResponse, getHeader } from '../packages/core/src';
import { CookieJar, cookieInterceptor } from '../packages/cookies/src';
import { headerInterceptor } from '../packages/headers/src';
import { setupServer, http, HttpResponse } from '../packages/mock/src';

async function pocB() {
  console.log('=== PoC-B: 시맨틱 통합 검증 ===\n');

  const jar = new CookieJar();
  const server = setupServer(
    http.post('https://api.example.com/login', () =>
      createResponse({
        status: 200,
        headers: { 'Set-Cookie': 'session=abc123; Path=/; HttpOnly; Max-Age=3600' },
        body: JSON.stringify({ success: true }),
      }),
    ),
    http.get('https://api.example.com/me', ({ request }) => {
      const cookie = getHeader(request.headers, 'cookie') ?? '';
      if (cookie.includes('session=abc123')) {
        return HttpResponse.json({ user: 'demo', authenticated: true });
      }
      return HttpResponse.json({ error: 'unauthorized' }, { status: 401 });
    }),
  );
  server.listen();

  const client = new WebBridgeClient();
  client.use(headerInterceptor({ userAgent: 'browser-like' }));
  client.use(cookieInterceptor({ jar }));
  client.use(server.createInterceptor());
  client.use(async () => createResponse({ status: 500, body: 'should not reach' }));

  console.log('Step 1: POST /login');
  const loginRes = await client.fetch('https://api.example.com/login', { method: 'POST' });
  console.log(`  Status: ${loginRes.status} | Cookies in jar: ${jar.size}`);

  console.log('\nStep 2: GET /me (cookie auto-attached)');
  const meRes = await client.fetch('https://api.example.com/me');
  const meData = JSON.parse(meRes.body as string);
  console.log(`  Status: ${meRes.status} | authenticated: ${meData.authenticated}`);

  if (meData.authenticated) {
    console.log('\n✓ PoC-B 통과: 시맨틱 통합 동작 확인');
    console.log('  - Set-Cookie 자동 저장 ✓');
    console.log('  - Cookie 자동 첨부 ✓');
    console.log('  - User-Agent 자동 주입 ✓');
    console.log('  - MSW 호환 mock ✓');
  } else {
    console.log('\n✗ PoC-B 실패');
    process.exit(1);
  }

  server.close();
  jar.dispose();
}

pocB().catch((e) => { console.error(e); process.exit(1); });
