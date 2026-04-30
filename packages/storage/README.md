# @webbridge-native/storage

> Web Storage API polyfill (`localStorage`, `sessionStorage`) for React Native.

## Installation

```bash
pnpm add @webbridge-native/storage
```

## Usage

### Basic (in-memory)

```typescript
import { createSessionStorage } from '@webbridge-native/storage';

const sessionStorage = createSessionStorage();

sessionStorage.setItem('token', 'abc123');
console.log(sessionStorage.getItem('token')); // "abc123"
console.log(sessionStorage.length);            // 1
sessionStorage.removeItem('token');
```

### With persistence adapter

```typescript
import { createLocalStorage } from '@webbridge-native/storage';
import type { StorageAdapter } from '@webbridge-native/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Example adapter wrapping AsyncStorage (synchronous snapshot)
const asyncStorageAdapter: StorageAdapter = {
  load() {
    // Load from a pre-cached snapshot
    return cachedData;
  },
  save(data) {
    // Persist asynchronously
    const entries = Array.from(data.entries());
    AsyncStorage.multiSet(entries);
  },
};

const localStorage = createLocalStorage(asyncStorageAdapter);
```

### Storage events

```typescript
import { WBStorageEvent } from '@webbridge-native/storage';

const event = new WBStorageEvent({
  key: 'theme',
  oldValue: 'light',
  newValue: 'dark',
  storageArea: localStorage,
});
```

## API Reference

### `WBStorage`

Implements the full [Storage interface](https://developer.mozilla.org/en-US/docs/Web/API/Storage).

| Method / Property | Description |
|---|---|
| `length` | Number of stored key/value pairs |
| `getItem(key)` | Returns the value for `key`, or `null` |
| `setItem(key, value)` | Stores a value (converted to string) |
| `removeItem(key)` | Removes the entry for `key` |
| `clear()` | Removes all entries |
| `key(index)` | Returns the key at `index` (insertion order), or `null` |

**Quota**: 5 MB per instance. Throws `QuotaExceededError` when exceeded.

### `StorageAdapter`

Interface for persistence backends.

| Method | Description |
|---|---|
| `load(): Map<string, string>` | Load initial data (called once at construction) |
| `save(data): void` | Persist current data (called on every mutation) |

### `WBStorageEvent`

Mirrors the browser [StorageEvent](https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent).

| Property | Type | Description |
|---|---|---|
| `key` | `string \| null` | Key that changed (`null` for `clear()`) |
| `oldValue` | `string \| null` | Previous value |
| `newValue` | `string \| null` | New value |
| `url` | `string` | Document URL (defaults to `""`) |
| `storageArea` | `WBStorage` | The affected storage instance |

### Factory functions

- `createLocalStorage(adapter?)` -- Creates a storage instance, optionally backed by a persistence adapter.
- `createSessionStorage()` -- Creates an in-memory-only storage instance.

## License

MIT
