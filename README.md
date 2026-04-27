# WebBridge Native

[![CI](https://github.com/kaeuhy/webbridge-native/actions/workflows/ci.yml/badge.svg)](https://github.com/kaeuhy/webbridge-native/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Browser-compatible networking for React Native

---

## What is this?

`fetch()` works perfectly in the browser — cookies are stored automatically, `User-Agent` is set, `Cache-Control` is respected, and everything shows up in DevTools. In React Native, none of this is guaranteed.

**WebBridge Native** bridges that gap. It brings browser networking semantics to React Native through native-level interception, not JS monkey-patching.

## Key Features

- **Cookie Jar** — RFC 6265 compliant, automatic management with persistence
- **Header Normalizer** — Browser-like User-Agent, Accept-Language, Origin injection
- **MSW-compatible Mock** — Same DSL as MSW v2, but visible in RN DevTools
- **Native Visibility** — All requests go through NSURLProtocol (iOS) / OkHttp Interceptor (Android)
- **Opt-out Friendly** — Use only what you need

## Packages

| Package | Description | Tier |
|---|---|---|
| `@webbridge-native/core` | Core interfaces, types, pipeline | 1 |
| `@webbridge-native/native-bridge` | iOS/Android native modules | 1 |
| `@webbridge-native/cookies` | RFC 6265 cookie jar | 1 |
| `@webbridge-native/headers` | Header normalizer | 1 |
| `@webbridge-native/mock` | MSW-compatible mocking | 1 |
| `@webbridge-native/cache` | HTTP cache (RFC 7234) | 2 |
| `@webbridge-native/redirect` | Redirect handler | 2 |
| `@webbridge-native/devtools` | DevTools panel | 2 |
| `@webbridge-native/cors` | CORS simulator (dev-only) | 3 |
| `@webbridge-native/sse` | EventSource polyfill | 3 |
| `@webbridge-native/preset` | Tier 1 convenience bundle | - |

## Quick Start

```bash
# Install
pnpm add @webbridge-native/preset

# Or individual packages
pnpm add @webbridge-native/cookies @webbridge-native/mock
```

```typescript
import { setupWebBridge } from '@webbridge-native/preset';

setupWebBridge({
  cookies: true,
  headers: { userAgent: 'browser-like' },
});
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
// Mock responses are visible in RN DevTools Network tab
```

## Requirements

- React Native 0.73+ (New Architecture enabled)
- iOS 13.0+
- Android API 24+

### Enabling New Architecture

**iOS:**
```bash
RCT_NEW_ARCH_ENABLED=1 pod install
```

**Android:**
```properties
# android/gradle.properties
newArchEnabled=true
```

## Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm typecheck

# Run all checks
pnpm verify

# Run harness tests
pnpm harness:all
```

## Architecture

```
Layer 4: Developer-Facing API (MSW DSL, fetch, DevTools)
Layer 3: Web Semantics Engine (Cookie, Cache, CORS, Headers)
Layer 2: Request Pipeline (Interceptor chain)
Layer 1: Native Network Bridge (NSURLProtocol / OkHttp)
```

See [bootstrap/03-ARCHITECTURE.md](bootstrap/03-ARCHITECTURE.md) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) (coming soon).

## License

MIT
