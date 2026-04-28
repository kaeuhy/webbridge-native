# @webbridge-native/preset

## 0.2.0

### Minor Changes

- e623e91: Initial release of WebBridge Native — browser-compatible networking for React Native.

  ### Packages

  **Tier 1 (Core)**

  - `@webbridge-native/core` — Interceptor chain, types, header utilities
  - `@webbridge-native/cookies` — RFC 6265 cookie jar with SameSite, PSL validation
  - `@webbridge-native/headers` — Browser-like header auto-injection
  - `@webbridge-native/mock` — MSW v2 compatible mocking
  - `@webbridge-native/native-bridge` — iOS NSURLProtocol + Android OkHttp Network Interceptor
  - `@webbridge-native/preset` — One-call setup bundle

  **Tier 2 (Semantics)**

  - `@webbridge-native/cache` — RFC 7234 HTTP cache with ETag/304, Vary, LRU
  - `@webbridge-native/redirect` — 301-308 handling with cross-origin header stripping
  - `@webbridge-native/devtools` — Request logger, HAR 1.2 export, curl generation

  **Tier 3 (Advanced)**

  - `@webbridge-native/cors` — Dev-only CORS simulator
  - `@webbridge-native/sse` — EventSource polyfill (parser + interface)

  **Tier 4 (Ecosystem)**

  - `@webbridge-native/adapter-axios` — Axios adapter with validateStatus, timeout, params
  - `@webbridge-native/adapter-react-query` — React Query fetcher with AbortSignal support

### Patch Changes

- 7734159: ### All packages

  - Add detailed README.md with installation, usage examples, and API reference
  - Include README.md in npm tarball

  ### @webbridge-native/devtools

  - Add DevToolsPanel class — filterable data layer for in-app network inspector
  - Panel supports URL/method/status filtering, polling, summary statistics

- Updated dependencies [e623e91]
- Updated dependencies [7734159]
  - @webbridge-native/core@0.2.0
  - @webbridge-native/cookies@0.2.0
  - @webbridge-native/headers@0.2.0
  - @webbridge-native/mock@0.2.0

## 0.1.0

### Minor Changes

- 76f8ac5: Initial release of WebBridge Native — browser-compatible networking for React Native.

  ### Packages

  **Tier 1 (Core)**

  - `@webbridge-native/core` — Interceptor chain, types, header utilities
  - `@webbridge-native/cookies` — RFC 6265 cookie jar with SameSite, PSL validation
  - `@webbridge-native/headers` — Browser-like header auto-injection
  - `@webbridge-native/mock` — MSW v2 compatible mocking
  - `@webbridge-native/native-bridge` — iOS NSURLProtocol + Android OkHttp Network Interceptor
  - `@webbridge-native/preset` — One-call setup bundle

  **Tier 2 (Semantics)**

  - `@webbridge-native/cache` — RFC 7234 HTTP cache with ETag/304, Vary, LRU
  - `@webbridge-native/redirect` — 301-308 handling with cross-origin header stripping
  - `@webbridge-native/devtools` — Request logger, HAR 1.2 export, curl generation

  **Tier 3 (Advanced)**

  - `@webbridge-native/cors` — Dev-only CORS simulator
  - `@webbridge-native/sse` — EventSource polyfill (parser + interface)

  **Tier 4 (Ecosystem)**

  - `@webbridge-native/adapter-axios` — Axios adapter with validateStatus, timeout, params
  - `@webbridge-native/adapter-react-query` — React Query fetcher with AbortSignal support

### Patch Changes

- Updated dependencies [76f8ac5]
  - @webbridge-native/core@0.1.0
  - @webbridge-native/cookies@0.1.0
  - @webbridge-native/headers@0.1.0
  - @webbridge-native/mock@0.1.0
