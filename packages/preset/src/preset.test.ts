import { setupWebBridge } from './index';
import { http, HttpResponse } from '@webbridge-native/mock';
import { createResponse } from '@webbridge-native/core';
import type { Interceptor } from '@webbridge-native/core';

/** Terminal interceptor that returns a fixed response */
const terminal: Interceptor = async (req) =>
  createResponse({ status: 200, url: req.url, body: 'terminal' });

describe('setupWebBridge', () => {
  it('creates a client with default options', () => {
    const { client, cookieJar, mockServer } = setupWebBridge();
    expect(client).toBeDefined();
    expect(cookieJar).not.toBeNull();
    expect(mockServer).toBeNull();
  });

  it('disables cookies when cookies: false', () => {
    const { cookieJar } = setupWebBridge({ cookies: false });
    expect(cookieJar).toBeNull();
  });

  it('disables headers when headers: false', async () => {
    const { client } = setupWebBridge({
      headers: false,
      cookies: false,
      interceptors: [
        async (req) =>
          createResponse({ status: 200, body: JSON.stringify(req.headers) }),
      ],
    });
    const res = await client.fetch('https://example.com');
    const headers = JSON.parse(res.body as string);
    expect(headers['User-Agent']).toBeUndefined();
  });

  it('sets up mock server when mock option provided', () => {
    const { mockServer, dispose } = setupWebBridge({
      mock: {
        handlers: [
          http.get('https://api.example.com/test', () =>
            HttpResponse.json({ ok: true }),
          ),
        ],
      },
    });
    expect(mockServer).not.toBeNull();
    expect(mockServer!.isActive).toBe(true);
    dispose();
    expect(mockServer!.isActive).toBe(false);
  });

  it('integrates mock with client pipeline', async () => {
    const { client, dispose } = setupWebBridge({
      cookies: false,
      headers: false,
      mock: {
        handlers: [
          http.get('https://api.example.com/users', () =>
            HttpResponse.json([{ id: 1 }]),
          ),
        ],
      },
      interceptors: [terminal],
    });

    const res = await client.fetch('https://api.example.com/users');
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual([{ id: 1 }]);

    dispose();
  });

  it('adds custom interceptors', async () => {
    let customRan = false;
    const custom: Interceptor = async (req, next) => {
      customRan = true;
      return next(req);
    };

    const { client } = setupWebBridge({
      cookies: false,
      headers: false,
      interceptors: [custom, terminal],
    });

    await client.fetch('https://example.com');
    expect(customRan).toBe(true);
  });

  it('dispose() cleans up mock server', () => {
    const { mockServer, dispose } = setupWebBridge({
      mock: { handlers: [] },
    });
    expect(mockServer!.isActive).toBe(true);
    dispose();
    expect(mockServer!.isActive).toBe(false);
  });
});
