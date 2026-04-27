/**
 * WebBridge Native 요청 객체.
 * Fetch API의 Request를 기반으로 하되, native bridge 매칭을 위한 id 필드 추가.
 */
export interface WebBridgeRequest {
  /** 요청 URL (절대 경로) */
  url: string;
  /** HTTP 메서드 */
  method: string;
  /** 요청 헤더 */
  headers: Record<string, string>;
  /** 요청 본문 */
  body?: string | ArrayBuffer | null;
  /** 자격 증명 모드 */
  credentials?: 'omit' | 'same-origin' | 'include';
  /** 리다이렉트 모드 */
  redirect?: 'follow' | 'manual' | 'error';
  /** 취소 시그널 */
  signal?: AbortSignal;
  /** 고유 요청 ID (native bridge 매칭용) */
  id: string;
}

/**
 * WebBridge Native 응답 객체.
 * Fetch API의 Response를 기반.
 */
export interface WebBridgeResponse {
  /** 응답 URL */
  url: string;
  /** HTTP 상태 코드 */
  status: number;
  /** HTTP 상태 텍스트 */
  statusText: string;
  /** 응답 헤더 */
  headers: Record<string, string>;
  /** 응답 본문 */
  body: string | ArrayBuffer | null;
  /** 상태 코드 200-299 여부 */
  ok: boolean;
  /** 리다이렉트 응답 여부 */
  redirected: boolean;
  /** 응답 타입 */
  type: 'basic' | 'cors' | 'error' | 'opaque';
}

/**
 * 인터셉터 함수 타입.
 * 요청을 받아 처리하고, next()를 호출하여 체인의 다음 인터셉터로 전달.
 */
export type Interceptor = (
  request: WebBridgeRequest,
  next: (request: WebBridgeRequest) => Promise<WebBridgeResponse>,
) => Promise<WebBridgeResponse>;

/**
 * Fetch API의 RequestInit 호환 타입.
 */
export interface WebBridgeRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string | ArrayBuffer | null;
  credentials?: 'omit' | 'same-origin' | 'include';
  redirect?: 'follow' | 'manual' | 'error';
  signal?: AbortSignal;
}
