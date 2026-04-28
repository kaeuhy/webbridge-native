import { RequestRegistry } from '../request-registry';
import type { WebBridgeResponse } from '@webbridge-native/core';
import { createResponse } from '@webbridge-native/core';

describe('RequestRegistry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockResponse = createResponse({
    status: 200,
    body: '{"ok":true}',
    headers: { 'Content-Type': 'application/json' },
  });

  it('should resolve a pending request with response', async () => {
    const registry = new RequestRegistry();
    const promise = registry.waitForResponse('req-1');

    expect(registry.size).toBe(1);

    const resolved = registry.resolve('req-1', mockResponse);
    expect(resolved).toBe(true);

    const result = await promise;
    expect(result).toBe(mockResponse);
    expect(registry.size).toBe(0);
  });

  it('should reject a pending request (passthrough)', async () => {
    const registry = new RequestRegistry();
    const promise = registry.waitForResponse('req-2');

    const rejected = registry.reject('req-2');
    expect(rejected).toBe(true);

    const result = await promise;
    expect(result).toBeNull();
    expect(registry.size).toBe(0);
  });

  it('should return false for non-existent requestId on resolve', () => {
    const registry = new RequestRegistry();
    expect(registry.resolve('non-existent', mockResponse)).toBe(false);
  });

  it('should return false for non-existent requestId on reject', () => {
    const registry = new RequestRegistry();
    expect(registry.reject('non-existent')).toBe(false);
  });

  it('should timeout and resolve with null after timeoutMs', async () => {
    const registry = new RequestRegistry({ timeoutMs: 1000 });
    const promise = registry.waitForResponse('req-timeout');

    expect(registry.size).toBe(1);

    jest.advanceTimersByTime(1000);

    const result = await promise;
    expect(result).toBeNull();
    expect(registry.size).toBe(0);
  });

  it('should not timeout if resolved before deadline', async () => {
    const registry = new RequestRegistry({ timeoutMs: 5000 });
    const promise = registry.waitForResponse('req-fast');

    // Resolve 즉시
    registry.resolve('req-fast', mockResponse);

    // 타이머 진행해도 문제 없어야 함
    jest.advanceTimersByTime(5000);

    const result = await promise;
    expect(result).toBe(mockResponse);
  });

  it('should handle multiple concurrent requests', async () => {
    const registry = new RequestRegistry();

    const p1 = registry.waitForResponse('req-a');
    const p2 = registry.waitForResponse('req-b');
    const p3 = registry.waitForResponse('req-c');

    expect(registry.size).toBe(3);

    const response2 = createResponse({ status: 201, body: 'created' });
    registry.resolve('req-b', response2);
    registry.reject('req-a');

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBeNull(); // rejected
    expect(r2).toBe(response2); // resolved

    expect(registry.size).toBe(1); // req-c still pending

    registry.resolve('req-c', mockResponse);
    const r3 = await p3;
    expect(r3).toBe(mockResponse);
    expect(registry.size).toBe(0);
  });

  it('should prevent double-resolve', async () => {
    const registry = new RequestRegistry();
    const promise = registry.waitForResponse('req-double');

    const first = registry.resolve('req-double', mockResponse);
    expect(first).toBe(true);

    const second = registry.resolve(
      'req-double',
      createResponse({ status: 500 }),
    );
    expect(second).toBe(false);

    const result = await promise;
    expect(result?.status).toBe(200); // 첫 번째 응답
  });

  it('should clear all pending requests', async () => {
    const registry = new RequestRegistry();
    const p1 = registry.waitForResponse('req-x');
    const p2 = registry.waitForResponse('req-y');

    expect(registry.size).toBe(2);

    registry.clear();

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBeNull();
    expect(r2).toBeNull();
    expect(registry.size).toBe(0);
  });

  it('should use default timeout of 5000ms', async () => {
    const registry = new RequestRegistry();
    const promise = registry.waitForResponse('req-default');

    jest.advanceTimersByTime(4999);
    expect(registry.size).toBe(1);

    jest.advanceTimersByTime(1);
    const result = await promise;
    expect(result).toBeNull();
    expect(registry.size).toBe(0);
  });
});
