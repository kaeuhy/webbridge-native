/**
 * 통합 테스트 — 대기업 앱 시나리오 시뮬레이션
 *
 * Toss, Kakao, 배달의민족 수준의 실제 트래픽 패턴을 재현:
 * - 로그인 → 세션 쿠키 → API 호출
 * - 캐시 히트/미스/리밸리데이션
 * - 리다이렉트 체인
 * - 동시 요청 100개
 * - Mock 서버 교체
 * - 에러 상황 (타임아웃, 4xx, 5xx)
 * - 장시간 세션 (만료 쿠키 정리)
 * - 크로스 오리진 쿠키 격리
 * - 인터셉터 체인 전체 통과
 */

import { WebBridgeClient, createResponse, getHeader } from '@webbridge-native/core';
import type { Interceptor, WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';
import { CookieJar, cookieInterceptor } from '@webbridge-native/cookies';
import { headerInterceptor } from '@webbridge-native/headers';
import { setupServer, http, HttpResponse } from '@webbridge-native/mock';
import { HttpCache, cacheInterceptor } from '@webbridge-native/cache';
import { redirectInterceptor } from '@webbridge-native/redirect';
import { RequestLogger, devtoolsInterceptor } from '@webbridge-native/devtools';
import { setupWebBridge } from './index';

// === 유틸리티 ===

type NextFn = (req: WebBridgeRequest) => Promise<WebBridgeResponse>;

/** 특정 URL에 대해 고정 응답을 반환하는 라우터 */
function createRouter(routes: Record<string, (req: WebBridgeRequest) => WebBridgeResponse>): Interceptor {
  return async (request) => {
    const handler = routes[`${request.method} ${request.url.split('?')[0]}`];
    if (handler) return handler(request);
    return createResponse({ status: 404, body: 'Not Found' });
  };
}

// ============================================================
// 시나리오 1: Toss 앱 — 로그인 → 세션 유지 → API 호출
// ============================================================

describe('시나리오 1: 로그인 → 세션 쿠키 → API 호출', () => {
  it('로그인 후 세션 쿠키가 자동으로 다음 요청에 첨부된다', async () => {
    const jar = new CookieJar();
    const client = new WebBridgeClient();

    client.use(headerInterceptor({ userAgent: 'browser-like' }));
    client.use(cookieInterceptor({ jar }));
    client.use(createRouter({
      'POST https://api.toss.im/login': () =>
        createResponse({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          rawHeaders: {
            'set-cookie': [
              'session=abc123; Path=/; HttpOnly; Secure; SameSite=Lax',
              'csrf=token456; Path=/; Secure',
            ],
          },
          body: '{"ok":true}',
        }),
      'GET https://api.toss.im/me': (req) => {
        const cookie = getHeader(req.headers, 'cookie') ?? '';
        if (!cookie.includes('session=abc123')) {
          return createResponse({ status: 401, body: '{"error":"unauthorized"}' });
        }
        return createResponse({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: '{"id":"user1","name":"홍길동"}',
        });
      },
    }));

    // 로그인
    const loginRes = await client.fetch('https://api.toss.im/login', {
      method: 'POST',
      body: '{"email":"test@toss.im","password":"1234"}',
    });
    expect(loginRes.status).toBe(200);
    expect(jar.size).toBe(2);

    // 세션 쿠키로 API 호출
    const meRes = await client.fetch('https://api.toss.im/me');
    expect(meRes.status).toBe(200);
    expect(JSON.parse(meRes.body as string).name).toBe('홍길동');
  });

  it('다른 도메인으로는 쿠키가 전송되지 않는다', async () => {
    const jar = new CookieJar();
    const client = new WebBridgeClient();

    client.use(cookieInterceptor({ jar }));
    client.use(createRouter({
      'GET https://api.toss.im/set': () =>
        createResponse({
          status: 200,
          headers: { 'Set-Cookie': 'token=secret; Path=/' },
        }),
      'GET https://evil.com/steal': (req) => {
        const cookie = getHeader(req.headers, 'cookie');
        return createResponse({ status: 200, body: cookie ?? 'no-cookie' });
      },
    }));

    await client.fetch('https://api.toss.im/set');
    const res = await client.fetch('https://evil.com/steal');
    expect(res.body).toBe('no-cookie');
  });

  it('Public suffix에 쿠키를 설정할 수 없다', async () => {
    const jar = new CookieJar();
    const client = new WebBridgeClient();

    client.use(cookieInterceptor({ jar }));
    client.use(createRouter({
      'GET https://evil.co.kr/attack': () =>
        createResponse({
          status: 200,
          headers: { 'Set-Cookie': 'evil=true; Domain=co.kr; Path=/' },
        }),
    }));

    await client.fetch('https://evil.co.kr/attack');
    expect(jar.size).toBe(0); // co.kr은 public suffix
  });
});

// ============================================================
// 시나리오 2: 카카오 — 캐시 + 조건부 요청
// ============================================================

describe('시나리오 2: 캐시 히트/미스/리밸리데이션', () => {
  it('Cache-Control max-age로 캐시되고, 두 번째 요청은 HIT', async () => {
    const cache = new HttpCache();
    const client = new WebBridgeClient();
    let serverCalls = 0;

    client.use(cacheInterceptor({ cache }));
    client.use(async (req) => {
      serverCalls++;
      return createResponse({
        status: 200,
        headers: { 'Cache-Control': 'max-age=3600', 'Content-Type': 'application/json' },
        body: '{"feeds":[]}',
      });
    });

    const res1 = await client.fetch('https://api.kakao.com/feeds');
    expect(res1.status).toBe(200);
    expect(getHeader(res1.headers, 'x-cache')).toBe('MISS');

    const res2 = await client.fetch('https://api.kakao.com/feeds');
    expect(getHeader(res2.headers, 'x-cache')).toBe('HIT');
    expect(serverCalls).toBe(1); // 서버 한 번만 호출

    expect(res2.body).toBe('{"feeds":[]}');
  });

  it('ETag 기반 304 리밸리데이션', async () => {
    const cache = new HttpCache();
    const client = new WebBridgeClient();

    let callCount = 0;
    client.use(cacheInterceptor({ cache }));
    client.use(async (req) => {
      callCount++;
      if (getHeader(req.headers, 'if-none-match') === '"v1"') {
        return createResponse({ status: 304, headers: {} });
      }
      return createResponse({
        status: 200,
        headers: { 'Cache-Control': 'max-age=0', 'ETag': '"v1"' },
        body: '{"data":"original"}',
      });
    });

    // 첫 요청 — 캐시 저장
    await client.fetch('https://api.kakao.com/data');

    // 두 번째 요청 — 만료되었으므로 조건부 요청 → 304
    const res = await client.fetch('https://api.kakao.com/data');
    expect(getHeader(res.headers, 'x-cache')).toBe('REVALIDATED');
    expect(res.body).toBe('{"data":"original"}');
    expect(callCount).toBe(2);
  });

  it('POST 요청 후 해당 URL 캐시가 무효화된다', async () => {
    const cache = new HttpCache();
    const client = new WebBridgeClient();
    let version = 1;

    client.use(cacheInterceptor({ cache }));
    client.use(async (req) => {
      if (req.method === 'POST') {
        version++;
        return createResponse({ status: 200, body: '{"ok":true}' });
      }
      return createResponse({
        status: 200,
        headers: { 'Cache-Control': 'max-age=3600' },
        body: `{"version":${version}}`,
      });
    });

    // 캐시
    await client.fetch('https://api.kakao.com/item');
    // POST로 무효화
    await client.fetch('https://api.kakao.com/item', { method: 'POST' });
    // 캐시 무효화 후 새 데이터
    const res = await client.fetch('https://api.kakao.com/item');
    expect(JSON.parse(res.body as string).version).toBe(2);
    expect(getHeader(res.headers, 'x-cache')).toBe('MISS');
  });

  it('no-store 응답은 캐시되지 않는다', async () => {
    const cache = new HttpCache();
    const client = new WebBridgeClient();
    let calls = 0;

    client.use(cacheInterceptor({ cache }));
    client.use(async () => {
      calls++;
      return createResponse({
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
        body: `call-${calls}`,
      });
    });

    await client.fetch('https://api.kakao.com/sensitive');
    const res = await client.fetch('https://api.kakao.com/sensitive');
    expect(res.body).toBe('call-2');
    expect(calls).toBe(2);
  });
});

// ============================================================
// 시나리오 3: 배달의민족 — 리다이렉트 체인
// ============================================================

describe('시나리오 3: 리다이렉트 처리', () => {
  it('301 → 302 → 200 체인을 정상 처리한다', async () => {
    const client = new WebBridgeClient();

    client.use(redirectInterceptor());
    client.use(async (req) => {
      switch (req.url) {
        case 'https://baemin.com/old':
          return createResponse({ status: 301, headers: { Location: 'https://baemin.com/new' } });
        case 'https://baemin.com/new':
          return createResponse({ status: 302, headers: { Location: 'https://baemin.com/final' } });
        case 'https://baemin.com/final':
          return createResponse({ status: 200, body: 'arrived' });
        default:
          return createResponse({ status: 404 });
      }
    });

    const res = await client.fetch('https://baemin.com/old');
    expect(res.status).toBe(200);
    expect(res.body).toBe('arrived');
    expect(res.redirected).toBe(true);
    expect(res.url).toBe('https://baemin.com/final');
  });

  it('POST → 302 리다이렉트 시 method가 GET으로 변경된다', async () => {
    const client = new WebBridgeClient();
    let finalMethod = '';

    client.use(redirectInterceptor());
    client.use(async (req) => {
      if (req.url === 'https://baemin.com/order') {
        return createResponse({ status: 302, headers: { Location: 'https://baemin.com/confirm' } });
      }
      finalMethod = req.method;
      return createResponse({ status: 200, body: 'ok' });
    });

    await client.fetch('https://baemin.com/order', { method: 'POST', body: 'data' });
    expect(finalMethod).toBe('GET');
  });

  it('크로스 오리진 리다이렉트 시 Authorization 헤더가 제거된다', async () => {
    const client = new WebBridgeClient();
    let finalHeaders: Record<string, string> = {};

    client.use(redirectInterceptor());
    client.use(async (req) => {
      if (req.url === 'https://auth.baemin.com/login') {
        return createResponse({ status: 302, headers: { Location: 'https://api.baemin.com/home' } });
      }
      finalHeaders = req.headers;
      return createResponse({ status: 200 });
    });

    await client.fetch('https://auth.baemin.com/login', {
      headers: { Authorization: 'Bearer secret' },
    });
    expect(finalHeaders['Authorization']).toBeUndefined();
  });

  it('5회 초과 리다이렉트 시 에러가 발생한다', async () => {
    const client = new WebBridgeClient();

    client.use(redirectInterceptor());
    client.use(async () =>
      createResponse({ status: 301, headers: { Location: 'https://baemin.com/loop' } }),
    );

    await expect(
      client.fetch('https://baemin.com/loop'),
    ).rejects.toThrow('Maximum redirect limit');
  });

  it('redirect: "manual" 모드에서 3xx를 그대로 반환한다', async () => {
    const client = new WebBridgeClient();

    client.use(redirectInterceptor());
    client.use(async () =>
      createResponse({ status: 302, headers: { Location: '/new' } }),
    );

    const res = await client.fetch('https://baemin.com/old', { redirect: 'manual' });
    expect(res.status).toBe(302);
  });
});

// ============================================================
// 시나리오 4: 동시 요청 100개 (Toss 결제 페이지)
// ============================================================

describe('시나리오 4: 동시 요청 100개', () => {
  it('100개 요청이 모두 정상 응답을 받는다', async () => {
    const jar = new CookieJar();
    const client = new WebBridgeClient();

    client.use(cookieInterceptor({ jar }));
    client.use(headerInterceptor());
    client.use(async (req) => {
      // 약간의 비동기 지연
      await new Promise((r) => setTimeout(r, Math.random() * 5));
      return createResponse({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: `{"url":"${req.url}"}`,
      });
    });

    const promises = Array.from({ length: 100 }, (_, i) =>
      client.fetch(`https://api.toss.im/item/${i}`),
    );

    const results = await Promise.all(promises);
    expect(results.length).toBe(100);
    for (let i = 0; i < 100; i++) {
      expect(results[i].status).toBe(200);
      expect(JSON.parse(results[i].body as string).url).toBe(
        `https://api.toss.im/item/${i}`,
      );
    }
  });

  it('동시 요청 중 쿠키가 안전하게 관리된다', async () => {
    const jar = new CookieJar();
    const client = new WebBridgeClient();

    client.use(cookieInterceptor({ jar }));
    client.use(async (req) => {
      return createResponse({
        status: 200,
        headers: {
          'Set-Cookie': `req=${req.url.split('/').pop()}; Path=/`,
        },
        body: 'ok',
      });
    });

    const promises = Array.from({ length: 50 }, (_, i) =>
      client.fetch(`https://api.toss.im/item/${i}`),
    );
    await Promise.all(promises);

    // 50개 도메인별 쿠키가 있되, 마지막 것으로 덮어쓰여도 에러 없이 동작
    expect(jar.size).toBeGreaterThan(0);
    expect(jar.size).toBeLessThanOrEqual(50);
  });
});

// ============================================================
// 시나리오 5: Mock 서버 (개발/테스트)
// ============================================================

describe('시나리오 5: MSW 호환 Mock 서버', () => {
  it('Mock → 런타임 핸들러 교체 → resetHandlers', async () => {
    const server = setupServer(
      http.get('https://api.kakao.com/user', () =>
        HttpResponse.json({ name: 'initial' }),
      ),
    );
    server.listen();

    const terminal: Interceptor = async () => { throw new Error('unreachable'); };
    const client = new WebBridgeClient();
    client.use(server.createInterceptor()).use(terminal);

    // 초기 핸들러
    let res = await client.fetch('https://api.kakao.com/user');
    expect(JSON.parse(res.body as string).name).toBe('initial');

    // 런타임 핸들러 교체
    server.use(
      http.get('https://api.kakao.com/user', () =>
        HttpResponse.json({ name: 'runtime' }),
      ),
    );
    res = await client.fetch('https://api.kakao.com/user');
    expect(JSON.parse(res.body as string).name).toBe('runtime');

    // 리셋
    server.resetHandlers();
    res = await client.fetch('https://api.kakao.com/user');
    expect(JSON.parse(res.body as string).name).toBe('initial');

    server.close();
  });

  it('path params가 정확하게 추출된다', async () => {
    const server = setupServer(
      http.get('https://api.kakao.com/users/:userId/posts/:postId', ({ params }) =>
        HttpResponse.json(params),
      ),
    );
    server.listen();

    const client = new WebBridgeClient();
    client.use(server.createInterceptor());
    client.use(async () => createResponse({ status: 500 }));

    const res = await client.fetch('https://api.kakao.com/users/42/posts/99');
    expect(JSON.parse(res.body as string)).toEqual({ userId: '42', postId: '99' });

    server.close();
  });
});

// ============================================================
// 시나리오 6: 전체 파이프라인 통합 (DevTools + Headers + Cookies + Cache + Redirect + Mock)
// ============================================================

describe('시나리오 6: 전체 인터셉터 파이프라인', () => {
  it('모든 인터셉터가 올바른 순서로 실행된다', async () => {
    const logger = new RequestLogger();
    const jar = new CookieJar();
    const cache = new HttpCache();
    const client = new WebBridgeClient();

    // 순서: devtools → headers → cookies → cache → redirect → terminal
    client.use(devtoolsInterceptor({ logger }));
    client.use(headerInterceptor({ userAgent: 'browser-like' }));
    client.use(cookieInterceptor({ jar }));
    client.use(cacheInterceptor({ cache }));
    client.use(redirectInterceptor());
    client.use(async (req) => {
      // 헤더 검증
      expect(getHeader(req.headers, 'user-agent')).toContain('Mozilla');
      return createResponse({
        status: 200,
        headers: {
          'Cache-Control': 'max-age=60',
          'Set-Cookie': 'sid=xyz; Path=/',
        },
        body: '{"pipeline":"ok"}',
      });
    });

    const res = await client.fetch('https://api.example.com/data');

    // 응답 검증
    expect(res.status).toBe(200);

    // 쿠키 저장 검증
    expect(jar.size).toBe(1);
    const cookieHeader = await jar.getCookieHeader('https://api.example.com/');
    expect(cookieHeader).toContain('sid=xyz');

    // 캐시 저장 검증
    expect(cache.stats().entries).toBe(1);

    // DevTools 로그 검증
    expect(logger.size).toBe(1);
    expect(logger.getEntries()[0].status).toBe(200);
  });
});

// ============================================================
// 시나리오 7: setupWebBridge 프리셋
// ============================================================

describe('시나리오 7: setupWebBridge 프리셋', () => {
  it('기본 설정으로 fetch가 동작한다 (globalThis.fetch 사용)', async () => {
    // globalThis.fetch를 mock
    const originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      url: 'https://httpbin.org/get',
      status: 200,
      statusText: 'OK',
      ok: true,
      redirected: false,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      text: () => Promise.resolve('{"origin":"1.2.3.4"}'),
    });

    try {
      const { client, dispose } = setupWebBridge();
      const res = await client.fetch('https://httpbin.org/get');
      expect(res.status).toBe(200);
      dispose();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('dispose()가 모든 리소스를 정리한다', () => {
    const { mockServer, cookieJar, dispose } = setupWebBridge({
      mock: { handlers: [http.get('/test', () => HttpResponse.json({}))] },
    });

    expect(mockServer!.isActive).toBe(true);
    dispose();
    expect(mockServer!.isActive).toBe(false);
    // cookieJar.dispose()도 호출되어야 함 (타이머 정리)
  });
});

// ============================================================
// 시나리오 8: 에러 상황
// ============================================================

describe('시나리오 8: 에러 상황', () => {
  it('AbortController로 요청을 취소할 수 있다', async () => {
    const client = new WebBridgeClient();
    const controller = new AbortController();

    client.use(async () => {
      controller.abort();
      return createResponse({ status: 200 });
    });

    // 이미 abort된 상태
    controller.abort();
    await expect(
      client.fetch('https://api.example.com', { signal: controller.signal }),
    ).rejects.toThrow('aborted');
  });

  it('빈 인터셉터 체인에서 명확한 에러 메시지', async () => {
    const client = new WebBridgeClient();
    await expect(client.fetch('https://example.com')).rejects.toThrow(
      'No interceptors registered',
    );
  });

  it('DevTools는 에러 요청도 기록한다', async () => {
    const logger = new RequestLogger();
    const client = new WebBridgeClient();

    client.use(devtoolsInterceptor({ logger }));
    client.use(async () => { throw new Error('Network failure'); });

    await expect(client.fetch('https://api.example.com')).rejects.toThrow('Network failure');
    expect(logger.size).toBe(1);
    expect(logger.getEntries()[0].status).toBe(0);
  });
});

// ============================================================
// 시나리오 9: 장시간 세션 (쿠키 만료/정리)
// ============================================================

describe('시나리오 9: 장시간 세션', () => {
  it('만료된 쿠키가 자동으로 필터링된다', async () => {
    const jar = new CookieJar();

    // 이미 만료된 쿠키 설정
    await jar.setCookie(
      'expired=1; Path=/; Max-Age=0',
      'https://api.example.com/',
    );
    // 유효한 쿠키 설정
    await jar.setCookie(
      'valid=1; Path=/; Max-Age=3600',
      'https://api.example.com/',
    );

    const header = await jar.getCookieHeader('https://api.example.com/');
    expect(header).toBe('valid=1');
    expect(header).not.toContain('expired');
  });

  it('도메인별 50개 제한이 적용된다', async () => {
    const jar = new CookieJar();
    for (let i = 0; i < 60; i++) {
      await jar.setCookie(
        `c${i}=v${i}; Path=/; Max-Age=3600`,
        'https://api.example.com/',
      );
    }
    expect(jar.size).toBe(50);
  });
});

// ============================================================
// 시나리오 10: 대용량 응답 + DevTools 메모리 안전성
// ============================================================

describe('시나리오 10: 대용량 응답', () => {
  it('64KB 초과 body가 truncate된다', () => {
    const logger = new RequestLogger({ maxBodySize: 100 });
    const largeBody = 'x'.repeat(500);

    const req = { id: '1', url: 'https://example.com', method: 'GET', headers: {}, body: null };
    const res = {
      url: 'https://example.com', status: 200, statusText: 'OK',
      headers: {}, body: largeBody, ok: true, redirected: false,
      type: 'basic' as const,
    };

    logger.log(req as any, res, Date.now(), Date.now());
    const entry = logger.getEntries()[0];
    expect(entry.responseBody!.length).toBeLessThan(500);
    expect(entry.responseBody).toContain('truncated');
  });

  it('캐시 maxSize 초과 엔트리는 저장되지 않는다', () => {
    const cache = new HttpCache({ maxSize: 100 });
    cache.set('https://example.com', {
      response: createResponse({ status: 200, body: 'x'.repeat(200) }),
      storedAt: Date.now(),
      maxAge: 3600,
      size: 200, // maxSize(100) 초과
    });
    expect(cache.stats().entries).toBe(0);
  });
});
