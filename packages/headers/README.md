# @webbridge-native/headers

> Browser-like header auto-injection for React Native.

## Installation

```bash
pnpm add @webbridge-native/headers @webbridge-native/core
```

## Usage

```typescript
import { WebBridgeClient } from '@webbridge-native/core';
import { headerInterceptor } from '@webbridge-native/headers';

const client = new WebBridgeClient();

client.use(headerInterceptor({
  userAgent: 'browser-like',        // or 'native' or 'MyApp/2.0'
  acceptLanguage: 'auto',           // or 'ko-KR' or false
  acceptEncoding: true,             // gzip, deflate
  accept: true,                     // browser-like Accept header
  origin: 'https://myapp.local',    // optional Origin header
}));

client.use(terminalInterceptor);

// Headers auto-injected (never overwrites existing headers)
const res = await client.fetch('https://api.example.com/data');
```

### Options

| Option | Default | Description |
|---|---|---|
| `userAgent` | `'browser-like'` | `'browser-like'` / `'native'` / custom string / `false` |
| `acceptLanguage` | `'auto'` | `'auto'` / locale string / `false` |
| `acceptEncoding` | `true` | `true` / `false` |
| `accept` | `true` | `true` / `false` |
| `origin` | `false` | Origin URL string / `false` |

## License

MIT
