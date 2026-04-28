# @webbridge-native/cors

> Dev-only CORS simulator for React Native.

## Installation

```bash
pnpm add @webbridge-native/cors @webbridge-native/core
```

## Usage

```typescript
import { corsInterceptor } from '@webbridge-native/cors';

client.use(corsInterceptor({
  origin: 'https://myapp.local',
  mode: 'warn',    // 'warn' (default) or 'enforce'
}));

// warn: logs CORS violations to console, allows request
// enforce: throws TypeError on CORS violation
```

**Production**: Remove with `@webbridge-native/babel-plugin-strip-dev`.

## License

MIT
