/**
 * @module text-decoder
 * WHATWG Encoding API compliant TextDecoder (UTF-8 only).
 * @see https://encoding.spec.whatwg.org/#textdecoder
 */

/** Accepted encoding labels that map to UTF-8. */
const UTF8_LABELS = new Set(['utf-8', 'utf8', 'unicode-1-1-utf-8']);

/**
 * Options for the {@link WBTextDecoder} constructor.
 */
export interface TextDecoderOptions {
  /** If `true`, throw on invalid byte sequences instead of replacing. */
  fatal?: boolean;
  /** If `true`, keep the BOM in output instead of stripping it. */
  ignoreBOM?: boolean;
}

/**
 * Options for {@link WBTextDecoder.decode}.
 */
export interface TextDecodeOptions {
  /**
   * If `true`, the decoder keeps internal state for streaming.
   * If `false` (default), any incomplete sequence at the end is an error.
   */
  stream?: boolean;
}

/**
 * WHATWG-compliant TextDecoder that converts UTF-8 byte sequences to strings.
 *
 * Only UTF-8 is supported per the WHATWG Encoding specification.
 *
 * @example
 * ```ts
 * const decoder = new WBTextDecoder();
 * const text = decoder.decode(new Uint8Array([72, 101, 108, 108, 111]));
 * // 'Hello'
 * ```
 */
export class WBTextDecoder {
  /** The encoding label, always `'utf-8'`. */
  readonly encoding: string;

  /** Whether this decoder is in fatal mode. */
  readonly fatal: boolean;

  /** Whether this decoder preserves the BOM. */
  readonly ignoreBOM: boolean;

  // Streaming state
  private _pendingBytes: number[] = [];
  private _bomSeen = false;

  /**
   * @param label - Encoding label. Must be a UTF-8 alias or a `RangeError` is thrown.
   * @param options - Decoder options.
   */
  constructor(label?: string, options?: TextDecoderOptions) {
    const normalised = (label ?? 'utf-8').trim().toLowerCase();
    if (!UTF8_LABELS.has(normalised)) {
      throw new RangeError(
        `The encoding label provided ('${label}') is not supported.`,
      );
    }

    this.encoding = 'utf-8';
    this.fatal = options?.fatal ?? false;
    this.ignoreBOM = options?.ignoreBOM ?? false;
  }

  /**
   * Decode a buffer of UTF-8 bytes into a string.
   *
   * @param input - The bytes to decode. If omitted, flushes any pending state.
   * @param options - Decode options (streaming).
   * @returns The decoded string.
   */
  decode(
    input?: ArrayBuffer | Uint8Array | ArrayBufferView,
    options?: TextDecodeOptions,
  ): string {
    const stream = options?.stream ?? false;

    // Normalise input to Uint8Array
    let bytes: Uint8Array;
    if (input == null) {
      bytes = new Uint8Array(0);
    } else if (input instanceof ArrayBuffer) {
      bytes = new Uint8Array(input);
    } else if (ArrayBuffer.isView(input)) {
      bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    } else {
      bytes = new Uint8Array(0);
    }

    // Prepend any pending bytes from a previous streaming call
    let data: Uint8Array;
    if (this._pendingBytes.length > 0) {
      const merged = new Uint8Array(this._pendingBytes.length + bytes.length);
      merged.set(this._pendingBytes);
      merged.set(bytes, this._pendingBytes.length);
      data = merged;
      this._pendingBytes = [];
    } else {
      data = bytes;
    }

    const codePoints: number[] = [];
    let i = 0;

    while (i < data.length) {
      const byte0 = data[i];
      let codePoint: number;
      let bytesNeeded: number;
      let lowerBound: number;

      if (byte0 <= 0x7f) {
        // Single-byte (ASCII)
        codePoint = byte0;
        bytesNeeded = 1;
        lowerBound = 0;
      } else if ((byte0 & 0xe0) === 0xc0) {
        // 2-byte sequence
        codePoint = byte0 & 0x1f;
        bytesNeeded = 2;
        lowerBound = 0x80;
      } else if ((byte0 & 0xf0) === 0xe0) {
        // 3-byte sequence
        codePoint = byte0 & 0x0f;
        bytesNeeded = 3;
        lowerBound = 0x800;
      } else if ((byte0 & 0xf8) === 0xf0) {
        // 4-byte sequence
        codePoint = byte0 & 0x07;
        bytesNeeded = 4;
        lowerBound = 0x10000;
      } else {
        // Invalid leading byte
        this._handleError(codePoints);
        i++;
        continue;
      }

      // Check if we have enough bytes
      if (i + bytesNeeded > data.length) {
        if (stream) {
          // Save remaining bytes for the next chunk
          for (let j = i; j < data.length; j++) {
            this._pendingBytes.push(data[j]);
          }
          break;
        } else {
          // Not streaming — each remaining byte is an error
          for (let j = i; j < data.length; j++) {
            this._handleError(codePoints);
          }
          break;
        }
      }

      // Read continuation bytes
      let valid = true;
      for (let j = 1; j < bytesNeeded; j++) {
        const cont = data[i + j];
        if ((cont & 0xc0) !== 0x80) {
          // Invalid continuation byte
          this._handleError(codePoints);
          i++; // advance past the leading byte only
          valid = false;
          break;
        }
        codePoint = (codePoint << 6) | (cont & 0x3f);
      }
      if (!valid) continue;

      // Overlong check, surrogate check, and max code point check
      if (
        codePoint < lowerBound ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
        codePoint > 0x10ffff
      ) {
        this._handleError(codePoints);
        i += bytesNeeded;
        continue;
      }

      codePoints.push(codePoint);
      i += bytesNeeded;
    }

    if (!stream) {
      // Flush incomplete state
      if (this._pendingBytes.length > 0) {
        for (let j = 0; j < this._pendingBytes.length; j++) {
          this._handleError(codePoints);
        }
        this._pendingBytes = [];
      }
      // Reset BOM state for next independent decode
      this._bomSeen = false;
    }

    let result = codePointsToString(codePoints);

    // Handle BOM
    if (!this._bomSeen && result.length > 0) {
      if (result.charCodeAt(0) === 0xfeff) {
        this._bomSeen = true;
        if (!this.ignoreBOM) {
          result = result.slice(1);
        }
      } else {
        this._bomSeen = true;
      }
    }

    return result;
  }

  /**
   * Handle a decoding error — either throw or push a replacement character.
   */
  private _handleError(codePoints: number[]): void {
    if (this.fatal) {
      throw new TypeError(
        'The encoded data was not valid for encoding utf-8.',
      );
    }
    codePoints.push(0xfffd);
  }
}

/**
 * Convert an array of Unicode code points to a string, handling supplementary
 * characters (code points > U+FFFF) via surrogate pairs.
 */
function codePointsToString(codePoints: number[]): string {
  // Use String.fromCodePoint in chunks to avoid stack overflow on large arrays
  const CHUNK_SIZE = 8192;
  const parts: string[] = [];

  for (let i = 0; i < codePoints.length; i += CHUNK_SIZE) {
    const chunk = codePoints.slice(i, i + CHUNK_SIZE);
    parts.push(String.fromCodePoint(...chunk));
  }

  return parts.join('');
}
