import type { Interceptor } from '@webbridge-native/core';
import { checkCorsHeaders, isSimpleRequest } from './cors-check';

export interface CorsInterceptorOptions {
  /** 앱의 Origin (예: 'https://myapp.local') */
  origin: string;
  /** enforce: 차단 / warn: 경고만 (기본: 'warn') */
  mode?: 'enforce' | 'warn';
}

/**
 * Dev-only CORS 시뮬레이터 인터셉터.
 * 브라우저의 CORS 동작을 시뮬레이션하여 개발 중 CORS 문제를 조기 발견.
 *
 * Production에서는 Babel plugin으로 제거.
 */
export function corsInterceptor(options: CorsInterceptorOptions): Interceptor {
  const { origin, mode = 'warn' } = options;

  return async (request, next) => {
    // Same-origin은 항상 통과
    try {
      const reqOrigin = new URL(request.url).origin;
      if (reqOrigin === origin) return next(request);
    } catch {
      // URL 파싱 실패 시 진행
    }

    // Origin 헤더 주입
    const headers = { ...request.headers, Origin: origin };

    // Preflight 필요 여부 판단
    const needsPreflight = !isSimpleRequest(request.method, request.headers);

    if (needsPreflight) {
      // TODO: 실제 OPTIONS preflight 요청은 native-bridge 통합 후 구현
      // 현재는 실제 요청만 실행하고 응답 헤더로 CORS 검증
    }

    const response = await next({ ...request, headers });

    // CORS 검사
    const result = checkCorsHeaders(
      origin,
      request.method,
      request.headers,
      response.headers,
    );

    if (!result.allowed) {
      const message = `[CORS] ${request.method} ${request.url} blocked: ${result.reason}`;

      if (mode === 'enforce') {
        throw new TypeError(message);
      }

      console.warn(message);
    }

    return response;
  };
}
