# @webbridge-native/redirect

> Browser-compatible redirect handling for React Native.

## Installation

```bash
pnpm add @webbridge-native/redirect @webbridge-native/core
```

## Usage

```typescript
import { WebBridgeClient } from '@webbridge-native/core';
import { redirectInterceptor } from '@webbridge-native/redirect';

const client = new WebBridgeClient();
client.use(redirectInterceptor());
client.use(terminalInterceptor);

// Automatically follows redirects (max 5)
const res = await client.fetch('https://example.com/old-page');
// res.redirected === true
// res.url === 'https://example.com/new-page'

// Manual mode — get the redirect response as-is
const res = await client.fetch('https://example.com/old', { redirect: 'manual' });
// res.status === 301

// Error mode — throw on redirect
await client.fetch('https://example.com/old', { redirect: 'error' });
// TypeError: Redirect response (301) received with redirect mode "error"
```

## Behavior

| Status | Method Change | Body |
|---|---|---|
| 301, 302, 303 | → GET | Removed |
| 307, 308 | Preserved | Preserved |

### Security
- Cross-origin redirects automatically strip: `Authorization`, `Cookie`, `Proxy-Authorization`
- Invalid Location header throws `TypeError`
- Max 5 redirects (throws on exceed)

## License

MIT
