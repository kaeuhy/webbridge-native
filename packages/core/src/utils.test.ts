import { createRequest, createResponse, generateRequestId } from './utils';

describe('generateRequestId', () => {
  it('returns a unique string each time', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(id1).not.toBe(id2);
  });

  it('starts with "wb-" prefix', () => {
    const id = generateRequestId();
    expect(id).toMatch(/^wb-/);
  });
});

describe('createRequest', () => {
  it('creates a GET request by default', () => {
    const req = createRequest('https://api.example.com/users');
    expect(req.url).toBe('https://api.example.com/users');
    expect(req.method).toBe('GET');
    expect(req.headers).toEqual({});
    expect(req.body).toBeNull();
    expect(req.credentials).toBe('same-origin');
    expect(req.redirect).toBe('follow');
    expect(req.id).toMatch(/^wb-/);
  });

  it('applies init options', () => {
    const req = createRequest('https://api.example.com/users', {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Alice"}',
      credentials: 'include',
      redirect: 'manual',
    });
    expect(req.method).toBe('POST');
    expect(req.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(req.body).toBe('{"name":"Alice"}');
    expect(req.credentials).toBe('include');
    expect(req.redirect).toBe('manual');
  });

  it('uppercases method', () => {
    const req = createRequest('https://example.com', { method: 'delete' });
    expect(req.method).toBe('DELETE');
  });

  it('does not share headers reference with init', () => {
    const headers = { 'X-Custom': 'value' };
    const req = createRequest('https://example.com', { headers });
    headers['X-Custom'] = 'modified';
    expect(req.headers['X-Custom']).toBe('value');
  });
});

describe('createResponse', () => {
  it('creates a 200 OK response by default', () => {
    const res = createResponse({});
    expect(res.status).toBe(200);
    expect(res.statusText).toBe('OK');
    expect(res.ok).toBe(true);
    expect(res.redirected).toBe(false);
    expect(res.type).toBe('basic');
    expect(res.headers).toEqual({});
    expect(res.body).toBeNull();
    expect(res.url).toBe('');
  });

  it('applies status and derives statusText', () => {
    const res = createResponse({ status: 404 });
    expect(res.status).toBe(404);
    expect(res.statusText).toBe('Not Found');
    expect(res.ok).toBe(false);
  });

  it('allows custom statusText override', () => {
    const res = createResponse({ status: 200, statusText: 'Custom' });
    expect(res.statusText).toBe('Custom');
  });

  it('handles unknown status codes', () => {
    const res = createResponse({ status: 418 });
    expect(res.status).toBe(418);
    expect(res.statusText).toBe('');
    expect(res.ok).toBe(false);
  });

  it('sets ok correctly for 2xx range', () => {
    expect(createResponse({ status: 200 }).ok).toBe(true);
    expect(createResponse({ status: 201 }).ok).toBe(true);
    expect(createResponse({ status: 299 }).ok).toBe(true);
    expect(createResponse({ status: 199 }).ok).toBe(false);
    expect(createResponse({ status: 300 }).ok).toBe(false);
  });

  it('applies body and headers', () => {
    const res = createResponse({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: '{"ok":true}',
      url: 'https://api.example.com',
    });
    expect(res.body).toBe('{"ok":true}');
    expect(res.headers['Content-Type']).toBe('application/json');
    expect(res.url).toBe('https://api.example.com');
  });

  it('does not share headers reference with init', () => {
    const headers = { 'X-Custom': 'value' };
    const res = createResponse({ headers });
    headers['X-Custom'] = 'modified';
    expect(res.headers['X-Custom']).toBe('value');
  });

  it('throws RangeError for negative status', () => {
    expect(() => createResponse({ status: -1 })).toThrow(RangeError);
    expect(() => createResponse({ status: -1 })).toThrow('Invalid HTTP status code: -1');
  });

  it('throws RangeError for NaN status', () => {
    expect(() => createResponse({ status: NaN })).toThrow(RangeError);
  });

  it('throws RangeError for status > 999', () => {
    expect(() => createResponse({ status: 1000 })).toThrow(RangeError);
  });

  it('accepts status 0 for error responses', () => {
    const res = createResponse({ status: 0, type: 'error' });
    expect(res.status).toBe(0);
    expect(res.type).toBe('error');
  });
});
