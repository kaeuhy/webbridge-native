# @webbridge-native/native-bridge

> iOS NSURLProtocol + Android OkHttp Network Interceptor for WebBridge Native.

## Installation

```bash
pnpm add @webbridge-native/native-bridge @webbridge-native/core
```

## Usage

```typescript
import { WebBridgeClient } from '@webbridge-native/core';
import { nativeBridgeInterceptor } from '@webbridge-native/native-bridge';

const client = new WebBridgeClient();
client.use(nativeBridgeInterceptor({ timeout: 5000 }));

// Requests go through native networking layer
// → Visible in RN DevTools Network tab
const res = await client.fetch('https://api.example.com/data');
```

### Testing

```typescript
import { setNativeModule } from '@webbridge-native/native-bridge';

// Inject mock native module for tests
setNativeModule({
  sendRequest: async (json) => JSON.stringify({ status: 200, body: '{}', headers: {} }),
  registerMockHandler: () => {},
  respondToMock: () => {},
  cancelRequest: () => {},
});
```

## Requirements

- React Native 0.73+ (New Architecture enabled)
- iOS 13.0+ / Android API 24+

## License

MIT
