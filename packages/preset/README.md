# @webbridge-native/preset

> One-call setup for WebBridge Native. Batteries included.

## Installation

```bash
pnpm add @webbridge-native/preset
```

## Usage

```typescript
import { setupWebBridge } from '@webbridge-native/preset';

const { client, cookieJar, dispose } = setupWebBridge({
  cookies: true,                          // auto cookie management
  headers: { userAgent: 'browser-like' }, // auto header injection
  mock: {                                 // optional: MSW-compatible mocking
    handlers: [
      http.get('/api/users', () => HttpResponse.json([])),
    ],
  },
});

// All features active
const res = await client.fetch('https://api.example.com/me');

// Clean up
dispose();
```

### Options

| Option | Default | Description |
|---|---|---|
| `cookies` | `true` | `true` / `false` / `{ persistent: true }` |
| `headers` | auto | `HeaderInterceptorOptions` / `false` |
| `mock` | none | `{ handlers: RequestHandler[] }` / `false` |
| `interceptors` | none | Additional custom interceptors |
| `skipDefaultTerminal` | `false` | Skip globalThis.fetch terminal |

### Re-exports

Preset re-exports commonly used types for convenience:

```typescript
import {
  WebBridgeClient, CookieJar, headerInterceptor,
  setupServer, http, HttpResponse,
} from '@webbridge-native/preset';
```

## License

MIT
