import type { Interceptor } from '@webbridge-native/core';
import { RequestLogger } from './logger';

export interface DevToolsInterceptorOptions {
  /** 사용할 RequestLogger 인스턴스 */
  logger: RequestLogger;
}

/**
 * DevTools 인터셉터 — 모든 요청/응답을 로거에 기록.
 * 인터셉터 체인의 첫 번째에 위치시켜 전체 파이프라인 시간을 측정.
 */
export function devtoolsInterceptor(
  options: DevToolsInterceptorOptions,
): Interceptor {
  const { logger } = options;

  return async (request, next) => {
    const startTime = Date.now();
    try {
      const response = await next(request);
      const endTime = Date.now();
      logger.log(request, response, startTime, endTime);
      return response;
    } catch (error) {
      const endTime = Date.now();
      logger.log(
        request,
        {
          url: request.url,
          status: 0,
          statusText: error instanceof Error ? error.message : 'Unknown error',
          headers: {},
          body: null,
          ok: false,
          redirected: false,
          type: 'error',
        },
        startTime,
        endTime,
      );
      throw error;
    }
  };
}
