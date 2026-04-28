import type { RequestHandler, HandlerResolver } from './handler';

function createMethodHandler(method: string) {
  return (pattern: string, resolver: HandlerResolver): RequestHandler => ({
    method,
    pattern,
    resolver,
  });
}

/**
 * MSW v2 호환 http 네임스페이스.
 *
 * @example
 * ```typescript
 * http.get('https://api.example.com/users/:id', ({ params }) => {
 *   return HttpResponse.json({ id: params.id });
 * });
 * ```
 */
export const http = {
  get: createMethodHandler('GET'),
  post: createMethodHandler('POST'),
  put: createMethodHandler('PUT'),
  delete: createMethodHandler('DELETE'),
  patch: createMethodHandler('PATCH'),
};
