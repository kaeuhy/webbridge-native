# @webbridge-native/observers

Performance API (marks, measures, PerformanceObserver) and `requestIdleCallback` polyfill for React Native.

## Installation

```bash
npm install @webbridge-native/observers
# or
pnpm add @webbridge-native/observers
```

## Usage

### Performance API

```typescript
import { WBPerformance, WBPerformanceObserver } from '@webbridge-native/observers';

const perf = new WBPerformance();

// Create marks
perf.mark('fetch-start');
await fetch('https://example.com/api');
perf.mark('fetch-end');

// Measure between marks
const measure = perf.measure('fetch-duration', 'fetch-start', 'fetch-end');
console.log(`Fetch took ${measure.duration}ms`);

// Measure with options
perf.measure('custom', { start: 0, end: 100 });

// Query entries
const marks = perf.getEntriesByType('mark');
const measures = perf.getEntriesByName('fetch-duration');

// Observe new entries
const observer = new WBPerformanceObserver((list, obs) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration}ms`);
  }
});

observer.observe({ entryTypes: ['measure'], performance: perf });

// Cleanup
observer.disconnect();
perf.clearMarks();
perf.clearMeasures();
```

### requestIdleCallback

```typescript
import { wbRequestIdleCallback, wbCancelIdleCallback } from '@webbridge-native/observers';

const id = wbRequestIdleCallback((deadline) => {
  while (deadline.timeRemaining() > 0) {
    // Do non-urgent work
    processNextItem();
  }
});

// Cancel if needed
wbCancelIdleCallback(id);

// With timeout (force execution after 1000ms)
wbRequestIdleCallback(
  (deadline) => {
    if (deadline.didTimeout) {
      // Forced execution — do minimal work
    }
    doWork();
  },
  { timeout: 1000 },
);
```

## API

### WBPerformance

| Method | Description |
|--------|-------------|
| `now()` | High-resolution timestamp relative to timeOrigin |
| `mark(name, options?)` | Create a named timestamp |
| `measure(name, start?, end?)` | Measure duration between marks |
| `getEntries()` | Get all entries |
| `getEntriesByType(type)` | Filter entries by type |
| `getEntriesByName(name, type?)` | Filter entries by name |
| `clearMarks(name?)` | Remove marks |
| `clearMeasures(name?)` | Remove measures |

### WBPerformanceObserver

| Method | Description |
|--------|-------------|
| `observe({ entryTypes, performance })` | Start observing |
| `disconnect()` | Stop observing |
| `takeRecords()` | Get buffered entries |

### requestIdleCallback

| Function | Description |
|----------|-------------|
| `wbRequestIdleCallback(cb, opts?)` | Schedule idle callback |
| `wbCancelIdleCallback(id)` | Cancel scheduled callback |

## License

MIT
