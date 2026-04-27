import type { WebBridgeResponse } from '@webbridge-native/core';
import { createResponse } from '@webbridge-native/core';

/**
 * MSW v2 호환 HttpResponse 빌더.
 */
export const HttpResponse = {
  /**
   * JSON 응답을 생성한다.
   */
  json(
    body: unknown,
    init?: { status?: number; headers?: Record<string, string> },
  ): WebBridgeResponse {
    const jsonString = JSON.stringify(body);
    return createResponse({
      status: init?.status ?? 200,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      body: jsonString,
    });
  },

  /**
   * 텍스트 응답을 생성한다.
   */
  text(
    body: string,
    init?: { status?: number; headers?: Record<string, string> },
  ): WebBridgeResponse {
    return createResponse({
      status: init?.status ?? 200,
      headers: {
        'Content-Type': 'text/plain',
        ...init?.headers,
      },
      body,
    });
  },

  /**
   * 에러 응답을 생성한다.
   */
  error(): WebBridgeResponse {
    return createResponse({
      status: 0,
      statusText: '',
      type: 'error',
      body: null,
    });
  },
};
