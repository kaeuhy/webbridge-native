/**
 * 공유 Mock 백엔드 — 모든 검증 시나리오가 이 서버를 공유.
 * 시나리오마다 새로 만들지 않는다.
 */

import type { Interceptor, WebBridgeRequest, WebBridgeResponse } from '../../../packages/core/src';
import { createResponse, getHeader } from '../../../packages/core/src';

type RouteHandler = (req: WebBridgeRequest) => WebBridgeResponse;

interface MockBackendOptions {
  /** 각 요청에 대해 호출 횟수를 추적 */
  trackCalls?: boolean;
}

export class MockBackend {
  private routes: Map<string, RouteHandler> = new Map();
  private callLog: Array<{ method: string; url: string; headers: Record<string, string> }> = [];
  private callCounts: Map<string, number> = new Map();

  constructor(private options: MockBackendOptions = {}) {}

  /** 라우트 등록 */
  route(method: string, path: string, handler: RouteHandler): this {
    this.routes.set(`${method.toUpperCase()} ${path}`, handler);
    return this;
  }

  /** 호출 횟수 조회 */
  getCallCount(method: string, path: string): number {
    return this.callCounts.get(`${method.toUpperCase()} ${path}`) ?? 0;
  }

  /** 호출 로그 조회 */
  getCalls(): typeof this.callLog {
    return [...this.callLog];
  }

  /** 리셋 */
  reset(): void {
    this.callLog = [];
    this.callCounts.clear();
  }

  /** 인터셉터로 변환 (terminal) */
  asInterceptor(): Interceptor {
    return async (request) => {
      const key = `${request.method} ${new URL(request.url).pathname}`;

      this.callLog.push({
        method: request.method,
        url: request.url,
        headers: { ...request.headers },
      });
      this.callCounts.set(key, (this.callCounts.get(key) ?? 0) + 1);

      const handler = this.routes.get(key);
      if (handler) return handler(request);

      // 정확한 URL 매칭 시도
      const fullKey = `${request.method} ${request.url.split('?')[0]}`;
      const fullHandler = this.routes.get(fullKey);
      if (fullHandler) return fullHandler(request);

      return createResponse({ status: 404, body: `Not Found: ${key}` });
    };
  }
}

// === 사전 정의된 백엔드 시나리오 ===

/** SSO 로그인 플로우 백엔드 */
export function createSSOBackend(): MockBackend {
  const backend = new MockBackend();
  const sessions = new Map<string, string>();

  backend
    .route('GET', '/idp/authorize', () =>
      createResponse({ status: 302, headers: { Location: 'https://login.corp/saml' } }),
    )
    .route('POST', '/saml/login', () =>
      createResponse({
        status: 302,
        headers: { Location: 'https://login.corp/consent', 'Set-Cookie': 'saml_token=tk1; Path=/; Secure' },
      }),
    )
    .route('GET', '/consent/accept', () =>
      createResponse({
        status: 302,
        headers: { Location: 'https://idp.corp/callback?code=auth123', 'Set-Cookie': 'consent=accepted; Path=/' },
      }),
    )
    .route('GET', '/callback', () =>
      createResponse({
        status: 302,
        headers: { Location: 'https://app.corp/auth/exchange' },
      }),
    )
    .route('GET', '/auth/exchange', () =>
      createResponse({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        rawHeaders: {
          'set-cookie': [
            'session=sess_abc123; Path=/; Domain=.corp; Secure; SameSite=Lax; Max-Age=86400',
            'csrf=csrf_xyz; Path=/; Secure',
          ],
        },
        body: '{"authenticated":true}',
      }),
    )
    .route('GET', '/api/me', (req) => {
      const cookie = getHeader(req.headers, 'cookie') ?? '';
      if (!cookie.includes('session=sess_abc123')) {
        return createResponse({ status: 401, body: '{"error":"unauthorized"}' });
      }
      return createResponse({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: '{"id":"user1","name":"홍길동","role":"admin"}',
      });
    });

  return backend;
}

/** 멀티테넌트 백엔드 */
export function createMultiTenantBackend(): MockBackend {
  const backend = new MockBackend();

  backend
    .route('GET', '/api/data', (req) => {
      const lang = getHeader(req.headers, 'accept-language') ?? 'en';
      return createResponse({
        status: 200,
        headers: {
          'Cache-Control': 'max-age=3600',
          'Vary': 'Accept-Language',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lang, data: `content-${lang}` }),
      });
    })
    .route('GET', '/cdn/asset.js', () =>
      createResponse({
        status: 200,
        headers: { 'Cache-Control': 'max-age=31536000, immutable' },
        body: 'console.log("cached")',
      }),
    )
    .route('GET', '/api/sensitive', () =>
      createResponse({
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
        body: '{"secret":"data"}',
      }),
    );

  return backend;
}
