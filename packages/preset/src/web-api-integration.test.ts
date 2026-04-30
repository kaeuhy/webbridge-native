/**
 * Round 2 통합 검증 — web-api + 기존 인터셉터 체인 통합
 *
 * batchar-app/hodu-app에서 발견한 한계점들이 web-api로 해결되었는지 검증:
 * 1. WBHeaders: case-insensitive, iterable
 * 2. WBResponse: .json(), .text(), .clone(), fromWebBridge()
 * 3. WBRequest: fromWebBridge/toWebBridge 라운드트립
 * 4. FormData 직렬화: 인터셉터 체인 통과
 * 5. AbortSignal.timeout(): 타임아웃 편의 API
 * 6. 기존 mock 서버와 결합
 */

import { WebBridgeClient, createResponse, getHeader } from '@webbridge-native/core';
import type { Interceptor } from '@webbridge-native/core';
import { setupServer, http, HttpResponse } from '@webbridge-native/mock';
import { cookieInterceptor, CookieJar } from '@webbridge-native/cookies';
import { headerInterceptor } from '@webbridge-native/headers';
import { WBHeaders, WBResponse, WBRequest, serializeFormData, abortSignalTimeout } from '@webbridge-native/web-api';

const API = 'https://task-api.wisoft.io/batchar';

// ============================================================
// 한계점 해소 검증 1: WBHeaders — batchar-app의 new Headers() 패턴
// ============================================================

describe('한계점 해소: WBHeaders로 batchar-app apiFetch 패턴 재현', () => {
  it('batchar-app의 apiFetch 헤더 조작 패턴을 지원한다', () => {
    // batchar-app의 apiFetch:
    //   const headers = new Headers(options.headers);
    //   headers.set('Content-Type', 'application/json');
    //   headers.set('Authorization', `Bearer ${token}`);
    const headers = new WBHeaders({ Accept: 'text/html' });
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', 'Bearer test-token');

    // case-insensitive
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('AUTHORIZATION')).toBe('Bearer test-token');

    // Record 변환 → WebBridgeRequest에 전달 가능
    const record = headers.toRecord();
    expect(record['accept']).toBe('text/html');
    expect(record['content-type']).toBe('application/json');
  });

  it('WBHeaders를 인터셉터 체인에서 사용할 수 있다', async () => {
    const server = setupServer(
      http.get(`${API}/api/users/me`, ({ request }: any) => {
        const auth = getHeader(request.headers, 'authorization') ?? '';
        if (!auth.includes('Bearer valid')) {
          return HttpResponse.json({ data: null }, { status: 401 });
        }
        return HttpResponse.json({ data: { name: '경매왕' } });
      }),
    );
    server.listen();

    const client = new WebBridgeClient();
    client.use(server.createInterceptor());
    client.use(async () => { throw new Error('unreachable'); });

    // WBHeaders → Record 변환하여 fetch에 사용
    const headers = new WBHeaders();
    headers.set('Authorization', 'Bearer valid');

    const res = await client.fetch(`${API}/api/users/me`, {
      headers: headers.toRecord(),
    });
    expect(res.status).toBe(200);

    server.close();
  });
});

// ============================================================
// 한계점 해소 검증 2: WBResponse — .json(), .text(), .clone()
// ============================================================

describe('한계점 해소: WBResponse로 Fetch API Response 패턴 재현', () => {
  it('WebBridgeResponse를 WBResponse로 래핑하여 .json() 사용', async () => {
    const server = setupServer(
      http.get(`${API}/api/products`, () =>
        HttpResponse.json({
          data: { content: [{ product_id: 1, title: '맥북' }], has_next: false },
          message: 'OK',
        }),
      ),
    );
    server.listen();

    const client = new WebBridgeClient();
    client.use(server.createInterceptor());
    client.use(async () => { throw new Error('unreachable'); });

    const rawRes = await client.fetch(`${API}/api/products`);

    // 기존 방식: JSON.parse(res.body as string)
    // 새 방식: WBResponse.fromWebBridge(res).json()
    const wbRes = WBResponse.fromWebBridge(rawRes);
    const data = await wbRes.json() as any;

    expect(data.data.content[0].title).toBe('맥북');
    expect(wbRes.ok).toBe(true);
    expect(wbRes.status).toBe(200);

    server.close();
  });

  it('clone()으로 body를 여러 번 읽을 수 있다', async () => {
    const server = setupServer(
      http.get(`${API}/api/users/me`, () =>
        HttpResponse.json({ data: { name: '경매왕' } }),
      ),
    );
    server.listen();

    const client = new WebBridgeClient();
    client.use(server.createInterceptor());
    client.use(async () => { throw new Error('unreachable'); });

    const rawRes = await client.fetch(`${API}/api/users/me`);
    const wbRes = WBResponse.fromWebBridge(rawRes);

    // clone 후 두 번 읽기
    const cloned = wbRes.clone();
    const text = await wbRes.text();
    const json = await cloned.json() as any;

    expect(text).toContain('경매왕');
    expect(json.data.name).toBe('경매왕');

    server.close();
  });

  it('toWebBridge()로 다시 인터셉터 체인에 전달 가능', async () => {
    const wbRes = new WBResponse('{"test": true}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const bridgeRes = wbRes.toWebBridge();
    expect(bridgeRes.status).toBe(200);
    expect(bridgeRes.ok).toBe(true);
    expect(bridgeRes.body).toBe('{"test": true}');
    expect(bridgeRes.headers['content-type']).toBe('application/json');
  });
});

// ============================================================
// 한계점 해소 검증 3: FormData 직렬화 — 상품 등록 패턴
// ============================================================

describe('한계점 해소: FormData 직렬화로 인터셉터 체인 통과', () => {
  it('batchar-app 상품 등록 패턴을 시뮬레이션한다', async () => {
    const server = setupServer(
      http.post(`${API}/api/products`, ({ request }: any) => {
        const contentType = getHeader(request.headers, 'content-type') ?? '';
        // multipart/form-data인지 확인
        expect(contentType).toContain('multipart/form-data');
        expect(contentType).toContain('boundary=');

        // body에 필드가 포함되어 있는지 확인
        const body = request.body as string;
        expect(body).toContain('title');
        expect(body).toContain('아이패드 프로');

        return HttpResponse.json({ data: { product_id: 1 }, message: 'OK' });
      }),
    );
    server.listen();

    const client = new WebBridgeClient();
    client.use(server.createInterceptor());
    client.use(async () => { throw new Error('unreachable'); });

    // FormData → 직렬화 → string body로 인터셉터 체인 통과
    const { body, contentType } = serializeFormData([
      { name: 'title', value: '아이패드 프로' },
      { name: 'description', value: '미개봉 새상품' },
      { name: 'category', value: 'ELECTRONICS' },
      { name: 'start_price', value: '500000' },
      {
        name: 'image',
        value: { data: 'base64imagedata...', filename: 'product.jpg', contentType: 'image/jpeg' },
      },
    ]);

    const res = await client.fetch(`${API}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Authorization: 'Bearer token',
      },
      body,
    });

    expect(res.status).toBe(200);
    expect(JSON.parse(res.body as string).data.product_id).toBe(1);

    server.close();
  });
});

// ============================================================
// 한계점 해소 검증 4: AbortSignal.timeout()
// ============================================================

describe('한계점 해소: AbortSignal.timeout()', () => {
  it('이미 abort된 signal로 요청하면 즉시 에러가 발생한다', async () => {
    const client = new WebBridgeClient();
    client.use(async () => createResponse({ status: 200 }));

    // 매우 짧은 타임아웃 (0ms) → 즉시 abort
    const signal = abortSignalTimeout(0);
    // abort 이벤트가 발생할 시간을 줌
    await new Promise((r) => setTimeout(r, 10));

    await expect(
      client.fetch('https://example.com/slow', { signal }),
    ).rejects.toThrow();
  });

  it('abortSignalTimeout이 올바른 AbortSignal을 반환한다', () => {
    const signal = abortSignalTimeout(1000);
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
  });
});

// ============================================================
// 전체 파이프라인 통합: web-api + cookies + headers + mock
// ============================================================

describe('전체 파이프라인: web-api + 기존 인터셉터 통합', () => {
  it('로그인 → 쿠키 자동 관리 → WBResponse.json() 전체 플로우', async () => {
    const jar = new CookieJar();
    const server = setupServer(
      http.post(`${API}/api/auth/login`, () =>
        HttpResponse.json(
          { data: { userId: 1, accessToken: 'at-1' }, message: '로그인 성공' },
          { headers: { 'Set-Cookie': 'session=s1; Path=/; HttpOnly' } },
        ),
      ),
      http.get(`${API}/api/users/me`, ({ request }: any) => {
        const cookie = getHeader(request.headers, 'cookie') ?? '';
        if (!cookie.includes('session=s1')) {
          return HttpResponse.json({ data: null }, { status: 401 });
        }
        return HttpResponse.json({ data: { user_id: 1, name: '경매왕' }, message: 'OK' });
      }),
    );
    server.listen();

    const client = new WebBridgeClient();
    client.use(headerInterceptor({ userAgent: 'browser-like' }));
    client.use(cookieInterceptor({ jar }));
    client.use(server.createInterceptor());
    client.use(async () => { throw new Error('unreachable'); });

    // 1. 로그인
    const loginRaw = await client.fetch(`${API}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', password: 'pass' }),
    });
    const loginRes = WBResponse.fromWebBridge(loginRaw);
    const loginData = await loginRes.json() as any;
    expect(loginData.data.accessToken).toBe('at-1');

    // 2. 쿠키 자동 첨부 → 프로필 조회 → WBResponse.json()
    const profileRaw = await client.fetch(`${API}/api/users/me`);
    const profileRes = WBResponse.fromWebBridge(profileRaw);

    // WBResponse의 headers를 WBHeaders로 사용
    expect(profileRes.headers.get('content-type')).toBe('application/json');

    const profile = await profileRes.json() as any;
    expect(profile.data.name).toBe('경매왕');

    server.close();
  });

  it('대시보드 병렬 요청 + WBResponse 변환', async () => {
    const server = setupServer(
      http.get(`${API}/api/products`, () =>
        HttpResponse.json({ data: { content: [{ product_id: 1 }] } }),
      ),
      http.get(`${API}/api/users/me`, () =>
        HttpResponse.json({ data: { name: '경매왕' } }),
      ),
      http.get(`${API}/api/chats`, () =>
        HttpResponse.json({ data: [{ chat_id: 1 }] }),
      ),
    );
    server.listen();

    const client = new WebBridgeClient();
    client.use(server.createInterceptor());
    client.use(async () => { throw new Error('unreachable'); });

    const results = await Promise.all([
      client.fetch(`${API}/api/products`).then(WBResponse.fromWebBridge),
      client.fetch(`${API}/api/users/me`).then(WBResponse.fromWebBridge),
      client.fetch(`${API}/api/chats`).then(WBResponse.fromWebBridge),
    ]);

    // 모든 응답에서 .json() 사용 가능
    const [products, user, chats] = await Promise.all(
      results.map((r) => r.json()),
    ) as any[];

    expect(products.data.content).toHaveLength(1);
    expect(user.data.name).toBe('경매왕');
    expect(chats.data).toHaveLength(1);

    server.close();
  });
});
