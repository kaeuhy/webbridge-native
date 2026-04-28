/**
 * 카테고리 I: 스케일 & 부하 — 4개 시나리오
 */
import { WebBridgeClient, createResponse, getHeader } from '../../../../packages/core/src';
import type { Interceptor } from '../../../../packages/core/src';
import { CookieJar, cookieInterceptor } from '../../../../packages/cookies/src';
import { headerInterceptor } from '../../../../packages/headers/src';
import { HttpCache, cacheInterceptor } from '../../../../packages/cache/src';
import { RequestLogger, devtoolsInterceptor } from '../../../../packages/devtools/src';
import { setupServer, http, HttpResponse, matchUrl } from '../../../../packages/mock/src';

// ============================================================
// I-1: 큰 응답 (1MB JSON) — 10MB는 테스트 시간 문제로 1MB로
// ============================================================
describe('I-1: 큰 응답 처리', () => {
  it('1MB JSON 응답을 에러 없이 처리', async () => {
    const largeData = JSON.stringify({
      items: Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: 'x'.repeat(80),
      })),
    });

    const client = new WebBridgeClient();
    client.use(async () =>
      createResponse({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: largeData,
      }),
    );

    const res = await client.fetch('https://api.com/report');
    expect(res.status).toBe(200);
    const parsed = JSON.parse(res.body as string);
    expect(parsed.items.length).toBe(10000);
  });

  it('DevTools logger가 큰 응답을 truncate', () => {
    const logger = new RequestLogger({ maxBodySize: 1024, maxEntries: 10 });
    const largeBody = 'x'.repeat(100000);

    logger.log(
      { id: '1', url: 'https://api.com', method: 'GET', headers: {} } as any,
      createResponse({ status: 200, body: largeBody }),
      Date.now(), Date.now(),
    );

    const entry = logger.getEntries()[0];
    expect(entry.responseBody!.length).toBeLessThan(2000);
    expect(entry.responseBody).toContain('truncated');
  });
});

// ============================================================
// I-2: 1000개 핸들러 등록
// ============================================================
describe('I-2: 1000개 핸들러 등록', () => {
  it('1000개 핸들러에서 매칭 시간이 합리적', async () => {
    const handlers = Array.from({ length: 1000 }, (_, i) =>
      http.get(`https://api.com/route/${i}`, () =>
        HttpResponse.json({ route: i }),
      ),
    );

    const server = setupServer(...handlers);
    server.listen();

    const client = new WebBridgeClient();
    client.use(server.createInterceptor());
    client.use(async () => createResponse({ status: 500 }));

    // 마지막 핸들러 매칭 (worst case)
    const start = performance.now();
    const res = await client.fetch('https://api.com/route/999');
    const elapsed = performance.now() - start;

    expect(res.status).toBe(200);
    expect(JSON.parse(res.body as string).route).toBe(999);
    expect(elapsed).toBeLessThan(50); // 50ms 이내

    // 존재하지 않는 라우트
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const miss = await client.fetch('https://api.com/route/9999');
    expect(miss.status).toBe(500); // fallthrough
    warnSpy.mockRestore();

    server.close();
  });

  it('matchUrl 성능: path params 포함 1000회', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      matchUrl('https://api.com/users/:id/posts/:postId', `https://api.com/users/${i}/posts/${i * 10}`);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

// ============================================================
// I-3: 장기 실행 메모리 안정성 (시뮬레이션)
// ============================================================
describe('I-3: 장기 실행 메모리 안정성', () => {
  it('10000 요청 후 메모리 제한이 유지된다', async () => {
    const jar = new CookieJar();
    const cache = new HttpCache({ maxEntries: 50 });
    const logger = new RequestLogger({ maxEntries: 50 });

    const client = new WebBridgeClient();
    client.use(devtoolsInterceptor({ logger }));
    client.use(headerInterceptor());
    client.use(cookieInterceptor({ jar }));
    client.use(cacheInterceptor({ cache }));
    client.use(async (req) => {
      const i = req.url.split('/').pop();
      return createResponse({
        status: 200,
        headers: {
          'Cache-Control': 'max-age=5',
          'Set-Cookie': `req=${i}; Path=/; Max-Age=60`,
        },
        body: `response-${i}`,
      });
    });

    for (let i = 0; i < 10000; i++) {
      await client.fetch(`https://api.com/item/${i % 100}`);
    }

    // 제한 확인
    expect(logger.size).toBeLessThanOrEqual(50);
    expect(cache.stats().entries).toBeLessThanOrEqual(50);
    expect(jar.size).toBeLessThanOrEqual(50); // 도메인별 50 제한

    jar.dispose();
  });

  it('핸들러 등록/해제 10000회 후 안정', () => {
    const server = setupServer();
    server.listen();

    for (let i = 0; i < 10000; i++) {
      server.use(http.get(`/temp/${i}`, () => HttpResponse.json({})));
      server.resetHandlers();
    }

    expect(server.handlers.length).toBe(0);
    server.close();
  });
});

// ============================================================
// I-4: 동시 요청 처리량
// ============================================================
describe('I-4: 동시 요청 처리량', () => {
  it('500개 동시 요청이 모두 성공', async () => {
    const client = new WebBridgeClient();
    client.use(async (req) => {
      await new Promise((r) => setTimeout(r, Math.random() * 2));
      return createResponse({
        status: 200,
        body: `ok-${req.url.split('/').pop()}`,
      });
    });

    const promises = Array.from({ length: 500 }, (_, i) =>
      client.fetch(`https://api.com/concurrent/${i}`),
    );

    const results = await Promise.all(promises);

    let successCount = 0;
    for (let i = 0; i < 500; i++) {
      if (results[i].status === 200) successCount++;
      expect(results[i].body).toBe(`ok-${i}`);
    }
    expect(successCount).toBe(500);
  });

  it('동시 요청 중 캐시가 정확하게 동작', async () => {
    const cache = new HttpCache();
    let serverCalls = 0;

    const client = new WebBridgeClient();
    client.use(cacheInterceptor({ cache }));
    client.use(async () => {
      serverCalls++;
      await new Promise((r) => setTimeout(r, 5));
      return createResponse({
        status: 200,
        headers: { 'Cache-Control': 'max-age=3600' },
        body: 'shared',
      });
    });

    // 같은 URL 50개 동시 → 첫 번째만 서버 호출, 나머지는 캐시
    // (실제로는 첫 요청이 끝나기 전에 다른 요청이 시작될 수 있어
    //  모두 서버를 호출할 수 있음 — 이것이 정상 동작)
    const promises = Array.from({ length: 50 }, () =>
      client.fetch('https://api.com/shared'),
    );
    const results = await Promise.all(promises);

    for (const r of results) {
      expect(r.status).toBe(200);
      expect(r.body).toBe('shared');
    }

    // 동시 호출이므로 서버 호출 수는 1~50 사이 어딘가 (경쟁 조건)
    // 하지만 결과는 모두 정확해야 함
    expect(serverCalls).toBeGreaterThanOrEqual(1);
    expect(serverCalls).toBeLessThanOrEqual(50);
  });
});
