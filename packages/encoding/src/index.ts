/**
 * @module @webbridge-native/encoding
 *
 * WHATWG Encoding API polyfill for React Native.
 * Provides TextEncoder, TextDecoder (UTF-8), atob, and btoa.
 *
 * @packageDocumentation
 */

export { WBTextEncoder } from './text-encoder';
export type { TextEncoderEncodeIntoResult } from './text-encoder';

export { WBTextDecoder } from './text-decoder';
export type { TextDecoderOptions, TextDecodeOptions } from './text-decoder';

export { wbAtob, wbBtoa } from './base64';
