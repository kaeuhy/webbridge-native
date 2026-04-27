import type {
  WebBridgeRequest,
  WebBridgeResponse,
  WebBridgeRequestInit,
} from './types';

let requestCounter = 0;

/**
 * 고유 요청 ID를 생성한다.
 * 단순 카운터 기반 — 앱 세션 내에서 유일성 보장.
 */
export function generateRequestId(): string {
  requestCounter += 1;
  return `wb-${Date.now()}-${requestCounter}`;
}

/** HTTP 상태 코드가 200-299 범위인지 확인 */
function isOkStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/** 상태 코드에 대한 기본 상태 텍스트 */
const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

/**
 * URL과 RequestInit으로부터 WebBridgeRequest를 생성한다.
 */
export function createRequest(
  url: string,
  init?: WebBridgeRequestInit,
): WebBridgeRequest {
  return {
    url,
    method: init?.method?.toUpperCase() ?? 'GET',
    headers: init?.headers ? { ...init.headers } : {},
    body: init?.body ?? null,
    credentials: init?.credentials ?? 'same-origin',
    redirect: init?.redirect ?? 'follow',
    signal: init?.signal,
    id: generateRequestId(),
  };
}

/**
 * 부분 응답 정보로부터 완전한 WebBridgeResponse를 생성한다.
 * 미지정 필드는 기본값이 적용된다.
 */
export function createResponse(
  init: Partial<WebBridgeResponse> & { status?: number },
): WebBridgeResponse {
  const status = init.status ?? 200;
  return {
    url: init.url ?? '',
    status,
    statusText: init.statusText ?? STATUS_TEXT[status] ?? '',
    headers: init.headers ? { ...init.headers } : {},
    body: init.body ?? null,
    ok: init.ok ?? isOkStatus(status),
    redirected: init.redirected ?? false,
    type: init.type ?? 'basic',
  };
}
