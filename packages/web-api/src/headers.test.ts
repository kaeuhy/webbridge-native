import { WBHeaders } from './headers';

describe('WBHeaders', () => {
  describe('constructor', () => {
    it('creates from Record', () => {
      const headers = new WBHeaders({ 'Content-Type': 'text/plain', Accept: 'application/json' });
      expect(headers.get('content-type')).toBe('text/plain');
      expect(headers.get('accept')).toBe('application/json');
    });

    it('creates from entries array', () => {
      const headers = new WBHeaders([
        ['Content-Type', 'text/plain'],
        ['Accept', 'application/json'],
      ]);
      expect(headers.get('content-type')).toBe('text/plain');
      expect(headers.get('accept')).toBe('application/json');
    });

    it('creates from another WBHeaders instance', () => {
      const original = new WBHeaders({ 'Content-Type': 'text/plain' });
      const copy = new WBHeaders(original);
      expect(copy.get('content-type')).toBe('text/plain');
      // Mutation of copy should not affect original
      copy.set('content-type', 'text/html');
      expect(original.get('content-type')).toBe('text/plain');
    });

    it('creates empty headers with no argument', () => {
      const headers = new WBHeaders();
      expect([...headers.entries()]).toEqual([]);
    });
  });

  describe('get()', () => {
    it('is case-insensitive', () => {
      const headers = new WBHeaders({ 'Content-Type': 'text/plain' });
      expect(headers.get('content-type')).toBe('text/plain');
      expect(headers.get('CONTENT-TYPE')).toBe('text/plain');
      expect(headers.get('Content-Type')).toBe('text/plain');
    });

    it('returns null for missing headers', () => {
      const headers = new WBHeaders();
      expect(headers.get('x-missing')).toBeNull();
    });
  });

  describe('set()', () => {
    it('overwrites existing value', () => {
      const headers = new WBHeaders({ 'Content-Type': 'text/plain' });
      headers.set('Content-Type', 'text/html');
      expect(headers.get('content-type')).toBe('text/html');
    });
  });

  describe('append()', () => {
    it('joins values with ", " for same name', () => {
      const headers = new WBHeaders();
      headers.append('Accept', 'text/html');
      headers.append('Accept', 'application/json');
      expect(headers.get('accept')).toBe('text/html, application/json');
    });

    it('creates new header if not present', () => {
      const headers = new WBHeaders();
      headers.append('X-Custom', 'value');
      expect(headers.get('x-custom')).toBe('value');
    });
  });

  describe('has()', () => {
    it('is case-insensitive', () => {
      const headers = new WBHeaders({ 'Content-Type': 'text/plain' });
      expect(headers.has('content-type')).toBe(true);
      expect(headers.has('CONTENT-TYPE')).toBe(true);
      expect(headers.has('x-missing')).toBe(false);
    });
  });

  describe('delete()', () => {
    it('is case-insensitive', () => {
      const headers = new WBHeaders({ 'Content-Type': 'text/plain' });
      headers.delete('CONTENT-TYPE');
      expect(headers.has('content-type')).toBe(false);
    });
  });

  describe('iteration', () => {
    it('forEach iterates all entries', () => {
      const headers = new WBHeaders({ 'B-Header': 'b', 'A-Header': 'a' });
      const collected: [string, string][] = [];
      headers.forEach((value, key) => {
        collected.push([key, value]);
      });
      expect(collected).toEqual([
        ['a-header', 'a'],
        ['b-header', 'b'],
      ]);
    });

    it('entries() returns sorted alphabetically', () => {
      const headers = new WBHeaders({ 'Z-Header': 'z', 'A-Header': 'a', 'M-Header': 'm' });
      const entries = [...headers.entries()];
      expect(entries).toEqual([
        ['a-header', 'a'],
        ['m-header', 'm'],
        ['z-header', 'z'],
      ]);
    });

    it('keys() and values() iterate in sorted order', () => {
      const headers = new WBHeaders({ 'B-Header': 'b', 'A-Header': 'a' });
      expect([...headers.keys()]).toEqual(['a-header', 'b-header']);
      expect([...headers.values()]).toEqual(['a', 'b']);
    });

    it('Symbol.iterator works with for-of', () => {
      const headers = new WBHeaders({ 'X-Foo': 'bar' });
      const result: [string, string][] = [];
      for (const entry of headers) {
        result.push(entry);
      }
      expect(result).toEqual([['x-foo', 'bar']]);
    });
  });

  describe('toRecord()', () => {
    it('roundtrips correctly', () => {
      const original = { 'content-type': 'text/plain', accept: 'application/json' };
      const headers = new WBHeaders(original);
      const record = headers.toRecord();
      expect(record).toEqual(original);
    });
  });

  describe('fromRecord()', () => {
    it('creates WBHeaders from record', () => {
      const headers = WBHeaders.fromRecord({ 'content-type': 'text/html' });
      expect(headers.get('content-type')).toBe('text/html');
    });
  });

  describe('validation', () => {
    it('throws on invalid header name', () => {
      const headers = new WBHeaders();
      expect(() => headers.set('invalid header', 'value')).toThrow(TypeError);
      expect(() => headers.set('', 'value')).toThrow(TypeError);
    });

    it('throws on invalid header value', () => {
      const headers = new WBHeaders();
      expect(() => headers.set('x-test', 'value\x00')).toThrow(TypeError);
    });
  });
});
