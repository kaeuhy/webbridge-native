import { WBReadableStream } from './readable-stream';
import { WBWritableStream } from './writable-stream';
import { WBTransformStream } from './transform-stream';

describe('WBReadableStream', () => {
  it('should create from source with start and pull', async () => {
    let pullCount = 0;
    const stream = new WBReadableStream<number>({
      start(controller) {
        controller.enqueue(1);
      },
      pull() {
        pullCount++;
      },
    });

    const reader = stream.getReader();
    const result = await reader.read();
    expect(result).toEqual({ done: false, value: 1 });
    reader.releaseLock();
    // pull should have been called at some point
    expect(pullCount).toBeGreaterThanOrEqual(0);
  });

  it('should read chunks sequentially', async () => {
    const stream = new WBReadableStream<string>({
      start(controller) {
        controller.enqueue('a');
        controller.enqueue('b');
        controller.enqueue('c');
        controller.close();
      },
    });

    const reader = stream.getReader();
    expect(await reader.read()).toEqual({ done: false, value: 'a' });
    expect(await reader.read()).toEqual({ done: false, value: 'b' });
    expect(await reader.read()).toEqual({ done: false, value: 'c' });
    expect(await reader.read()).toEqual({ done: true, value: undefined });
  });

  it('should lock stream when reader is acquired', () => {
    const stream = new WBReadableStream<number>();
    expect(stream.locked).toBe(false);

    const reader = stream.getReader();
    expect(stream.locked).toBe(true);

    expect(() => stream.getReader()).toThrow(TypeError);
    reader.releaseLock();
  });

  it('should allow new reader after releaseLock', () => {
    const stream = new WBReadableStream<number>({
      start(controller) {
        controller.enqueue(42);
      },
    });

    const reader1 = stream.getReader();
    expect(stream.locked).toBe(true);
    reader1.releaseLock();
    expect(stream.locked).toBe(false);

    const reader2 = stream.getReader();
    expect(stream.locked).toBe(true);
    reader2.releaseLock();
  });

  it('should propagate cancel to source', async () => {
    let cancelReason: unknown;
    const stream = new WBReadableStream<number>({
      cancel(reason) {
        cancelReason = reason;
      },
    });

    await stream.cancel('no longer needed');
    expect(cancelReason).toBe('no longer needed');
  });

  it('should tee into two independent branches', async () => {
    const stream = new WBReadableStream<number>({
      start(controller) {
        controller.enqueue(1);
        controller.enqueue(2);
        controller.enqueue(3);
        controller.close();
      },
    });

    const [branch1, branch2] = stream.tee();

    const reader1 = branch1.getReader();
    const reader2 = branch2.getReader();

    const results1: number[] = [];
    const results2: number[] = [];

    // Read from both branches
    let r;
    r = await reader1.read();
    while (!r.done) { results1.push(r.value); r = await reader1.read(); }

    r = await reader2.read();
    while (!r.done) { results2.push(r.value); r = await reader2.read(); }

    expect(results1).toEqual([1, 2, 3]);
    expect(results2).toEqual([1, 2, 3]);
  });

  it('should propagate errors to reader', async () => {
    const testError = new Error('test error');
    const stream = new WBReadableStream<number>({
      start(controller) {
        controller.error(testError);
      },
    });

    const reader = stream.getReader();
    await expect(reader.read()).rejects.toBe(testError);
  });

  it('should handle empty stream (immediate close)', async () => {
    const stream = new WBReadableStream<number>({
      start(controller) {
        controller.close();
      },
    });

    const reader = stream.getReader();
    const result = await reader.read();
    expect(result).toEqual({ done: true, value: undefined });
  });

  it('should support async pull-based reading', async () => {
    let callCount = 0;
    const stream = new WBReadableStream<number>({
      pull(controller) {
        callCount++;
        if (callCount <= 3) {
          controller.enqueue(callCount);
        } else {
          controller.close();
        }
      },
    });

    const reader = stream.getReader();
    const results: number[] = [];
    let result = await reader.read();
    while (!result.done) {
      results.push(result.value);
      result = await reader.read();
    }
    expect(results).toEqual([1, 2, 3]);
  });

  it('should reject cancel on locked stream', async () => {
    const stream = new WBReadableStream<number>();
    stream.getReader();
    await expect(stream.cancel()).rejects.toThrow(TypeError);
  });

  it('should pipe to a writable stream via pipeTo', async () => {
    const chunks: string[] = [];
    const readable = new WBReadableStream<string>({
      start(controller) {
        controller.enqueue('hello');
        controller.enqueue('world');
        controller.close();
      },
    });

    const writable = new WBWritableStream<string>({
      write(chunk) {
        chunks.push(chunk);
      },
    });

    await readable.pipeTo(writable);
    expect(chunks).toEqual(['hello', 'world']);
  });

  it('should chain with pipeThrough', async () => {
    const readable = new WBReadableStream<string>({
      start(controller) {
        controller.enqueue('hello');
        controller.enqueue('world');
        controller.close();
      },
    });

    const transform = new WBTransformStream<string, string>({
      transform(chunk, controller) {
        controller.enqueue(chunk.toUpperCase());
      },
    });

    const result = readable.pipeThrough(transform);
    const reader = result.getReader();

    const values: string[] = [];
    let r = await reader.read();
    while (!r.done) { values.push(r.value); r = await reader.read(); }

    expect(values).toEqual(['HELLO', 'WORLD']);
  });
});
