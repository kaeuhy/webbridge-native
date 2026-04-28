# @webbridge-native/cookies

> RN에서 브라우저처럼 쿠키를 자동 관리. RFC 6265 준수.

## Problem

브라우저는 `Set-Cookie`를 자동 저장하고 다음 요청에 `Cookie` 헤더를 자동 첨부합니다. React Native는 이걸 안 합니다. RN 공식 문서: *"Cookie based authentication is currently unstable."*

## Solution

RFC 6265 준수 CookieJar가 RN에서 브라우저와 동일하게 쿠키를 자동 관리합니다.

## 설치

```bash
pnpm add @webbridge-native/cookies @webbridge-native/core
```

## 사용법

### 인터셉터로 사용 (권장)

```typescript
import { CookieJar, cookieInterceptor } from '@webbridge-native/cookies';

const jar = new CookieJar();
client.use(cookieInterceptor({ jar }));

// 이제 RN에서도 브라우저처럼:
// 1. 로그인 응답의 Set-Cookie → 자동 저장
// 2. 다음 요청에 Cookie 헤더 → 자동 첨부
await client.fetch('https://api.myapp.com/login', { method: 'POST', body: '...' });
await client.fetch('https://api.myapp.com/me'); // Cookie 자동 첨부됨
```

### 직접 사용

```typescript
const jar = new CookieJar();
await jar.setCookie('session=abc; Path=/; HttpOnly; Secure', 'https://api.myapp.com');
const header = await jar.getCookieHeader('https://api.myapp.com/users');
// → 'session=abc'
```

### 영속 저장 (앱 재시작 후 세션 유지)

```typescript
import { PersistentCookieStore } from '@webbridge-native/cookies';

const store = new PersistentCookieStore({
  getItem: (key) => mmkv.getString(key) ?? null,
  setItem: (key, value) => mmkv.set(key, value),
  removeItem: (key) => mmkv.delete(key),
});
```

## 브라우저 호환 기능

- SameSite (Strict, Lax, None) — None은 Secure 강제
- HttpOnly, Secure flag
- Domain/Path 매칭 (RFC 6265 §5.1.3, §5.1.4)
- Max-Age / Expires (Max-Age 우선)
- Public Suffix 검증 (supercookie 공격 방지)
- 다중 Set-Cookie 헤더 지원
- 도메인별 50개, 전체 3000개 제한

## License

MIT
