# @webbridge-native/cache

> RFC 7234 HTTP cache for React Native. ETag, Vary, LRU eviction.

## Installation

```bash
pnpm add @webbridge-native/cache @webbridge-native/core
```

## Usage

```typescript
import { WebBridgeClient } from '@webbridge-native/core';
import { HttpCache, cacheInterceptor } from '@webbridge-native/cache';

const cache = new HttpCache({
  maxEntries: 500,              // default 500
  maxSize: 50 * 1024 * 1024,   // default 50MB
});

const client = new WebBridgeClient();
client.use(cacheInterceptor({ cache }));
client.use(terminalInterceptor);

// First request — cache MISS
const res1 = await client.fetch('https://api.example.com/data');
// X-Cache: MISS

// Second request — cache HIT (if within max-age)
const res2 = await client.fetch('https://api.example.com/data');
// X-Cache: HIT

// POST invalidates cache for the URL (RFC 7234 §4.4)
await client.fetch('https://api.example.com/data', { method: 'POST' });
// Next GET will be a MISS

// Cache stats
cache.stats(); // { entries, size, hits, misses, hitRate }

// Clear cache
cache.clear();
```

## Features

- **Cache-Control**: max-age, no-cache, no-store, must-revalidate, public, private
- **Conditional requests**: ETag + If-None-Match → 304 (body reuse)
- **Last-Modified**: If-Modified-Since → 304
- **Vary header**: Separate cache entries per header value (e.g., Accept-Language)
- **Vary: \***: Uncacheable (RFC 7234 §4.1)
- **stale-while-revalidate**: Serve stale immediately + background refresh
- **LRU eviction**: By entry count and total size
- **POST invalidation**: Successful non-GET → delete cached GET
- **X-Cache header**: HIT / MISS / REVALIDATED / STALE

## License

MIT
