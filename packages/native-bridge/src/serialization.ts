import type { WebBridgeRequest, WebBridgeResponse } from '@webbridge-native/core';

/**
 * Native bridge를 통해 전달되는 요청 데이터.
 * TurboModule 이벤트로 전달되므로 primitive + string만 사용.
 */
export interface BridgeRequestPayload {
  requestId: string;
  url: string;
  method: string;
  headers: string; // JSON-encoded Record<string, string>
  body: string | null;
  bodyEncoding: 'text' | 'base64';
}

/**
 * JS → Native로 전달되는 응답 데이터.
 * resolveRequest()의 JSON string으로 직렬화.
 */
export interface BridgeResponsePayload {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  rawHeaders?: Record<string, string[]>;
  body: string | null;
  bodyEncoding: 'text' | 'base64';
}

/**
 * WebBridgeRequest를 BridgeRequestPayload로 변환.
 * Native에서 JS로 이벤트 전달 시 사용.
 */
export function serializeRequest(request: WebBridgeRequest): BridgeRequestPayload {
  let body: string | null = null;
  let bodyEncoding: 'text' | 'base64' = 'text';

  if (request.body != null) {
    if (typeof request.body === 'string') {
      body = request.body;
    } else {
      // ArrayBuffer → base64
      body = arrayBufferToBase64(request.body);
      bodyEncoding = 'base64';
    }
  }

  return {
    requestId: request.id,
    url: request.url,
    method: request.method,
    headers: JSON.stringify(request.headers),
    body,
    bodyEncoding,
  };
}

/**
 * BridgeRequestPayload를 WebBridgeRequest로 복원.
 * Native 이벤트 수신 후 JS 핸들러에 전달 시 사용.
 */
export function deserializeRequest(payload: BridgeRequestPayload): WebBridgeRequest {
  let body: string | ArrayBuffer | null = null;

  if (payload.body != null) {
    if (payload.bodyEncoding === 'base64') {
      body = base64ToArrayBuffer(payload.body);
    } else {
      body = payload.body;
    }
  }

  return {
    id: payload.requestId,
    url: payload.url,
    method: payload.method,
    headers: JSON.parse(payload.headers) as Record<string, string>,
    body,
  };
}

/**
 * WebBridgeResponse를 JSON string으로 직렬화.
 * resolveRequest() 호출 시 사용.
 */
export function serializeResponse(response: WebBridgeResponse): string {
  let body: string | null = null;
  let bodyEncoding: 'text' | 'base64' = 'text';

  if (response.body != null) {
    if (typeof response.body === 'string') {
      body = response.body;
    } else {
      body = arrayBufferToBase64(response.body);
      bodyEncoding = 'base64';
    }
  }

  const payload: BridgeResponsePayload = {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    rawHeaders: response.rawHeaders,
    body,
    bodyEncoding,
  };

  return JSON.stringify(payload);
}

/**
 * JSON string을 WebBridgeResponse로 복원.
 * Native에서 실제 네트워크 응답 수신 후 JS로 반환 시 사용.
 */
export function deserializeResponse(
  json: string,
  requestUrl: string,
): WebBridgeResponse {
  const payload = JSON.parse(json) as BridgeResponsePayload;

  let body: string | ArrayBuffer | null = null;
  if (payload.body != null) {
    if (payload.bodyEncoding === 'base64') {
      body = base64ToArrayBuffer(payload.body);
    } else {
      body = payload.body;
    }
  }

  const status = payload.status;
  return {
    url: requestUrl,
    status,
    statusText: payload.statusText,
    headers: payload.headers,
    rawHeaders: payload.rawHeaders,
    body,
    ok: status >= 200 && status < 300,
    redirected: false,
    type: 'basic',
  };
}

/** ArrayBuffer → base64 string */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** base64 string → ArrayBuffer */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
