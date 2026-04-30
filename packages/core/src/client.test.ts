import { WebBridgeClient } from './client';
import { Interceptor, WebBridgeResponse } from './types';
import { createResponse } from './utils';

/** 항상 고정 응답을 반환하는 터미널 인터셉터 */
const terminalInterceptor: Interceptor = async (request) => {
  return createResponse({
    status: 200,
    url: request.url,
    body: 'terminal',
  });
};

describe('WebBridgeClient', () => {
  describe('use()', () => {
    it('returns this for chaining', () => {
      const client = new WebBridgeClient();
      const result = client.use(terminalInterceptor);
      expect(result).toBe(client);
    });
  });

  describe('fetch()', () => {
    it('throws when no interceptors registered', async () => {
      const client = new WebBridgeClient();
      await expect(client.fetch('https://example.com')).rejects.toThrow(
        'No interceptors registered',
      );
    });

    it('executes a single terminal interceptor', async () => {
      const client = new WebBridgeClient();
      client.use(terminalInterceptor);
      const res = await client.fetch('https://example.com');
      expect(res.status).toBe(200);
      expect(res.body).toBe('terminal');
      expect(res.url).toBe('https://example.com');
    });

    it('executes interceptors in registration order', async () => {
      const order: number[] = [];

      const first: Interceptor = async (req, next) => {
        order.push(1);
        const res = await next(req);
        order.push(4);
        return res;
      };

      const second: Interceptor = async (req, next) => {
        order.push(2);
        const res = await next(req);
        order.push(3);
        return res;
      };

      const terminal: Interceptor = async (req) => {
        order.push(0);
        return createResponse({ status: 200, url: req.url });
      };

      const client = new WebBridgeClient();
      client.use(first).use(second).use(terminal);
      await client.fetch('https://example.com');

      expect(order).toEqual([1, 2, 0, 3, 4]);
    });

    it('allows interceptors to modify the request', async () => {
      const addHeader: Interceptor = async (req, next) => {
        return next({
          ...req,
          headers: { ...req.headers, 'X-Added': 'true' },
        });
      };

      const captureHeaders: Interceptor = async (req) => {
        return createResponse({
          status: 200,
          body: JSON.stringify(req.headers),
        });
      };

      const client = new WebBridgeClient();
      client.use(addHeader).use(captureHeaders);
      const res = await client.fetch('https://example.com');
      const headers = JSON.parse(res.body as string);
      expect(headers['X-Added']).toBe('true');
    });

    it('allows interceptors to modify the response', async () => {
      const addResponseHeader: Interceptor = async (req, next) => {
        const res = await next(req);
        return { ...res, headers: { ...res.headers, 'X-Modified': 'true' } };
      };

      const client = new WebBridgeClient();
      client.use(addResponseHeader).use(terminalInterceptor);
      const res = await client.fetch('https://example.com');
      expect(res.headers['X-Modified']).toBe('true');
    });

    it('allows interceptor to short-circuit (not call next)', async () => {
      const shortCircuit: Interceptor = async () => {
        return createResponse({ status: 418, body: 'teapot' });
      };

      const shouldNotRun: Interceptor = async () => {
        throw new Error('Should not reach here');
      };

      const client = new WebBridgeClient();
      client.use(shortCircuit).use(shouldNotRun);
      const res = await client.fetch('https://example.com');
      expect(res.status).toBe(418);
      expect(res.body).toBe('teapot');
    });

    it('throws when chain is exhausted (last interceptor calls next)', async () => {
      const passthrough: Interceptor = async (req, next) => {
        return next(req);
      };

      const client = new WebBridgeClient();
      client.use(passthrough);
      await expect(client.fetch('https://example.com')).rejects.toThrow(
        'chain exhausted',
      );
    });

    it('throws AbortError when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const client = new WebBridgeClient();
      client.use(terminalInterceptor);
      await expect(
        client.fetch('https://example.com', { signal: controller.signal }),
      ).rejects.toThrow('aborted');
    });

    it('throws AbortError when signal aborts during chain', async () => {
      const controller = new AbortController();

      const slowInterceptor: Interceptor = async (req, next) => {
        controller.abort();
        return next(req);
      };

      const client = new WebBridgeClient();
      client.use(slowInterceptor).use(terminalInterceptor);
      await expect(
        client.fetch('https://example.com', { signal: controller.signal }),
      ).rejects.toThrow('aborted');
    });

    it('wraps non-Error thrown values from interceptors', async () => {
      const throwString: Interceptor = async () => {
        throw 'string error'; // eslint-disable-line no-throw-literal
      };

      const client = new WebBridgeClient();
      client.use(throwString);

      const rejection = client.fetch('https://example.com');
      await expect(rejection).rejects.toThrow('string error');
      await expect(rejection).rejects.toBeInstanceOf(Error);
    });

    it('throws when next() is called concurrently (without awaiting)', async () => {
      let secondCallError: Error | null = null;

      const concurrentNext: Interceptor = async (req, next) => {
        const p1 = next(req);
        // 첫 번째가 아직 pending 중에 두 번째 호출
        const p2 = next(req).catch((e: Error) => { secondCallError = e; });
        await p2;
        return p1;
      };

      const client = new WebBridgeClient();
      client.use(concurrentNext).use(terminalInterceptor);
      await client.fetch('https://example.com');

      expect(secondCallError).toBeInstanceOf(Error);
      expect(secondCallError!.message).toContain(
        'next() called while a previous next() call is still pending',
      );
    });

    it('allows sequential next() calls (redirect pattern)', async () => {
      let callCount = 0;
      const sequentialNext: Interceptor = async (req, next) => {
        // 첫 번째 호출 await 후 두 번째 호출 — 리다이렉트 패턴
        const res1 = await next(req);
        if (callCount === 0) {
          callCount++;
          return next(req); // 이전 호출이 완료된 후이므로 허용
        }
        return res1;
      };

      const client = new WebBridgeClient();
      client.use(sequentialNext).use(terminalInterceptor);
      const res = await client.fetch('https://example.com');
      expect(res.status).toBe(200);
    });

    it('passes RequestInit options through to the request', async () => {
      let capturedMethod = '';
      let capturedCredentials = '';

      const capture: Interceptor = async (req) => {
        capturedMethod = req.method;
        capturedCredentials = req.credentials ?? '';
        return createResponse({ status: 200 });
      };

      const client = new WebBridgeClient();
      client.use(capture);
      await client.fetch('https://example.com', {
        method: 'POST',
        credentials: 'include',
      });

      expect(capturedMethod).toBe('POST');
      expect(capturedCredentials).toBe('include');
    });
  });
});
