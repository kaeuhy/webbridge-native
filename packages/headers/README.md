# @webbridge-native/headers

> RN에서 누락되는 브라우저 헤더를 자동 주입.

## Problem

브라우저는 `User-Agent`, `Accept-Language`, `Accept-Encoding`을 자동으로 설정합니다. RN의 fetch는 이런 헤더가 없거나 `CFNetwork/okhttp`같은 네이티브 값이 들어갑니다.

## Solution

브라우저와 유사한 헤더를 RN 요청에 자동 주입합니다. 이미 설정된 헤더는 덮어쓰지 않습니다.

## 설치

```bash
pnpm add @webbridge-native/headers @webbridge-native/core
```

## 사용법

```typescript
import { headerInterceptor } from '@webbridge-native/headers';

client.use(headerInterceptor({
  userAgent: 'browser-like',     // Mozilla/5.0 호환 UA
  acceptLanguage: 'auto',        // 디바이스 언어
  acceptEncoding: true,           // gzip, deflate
  origin: 'https://myapp.com',   // Origin 헤더 (선택)
}));
```

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `userAgent` | `'browser-like'` | `'browser-like'` / `'native'` / 커스텀 / `false` |
| `acceptLanguage` | `'auto'` | `'auto'` / 로케일 / `false` |
| `acceptEncoding` | `true` | gzip, deflate 자동 |
| `origin` | `false` | Origin URL / `false` |

## License

MIT
