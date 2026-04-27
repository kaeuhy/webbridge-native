import { nativeBridgeInterceptor } from './interceptor';
import { setNativeModule } from './NativeWebBridge';
import type { NativeWebBridgeSpec } from './NativeWebBridge';
import { createRequest } from '@webbridge-native/core';

/** Mock native module */
function createMockNativeModule(
  responseJson?: string,
): NativeWebBridgeSpec {
  return {
    sendRequest: jest.fn().mockResolvedValue(
      responseJson ??
        JSON.stringify({
          url: 'https://api.example.com/users',
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' },
          body: '[]',
        }),
    ),
    registerMockHandler: jest.fn(),
    respondToMock: jest.fn(),
    cancelRequest: jest.fn(),
  };
}

describe('nativeBridgeInterceptor', () => {
  afterEach(() => {
    setNativeModule(null);
  });

  it('sends request to native module and returns response', async () => {
    const mockModule = createMockNativeModule();
    setNativeModule(mockModule);

    const interceptor = nativeBridgeInterceptor();
    const request = createRequest('https://api.example.com/users');
    const next = jest.fn(); // should not be called (terminal)

    const response = await interceptor(request, next);

    expect(mockModule.sendRequest).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    expect(response.body).toBe('[]');
    expect(next).not.toHaveBeenCalled();
  });

  it('passes serialized request JSON to native', async () => {
    const mockModule = createMockNativeModule();
    setNativeModule(mockModule);

    const interceptor = nativeBridgeInterceptor();
    const request = createRequest('https://api.example.com/data', {
      method: 'POST',
      body: '{"key":"value"}',
    });

    await interceptor(request, jest.fn());

    const sentJson = (mockModule.sendRequest as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(sentJson);
    expect(parsed.url).toBe('https://api.example.com/data');
    expect(parsed.method).toBe('POST');
    expect(parsed.body).toBe('{"key":"value"}');
  });

  it('throws AbortError when signal is already aborted', async () => {
    const mockModule = createMockNativeModule();
    setNativeModule(mockModule);

    const controller = new AbortController();
    controller.abort();

    const interceptor = nativeBridgeInterceptor();
    const request = createRequest('https://example.com', {
      signal: controller.signal,
    });

    await expect(interceptor(request, jest.fn())).rejects.toThrow('aborted');
    expect(mockModule.sendRequest).not.toHaveBeenCalled();
  });

  it('throws when native module is not available', async () => {
    setNativeModule(null);

    const interceptor = nativeBridgeInterceptor();
    const request = createRequest('https://example.com');

    await expect(interceptor(request, jest.fn())).rejects.toThrow(
      'Native module not available',
    );
  });

  it('times out after specified duration', async () => {
    const slowModule: NativeWebBridgeSpec = {
      sendRequest: jest.fn().mockReturnValue(new Promise(() => {})), // never resolves
      registerMockHandler: jest.fn(),
      respondToMock: jest.fn(),
      cancelRequest: jest.fn(),
    };
    setNativeModule(slowModule);

    const interceptor = nativeBridgeInterceptor({ timeout: 100 });
    const request = createRequest('https://example.com');

    await expect(interceptor(request, jest.fn())).rejects.toThrow('timeout');
    expect(slowModule.cancelRequest).toHaveBeenCalledWith(request.id);
  }, 10000);
});
