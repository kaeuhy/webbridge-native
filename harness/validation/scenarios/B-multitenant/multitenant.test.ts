/**
 * 카테고리 B: 멀티테넌트 & 도메인 — 4개 시나리오
 */
import { WebBridgeClient, createResponse, getHeader } from '../../../../packages/core/src';
import type { Interceptor, WebBridgeRequest } from '../../../../packages/core/src';
import { CookieJar, cookieInterceptor, isPublicSuffix, parseSetCookie } from '../../../../packages/cookies/src';
import { redirectInterceptor } from '../../../../packages/redirect/src';
import { cacheInterceptor, HttpCache } from '../../../../packages/cache/src';

// ============================================================
// B-1: Public Suffix List 정확성
// ============================================================
describe('B-1: Public Suffix List 정확성', () => {
  const CASES: [string, boolean][] = [
    // 거부해야 하는 것 (public suffix)
    ['com', true],
    ['co.uk', true],
    ['co.kr', true],
    ['co.jp', true],
    ['com.au', true],
    ['com.br', true],
    ['com.cn', true],
    ['org.uk', true],
    ['go.kr', true],
    ['ac.kr', true],
    ['ne.jp', true],
    ['gov.uk', true],
    ['edu.au', true],
    // 허용해야 하는 것 (등록 가능 도메인)
    ['example.com', false],
    ['toss.co.kr', false],
    ['baemin.co.kr', false],
    ['kakao.com', false],
    ['api.co.uk', false],
    ['shop.com.au', false],
    ['myapp.go.kr', false],
    ['university.ac.kr', false],
  ];

  it.each(CASES)('isPublicSuffix("%s") === %s', (domain, expected) => {
    expect(isPublicSuffix(domain)).toBe(expected);
  });

  it('public suffix 도메인에 쿠키 설정 거부', () => {
    expect(parseSetCookie('evil=1; Domain=co.kr', 'https://evil.co.kr/')).toBeNull();
    expect(parseSetCookie('evil=1; Domain=com', 'https://evil.com/')).toBeNull();
    expect(parseSetCookie('evil=1; Domain=com.au', 'https://evil.com.au/')).toBeNull();
  });

  it('정상 도메인에 쿠키 설정 허용', () => {
    expect(parseSetCookie('ok=1; Domain=example.com', 'https://api.example.com/')).not.toBeNull();
    expect(parseSetCookie('ok=1; Domain=toss.co.kr', 'https://api.toss.co.kr/')).not.toBeNull();
  });
});

// ============================================================
// B-2: Cross-Origin Authorization Strip
// ============================================================
describe('B-2: Cross-Origin Authorization Strip', () => {
  function createRedirectClient(routes: Record<string, (req: WebBridgeRequest) => { status: number; headers?: Record<string, string>; body?: string }>): WebBridgeClient {
    const client = new WebBridgeClient();
    client.use(redirectInterceptor());
    client.use(async (req) => {
      const path = req.url;
      const handler = routes[path];
      if (handler) {
        const r = handler(req);
        return createResponse(r);
      }
      return createResponse({ status: 404 });
    });
    return client;
  }

  it('같은 도메인 리다이렉트: Authorization 유지', async () => {
    let captured: Record<string, string> = {};
    const client = createRedirectClient({
      'https://api.corp.com/login': () => ({ status: 302, headers: { Location: 'https://api.corp.com/home' } }),
      'https://api.corp.com/home': (req) => { captured = req.headers; return { status: 200 }; },
    });

    await client.fetch('https://api.corp.com/login', {
      headers: { Authorization: 'Bearer secret123' },
    });
    expect(captured['Authorization']).toBe('Bearer secret123');
  });

  it('다른 도메인 리다이렉트: Authorization 제거', async () => {
    let captured: Record<string, string> = {};
    const client = createRedirectClient({
      'https://api.corp.com/redirect': () => ({ status: 302, headers: { Location: 'https://attacker.com/steal' } }),
      'https://attacker.com/steal': (req) => { captured = req.headers; return { status: 200 }; },
    });

    await client.fetch('https://api.corp.com/redirect', {
      headers: { Authorization: 'Bearer secret123' },
    });
    expect(captured['Authorization']).toBeUndefined();
  });

  it('다른 도메인 리다이렉트: Cookie 헤더도 제거', async () => {
    let captured: Record<string, string> = {};
    const client = createRedirectClient({
      'https://api.corp.com/redirect': () => ({ status: 302, headers: { Location: 'https://other.com/page' } }),
      'https://other.com/page': (req) => { captured = req.headers; return { status: 200 }; },
    });

    await client.fetch('https://api.corp.com/redirect', {
      headers: { Authorization: 'Bearer x', Cookie: 'session=abc' },
    });
    expect(captured['Authorization']).toBeUndefined();
    expect(captured['Cookie']).toBeUndefined();
  });
});

// ============================================================
// B-3: CDN 도메인 분리 캐시
// ============================================================
describe('B-3: CDN 도메인 분리 캐시', () => {
  it('API(no-store)와 CDN(max-age) 캐시 정책이 분리된다', async () => {
    const cache = new HttpCache();
    let apiCalls = 0, cdnCalls = 0;

    const client = new WebBridgeClient();
    client.use(cacheInterceptor({ cache }));
    client.use(async (req) => {
      if (req.url.includes('cdn.corp.com')) {
        cdnCalls++;
        return createResponse({
          status: 200,
          headers: { 'Cache-Control': 'max-age=31536000, immutable' },
          body: 'cached-asset',
        });
      }
      apiCalls++;
      return createResponse({
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
        body: `api-${apiCalls}`,
      });
    });

    // API 두 번 → 매번 서버 호출
    await client.fetch('https://api.corp.com/data');
    await client.fetch('https://api.corp.com/data');
    expect(apiCalls).toBe(2);

    // CDN 두 번 → 한 번만 서버 호출
    await client.fetch('https://cdn.corp.com/app.js');
    const cdnRes = await client.fetch('https://cdn.corp.com/app.js');
    expect(cdnCalls).toBe(1);
    expect(getHeader(cdnRes.headers, 'x-cache')).toBe('HIT');
  });
});

// ============================================================
// B-4: 파트너 API 쿠키 격리
// ============================================================
describe('B-4: 파트너 API 쿠키 격리', () => {
  it('5개 도메인의 쿠키가 완벽히 격리된다', async () => {
    const jar = new CookieJar();
    const domains = [
      'https://api.myapp.com',
      'https://pg.payment.com',
      'https://maps.partner.com',
      'https://push.service.com',
      'https://analytics.third.com',
    ];

    const client = new WebBridgeClient();
    client.use(cookieInterceptor({ jar }));
    client.use(async (req) =>
      createResponse({
        status: 200,
        headers: { 'Set-Cookie': `domain_id=${new URL(req.url).hostname}; Path=/` },
      }),
    );

    // 각 도메인에 쿠키 설정
    for (const domain of domains) {
      await client.fetch(`${domain}/api`);
    }

    // 각 도메인에 정확한 쿠키만 전송되는지 검증
    for (const domain of domains) {
      const header = await jar.getCookieHeader(`${domain}/test`);
      const hostname = new URL(domain).hostname;
      expect(header).toBe(`domain_id=${hostname}`);

      // 다른 도메인 쿠키 없음
      for (const other of domains) {
        if (other === domain) continue;
        const otherHostname = new URL(other).hostname;
        expect(header).not.toContain(otherHostname);
      }
    }

    jar.dispose();
  });
});
