import { setupServer } from './server';
import { http } from './http';
import { HttpResponse } from './http-response';
import { matchUrl } from './handler';
import { WebBridgeClient, createResponse } from '@webbridge-native/core';
import type { Interceptor } from '@webbridge-native/core';

describe('matchUrl', () => {
  it('matches exact URL', () => {
    expect(matchUrl('https://api.example.com/users', 'https://api.example.com/users')).toEqual({});
  });

  it('returns null for mismatch', () => {
    expect(matchUrl('https://api.example.com/users', 'https://api.example.com/posts')).toBeNull();
  });

  it('extracts path params', () => {
    const result = matchUrl('https://api.example.com/users/:id', 'https://api.example.com/users/42');
    expect(result).toEqual({ id: '42' });
  });

  it('extracts multiple params', () => {
    const result = matchUrl('https://api.example.com/users/:userId/posts/:postId', 'https://api.example.com/users/1/posts/99');
    expect(result).toEqual({ userId: '1', postId: '99' });
  });

  it('matches wildcard', () => {
    const result = matchUrl('https://api.example.com/*', 'https://api.example.com/any/path/here');
    expect(result).toEqual({});
  });

  it('strips query string before matching', () => {
    expect(matchUrl('https://api.example.com/users', 'https://api.example.com/users?page=1')).toEqual({});
  });

  it('returns null for length mismatch (no wildcard)', () => {
    expect(matchUrl('https://api.example.com/users', 'https://api.example.com/users/42')).toBeNull();
  });

  it('decodes URL-encoded path segments in params', () => {
    const result = matchUrl('https://api.example.com/users/:name', 'https://api.example.com/users/John%20Doe');
    expect(result).toEqual({ name: 'John Doe' });
  });

  it('matches with trailing slash in URL', () => {
    expect(matchUrl('https://api.example.com/users', 'https://api.example.com/users/')).toEqual({});
  });

  it('matches with trailing slash in pattern', () => {
    expect(matchUrl('https://api.example.com/users/', 'https://api.example.com/users')).toEqual({});
  });
});

describe('HttpResponse', () => {
  it('json() creates JSON response', () => {
    const res = HttpResponse.json({ ok: true });
    expect(res.status).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(res.body as string)).toEqual({ ok: true });
  });

  it('json() with custom status', () => {
    const res = HttpResponse.json({ error: 'not found' }, { status: 404 });
    expect(res.status).toBe(404);
  });

  it('text() creates text response', () => {
    const res = HttpResponse.text('hello');
    expect(res.status).toBe(200);
    expect(res.headers['Content-Type']).toBe('text/plain');
    expect(res.body).toBe('hello');
  });

  it('json() throws descriptive error on circular reference', () => {
    const circular: Record<string, unknown> = { name: 'test' };
    circular.self = circular;

    expect(() => HttpResponse.json(circular)).toThrow(
      'HttpResponse.json(): Failed to serialize body',
    );
  });

  it('error() creates error response', () => {
    const res = HttpResponse.error();
    expect(res.status).toBe(0);
    expect(res.type).toBe('error');
  });
});

describe('http', () => {
  it('creates GET handler', () => {
    const handler = http.get('/api/test', () => HttpResponse.json({}));
    expect(handler.method).toBe('GET');
    expect(handler.pattern).toBe('/api/test');
  });

  it('creates POST handler', () => {
    const handler = http.post('/api/test', () => HttpResponse.json({}));
    expect(handler.method).toBe('POST');
  });

  it('creates PUT handler', () => {
    const handler = http.put('/api/test', () => HttpResponse.json({}));
    expect(handler.method).toBe('PUT');
  });

  it('creates DELETE handler', () => {
    const handler = http.delete('/api/test', () => HttpResponse.json({}));
    expect(handler.method).toBe('DELETE');
  });

  it('creates PATCH handler', () => {
    const handler = http.patch('/api/test', () => HttpResponse.json({}));
    expect(handler.method).toBe('PATCH');
  });

  it('creates HEAD handler', () => {
    const handler = http.head('/api/test', () => HttpResponse.json({}));
    expect(handler.method).toBe('HEAD');
  });

  it('creates OPTIONS handler', () => {
    const handler = http.options('/api/test', () => HttpResponse.json({}));
    expect(handler.method).toBe('OPTIONS');
  });
});

describe('setupServer', () => {
  it('creates a MockServer', () => {
    const server = setupServer();
    expect(server.isActive).toBe(false);
  });

  it('listen/close toggles active state', () => {
    const server = setupServer();
    server.listen();
    expect(server.isActive).toBe(true);
    server.close();
    expect(server.isActive).toBe(false);
  });

  it('matches and resolves handlers', async () => {
    const server = setupServer(
      http.get('https://api.example.com/users', () =>
        HttpResponse.json([{ id: 1, name: 'Alice' }]),
      ),
    );
    server.listen();

    const terminal: Interceptor = async () => {
      throw new Error('Should not reach network');
    };

    const client = new WebBridgeClient();
    client.use(server.createInterceptor()).use(terminal);

    const res = await client.fetch('https://api.example.com/users');
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual([{ id: 1, name: 'Alice' }]);

    server.close();
  });

  it('passes path params to resolver', async () => {
    const server = setupServer(
      http.get('https://api.example.com/users/:id', ({ params }) =>
        HttpResponse.json({ id: params.id }),
      ),
    );
    server.listen();

    const terminal: Interceptor = async () => {
      throw new Error('Should not reach');
    };

    const client = new WebBridgeClient();
    client.use(server.createInterceptor()).use(terminal);

    const res = await client.fetch('https://api.example.com/users/42');
    expect(JSON.parse(res.body as string)).toEqual({ id: '42' });

    server.close();
  });

  it('falls through when not active', async () => {
    const server = setupServer(
      http.get('https://api.example.com/users', () => HttpResponse.json([])),
    );
    // NOT calling server.listen()

    const terminal: Interceptor = async () => {
      return createResponse({ status: 418, body: 'real' });
    };

    const client = new WebBridgeClient();
    client.use(server.createInterceptor()).use(terminal);

    const res = await client.fetch('https://api.example.com/users');
    expect(res.status).toBe(418);
  });

  it('use() adds runtime handlers with priority', async () => {
    const server = setupServer(
      http.get('https://api.example.com/users', () =>
        HttpResponse.json({ source: 'initial' }),
      ),
    );
    server.listen();

    server.use(
      http.get('https://api.example.com/users', () =>
        HttpResponse.json({ source: 'runtime' }),
      ),
    );

    const terminal: Interceptor = async () => {
      throw new Error('Should not reach');
    };

    const client = new WebBridgeClient();
    client.use(server.createInterceptor()).use(terminal);

    const res = await client.fetch('https://api.example.com/users');
    expect(JSON.parse(res.body as string)).toEqual({ source: 'runtime' });

    server.close();
  });

  it('resetHandlers() removes runtime handlers', async () => {
    const server = setupServer(
      http.get('https://api.example.com/users', () =>
        HttpResponse.json({ source: 'initial' }),
      ),
    );
    server.listen();

    server.use(
      http.get('https://api.example.com/users', () =>
        HttpResponse.json({ source: 'runtime' }),
      ),
    );
    server.resetHandlers();

    const terminal: Interceptor = async () => {
      throw new Error('Should not reach');
    };

    const client = new WebBridgeClient();
    client.use(server.createInterceptor()).use(terminal);

    const res = await client.fetch('https://api.example.com/users');
    expect(JSON.parse(res.body as string)).toEqual({ source: 'initial' });

    server.close();
  });

  it('unhandled request with bypass strategy falls through', async () => {
    const server = setupServer();
    (server as unknown as { onUnhandledRequest: string }).onUnhandledRequest = 'bypass';
    server.listen();

    const terminal: Interceptor = async () => {
      return createResponse({ status: 200, body: 'real' });
    };

    const client = new WebBridgeClient();
    client.use(server.createInterceptor()).use(terminal);

    const res = await client.fetch('https://api.example.com/unmatched');
    expect(res.body).toBe('real');

    server.close();
  });

  it('wraps handler resolver errors with request context', async () => {
    const server = setupServer(
      http.get('https://api.example.com/crash', () => {
        throw new Error('resolver bug');
      }),
    );
    server.listen();

    const terminal: Interceptor = async () => createResponse({ status: 200 });
    const client = new WebBridgeClient();
    client.use(server.createInterceptor()).use(terminal);

    await expect(
      client.fetch('https://api.example.com/crash'),
    ).rejects.toThrow('[WebBridge Mock] Handler error for GET https://api.example.com/crash');

    server.close();
  });

  it('unhandled request with error strategy throws', async () => {
    const server = new (await import('./server')).MockServer([], {
      onUnhandledRequest: 'error',
    });
    server.listen();

    const terminal: Interceptor = async () => {
      return createResponse({ status: 200 });
    };

    const client = new WebBridgeClient();
    client.use(server.createInterceptor()).use(terminal);

    await expect(
      client.fetch('https://api.example.com/unmatched'),
    ).rejects.toThrow('Unhandled');

    server.close();
  });
});
