import { RequestLogger } from './logger';
import { devtoolsInterceptor } from './interceptor';
import { createRequest, createResponse } from '@webbridge-native/core';
import type { WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';

type NextFn = (request: WebBridgeRequest) => Promise<WebBridgeResponse>;

describe('RequestLogger', () => {
  it('logs a request/response pair', () => {
    const logger = new RequestLogger();
    const req = createRequest('https://example.com');
    const res = createResponse({ status: 200, body: 'ok' });
    logger.log(req, res, 1000, 1050);

    expect(logger.size).toBe(1);
    const entries = logger.getEntries();
    expect(entries[0].url).toBe('https://example.com');
    expect(entries[0].status).toBe(200);
    expect(entries[0].duration).toBe(50);
  });

  it('enforces maxEntries limit', () => {
    const logger = new RequestLogger({ maxEntries: 3 });
    for (let i = 0; i < 5; i++) {
      logger.log(
        createRequest(`https://example.com/${i}`),
        createResponse({ status: 200 }),
        i * 100, i * 100 + 50,
      );
    }
    expect(logger.size).toBe(3);
    expect(logger.getEntries()[0].url).toBe('https://example.com/2');
  });

  it('filters entries', () => {
    const logger = new RequestLogger();
    logger.log(createRequest('https://a.com'), createResponse({ status: 200 }), 0, 1);
    logger.log(createRequest('https://b.com'), createResponse({ status: 404 }), 0, 1);
    const errors = logger.filter((e) => e.status >= 400);
    expect(errors.length).toBe(1);
    expect(errors[0].url).toBe('https://b.com');
  });

  it('clears entries', () => {
    const logger = new RequestLogger();
    logger.log(createRequest('https://example.com'), createResponse({ status: 200 }), 0, 1);
    logger.clear();
    expect(logger.size).toBe(0);
  });

  it('exports to HAR format', () => {
    const logger = new RequestLogger();
    logger.log(createRequest('https://example.com'), createResponse({ status: 200 }), 1000, 1050);
    const har = logger.toHAR() as { log: { version: string; entries: unknown[] } };
    expect(har.log.version).toBe('1.2');
    expect(har.log.entries.length).toBe(1);
  });

  it('generates curl command', () => {
    const logger = new RequestLogger();
    const req = createRequest('https://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"key":"value"}',
    });
    logger.log(req, createResponse({ status: 200 }), 0, 1);
    const curl = logger.toCurl(logger.getEntries()[0]);
    expect(curl).toContain('curl -X POST');
    expect(curl).toContain("Content-Type: application/json");
    expect(curl).toContain('{"key":"value"}');
    expect(curl).toContain('https://example.com/api');
  });
});

describe('devtoolsInterceptor', () => {
  it('logs successful requests', async () => {
    const logger = new RequestLogger();
    const interceptor = devtoolsInterceptor({ logger });
    const next: NextFn = async () => createResponse({ status: 200, body: 'ok' });

    await interceptor(createRequest('https://example.com'), next);
    expect(logger.size).toBe(1);
    expect(logger.getEntries()[0].status).toBe(200);
  });

  it('logs failed requests and re-throws', async () => {
    const logger = new RequestLogger();
    const interceptor = devtoolsInterceptor({ logger });
    const next: NextFn = async () => { throw new Error('Network error'); };

    await expect(
      interceptor(createRequest('https://example.com'), next),
    ).rejects.toThrow('Network error');

    expect(logger.size).toBe(1);
    expect(logger.getEntries()[0].status).toBe(0);
  });

  it('measures duration', async () => {
    const logger = new RequestLogger();
    const interceptor = devtoolsInterceptor({ logger });
    const next: NextFn = async () => createResponse({ status: 200 });

    await interceptor(createRequest('https://example.com'), next);
    expect(logger.getEntries()[0].duration).toBeGreaterThanOrEqual(0);
  });
});
