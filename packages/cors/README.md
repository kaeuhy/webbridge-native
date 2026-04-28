# @webbridge-native/cors

> RN 개발 시 CORS 문제를 사전 감지. Dev-only.

## Problem

RN은 브라우저와 달리 CORS를 강제하지 않습니다. 개발 중 문제없다가 웹 버전에서 CORS 에러를 만나면 대응이 늦어집니다.

## Solution

개발 중 브라우저의 CORS 동작을 시뮬레이션하여 문제를 미리 잡습니다.

## 설치

```bash
pnpm add @webbridge-native/cors @webbridge-native/core
```

## 사용법

```typescript
import { corsInterceptor } from '@webbridge-native/cors';

// 개발 환경에서만
if (__DEV__) {
  client.use(corsInterceptor({
    origin: 'https://myapp.com',
    mode: 'warn',    // 'warn' 또는 'enforce'
  }));
}
```

**Production**: `@webbridge-native/babel-plugin-strip-dev`로 자동 제거.

## License

MIT
