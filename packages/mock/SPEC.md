# SPEC.md — @webbridge-native/mock

> MSW v2 호환 mocking — 동일 DSL, native 가시성 추가.

## 패키지 정보

| 항목 | 내용 |
|---|---|
| 이름 | `@webbridge-native/mock` |
| Tier | 1 |
| 의존성 | `@webbridge-native/core` |

## Public API

```typescript
import { setupServer, http, HttpResponse } from '@webbridge-native/mock';

const server = setupServer(
  http.get('https://api.example.com/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'Alice' });
  }),
);
server.listen();
server.close();
server.resetHandlers();
server.use(...newHandlers); // runtime handler 추가
```

## 기능 체크리스트

- [ ] `http.get/post/put/delete/patch` 핸들러 빌더
- [ ] URL 패턴 매칭 (exact, path params `:id`, wildcard `*`)
- [ ] `HttpResponse.json()` / `HttpResponse.text()` / `HttpResponse.error()`
- [ ] `setupServer()` — 핸들러 등록
- [ ] `server.listen()` — mock 인터셉터 활성화
- [ ] `server.close()` — mock 인터셉터 비활성화
- [ ] `server.resetHandlers()` — 초기 핸들러로 복원
- [ ] `server.use()` — 런타임 핸들러 추가 (prepend)
- [ ] Passthrough 지원
- [ ] Unhandled request 정책 (warn/error/bypass)
- [ ] core Interceptor 타입 준수 (mockInterceptor)

## 금지 사항

- MSW v2 DSL과 호환되지 않는 API 추가 금지
- any 타입 금지
