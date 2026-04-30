# @webbridge-native/web-api

Fetch API compatible Web APIs for React Native -- Headers, Response, Request, FormData serializer, and AbortSignal extensions.

## Why

React Native's networking layer uses plain objects (`Record<string, string>`) for headers and responses. This package provides spec-compliant `Headers`, `Response`, and `Request` classes that interop seamlessly with WebBridge Native's interceptor chain via `fromWebBridge()` / `toWebBridge()` methods.

## Installation

```bash
pnpm add @webbridge-native/web-api
```

## Usage

### Headers

```typescript
import { WBHeaders } from '@webbridge-native/web-api';

const headers = new WBHeaders({ 'Content-Type': 'application/json' });
headers.append('Accept', 'text/html');
headers.append('Accept', 'application/json');
headers.get('accept'); // "text/html, application/json"
```

### Response

```typescript
import { WBResponse } from '@webbridge-native/web-api';

// From WebBridge interceptor chain
const response = WBResponse.fromWebBridge(webBridgeResponse);
const data = await response.json();

// Create manually
const res = WBResponse.json({ message: 'hello' }, { status: 200 });
```

### Request

```typescript
import { WBRequest } from '@webbridge-native/web-api';

const request = new WBRequest('https://api.example.com/data', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ key: 'value' }),
});

// Convert for interceptor chain
const wbRequest = request.toWebBridge();
```

### FormData Serializer

```typescript
import { serializeFormData } from '@webbridge-native/web-api';

const { body, contentType } = serializeFormData([
  { name: 'username', value: 'john' },
  { name: 'avatar', value: { data: '...', filename: 'photo.png', contentType: 'image/png' } },
]);
```

### AbortSignal Extensions

```typescript
import { abortSignalTimeout, abortSignalAny } from '@webbridge-native/web-api';

const signal = abortSignalTimeout(5000); // 5s timeout
const combined = abortSignalAny([signal, controller.signal]);
```

## API Reference

| Export | Description |
|---|---|
| `WBHeaders` | Spec-compliant Headers (case-insensitive, iterable, multi-value) |
| `WBResponse` | Response with `.json()`, `.text()`, `.clone()`, `.fromWebBridge()` |
| `WBRequest` | Request with `.toWebBridge()` conversion |
| `serializeFormData` | Multipart form data serializer |
| `abortSignalTimeout` | `AbortSignal.timeout()` polyfill |
| `abortSignalAny` | `AbortSignal.any()` polyfill |

## License

MIT
