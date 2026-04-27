import type { WebBridgeClient } from '@webbridge-native/core';
import type {
  AxiosAdapter,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosHeaders,
} from 'axios';

/**
 * Axios adapter — WebBridgeClient를 통해 요청을 처리.
 *
 * axios의 모든 요청이 WebBridge 인터셉터 체인을 거치게 된다.
 * cookies, headers, cache, mock 등 모든 기능이 자동 적용.
 *
 * @example
 * ```typescript
 * import axios from 'axios';
 * import { createAxiosAdapter } from '@webbridge-native/adapter-axios';
 *
 * const client = setupWebBridge({ cookies: true });
 * const api = axios.create({
 *   adapter: createAxiosAdapter(client.client),
 * });
 * ```
 */
export function createAxiosAdapter(client: WebBridgeClient): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const url = buildUrl(config);
    const method = (config.method ?? 'GET').toUpperCase();

    const headers: Record<string, string> = {};
    if (config.headers) {
      // AxiosHeaders → plain object
      const rawHeaders = config.headers instanceof Object && 'toJSON' in config.headers
        ? (config.headers as AxiosHeaders).toJSON() as Record<string, unknown>
        : config.headers as Record<string, unknown>;
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (value !== undefined && value !== null) {
          headers[key] = String(value);
        }
      }
    }

    let body: string | null = null;
    if (config.data !== undefined && config.data !== null) {
      body = typeof config.data === 'string'
        ? config.data
        : JSON.stringify(config.data);
    }

    const response = await client.fetch(url, {
      method,
      headers,
      body: body ?? undefined,
      signal: config.signal instanceof AbortSignal ? config.signal : undefined,
    });

    // Parse response data
    let data: unknown = response.body;
    if (typeof response.body === 'string') {
      const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(response.body);
        } catch {
          data = response.body;
        }
      }
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      config,
      request: undefined,
    } as AxiosResponse;
  };
}

function buildUrl(config: InternalAxiosRequestConfig): string {
  const baseURL = config.baseURL ?? '';
  const url = config.url ?? '';

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}
