# SPEC.md — @webbridge-native/devtools

> **DevTools 패널 — 요청/응답/쿠키/캐시를 인앱에서 인스펙션.**

## 패키지 정보

| 항목 | 내용 |
|---|---|
| 이름 | `@webbridge-native/devtools` |
| Tier | 2 |
| 의존성 | `@webbridge-native/core`, Tier 1 전체 |
| Production | Babel plugin으로 자동 제거 |

## Public API

```typescript
import { DevToolsPanel, DevToolsProvider, useDevTools } from '@webbridge-native/devtools';

// React Navigation 통합
<Stack.Screen name="__DevTools" component={DevToolsPanel} />

// 또는 Provider로 감싸기
<DevToolsProvider client={client} cookieJar={jar} cache={cache}>
  <App />
</DevToolsProvider>
```

## 기능 체크리스트

### 인스펙터
- [ ] 요청/응답 타임라인 (리스트 뷰)
- [ ] 요청 상세 (method, url, headers, body)
- [ ] 응답 상세 (status, headers, body)
- [ ] 쿠키 jar 실시간 보기
- [ ] 캐시 엔트리 보기
- [ ] Mock 핸들러 매칭 로그

### 유틸리티
- [ ] HAR 1.2 export
- [ ] curl 복사
- [ ] 필터링 (URL, method, status)

### Production safety
- [ ] Babel plugin으로 production 빌드에서 자동 제거

## 현재 상태

이 패키지는 RN UI 컴포넌트가 필요하므로 Tier 2 후반에 구현.
현재는 요청 로깅 인터셉터(devtoolsInterceptor)만 제공.
