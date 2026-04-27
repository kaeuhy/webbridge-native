import { CookieJar } from './jar';

describe('CookieJar', () => {
  let jar: CookieJar;

  beforeEach(() => {
    jar = new CookieJar();
  });

  describe('setCookie + getCookieHeader', () => {
    it('stores and retrieves a simple cookie', async () => {
      await jar.setCookie('session=abc', 'https://example.com/');
      const header = await jar.getCookieHeader('https://example.com/');
      expect(header).toBe('session=abc');
    });

    it('stores multiple cookies for same domain', async () => {
      await jar.setCookie('a=1', 'https://example.com/');
      await jar.setCookie('b=2', 'https://example.com/');
      const header = await jar.getCookieHeader('https://example.com/');
      expect(header).toContain('a=1');
      expect(header).toContain('b=2');
    });

    it('overwrites cookie with same name+domain+path', async () => {
      await jar.setCookie('a=1; Path=/', 'https://example.com/');
      await jar.setCookie('a=2; Path=/', 'https://example.com/');
      const header = await jar.getCookieHeader('https://example.com/');
      expect(header).toBe('a=2');
      expect(jar.size).toBe(1);
    });

    it('returns empty string for no matching cookies', async () => {
      await jar.setCookie('a=1', 'https://example.com/');
      const header = await jar.getCookieHeader('https://other.com/');
      expect(header).toBe('');
    });

    it('sends cookies to subdomain', async () => {
      await jar.setCookie('a=1; Domain=example.com', 'https://example.com/');
      const header = await jar.getCookieHeader('https://api.example.com/');
      expect(header).toBe('a=1');
    });

    it('does not send expired cookies', async () => {
      await jar.setCookie('a=1; Max-Age=0', 'https://example.com/');
      const header = await jar.getCookieHeader('https://example.com/');
      expect(header).toBe('');
    });

    it('does not send secure cookies over http', async () => {
      await jar.setCookie('a=1; Secure', 'https://example.com/');
      const header = await jar.getCookieHeader('http://example.com/');
      expect(header).toBe('');
    });

    it('respects path matching', async () => {
      await jar.setCookie('a=1; Path=/api', 'https://example.com/api/users');
      expect(await jar.getCookieHeader('https://example.com/api/users')).toBe('a=1');
      expect(await jar.getCookieHeader('https://example.com/other')).toBe('');
    });
  });

  describe('getCookies', () => {
    it('sorts by path length (longest first)', async () => {
      await jar.setCookie('a=1; Path=/', 'https://example.com/');
      await jar.setCookie('b=2; Path=/api', 'https://example.com/api');
      await jar.setCookie('c=3; Path=/api/v2', 'https://example.com/api/v2');
      const cookies = await jar.getCookies('https://example.com/api/v2/users');
      expect(cookies.map((c) => c.name)).toEqual(['c', 'b', 'a']);
    });

    it('sorts by creation time for same path length', async () => {
      await jar.setCookie('first=1; Path=/', 'https://example.com/');
      await jar.setCookie('second=2; Path=/', 'https://example.com/');
      const cookies = await jar.getCookies('https://example.com/');
      expect(cookies[0].name).toBe('first');
      expect(cookies[1].name).toBe('second');
    });
  });

  describe('clear', () => {
    it('clears all cookies', async () => {
      await jar.setCookie('a=1', 'https://example.com/');
      await jar.setCookie('b=2', 'https://other.com/');
      await jar.clear();
      expect(jar.size).toBe(0);
    });

    it('clears cookies for a specific domain', async () => {
      await jar.setCookie('a=1', 'https://example.com/');
      await jar.setCookie('b=2', 'https://other.com/');
      await jar.clear('example.com');
      expect(jar.size).toBe(1);
      expect(await jar.getCookieHeader('https://other.com/')).toBe('b=2');
    });
  });

  describe('removeExpired', () => {
    it('removes expired cookies', async () => {
      await jar.setCookie(
        'a=1; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'https://example.com/',
      );
      await jar.setCookie('b=2', 'https://example.com/');
      await jar.removeExpired();
      expect(jar.size).toBe(1);
    });
  });

  describe('domain limit', () => {
    it('enforces 50 cookies per domain limit', async () => {
      for (let i = 0; i < 60; i++) {
        await jar.setCookie(`c${i}=v${i}; Path=/`, 'https://example.com/');
      }
      expect(jar.size).toBe(50);
    });
  });
});
