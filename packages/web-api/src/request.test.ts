import type { WebBridgeRequest } from '@webbridge-native/core';
import { WBRequest } from './request';
import { WBHeaders } from './headers';

describe('WBRequest', () => {
  describe('constructor', () => {
    it('creates with URL string', () => {
      const req = new WBRequest('https://example.com/api');
      expect(req.url).toBe('https://example.com/api');
      expect(req.method).toBe('GET');
      expect(req.credentials).toBe('same-origin');
      expect(req.redirect).toBe('follow');
    });

    it('creates with init options', () => {
      const req = new WBRequest('https://example.com/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"key":"value"}',
        credentials: 'include',
        redirect: 'manual',
      });
      expect(req.method).toBe('POST');
      expect(req.headers.get('content-type')).toBe('application/json');
      expect(req.body).toBe('{"key":"value"}');
      expect(req.credentials).toBe('include');
      expect(req.redirect).toBe('manual');
    });

    it('normalizes method to uppercase', () => {
      const req = new WBRequest('https://example.com', { method: 'post' });
      expect(req.method).toBe('POST');
    });

    it('creates from another WBRequest', () => {
      const original = new WBRequest('https://example.com', {
        method: 'POST',
        headers: { 'x-custom': 'value' },
        body: 'data',
      });
      const copy = new WBRequest(original);
      expect(copy.url).toBe('https://example.com');
      expect(copy.method).toBe('POST');
      expect(copy.headers.get('x-custom')).toBe('value');
      expect(copy.body).toBe('data');
    });

    it('throws for empty URL', () => {
      expect(() => new WBRequest('')).toThrow(TypeError);
    });
  });

  describe('clone()', () => {
    it('creates independent copy', async () => {
      const req = new WBRequest('https://example.com', {
        method: 'POST',
        body: '{"a":1}',
        headers: { 'content-type': 'application/json' },
      });
      const cloned = req.clone();
      // Consume original
      await req.text();
      expect(req.bodyUsed).toBe(true);
      // Clone is independent
      expect(cloned.bodyUsed).toBe(false);
      const text = await cloned.text();
      expect(text).toBe('{"a":1}');
    });
  });

  describe('body consumption', () => {
    it('json() parses body', async () => {
      const req = new WBRequest('https://example.com', {
        method: 'POST',
        body: '{"key":"value"}',
      });
      const data = await req.json();
      expect(data).toEqual({ key: 'value' });
      expect(req.bodyUsed).toBe(true);
    });

    it('prevents double consumption', async () => {
      const req = new WBRequest('https://example.com', {
        method: 'POST',
        body: 'data',
      });
      await req.text();
      await expect(req.json()).rejects.toThrow('Body has already been consumed');
    });
  });

  describe('fromWebBridge/toWebBridge', () => {
    it('roundtrips correctly', () => {
      const wbReq: WebBridgeRequest = {
        url: 'https://example.com/api/data',
        method: 'PUT',
        headers: { 'content-type': 'application/json', authorization: 'Bearer token123' },
        body: '{"update":true}',
        credentials: 'include',
        redirect: 'follow',
        id: 'req-123',
      };

      const req = WBRequest.fromWebBridge(wbReq);
      expect(req.url).toBe('https://example.com/api/data');
      expect(req.method).toBe('PUT');
      expect(req.headers.get('content-type')).toBe('application/json');
      expect(req.headers.get('authorization')).toBe('Bearer token123');
      expect(req.body).toBe('{"update":true}');
      expect(req.credentials).toBe('include');

      const back = req.toWebBridge();
      expect(back.url).toBe(wbReq.url);
      expect(back.method).toBe(wbReq.method);
      expect(back.headers['content-type']).toBe('application/json');
      expect(back.headers['authorization']).toBe('Bearer token123');
      expect(back.body).toBe(wbReq.body);
      expect(back.credentials).toBe(wbReq.credentials);
      expect(back.id).toBeDefined();
    });
  });
});
