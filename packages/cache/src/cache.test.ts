import { parseCacheControl, isCacheable } from './cache-control';
import { HttpCache } from './store';
import { cacheInterceptor } from './interceptor';
import { createRequest, createResponse } from '@webbridge-native/core';
import type { WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';

type NextFn = (request: WebBridgeRequest) => Promise<WebBridgeResponse>;

// --- Cache-Control parsing ---

describe('parseCacheControl', () => {
  it('parses max-age', () => {
    expect(parseCacheControl('max-age=3600').maxAge).toBe(3600);
  });

  it('parses no-cache', () => {
    expect(parseCacheControl('no-cache').noCache).toBe(true);
  });

  it('parses no-store', () => {
    expect(parseCacheControl('no-store').noStore).toBe(true);
  });

  it('parses must-revalidate', () => {
    expect(parseCacheControl('must-revalidate').mustRevalidate).toBe(true);
  });

  it('parses public', () => {
    expect(parseCacheControl('public').isPublic).toBe(true);
  });

  it('parses private', () => {
    expect(parseCacheControl('private').isPrivate).toBe(true);
  });

  it('parses stale-while-revalidate', () => {
    expect(parseCacheControl('max-age=60, stale-while-revalidate=30').staleWhileRevalidate).toBe(30);
  });

  it('parses combined directives', () => {
    const d = parseCacheControl('public, max-age=3600, must-revalidate');
    expect(d.isPublic).toBe(true);
    expect(d.maxAge).toBe(3600);
    expect(d.mustRevalidate).toBe(true);
  });

  it('returns defaults for undefined', () => {
    const d = parseCacheControl(undefined);
    expect(d.noCache).toBe(false);
    expect(d.noStore).toBe(false);
    expect(d.maxAge).toBeUndefined();
  });
});

describe('isCacheable', () => {
  it('cacheable for GET 200 with max-age', () => {
    expect(isCacheable('GET', 200, parseCacheControl('max-age=60'))).toBe(true);
  });

  it('not cacheable for POST', () => {
    expect(isCacheable('POST', 200, parseCacheControl('max-age=60'))).toBe(false);
  });

  it('not cacheable with no-store', () => {
    expect(isCacheable('GET', 200, parseCacheControl('no-store'))).toBe(false);
  });

  it('not cacheable for 500 without explicit directive', () => {
    expect(isCacheable('GET', 500, parseCacheControl(''))).toBe(false);
  });

  it('cacheable for 301 with public', () => {
    expect(isCacheable('GET', 301, parseCacheControl('public'))).toBe(true);
  });
});

// --- HttpCache store ---

describe('HttpCache', () => {
  it('get returns null for empty cache', () => {
    const cache = new HttpCache();
    expect(cache.get('https://example.com')).toBeNull();
  });

  it('set and get round-trip', () => {
    const cache = new HttpCache();
    const response = createResponse({ status: 200, body: 'data' });
    cache.set('https://example.com', {
      response,
      storedAt: Date.now(),
      maxAge: 3600,
      size: 4,
    });
    const entry = cache.get('https://example.com');
    expect(entry).not.toBeNull();
    expect(entry!.response.body).toBe('data');
  });

  it('isFresh returns true within maxAge', () => {
    const cache = new HttpCache();
    const now = Date.now();
    cache.set('https://example.com', {
      response: createResponse({ status: 200 }),
      storedAt: now,
      maxAge: 60,
      size: 0,
    });
    expect(cache.isFresh(cache.get('https://example.com')!, now + 30000)).toBe(true);
    expect(cache.isFresh(cache.get('https://example.com')!, now + 61000)).toBe(false);
  });

  it('evicts when maxEntries exceeded', () => {
    const cache = new HttpCache({ maxEntries: 3 });
    for (let i = 0; i < 5; i++) {
      cache.set(`https://example.com/${i}`, {
        response: createResponse({ status: 200 }),
        storedAt: Date.now(),
        maxAge: 60,
        size: 1,
      });
    }
    expect(cache.stats().entries).toBe(3);
  });

  it('delete removes entry', () => {
    const cache = new HttpCache();
    cache.set('https://example.com', {
      response: createResponse({ status: 200 }),
      storedAt: Date.now(),
      maxAge: 60,
      size: 0,
    });
    cache.delete('https://example.com');
    expect(cache.get('https://example.com')).toBeNull();
  });

  it('clear removes all', () => {
    const cache = new HttpCache();
    cache.set('https://a.com', { response: createResponse({ status: 200 }), storedAt: Date.now(), maxAge: 60, size: 0 });
    cache.set('https://b.com', { response: createResponse({ status: 200 }), storedAt: Date.now(), maxAge: 60, size: 0 });
    cache.clear();
    expect(cache.stats().entries).toBe(0);
  });

  it('tracks hit/miss stats', () => {
    const cache = new HttpCache();
    cache.set('https://example.com', { response: createResponse({ status: 200 }), storedAt: Date.now(), maxAge: 60, size: 0 });
    cache.get('https://example.com'); // hit
    cache.get('https://other.com');   // miss
    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });
});

// --- cacheInterceptor ---

describe('cacheInterceptor', () => {
  function createTerminal(response: WebBridgeResponse): NextFn {
    return async () => response;
  }

  it('caches GET 200 with max-age and returns HIT on second request', async () => {
    const cache = new HttpCache();
    const interceptor = cacheInterceptor({ cache });
    const terminal = createTerminal(
      createResponse({
        status: 200,
        headers: { 'Cache-Control': 'max-age=3600' },
        body: 'cached',
      }),
    );

    const req = createRequest('https://api.example.com/data');
    const res1 = await interceptor(req, terminal);
    expect(res1.headers['X-Cache']).toBe('MISS');

    const res2 = await interceptor(createRequest('https://api.example.com/data'), terminal);
    expect(res2.headers['X-Cache']).toBe('HIT');
    expect(res2.body).toBe('cached');
  });

  it('does not cache POST requests', async () => {
    const cache = new HttpCache();
    const interceptor = cacheInterceptor({ cache });
    let callCount = 0;
    const terminal: NextFn = async () => {
      callCount++;
      return createResponse({ status: 200, headers: { 'Cache-Control': 'max-age=3600' } });
    };

    await interceptor(createRequest('https://example.com', { method: 'POST' }), terminal);
    await interceptor(createRequest('https://example.com', { method: 'POST' }), terminal);
    expect(callCount).toBe(2);
  });

  it('does not cache no-store responses', async () => {
    const cache = new HttpCache();
    const interceptor = cacheInterceptor({ cache });
    const terminal = createTerminal(
      createResponse({ status: 200, headers: { 'Cache-Control': 'no-store' } }),
    );

    await interceptor(createRequest('https://example.com'), terminal);
    expect(cache.stats().entries).toBe(0);
  });

  it('sends conditional request with ETag for stale cache', async () => {
    const cache = new HttpCache();
    const interceptor = cacheInterceptor({ cache });

    const terminal1 = createTerminal(
      createResponse({
        status: 200,
        headers: { 'Cache-Control': 'max-age=0', 'ETag': '"abc"' },
        body: 'original',
      }),
    );
    await interceptor(createRequest('https://example.com'), terminal1);

    let capturedHeaders: Record<string, string> = {};
    const terminal2: NextFn = async (req) => {
      capturedHeaders = req.headers;
      return createResponse({ status: 304, headers: {} });
    };

    const res = await interceptor(createRequest('https://example.com'), terminal2);
    expect(capturedHeaders['If-None-Match']).toBe('"abc"');
    expect(res.headers['X-Cache']).toBe('REVALIDATED');
    expect(res.body).toBe('original');
  });
});
