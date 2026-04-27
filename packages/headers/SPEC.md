# SPEC.md — @webbridge-native/headers

> Header normalizer — 브라우저가 자동 주입하는 헤더를 RN에서도 자동 주입.

## 패키지 정보

| 항목 | 내용 |
|---|---|
| 이름 | `@webbridge-native/headers` |
| Tier | 1 |
| 의존성 | `@webbridge-native/core` |

## Public API

```typescript
import { headerInterceptor } from '@webbridge-native/headers';

const interceptor = headerInterceptor({
  userAgent: 'browser-like',  // 'browser-like' | 'native' | string
  acceptLanguage: 'auto',     // 'auto' | string | false
  acceptEncoding: true,        // boolean
  origin: 'https://myapp.local', // string | false
});
```

## 기능 체크리스트

- [ ] User-Agent 빌더 (3모드: browser-like / native / custom)
- [ ] Accept-Language 자동 (navigator.language 기반 또는 기본값)
- [ ] Accept-Encoding 자동 (gzip, deflate)
- [ ] Accept 헤더 기본값 (브라우저 유사)
- [ ] Origin 헤더 옵션
- [ ] 사용자 정의 헤더 merge (기존 헤더 덮어쓰지 않음)
- [ ] core Interceptor 타입 준수

## 금지 사항

- 외부 의존성 금지
- any 타입 금지
