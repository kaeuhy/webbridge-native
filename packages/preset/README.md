# @webbridge-native/preset

> RN 프로젝트에 브라우저 네트워킹을 한 줄로 적용.

## 설치

```bash
pnpm add @webbridge-native/preset
```

Native bridge(DevTools 가시성)를 사용하려면:
```bash
pnpm add @webbridge-native/native-bridge
cd ios && pod install
```

## 사용법

```typescript
import { setupWebBridge, http, HttpResponse } from '@webbridge-native/preset';

const { client, cookieJar, dispose } = setupWebBridge({
  cookies: true,                          // 쿠키 자동 관리 (브라우저처럼)
  headers: { userAgent: 'browser-like' }, // 헤더 자동 주입
  mock: {                                 // 선택: MSW 호환 mock
    handlers: [
      http.get('/api/users', () => HttpResponse.json([])),
    ],
  },
  nativeBridge: true,                     // DevTools Network 탭에 표시
});

// RN에서 브라우저처럼
const res = await client.fetch('https://api.myapp.com/me');

// 정리
dispose();
```

## 옵션

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `cookies` | `true` | 쿠키 자동 관리 / `{ persistent: true }` / `false` |
| `headers` | 자동 | 헤더 옵션 / `false` |
| `mock` | 없음 | `{ handlers: [...] }` MSW 핸들러 / `false` |
| `nativeBridge` | `false` | Native 브릿지 활성화 — DevTools 가시성 / `{ timeoutMs: 5000 }` |
| `interceptors` | 없음 | 추가 인터셉터 배열 |
| `skipDefaultTerminal` | `false` | 기본 fetch terminal 비활성 |

### nativeBridge 옵션

`nativeBridge: true`로 설정하면:
- 모든 요청이 native HTTP 레이어(iOS NSURLProtocol / Android OkHttp)를 거칩니다
- RN DevTools Network 탭에서 mock 응답이 실제 네트워크 요청처럼 보입니다
- `@webbridge-native/native-bridge` 패키지가 설치되어 있어야 합니다
- 미설치 시 자동으로 `globalThis.fetch` 폴백 (기능 차이 없음, 가시성만 비활성)

## 반환값

| 속성 | 타입 | 설명 |
|---|---|---|
| `client` | `WebBridgeClient` | 설정된 HTTP 클라이언트 |
| `cookieJar` | `CookieJar \| null` | 쿠키 jar (cookies 활성 시) |
| `mockServer` | `MockServer \| null` | Mock 서버 (mock 활성 시) |
| `dispose()` | `() => void` | 모든 리소스 정리 |

## License

MIT
