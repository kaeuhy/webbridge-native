import {
  serializeRequest,
  deserializeRequest,
  serializeResponse,
  deserializeResponse,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from '../serialization';
import type { WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';

describe('serialization', () => {
  describe('arrayBufferToBase64 / base64ToArrayBuffer', () => {
    it('should round-trip empty buffer', () => {
      const buf = new ArrayBuffer(0);
      const b64 = arrayBufferToBase64(buf);
      const result = base64ToArrayBuffer(b64);
      expect(result.byteLength).toBe(0);
    });

    it('should round-trip binary data', () => {
      const original = new Uint8Array([0, 1, 127, 128, 255]);
      const b64 = arrayBufferToBase64(original.buffer);
      const result = new Uint8Array(base64ToArrayBuffer(b64));
      expect(result).toEqual(original);
    });

    it('should round-trip text as buffer', () => {
      const text = 'Hello, WebBridge!';
      const encoder = new TextEncoder();
      const buf = encoder.encode(text).buffer;
      const b64 = arrayBufferToBase64(buf);
      const result = base64ToArrayBuffer(b64);
      const decoded = new TextDecoder().decode(result);
      expect(decoded).toBe(text);
    });
  });

  describe('serializeRequest / deserializeRequest', () => {
    it('should serialize and deserialize text body request', () => {
      const request: WebBridgeRequest = {
        id: 'wb-123',
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name":"Alice"}',
      };

      const payload = serializeRequest(request);
      expect(payload.requestId).toBe('wb-123');
      expect(payload.url).toBe('https://api.example.com/users');
      expect(payload.method).toBe('POST');
      expect(payload.bodyEncoding).toBe('text');
      expect(payload.body).toBe('{"name":"Alice"}');
      expect(JSON.parse(payload.headers)).toEqual({
        'Content-Type': 'application/json',
      });

      const restored = deserializeRequest(payload);
      expect(restored.id).toBe('wb-123');
      expect(restored.url).toBe(request.url);
      expect(restored.method).toBe(request.method);
      expect(restored.body).toBe('{"name":"Alice"}');
      expect(restored.headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('should serialize and deserialize ArrayBuffer body', () => {
      const bodyBytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const request: WebBridgeRequest = {
        id: 'wb-456',
        url: 'https://api.example.com/upload',
        method: 'PUT',
        headers: {},
        body: bodyBytes.buffer,
      };

      const payload = serializeRequest(request);
      expect(payload.bodyEncoding).toBe('base64');
      expect(typeof payload.body).toBe('string');

      const restored = deserializeRequest(payload);
      expect(restored.body).toBeInstanceOf(ArrayBuffer);
      const decoded = new Uint8Array(restored.body as ArrayBuffer);
      expect(decoded).toEqual(bodyBytes);
    });

    it('should handle null body', () => {
      const request: WebBridgeRequest = {
        id: 'wb-789',
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: {},
        body: null,
      };

      const payload = serializeRequest(request);
      expect(payload.body).toBeNull();

      const restored = deserializeRequest(payload);
      expect(restored.body).toBeNull();
    });
  });

  describe('serializeResponse / deserializeResponse', () => {
    it('should serialize and deserialize JSON response', () => {
      const response: WebBridgeResponse = {
        url: 'https://api.example.com/users',
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        body: '{"id":1,"name":"Alice"}',
        ok: true,
        redirected: false,
        type: 'basic',
      };

      const json = serializeResponse(response);
      const parsed = JSON.parse(json);
      expect(parsed.status).toBe(200);
      expect(parsed.statusText).toBe('OK');
      expect(parsed.bodyEncoding).toBe('text');
      expect(parsed.body).toBe('{"id":1,"name":"Alice"}');

      const restored = deserializeResponse(json, 'https://api.example.com/users');
      expect(restored.status).toBe(200);
      expect(restored.ok).toBe(true);
      expect(restored.body).toBe('{"id":1,"name":"Alice"}');
      expect(restored.headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('should serialize response with rawHeaders', () => {
      const response: WebBridgeResponse = {
        url: 'https://api.example.com/login',
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        rawHeaders: {
          'set-cookie': ['session=abc; Path=/', 'lang=en; Path=/'],
        },
        body: '{}',
        ok: true,
        redirected: false,
        type: 'basic',
      };

      const json = serializeResponse(response);
      const restored = deserializeResponse(json, response.url);
      expect(restored.rawHeaders).toEqual({
        'set-cookie': ['session=abc; Path=/', 'lang=en; Path=/'],
      });
    });

    it('should handle error status', () => {
      const response: WebBridgeResponse = {
        url: 'https://api.example.com/fail',
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        body: 'server error',
        ok: false,
        redirected: false,
        type: 'basic',
      };

      const json = serializeResponse(response);
      const restored = deserializeResponse(json, response.url);
      expect(restored.status).toBe(500);
      expect(restored.ok).toBe(false);
    });

    it('should handle null body response', () => {
      const response: WebBridgeResponse = {
        url: 'https://api.example.com/empty',
        status: 204,
        statusText: 'No Content',
        headers: {},
        body: null,
        ok: true,
        redirected: false,
        type: 'basic',
      };

      const json = serializeResponse(response);
      const restored = deserializeResponse(json, response.url);
      expect(restored.status).toBe(204);
      expect(restored.body).toBeNull();
    });

    it('should handle ArrayBuffer body in response', () => {
      const bodyBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const response: WebBridgeResponse = {
        url: 'https://api.example.com/binary',
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: bodyBytes.buffer,
        ok: true,
        redirected: false,
        type: 'basic',
      };

      const json = serializeResponse(response);
      const restored = deserializeResponse(json, response.url);
      const decoded = new Uint8Array(restored.body as ArrayBuffer);
      expect(decoded).toEqual(bodyBytes);
    });
  });
});
