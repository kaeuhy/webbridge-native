# @webbridge-native/preset

> RN 프로젝트에 브라우저 네트워킹을 한 줄로 적용.

## 설치

```bash
pnpm add @webbridge-native/preset
```

## 사용법

```typescript
import { setupWebBridge } from '@webbridge-native/preset';

const { client, cookieJar, dispose } = setupWebBridge({
  cookies: true,                          // 쿠키 자동 관리 (브라우저처럼)
  headers: { userAgent: 'browser-like' }, // 헤더 자동 주입
  mock: {                                 // 선택: MSW 호환 mock
    handlers: [
      http.get('/api/users', () => HttpResponse.json([])),
    ],
  },
});

// RN에서 브라우저처럼
const res = await client.fetch('https://api.myapp.com/me');

// 정리
dispose();
```

### 옵션

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `cookies` | `true` | 쿠키 자동 관리 / `{ persistent: true }` / `false` |
| `headers` | 자동 | 헤더 옵션 / `false` |
| `mock` | 없음 | MSW 핸들러 / `false` |
| `interceptors` | 없음 | 추가 인터셉터 |
| `skipDefaultTerminal` | `false` | 기본 fetch terminal 비활성 |

## License

MIT
