# WebBridge Native

[![CI](https://github.com/kaeuhy/webbridge-native/actions/workflows/ci.yml/badge.svg)](https://github.com/kaeuhy/webbridge-native/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@webbridge-native/core)](https://www.npmjs.com/package/@webbridge-native/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **React Native에서 브라우저와 동일한 네트워킹 경험을 제공합니다.**

---

## 왜 필요한가?

브라우저에서 `fetch()`는 그냥 동작합니다:

| 기능 | 브라우저 | React Native |
|---|---|---|
| 쿠키 자동 저장/전송 | **자동** | 부분적, 불안정 |
| User-Agent, Accept-Language | **자동** | 없음 |
| Cache-Control 존중 | **자동** | 없음 |
| SameSite 쿠키 정책 | **자동** | 없음 |
| 리다이렉트 시 헤더 strip | **자동** | 없음 |
| DevTools Network 탭 | **자동** | 부분적 |

React Native 공식 문서도 인정합니다: *"Cookie based authentication is currently unstable."*

**WebBridge Native는 이 격차를 메웁니다.** RN 앱에서 브라우저와 동일한 네트워킹 동작을 보장합니다.

## 기존 RN 솔루션과 비교

| 기존 솔루션 | 하는 것 | 안 하는 것 |
|---|---|---|
| `@react-native-cookies/cookies` | 쿠키 get/set | 자동 관리 없음, RFC 미준수 |
| MSW (`msw/native`) | RN에서 MSW 사용 | DevTools 미표시, 시맨틱 없음 |
| RN 0.81+ DevTools | fetch/XHR 기록 | mock 미표시, 쿠키/캐시 없음 |

**WebBridge Native**: 쿠키 + 캐시 + 리다이렉트 + 헤더 + mock을 **하나의 라이브러리로 통합**. RN에서 브라우저처럼.

## 패키지

| 패키지 | 설명 |
|---|---|
| [`@webbridge-native/preset`](packages/preset) | **한 줄 설정** — RN 프로젝트에 브라우저 시맨틱 즉시 적용 |
| [`@webbridge-native/core`](packages/core) | 인터셉터 체인, 타입 정의 |
| [`@webbridge-native/cookies`](packages/cookies) | RFC 6265 쿠키 자동 관리 (RN에서 브라우저처럼) |
| [`@webbridge-native/headers`](packages/headers) | User-Agent, Accept-Language 자동 주입 |
| [`@webbridge-native/mock`](packages/mock) | MSW v2 호환 mock (RN DevTools에서 보임) |
| [`@webbridge-native/cache`](packages/cache) | RFC 7234 HTTP 캐시 (RN에서 브라우저처럼) |
| [`@webbridge-native/redirect`](packages/redirect) | 301-308 리다이렉트 (브라우저 동일 동작) |
| [`@webbridge-native/devtools`](packages/devtools) | RN 인앱 네트워크 인스펙터 |
| [`@webbridge-native/cors`](packages/cors) | RN 개발 시 CORS 사전 감지 (dev-only) |
| [`@webbridge-native/sse`](packages/sse) | RN EventSource 폴리필 |
| [`@webbridge-native/adapter-axios`](packages/adapter-axios) | RN axios 프로젝트 통합 |
| [`@webbridge-native/adapter-react-query`](packages/adapter-react-query) | RN React Query 통합 |

## 빠른 시작

### 1. 설치 (RN 프로젝트에서)

```bash
pnpm add @webbridge-native/preset
```

### 2. 설정 (App.tsx 또는 진입점)

```typescript
import { setupWebBridge } from '@webbridge-native/preset';

const { client } = setupWebBridge({
  cookies: true,
  headers: { userAgent: 'browser-like' },
});

// RN에서도 브라우저처럼 동작
const res = await client.fetch('https://api.myapp.com/me');
```

### 3. 로그인 (쿠키 자동 관리)

```typescript
await client.fetch('https://api.myapp.com/login', {
  method: 'POST',
  body: JSON.stringify({ email: 'user@app.com', password: '1234' }),
});
// Set-Cookie 자동 저장

const me = await client.fetch('https://api.myapp.com/me');
// Cookie 헤더 자동 첨부 (브라우저처럼)
```

### 4. MSW 호환 Mock (RN 개발/테스트)

```typescript
import { setupServer, http, HttpResponse } from '@webbridge-native/mock';

const server = setupServer(
  http.get('https://api.myapp.com/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'Alice' });
  }),
);
server.listen();
```

### 5. axios / React Query 통합

```typescript
// axios
import { createAxiosAdapter } from '@webbridge-native/adapter-axios';
const api = axios.create({ adapter: createAxiosAdapter(client) });

// React Query
import { createFetcher } from '@webbridge-native/adapter-react-query';
const fetcher = createFetcher(client, { baseURL: 'https://api.myapp.com' });
```

## 요구 사항

- **React Native 0.73+**
- 순수 JS/TS — native module 없음, Expo 호환

## 아키텍처

```
Layer 3: 개발자 API (preset, mock, adapters)
Layer 2: 브라우저 시맨틱 (cookies, cache, headers, cors)
Layer 1: 요청 파이프라인 (인터셉터 체인, redirect, devtools)
```

순수 JS/TS — native module 없음.

## License

MIT
