import { createAxiosAdapter } from './adapter';
import { WebBridgeClient, createResponse } from '@webbridge-native/core';
import type { Interceptor } from '@webbridge-native/core';
import type { InternalAxiosRequestConfig } from 'axios';
import { AxiosHeaders } from 'axios';

function createTestClient(responseBody: string, status = 200): WebBridgeClient {
  const terminal: Interceptor = async (req) =>
    createResponse({
      status,
      headers: { 'Content-Type': 'application/json' },
      body: responseBody,
      url: req.url,
    });
  const client = new WebBridgeClient();
  client.use(terminal);
  return client;
}

describe('createAxiosAdapter', () => {
  it('performs GET request and parses JSON response', async () => {
    const client = createTestClient('{"id":1,"name":"Alice"}');
    const adapter = createAxiosAdapter(client);

    const config: InternalAxiosRequestConfig = {
      url: 'https://api.example.com/users/1',
      method: 'get',
      headers: new AxiosHeaders(),
    };

    const res = await adapter(config);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ id: 1, name: 'Alice' });
  });

  it('sends POST with body', async () => {
    let capturedBody: string | null = null;
    const terminal: Interceptor = async (req) => {
      capturedBody = typeof req.body === 'string' ? req.body : null;
      return createResponse({ status: 201, headers: { 'Content-Type': 'application/json' }, body: '{}' });
    };
    const client = new WebBridgeClient();
    client.use(terminal);

    const adapter = createAxiosAdapter(client);
    const config: InternalAxiosRequestConfig = {
      url: 'https://api.example.com/users',
      method: 'post',
      data: { name: 'Bob' },
      headers: new AxiosHeaders({ 'Content-Type': 'application/json' }),
    };

    const res = await adapter(config);
    expect(res.status).toBe(201);
    expect(capturedBody).toBe('{"name":"Bob"}');
  });

  it('builds URL from baseURL + url', async () => {
    let capturedUrl = '';
    const terminal: Interceptor = async (req) => {
      capturedUrl = req.url;
      return createResponse({ status: 200, body: '{}', headers: { 'Content-Type': 'application/json' } });
    };
    const client = new WebBridgeClient();
    client.use(terminal);

    const adapter = createAxiosAdapter(client);
    await adapter({
      baseURL: 'https://api.example.com',
      url: '/users',
      method: 'get',
      headers: new AxiosHeaders(),
    } as InternalAxiosRequestConfig);

    expect(capturedUrl).toBe('https://api.example.com/users');
  });

  it('uses absolute URL as-is', async () => {
    let capturedUrl = '';
    const terminal: Interceptor = async (req) => {
      capturedUrl = req.url;
      return createResponse({ status: 200, body: '{}', headers: { 'Content-Type': 'application/json' } });
    };
    const client = new WebBridgeClient();
    client.use(terminal);

    const adapter = createAxiosAdapter(client);
    await adapter({
      baseURL: 'https://other.com',
      url: 'https://api.example.com/data',
      method: 'get',
      headers: new AxiosHeaders(),
    } as InternalAxiosRequestConfig);

    expect(capturedUrl).toBe('https://api.example.com/data');
  });

  it('returns non-JSON body as string', async () => {
    const terminal: Interceptor = async () =>
      createResponse({ status: 200, headers: { 'Content-Type': 'text/plain' }, body: 'hello' });
    const client = new WebBridgeClient();
    client.use(terminal);

    const adapter = createAxiosAdapter(client);
    const res = await adapter({
      url: 'https://example.com',
      method: 'get',
      headers: new AxiosHeaders(),
    } as InternalAxiosRequestConfig);

    expect(res.data).toBe('hello');
  });

  it('passes headers from config', async () => {
    let capturedHeaders: Record<string, string> = {};
    const terminal: Interceptor = async (req) => {
      capturedHeaders = req.headers;
      return createResponse({ status: 200, body: '{}', headers: { 'Content-Type': 'application/json' } });
    };
    const client = new WebBridgeClient();
    client.use(terminal);

    const adapter = createAxiosAdapter(client);
    await adapter({
      url: 'https://example.com',
      method: 'get',
      headers: new AxiosHeaders({ Authorization: 'Bearer token' }),
    } as InternalAxiosRequestConfig);

    expect(capturedHeaders['Authorization']).toBe('Bearer token');
  });
});
