import { serializeRequest, deserializeResponse } from './serialization';
import { createRequest } from '@webbridge-native/core';

describe('serializeRequest', () => {
  it('serializes a GET request', () => {
    const req = createRequest('https://api.example.com/users');
    const json = serializeRequest(req);
    const parsed = JSON.parse(json);

    expect(parsed.url).toBe('https://api.example.com/users');
    expect(parsed.method).toBe('GET');
    expect(parsed.id).toMatch(/^wb-/);
    expect(parsed.body).toBeNull();
    expect(parsed.headers).toEqual({});
  });

  it('serializes a POST request with body', () => {
    const req = createRequest('https://api.example.com/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Alice"}',
    });
    const json = serializeRequest(req);
    const parsed = JSON.parse(json);

    expect(parsed.method).toBe('POST');
    expect(parsed.body).toBe('{"name":"Alice"}');
    expect(parsed.headers['Content-Type']).toBe('application/json');
  });

  it('encodes ArrayBuffer body as base64', () => {
    const req = createRequest('https://example.com');
    const buffer = new ArrayBuffer(4);
    new Uint8Array(buffer).set([1, 2, 3, 4]);
    (req as { body: ArrayBuffer }).body = buffer;
    const json = serializeRequest(req);
    const parsed = JSON.parse(json);
    expect(parsed.body).toBe(btoa(String.fromCharCode(1, 2, 3, 4)));
    expect(parsed.bodyEncoding).toBe('base64');
  });

  it('sets bodyEncoding to utf8 for string body', () => {
    const req = createRequest('https://example.com', { body: 'hello' });
    const json = serializeRequest(req);
    const parsed = JSON.parse(json);
    expect(parsed.bodyEncoding).toBe('utf8');
  });
});

describe('deserializeResponse', () => {
  it('deserializes a 200 response', () => {
    const json = JSON.stringify({
      url: 'https://api.example.com/users',
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
      body: '[]',
    });
    const res = deserializeResponse(json, 'https://api.example.com/users');

    expect(res.status).toBe(200);
    expect(res.statusText).toBe('OK');
    expect(res.ok).toBe(true);
    expect(res.body).toBe('[]');
    expect(res.headers['Content-Type']).toBe('application/json');
    expect(res.type).toBe('basic');
    expect(res.redirected).toBe(false);
  });

  it('deserializes a 404 response', () => {
    const json = JSON.stringify({
      status: 404,
      statusText: 'Not Found',
      headers: {},
      body: null,
    });
    const res = deserializeResponse(json, 'https://example.com');

    expect(res.status).toBe(404);
    expect(res.ok).toBe(false);
    expect(res.body).toBeNull();
  });

  it('uses requestUrl as fallback when url missing', () => {
    const json = JSON.stringify({
      status: 200,
      statusText: 'OK',
      headers: {},
      body: null,
    });
    const res = deserializeResponse(json, 'https://fallback.com');
    expect(res.url).toBe('https://fallback.com');
  });
});
