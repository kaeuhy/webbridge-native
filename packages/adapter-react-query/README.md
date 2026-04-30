# @webbridge-native/adapter-react-query

React Query integration for WebBridge Native.

## Installation

```bash
pnpm add @webbridge-native/adapter-react-query @webbridge-native/core @webbridge-native/preset @tanstack/react-query
```

## Usage

```typescript
import { useQuery } from '@tanstack/react-query';
import { setupWebBridge } from '@webbridge-native/preset';
import { createFetcher } from '@webbridge-native/adapter-react-query';

const { client } = setupWebBridge({ cookies: true });
const fetcher = createFetcher(client, { baseURL: 'https://api.example.com' });

function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: ({ signal }) => fetcher.json<User>(`/users/${id}`, { signal }),
  });
}
```

## Fetcher Methods

| Method | Description |
|---|---|
| `fetcher.json<T>(url, init?)` | Parse JSON response. Throws `FetchError` on non-2xx |
| `fetcher.text(url, init?)` | Return response as text |
| `fetcher.raw(url, init?)` | Return raw `WebBridgeResponse` |

## License

MIT
