import { WBWritableStream } from './writable-stream';

describe('WBWritableStream', () => {
  it('should write chunks to sink', async () => {
    const chunks: string[] = [];
    const stream = new WBWritableStream<string>({
      write(chunk) {
        chunks.push(chunk);
      },
    });

    const writer = stream.getWriter();
    await writer.write('hello');
    await writer.write('world');
    await writer.close();

    expect(chunks).toEqual(['hello', 'world']);
  });

  it('should lock stream when writer is acquired', () => {
    const stream = new WBWritableStream<string>();
    expect(stream.locked).toBe(false);

    const writer = stream.getWriter();
    expect(stream.locked).toBe(true);

    expect(() => stream.getWriter()).toThrow(TypeError);
    writer.releaseLock();
    expect(stream.locked).toBe(false);
  });

  it('should call sink.close() on close', async () => {
    let closeCalled = false;
    const stream = new WBWritableStream<string>({
      close() {
        closeCalled = true;
      },
    });

    const writer = stream.getWriter();
    await writer.close();
    expect(closeCalled).toBe(true);
  });

  it('should call sink.abort() on abort', async () => {
    let abortReason: unknown;
    const stream = new WBWritableStream<string>({
      abort(reason) {
        abortReason = reason;
      },
    });

    const writer = stream.getWriter();
    await writer.abort('canceled');
    expect(abortReason).toBe('canceled');
  });

  it('should handle backpressure with highWaterMark', async () => {
    const written: number[] = [];
    const stream = new WBWritableStream<number>(
      {
        write(chunk) {
          written.push(chunk);
        },
      },
      { highWaterMark: 2 },
    );

    const writer = stream.getWriter();
    // desiredSize starts at highWaterMark
    expect(writer.desiredSize).toBe(2);

    await writer.write(1);
    await writer.write(2);
    await writer.write(3);

    expect(written).toEqual([1, 2, 3]);
    await writer.close();
  });

  it('should propagate write errors', async () => {
    const testError = new Error('write failed');
    const stream = new WBWritableStream<string>({
      write() {
        throw testError;
      },
    });

    const writer = stream.getWriter();
    await expect(writer.write('data')).rejects.toBe(testError);
  });

  it('should reject close on locked stream without writer', async () => {
    const stream = new WBWritableStream<string>();
    stream.getWriter(); // lock it
    await expect(stream.close()).rejects.toThrow(TypeError);
  });

  it('should reject abort on locked stream without writer', async () => {
    const stream = new WBWritableStream<string>();
    stream.getWriter();
    await expect(stream.abort()).rejects.toThrow(TypeError);
  });
});
