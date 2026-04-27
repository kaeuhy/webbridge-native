// @webbridge-native/sse
// EventSource polyfill for WebBridge Native

export { EventSource } from './event-source';
export type { EventSourceOptions } from './event-source';
export { parseEventStream, parseRetryField } from './event-parser';
export type { SSEEvent } from './event-parser';
