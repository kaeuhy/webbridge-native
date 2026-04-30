# @webbridge-native/cors

CORS preflight detection for React Native. Dev-only.

## Why

React Native does not enforce CORS, so cross-origin issues go unnoticed during mobile development. When you later ship a web version, CORS errors surface too late. This interceptor simulates browser CORS behavior during development so you catch problems early.

## Installation

```bash
pnpm add @webbridge-native/cors @webbridge-native/core
```

## Usage

```typescript
import { corsInterceptor } from '@webbridge-native/cors';

if (__DEV__) {
  client.use(corsInterceptor({
    origin: 'https://myapp.com',
    mode: 'warn',    // 'warn' or 'enforce'
  }));
}
```

**Production**: Automatically stripped by `@webbridge-native/babel-plugin-strip-dev`.

## License

MIT
