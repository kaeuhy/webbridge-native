# @webbridge-native/mock

> RN에서 MSW v2와 동일한 DSL로 API를 mock. DevTools에서 보임.

## Problem

MSW는 브라우저/Node.js에서는 잘 동작하지만, RN에서는 DevTools Network 탭에 mock 응답이 표시되지 않습니다. `msw/native`도 이 문제를 해결하지 못합니다.

## Solution

MSW v2와 100% 동일한 DSL을 제공하면서, RN Native 레이어를 통해 DevTools 가시성도 확보합니다.

## 설치

```bash
pnpm add @webbridge-native/mock @webbridge-native/core
```

## 사용법

```typescript
import { setupServer, http, HttpResponse } from '@webbridge-native/mock';

const server = setupServer(
  http.get('https://api.myapp.com/users', () =>
    HttpResponse.json([{ id: 1, name: 'Alice' }]),
  ),
  http.get('https://api.myapp.com/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'Alice' }),
  ),
  http.post('https://api.myapp.com/users', () =>
    HttpResponse.json({ id: 3 }, { status: 201 }),
  ),
);

server.listen();   // mock 활성화
server.close();    // 비활성화
server.resetHandlers(); // 초기 핸들러로 복원
```

### MSW에서 마이그레이션

```diff
- import { setupServer, http, HttpResponse } from 'msw/node';
+ import { setupServer, http, HttpResponse } from '@webbridge-native/mock';
// 핸들러 코드 변경 없음
```

## License

MIT
