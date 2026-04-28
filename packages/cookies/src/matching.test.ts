import { domainMatch, pathMatch, shouldSendCookie } from './matching';
import type { Cookie } from './cookie';

describe('domainMatch', () => {
  it('exact match', () => {
    expect(domainMatch('example.com', 'example.com')).toBe(true);
  });

  it('subdomain match', () => {
    expect(domainMatch('example.com', 'api.example.com')).toBe(true);
  });

  it('deep subdomain match', () => {
    expect(domainMatch('example.com', 'a.b.example.com')).toBe(true);
  });

  it('no match for different domain', () => {
    expect(domainMatch('example.com', 'other.com')).toBe(false);
  });

  it('no match for partial domain', () => {
    expect(domainMatch('example.com', 'notexample.com')).toBe(false);
  });

  it('case insensitive', () => {
    expect(domainMatch('Example.COM', 'api.example.com')).toBe(true);
  });
});

describe('pathMatch', () => {
  it('exact match', () => {
    expect(pathMatch('/', '/')).toBe(true);
    expect(pathMatch('/path', '/path')).toBe(true);
  });

  it('prefix match with slash', () => {
    expect(pathMatch('/path', '/path/to')).toBe(true);
    expect(pathMatch('/', '/anything')).toBe(true);
  });

  it('no match for different path', () => {
    expect(pathMatch('/path', '/other')).toBe(false);
  });

  it('no match for partial path prefix', () => {
    expect(pathMatch('/path', '/pathological')).toBe(false);
  });

  it('trailing slash on cookie path', () => {
    expect(pathMatch('/path/', '/path/to')).toBe(true);
  });
});

describe('shouldSendCookie', () => {
  const baseCookie: Cookie = {
    name: 'test',
    value: '1',
    domain: 'example.com',
    path: '/',
    secure: false,
    httpOnly: false,
    sameSite: 'lax',
    creationTime: Date.now(),
    lastAccessTime: Date.now(),
  };

  it('sends matching cookie', () => {
    expect(
      shouldSendCookie(baseCookie, 'https://example.com/page'),
    ).toBe(true);
  });

  it('sends to subdomain', () => {
    expect(
      shouldSendCookie(baseCookie, 'https://api.example.com/page'),
    ).toBe(true);
  });

  it('rejects expired cookie', () => {
    const expired = { ...baseCookie, expires: Date.now() - 1000 };
    expect(shouldSendCookie(expired, 'https://example.com/')).toBe(false);
  });

  it('rejects domain mismatch', () => {
    expect(shouldSendCookie(baseCookie, 'https://other.com/')).toBe(false);
  });

  it('rejects path mismatch', () => {
    const pathCookie = { ...baseCookie, path: '/api' };
    expect(shouldSendCookie(pathCookie, 'https://example.com/other')).toBe(false);
  });

  it('rejects secure cookie on http', () => {
    const secureCookie = { ...baseCookie, secure: true };
    expect(shouldSendCookie(secureCookie, 'http://example.com/')).toBe(false);
  });

  it('allows secure cookie on https', () => {
    const secureCookie = { ...baseCookie, secure: true };
    expect(shouldSendCookie(secureCookie, 'https://example.com/')).toBe(true);
  });

  it('allows session cookie (no expires)', () => {
    expect(shouldSendCookie(baseCookie, 'https://example.com/')).toBe(true);
  });

  it('rejects invalid URL', () => {
    expect(shouldSendCookie(baseCookie, 'not-a-url')).toBe(false);
  });
});
