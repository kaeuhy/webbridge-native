# Migration Guide

## MSW → WebBridge Native

기존 MSW v2 핸들러를 그대로 사용할 수 있습니다. import 경로만 변경하세요.

### Before (MSW)

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/users', () => HttpResponse.json([...])),
);
server.listen();
```

### After (WebBridge Native)

```typescript
import { setupServer, http, HttpResponse } from '@webbridge-native/mock';

const server = setupServer(
  http.get('/api/users', () => HttpResponse.json([...])),
);
server.listen();
```

**변경 사항: import 경로 1줄만.**

---

## axios → WebBridge Native

기존 axios 코드를 유지하면서 브라우저 시맨틱을 추가합니다.

### Before (일반 axios)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.myapp.com',
});
```

### After (WebBridge + axios)

```typescript
import axios from 'axios';
import { setupWebBridge } from '@webbridge-native/preset';
import { createAxiosAdapter } from '@webbridge-native/adapter-axios';

const { client } = setupWebBridge({ cookies: true });

const api = axios.create({
  baseURL: 'https://api.myapp.com',
  adapter: createAxiosAdapter(client),
});

// 기존 코드 변경 없음 — 쿠키/캐시/헤더 자동 적용
```

---

## React Query → WebBridge Native

### Before

```typescript
const { data } = useQuery({
  queryKey: ['user', id],
  queryFn: () => fetch(`/api/users/${id}`).then(r => r.json()),
});
```

### After

```typescript
import { createFetcher } from '@webbridge-native/adapter-react-query';

const fetcher = createFetcher(client, { baseURL: 'https://api.myapp.com' });

const { data } = useQuery({
  queryKey: ['user', id],
  queryFn: ({ signal }) => fetcher.json(`/users/${id}`, { signal }),
});
```

---

## @react-native-cookies/cookies → WebBridge Native

### Before (수동 쿠키 관리)

```typescript
import CookieManager from '@react-native-cookies/cookies';

// 수동으로 쿠키 설정
await CookieManager.set('https://api.myapp.com', { name: 'session', value: 'abc' });

// 수동으로 쿠키 조회
const cookies = await CookieManager.get('https://api.myapp.com');
```

### After (자동 쿠키 관리)

```typescript
import { setupWebBridge } from '@webbridge-native/preset';

const { client } = setupWebBridge({ cookies: true });

// 쿠키는 자동 관리 — 수동 설정/조회 불필요
await client.fetch('https://api.myapp.com/login', { method: 'POST', body: '...' });
// Set-Cookie 자동 저장, 다음 요청에 Cookie 자동 첨부
```
