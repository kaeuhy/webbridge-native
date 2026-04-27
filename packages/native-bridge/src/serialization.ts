import type { WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';

/** Native로 전달되는 직렬화된 요청 형식 */
export interface SerializedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

/** Native에서 반환되는 직렬화된 응답 형식 */
export interface SerializedResponse {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string | null;
}

/** WebBridgeRequest → JSON 직렬화 */
export function serializeRequest(request: WebBridgeRequest): string {
  const serialized: SerializedRequest = {
    id: request.id,
    url: request.url,
    method: request.method,
    headers: request.headers,
    body: typeof request.body === 'string' ? request.body : null,
  };
  return JSON.stringify(serialized);
}

/** JSON → WebBridgeResponse 역직렬화 */
export function deserializeResponse(
  json: string,
  requestUrl: string,
): WebBridgeResponse {
  const parsed: SerializedResponse = JSON.parse(json);
  const status = parsed.status;
  return {
    url: parsed.url || requestUrl,
    status,
    statusText: parsed.statusText || '',
    headers: parsed.headers || {},
    body: parsed.body ?? null,
    ok: status >= 200 && status < 300,
    redirected: false,
    type: 'basic',
  };
}
