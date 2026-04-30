# @webbridge-native/broadcast

BroadcastChannel API polyfill for React Native. Enables communication between different parts of your app (screens, components, modules) using named channels, following the [browser BroadcastChannel spec](https://html.spec.whatwg.org/multipage/web-messaging.html#broadcastchannel).

## Installation

```bash
npm install @webbridge-native/broadcast
# or
pnpm add @webbridge-native/broadcast
```

## Usage

```typescript
import { WBBroadcastChannel } from '@webbridge-native/broadcast';

// In component A
const channel = new WBBroadcastChannel('notifications');
channel.postMessage({ type: 'NEW_ITEM', payload: { id: 1 } });

// In component B
const channel = new WBBroadcastChannel('notifications');
channel.onmessage = (event) => {
  console.log('Received:', event.data);
  // { type: 'NEW_ITEM', payload: { id: 1 } }
};

// Using addEventListener
channel.addEventListener('message', (event) => {
  console.log('Via listener:', event.data);
});

// Cleanup
channel.close();
```

## API

### `new WBBroadcastChannel(name: string)`

Creates a new channel instance. All instances with the same name can communicate.

### `postMessage(message: any): void`

Sends a message to all other channels with the same name. The message is deep-copied (structured clone semantics). Throws `InvalidStateError` if the channel is closed.

### `close(): void`

Closes the channel. No more messages will be received, and `postMessage()` will throw.

### `onmessage: ((event: WBMessageEvent) => void) | null`

Event handler for incoming messages.

### `addEventListener(type, listener): void`

Adds a listener for `'message'` or `'messageerror'` events.

### `removeEventListener(type, listener): void`

Removes a previously registered listener.

## Key Behaviors

- Messages are delivered asynchronously (via microtask)
- Messages are NOT delivered to the sender
- Messages are deep-copied to prevent shared mutable state
- Different channel names are completely isolated
- Closing a channel is idempotent

## License

MIT
