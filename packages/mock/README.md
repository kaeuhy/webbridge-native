# @webbridge-native/mock

> MSW v2 compatible mocking for React Native. Same DSL, native DevTools visibility.

## Installation

```bash
pnpm add @webbridge-native/mock @webbridge-native/core
```

## Usage

### Basic Mock Server

```typescript
import { setupServer, http, HttpResponse } from '@webbridge-native/mock';

const server = setupServer(
  http.get('https://api.example.com/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  }),

  http.get('https://api.example.com/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'Alice' });
  }),

  http.post('https://api.example.com/users', ({ request }) => {
    return HttpResponse.json({ id: 3 }, { status: 201 });
  }),
);

server.listen();  // activate
server.close();   // deactivate
```

### With WebBridgeClient

```typescript
import { WebBridgeClient } from '@webbridge-native/core';

const client = new WebBridgeClient();
client.use(server.createInterceptor());
client.use(fallbackInterceptor); // for unmatched requests

const res = await client.fetch('https://api.example.com/users/42');
// { id: '42', name: 'Alice' }
```

### Runtime Handler Override

```typescript
// Override for a specific test
server.use(
  http.get('https://api.example.com/users', () => {
    return HttpResponse.json([]); // empty list
  }),
);

// Reset to initial handlers
server.resetHandlers();
```

### Response Types

```typescript
HttpResponse.json({ data: 'value' });                  // JSON
HttpResponse.json({ error: 'not found' }, { status: 404 }); // with status
HttpResponse.text('Hello, World!');                     // Plain text
HttpResponse.error();                                   // Network error
```

### URL Patterns

```typescript
http.get('https://api.example.com/users',          handler); // exact
http.get('https://api.example.com/users/:id',      handler); // path param
http.get('https://api.example.com/users/:id/posts/:postId', handler); // multiple params
http.get('https://api.example.com/*',              handler); // wildcard
```

### Unhandled Request Strategy

```typescript
const server = setupServer(/* handlers */);
// Options: 'warn' (default), 'error', 'bypass'
const server = new MockServer(handlers, { onUnhandledRequest: 'error' });
```

## MSW Migration

```diff
- import { setupServer, http, HttpResponse } from 'msw/node';
+ import { setupServer, http, HttpResponse } from '@webbridge-native/mock';

// Your handlers work as-is. No other changes needed.
```

## License

MIT
