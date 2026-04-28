# @webbridge-native/devtools

> RN 인앱 네트워크 인스펙터. 요청 로깅, HAR export, curl 생성.

## 설치

```bash
pnpm add @webbridge-native/devtools @webbridge-native/core
```

## 사용법

```typescript
import { RequestLogger, devtoolsInterceptor, DevToolsPanel } from '@webbridge-native/devtools';

const logger = new RequestLogger({ maxEntries: 500, maxBodySize: 64 * 1024 });
client.use(devtoolsInterceptor({ logger })); // 인터셉터 체인 첫 번째에 등록

// 로그 조회
const entries = logger.getEntries();
const errors = logger.filter(e => e.status >= 400);

// HAR export (QA 버그 리포트 첨부)
const har = logger.toHAR();

// curl 명령 복사
const curl = logger.toCurl(entries[0]);

// DevToolsPanel (UI 데이터 레이어)
const panel = new DevToolsPanel(logger);
panel.setFilter({ method: 'GET', minStatus: 400 });
panel.onUpdate((filtered) => { /* RN UI 업데이트 */ });
panel.getSummary(); // { total, success, error, cached, avgDuration }
```

**Production**: `@webbridge-native/babel-plugin-strip-dev`로 자동 제거.

## License

MIT
