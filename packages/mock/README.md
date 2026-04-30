# @webbridge-native/mock

MSW v2 compatible API mocking for React Native, with full DevTools visibility.

## Why

MSW works great in browsers and Node.js, but mock responses are invisible in React Native's DevTools Network tab. `msw/native` does not solve this either. This package provides the same MSW v2 DSL while routing through the native layer so every mock response appears in DevTools.

## Installation

```bash
pnpm add @webbridge-native/mock @webbridge-native/core
```

## Usage

```typescript
import { setupServer, http, HttpResponse } from '@webbridge-native/mock';

const server = setupServer(
  http.get('https://api.example.com/users', () =>
    HttpResponse.json([{ id: 1, name: 'Alice' }]),
  ),
  http.get('https://api.example.com/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'Alice' }),
  ),
  http.post('https://api.example.com/users', () =>
    HttpResponse.json({ id: 3 }, { status: 201 }),
  ),
);

server.listen();        // Enable mocking
server.close();         // Disable mocking
server.resetHandlers(); // Restore initial handlers
```

### Migrating from MSW

```diff
- import { setupServer, http, HttpResponse } from 'msw/node';
+ import { setupServer, http, HttpResponse } from '@webbridge-native/mock';
// Handler code remains unchanged
```

## License

MIT
