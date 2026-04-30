# @webbridge-native/encoding

WHATWG Encoding API polyfill for React Native. Provides `TextEncoder`, `TextDecoder` (UTF-8), `atob`, and `btoa` as pure-JavaScript implementations with no external dependencies.

## Installation

```bash
npm install @webbridge-native/encoding
# or
pnpm add @webbridge-native/encoding
```

## Usage

### TextEncoder / TextDecoder

```typescript
import { WBTextEncoder, WBTextDecoder } from '@webbridge-native/encoding';

const encoder = new WBTextEncoder();
const bytes = encoder.encode('Hello 🌍');

const decoder = new WBTextDecoder();
const text = decoder.decode(bytes); // 'Hello 🌍'
```

#### encodeInto

```typescript
const encoder = new WBTextEncoder();
const buffer = new Uint8Array(64);
const { read, written } = encoder.encodeInto('Hello', buffer);
```

#### Decoder options

```typescript
// Fatal mode: throw on invalid UTF-8 instead of replacing with U+FFFD
const fatal = new WBTextDecoder('utf-8', { fatal: true });

// Keep BOM instead of stripping
const keepBOM = new WBTextDecoder('utf-8', { ignoreBOM: true });
```

### Base64 (atob / btoa)

```typescript
import { wbBtoa, wbAtob } from '@webbridge-native/encoding';

const encoded = wbBtoa('Hello');  // 'SGVsbG8='
const decoded = wbAtob('SGVsbG8='); // 'Hello'
```

## Specification compliance

- **TextEncoder / TextDecoder**: [WHATWG Encoding Standard](https://encoding.spec.whatwg.org/) (UTF-8 only)
- **atob / btoa**: [HTML Standard](https://html.spec.whatwg.org/multipage/webappapis.html#atob) with [RFC 4648](https://datatracker.ietf.org/doc/html/rfc4648) base64

## License

MIT
