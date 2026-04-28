# @webbridge-native/redirect

> RN에서 브라우저와 동일한 리다이렉트 처리.

## Problem

RN의 기본 redirect 처리는 브라우저와 다릅니다: `redirect: 'manual'`이 부정확하고, 크로스 오리진 리다이렉트 시 Authorization 헤더가 그대로 전달되어 **토큰 유출 위험**이 있습니다.

## Solution

브라우저 Fetch 스펙과 동일한 리다이렉트 동작을 RN에 제공합니다.

## 설치

```bash
pnpm add @webbridge-native/redirect @webbridge-native/core
```

## 사용법

```typescript
import { redirectInterceptor } from '@webbridge-native/redirect';

client.use(redirectInterceptor());

// 자동 follow (최대 5회)
const res = await client.fetch('https://api.myapp.com/old');
// res.redirected === true, res.url === 최종 URL
```

## 브라우저 호환 동작

| 상태 | 메서드 변경 | 보안 |
|---|---|---|
| 301, 302, 303 | → GET, body 제거 | cross-origin 시 Auth/Cookie strip |
| 307, 308 | 유지 | cross-origin 시 Auth/Cookie strip |

- `redirect: 'manual'` → 3xx 응답 그대로 반환
- `redirect: 'error'` → 3xx 시 에러

## License

MIT
