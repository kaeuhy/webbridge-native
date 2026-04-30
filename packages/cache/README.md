# @webbridge-native/cache

Browser-grade HTTP caching for React Native. RFC 7234 compliant.

## Why

Browsers automatically handle `Cache-Control`, `ETag`, and `Last-Modified`. React Native does not -- every request hits the server, wasting bandwidth and increasing latency.

## Installation

```bash
pnpm add @webbridge-native/cache @webbridge-native/core
```

## Usage

```typescript
import { HttpCache, cacheInterceptor } from '@webbridge-native/cache';

const cache = new HttpCache({ maxEntries: 500, maxSize: 50 * 1024 * 1024 });
client.use(cacheInterceptor({ cache }));

// First request  -> server call (X-Cache: MISS)
// Second request -> cache hit   (X-Cache: HIT)
// After expiry   -> conditional (X-Cache: REVALIDATED)
// After POST     -> cache invalidated for that URL
```

## Browser-Compatible Features

- `Cache-Control` (max-age, no-cache, no-store, must-revalidate)
- `ETag` + `If-None-Match` -> 304 Not Modified
- `Last-Modified` + `If-Modified-Since` -> 304 Not Modified
- `Vary` header (separate cache entries per Accept-Language, etc.)
- `stale-while-revalidate` (serve stale immediately, revalidate in background)
- POST invalidates GET cache for the same URL (RFC 7234 SS4.4)
- LRU eviction (maxEntries, maxSize)

## API Reference

| Export | Type | Description |
|---|---|---|
| `HttpCache` | Class | In-memory HTTP cache with LRU eviction |
| `PersistentHttpCache` | Class | Persistent HTTP cache backed by AsyncStorage |
| `cacheInterceptor` | Function | Creates the cache interceptor for WebBridgeClient |
| `parseCacheControl` | Function | Parses a `Cache-Control` header string into a structured object |
| `isCacheable` | Function | Determines if a request/response pair is cacheable per RFC 7234 |

## License

MIT
