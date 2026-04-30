import type { WebBridgeResponse } from '@webbridge-native/core';
import { WBResponse } from './response';
import { WBHeaders } from './headers';

describe('WBResponse', () => {
  describe('constructor', () => {
    it('creates with body and status', () => {
      const res = new WBResponse('hello', { status: 201, statusText: 'Created' });
      expect(res.status).toBe(201);
      expect(res.statusText).toBe('Created');
      expect(res.body).toBe('hello');
    });

    it('defaults to status 200', () => {
      const res = new WBResponse('body');
      expect(res.status).toBe(200);
      expect(res.ok).toBe(true);
    });

    it('sets ok correctly for different status ranges', () => {
      expect(new WBResponse(null, { status: 200 }).ok).toBe(true);
      expect(new WBResponse(null, { status: 299 }).ok).toBe(true);
      expect(new WBResponse(null, { status: 300 }).ok).toBe(false);
      expect(new WBResponse(null, { status: 404 }).ok).toBe(false);
      expect(new WBResponse(null, { status: 500 }).ok).toBe(false);
    });
  });

  describe('json()', () => {
    it('parses body as JSON', async () => {
      const data = { key: 'value', count: 42 };
      const res = new WBResponse(JSON.stringify(data));
      const parsed = await res.json();
      expect(parsed).toEqual(data);
    });
  });

  describe('text()', () => {
    it('returns body as string', async () => {
      const res = new WBResponse('hello world');
      const text = await res.text();
      expect(text).toBe('hello world');
    });

    it('returns empty string for null body', async () => {
      const res = new WBResponse(null);
      const text = await res.text();
      expect(text).toBe('');
    });
  });

  describe('bodyUsed', () => {
    it('prevents double consumption', async () => {
      const res = new WBResponse('hello');
      await res.text();
      expect(res.bodyUsed).toBe(true);
      await expect(res.text()).rejects.toThrow('Body has already been consumed');
    });

    it('is false initially', () => {
      const res = new WBResponse('body');
      expect(res.bodyUsed).toBe(false);
    });
  });

  describe('clone()', () => {
    it('allows re-read after clone', async () => {
      const res = new WBResponse(JSON.stringify({ a: 1 }));
      const cloned = res.clone();
      const text = await res.text();
      expect(text).toBe('{"a":1}');
      // Clone should have independent bodyUsed
      expect(cloned.bodyUsed).toBe(false);
      const data = await cloned.json();
      expect(data).toEqual({ a: 1 });
    });

    it('preserves all properties', () => {
      const res = new WBResponse('body', {
        status: 201,
        statusText: 'Created',
        headers: { 'content-type': 'text/plain' },
      });
      const cloned = res.clone();
      expect(cloned.status).toBe(201);
      expect(cloned.statusText).toBe('Created');
      expect(cloned.headers.get('content-type')).toBe('text/plain');
    });
  });

  describe('fromWebBridge()', () => {
    it('converts WebBridgeResponse correctly', () => {
      const wbRes: WebBridgeResponse = {
        url: 'https://example.com/api',
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: '{"result":true}',
        ok: true,
        redirected: false,
        type: 'basic',
      };
      const res = WBResponse.fromWebBridge(wbRes);
      expect(res.url).toBe('https://example.com/api');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/json');
      expect(res.body).toBe('{"result":true}');
      expect(res.redirected).toBe(false);
      expect(res.type).toBe('basic');
    });
  });

  describe('toWebBridge()', () => {
    it('converts back to WebBridgeResponse', () => {
      const wbRes: WebBridgeResponse = {
        url: 'https://example.com',
        status: 201,
        statusText: 'Created',
        headers: { 'content-type': 'text/plain' },
        body: 'created',
        ok: true,
        redirected: false,
        type: 'cors',
      };
      const res = WBResponse.fromWebBridge(wbRes);
      const back = res.toWebBridge();
      expect(back.url).toBe('https://example.com');
      expect(back.status).toBe(201);
      expect(back.statusText).toBe('Created');
      expect(back.headers['content-type']).toBe('text/plain');
      expect(back.body).toBe('created');
      expect(back.ok).toBe(true);
      expect(back.type).toBe('cors');
    });
  });

  describe('static json()', () => {
    it('creates a JSON response', async () => {
      const data = { message: 'hello' };
      const res = WBResponse.json(data);
      expect(res.headers.get('content-type')).toBe('application/json');
      const parsed = await res.json();
      expect(parsed).toEqual(data);
    });

    it('allows custom status', async () => {
      const res = WBResponse.json({ error: 'not found' }, { status: 404 });
      expect(res.status).toBe(404);
      expect(res.ok).toBe(false);
    });
  });

  describe('static error()', () => {
    it('creates an error response', () => {
      const res = WBResponse.error();
      expect(res.type).toBe('error');
      expect(res.status).toBe(0);
      expect(res.ok).toBe(false);
    });
  });

  describe('static redirect()', () => {
    it('creates a redirect response', () => {
      const res = WBResponse.redirect('https://example.com/new', 301);
      expect(res.status).toBe(301);
      expect(res.headers.get('location')).toBe('https://example.com/new');
      expect(res.redirected).toBe(true);
    });

    it('throws for invalid redirect status', () => {
      expect(() => WBResponse.redirect('https://example.com', 200)).toThrow(RangeError);
    });
  });

  describe('arrayBuffer()', () => {
    it('returns body as ArrayBuffer', async () => {
      const res = new WBResponse('hello');
      const buf = await res.arrayBuffer();
      expect(buf).toBeInstanceOf(ArrayBuffer);
      const text = new TextDecoder().decode(buf);
      expect(text).toBe('hello');
    });
  });
});
