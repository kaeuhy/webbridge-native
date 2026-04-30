# @webbridge-native/streams

WHATWG Streams API polyfill for React Native. Provides `ReadableStream`, `WritableStream`, and `TransformStream` implementations focused on HTTP response streaming.

## Installation

```bash
pnpm add @webbridge-native/streams
```

## Usage

```typescript
import {
  WBReadableStream,
  WBWritableStream,
  WBTransformStream,
  CountQueuingStrategy,
  ByteLengthQueuingStrategy,
} from '@webbridge-native/streams';
```

### ReadableStream

```typescript
const stream = new WBReadableStream<string>({
  start(controller) {
    controller.enqueue('hello');
    controller.enqueue('world');
    controller.close();
  },
});

const reader = stream.getReader();
const { value, done } = await reader.read(); // { value: 'hello', done: false }
```

### WritableStream

```typescript
const stream = new WBWritableStream<string>({
  write(chunk) {
    console.log('Received:', chunk);
  },
});

const writer = stream.getWriter();
await writer.write('data');
await writer.close();
```

### TransformStream

```typescript
const uppercase = new WBTransformStream<string, string>({
  transform(chunk, controller) {
    controller.enqueue(chunk.toUpperCase());
  },
});

// Pipe through
const result = readable.pipeThrough(uppercase);
```

### Queuing Strategies

```typescript
// Count-based backpressure (1 per chunk)
const countStrategy = new CountQueuingStrategy({ highWaterMark: 10 });

// Byte-length backpressure
const byteStrategy = new ByteLengthQueuingStrategy({ highWaterMark: 65536 });
```

## API

| Class | Description |
|---|---|
| `WBReadableStream` | Source of streaming data with reader, tee, pipeTo, pipeThrough |
| `WBWritableStream` | Sink for streaming data with writer, close, abort |
| `WBTransformStream` | Pairs readable + writable with a transformation function |
| `CountQueuingStrategy` | Counts each chunk as size 1 |
| `ByteLengthQueuingStrategy` | Uses `byteLength` for backpressure |

## Notes

- No external dependencies
- Focused on practical HTTP streaming use cases
- Proper state machine (readable/writable/closed/errored)
- Backpressure via `desiredSize` and `highWaterMark`
- Error propagation through pipelines

## License

MIT
