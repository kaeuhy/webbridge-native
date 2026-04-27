# Data Processing — WebBridge Native

## What data does this library process?

WebBridge Native processes HTTP request and response data **within the user's application**:

| Data Type | Processing | Storage | External Transmission |
|---|---|---|---|
| HTTP headers (including cookies) | Read, parse, modify | Memory (+ optional disk via MMKV) | Never |
| HTTP response bodies | Pass through (cache optional) | Memory (LRU, bounded) | Never |
| URL paths and parameters | Read for routing/matching | Memory only | Never |
| DevTools logs | Record timing and metadata | Memory (bounded, 500 entries default) | Never |

## What this library does NOT do

- **No telemetry**: Zero external network calls from library code
- **No analytics**: No usage tracking, crash reporting, or metrics collection
- **No data sharing**: All data stays within the user's application sandbox
- **No background processing**: No background tasks, no wake locks

## Data retention

| Store | Default Limit | Configurable | Deletion |
|---|---|---|---|
| CookieJar (memory) | 50/domain, 3000 total | Yes | `jar.clear()` |
| CookieJar (persistent) | Same as memory | Yes | `jar.clear()` + storage delete |
| HttpCache | 500 entries, 50MB | Yes | `cache.clear()` |
| DevTools logger | 500 entries, 64KB/body | Yes | `logger.clear()` |

## GDPR / Data erasure

Call `dispose()` on the WebBridge instance to clear all data:

```typescript
const { dispose } = setupWebBridge({ cookies: true });
// ... later
dispose(); // clears cookies, cache, mock server
```

For complete erasure including persistent storage:

```typescript
jar.clear();    // all cookies
cache.clear();  // all cache
logger.clear(); // all logs
```

## File system access

| Platform | Location | Protection |
|---|---|---|
| iOS | App sandbox (Documents) | NSFileProtectionComplete |
| Android | App private storage | MODE_PRIVATE |

Cache and persistent cookie files are stored only within the app's private sandbox. Other apps cannot access them.
