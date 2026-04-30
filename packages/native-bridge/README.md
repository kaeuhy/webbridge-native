# @webbridge-native/native-bridge

Native bridge that makes every request visible in the RN DevTools Network tab.

## Why

JS-only mocking libraries like MSW bypass the native layer entirely, so mock responses never appear in React Native DevTools. This package acts as **the React Native equivalent of a browser Service Worker** -- it routes requests through the native HTTP layer (NSURLProtocol on iOS, OkHttp on Android) so DevTools can inspect them, then delegates to JS handlers for response generation.

```
Without native-bridge:
  JS fetch() -> MSW intercept -> fake response (DevTools: nothing)

With native-bridge:
  JS fetch() -> Native layer (DevTools watches) -> Bridge -> JS handler -> synthetic response (DevTools: visible)
```

## Installation

```bash
pnpm add @webbridge-native/native-bridge
```

iOS:
```bash
cd ios && pod install
```

## Usage

### With Preset (recommended)

```typescript
import { setupWebBridge, http, HttpResponse } from '@webbridge-native/preset';

const { client, dispose } = setupWebBridge({
  cookies: true,
  headers: { userAgent: 'browser-like' },
  mock: {
    handlers: [
      http.get('https://api.example.com/users', () =>
        HttpResponse.json([{ id: 1, name: 'Alice' }]),
      ),
    ],
  },
  nativeBridge: true, // Enable DevTools visibility
});

const res = await client.fetch('https://api.example.com/users');
// This request is visible in RN DevTools Network tab

dispose();
```

### Standalone

```typescript
import { WebBridgeClient } from '@webbridge-native/core';
import { createNativeBridgeInterceptor } from '@webbridge-native/native-bridge';
import { MockServer, http, HttpResponse } from '@webbridge-native/mock';

const server = new MockServer([
  http.get('https://api.example.com/users', () =>
    HttpResponse.json([{ id: 1, name: 'Alice' }]),
  ),
]);
server.listen();

const client = new WebBridgeClient();
const bridge = createNativeBridgeInterceptor({
  mockServer: server,
  timeoutMs: 5000,
});

client.use(bridge); // Register as terminal interceptor

const res = await client.fetch('https://api.example.com/users');
// Request/response visible in DevTools

bridge.dispose();
server.close();
```

## Options

| Option | Default | Description |
|---|---|---|
| `mockServer` | -- | MockServer instance for handler matching |
| `requestHandler` | -- | Custom request handler (takes priority over MockServer) |
| `timeoutMs` | `5000` | JS handler response timeout (ms) |
| `fallbackToFetch` | `true` | Fall back to `globalThis.fetch` when the native module is not linked |

## Architecture

```
JS interceptor chain (headers -> cookies -> custom)
  -> nativeBridgeInterceptor (terminal)
    -> Native HTTP layer (DevTools inspection point)
    -> iOS: NSURLProtocol / Android: OkHttp Network Interceptor
    -> Bridge: emits "handler needed?" event to JS
    -> JS: findHandler() matching
    -> Mock response -> synthetic response returned via Native (visible in DevTools)
    -> Or no handler match -> real network request proceeds
```

### Platform Implementation

| Platform | Interceptor | Async Strategy |
|---|---|---|
| **iOS** | `NSURLProtocol` subclass | Callback-based (startLoading is already async) |
| **Android** | OkHttp **Network** Interceptor | `CompletableFuture.get(5s)` (blocks worker thread) |

### Fallback Mode

In environments where the native module is not linked (tests, Expo Go, etc.), the bridge automatically falls back to `globalThis.fetch`. Functionality is identical -- only DevTools visibility is disabled.

## Concurrency

Handles 50+ concurrent requests safely:
- **JS**: `Map`-based registry (single-threaded)
- **Android**: `ConcurrentHashMap` + `CompletableFuture`
- **iOS**: `DispatchQueue` with barrier writes

## Requirements

- React Native 0.73+ (New Architecture / TurboModule)
- iOS 13.4+
- Android minSdk 24+

## License

MIT
