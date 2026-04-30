# WebBridge Native

[![CI](https://github.com/kaeuhy/webbridge-native/actions/workflows/ci.yml/badge.svg)](https://github.com/kaeuhy/webbridge-native/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@webbridge-native/core)](https://www.npmjs.com/package/@webbridge-native/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Web platform for React Native** -- Browser-grade networking, Web APIs, and developer tools that work exactly like they do on the web.

## The Problem

React Native runs JavaScript, but ships without most of the Web APIs that browsers provide out of the box.

| Web API | Browser | React Native | WebBridge Native |
|---|---|---|---|
| `response.json()` / `.text()` / `.clone()` | Built-in | Incomplete | **`WBResponse`** |
| `new Headers()` (case-insensitive, iterable) | Built-in | Incomplete | **`WBHeaders`** |
| `TextEncoder` / `TextDecoder` | Built-in | Missing in Hermes | **Polyfill** |
| `ReadableStream` / `WritableStream` | Built-in | Partial | **Polyfill** |
| `AbortSignal.timeout()` | Built-in | Missing | **Polyfill** |
| `atob()` / `btoa()` | Built-in | Missing | **Polyfill** |
| Cookie management (Set-Cookie -> Cookie) | Automatic | Unstable | **RFC 6265** |
| HTTP cache (Cache-Control, ETag) | Automatic | Missing | **RFC 7234** |
| User-Agent, Accept-Language headers | Automatic | Missing | **Auto-injected** |
| Redirect header stripping | Automatic | Missing | **Browser-identical** |
| DevTools Network tab | Automatic | Partial | **Full visibility (incl. mocks)** |
| MSW-compatible mocking | Service Worker | No worker | **Pure-JS mocking** |

WebBridge Native closes these gaps so web developers can use the same patterns in React Native that they already use in the browser.

## Features

- **Spec-compliant Web APIs** -- Headers, Response, Request, Streams, Encoding, Crypto, Storage, and more
- **Automatic cookie management** -- RFC 6265 compliant, including SameSite, HttpOnly, and persistent storage
- **HTTP caching** -- RFC 7234 compliant with ETag, Last-Modified, stale-while-revalidate
- **MSW-compatible mocking** -- Same DSL as MSW v2, with full DevTools visibility
- **Native bridge** -- Every request flows through the native layer (NSURLProtocol / OkHttp) for DevTools inspection
- **Opt-in/opt-out** -- Every feature is a separate package. Use only what you need
- **Production-safe** -- Dev-only features are automatically stripped via Babel plugin
- **Adapter support** -- Drop-in integration with axios and React Query

## Packages

### Layer 0 -- Web API Polyfills

| Package | Description |
|---|---|
| [`@webbridge-native/web-api`](packages/web-api) | Fetch API -- WBHeaders, WBResponse, WBRequest, FormData serializer, AbortSignal.timeout |
| [`@webbridge-native/encoding`](packages/encoding) | WHATWG Encoding -- TextEncoder, TextDecoder, atob, btoa |
| [`@webbridge-native/streams`](packages/streams) | WHATWG Streams -- ReadableStream, WritableStream, TransformStream |
| [`@webbridge-native/crypto`](packages/crypto) | Web Crypto -- getRandomValues, randomUUID |
| [`@webbridge-native/storage`](packages/storage) | Web Storage -- localStorage, sessionStorage |
| [`@webbridge-native/broadcast`](packages/broadcast) | BroadcastChannel -- cross-component messaging |
| [`@webbridge-native/observers`](packages/observers) | Performance API -- mark/measure, PerformanceObserver, requestIdleCallback |

### Layer 1 -- Native Bridge

| Package | Description |
|---|---|
| [`@webbridge-native/native-bridge`](packages/native-bridge) | iOS/Android DevTools visibility via NSURLProtocol + OkHttp TurboModule |

### Layer 2 -- Request Pipeline

| Package | Description |
|---|---|
| [`@webbridge-native/core`](packages/core) | Interceptor chain, WebBridgeClient, Request/Response types |

### Layer 3 -- Browser Semantics

| Package | Description |
|---|---|
| [`@webbridge-native/cookies`](packages/cookies) | RFC 6265 automatic cookie management |
| [`@webbridge-native/cache`](packages/cache) | RFC 7234 HTTP caching |
| [`@webbridge-native/headers`](packages/headers) | User-Agent, Accept-Language auto-injection |
| [`@webbridge-native/redirect`](packages/redirect) | 301-308 redirect handling (browser-identical) |
| [`@webbridge-native/cors`](packages/cors) | CORS preflight detection (dev-only) |
| [`@webbridge-native/sse`](packages/sse) | W3C EventSource polyfill |

### Layer 4 -- Developer API

| Package | Description |
|---|---|
| [`@webbridge-native/preset`](packages/preset) | One-line setup -- cookies + headers + mock + native-bridge bundle |
| [`@webbridge-native/mock`](packages/mock) | MSW v2 compatible mock server |
| [`@webbridge-native/devtools`](packages/devtools) | In-app network inspector |
| [`@webbridge-native/adapter-axios`](packages/adapter-axios) | axios integration |
| [`@webbridge-native/adapter-react-query`](packages/adapter-react-query) | React Query integration |

## Quick Start

### 1. Install

```bash
pnpm add @webbridge-native/preset
```

### 2. Configure

```typescript
import { setupWebBridge } from '@webbridge-native/preset';

const { client } = setupWebBridge({
  cookies: true,
  headers: { userAgent: 'browser-like' },
  nativeBridge: true,
});
```

### 3. Use it like a browser

```typescript
// Login -- Set-Cookie is automatically stored
await client.fetch('https://api.example.com/login', {
  method: 'POST',
  body: JSON.stringify({ email: 'user@example.com', password: 'secret' }),
});

// Authenticated request -- Cookie header is automatically attached
const res = await client.fetch('https://api.example.com/me');
```

### 4. Web APIs

```typescript
import { WBHeaders, WBResponse } from '@webbridge-native/web-api';
import { WBTextEncoder, WBTextDecoder } from '@webbridge-native/encoding';

// Spec-compliant Headers (case-insensitive, iterable)
const headers = new WBHeaders({ 'Content-Type': 'application/json' });
headers.append('Accept', 'text/html');
console.log(headers.get('content-type')); // case-insensitive lookup

// TextEncoder / TextDecoder
const encoder = new WBTextEncoder();
const decoder = new WBTextDecoder();
const bytes = encoder.encode('Hello');
const text = decoder.decode(bytes); // 'Hello'
```

### 5. MSW-Compatible Mocking

```typescript
import { setupWebBridge, http, HttpResponse } from '@webbridge-native/preset';

const { client } = setupWebBridge({
  mock: {
    handlers: [
      http.get('https://api.example.com/users/:id', ({ params }) =>
        HttpResponse.json({ id: params.id, name: 'Alice' }),
      ),
    ],
  },
  nativeBridge: true, // Mock responses are visible in DevTools
});
```

### 6. axios / React Query Integration

```typescript
// axios
import { createAxiosAdapter } from '@webbridge-native/adapter-axios';
const api = axios.create({ adapter: createAxiosAdapter(client) });

// React Query
import { createFetcher } from '@webbridge-native/adapter-react-query';
const fetcher = createFetcher(client, { baseURL: 'https://api.example.com' });
```

## Requirements

- **React Native** 0.76+ (New Architecture)
- **Hermes** engine
- iOS 15.1+ / Android API 24+
- Expo SDK 52+

## Architecture

```
Layer 0: Web API Polyfills (web-api, encoding, streams, crypto, storage, broadcast, observers)
    |
Layer 1: Native Bridge (TurboModule -- DevTools visibility)
    |
Layer 2: Request Pipeline (interceptor chain)
    |
Layer 3: Browser Semantics (cookies, cache, headers, redirect, cors, sse)
    |
Layer 4: Developer API (preset, mock, devtools, adapters)
```

Every layer is opt-in. Pick only the packages you need.

## Battle-Tested

Validated against production React Native app patterns:

- 30+ REST API endpoint simulations
- Login/signup with token refresh and authenticated API calls
- Real-time data streams (SSE) and chat-style messaging
- React Query parallel requests (`Promise.all`)
- Error handling (401 auto-refresh, 5xx retry, network errors)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
