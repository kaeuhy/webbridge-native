/**
 * @module base64
 * RFC 4648 compliant atob / btoa implementation.
 * @see https://infra.spec.whatwg.org/#forgiving-base64-decode
 * @see https://html.spec.whatwg.org/multipage/webappapis.html#atob
 */

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Lookup table: base64 char → 6-bit value (or -1 for invalid). */
const DECODE_TABLE = new Int8Array(128).fill(-1);
for (let i = 0; i < BASE64_CHARS.length; i++) {
  DECODE_TABLE[BASE64_CHARS.charCodeAt(i)] = i;
}
// '=' is the padding character — handled separately, not in the table

/** ASCII whitespace characters to ignore in atob input per the spec. */
const WHITESPACE = new Set([
  0x09, // tab
  0x0a, // newline
  0x0c, // form feed
  0x0d, // carriage return
  0x20, // space
]);

/**
 * Encode a binary string to Base64.
 *
 * Each character in the input must have a code point ≤ 255 (Latin-1 range).
 * If any character exceeds 255, an `InvalidCharacterError` (DOMException
 * equivalent) is thrown.
 *
 * @param data - The binary string to encode.
 * @returns The Base64-encoded string.
 * @throws Error with name `InvalidCharacterError` if a character > 255.
 *
 * @example
 * ```ts
 * wbBtoa('Hello'); // 'SGVsbG8='
 * ```
 */
export function wbBtoa(data: string): string {
  // Validate all characters are in Latin-1 range
  for (let i = 0; i < data.length; i++) {
    if (data.charCodeAt(i) > 0xff) {
      const err = new Error(
        "Failed to execute 'btoa': The string to be encoded contains characters outside of the Latin1 range.",
      );
      err.name = 'InvalidCharacterError';
      throw err;
    }
  }

  let result = '';
  const len = data.length;

  for (let i = 0; i < len; i += 3) {
    const b0 = data.charCodeAt(i);
    const b1 = i + 1 < len ? data.charCodeAt(i + 1) : 0;
    const b2 = i + 2 < len ? data.charCodeAt(i + 2) : 0;

    const triplet = (b0 << 16) | (b1 << 8) | b2;

    result += BASE64_CHARS[(triplet >> 18) & 0x3f];
    result += BASE64_CHARS[(triplet >> 12) & 0x3f];
    result += i + 1 < len ? BASE64_CHARS[(triplet >> 6) & 0x3f] : '=';
    result += i + 2 < len ? BASE64_CHARS[triplet & 0x3f] : '=';
  }

  return result;
}

/**
 * Decode a Base64-encoded string to a binary string.
 *
 * Whitespace is ignored per the WHATWG "forgiving base64 decode" algorithm.
 * Invalid characters cause an `InvalidCharacterError` to be thrown.
 *
 * @param data - The Base64 string to decode.
 * @returns The decoded binary string.
 * @throws Error with name `InvalidCharacterError` for invalid Base64 input.
 *
 * @example
 * ```ts
 * wbAtob('SGVsbG8='); // 'Hello'
 * ```
 */
export function wbAtob(data: string): string {
  // Step 1: Remove ASCII whitespace
  let cleaned = '';
  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i);
    if (!WHITESPACE.has(code)) {
      cleaned += data[i];
    }
  }

  // Step 2: Validate length — after stripping whitespace and padding,
  // the length mod 4 must not be 1
  let noPadding = cleaned;
  while (noPadding.endsWith('=')) {
    noPadding = noPadding.slice(0, -1);
  }
  if (noPadding.length % 4 === 1) {
    throwInvalidCharacter();
  }

  // Step 3: Validate characters
  for (let i = 0; i < noPadding.length; i++) {
    const code = noPadding.charCodeAt(i);
    if (code >= 128 || DECODE_TABLE[code] === -1) {
      throwInvalidCharacter();
    }
  }

  // Step 4: Decode
  const bytes: number[] = [];
  for (let i = 0; i < noPadding.length; i += 4) {
    const c0 = DECODE_TABLE[noPadding.charCodeAt(i)];
    const c1 = i + 1 < noPadding.length ? DECODE_TABLE[noPadding.charCodeAt(i + 1)] : 0;
    const c2 = i + 2 < noPadding.length ? DECODE_TABLE[noPadding.charCodeAt(i + 2)] : 0;
    const c3 = i + 3 < noPadding.length ? DECODE_TABLE[noPadding.charCodeAt(i + 3)] : 0;

    const triplet = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;

    bytes.push((triplet >> 16) & 0xff);
    if (i + 2 < noPadding.length) {
      bytes.push((triplet >> 8) & 0xff);
    }
    if (i + 3 < noPadding.length) {
      bytes.push(triplet & 0xff);
    }
  }

  return String.fromCharCode(...bytes);
}

/**
 * Throw an InvalidCharacterError.
 */
function throwInvalidCharacter(): never {
  const err = new Error(
    "Failed to execute 'atob': The string to be decoded is not correctly encoded.",
  );
  err.name = 'InvalidCharacterError';
  throw err;
}
