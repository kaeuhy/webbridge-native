# SPEC.md — @webbridge-native/core

> **이 문서는 core 패키지의 단일 명세서다.**
> 모든 다른 패키지가 이 패키지에 의존한다.

---

## 패키지 정보

| 항목 | 내용 |
|---|---|
| 이름 | `@webbridge-native/core` |
| Tier | 1 (MVP) |
| 의존성 | 없음 (zero dependencies) |
| 역할 | Request/Response 타입, Interceptor 인터페이스, Client 파��프라인 |

---

## Public API

### 타입: Interceptor

```typescript
type Interceptor = (
  request: WebBridgeRequest,
  next: (request: WebBridgeRequest) => Promise<WebBridgeResponse>,
) => Promise<WebBridgeResponse>;
```

### 타입: WebBridgeRequest

```typescript
interface WebBridgeRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | ArrayBuffer | null;
  credentials?: 'omit' | 'same-origin' | 'include';
  redirect?: 'follow' | 'manual' | 'error';
  signal?: AbortSignal;
  id: string; // 고유 요청 ID (native bridge 매칭용)
}
```

### 타입: WebBridgeResponse

```typescript
interface WebBridgeResponse {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string | ArrayBuffer | null;
  ok: boolean; // status 200-299
  redirected: boolean;
  type: 'basic' | 'cors' | 'error' | 'opaque';
}
```

### 클래스: WebBridgeClient

```typescript
class WebBridgeClient {
  use(interceptor: Interceptor): this;
  fetch(url: string, init?: RequestInit): Promise<WebBridgeResponse>;
}
```

### 유틸리티

```typescript
function createRequest(url: string, init?: RequestInit): WebBridgeRequest;
function createResponse(init: Partial<WebBridgeResponse>): WebBridgeResponse;
function generateRequestId(): string;
```

---

## 기능 체크리스트

### 타입 정의
- [ ] WebBridgeRequest 인터페이스
- [ ] WebBridgeResponse 인터페이스
- [ ] Interceptor 타입
- [ ] RequestInit 호환 타입

### WebBridgeClient
- [ ] use() — 인터셉터 등록 (체이닝 지원)
- [ ] fetch() — 인터셉터 체인을 통해 요청 처리
- [ ] 인터셉터 체인 실행 순서 보장 (등록 순서대로)
- [ ] 마지막 인터셉터의 next()는 에러 throw (terminal interceptor 필요)

### 팩토리 함수
- [ ] createRequest() — URL + RequestInit → WebBridgeRequest
- [ ] createResponse() — partial → full WebBridgeResponse (기본값 적용)
- [ ] generateRequestId() — 고유 ID 생성 (UUID v4 또는 카운터)

### 에러 처리
- [ ] AbortSignal 지원 (요청 취소)
- [ ] 타임아웃 처리
- [ ] 네트워크 에러 표준화

---

## 완료 정의

1. 위 체크리스트 전항목 체크
2. 단위 테스트 100% 커버 (타입 + 클라이언트 + 팩토리)
3. `pnpm typecheck --filter @webbridge-native/core` 통과
4. zero dependencies 유지
5. JSDoc 완비

---

## 금지 사항

- 외부 의존성 추가 금지 (zero deps)
- fetch 글로벌 polyfill 금지 (core는 인터페이스만)
- any 타입 사용 금지
