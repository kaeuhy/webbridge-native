# @webbridge-native/cache

> RN에서 브라우저의 HTTP 캐시 동작을 재현. RFC 7234 준수.

## Problem

브라우저는 `Cache-Control`, `ETag`, `Last-Modified`를 자동으로 처리합니다. RN은 이걸 안 합니다. 매 요청이 서버까지 가므로 느리고 트래픽을 낭비합니다.

## Solution

RFC 7234 준수 HTTP 캐시를 RN에 적용. 브라우저처럼 304 조건부 요청, Vary 분리, LRU 관리.

## 설치

```bash
pnpm add @webbridge-native/cache @webbridge-native/core
```

## 사용법

```typescript
import { HttpCache, cacheInterceptor } from '@webbridge-native/cache';

const cache = new HttpCache({ maxEntries: 500, maxSize: 50 * 1024 * 1024 });
client.use(cacheInterceptor({ cache }));

// 첫 요청 → 서버 호출 (X-Cache: MISS)
// 두 번째 → 캐시 반환 (X-Cache: HIT)
// 만료 후 → 304 조건부 (X-Cache: REVALIDATED)
// POST 후 → 해당 URL 캐시 삭제
```

## 브라우저 호환 기능

- Cache-Control (max-age, no-cache, no-store, must-revalidate)
- ETag + If-None-Match → 304
- Last-Modified + If-Modified-Since → 304
- Vary 헤더 (Accept-Language별 캐시 분리)
- stale-while-revalidate (stale 즉시 반환 + 백그라운드 갱신)
- POST 시 GET 캐시 자동 무효화 (RFC 7234 §4.4)
- LRU eviction (maxEntries, maxSize)

## License

MIT
