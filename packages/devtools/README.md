# @webbridge-native/devtools

> RN 인앱 네트워크 인스펙터. 요청 목록, 상세 보기, HAR export, curl 복사.

## 설치

```bash
pnpm add @webbridge-native/devtools @webbridge-native/core
```

## 사용법

### 1. 인터셉터 등록

```typescript
import { RequestLogger, devtoolsInterceptor } from '@webbridge-native/devtools';

const logger = new RequestLogger({ maxEntries: 500, maxBodySize: 64 * 1024 });
client.use(devtoolsInterceptor({ logger }));
```

### 2. UI 패널 (React Native 컴포넌트)

```tsx
import { DevToolsScreen } from '@webbridge-native/devtools/ui';

// React Navigation
<Stack.Screen name="DevTools">
  {() => <DevToolsScreen logger={logger} />}
</Stack.Screen>

// 또는 Modal
<Modal visible={showDevTools}>
  <DevToolsScreen logger={logger} onClose={() => setShowDevTools(false)} />
</Modal>
```

### 3. 데이터 레이어 (커스텀 UI용)

```typescript
import { DevToolsPanel } from '@webbridge-native/devtools';

const panel = new DevToolsPanel(logger);
panel.setFilter({ method: 'GET', minStatus: 400 });
panel.onUpdate((entries) => { /* 커스텀 UI 업데이트 */ });
panel.getSummary(); // { total, success, error, cached, avgDuration }
```

### 4. HAR / curl

```typescript
const har = logger.toHAR();        // HAR 1.2 export
const curl = logger.toCurl(entry); // curl 명령 생성
```

## UI 컴포넌트

| 컴포넌트 | 설명 |
|---|---|
| `DevToolsScreen` | 전체 화면 (목록 + 상세) |
| `NetworkList` | 요청 목록 (검색, 필터, 통계) |
| `RequestDetail` | 요청/응답 상세 (헤더, body, curl) |

**Production**: `@webbridge-native/babel-plugin-strip-dev`로 자동 제거.

## License

MIT
