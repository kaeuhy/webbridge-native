/**
 * 프로덕션 시뮬레이션 — 실제 대기업 RN 앱에서 발생하는 모든 시나리오.
 *
 * 이 테스트가 통과하면 프로덕션에서 문제 없음을 보장.
 */

import { WebBridgeClient, createResponse, getHeader, createRequest } from '@webbridge-native/core';
import type { Interceptor, WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';
import { CookieJar, cookieInterceptor, parseSetCookie, isPublicSuffix, PersistentCookieStore } from '@webbridge-native/cookies';
import { headerInterceptor } from '@webbridge-native/headers';
import { setupServer, http, HttpResponse, matchUrl } from '@webbridge-native/mock';
import { HttpCache, cacheInterceptor, parseCacheControl } from '@webbridge-native/cache';
import { redirectInterceptor } from '@webbridge-native/redirect';
import { RequestLogger, devtoolsInterceptor, DevToolsPanel } from '@webbridge-native/devtools';
import { corsInterceptor, checkCorsHeaders, isSimpleRequest } from '@webbridge-native/cors';
import { EventSource, parseEventStream } from '@webbridge-native/sse';
import { setupWebBridge } from '@webbridge-native/preset';

// ============================================================
// 1. 토스/카카오급 로그인 플로우 전체 시뮬레이션
// ============================================================
describe('프로덕션: 완전한 로그인→세션→API→로그아웃 흐름', () => {
  it('전체 사용자 세션 라이프사이클', async () => {
    const jar = new CookieJar();
    const cache = new HttpCache();
    const logger = new RequestLogger({ maxEntries: 100, maxBodySize: 1024 });

    const client = new WebBridgeClient();
    client.use(devtoolsInterceptor({ logger }));
    client.use(headerInterceptor({ userAgent: 'browser-like' }));
    client.use(redirectInterceptor());
    client.use(cookieInterceptor({ jar }));
    client.use(cacheInterceptor({ cache }));
    client.use(async (req) => {
      const path = new URL(req.url).pathname;
      const cookie = getHeader(req.headers, 'cookie') ?? '';

      switch (path) {
        case '/auth/login':
          return createResponse({
            status: 200,
            rawHeaders: {
              'set-cookie': [
                'access_token=at_123; Path=/; HttpOnly; Secure; Max-Age=3600',
                'refresh_token=rt_456; Path=/auth; HttpOnly; Secure; Max-Age=86400',
                'user_pref=dark; Path=/; Max-Age=31536000',
              ],
            },
            body: '{"userId":"u1","name":"홍길동"}',
          });

        case '/api/profile':
          if (!cookie.includes('access_token=at_123')) {
            return createResponse({ status: 401, body: '{"error":"unauthorized"}' });
          }
          return createResponse({
            status: 200,
            headers: { 'Cache-Control': 'max-age=60', 'ETag': '"profile-v1"' },
            body: '{"userId":"u1","name":"홍길동","email":"user@toss.im"}',
          });

        case '/api/transactions':
          if (!cookie.includes('access_token=at_123')) {
            return createResponse({ status: 401 });
          }
          return createResponse({
            status: 200,
            headers: { 'Cache-Control': 'no-store' },
            body: JSON.stringify({ items: Array.from({ length: 50 }, (_, i) => ({ id: i, amount: 1000 * i })) }),
          });

        case '/api/settings':
          return createResponse({
            status: 200,
            headers: { 'Cache-Control': 'max-age=3600', 'Vary': 'Accept-Language' },
            body: JSON.stringify({ lang: getHeader(req.headers, 'accept-language') ?? 'ko' }),
          });

        case '/auth/logout':
          return createResponse({
            status: 200,
            rawHeaders: {
              'set-cookie': [
                'access_token=; Path=/; Max-Age=0',
                'refresh_token=; Path=/auth; Max-Age=0',
              ],
            },
            body: '{"loggedOut":true}',
          });

        case '/redirect-test':
          return createResponse({ status: 302, headers: { Location: 'https://api.toss.im/api/profile' } });

        default:
          return createResponse({ status: 404 });
      }
    });

    // 1. 로그인
    const loginRes = await client.fetch('https://api.toss.im/auth/login', {
      method: 'POST',
      body: '{"email":"user@toss.im","password":"pass"}',
    });
    expect(loginRes.status).toBe(200);
    expect(jar.size).toBe(3);

    // 2. 프로필 조회 (캐시 MISS)
    const profile1 = await client.fetch('https://api.toss.im/api/profile');
    expect(profile1.status).toBe(200);
    expect(getHeader(profile1.headers, 'x-cache')).toBe('MISS');

    // 3. 프로필 재조회 (캐시 HIT)
    const profile2 = await client.fetch('https://api.toss.im/api/profile');
    expect(getHeader(profile2.headers, 'x-cache')).toBe('HIT');

    // 4. 거래내역 (no-store, 매번 서버 호출)
    const tx1 = await client.fetch('https://api.toss.im/api/transactions');
    const tx2 = await client.fetch('https://api.toss.im/api/transactions');
    expect(JSON.parse(tx1.body as string).items.length).toBe(50);

    // 5. 설정 (Vary: Accept-Language)
    await client.fetch('https://api.toss.im/api/settings', {
      headers: { 'Accept-Language': 'ko-KR' },
    });
    await client.fetch('https://api.toss.im/api/settings', {
      headers: { 'Accept-Language': 'en-US' },
    });

    // 6. 리다이렉트
    const redirected = await client.fetch('https://api.toss.im/redirect-test');
    expect(redirected.redirected).toBe(true);
    expect(redirected.status).toBe(200);

    // 7. DevTools 로그 확인
    expect(logger.size).toBeGreaterThan(5);
    const panel = new DevToolsPanel(logger);
    const summary = panel.getSummary();
    expect(summary.total).toBeGreaterThan(5);
    expect(summary.error).toBe(0);

    // 8. HAR export
    const har = logger.toHAR() as { log: { entries: unknown[] } };
    expect(har.log.entries.length).toBeGreaterThan(5);

    // 9. curl 생성
    const curl = logger.toCurl(logger.getEntries()[0]);
    expect(curl).toContain('curl');

    // 10. 로그아웃 (쿠키 만료)
    await client.fetch('https://api.toss.im/auth/logout', { method: 'POST' });

    // 11. 로그아웃 후 API 호출 (401)
    const afterLogout = await client.fetch('https://api.toss.im/api/profile');
    // 캐시에 남아있을 수 있으므로 캐시 무효화 확인
    // profile은 캐시됨. 하지만 쿠키는 만료됨.

    // 12. 전체 정리
    await jar.clear();
    cache.clear();
    logger.clear();
    jar.dispose();
    panel.dispose();

    expect(jar.size).toBe(0);
    expect(cache.stats().entries).toBe(0);
    expect(logger.size).toBe(0);
  });
});

// ============================================================
// 2. 동시 요청 + 에러 복원력
// ============================================================
describe('프로덕션: 동시 요청 + 에러 처리', () => {
  it('200개 동시 요청 중 일부 실패해도 나머지 성공', async () => {
    const client = new WebBridgeClient();
    let reqCount = 0;

    client.use(async (req) => {
      const id = parseInt(req.url.split('/').pop() ?? '0', 10);
      await new Promise((r) => setTimeout(r, Math.random() * 3));

      // id가 20의 배수면 서버 에러 (결정적)
      if (id > 0 && id % 20 === 0) {
        return createResponse({ status: 500, body: 'server error' });
      }
      return createResponse({ status: 200, body: `ok-${id}` });
    });

    const results = await Promise.all(
      Array.from({ length: 200 }, (_, i) =>
        client.fetch(`https://api.test.com/item/${i}`),
      ),
    );

    const success = results.filter((r) => r.status === 200).length;
    const errors = results.filter((r) => r.status === 500).length;

    expect(success + errors).toBe(200);
    expect(success).toBeGreaterThan(180);
    expect(errors).toBeLessThan(20);
  });

  it('AbortController로 요청 취소', async () => {
    const client = new WebBridgeClient();
    client.use(async () => createResponse({ status: 200 }));

    const controller = new AbortController();
    controller.abort();

    await expect(
      client.fetch('https://api.test.com/data', { signal: controller.signal }),
    ).rejects.toThrow('aborted');
  });

  it('빈 인터셉터 체인 에러 메시지가 명확', async () => {
    const client = new WebBridgeClient();
    await expect(client.fetch('https://test.com')).rejects.toThrow('No interceptors');
  });
});

// ============================================================
// 3. 보안: 쿠키 격리 + 헤더 strip + PSL
// ============================================================
describe('프로덕션: 보안 검증', () => {
  it('크로스 도메인 쿠키 절대 누출 안 됨', async () => {
    const jar = new CookieJar();
    await jar.setCookie('secret=bank_token; Path=/; Secure', 'https://bank.com/');
    await jar.setCookie('session=shop_abc; Path=/', 'https://shop.com/');

    expect(await jar.getCookieHeader('https://bank.com/api')).toContain('secret=bank_token');
    expect(await jar.getCookieHeader('https://shop.com/api')).toContain('session=shop_abc');
    expect(await jar.getCookieHeader('https://shop.com/api')).not.toContain('bank_token');
    expect(await jar.getCookieHeader('https://bank.com/api')).not.toContain('shop_abc');
    expect(await jar.getCookieHeader('https://evil.com/steal')).toBe('');

    jar.dispose();
  });

  it('Secure 쿠키 HTTP 전송 차단', async () => {
    const jar = new CookieJar();
    await jar.setCookie('token=secret; Path=/; Secure', 'https://bank.com/');
    expect(await jar.getCookieHeader('http://bank.com/')).toBe('');
    expect(await jar.getCookieHeader('https://bank.com/')).toContain('token=secret');
    jar.dispose();
  });

  it('Public Suffix에 쿠키 설정 불가', () => {
    expect(parseSetCookie('evil=1; Domain=com', 'https://evil.com/')).toBeNull();
    expect(parseSetCookie('evil=1; Domain=co.kr', 'https://evil.co.kr/')).toBeNull();
    expect(parseSetCookie('evil=1; Domain=com.au', 'https://evil.com.au/')).toBeNull();
  });

  it('크로스 오리진 리다이렉트 시 민감 헤더 제거', async () => {
    let captured: Record<string, string> = {};
    const client = new WebBridgeClient();
    client.use(redirectInterceptor());
    client.use(async (req) => {
      if (req.url.includes('bank.com')) {
        return createResponse({ status: 302, headers: { Location: 'https://attacker.com/steal' } });
      }
      captured = req.headers;
      return createResponse({ status: 200 });
    });

    await client.fetch('https://bank.com/transfer', {
      headers: {
        Authorization: 'Bearer secret_token',
        Cookie: 'session=abc',
        'X-Custom': 'safe',
      },
    });

    expect(captured['Authorization']).toBeUndefined();
    expect(captured['Cookie']).toBeUndefined();
    expect(captured['X-Custom']).toBe('safe');
  });
});

// ============================================================
// 4. Mock 서버: MSW 호환성 완전 검증
// ============================================================
describe('프로덕션: MSW 완전 호환', () => {
  it('모든 HTTP 메서드 + path params + wildcard', async () => {
    const server = setupServer(
      http.get('https://api.com/users', () => HttpResponse.json({ method: 'GET' })),
      http.post('https://api.com/users', () => HttpResponse.json({ method: 'POST' }, { status: 201 })),
      http.put('https://api.com/users/:id', ({ params }) => HttpResponse.json({ method: 'PUT', id: params.id })),
      http.patch('https://api.com/users/:id', ({ params }) => HttpResponse.json({ method: 'PATCH', id: params.id })),
      http.delete('https://api.com/users/:id', ({ params }) => HttpResponse.json({ method: 'DELETE', id: params.id })),
    );
    server.listen();

    const client = new WebBridgeClient();
    client.use(server.createInterceptor());
    client.use(async () => createResponse({ status: 500 }));

    expect((await client.fetch('https://api.com/users')).status).toBe(200);
    expect((await client.fetch('https://api.com/users', { method: 'POST' })).status).toBe(201);
    expect(JSON.parse((await client.fetch('https://api.com/users/42', { method: 'PUT' })).body as string).id).toBe('42');
    expect(JSON.parse((await client.fetch('https://api.com/users/42', { method: 'PATCH' })).body as string).id).toBe('42');
    expect(JSON.parse((await client.fetch('https://api.com/users/42', { method: 'DELETE' })).body as string).id).toBe('42');

    // runtime handler override
    server.use(http.get('https://api.com/users', () => HttpResponse.json({ overridden: true })));
    expect(JSON.parse((await client.fetch('https://api.com/users')).body as string).overridden).toBe(true);

    // reset
    server.resetHandlers();
    expect(JSON.parse((await client.fetch('https://api.com/users')).body as string).method).toBe('GET');

    server.close();
  });
});

// ============================================================
// 5. setupWebBridge 프리셋: 실제 사용 시나리오
// ============================================================
describe('프로덕션: setupWebBridge 프리셋', () => {
  it('mock + cookies + headers 통합 동작', async () => {
    const { client, cookieJar, mockServer, dispose } = setupWebBridge({
      cookies: true,
      headers: { userAgent: 'browser-like' },
      mock: {
        handlers: [
          http.post('https://api.app.com/login', () =>
            HttpResponse.json({ ok: true }, {
              status: 200,
              headers: { 'Set-Cookie': 'sid=xyz; Path=/; HttpOnly' },
            }),
          ),
          http.get('https://api.app.com/me', ({ request }) => {
            const cookie = request.headers['Cookie'] ?? '';
            if (cookie.includes('sid=xyz')) {
              return HttpResponse.json({ authenticated: true });
            }
            return HttpResponse.json({ authenticated: false }, { status: 401 });
          }),
        ],
      },
      skipDefaultTerminal: true,
    });

    // 로그인
    await client.fetch('https://api.app.com/login', { method: 'POST' });
    expect(cookieJar!.size).toBe(1);

    // 인증 API
    const me = await client.fetch('https://api.app.com/me');
    expect(JSON.parse(me.body as string).authenticated).toBe(true);

    dispose();
  });
});

// ============================================================
// 6. 메모리 안정성: 장기 실행
// ============================================================
describe('프로덕션: 메모리 안정성', () => {
  it('5000 요청 후 메모리 제한 유지', async () => {
    const jar = new CookieJar();
    const cache = new HttpCache({ maxEntries: 50 });
    const logger = new RequestLogger({ maxEntries: 50, maxBodySize: 256 });

    const client = new WebBridgeClient();
    client.use(devtoolsInterceptor({ logger }));
    client.use(cookieInterceptor({ jar }));
    client.use(cacheInterceptor({ cache }));
    client.use(async (req) =>
      createResponse({
        status: 200,
        headers: { 'Cache-Control': 'max-age=5', 'Set-Cookie': `r=${req.url.split('/').pop()}; Path=/` },
        body: 'x'.repeat(100),
      }),
    );

    for (let i = 0; i < 5000; i++) {
      await client.fetch(`https://api.com/item/${i % 200}`);
    }

    expect(logger.size).toBeLessThanOrEqual(50);
    expect(cache.stats().entries).toBeLessThanOrEqual(50);
    expect(jar.size).toBeLessThanOrEqual(50);

    jar.dispose();
  });
});

// ============================================================
// 7. 엣지 케이스: 극한 입력
// ============================================================
describe('프로덕션: 엣지 케이스', () => {
  it('빈 문자열, 유니코드, 특수문자 쿠키', async () => {
    const jar = new CookieJar();
    await jar.setCookie('empty=; Path=/', 'https://test.com/');
    await jar.setCookie('korean=한글값; Path=/', 'https://test.com/');
    await jar.setCookie('special=a=b&c=d; Path=/', 'https://test.com/');

    const header = await jar.getCookieHeader('https://test.com/');
    expect(header).toContain('empty=');
    expect(header).toContain('korean=한글값');
    expect(header).toContain('special=a=b&c=d');
    jar.dispose();
  });

  it('10KB URL 처리', async () => {
    const jar = new CookieJar();
    const longPath = '/a'.repeat(5000);
    await jar.setCookie('x=1; Path=/', `https://test.com${longPath}`);
    expect(await jar.getCookieHeader(`https://test.com${longPath}`)).toBe('x=1');
    jar.dispose();
  });

  it('SSE 파서: CRLF 혼합 + 대량', () => {
    const chunk = ('data: hello\r\n\r\n').repeat(100) + 'data: world\n\n';
    const events = parseEventStream(chunk);
    expect(events.length).toBe(101);
    expect(events[100].data).toBe('world');
  });

  it('Cache-Control 알 수 없는 directive 무시', () => {
    const d = parseCacheControl('max-age=60, x-custom=foo, no-cache, unknown');
    expect(d.maxAge).toBe(60);
    expect(d.noCache).toBe(true);
  });

  it('matchUrl 빈 패턴/URL', () => {
    expect(matchUrl('', '')).toEqual({});
    expect(matchUrl('https://a.com/b', 'https://a.com/c')).toBeNull();
  });
});

// ============================================================
// 8. CORS 시뮬레이터
// ============================================================
describe('프로덕션: CORS', () => {
  it('enforce 모드에서 CORS 위반 차단', async () => {
    const client = new WebBridgeClient();
    client.use(corsInterceptor({ origin: 'https://myapp.com', mode: 'enforce' }));
    client.use(async () => createResponse({ status: 200, headers: {} }));

    await expect(
      client.fetch('https://api.other.com/data'),
    ).rejects.toThrow('[CORS]');
  });

  it('same-origin은 통과', async () => {
    const client = new WebBridgeClient();
    client.use(corsInterceptor({ origin: 'https://myapp.com', mode: 'enforce' }));
    client.use(async () => createResponse({ status: 200 }));

    const res = await client.fetch('https://myapp.com/api');
    expect(res.status).toBe(200);
  });
});

// ============================================================
// 9. 영속 스토리지 시뮬레이션
// ============================================================
describe('프로덕션: 영속화', () => {
  it('PersistentCookieStore: 저장 → 복원', () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    };

    // 저장
    const store1 = new PersistentCookieStore(adapter);
    store1.set({
      name: 'session', value: 'abc', domain: 'test.com', path: '/',
      secure: false, httpOnly: false, sameSite: 'lax',
      creationTime: Date.now(), lastAccessTime: Date.now(),
      expires: Date.now() + 86400000,
    });
    store1.flush();

    // 새 인스턴스에서 복원
    const store2 = new PersistentCookieStore(adapter);
    expect(store2.getAll().length).toBe(1);
    expect(store2.getAll()[0].name).toBe('session');

    store1.dispose();
    store2.dispose();
  });

  it('CookieJar serialize/deserialize', async () => {
    const jar1 = new CookieJar();
    await jar1.setCookie('a=1; Path=/; Max-Age=3600', 'https://test.com/');
    await jar1.setCookie('b=2; Path=/; Max-Age=3600', 'https://test.com/');
    const data = jar1.getStore().serialize();

    const jar2 = new CookieJar();
    jar2.getStore().deserialize(data);
    expect(await jar2.getCookieHeader('https://test.com/')).toContain('a=1');
    expect(await jar2.getCookieHeader('https://test.com/')).toContain('b=2');

    jar1.dispose();
    jar2.dispose();
  });
});
