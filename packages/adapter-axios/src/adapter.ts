import type { WebBridgeClient } from '@webbridge-native/core';
import { getHeader } from '@webbridge-native/core';
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
 *
 * @example
 * ```typescript
 * const api = axios.create({
 *   adapter: createAxiosAdapter(client),
 * });
 * ```
 */
export function createAxiosAdapter(client: WebBridgeClient): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const url = buildUrl(config);
    const method = (config.method ?? 'GET').toUpperCase();

    const headers: Record<string, string> = {};
    if (config.headers) {
      const rawHeaders = config.headers instanceof Object && 'toJSON' in config.headers
        ? (config.headers as AxiosHeaders).toJSON() as Record<string, unknown>
        : config.headers as Record<string, unknown>;
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (value !== undefined && value !== null) {
          headers[key] = String(value);
        }
      }
    }

    // Body 직렬화 — FormData는 지원하지 않음 (명시적 에러)
    let body: string | undefined;
    if (config.data !== undefined && config.data !== null) {
      if (typeof config.data === 'string') {
        body = config.data;
      } else if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        throw new Error(
          '@webbridge-native/adapter-axios: FormData is not supported. ' +
            'Serialize the data manually before passing to axios.',
        );
      } else {
        body = JSON.stringify(config.data);
      }
    }

    // AbortSignal: config.signal 또는 config.timeout 기반
    let signal: AbortSignal | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (config.signal instanceof AbortSignal) {
      signal = config.signal;
    } else if (config.timeout && config.timeout > 0) {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), config.timeout);
      signal = controller.signal;
    }

    let response;
    try {
      response = await client.fetch(url, {
        method,
        headers,
        body,
        signal,
      });
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }

    // Parse response data
    let data: unknown = response.body;
    if (typeof response.body === 'string') {
      const contentType = getHeader(response.headers, 'content-type') ?? '';
      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(response.body);
        } catch {
          data = response.body;
        }
      }
    }

    const axiosResponse: AxiosResponse = {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      config,
      request: undefined,
    };

    // validateStatus 체크 (기본: 200-299)
    const validateStatus = config.validateStatus ?? ((s: number) => s >= 200 && s < 300);
    if (!validateStatus(response.status)) {
      const error = new Error(`Request failed with status code ${response.status}`) as Error & {
        response: AxiosResponse;
        config: InternalAxiosRequestConfig;
        isAxiosError: boolean;
      };
      error.response = axiosResponse;
      error.config = config;
      error.isAxiosError = true;
      throw error;
    }

    return axiosResponse;
  };
}

function buildUrl(config: InternalAxiosRequestConfig): string {
  const baseURL = config.baseURL ?? '';
  const url = config.url ?? '';

  let fullUrl: string;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    fullUrl = url;
  } else {
    const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    const path = url.startsWith('/') ? url : `/${url}`;
    fullUrl = `${base}${path}`;
  }

  // Append query params
  if (config.params && typeof config.params === 'object') {
    const serializer = config.paramsSerializer;
    let qs: string;

    if (typeof serializer === 'function') {
      qs = serializer(config.params);
    } else if (serializer && typeof serializer === 'object' && 'serialize' in serializer) {
      qs = (serializer as { serialize: (p: unknown) => string }).serialize(config.params);
    } else {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(config.params as Record<string, unknown>)) {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            for (const v of value) {
              searchParams.append(key, String(v));
            }
          } else {
            searchParams.append(key, String(value));
          }
        }
      }
      qs = searchParams.toString();
    }

    if (qs) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
    }
  }

  return fullUrl;
}
