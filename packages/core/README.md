# @webbridge-native/core

> Core interfaces, interceptor chain, and utilities for WebBridge Native.

## Installation

```bash
pnpm add @webbridge-native/core
```

## Usage

### Interceptor Chain

```typescript
import { WebBridgeClient } from '@webbridge-native/core';
import type { Interceptor } from '@webbridge-native/core';

const client = new WebBridgeClient();

// Add interceptors in order — they execute sequentially
const loggingInterceptor: Interceptor = async (request, next) => {
  console.log(`${request.method} ${request.url}`);
  const response = await next(request);
  console.log(`${response.status} ${response.url}`);
  return response;
};

client.use(loggingInterceptor);
client.use(terminalInterceptor); // last one must not call next()

const response = await client.fetch('https://api.example.com/users');
```

### Creating Requests and Responses

```typescript
import { createRequest, createResponse } from '@webbridge-native/core';

const request = createRequest('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice' }),
});

const response = createResponse({
  status: 200,
  headers: { 'Content-Type': 'application/json' },
  body: '{"id": 1}',
});
```

### Header Utilities (Case-Insensitive)

```typescript
import { getHeader, hasHeader, setHeaderIfAbsent, deleteHeader } from '@webbridge-native/core';

const headers = { 'Content-Type': 'application/json' };

getHeader(headers, 'content-type');     // 'application/json'
hasHeader(headers, 'CONTENT-TYPE');     // true
setHeaderIfAbsent(headers, 'Accept', '*/*'); // adds Accept
deleteHeader(headers, 'content-type');  // removes Content-Type
```

## API Reference

### `WebBridgeClient`
- `use(interceptor)` — Register an interceptor (chainable)
- `fetch(url, init?)` — Execute request through interceptor chain

### Types
- `WebBridgeRequest` — Request object with `id`, `url`, `method`, `headers`, `body`, `signal`
- `WebBridgeResponse` — Response object with `status`, `headers`, `body`, `ok`, `redirected`
- `Interceptor` — `(request, next) => Promise<Response>`
- `WebBridgeRequestInit` — Fetch-compatible init options

## License

MIT
