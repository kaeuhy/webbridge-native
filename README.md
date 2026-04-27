# WebBridge Native

[![CI](https://github.com/kaeuhy/webbridge-native/actions/workflows/ci.yml/badge.svg)](https://github.com/kaeuhy/webbridge-native/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Browser-compatible networking for React Native

---

## What is this?

`fetch()` works perfectly in the browser — cookies are stored automatically, `User-Agent` is set, `Cache-Control` is respected, and everything shows up in DevTools. In React Native, **none of this is guaranteed**.

**WebBridge Native** bridges that gap. It brings browser networking semantics to React Native through native-level interception, not JS monkey-patching.

## Why not existing solutions?

| Existing | What it does | What it doesn't |
|---|---|---|
| MSW (`msw/native`) | MSW DSL in RN | No DevTools visibility, no semantic integration |
| `@react-native-cookies/cookies` | Cookie get/set | No auto-management, no RFC 6265 compliance |
| RN 0.81+ DevTools | Auto-records fetch/XHR | No mock visibility, no cookie/cache semantics |
| `react-native-network-logger` | Network inspection | No mocking, no semantics |

**WebBridge Native** is the only library that integrates cookies + cache + redirect + headers + CORS semantics with MSW-compatible mocking and native visibility — **in one place**.

## Key Features

- **Cookie Jar** — RFC 6265 compliant with SameSite, HttpOnly, Secure, Public Suffix validation
- **HTTP Cache** — RFC 7234 with ETag/304, Vary, LRU eviction
- **Redirect Handler** — 301-308 with method change, cross-origin header stripping
- **Header Normalizer** — Browser-like User-Agent, Accept-Language, Origin
- **MSW-compatible Mock** — Same DSL as MSW v2, visible in RN DevTools
- **Native Bridge** — NSURLProtocol (iOS) / OkHttp Network Interceptor (Android)
- **Opt-out Friendly** — Use only what you need, disable what you don't

## Packages

| Package | Description | Status |
|---|---|---|
| `@webbridge-native/core` | Types, interceptor chain, utilities | Stable |
| `@webbridge-native/cookies` | RFC 6265 cookie jar | Stable |
| `@webbridge-native/headers` | Header normalizer | Stable |
| `@webbridge-native/mock` | MSW-compatible mocking | Stable |
| `@webbridge-native/cache` | HTTP cache (RFC 7234) | Stable |
| `@webbridge-native/redirect` | Redirect handler | Stable |
| `@webbridge-native/devtools` | Request logger, HAR export | Stable |
| `@webbridge-native/native-bridge` | iOS/Android native modules | Beta |
| `@webbridge-native/cors` | CORS simulator (dev-only) | Stable |
| `@webbridge-native/sse` | EventSource polyfill | Alpha |
| `@webbridge-native/preset` | One-call setup bundle | Stable |
| `@webbridge-native/adapter-axios` | Axios adapter | Stable |
| `@webbridge-native/adapter-react-query` | React Query integration | Stable |

## Quick Start

```bash
pnpm add @webbridge-native/preset
```

```typescript
import { setupWebBridge } from '@webbridge-native/preset';

const { client } = setupWebBridge({
  cookies: true,
  headers: { userAgent: 'browser-like' },
});

// Cookies auto-managed, headers auto-injected
const res = await client.fetch('https://api.example.com/me');
```

### MSW-compatible Mocking

```typescript
import { setupServer, http, HttpResponse } from '@webbridge-native/mock';

const server = setupServer(
  http.get('https://api.example.com/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'Alice' });
  }),
);

server.listen();
```

### Individual Package Usage

```typescript
import { WebBridgeClient } from '@webbridge-native/core';
import { CookieJar, cookieInterceptor } from '@webbridge-native/cookies';
import { cacheInterceptor, HttpCache } from '@webbridge-native/cache';
import { redirectInterceptor } from '@webbridge-native/redirect';

const client = new WebBridgeClient();
const jar = new CookieJar();
const cache = new HttpCache();

client.use(redirectInterceptor());
client.use(cookieInterceptor({ jar }));
client.use(cacheInterceptor({ cache }));
client.use(terminalInterceptor); // your network layer
```

### Axios Integration

```typescript
import axios from 'axios';
import { createAxiosAdapter } from '@webbridge-native/adapter-axios';

const { client } = setupWebBridge({ cookies: true });
const api = axios.create({
  adapter: createAxiosAdapter(client),
});
```

### React Query Integration

```typescript
import { useQuery } from '@tanstack/react-query';
import { createFetcher } from '@webbridge-native/adapter-react-query';

const fetcher = createFetcher(client, { baseURL: 'https://api.example.com' });

function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: ({ signal }) => fetcher.json(`/users/${id}`, { signal }),
  });
}
```

## Requirements

- React Native 0.73+
- iOS 13.0+
- Android API 24+
- New Architecture enabled

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Layer 4: Developer-Facing API                       │
│  MSW DSL, setupWebBridge, DevTools, Adapters        │
├─────────────────────────────────────────────────────┤
│ Layer 3: Web Semantics Engine                       │
│  CookieJar, HttpCache, CORS, HeaderNormalizer       │
├─────────────────────────────────────────────────────┤
│ Layer 2: Request Pipeline                           │
│  Interceptor chain, redirect handler                │
├─────────────────────────────────────────────────────┤
│ Layer 1: Native Network Bridge                      │
│  NSURLProtocol (iOS) / OkHttp Interceptor (Android) │
└─────────────────────────────────────────────────────┘
```

## Testing

```bash
pnpm install
pnpm verify          # typecheck + lint + test (354 tests)
pnpm harness:all     # harness tests
```

## Validated Scenarios

354 tests across 13 packages covering:
- SSO login with 5-step redirect chain
- Token refresh race condition (1 refresh for 10 concurrent requests)
- Public Suffix List security (21 domains)
- Cross-origin credential stripping
- ETag 304 conditional requests
- Vary header cache separation (5 languages)
- 500 concurrent requests
- 10,000 sequential requests with bounded memory

See [docs/VALIDATION_REPORT_2026-04-28.md](docs/VALIDATION_REPORT_2026-04-28.md) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
