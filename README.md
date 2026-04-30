# WebBridge Native

[![CI](https://github.com/kaeuhy/webbridge-native/actions/workflows/ci.yml/badge.svg)](https://github.com/kaeuhy/webbridge-native/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@webbridge-native/core)](https://www.npmjs.com/package/@webbridge-native/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Web platform for React Native**
>
> React Native에서 브라우저 수준의 Web API를 사용할 수 있게 합니다.

---

## 왜 필요한가?

React Native는 JavaScript로 동작하지만, 브라우저가 기본 제공하는 Web API의 상당수가 없거나 불완전합니다.

| Web API | 브라우저 | React Native | WebBridge Native |
|---|---|---|---|
| `response.json()` / `.text()` / `.clone()` | **기본 제공** | fetch 반환값만 가능 | **`WBResponse` 제공** |
| `new Headers()` (case-insensitive, iterable) | **기본 제공** | 불완전 | **`WBHeaders` 제공** |
| `FormData` → 인터셉터 체인 | **기본 제공** | body 타입 제한 | **직렬화기 제공** |
| `TextEncoder` / `TextDecoder` | **기본 제공** | Hermes 미지원 | **폴리필 제공** |
| `ReadableStream` / `WritableStream` | **기본 제공** | 부분적 | **폴리필 제공** |
| `AbortSignal.timeout()` | **기본 제공** | 없음 | **폴리필 제공** |
| `atob()` / `btoa()` | **기본 제공** | 없음 | **폴리필 제공** |
| 쿠키 자동 관리 (Set-Cookie → Cookie) | **자동** | 불안정 | **RFC 6265 준수** |
| HTTP 캐시 (Cache-Control, ETag) | **자동** | 없음 | **RFC 7234 준수** |
| User-Agent, Accept-Language 헤더 | **자동** | 없음 | **자동 주입** |
| 리다이렉트 시 헤더 strip | **자동** | 없음 | **브라우저 동일** |
| DevTools Network 탭 | **자동** | 부분적 | **mock 포함 전체 표시** |
| MSW 호환 모킹 | **Service Worker** | worker 없음 | **순수 JS 모킹** |

**WebBridge Native**는 이 격차를 메워서, 웹 개발자가 브라우저에서 쓰던 코드를 그대로 RN에서 사용할 수 있게 합니다.

## 요구 사항

- **React Native 0.76+** (New Architecture 기본)
- **Hermes** 엔진
- iOS 15.1+ / Android API 24+
- Expo SDK 52+

## 패키지

### Layer 0 — Web API 폴리필

| 패키지 | 설명 |
|---|---|
| [`@webbridge-native/web-api`](packages/web-api) | **Fetch API 호환** — WBHeaders, WBResponse, WBRequest, FormData 직렬화, AbortSignal.timeout |
| [`@webbridge-native/encoding`](packages/encoding) | **WHATWG Encoding** — TextEncoder, TextDecoder, atob, btoa |
| [`@webbridge-native/streams`](packages/streams) | **WHATWG Streams** — ReadableStream, WritableStream, TransformStream |

### Layer 1 — Native Bridge

| 패키지 | 설명 |
|---|---|
| [`@webbridge-native/native-bridge`](packages/native-bridge) | iOS/Android DevTools 가시성 (NSURLProtocol + OkHttp, TurboModule) |

### Layer 2 — 요청 파이프라인

| 패키지 | 설명 |
|---|---|
| [`@webbridge-native/core`](packages/core) | 인터셉터 체인, WebBridgeClient, Request/Response 타입 |

### Layer 3 — 브라우저 시맨틱

| 패키지 | 설명 |
|---|---|
| [`@webbridge-native/cookies`](packages/cookies) | RFC 6265 쿠키 자동 관리 |
| [`@webbridge-native/cache`](packages/cache) | RFC 7234 HTTP 캐시 |
| [`@webbridge-native/headers`](packages/headers) | User-Agent, Accept-Language 자동 주입 |
| [`@webbridge-native/redirect`](packages/redirect) | 301-308 리다이렉트 (브라우저 동일 동작) |
| [`@webbridge-native/cors`](packages/cors) | CORS 사전 감지 (dev-only) |
| [`@webbridge-native/sse`](packages/sse) | W3C EventSource 폴리필 |

### Layer 4 — 개발자 API

| 패키지 | 설명 |
|---|---|
| [`@webbridge-native/preset`](packages/preset) | **한 줄 설정** — 쿠키 + 헤더 + mock + native-bridge 번들 |
| [`@webbridge-native/mock`](packages/mock) | MSW v2 호환 mock 서버 |
| [`@webbridge-native/devtools`](packages/devtools) | 인앱 네트워크 인스펙터 |
| [`@webbridge-native/adapter-axios`](packages/adapter-axios) | axios 프로젝트 통합 |
| [`@webbridge-native/adapter-react-query`](packages/adapter-react-query) | React Query 통합 |

### 예정 (v0.6.0)

| 패키지 | 설명 |
|---|---|
| `@webbridge-native/crypto` | Web Crypto API (getRandomValues, randomUUID) |
| `@webbridge-native/storage` | localStorage / sessionStorage |
| `@webbridge-native/broadcast` | BroadcastChannel |
| `@webbridge-native/observers` | Performance API, requestIdleCallback |

## 빠른 시작

### 1. 설치

```bash
pnpm add @webbridge-native/preset
```

### 2. 설정

```typescript
import { setupWebBridge } from '@webbridge-native/preset';

const { client } = setupWebBridge({
  cookies: true,
  headers: { userAgent: 'browser-like' },
  nativeBridge: true,
});
```

### 3. 브라우저처럼 사용

```typescript
// 로그인 — Set-Cookie 자동 저장
await client.fetch('https://api.myapp.com/login', {
  method: 'POST',
  body: JSON.stringify({ email: 'user@app.com', password: '1234' }),
});

// 인증된 요청 — Cookie 자동 첨부
const res = await client.fetch('https://api.myapp.com/me');
```

### 4. Web API 사용

```typescript
import { WBHeaders, WBResponse } from '@webbridge-native/web-api';
import { WBTextEncoder, WBTextDecoder } from '@webbridge-native/encoding';

// Fetch API 호환 Headers
const headers = new WBHeaders({ 'Content-Type': 'application/json' });
headers.append('Accept', 'text/html');
console.log(headers.get('content-type')); // case-insensitive

// Response 래퍼
const wbRes = WBResponse.fromWebBridge(res);
const data = await wbRes.json();  // .json() 메서드 사용 가능

// TextEncoder/Decoder
const encoder = new WBTextEncoder();
const decoder = new WBTextDecoder();
const encoded = encoder.encode('안녕하세요');
const decoded = decoder.decode(encoded); // '안녕하세요'
```

### 5. MSW 호환 Mock

```typescript
import { setupWebBridge, http, HttpResponse } from '@webbridge-native/preset';

const { client } = setupWebBridge({
  mock: {
    handlers: [
      http.get('https://api.myapp.com/users/:id', ({ params }) =>
        HttpResponse.json({ id: params.id, name: 'Alice' }),
      ),
    ],
  },
  nativeBridge: true, // mock 응답도 DevTools에 표시
});
```

### 6. axios / React Query 통합

```typescript
// axios
import { createAxiosAdapter } from '@webbridge-native/adapter-axios';
const api = axios.create({ adapter: createAxiosAdapter(client) });

// React Query
import { createFetcher } from '@webbridge-native/adapter-react-query';
const fetcher = createFetcher(client, { baseURL: 'https://api.myapp.com' });
```

## 아키텍처

```
Layer 0: Web API 폴리필 (web-api, encoding, streams)
    ↓
Layer 1: Native Bridge (TurboModule — DevTools 가시성)
    ↓
Layer 2: 요청 파이프라인 (인터셉터 체인)
    ↓
Layer 3: 브라우저 시맨틱 (cookies, cache, headers, redirect, cors, sse)
    ↓
Layer 4: 개발자 API (preset, mock, devtools, adapters)
```

모든 레이어는 opt-in/opt-out 가능. 필요한 패키지만 선택하여 사용합니다.

## 실전 검증

hodu-app(건강관리), batchar-app(경매) 등 실제 RN 프로덕션 앱 패턴으로 검증 완료:
- 30개 이상 REST API 엔드포인트 시뮬레이션
- 로그인/회원가입 → 토큰 갱신 → 인증 API 호출
- 실시간 입찰(SSE), 채팅(WebSocket) 데이터 구조
- React Query 병렬 요청 (Promise.all)
- 에러 핸들링 (401 자동 갱신, 5xx 재시도, 네트워크 에러)

## License

MIT
