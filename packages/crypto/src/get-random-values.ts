/**
 * crypto.getRandomValues() polyfill.
 * Uses Math.random() as fallback when native crypto is unavailable.
 * In production RN apps, prefer react-native-get-random-values for true randomness.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
 */

/** Maximum quota for getRandomValues (65536 bytes per the spec). */
const MAX_BYTE_LENGTH = 65536;

/** Typed array constructors that getRandomValues accepts. */
const TYPED_ARRAY_CONSTRUCTORS = new Set([
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
]);

/**
 * Determines whether a value is a supported typed array.
 */
function isTypedArray(value: unknown): value is ArrayBufferView {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  for (const ctor of TYPED_ARRAY_CONSTRUCTORS) {
    if (value instanceof ctor) {
      return true;
    }
  }
  return false;
}

/**
 * Creates a DOMException-like error for quota exceeded.
 * Native DOMException may not be available in all environments.
 */
function createQuotaExceededError(): Error {
  // DOMException is available in modern environments
  if (typeof DOMException !== 'undefined') {
    return new DOMException(
      'The ArrayBufferView\'s byte length exceeds the number of bytes of entropy available via this API (65536 bytes).',
      'QuotaExceededError',
    );
  }
  const error = new Error(
    'The ArrayBufferView\'s byte length exceeds the number of bytes of entropy available via this API (65536 bytes).',
  );
  error.name = 'QuotaExceededError';
  return error;
}

/**
 * Fill a typed array with cryptographically random values.
 *
 * Uses `globalThis.crypto.getRandomValues` when available,
 * otherwise falls back to `Math.random()`.
 *
 * @param array - A typed array to fill with random values
 * @returns The same array, now filled with random values
 * @throws {TypeError} If array is not a supported typed array
 * @throws {DOMException} If array byte length exceeds 65536
 */
export function getRandomValues<T extends ArrayBufferView>(array: T): T {
  if (!isTypedArray(array)) {
    throw new TypeError(
      'Failed to execute \'getRandomValues\': parameter 1 is not of type \'ArrayBufferView\'.',
    );
  }

  if (array.byteLength > MAX_BYTE_LENGTH) {
    throw createQuotaExceededError();
  }

  // Try native crypto first
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    return globalThis.crypto.getRandomValues(array as unknown as Uint8Array) as unknown as T;
  }

  // Math.random() fallback
  const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  for (let i = 0; i < view.length; i++) {
    view[i] = Math.floor(Math.random() * 256);
  }

  return array;
}
