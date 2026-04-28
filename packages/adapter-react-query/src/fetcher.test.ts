import { createFetcher, FetchError } from './fetcher';
import { WebBridgeClient, createResponse } from '@webbridge-native/core';
import type { Interceptor } from '@webbridge-native/core';

function createTestClient(body: string, status = 200, headers: Record<string, string> = {}): WebBridgeClient {
  const terminal: Interceptor = async (req) =>
    createResponse({ status, body, url: req.url, headers });
  const client = new WebBridgeClient();
  client.use(terminal);
  return client;
}

describe('createFetcher', () => {
  describe('json()', () => {
    it('fetches and parses JSON', async () => {
      const client = createTestClient('{"id":1}');
      const fetcher = createFetcher(client);
      const data = await fetcher.json<{ id: number }>('https://api.example.com/users/1');
      expect(data).toEqual({ id: 1 });
    });

    it('throws FetchError on non-2xx', async () => {
      const client = createTestClient('Not found', 404);
      const fetcher = createFetcher(client);
      await expect(fetcher.json('https://example.com/missing')).rejects.toThrow(FetchError);
      try {
        await fetcher.json('https://example.com/missing');
      } catch (e) {
        expect((e as FetchError).status).toBe(404);
      }
    });
  });

  describe('text()', () => {
    it('fetches and returns text', async () => {
      const client = createTestClient('hello world');
      const fetcher = createFetcher(client);
      const text = await fetcher.text('https://example.com/data');
      expect(text).toBe('hello world');
    });
  });

  describe('raw()', () => {
    it('returns WebBridgeResponse', async () => {
      const client = createTestClient('raw body');
      const fetcher = createFetcher(client);
      const res = await fetcher.raw('https://example.com/data');
      expect(res.status).toBe(200);
      expect(res.body).toBe('raw body');
    });
  });

  describe('baseURL', () => {
    it('prepends baseURL to relative paths', async () => {
      let capturedUrl = '';
      const terminal: Interceptor = async (req) => {
        capturedUrl = req.url;
        return createResponse({ status: 200, body: '{}' });
      };
      const client = new WebBridgeClient();
      client.use(terminal);

      const fetcher = createFetcher(client, { baseURL: 'https://api.example.com' });
      await fetcher.json('/users');
      expect(capturedUrl).toBe('https://api.example.com/users');
    });

    it('ignores baseURL for absolute URLs', async () => {
      let capturedUrl = '';
      const terminal: Interceptor = async (req) => {
        capturedUrl = req.url;
        return createResponse({ status: 200, body: '{}' });
      };
      const client = new WebBridgeClient();
      client.use(terminal);

      const fetcher = createFetcher(client, { baseURL: 'https://other.com' });
      await fetcher.json('https://api.example.com/data');
      expect(capturedUrl).toBe('https://api.example.com/data');
    });
  });

  describe('defaultHeaders', () => {
    it('merges default headers', async () => {
      let capturedHeaders: Record<string, string> = {};
      const terminal: Interceptor = async (req) => {
        capturedHeaders = req.headers;
        return createResponse({ status: 200, body: '{}' });
      };
      const client = new WebBridgeClient();
      client.use(terminal);

      const fetcher = createFetcher(client, {
        defaultHeaders: { Authorization: 'Bearer token' },
      });
      await fetcher.json('https://example.com');
      expect(capturedHeaders['Authorization']).toBe('Bearer token');
    });

    it('request headers override defaults', async () => {
      let capturedHeaders: Record<string, string> = {};
      const terminal: Interceptor = async (req) => {
        capturedHeaders = req.headers;
        return createResponse({ status: 200, body: '{}' });
      };
      const client = new WebBridgeClient();
      client.use(terminal);

      const fetcher = createFetcher(client, {
        defaultHeaders: { Authorization: 'Bearer default' },
      });
      await fetcher.json('https://example.com', {
        headers: { Authorization: 'Bearer override' },
      });
      expect(capturedHeaders['Authorization']).toBe('Bearer override');
    });
  });
});

describe('FetchError', () => {
  it('has status and response', () => {
    const res = createResponse({ status: 500, statusText: 'Internal Server Error' });
    const err = new FetchError(500, 'Internal Server Error', res);
    expect(err.status).toBe(500);
    expect(err.message).toBe('HTTP 500: Internal Server Error');
    expect(err.response).toBe(res);
    expect(err.name).toBe('FetchError');
  });
});
