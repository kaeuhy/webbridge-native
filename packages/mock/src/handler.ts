import type { WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';

export interface HandlerContext {
  /** URL path params (`:id` 등) */
  params: Record<string, string>;
  /** 원본 요청 */
  request: WebBridgeRequest;
}

export type HandlerResolver = (
  context: HandlerContext,
) => WebBridgeResponse | Promise<WebBridgeResponse>;

export interface RequestHandler {
  method: string;
  pattern: string;
  resolver: HandlerResolver;
}

/** passthrough를 나타내는 특수 심볼 */
export const PASSTHROUGH = Symbol('passthrough');

export type PassthroughResponse = typeof PASSTHROUGH;

/**
 * URL 패턴을 매칭하고 path params를 추출한다.
 *
 * 지원 패턴:
 * - exact: 'https://api.example.com/users'
 * - path params: 'https://api.example.com/users/:id'
 * - wildcard: 'https://api.example.com/*'
 */
export function matchUrl(
  pattern: string,
  url: string,
): Record<string, string> | null {
  // 쿼리스트링 제거
  const cleanUrl = url.split('?')[0];
  const cleanPattern = pattern.split('?')[0];

  const patternParts = cleanPattern.split('/');
  const urlParts = cleanUrl.split('/');

  // wildcard 마지막 세그먼트
  if (patternParts[patternParts.length - 1] === '*') {
    const prefixParts = patternParts.slice(0, -1);
    if (urlParts.length < prefixParts.length) return null;
    for (let i = 0; i < prefixParts.length; i++) {
      if (prefixParts[i].startsWith(':')) continue;
      if (prefixParts[i] !== urlParts[i]) return null;
    }
    // wildcard 매칭 — params 추출
    const params: Record<string, string> = {};
    for (let i = 0; i < prefixParts.length; i++) {
      if (prefixParts[i].startsWith(':')) {
        params[prefixParts[i].slice(1)] = urlParts[i];
      }
    }
    return params;
  }

  if (patternParts.length !== urlParts.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = urlParts[i];
    } else if (patternParts[i] !== urlParts[i]) {
      return null;
    }
  }

  return params;
}

/**
 * 요청에 매칭되는 핸들러를 찾는다.
 * 배열 앞쪽에 있는 핸들러가 우선.
 */
export function findHandler(
  handlers: RequestHandler[],
  request: WebBridgeRequest,
): { handler: RequestHandler; params: Record<string, string> } | null {
  for (const handler of handlers) {
    if (handler.method !== request.method) continue;
    const params = matchUrl(handler.pattern, request.url);
    if (params !== null) {
      return { handler, params };
    }
  }
  return null;
}
