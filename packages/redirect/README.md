# @webbridge-native/redirect

Browser-identical redirect handling for React Native.

## Why

React Native's default redirect behavior differs from browsers: `redirect: 'manual'` is unreliable, and cross-origin redirects leak `Authorization` headers -- a **token exposure risk**.

This package implements the Fetch spec's redirect algorithm exactly as browsers do.

## Installation

```bash
pnpm add @webbridge-native/redirect @webbridge-native/core
```

## Usage

```typescript
import { redirectInterceptor } from '@webbridge-native/redirect';

client.use(redirectInterceptor());

// Automatic follow (up to 5 hops)
const res = await client.fetch('https://api.example.com/old-endpoint');
// res.redirected === true, res.url === final URL
```

## Redirect Behavior

| Status | Method Change | Security |
|---|---|---|
| 301, 302, 303 | Changes to GET, body removed | Strips Auth/Cookie on cross-origin |
| 307, 308 | Method preserved | Strips Auth/Cookie on cross-origin |

- `redirect: 'manual'` -- Returns the 3xx response as-is
- `redirect: 'error'` -- Throws on 3xx

## License

MIT
