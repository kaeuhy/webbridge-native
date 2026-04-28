# @webbridge-native/adapter-axios

> 기존 RN axios 프로젝트에 브라우저 시맨틱을 적용.

## Problem

RN 프로젝트에서 axios를 사용 중인데, 쿠키/캐시/헤더를 브라우저처럼 자동 관리하고 싶습니다. axios를 걷어내지 않고 기존 코드를 유지하면서요.

## Solution

axios adapter를 교체하여 WebBridge 인터셉터 체인을 통과하게 합니다. 기존 axios 코드 변경 없음.

## 설치

```bash
pnpm add @webbridge-native/adapter-axios @webbridge-native/core @webbridge-native/preset axios
```

## 사용법

```typescript
import axios from 'axios';
import { setupWebBridge } from '@webbridge-native/preset';
import { createAxiosAdapter } from '@webbridge-native/adapter-axios';

const { client } = setupWebBridge({ cookies: true });

const api = axios.create({
  baseURL: 'https://api.myapp.com',
  adapter: createAxiosAdapter(client),
});

// 기존 코드 그대로 — 쿠키/캐시/헤더 자동 적용
const { data } = await api.get('/users');
```

## 지원 기능

- baseURL, params, paramsSerializer
- timeout (AbortSignal 기반)
- validateStatus
- JSON auto-parsing
- signal (AbortController)

## License

MIT
