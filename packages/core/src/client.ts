import type {
  Interceptor,
  WebBridgeRequest,
  WebBridgeRequestInit,
  WebBridgeResponse,
} from './types';
import { createRequest } from './utils';

/**
 * WebBridgeClient — 인터셉터 체인을 통해 요청을 처리하는 HTTP 클라이언트.
 *
 * 인터셉터는 등록 순서대로 실행된다.
 * 마지막 인터셉터의 next()는 에러를 throw한다 (terminal interceptor 필요).
 *
 * @example
 * ```typescript
 * const client = new WebBridgeClient();
 * client.use(cookieInterceptor);
 * client.use(nativeBridgeInterceptor);
 * const response = await client.fetch('https://api.example.com/users');
 * ```
 */
export class WebBridgeClient {
  private interceptors: Interceptor[] = [];

  /**
   * 인터셉터를 체인에 등록한다.
   * 등록 순서대로 실행된다.
   */
  use(interceptor: Interceptor): this {
    this.interceptors.push(interceptor);
    return this;
  }

  /**
   * 인터셉터 체인을 통해 요청을 실행한다.
   *
   * @throws 인터셉터가 없거나 체인 끝에 도달 시 에러
   * @throws AbortSignal이 이미 중단된 경우 에러
   */
  async fetch(
    url: string,
    init?: WebBridgeRequestInit,
  ): Promise<WebBridgeResponse> {
    const request = createRequest(url, init);

    if (request.signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    if (this.interceptors.length === 0) {
      throw new Error(
        'WebBridgeClient: No interceptors registered. ' +
          'At least one interceptor (e.g., nativeBridgeInterceptor) is required.',
      );
    }

    return this.executeChain(request, 0);
  }

  private executeChain(
    request: WebBridgeRequest,
    index: number,
  ): Promise<WebBridgeResponse> {
    if (index >= this.interceptors.length) {
      throw new Error(
        'WebBridgeClient: Interceptor chain exhausted. ' +
          'The last interceptor must not call next(). ' +
          'Ensure a terminal interceptor (e.g., nativeBridgeInterceptor) is registered last.',
      );
    }

    const interceptor = this.interceptors[index];
    const next = (req: WebBridgeRequest): Promise<WebBridgeResponse> => {
      // AbortSignal 체크
      if (req.signal?.aborted) {
        return Promise.reject(
          new DOMException('The operation was aborted.', 'AbortError'),
        );
      }
      return this.executeChain(req, index + 1);
    };

    return interceptor(request, next);
  }
}
