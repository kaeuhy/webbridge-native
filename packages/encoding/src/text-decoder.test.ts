import { WBTextDecoder } from './text-decoder';

describe('WBTextDecoder', () => {
  const decoder = new WBTextDecoder();

  it('should report encoding as utf-8', () => {
    expect(decoder.encoding).toBe('utf-8');
    expect(decoder.fatal).toBe(false);
    expect(decoder.ignoreBOM).toBe(false);
  });

  it('should decode empty input to empty string', () => {
    expect(decoder.decode(new Uint8Array(0))).toBe('');
    expect(decoder.decode()).toBe('');
  });

  it('should decode ASCII bytes', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]);
    expect(decoder.decode(bytes)).toBe('Hello');
  });

  it('should decode multi-byte UTF-8 (2-byte)', () => {
    // 'ñ' = U+00F1 → 0xC3 0xB1
    const bytes = new Uint8Array([0xc3, 0xb1]);
    expect(decoder.decode(bytes)).toBe('ñ');
  });

  it('should decode multi-byte UTF-8 (3-byte, Korean)', () => {
    // '한' = U+D55C → 0xED 0x95 0x9C
    const bytes = new Uint8Array([0xed, 0x95, 0x9c]);
    expect(decoder.decode(bytes)).toBe('한');
  });

  it('should decode multi-byte UTF-8 (4-byte, emoji)', () => {
    // '🌍' = U+1F30D → 0xF0 0x9F 0x8C 0x8D
    const bytes = new Uint8Array([0xf0, 0x9f, 0x8c, 0x8d]);
    expect(decoder.decode(bytes)).toBe('🌍');
  });

  it('should accept ArrayBuffer input', () => {
    const buf = new Uint8Array([72, 105]).buffer;
    expect(decoder.decode(buf)).toBe('Hi');
  });

  describe('BOM handling', () => {
    const bom = [0xef, 0xbb, 0xbf]; // UTF-8 BOM

    it('should strip BOM by default', () => {
      const bytes = new Uint8Array([...bom, 0x41]); // BOM + 'A'
      expect(decoder.decode(bytes)).toBe('A');
    });

    it('should keep BOM when ignoreBOM is true', () => {
      const d = new WBTextDecoder('utf-8', { ignoreBOM: true });
      const bytes = new Uint8Array([...bom, 0x41]);
      expect(d.decode(bytes)).toBe('\uFEFFA');
    });
  });

  describe('fatal mode', () => {
    const fatalDecoder = new WBTextDecoder('utf-8', { fatal: true });

    it('should throw TypeError on invalid bytes in fatal mode', () => {
      // 0xFF is not valid UTF-8
      const bytes = new Uint8Array([0xff]);
      expect(() => fatalDecoder.decode(bytes)).toThrow(TypeError);
    });

    it('should throw on truncated multi-byte sequence in fatal mode', () => {
      // Start of a 2-byte sequence but missing continuation
      const bytes = new Uint8Array([0xc3]);
      expect(() => fatalDecoder.decode(bytes)).toThrow(TypeError);
    });

    it('should throw on overlong encoding in fatal mode', () => {
      // Overlong encoding of U+002F (/) as 0xC0 0xAF
      const bytes = new Uint8Array([0xc0, 0xaf]);
      expect(() => fatalDecoder.decode(bytes)).toThrow(TypeError);
    });
  });

  describe('replacement character', () => {
    it('should replace invalid bytes with U+FFFD when not fatal', () => {
      const bytes = new Uint8Array([0x41, 0xff, 0x42]); // 'A' invalid 'B'
      expect(decoder.decode(bytes)).toBe('A\uFFFDB');
    });

    it('should replace truncated sequence with U+FFFD', () => {
      // Truncated 3-byte sequence
      const bytes = new Uint8Array([0xe0, 0x80]);
      const result = decoder.decode(bytes);
      expect(result).toContain('\uFFFD');
    });
  });

  describe('encoding label validation', () => {
    it('should accept utf-8 variants', () => {
      expect(() => new WBTextDecoder('utf-8')).not.toThrow();
      expect(() => new WBTextDecoder('utf8')).not.toThrow();
      expect(() => new WBTextDecoder('unicode-1-1-utf-8')).not.toThrow();
      expect(() => new WBTextDecoder('UTF-8')).not.toThrow();
      expect(() => new WBTextDecoder(' utf-8 ')).not.toThrow();
    });

    it('should throw RangeError for unsupported encoding', () => {
      expect(() => new WBTextDecoder('latin1')).toThrow(RangeError);
      expect(() => new WBTextDecoder('windows-1252')).toThrow(RangeError);
      expect(() => new WBTextDecoder('iso-8859-1')).toThrow(RangeError);
    });
  });

  describe('streaming', () => {
    it('should handle streaming decode across chunks', () => {
      const d = new WBTextDecoder();
      // '한' = 0xED 0x95 0x9C — split across two chunks
      const part1 = d.decode(new Uint8Array([0xed]), { stream: true });
      const part2 = d.decode(new Uint8Array([0x95, 0x9c]), { stream: true });
      const part3 = d.decode(); // flush
      expect(part1 + part2 + part3).toBe('한');
    });
  });

  it('should handle mixed valid and invalid bytes', () => {
    // 'A' + invalid + 'B' + valid 2-byte + invalid continuation
    const bytes = new Uint8Array([0x41, 0x80, 0x42, 0xc3, 0xb1, 0x80]);
    const result = decoder.decode(bytes);
    expect(result).toBe('A\uFFFDB\u00F1\uFFFD');
  });
});
