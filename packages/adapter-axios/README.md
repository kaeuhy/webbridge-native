# @webbridge-native/adapter-axios

Drop-in axios adapter that routes requests through the WebBridge interceptor chain.

## Why

You have an existing React Native project using axios and want browser-grade cookies, caching, and headers -- without rewriting your API layer. This adapter swaps the transport under axios so every request flows through WebBridge.

## Installation

```bash
pnpm add @webbridge-native/adapter-axios @webbridge-native/core @webbridge-native/preset axios
```

## Usage

```typescript
import axios from 'axios';
import { setupWebBridge } from '@webbridge-native/preset';
import { createAxiosAdapter } from '@webbridge-native/adapter-axios';

const { client } = setupWebBridge({ cookies: true });

const api = axios.create({
  baseURL: 'https://api.example.com',
  adapter: createAxiosAdapter(client),
});

// Existing code unchanged -- cookies, cache, and headers are applied automatically
const { data } = await api.get('/users');
```

## Supported Features

- `baseURL`, `params`, `paramsSerializer`
- `timeout` (AbortSignal-based)
- `validateStatus`
- JSON auto-parsing
- `signal` (AbortController)

## License

MIT
