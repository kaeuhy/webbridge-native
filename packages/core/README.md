# @webbridge-native/core

The networking pipeline for React Native. Composes browser semantics through an interceptor chain.

## Why

React Native's `fetch()` does not automatically handle cookies, caching, or headers the way browsers do. Bolting each feature on individually leads to ordering conflicts and brittle glue code.

## Installation

```bash
pnpm add @webbridge-native/core
```

## Usage

```typescript
import { WebBridgeClient } from '@webbridge-native/core';
import type { Interceptor } from '@webbridge-native/core';

const client = new WebBridgeClient();

// Register interceptors in order
client.use(headerInterceptor());   // 1. Header injection
client.use(cookieInterceptor());   // 2. Cookie management
client.use(cacheInterceptor());    // 3. Caching
client.use(terminalInterceptor);   // 4. Actual network request

// Fetch just like a browser
const res = await client.fetch('https://api.example.com/users');
```

### Writing a Custom Interceptor

```typescript
const loggingInterceptor: Interceptor = async (request, next) => {
  console.log(`>> ${request.method} ${request.url}`);
  const response = await next(request);
  console.log(`<< ${response.status}`);
  return response;
};
```

### Header Utilities (case-insensitive)

```typescript
import { getHeader, hasHeader, deleteHeader } from '@webbridge-native/core';

getHeader(headers, 'content-type');  // Case-insensitive lookup
hasHeader(headers, 'authorization'); // Check existence
deleteHeader(headers, 'cookie');     // Remove header
```

## API Reference

| Export | Description |
|---|---|
| `WebBridgeClient` | HTTP client with `use()` and `fetch()` |
| `Interceptor` | `(request, next) => Promise<Response>` |
| `createRequest()` | Request factory |
| `createResponse()` | Response factory |
| `getHeader()` | Case-insensitive header lookup |
| `hasHeader()` | Check if header exists |
| `setHeaderIfAbsent()` | Set header only if not already present |
| `deleteHeader()` | Remove a header |

## License

MIT
