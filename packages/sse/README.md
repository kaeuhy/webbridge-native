# @webbridge-native/sse

W3C EventSource (Server-Sent Events) polyfill for React Native.

## Why

Browsers provide `EventSource` out of the box. React Native does not. This package implements the W3C EventSource spec with automatic reconnection, `last-event-id` tracking, and named events.

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
es.onmessage = (event) => console.log(event.data);
es.onerror = () => console.log('Error, reconnecting...');

es.addEventListener('notification', (event) => {
  console.log('Notification:', event.data);
});

es.close();
```

## Features

- Automatic reconnection with configurable retry delay
- `last-event-id` tracking
- Named events
- CR / LF / CRLF line ending support

## License

MIT
