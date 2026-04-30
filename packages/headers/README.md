# @webbridge-native/headers

Automatic browser-like header injection for React Native requests.

## Why

Browsers automatically set `User-Agent`, `Accept-Language`, and `Accept-Encoding` on every request. React Native's fetch either omits these headers entirely or sends native-level values like `CFNetwork/okhttp` that servers may reject or handle differently.

## Installation

```bash
pnpm add @webbridge-native/headers @webbridge-native/core
```

## Usage

```typescript
import { headerInterceptor } from '@webbridge-native/headers';

client.use(headerInterceptor({
  userAgent: 'browser-like',    // Mozilla/5.0-compatible UA string
  acceptLanguage: 'auto',       // Device locale
  acceptEncoding: true,          // gzip, deflate
  origin: 'https://myapp.com',  // Origin header (optional)
}));
```

## API Reference

| Option | Default | Description |
|---|---|---|
| `userAgent` | `'browser-like'` | `'browser-like'` / `'native'` / custom string / `false` |
| `acceptLanguage` | `'auto'` | `'auto'` / locale string / `false` |
| `acceptEncoding` | `true` | Adds gzip, deflate |
| `origin` | `false` | Origin URL / `false` |

Headers that are already set on the request are never overwritten.

## License

MIT
