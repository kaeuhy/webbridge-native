# @webbridge-native/adapter-axios

> Axios adapter for WebBridge Native.

## Installation

```bash
pnpm add @webbridge-native/adapter-axios @webbridge-native/core axios
```

## Usage

```typescript
import axios from 'axios';
import { setupWebBridge } from '@webbridge-native/preset';
import { createAxiosAdapter } from '@webbridge-native/adapter-axios';

const { client } = setupWebBridge({ cookies: true, headers: { userAgent: 'browser-like' } });

const api = axios.create({
  baseURL: 'https://api.example.com',
  adapter: createAxiosAdapter(client),
});

// All WebBridge interceptors apply (cookies, headers, cache, etc.)
const { data } = await api.get('/users');
const { data: user } = await api.post('/users', { name: 'Alice' });
```

## Supported Axios Features

- `baseURL` + relative paths
- `params` (including arrays and custom `paramsSerializer`)
- `timeout` (via AbortSignal)
- `validateStatus`
- JSON auto-parsing by Content-Type
- `signal` (AbortController)

## License

MIT
