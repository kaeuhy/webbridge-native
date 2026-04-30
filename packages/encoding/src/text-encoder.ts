/**
 * @module text-encoder
 * WHATWG Encoding API compliant TextEncoder (UTF-8 only).
 * @see https://encoding.spec.whatwg.org/#textencoder
 */

/**
 * Result of {@link WBTextEncoder.encodeInto}.
 */
export interface TextEncoderEncodeIntoResult {
  /** Number of UTF-16 code units read from the source string. */
  read: number;
  /** Number of UTF-8 bytes written to the destination buffer. */
  written: number;
}

/**
 * WHATWG-compliant TextEncoder that converts strings to UTF-8 byte sequences.
 *
 * Only UTF-8 is supported per the WHATWG Encoding specification.
 *
 * @example
 * ```ts
 * const encoder = new WBTextEncoder();
 * const bytes = encoder.encode('Hello 🌍');
 * ```
 */
export class WBTextEncoder {
  /** Always `'utf-8'` per the WHATWG spec. */
  readonly encoding = 'utf-8' as const;

  /**
   * Encode a string into a UTF-8 `Uint8Array`.
   *
   * @param input - The string to encode. Defaults to `''`.
   * @returns A new `Uint8Array` containing the UTF-8 bytes.
   */
  encode(input: string = ''): Uint8Array {
    if (input.length === 0) {
      return new Uint8Array(0);
    }

    // Pre-calculate byte length for single allocation
    const byteLength = utf8ByteLength(input);
    const result = new Uint8Array(byteLength);
    let offset = 0;

    for (let i = 0; i < input.length; i++) {
      let codePoint = input.charCodeAt(i);

      // Handle surrogate pairs
      if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
        const next = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
        if (next >= 0xdc00 && next <= 0xdfff) {
          codePoint = ((codePoint - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
          i++; // skip low surrogate
        } else {
          // Lone high surrogate → U+FFFD
          codePoint = 0xfffd;
        }
      } else if (codePoint >= 0xdc00 && codePoint <= 0xdfff) {
        // Lone low surrogate → U+FFFD
        codePoint = 0xfffd;
      }

      offset = writeCodePoint(result, offset, codePoint);
    }

    return result;
  }

  /**
   * Encode a string into a pre-existing `Uint8Array`, writing as many
   * complete UTF-8 code points as fit.
   *
   * @param source - The string to encode.
   * @param destination - The buffer to write into.
   * @returns An object with `read` (UTF-16 code units consumed) and
   *          `written` (bytes written).
   */
  encodeInto(
    source: string,
    destination: Uint8Array,
  ): TextEncoderEncodeIntoResult {
    let read = 0;
    let written = 0;

    for (let i = 0; i < source.length; i++) {
      let codePoint = source.charCodeAt(i);
      let codeUnits = 1;

      // Handle surrogate pairs
      if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
        const next =
          i + 1 < source.length ? source.charCodeAt(i + 1) : 0;
        if (next >= 0xdc00 && next <= 0xdfff) {
          codePoint =
            ((codePoint - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
          codeUnits = 2;
        } else {
          codePoint = 0xfffd;
        }
      } else if (codePoint >= 0xdc00 && codePoint <= 0xdfff) {
        codePoint = 0xfffd;
      }

      const bytesNeeded = utf8BytesForCodePoint(codePoint);

      if (written + bytesNeeded > destination.length) {
        break; // Not enough room for the complete code point
      }

      written = writeCodePoint(destination, written, codePoint);
      read += codeUnits;
      if (codeUnits === 2) {
        i++; // skip the low surrogate in the loop
      }
    }

    return { read, written };
  }
}

/**
 * Calculate the number of UTF-8 bytes needed for a given code point.
 */
function utf8BytesForCodePoint(cp: number): number {
  if (cp <= 0x7f) return 1;
  if (cp <= 0x7ff) return 2;
  if (cp <= 0xffff) return 3;
  return 4;
}

/**
 * Calculate total UTF-8 byte length for a string.
 */
function utf8ByteLength(str: string): number {
  let len = 0;
  for (let i = 0; i < str.length; i++) {
    let cp = str.charCodeAt(i);
    if (cp >= 0xd800 && cp <= 0xdbff) {
      const next = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        cp = ((cp - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
        i++;
      } else {
        cp = 0xfffd;
      }
    } else if (cp >= 0xdc00 && cp <= 0xdfff) {
      cp = 0xfffd;
    }
    len += utf8BytesForCodePoint(cp);
  }
  return len;
}

/**
 * Write a single Unicode code point as UTF-8 bytes into `buf` at `offset`.
 * Returns the new offset.
 */
function writeCodePoint(buf: Uint8Array, offset: number, cp: number): number {
  if (cp <= 0x7f) {
    buf[offset++] = cp;
  } else if (cp <= 0x7ff) {
    buf[offset++] = 0xc0 | (cp >> 6);
    buf[offset++] = 0x80 | (cp & 0x3f);
  } else if (cp <= 0xffff) {
    buf[offset++] = 0xe0 | (cp >> 12);
    buf[offset++] = 0x80 | ((cp >> 6) & 0x3f);
    buf[offset++] = 0x80 | (cp & 0x3f);
  } else {
    buf[offset++] = 0xf0 | (cp >> 18);
    buf[offset++] = 0x80 | ((cp >> 12) & 0x3f);
    buf[offset++] = 0x80 | ((cp >> 6) & 0x3f);
    buf[offset++] = 0x80 | (cp & 0x3f);
  }
  return offset;
}
