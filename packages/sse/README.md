# @webbridge-native/sse

> W3C EventSource polyfill for React Native.

## Installation

```bash
pnpm add @webbridge-native/sse
```

## Usage

```typescript
import { EventSource } from '@webbridge-native/sse';

const es = new EventSource('https://api.example.com/events', {
  headers: { Authorization: 'Bearer token' },
});

es.onopen = () => console.log('Connected');
es.onmessage = (event) => console.log('Data:', event.data);
es.onerror = () => console.log('Error');

es.addEventListener('custom-event', (event) => {
  console.log('Custom:', event.data);
});

es.close();
```

## Features

- W3C EventSource interface
- Auto-reconnection with configurable retry delay
- last-event-id tracking
- CR/LF/CRLF line ending support
- Named events, multi-line data, comments

## License

MIT
