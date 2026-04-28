# @webbridge-native/sse

> RN에서 EventSource(Server-Sent Events) 지원.

## Problem

브라우저는 `EventSource`를 기본 제공하지만, RN은 지원하지 않습니다.

## Solution

W3C EventSource 스펙 호환 폴리필. fetch streaming 기반 자동 연결/재연결.

## 설치

```bash
pnpm add @webbridge-native/sse
```

## 사용법

```typescript
import { EventSource } from '@webbridge-native/sse';

const es = new EventSource('https://api.myapp.com/events', {
  headers: { Authorization: 'Bearer token' },
});

es.onopen = () => console.log('Connected');
es.onmessage = (event) => console.log(event.data);
es.onerror = () => console.log('Error, reconnecting...');

es.addEventListener('notification', (event) => {
  console.log('Notification:', event.data);
});

es.close();
```

## 기능

- 자동 재연결 (configurable retry delay)
- last-event-id 추적
- Named events
- CR/LF/CRLF 지원

## License

MIT
