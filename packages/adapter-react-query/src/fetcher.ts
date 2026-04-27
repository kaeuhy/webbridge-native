import type { WebBridgeClient, WebBridgeRequestInit, WebBridgeResponse } from '@webbridge-native/core';

/**
 * React Query용 fetcher 팩토리.
 *
 * WebBridgeClient를 React Query의 queryFn으로 사용할 수 있게 래핑.
 * cookies, headers, cache, mock 등 모든 인터셉터가 자동 적용.
 *
 * @example
 * ```typescript
 * import { useQuery } from '@tanstack/react-query';
 * import { createFetcher } from '@webbridge-native/adapter-react-query';
 *
 * const fetcher = createFetcher(client);
 *
 * function useUser(id: string) {
 *   return useQuery({
 *     queryKey: ['user', id],
 *     queryFn: () => fetcher.json(`/users/${id}`),
 *   });
 * }
 * ```
 */
export interface WebBridgeFetcher {
  /** 요청을 실행하고 WebBridgeResponse를 반환한다. */
  raw(url: string, init?: WebBridgeRequestInit): Promise<WebBridgeResponse>;

  /** 요청을 실행하고 JSON 파싱된 결과를 반환한다. */
  json<T = unknown>(url: string, init?: WebBridgeRequestInit): Promise<T>;

  /** 요청을 실행하고 텍스트를 반환한다. */
  text(url: string, init?: WebBridgeRequestInit): Promise<string>;
}

/**
 * React Query queryFn 래퍼 — AbortSignal을 자동 전달한다.
 *
 * @example
 * ```typescript
 * const fetcher = createFetcher(client);
 * useQuery({
 *   queryKey: ['user', id],
 *   queryFn: ({ signal }) => fetcher.json(`/users/${id}`, { signal }),
 * });
 * ```
 */

export interface CreateFetcherOptions {
  /** 기본 URL 접두사 */
  baseURL?: string;
  /** 기본 헤더 */
  defaultHeaders?: Record<string, string>;
}

/**
 * WebBridgeClient를 React Query queryFn에 적합한 fetcher로 변환한다.
 */
export function createFetcher(
  client: WebBridgeClient,
  options?: CreateFetcherOptions,
): WebBridgeFetcher {
  const baseURL = options?.baseURL ?? '';
  const defaultHeaders = options?.defaultHeaders ?? {};

  function resolveUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
  }

  function mergeInit(init?: WebBridgeRequestInit): WebBridgeRequestInit {
    return {
      ...init,
      headers: { ...defaultHeaders, ...init?.headers },
    };
  }

  return {
    async raw(url, init) {
      const response = await client.fetch(resolveUrl(url), mergeInit(init));
      if (!response.ok) {
        throw new FetchError(response.status, response.statusText, response);
      }
      return response;
    },

    async json<T = unknown>(url: string, init?: WebBridgeRequestInit): Promise<T> {
      const response = await client.fetch(resolveUrl(url), mergeInit(init));
      if (!response.ok) {
        throw new FetchError(response.status, response.statusText, response);
      }
      if (typeof response.body !== 'string') {
        throw new Error(`Response body is not a string (url: ${url})`);
      }
      try {
        return JSON.parse(response.body) as T;
      } catch (e) {
        throw new Error(
          `Failed to parse JSON from ${url} (status: ${response.status}): ${e instanceof Error ? e.message : 'unknown'}`,
        );
      }
    },

    async text(url, init) {
      const response = await client.fetch(resolveUrl(url), mergeInit(init));
      if (!response.ok) {
        throw new FetchError(response.status, response.statusText, response);
      }
      return typeof response.body === 'string' ? response.body : '';
    },
  };
}

/**
 * HTTP 에러 — non-2xx 응답 시 throw.
 */
export class FetchError extends Error {
  readonly status: number;
  readonly response: WebBridgeResponse;

  constructor(status: number, statusText: string, response: WebBridgeResponse) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'FetchError';
    this.status = status;
    this.response = response;
  }
}
