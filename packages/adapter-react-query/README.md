# @webbridge-native/adapter-react-query

> RN React Query 프로젝트에 브라우저 시맨틱을 적용.

## 설치

```bash
pnpm add @webbridge-native/adapter-react-query @webbridge-native/core @webbridge-native/preset @tanstack/react-query
```

## 사용법

```typescript
import { useQuery } from '@tanstack/react-query';
import { setupWebBridge } from '@webbridge-native/preset';
import { createFetcher } from '@webbridge-native/adapter-react-query';

const { client } = setupWebBridge({ cookies: true });
const fetcher = createFetcher(client, { baseURL: 'https://api.myapp.com' });

function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: ({ signal }) => fetcher.json<User>(`/users/${id}`, { signal }),
  });
}
```

### Fetcher 메서드

- `fetcher.json<T>(url, init?)` — JSON 파싱, non-2xx 시 FetchError throw
- `fetcher.text(url, init?)` — 텍스트 반환
- `fetcher.raw(url, init?)` — WebBridgeResponse 반환

## License

MIT
