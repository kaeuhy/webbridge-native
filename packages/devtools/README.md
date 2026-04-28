# @webbridge-native/devtools

> Request logger, HAR export, and curl generation for WebBridge Native.

## Installation

```bash
pnpm add @webbridge-native/devtools @webbridge-native/core
```

## Usage

```typescript
import { WebBridgeClient } from '@webbridge-native/core';
import { RequestLogger, devtoolsInterceptor } from '@webbridge-native/devtools';

const logger = new RequestLogger({
  maxEntries: 500,        // default 500
  maxBodySize: 64 * 1024, // default 64KB (truncates larger bodies)
});

const client = new WebBridgeClient();
client.use(devtoolsInterceptor({ logger })); // add first for full timing
client.use(terminalInterceptor);

await client.fetch('https://api.example.com/users');

// Get all logged entries
const entries = logger.getEntries();

// Filter
const errors = logger.filter(e => e.status >= 400);

// Export as HAR 1.2
const har = logger.toHAR();

// Generate curl command
const curl = logger.toCurl(entries[0]);

// Clear
logger.clear();
```

## License

MIT
