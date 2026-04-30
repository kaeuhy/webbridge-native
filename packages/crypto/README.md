# @webbridge-native/crypto

> Web Crypto API polyfill (`getRandomValues`, `randomUUID`) for React Native.

## Installation

```bash
pnpm add @webbridge-native/crypto
```

## Usage

```typescript
import { getRandomValues, randomUUID } from '@webbridge-native/crypto';

// Fill a typed array with random values
const bytes = new Uint8Array(16);
getRandomValues(bytes);

// Generate a UUID v4
const id = randomUUID();
// => "550e8400-e29b-41d4-a716-446655440000"
```

## API Reference

### `getRandomValues<T extends ArrayBufferView>(array: T): T`

Fills a typed array with cryptographically random values.

- **Supported types**: `Uint8Array`, `Uint16Array`, `Uint32Array`, `Int8Array`, `Int16Array`, `Int32Array`, `Uint8ClampedArray`
- **Returns**: The same array reference, filled with random values
- **Throws**: `TypeError` if input is not a typed array
- **Throws**: `QuotaExceededError` (DOMException) if byte length > 65536

Uses `globalThis.crypto.getRandomValues` when available (e.g., with `react-native-get-random-values`), otherwise falls back to `Math.random()`.

### `randomUUID(): string`

Generates a RFC 4122 version 4 UUID.

- **Format**: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- **Returns**: A 36-character UUID string
- Uses `getRandomValues` internally for random bytes

## Notes

- For cryptographically secure randomness in production, install `react-native-get-random-values` before importing this package.
- The `Math.random()` fallback is suitable for non-security use cases (IDs, test data).

## License

MIT
