# @webbridge-native/cookies

> RFC 6265 compliant cookie jar for React Native. Automatic cookie management like a browser.

## Installation

```bash
pnpm add @webbridge-native/cookies @webbridge-native/core
```

## Usage

### Basic Cookie Jar

```typescript
import { CookieJar } from '@webbridge-native/cookies';

const jar = new CookieJar();

// Store a cookie from Set-Cookie header
await jar.setCookie(
  'session=abc123; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400',
  'https://api.example.com'
);

// Get Cookie header for a URL
const header = await jar.getCookieHeader('https://api.example.com/users');
// → 'session=abc123'

// Get all matching cookies as objects
const cookies = await jar.getCookies('https://api.example.com/users');

// Clear cookies
await jar.clear();              // all cookies
await jar.clear('example.com'); // specific domain only

// Clean up (clear timers)
jar.dispose();
```

### As an Interceptor

```typescript
import { WebBridgeClient } from '@webbridge-native/core';
import { CookieJar, cookieInterceptor } from '@webbridge-native/cookies';

const jar = new CookieJar();
const client = new WebBridgeClient();

client.use(cookieInterceptor({ jar }));
client.use(terminalInterceptor);

// Cookies are automatically managed:
// - Set-Cookie from responses → saved to jar
// - Cookie header → auto-attached to requests
const res = await client.fetch('https://api.example.com/login', {
  method: 'POST',
  body: JSON.stringify({ email: 'user@example.com', password: 'pass' }),
});
// Set-Cookie from login response is automatically stored

const me = await client.fetch('https://api.example.com/me');
// Cookie header is automatically attached
```

### Persistent Storage

```typescript
import { PersistentCookieStore } from '@webbridge-native/cookies';
import type { PersistenceAdapter } from '@webbridge-native/cookies';

// Implement adapter for your storage (MMKV, AsyncStorage, etc.)
const mmkvAdapter: PersistenceAdapter = {
  getItem: (key) => mmkv.getString(key) ?? null,
  setItem: (key, value) => mmkv.set(key, value),
  removeItem: (key) => mmkv.delete(key),
};

const store = new PersistentCookieStore(mmkvAdapter);
// Cookies survive app restart
```

## Features

- RFC 6265 compliant parsing and matching
- SameSite (Strict, Lax, None) enforcement
- SameSite=None automatically forces Secure
- HttpOnly, Secure flag support
- Public Suffix List validation (prevents supercookie attacks)
- Domain matching (RFC 6265 §5.1.3)
- Path matching (RFC 6265 §5.1.4)
- Max-Age / Expires with Max-Age priority
- Per-domain limit (50 cookies) and global limit (3000)
- Multiple Set-Cookie header support via rawHeaders

## License

MIT
