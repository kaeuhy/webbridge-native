# @webbridge-native/core

> React Native 네트워킹 파이프라인의 핵심. 인터셉터 체인으로 브라우저 시맨틱을 조합.

## Problem

React Native의 `fetch()`는 브라우저와 달리 쿠키, 캐시, 헤더를 자동 처리하지 않습니다. 각 기능을 개별로 붙이면 순서 관리가 어렵고 충돌이 발생합니다.

## Solution

인터셉터 체인 패턴으로 각 기능(쿠키, 캐시, 헤더 등)을 순서대로 조합. RN `fetch()`에 브라우저 동작을 레이어로 추가합니다.

## 설치

```bash
pnpm add @webbridge-native/core
```

## 사용법

```typescript
import { WebBridgeClient } from '@webbridge-native/core';
import type { Interceptor } from '@webbridge-native/core';

const client = new WebBridgeClient();

// 인터셉터를 순서대로 등록
client.use(headerInterceptor());    // 1. 헤더 주입
client.use(cookieInterceptor());    // 2. 쿠키 관리
client.use(cacheInterceptor());     // 3. 캐시
client.use(terminalInterceptor);    // 4. 실제 네트워크 요청

// RN에서 브라우저처럼 fetch
const res = await client.fetch('https://api.myapp.com/users');
```

### 커스텀 인터셉터 작성

```typescript
const loggingInterceptor: Interceptor = async (request, next) => {
  console.log(`[RN] ${request.method} ${request.url}`);
  const response = await next(request);
  console.log(`[RN] ${response.status}`);
  return response;
};
```

### 헤더 유틸리티 (케이스 무관)

```typescript
import { getHeader, hasHeader, deleteHeader } from '@webbridge-native/core';

getHeader(headers, 'content-type');  // 대소문자 무관 조회
hasHeader(headers, 'authorization'); // 존재 여부
deleteHeader(headers, 'cookie');     // 삭제
```

## API

- `WebBridgeClient` — `use()`, `fetch()`
- `Interceptor` — `(request, next) => Promise<Response>`
- `createRequest()`, `createResponse()` — 팩토리
- `getHeader()`, `hasHeader()`, `setHeaderIfAbsent()`, `deleteHeader()` — 헤더 유틸

## License

MIT
