import { wbAtob, wbBtoa } from './base64';

describe('wbBtoa', () => {
  it('should encode an empty string', () => {
    expect(wbBtoa('')).toBe('');
  });

  it('should encode ASCII strings', () => {
    expect(wbBtoa('Hello')).toBe('SGVsbG8=');
  });

  it('should encode with correct padding', () => {
    expect(wbBtoa('A')).toBe('QQ==');
    expect(wbBtoa('AB')).toBe('QUI=');
    expect(wbBtoa('ABC')).toBe('QUJD');
  });

  it('should encode binary data (Latin-1 range)', () => {
    // Bytes 0x00–0xFF
    expect(wbBtoa('\x00\xFF')).toBe('AP8=');
  });

  it('should throw InvalidCharacterError for characters > 255', () => {
    expect(() => wbBtoa('한')).toThrow();
    try {
      wbBtoa('한');
    } catch (e) {
      expect((e as Error).name).toBe('InvalidCharacterError');
    }
  });

  it('should handle all base64 characters roundtrip', () => {
    const original = 'Man is distinguished, not only by his reason';
    const encoded = wbBtoa(original);
    const decoded = wbAtob(encoded);
    expect(decoded).toBe(original);
  });
});

describe('wbAtob', () => {
  it('should decode an empty string', () => {
    expect(wbAtob('')).toBe('');
  });

  it('should decode valid base64', () => {
    expect(wbAtob('SGVsbG8=')).toBe('Hello');
  });

  it('should decode base64 without padding', () => {
    expect(wbAtob('SGVsbG8')).toBe('Hello');
  });

  it('should ignore whitespace in input', () => {
    expect(wbAtob('S G V s\nbG 8=')).toBe('Hello');
    expect(wbAtob('  SGVsbG8=  ')).toBe('Hello');
    expect(wbAtob('SGVs\tbG8=')).toBe('Hello');
  });

  it('should throw InvalidCharacterError for invalid base64', () => {
    // Single character (length % 4 === 1 after stripping padding)
    expect(() => wbAtob('A')).toThrow();
    try {
      wbAtob('A');
    } catch (e) {
      expect((e as Error).name).toBe('InvalidCharacterError');
    }
  });

  it('should throw for non-base64 characters', () => {
    expect(() => wbAtob('SGVsbG8@')).toThrow();
  });

  it('should handle padding correctly', () => {
    expect(wbAtob('QQ==')).toBe('A');
    expect(wbAtob('QUI=')).toBe('AB');
    expect(wbAtob('QUJD')).toBe('ABC');
  });

  it('should roundtrip binary data', () => {
    // Build a string with all Latin-1 bytes
    let binary = '';
    for (let i = 0; i < 256; i++) {
      binary += String.fromCharCode(i);
    }
    const encoded = wbBtoa(binary);
    const decoded = wbAtob(encoded);
    expect(decoded).toBe(binary);
  });
});
