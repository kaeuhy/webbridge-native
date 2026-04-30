# @webbridge-native/devtools

In-app network inspector for React Native. Request list, detail view, HAR export, and curl copy.

## Installation

```bash
pnpm add @webbridge-native/devtools @webbridge-native/core
```

## Usage

### 1. Register the Interceptor

```typescript
import { RequestLogger, devtoolsInterceptor } from '@webbridge-native/devtools';

const logger = new RequestLogger({ maxEntries: 500, maxBodySize: 64 * 1024 });
client.use(devtoolsInterceptor({ logger }));
```

### 2. UI Panel (React Native component)

```tsx
import { DevToolsScreen } from '@webbridge-native/devtools/ui';

// React Navigation
<Stack.Screen name="DevTools">
  {() => <DevToolsScreen logger={logger} />}
</Stack.Screen>

// Or as a Modal
<Modal visible={showDevTools}>
  <DevToolsScreen logger={logger} onClose={() => setShowDevTools(false)} />
</Modal>
```

### 3. Data Layer (for custom UI)

```typescript
import { DevToolsPanel } from '@webbridge-native/devtools';

const panel = new DevToolsPanel(logger);
panel.setFilter({ method: 'GET', minStatus: 400 });
panel.onUpdate((entries) => { /* update your custom UI */ });
panel.getSummary(); // { total, success, error, cached, avgDuration }
```

### 4. HAR / curl

```typescript
const har = logger.toHAR();        // HAR 1.2 export
const curl = logger.toCurl(entry); // Generate curl command
```

## Components

| Component | Description |
|---|---|
| `DevToolsScreen` | Full-screen view (list + detail) |
| `NetworkList` | Request list with search, filters, and stats |
| `RequestDetail` | Request/response detail (headers, body, curl) |

**Production**: Automatically stripped by `@webbridge-native/babel-plugin-strip-dev`.

## License

MIT
