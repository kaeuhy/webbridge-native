import { WBTransformStream } from './transform-stream';
import { WBReadableStream } from './readable-stream';

describe('WBTransformStream', () => {
  it('should transform chunks (uppercase)', async () => {
    const transform = new WBTransformStream<string, string>({
      transform(chunk, controller) {
        controller.enqueue(chunk.toUpperCase());
      },
    });

    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    await writer.write('hello');
    await writer.write('world');

    expect(await reader.read()).toEqual({ done: false, value: 'HELLO' });
    expect(await reader.read()).toEqual({ done: false, value: 'WORLD' });

    await writer.close();
    expect(await reader.read()).toEqual({ done: true, value: undefined });
  });

  it('should have connected readable and writable', () => {
    const transform = new WBTransformStream<string, string>();
    expect(transform.readable).toBeInstanceOf(WBReadableStream);
    expect(transform.writable).toBeDefined();
    expect(transform.readable.locked).toBe(false);
    expect(transform.writable.locked).toBe(false);
  });

  it('should flush on close', async () => {
    const transform = new WBTransformStream<string, string>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
      flush(controller) {
        controller.enqueue('FLUSHED');
      },
    });

    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    await writer.write('data');
    expect(await reader.read()).toEqual({ done: false, value: 'data' });

    await writer.close();
    // flush should have added 'FLUSHED'
    expect(await reader.read()).toEqual({ done: false, value: 'FLUSHED' });
    expect(await reader.read()).toEqual({ done: true, value: undefined });
  });

  it('should support pipeThrough chaining', async () => {
    const source = new WBReadableStream<number>({
      start(controller) {
        controller.enqueue(1);
        controller.enqueue(2);
        controller.enqueue(3);
        controller.close();
      },
    });

    const double = new WBTransformStream<number, number>({
      transform(chunk, controller) {
        controller.enqueue(chunk * 2);
      },
    });

    const toString = new WBTransformStream<number, string>({
      transform(chunk, controller) {
        controller.enqueue(`num:${chunk}`);
      },
    });

    const result = source.pipeThrough(double).pipeThrough(toString);
    const reader = result.getReader();

    const values: string[] = [];
    let r = await reader.read();
    while (!r.done) { values.push(r.value); r = await reader.read(); }

    expect(values).toEqual(['num:2', 'num:4', 'num:6']);
  });

  it('should propagate errors through transform', async () => {
    const testError = new Error('transform error');
    const transform = new WBTransformStream<string, string>({
      transform() {
        throw testError;
      },
    });

    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    await expect(writer.write('data')).rejects.toBe(testError);
    // After error, readable should also be errored
    await expect(reader.read()).rejects.toBe(testError);
  });

  it('should work as identity transform (passthrough)', async () => {
    const transform = new WBTransformStream<string, string>();

    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    await writer.write('pass');
    await writer.write('through');

    expect(await reader.read()).toEqual({ done: false, value: 'pass' });
    expect(await reader.read()).toEqual({ done: false, value: 'through' });

    await writer.close();
    expect(await reader.read()).toEqual({ done: true, value: undefined });
  });

  it('should support async transform', async () => {
    const transform = new WBTransformStream<number, string>({
      async transform(chunk, controller) {
        await new Promise(r => setTimeout(r, 5));
        controller.enqueue(`async:${chunk}`);
      },
    });

    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    await writer.write(42);
    expect(await reader.read()).toEqual({ done: false, value: 'async:42' });

    await writer.close();
  });
});
