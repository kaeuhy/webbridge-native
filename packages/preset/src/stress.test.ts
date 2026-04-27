/**
 * 스트레스 테스트 — Round 2
 * 극한 상황에서의 안정성 검증.
 */

import { WebBridgeClient, createResponse, getHeader, generateRequestId } from '@webbridge-native/core';
import type { Interceptor, WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';
import { CookieJar, cookieInterceptor, parseSetCookie, domainMatch, isPublicSuffix } from '@webbridge-native/cookies';
import { headerInterceptor } from '@webbridge-native/headers';
import { setupServer, http, HttpResponse, matchUrl } from '@webbridge-native/mock';
import { HttpCache, cacheInterceptor, parseCacheControl } from '@webbridge-native/cache';
import { redirectInterceptor } from '@webbridge-native/redirect';
import { RequestLogger, devtoolsInterceptor } from '@webbridge-native/devtools';
import { checkCorsHeaders, isSimpleRequest } from '@webbridge-native/cors';
import { parseEventStream, parseRetryField } from '@webbridge-native/sse';
import { EventSource } from '@webbridge-native/sse';

// ============================================================
// 엣지 케이스: 빈 문자열, null, undefined, 특수 문자
// ============================================================

describe('엣지 케이스: 입력 경계', () => {
  it('빈 Set-Cookie 헤더', () => {
    expect(parseSetCookie('', 'https://example.com')).toBeNull();
  });

  it('이름 없는 쿠키', () => {
    expect(parseSetCookie('=value', 'https://example.com')).toBeNull();
  });

  it('유니코드 쿠키 값', async () => {
    const jar = new CookieJar();
    await jar.setCookie('name=한글값; Path=/', 'https://example.com/');
    const header = await jar.getCookieHeader('https://example.com/');
    expect(header).toBe('name=한글값');
  });

  it('매우 긴 URL (10KB)', async () => {
    const longPath = '/a'.repeat(5000);
    const jar = new CookieJar();
    await jar.setCookie('x=1; Path=/', `https://example.com${longPath}`);
    const header = await jar.getCookieHeader(`https://example.com${longPath}`);
    expect(header).toBe('x=1');
  });

  it('특수문자가 포함된 쿠키 이름', async () => {
    const jar = new CookieJar();
    await jar.setCookie('my.token=abc; Path=/', 'https://example.com/');
    const header = await jar.getCookieHeader('https://example.com/');
    expect(header).toBe('my.token=abc');
  });

  it('빈 쿠키 값', async () => {
    const jar = new CookieJar();
    await jar.setCookie('empty=; Path=/', 'https://example.com/');
    const header = await jar.getCookieHeader('https://example.com/');
    expect(header).toBe('empty=');
  });

  it('domainMatch: 빈 문자열', () => {
    expect(domainMatch('', '')).toBe(true);
    expect(domainMatch('example.com', '')).toBe(false);
  });

  it('matchUrl: 빈 패턴과 URL', () => {
    expect(matchUrl('', '')).toEqual({});
  });

  it('parseCacheControl: 빈 문자열', () => {
    const d = parseCacheControl('');
    expect(d.noCache).toBe(false);
    expect(d.maxAge).toBeUndefined();
  });

  it('parseCacheControl: 알 수 없는 directive', () => {
    const d = parseCacheControl('max-age=60, unknown-directive=foo, no-cache');
    expect(d.maxAge).toBe(60);
    expect(d.noCache).toBe(true);
  });

  it('isSimpleRequest: 빈 헤더', () => {
    expect(isSimpleRequest('GET', {})).toBe(true);
  });

  it('SSE: 빈 문자열 파싱', () => {
    expect(parseEventStream('')).toEqual([]);
  });

  it('SSE: CRLF 혼합', () => {
    const events = parseEventStream('data: line1\r\ndata: line2\r\n\r\n');
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('line1\nline2');
  });

  it('SSE: CR만 사용', () => {
    const events = parseEventStream('data: hello\r\r');
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('hello');
  });

  it('SSE: null 문자가 포함된 event ID 무시', () => {
    const events = parseEventStream('id: bad\0id\ndata: test\n\n');
    expect(events[0].lastEventId).toBe('');
  });

  it('parseRetryField: 음수 retry 무시', () => {
    expect(parseRetryField('retry: -1\n')).toBeUndefined();
  });

  it('EventSource: 잘못된 URL로 생성', () => {
    const es = new EventSource('not-a-valid-url');
    expect(es.readyState).toBe(EventSource.CONNECTING);
    // origin이 빈 문자열이어야 함 (crash 없이)
    es._handleChunk('data: test\n\n');
    es.close();
  });
});

// ============================================================
// Public Suffix 보안 검증
// ============================================================

describe('Public Suffix 보안', () => {
  it.each([
    ['com', true],
    ['co.uk', true],
    ['co.kr', true],
    ['com.au', true],
    ['go.kr', true],
    ['localhost', true], // 단일 라벨
    ['example.com', false],
    ['api.co.uk', false],
    ['toss.co.kr', false],
  ])('isPublicSuffix("%s") === %s', (domain, expected) => {
    expect(isPublicSuffix(domain)).toBe(expected);
  });
});

// ============================================================
// 쿠키: 다중 Set-Cookie 분리
// ============================================================

describe('다중 Set-Cookie 분리', () => {
  it('rawHeaders로 다중 Set-Cookie 처리', async () => {
    const jar = new CookieJar();
    const client = new WebBridgeClient();

    client.use(cookieInterceptor({ jar }));
    client.use(async () =>
      createResponse({
        status: 200,
        rawHeaders: {
          'set-cookie': [
            'a=1; Path=/',
            'b=2; Path=/',
            'c=3; Path=/',
          ],
        },
      }),
    );

    await client.fetch('https://example.com/');
    expect(jar.size).toBe(3);
    const header = await jar.getCookieHeader('https://example.com/');
    expect(header).toContain('a=1');
    expect(header).toContain('b=2');
    expect(header).toContain('c=3');
  });

  it('콤마 결합된 Set-Cookie 안전 분리', async () => {
    const jar = new CookieJar();
    const client = new WebBridgeClient();

    client.use(cookieInterceptor({ jar }));
    client.use(async () =>
      createResponse({
        status: 200,
        headers: {
          // 날짜에 콤마 포함 + 쿠키 경계 콤마
          'Set-Cookie': 'a=1; Expires=Thu, 01 Jan 2030 00:00:00 GMT; Path=/, b=2; Path=/',
        },
      }),
    );

    await client.fetch('https://example.com/');
    expect(jar.size).toBe(2);
  });
});

// ============================================================
// CORS 검증
// ============================================================

describe('CORS 엣지 케이스', () => {
  it('wildcard Allow-Methods', () => {
    const result = checkCorsHeaders(
      'https://app.com', 'DELETE', {},
      { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*' },
    );
    expect(result.allowed).toBe(true);
  });

  it('wildcard Allow-Headers', () => {
    const result = checkCorsHeaders(
      'https://app.com', 'GET', { 'X-Custom': 'value' },
      { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
    );
    expect(result.allowed).toBe(true);
  });
});

// ============================================================
// 캐시 Vary 검증
// ============================================================

describe('캐시 Vary 헤더', () => {
  it('Vary: Accept-Language로 캐시가 분리된다', async () => {
    const cache = new HttpCache();
    const client = new WebBridgeClient();
    let callCount = 0;

    client.use(cacheInterceptor({ cache }));
    client.use(async (req) => {
      callCount++;
      const lang = getHeader(req.headers, 'accept-language') ?? 'unknown';
      return createResponse({
        status: 200,
        headers: { 'Cache-Control': 'max-age=3600', 'Vary': 'Accept-Language' },
        body: `lang=${lang}`,
      });
    });

    // 한국어 요청
    await client.fetch('https://api.example.com/data', {
      headers: { 'Accept-Language': 'ko-KR' },
    });
    // 영어 요청 — Vary 때문에 캐시 미스
    await client.fetch('https://api.example.com/data', {
      headers: { 'Accept-Language': 'en-US' },
    });
    expect(callCount).toBe(2); // 두 번 서버 호출

    // 한국어 재요청 — 캐시 히트
    const res = await client.fetch('https://api.example.com/data', {
      headers: { 'Accept-Language': 'ko-KR' },
    });
    expect(callCount).toBe(2); // 서버 호출 안 함
    expect(res.body).toBe('lang=ko-KR');
    expect(getHeader(res.headers, 'x-cache')).toBe('HIT');
  });
});

// ============================================================
// 동시 쿠키 수정 안전성
// ============================================================

describe('동시 쿠키 수정', () => {
  it('50개 동시 setCookie가 에러 없이 처리된다', async () => {
    const jar = new CookieJar();
    const promises = Array.from({ length: 50 }, (_, i) =>
      jar.setCookie(`c${i}=v${i}; Path=/`, 'https://example.com/'),
    );
    await Promise.all(promises);
    expect(jar.size).toBe(50);
  });

  it('setCookie와 getCookieHeader 동시 호출', async () => {
    const jar = new CookieJar();
    await jar.setCookie('initial=1; Path=/', 'https://example.com/');

    const promises: Promise<unknown>[] = [];
    for (let i = 0; i < 20; i++) {
      promises.push(jar.setCookie(`c${i}=v${i}; Path=/`, 'https://example.com/'));
      promises.push(jar.getCookieHeader('https://example.com/'));
    }

    // 에러 없이 완료
    await expect(Promise.all(promises)).resolves.toBeDefined();
  });
});

// ============================================================
// 전체 파이프라인 1000 요청
// ============================================================

describe('전체 파이프라인 1000 요청', () => {
  it('1000개 순차 요청이 메모리 누수 없이 처리된다', async () => {
    const jar = new CookieJar();
    const cache = new HttpCache({ maxEntries: 100 });
    const logger = new RequestLogger({ maxEntries: 100 });
    const client = new WebBridgeClient();

    client.use(devtoolsInterceptor({ logger }));
    client.use(headerInterceptor());
    client.use(cookieInterceptor({ jar }));
    client.use(cacheInterceptor({ cache }));
    client.use(async (req) =>
      createResponse({
        status: 200,
        headers: { 'Cache-Control': 'max-age=10' },
        body: `ok-${req.url}`,
      }),
    );

    for (let i = 0; i < 1000; i++) {
      const res = await client.fetch(`https://api.example.com/item/${i % 200}`);
      expect(res.status).toBe(200);
    }

    // 메모리 제한 확인
    expect(logger.size).toBeLessThanOrEqual(100);
    expect(cache.stats().entries).toBeLessThanOrEqual(100);

    jar.dispose();
  });
});
