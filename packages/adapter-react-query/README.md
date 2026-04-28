# @webbridge-native/adapter-react-query

> React Query integration for WebBridge Native.

## Installation

```bash
pnpm add @webbridge-native/adapter-react-query @webbridge-native/core @tanstack/react-query
```

## Usage

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { createFetcher } from '@webbridge-native/adapter-react-query';

const fetcher = createFetcher(client, {
  baseURL: 'https://api.example.com',
  defaultHeaders: { Authorization: 'Bearer token' },
});

// GET with AbortSignal (auto-cancellation on unmount)
function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: ({ signal }) => fetcher.json<User>(`/users/${id}`, { signal }),
  });
}

// POST
function useCreateUser() {
  return useMutation({
    mutationFn: (data: CreateUserInput) =>
      fetcher.json<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  });
}
```

### Fetcher Methods

- `fetcher.json<T>(url, init?)` — Parse JSON, throw FetchError on non-2xx
- `fetcher.text(url, init?)` — Return text
- `fetcher.raw(url, init?)` — Return raw WebBridgeResponse

## License

MIT
