import { parseSetCookie } from './parser';

const BASE_URL = 'https://api.example.com/path/to/resource';

describe('parseSetCookie', () => {
  it('parses basic name=value', () => {
    const c = parseSetCookie('session=abc123', BASE_URL);
    expect(c).not.toBeNull();
    expect(c!.name).toBe('session');
    expect(c!.value).toBe('abc123');
  });

  it('defaults domain to request hostname', () => {
    const c = parseSetCookie('x=1', BASE_URL);
    expect(c!.domain).toBe('api.example.com');
  });

  it('defaults path using RFC 6265 default-path', () => {
    const c = parseSetCookie('x=1', BASE_URL);
    expect(c!.path).toBe('/path/to');
  });

  it('parses Domain attribute (strips leading dot)', () => {
    const c = parseSetCookie('x=1; Domain=.example.com', BASE_URL);
    expect(c!.domain).toBe('example.com');
  });

  it('parses Path attribute', () => {
    const c = parseSetCookie('x=1; Path=/', BASE_URL);
    expect(c!.path).toBe('/');
  });

  it('parses Secure flag', () => {
    const c = parseSetCookie('x=1; Secure', BASE_URL);
    expect(c!.secure).toBe(true);
  });

  it('parses HttpOnly flag', () => {
    const c = parseSetCookie('x=1; HttpOnly', BASE_URL);
    expect(c!.httpOnly).toBe(true);
  });

  it('parses SameSite=Strict', () => {
    const c = parseSetCookie('x=1; SameSite=Strict', BASE_URL);
    expect(c!.sameSite).toBe('strict');
  });

  it('parses SameSite=Lax', () => {
    const c = parseSetCookie('x=1; SameSite=Lax', BASE_URL);
    expect(c!.sameSite).toBe('lax');
  });

  it('parses SameSite=None (forces Secure)', () => {
    const c = parseSetCookie('x=1; SameSite=None', BASE_URL);
    expect(c!.sameSite).toBe('none');
    expect(c!.secure).toBe(true);
  });

  it('defaults SameSite to lax', () => {
    const c = parseSetCookie('x=1', BASE_URL);
    expect(c!.sameSite).toBe('lax');
  });

  it('parses Expires attribute', () => {
    const c = parseSetCookie(
      'x=1; Expires=Wed, 09 Jun 2030 10:18:14 GMT',
      BASE_URL,
    );
    expect(c!.expires).toBeDefined();
    expect(c!.expires!).toBeGreaterThan(Date.now());
  });

  it('parses Max-Age attribute', () => {
    const before = Date.now();
    const c = parseSetCookie('x=1; Max-Age=3600', BASE_URL);
    expect(c!.expires).toBeDefined();
    expect(c!.expires!).toBeGreaterThanOrEqual(before + 3600 * 1000);
  });

  it('Max-Age takes precedence over Expires', () => {
    const c = parseSetCookie(
      'x=1; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=3600',
      BASE_URL,
    );
    expect(c!.expires!).toBeGreaterThan(Date.now());
  });

  it('Max-Age=0 sets immediate expiry', () => {
    const c = parseSetCookie('x=1; Max-Age=0', BASE_URL);
    expect(c!.expires).toBe(0);
  });

  it('returns null for empty name', () => {
    expect(parseSetCookie('=value', BASE_URL)).toBeNull();
  });

  it('returns null for no equals sign', () => {
    expect(parseSetCookie('invalid', BASE_URL)).toBeNull();
  });

  it('returns null for invalid URL', () => {
    expect(parseSetCookie('x=1', 'not-a-url')).toBeNull();
  });

  it('parses complex real-world Set-Cookie', () => {
    const header =
      'id=a3fWa; Expires=Wed, 21 Oct 2030 07:28:00 GMT; Secure; HttpOnly; SameSite=Strict; Path=/; Domain=example.com';
    const c = parseSetCookie(header, 'https://www.example.com/login');
    expect(c!.name).toBe('id');
    expect(c!.value).toBe('a3fWa');
    expect(c!.domain).toBe('example.com');
    expect(c!.path).toBe('/');
    expect(c!.secure).toBe(true);
    expect(c!.httpOnly).toBe(true);
    expect(c!.sameSite).toBe('strict');
  });

  it('handles value with equals sign', () => {
    const c = parseSetCookie('token=abc=def==', BASE_URL);
    expect(c!.name).toBe('token');
    expect(c!.value).toBe('abc=def==');
  });
});
