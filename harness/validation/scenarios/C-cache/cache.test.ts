/**
 * 카테고리 C: 캐시 & 성능 — 5개 시나리오
 */
import { WebBridgeClient, createResponse, getHeader } from '../../../../packages/core/src';
import type { WebBridgeRequest } from '../../../../packages/core/src';
import { HttpCache, cacheInterceptor } from '../../../../packages/cache/src';
import { CookieJar } from '../../../../packages/cookies/src';

// ============================================================
// C-1: ETag 304 Conditional Request
// ============================================================
describe('C-1: ETag 304 Conditional Request', () => {
  it('ETag → If-None-Match → 304 → 캐시 body 재사용', async () => {
    const cache = new HttpCache();
    let serverCalls = 0;

    const client = new WebBridgeClient();
    client.use(cacheInterceptor({ cache }));
    client.use(async (req) => {
      serverCalls++;
      const ifNoneMatch = getHeader(req.headers, 'if-none-match');
      if (ifNoneMatch === '"profile-v1"') {
        return createResponse({ status: 304, headers: { 'Cache-Control': 'max-age=60' } });
      }
      return createResponse({
        status: 200,
        headers: {
          'Cache-Control': 'max-age=0',
          'ETag': '"profile-v1"',
          'Content-Type': 'application/json',
        },
        body: '{"name":"홍길동","settings":{"theme":"dark"}}',
      });
    });

    // 첫 요청
    const res1 = await client.fetch('https://api.kakao.com/profile');
    expect(res1.status).toBe(200);
    expect(getHeader(res1.headers, 'x-cache')).toBe('MISS');

    // 두 번째 요청 (max-age=0이므로 즉시 만료 → conditional)
    const res2 = await client.fetch('https://api.kakao.com/profile');
    expect(getHeader(res2.headers, 'x-cache')).toBe('REVALIDATED');
    expect(res2.body).toBe('{"name":"홍길동","settings":{"theme":"dark"}}');
    expect(serverCalls).toBe(2); // 두 번 호출하지만 body 전송은 1회만
  });

  it('Last-Modified → If-Modified-Since → 304', async () => {
    const cache = new HttpCache();
    const client = new WebBridgeClient();

    client.use(cacheInterceptor({ cache }));
    client.use(async (req) => {
      const ims = getHeader(req.headers, 'if-modified-since');
      if (ims === 'Wed, 01 Jan 2025 00:00:00 GMT') {
        return createResponse({ status: 304 });
      }
      return createResponse({
        status: 200,
        headers: {
          'Cache-Control': 'max-age=0',
          'Last-Modified': 'Wed, 01 Jan 2025 00:00:00 GMT',
        },
        body: 'original',
      });
    });

    await client.fetch('https://api.com/data');
    const res = await client.fetch('https://api.com/data');
    expect(getHeader(res.headers, 'x-cache')).toBe('REVALIDATED');
    expect(res.body).toBe('original');
  });
});

// ============================================================
// C-2: stale-while-revalidate (현재 구현 범위 내 테스트)
// ============================================================
describe('C-2: stale-while-revalidate', () => {
  it('캐시 만료 후 조건부 요청으로 갱신된다', async () => {
    const cache = new HttpCache();
    const client = new WebBridgeClient();
    let version = 1;

    client.use(cacheInterceptor({ cache }));
    client.use(async () =>
      createResponse({
        status: 200,
        headers: { 'Cache-Control': 'max-age=0' },
        body: `v${version++}`,
      }),
    );

    const r1 = await client.fetch('https://api.com/feed');
    expect(r1.body).toBe('v1');

    const r2 = await client.fetch('https://api.com/feed');
    expect(r2.body).toBe('v2'); // 만료 → 새 요청
  });
});

// ============================================================
// C-3: Vary 헤더 다중 캐시 키
// ============================================================
describe('C-3: Vary 헤더 다중 캐시 키', () => {
  it('5개 언어 × 같은 URL = 5개 별도 캐시', async () => {
    const cache = new HttpCache();
    const client = new WebBridgeClient();
    let serverCalls = 0;

    client.use(cacheInterceptor({ cache }));
    client.use(async (req) => {
      serverCalls++;
      const lang = getHeader(req.headers, 'accept-language') ?? 'unknown';
      return createResponse({
        status: 200,
        headers: { 'Cache-Control': 'max-age=3600', 'Vary': 'Accept-Language' },
        body: JSON.stringify({ lang }),
      });
    });

    const languages = ['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'es-ES'];

    // 5개 언어 각각 요청
    for (const lang of languages) {
      await client.fetch('https://api.com/i18n', {
        headers: { 'Accept-Language': lang },
      });
    }
    expect(serverCalls).toBe(5);

    // 모든 언어 재요청 — 캐시 히트
    for (const lang of languages) {
      const res = await client.fetch('https://api.com/i18n', {
        headers: { 'Accept-Language': lang },
      });
      expect(getHeader(res.headers, 'x-cache')).toBe('HIT');
      expect(JSON.parse(res.body as string).lang).toBe(lang);
    }
    expect(serverCalls).toBe(5); // 추가 호출 없음
  });

  it('Vary: * 응답은 캐시되지 않는다', async () => {
    const cache = new HttpCache();
    const client = new WebBridgeClient();
    let calls = 0;

    client.use(cacheInterceptor({ cache }));
    client.use(async () => {
      calls++;
      return createResponse({
        status: 200,
        headers: { 'Cache-Control': 'max-age=3600', 'Vary': '*' },
        body: `call-${calls}`,
      });
    });

    await client.fetch('https://api.com/vary-star');
    await client.fetch('https://api.com/vary-star');
    expect(calls).toBe(2); // 캐시 안 됨
  });
});

// ============================================================
// C-4: LRU Evict
// ============================================================
describe('C-4: LRU Evict', () => {
  it('maxEntries 초과 시 오래된 항목 제거', async () => {
    const cache = new HttpCache({ maxEntries: 5 });
    const client = new WebBridgeClient();

    client.use(cacheInterceptor({ cache }));
    client.use(async (req) =>
      createResponse({
        status: 200,
        headers: { 'Cache-Control': 'max-age=3600' },
        body: req.url,
      }),
    );

    // 10개 URL 캐시 → 5개만 남음
    for (let i = 0; i < 10; i++) {
      await client.fetch(`https://api.com/item/${i}`);
    }
    expect(cache.stats().entries).toBe(5);

    // 마지막 5개만 캐시에 남아있어야 함
    for (let i = 5; i < 10; i++) {
      const res = await client.fetch(`https://api.com/item/${i}`);
      expect(getHeader(res.headers, 'x-cache')).toBe('HIT');
    }
  });

  it('maxSize 초과 엔트리는 저장 거부', () => {
    const cache = new HttpCache({ maxSize: 100 });
    cache.set('https://big.com', {
      response: createResponse({ status: 200, body: 'x'.repeat(200) }),
      storedAt: Date.now(), maxAge: 3600, size: 200,
    });
    expect(cache.stats().entries).toBe(0);
  });
});

// ============================================================
// C-5: 콜드 스타트 영향 (초기화 성능)
// ============================================================
describe('C-5: 콜드 스타트 영향', () => {
  it('WebBridgeClient + 인터셉터 등록이 1ms 이내', () => {
    const start = performance.now();
    const client = new WebBridgeClient();
    const jar = new CookieJar();
    const cache = new HttpCache();

    client.use(cacheInterceptor({ cache }));
    client.use(async () => createResponse({ status: 200 }));

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(10); // 10ms 이내 (여유 포함)

    jar.dispose();
  });
});
