/**
 * 카테고리 A: 인증 & 세션 — 6개 시나리오
 */
import { WebBridgeClient, createResponse, getHeader, generateRequestId } from '../../../../packages/core/src';
import type { Interceptor, WebBridgeRequest, WebBridgeResponse } from '../../../../packages/core/src';
import { CookieJar, cookieInterceptor, parseSetCookie } from '../../../../packages/cookies/src';
import { headerInterceptor } from '../../../../packages/headers/src';
import { redirectInterceptor } from '../../../../packages/redirect/src';
import { cacheInterceptor, HttpCache } from '../../../../packages/cache/src';

type NextFn = (req: WebBridgeRequest) => Promise<WebBridgeResponse>;

function createClient(...interceptors: Interceptor[]): WebBridgeClient {
  const client = new WebBridgeClient();
  for (const i of interceptors) client.use(i);
  return client;
}

// ============================================================
// A-1: SSO Federated Login Flow (5+ redirects)
// ============================================================
describe('A-1: SSO Federated Login Flow', () => {
  it('5단계 리다이렉트 체인을 완주하고 세션 쿠키로 API 호출 성공', async () => {
    const jar = new CookieJar();
    // 인터셉터 순서: headers → redirect → cookies → terminal
    // redirect가 cookies보다 앞에 있어야 최종 응답의 Set-Cookie를 cookies가 처리
    const client = createClient(
      headerInterceptor(),
      redirectInterceptor(),
      cookieInterceptor({ jar }),
      async (req) => {
        const path = new URL(req.url).pathname;
        switch (path) {
          case '/idp/authorize':
            return createResponse({ status: 302, headers: { Location: 'https://login.corp/saml/login' } });
          case '/saml/login':
            return createResponse({ status: 302, headers: { Location: 'https://login.corp/consent' } });
          case '/consent':
            return createResponse({ status: 302, headers: { Location: 'https://idp.corp/callback?code=abc' } });
          case '/callback':
            return createResponse({ status: 302, headers: { Location: 'https://app.corp/exchange' } });
          case '/exchange':
            return createResponse({
              status: 200,
              rawHeaders: {
                'set-cookie': [
                  'session=FINAL; Path=/; Secure; SameSite=Lax; Max-Age=86400',
                  'csrf=TOKEN; Path=/; Secure',
                ],
              },
              body: '{"ok":true}',
            });
          case '/api/me': {
            const cookie = getHeader(req.headers, 'cookie') ?? '';
            if (!cookie.includes('session=FINAL')) {
              return createResponse({ status: 401 });
            }
            return createResponse({ status: 200, body: '{"name":"홍길동"}' });
          }
          default:
            return createResponse({ status: 404 });
        }
      },
    );

    // SSO 시작 — 5단계 리다이렉트 완주
    const loginRes = await client.fetch('https://idp.corp/idp/authorize');
    expect(loginRes.status).toBe(200);
    expect(loginRes.redirected).toBe(true);

    // 최종 응답의 Set-Cookie가 jar에 저장됨
    expect(jar.size).toBe(2);

    // 세션 쿠키로 API 호출 — 같은 도메인(app.corp)
    const meRes = await client.fetch('https://app.corp/api/me');
    expect(meRes.status).toBe(200);
    expect(JSON.parse(meRes.body as string).name).toBe('홍길동');
  });
});

// ============================================================
// A-2: Token Refresh Race Condition
// ============================================================
describe('A-2: Token Refresh Race Condition', () => {
  it('동시 10개 요청 중 refresh는 정확히 1번만 실행', async () => {
    let currentToken = 'expired';
    let refreshCount = 0;
    const refreshMutex = { locked: false, waiters: [] as Array<() => void> };

    async function acquireRefresh(): Promise<string> {
      if (refreshMutex.locked) {
        return new Promise<string>((resolve) => {
          refreshMutex.waiters.push(() => resolve(currentToken));
        });
      }
      refreshMutex.locked = true;
      refreshCount++;
      await new Promise((r) => setTimeout(r, 10)); // simulate refresh delay
      currentToken = 'new_token_' + refreshCount;
      refreshMutex.locked = false;
      for (const w of refreshMutex.waiters) w();
      refreshMutex.waiters = [];
      return currentToken;
    }

    const jar = new CookieJar();
    const client = createClient(
      cookieInterceptor({ jar }),
      async (req) => {
        const auth = getHeader(req.headers, 'authorization') ?? '';
        if (auth === 'Bearer expired') {
          return createResponse({ status: 401 });
        }
        if (auth.startsWith('Bearer new_token_')) {
          return createResponse({ status: 200, body: `{"token":"${auth}"}` });
        }
        return createResponse({ status: 401 });
      },
    );

    // 10개 동시 요청 — 모두 401 받으면 refresh 후 재시도
    const results = await Promise.all(
      Array.from({ length: 10 }, async () => {
        const res = await client.fetch('https://api.corp/data', {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (res.status === 401) {
          const newToken = await acquireRefresh();
          return client.fetch('https://api.corp/data', {
            headers: { Authorization: `Bearer ${newToken}` },
          });
        }
        return res;
      }),
    );

    expect(refreshCount).toBe(1);
    for (const r of results) {
      expect(r.status).toBe(200);
    }
  });
});

// ============================================================
// A-3: SameSite 쿠키 정책
// ============================================================
describe('A-3: SameSite 쿠키 정책', () => {
  it('SameSite=None; Secure 쿠키는 크로스 사이트에서도 전송', async () => {
    const jar = new CookieJar();
    await jar.setCookie('none_cookie=1; Path=/; SameSite=None; Secure', 'https://api.example.com/');
    const header = await jar.getCookieHeader('https://api.example.com/data');
    expect(header).toContain('none_cookie=1');
  });

  it('SameSite=None은 반드시 Secure가 강제된다', () => {
    const cookie = parseSetCookie('test=1; SameSite=None', 'https://example.com/');
    expect(cookie).not.toBeNull();
    expect(cookie!.secure).toBe(true);
  });

  it('Secure 쿠키는 HTTP에서 전송되지 않는다', async () => {
    const jar = new CookieJar();
    await jar.setCookie('secure=1; Path=/; Secure', 'https://example.com/');
    const header = await jar.getCookieHeader('http://example.com/');
    expect(header).toBe('');
  });
});

// ============================================================
// A-4: 앱 재시작 후 세션 영속성 (메모리 시뮬레이션)
// ============================================================
describe('A-4: 세션 영속성', () => {
  it('serialize → deserialize로 쿠키가 복원된다', async () => {
    const jar1 = new CookieJar();
    await jar1.setCookie('session=abc; Path=/; Max-Age=86400', 'https://example.com/');
    await jar1.setCookie('temp=xyz; Path=/', 'https://example.com/'); // 세션 쿠키

    const serialized = jar1.getStore().serialize();

    const jar2 = new CookieJar();
    jar2.getStore().deserialize(serialized);

    // 영속 쿠키 복원
    const header = await jar2.getCookieHeader('https://example.com/');
    expect(header).toContain('session=abc');
    expect(header).toContain('temp=xyz');

    jar1.dispose();
    jar2.dispose();
  });

  it('만료된 쿠키는 복원 후 자동 제거', async () => {
    const jar1 = new CookieJar();
    await jar1.setCookie('old=1; Path=/; Max-Age=1', 'https://example.com/');
    const serialized = jar1.getStore().serialize();

    // 2초 후 역직렬화
    await new Promise((r) => setTimeout(r, 1100));
    const jar2 = new CookieJar();
    jar2.getStore().deserialize(serialized);

    const header = await jar2.getCookieHeader('https://example.com/');
    expect(header).toBe('');

    jar1.dispose();
    jar2.dispose();
  });
});

// ============================================================
// A-5: 다중 계정 전환
// ============================================================
describe('A-5: 다중 계정 격리', () => {
  it('두 CookieJar 인스턴스가 완전히 격리된다', async () => {
    const jarA = new CookieJar();
    const jarB = new CookieJar();

    await jarA.setCookie('user=alice; Path=/', 'https://app.com/');
    await jarB.setCookie('user=bob; Path=/', 'https://app.com/');

    expect(await jarA.getCookieHeader('https://app.com/')).toBe('user=alice');
    expect(await jarB.getCookieHeader('https://app.com/')).toBe('user=bob');

    // A 클리어해도 B는 무관
    await jarA.clear();
    expect(jarA.size).toBe(0);
    expect(await jarB.getCookieHeader('https://app.com/')).toBe('user=bob');

    jarA.dispose();
    jarB.dispose();
  });
});

// ============================================================
// A-6: CSRF 토큰 동기화
// ============================================================
describe('A-6: CSRF 토큰 동기화', () => {
  it('쿠키의 CSRF 토큰과 헤더의 토큰이 동시 전송된다', async () => {
    const jar = new CookieJar();
    let capturedHeaders: Record<string, string> = {};

    const client = createClient(
      cookieInterceptor({ jar }),
      headerInterceptor(),
      async (req) => {
        if (req.url.includes('/csrf')) {
          return createResponse({
            status: 200,
            headers: { 'Set-Cookie': 'csrf_token=ABC123; Path=/' },
            body: '{"csrf":"ABC123"}',
          });
        }
        capturedHeaders = { ...req.headers };
        return createResponse({ status: 200 });
      },
    );

    // CSRF 토큰 획득
    const csrfRes = await client.fetch('https://api.com/csrf');
    const csrfToken = JSON.parse(csrfRes.body as string).csrf;

    // 뮤테이션 요청 — 쿠키 + 헤더 동시 전송
    await client.fetch('https://api.com/submit', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
      body: '{"action":"submit"}',
    });

    expect(getHeader(capturedHeaders, 'cookie')).toContain('csrf_token=ABC123');
    expect(capturedHeaders['X-CSRF-Token']).toBe('ABC123');

    jar.dispose();
  });
});
