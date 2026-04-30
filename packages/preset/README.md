# @webbridge-native/preset

One-line browser networking setup for React Native.

## Installation

```bash
pnpm add @webbridge-native/preset
```

For native bridge (DevTools visibility):

```bash
pnpm add @webbridge-native/native-bridge
cd ios && pod install
```

## Usage

```typescript
import { setupWebBridge, http, HttpResponse } from '@webbridge-native/preset';

const { client, cookieJar, dispose } = setupWebBridge({
  cookies: true,                          // Automatic cookie management
  headers: { userAgent: 'browser-like' }, // Browser-like headers
  mock: {                                 // Optional: MSW-compatible mocking
    handlers: [
      http.get('/api/users', () => HttpResponse.json([])),
    ],
  },
  nativeBridge: true,                     // Show requests in DevTools Network tab
});

// Use it like a browser
const res = await client.fetch('https://api.example.com/me');

// Cleanup
dispose();
```

## Options

| Option | Default | Description |
|---|---|---|
| `cookies` | `true` | Automatic cookie management / `{ persistent: true }` / `false` |
| `headers` | auto | Header options / `false` |
| `mock` | none | `{ handlers: [...] }` MSW handlers / `false` |
| `nativeBridge` | `false` | Enable native bridge for DevTools visibility / `{ timeoutMs: 5000 }` |
| `interceptors` | none | Additional interceptors array |
| `skipDefaultTerminal` | `false` | Disable the default fetch terminal |

### Native Bridge Option

When `nativeBridge: true`:
- All requests flow through the native HTTP layer (iOS NSURLProtocol / Android OkHttp)
- Mock responses appear as real network requests in RN DevTools Network tab
- Requires `@webbridge-native/native-bridge` to be installed
- Falls back to `globalThis.fetch` if the native module is not linked (no functional difference, only DevTools visibility is disabled)

## Return Value

| Property | Type | Description |
|---|---|---|
| `client` | `WebBridgeClient` | Configured HTTP client |
| `cookieJar` | `CookieJar \| null` | Cookie jar (when cookies enabled) |
| `mockServer` | `MockServer \| null` | Mock server (when mock enabled) |
| `dispose()` | `() => void` | Clean up all resources |

## License

MIT
