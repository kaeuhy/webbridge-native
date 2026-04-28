# SPEC.md — @webbridge-native/cache

> **RFC 7234 준수 HTTP 캐시 — 브라우저가 하는 캐싱을 RN에서도.**

## 패키지 정보

| 항목 | 내용 |
|---|---|
| 이름 | `@webbridge-native/cache` |
| Tier | 2 |
| 의존성 | `@webbridge-native/core` |
| 준거 표준 | RFC 7234 (HTTP Caching) |

## Public API

```typescript
import { cacheInterceptor, HttpCache } from '@webbridge-native/cache';

const cache = new HttpCache({ maxEntries: 500, maxSize: 50 * 1024 * 1024 });
client.use(cacheInterceptor({ cache }));
```

### HttpCache

| 메서드 | 설명 |
|---|---|
| `constructor(options?)` | `{ maxEntries?, maxSize? }` |
| `get(url: string, vary?: Record<string,string>)` | 캐시된 응답 반환 |
| `set(url: string, response, vary?)` | 응답 캐시 저장 |
| `delete(url: string)` | 캐시 삭제 |
| `clear()` | 전체 삭제 |
| `stats()` | `{ size, entries, hitRate }` |

### cacheInterceptor

요청 시 캐시 lookup → hit면 캐시 응답 반환 또는 conditional request.
응답 시 Cache-Control 파싱 → 캐시 저장.

## 기능 체크리스트

### Cache-Control 파싱
- [ ] max-age
- [ ] no-cache
- [ ] no-store
- [ ] must-revalidate
- [ ] public / private
- [ ] s-maxage (무시 — CDN용)
- [ ] stale-while-revalidate
- [ ] stale-if-error

### Conditional Requests
- [ ] ETag + If-None-Match (304)
- [ ] Last-Modified + If-Modified-Since (304)

### Vary
- [ ] Vary 헤더 기반 캐시 키 분리

### 저장소
- [ ] 메모리 LRU 캐시
- [ ] maxEntries 제한
- [ ] maxSize 제한 (바이트)
- [ ] Cache stats (hit/miss/hitRate)

### 통합
- [ ] cacheInterceptor (core Interceptor 타입 준수)
- [ ] Cache invalidation API
- [ ] 304 응답 시 캐시 body 재사용

## 완료 정의

1. 체크리스트 전항목 체크
2. 단위 테스트 커버
3. zero external dependencies

## 금지 사항

- 디스크 캐시는 Tier 2 범위 아님 (향후 확장)
- any 타입 금지
