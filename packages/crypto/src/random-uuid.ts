/**
 * crypto.randomUUID() -- generates RFC 4122 v4 UUID.
 *
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where y is one of [8, 9, a, b].
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
 */

import { getRandomValues } from './get-random-values';

/**
 * Converts a byte to a 2-character hex string.
 */
function byteToHex(byte: number): string {
  return byte.toString(16).padStart(2, '0');
}

/**
 * Generate a RFC 4122 version 4 UUID string.
 *
 * @returns A UUID string in the format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function randomUUID(): string {
  const bytes = new Uint8Array(16);
  getRandomValues(bytes);

  // Set version 4 (bits 12-15 of time_hi_and_version)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;

  // Set variant (bits 6-7 of clock_seq_hi_and_reserved to 10)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return (
    byteToHex(bytes[0]) +
    byteToHex(bytes[1]) +
    byteToHex(bytes[2]) +
    byteToHex(bytes[3]) +
    '-' +
    byteToHex(bytes[4]) +
    byteToHex(bytes[5]) +
    '-' +
    byteToHex(bytes[6]) +
    byteToHex(bytes[7]) +
    '-' +
    byteToHex(bytes[8]) +
    byteToHex(bytes[9]) +
    '-' +
    byteToHex(bytes[10]) +
    byteToHex(bytes[11]) +
    byteToHex(bytes[12]) +
    byteToHex(bytes[13]) +
    byteToHex(bytes[14]) +
    byteToHex(bytes[15])
  );
}
