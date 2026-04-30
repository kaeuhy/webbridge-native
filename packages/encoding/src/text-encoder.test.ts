import { WBTextEncoder } from './text-encoder';

describe('WBTextEncoder', () => {
  const encoder = new WBTextEncoder();

  it('should report encoding as utf-8', () => {
    expect(encoder.encoding).toBe('utf-8');
  });

  it('should encode an empty string to an empty Uint8Array', () => {
    const result = encoder.encode('');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(0);
  });

  it('should encode ASCII characters', () => {
    const result = encoder.encode('Hello');
    expect(Array.from(result)).toEqual([72, 101, 108, 108, 111]);
  });

  it('should encode Korean / CJK characters (3-byte UTF-8)', () => {
    // '한' = U+D55C → 0xED 0x95 0x9C
    const result = encoder.encode('한');
    expect(Array.from(result)).toEqual([0xed, 0x95, 0x9c]);
  });

  it('should encode emoji with surrogate pairs (4-byte UTF-8)', () => {
    // '🌍' = U+1F30D → 0xF0 0x9F 0x8C 0x8D
    const result = encoder.encode('🌍');
    expect(Array.from(result)).toEqual([0xf0, 0x9f, 0x8c, 0x8d]);
  });

  it('should handle 2-byte UTF-8 characters', () => {
    // 'ñ' = U+00F1 → 0xC3 0xB1
    const result = encoder.encode('ñ');
    expect(Array.from(result)).toEqual([0xc3, 0xb1]);
  });

  it('should handle mixed ASCII, CJK, and emoji', () => {
    const result = encoder.encode('A한🌍');
    expect(Array.from(result)).toEqual([
      0x41, // 'A'
      0xed, 0x95, 0x9c, // '한'
      0xf0, 0x9f, 0x8c, 0x8d, // '🌍'
    ]);
  });

  it('should replace lone surrogates with U+FFFD', () => {
    // Lone high surrogate
    const input = String.fromCharCode(0xd800);
    const result = encoder.encode(input);
    // U+FFFD → 0xEF 0xBF 0xBD
    expect(Array.from(result)).toEqual([0xef, 0xbf, 0xbd]);
  });

  it('should handle large strings', () => {
    const largeStr = 'A'.repeat(100_000);
    const result = encoder.encode(largeStr);
    expect(result.length).toBe(100_000);
    expect(result[0]).toBe(0x41);
    expect(result[99_999]).toBe(0x41);
  });

  describe('encodeInto', () => {
    it('should encode into a full-size buffer', () => {
      const dest = new Uint8Array(5);
      const result = encoder.encodeInto('Hello', dest);
      expect(result.read).toBe(5);
      expect(result.written).toBe(5);
      expect(Array.from(dest)).toEqual([72, 101, 108, 108, 111]);
    });

    it('should encode into a partial buffer (truncate at code point boundary)', () => {
      // '한' needs 3 bytes; buffer only holds 2
      const dest = new Uint8Array(2);
      const result = encoder.encodeInto('한', dest);
      expect(result.read).toBe(0); // couldn't fit the 3-byte char
      expect(result.written).toBe(0);
    });

    it('should handle encodeInto with emoji and limited space', () => {
      // 'A🌍' — A is 1 byte, emoji is 4 bytes; buffer has 3 bytes
      const dest = new Uint8Array(3);
      const result = encoder.encodeInto('A🌍', dest);
      expect(result.read).toBe(1); // only 'A' fits
      expect(result.written).toBe(1);
      expect(dest[0]).toBe(0x41);
    });

    it('should report read as 2 for surrogate pair code units', () => {
      const dest = new Uint8Array(4);
      const result = encoder.encodeInto('🌍', dest);
      expect(result.read).toBe(2); // 2 UTF-16 code units consumed
      expect(result.written).toBe(4); // 4 bytes written
    });

    it('should handle empty source', () => {
      const dest = new Uint8Array(10);
      const result = encoder.encodeInto('', dest);
      expect(result.read).toBe(0);
      expect(result.written).toBe(0);
    });
  });
});
