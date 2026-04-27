import type { WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';

/** Native로 전달되는 직렬화된 요청 형식 */
export interface SerializedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  /** body가 base64로 인코딩되었는지 여부 */
  bodyEncoding: 'utf8' | 'base64';
}

/** Native에서 반환되는 직렬화된 응답 형식 */
export interface SerializedResponse {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string | null;
  /** body가 base64로 인코딩되었는지 여부 */
  bodyEncoding?: 'utf8' | 'base64';
  /** 다중 값 헤더 (Set-Cookie 등) */
  rawHeaders?: Record<string, string[]>;
}

/** WebBridgeRequest → JSON 직렬화 */
export function serializeRequest(request: WebBridgeRequest): string {
  let body: string | null = null;
  let bodyEncoding: 'utf8' | 'base64' = 'utf8';

  if (typeof request.body === 'string') {
    body = request.body;
  } else if (request.body instanceof ArrayBuffer) {
    body = arrayBufferToBase64(request.body);
    bodyEncoding = 'base64';
  }

  const serialized: SerializedRequest = {
    id: request.id,
    url: request.url,
    method: request.method,
    headers: request.headers,
    body,
    bodyEncoding,
  };
  return JSON.stringify(serialized);
}

/** JSON → WebBridgeResponse 역직렬화 */
export function deserializeResponse(
  json: string,
  requestUrl: string,
): WebBridgeResponse {
  let parsed: SerializedResponse;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error(
      `Failed to parse native response JSON: ${e instanceof Error ? e.message : 'unknown'}. ` +
        `Response (first 200 chars): ${json.slice(0, 200)}`,
    );
  }
  const status = parsed.status;

  let body: string | ArrayBuffer | null = parsed.body;
  if (parsed.body && parsed.bodyEncoding === 'base64') {
    body = base64ToArrayBuffer(parsed.body);
  }

  return {
    url: parsed.url || requestUrl,
    status,
    statusText: parsed.statusText || '',
    headers: parsed.headers || {},
    rawHeaders: parsed.rawHeaders,
    body,
    ok: status >= 200 && status < 300,
    redirected: false,
    type: 'basic',
  };
}

/** ArrayBuffer → Base64 문자열 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // chunk 방식으로 변환하여 대용량 ArrayBuffer에서도 O(n) 보장
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
    chunks.push(String.fromCharCode(...slice));
  }
  return btoa(chunks.join(''));
}

/** Base64 문자열 → ArrayBuffer */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
