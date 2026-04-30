# @webbridge-native/cookies

Automatic cookie management for React Native, just like a browser. RFC 6265 compliant.

## Why

Browsers automatically store `Set-Cookie` headers and attach `Cookie` headers to subsequent requests. React Native does not. As the RN docs note: *"Cookie based authentication is currently unstable."*

This package provides an RFC 6265 compliant `CookieJar` that handles cookie management identically to a browser.

## Installation

```bash
pnpm add @webbridge-native/cookies @webbridge-native/core
```

## Usage

### As an Interceptor (recommended)

```typescript
import { CookieJar, cookieInterceptor } from '@webbridge-native/cookies';

const jar = new CookieJar();
client.use(cookieInterceptor({ jar }));

// Now it works like a browser:
// 1. Login response Set-Cookie -> automatically stored
// 2. Next request Cookie header -> automatically attached
await client.fetch('https://api.example.com/login', { method: 'POST', body: '...' });
await client.fetch('https://api.example.com/me'); // Cookie attached automatically
```

### Direct API

```typescript
const jar = new CookieJar();
await jar.setCookie('session=abc; Path=/; HttpOnly; Secure', 'https://api.example.com');
const header = await jar.getCookieHeader('https://api.example.com/users');
// -> 'session=abc'
```

### Persistent Storage (survive app restarts)

```typescript
import { PersistentCookieStore } from '@webbridge-native/cookies';

const store = new PersistentCookieStore({
  getItem: (key) => mmkv.getString(key) ?? null,
  setItem: (key, value) => mmkv.set(key, value),
  removeItem: (key) => mmkv.delete(key),
});
```

## Browser-Compatible Features

- SameSite (Strict, Lax, None) -- None enforces Secure
- HttpOnly, Secure flags
- Domain/Path matching (RFC 6265 SS5.1.3, SS5.1.4)
- Max-Age / Expires (Max-Age takes precedence)
- Public Suffix validation (prevents supercookie attacks)
- Multiple Set-Cookie headers
- Per-domain limit of 50 cookies, global limit of 3000

## License

MIT
