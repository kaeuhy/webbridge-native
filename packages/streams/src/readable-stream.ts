/**
 * @module readable-stream
 * WHATWG ReadableStream implementation for React Native.
 */

import type { QueuingStrategy } from './queuing-strategy';
import type { WBWritableStream } from './writable-stream';

/** Controller passed to the underlying source's start/pull callbacks. */
export interface ReadableStreamDefaultController<R = unknown> {
  readonly desiredSize: number | null;
  close(): void;
  enqueue(chunk: R): void;
  error(e?: unknown): void;
}

/** Underlying source that produces data for the stream. */
export interface UnderlyingSource<R = unknown> {
  start?(controller: ReadableStreamDefaultController<R>): void | Promise<void>;
  pull?(controller: ReadableStreamDefaultController<R>): void | Promise<void>;
  cancel?(reason?: unknown): void | Promise<void>;
  type?: undefined;
}

/** Result type from reader.read(). */
export type ReadableStreamReadResult<R> =
  | { done: false; value: R }
  | { done: true; value: undefined };

/** Reader interface for consuming chunks from a ReadableStream. */
export interface ReadableStreamDefaultReader<R = unknown> {
  readonly closed: Promise<void>;
  cancel(reason?: unknown): Promise<void>;
  read(): Promise<ReadableStreamReadResult<R>>;
  releaseLock(): void;
}

type ReadableState = 'readable' | 'closed' | 'errored';

/**
 * WHATWG ReadableStream implementation.
 * Provides a standard interface for consuming streaming data from a source.
 */
export class WBReadableStream<R = unknown> {
  /** @internal */ _state: ReadableState = 'readable';
  /** @internal */ _storedError: unknown = undefined;
  /** @internal */ _reader: WBReadableStreamDefaultReader<R> | undefined = undefined;
  /** @internal */ _source: Omit<Required<UnderlyingSource<R>>, 'type'>;
  /** @internal */ _controller: WBReadableStreamDefaultControllerImpl<R>;
  /** @internal */ _highWaterMark: number;
  /** @internal */ _sizeAlgorithm: (chunk: R) => number;
  /** @internal */ _queue: R[] = [];
  /** @internal */ _queueTotalSize = 0;
  /** @internal */ _started = false;
  /** @internal */ _pulling = false;
  /** @internal */ _pullAgain = false;
  /** @internal */ _closeRequested = false;
  /** @internal */ _closedPromise: Promise<void>;
  /** @internal */ _closedResolve!: () => void;
  /** @internal */ _closedReject!: (e: unknown) => void;
  /** @internal */ _readRequests: Array<{
    resolve: (result: ReadableStreamReadResult<R>) => void;
    reject: (e: unknown) => void;
  }> = [];

  constructor(source?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>) {
    const s = source ?? {};
    this._source = {
      start: s.start ?? (() => undefined),
      pull: s.pull ?? (() => undefined),
      cancel: s.cancel ?? (() => undefined),
    };
    this._highWaterMark = strategy?.highWaterMark ?? 1;
    this._sizeAlgorithm = strategy?.size ?? (() => 1);

    this._closedPromise = new Promise<void>((resolve, reject) => {
      this._closedResolve = resolve;
      this._closedReject = reject;
    });
    // Prevent unhandled rejection for streams that error
    this._closedPromise.catch(() => {});

    this._controller = new WBReadableStreamDefaultControllerImpl<R>(this);

    const startResult = this._source.start(this._controller);
    Promise.resolve(startResult).then(
      () => {
        this._started = true;
        this._callPullIfNeeded();
      },
      (e) => { this._errorStream(e); },
    );
  }

  /** Whether the stream has an active reader. */
  get locked(): boolean {
    return this._reader !== undefined;
  }

  /** Returns a reader that can be used to read from the stream. */
  getReader(): ReadableStreamDefaultReader<R> {
    if (this.locked) {
      throw new TypeError('This stream has already been locked for exclusive reading by another reader');
    }
    const reader = new WBReadableStreamDefaultReader<R>(this);
    this._reader = reader;
    return reader;
  }

  /** Cancels the stream, signaling a loss of interest in the data. */
  async cancel(reason?: unknown): Promise<void> {
    if (this.locked) {
      throw new TypeError('Cannot cancel a locked readable stream');
    }
    return this._performCancel(reason);
  }

  /**
   * Tees this stream into two independent branches.
   * Both branches receive the same data.
   */
  tee(): [WBReadableStream<R>, WBReadableStream<R>] {
    if (this.locked) {
      throw new TypeError('Cannot tee a locked readable stream');
    }

    const reader = this.getReader();
    let canceled1 = false;
    let canceled2 = false;
    let reason1: unknown;
    let reason2: unknown;

    let branch1Controller!: WBReadableStreamDefaultControllerImpl<R>;
    let branch2Controller!: WBReadableStreamDefaultControllerImpl<R>;

    const branch1 = new WBReadableStream<R>({
      start(controller) {
        branch1Controller = controller as unknown as WBReadableStreamDefaultControllerImpl<R>;
      },
      cancel(reason) {
        canceled1 = true;
        reason1 = reason;
        if (canceled2) {
          reader.cancel(reason1);
        }
      },
    });

    const branch2 = new WBReadableStream<R>({
      start(controller) {
        branch2Controller = controller as unknown as WBReadableStreamDefaultControllerImpl<R>;
      },
      cancel(reason) {
        canceled2 = true;
        reason2 = reason;
        if (canceled1) {
          reader.cancel(reason2);
        }
      },
    });

    const pump = (): void => {
      reader.read().then(
        ({ done, value }) => {
          if (done) {
            if (!canceled1) branch1Controller.close();
            if (!canceled2) branch2Controller.close();
            return;
          }
          if (!canceled1) branch1Controller.enqueue(value as R);
          if (!canceled2) branch2Controller.enqueue(value as R);
          pump();
        },
        (e) => {
          if (!canceled1) branch1Controller.error(e);
          if (!canceled2) branch2Controller.error(e);
        },
      );
    };

    // Wait for both branches to be started before pumping
    // Use microtask to ensure controllers are assigned
    Promise.resolve().then(pump);

    return [branch1, branch2];
  }

  /**
   * Pipes this stream through a transform stream.
   * Returns the readable side of the transform.
   */
  pipeThrough<T>(transform: {
    writable: WBWritableStream<R>;
    readable: WBReadableStream<T>;
  }): WBReadableStream<T> {
    this.pipeTo(transform.writable).catch(() => {
      // Error is propagated through the transform's readable side
    });
    return transform.readable;
  }

  /**
   * Pipes this stream to a writable stream.
   * Pumps data from this readable to the destination writable.
   */
  async pipeTo(
    dest: WBWritableStream<R>,
    options?: {
      preventClose?: boolean;
      preventAbort?: boolean;
      preventCancel?: boolean;
    },
  ): Promise<void> {
    const preventClose = options?.preventClose ?? false;
    const preventAbort = options?.preventAbort ?? false;
    const preventCancel = options?.preventCancel ?? false;

    const reader = this.getReader();
    const writer = dest.getWriter();

    const pump = async (): Promise<void> => {
      while (true) {
        let result: ReadableStreamReadResult<R>;
        try {
          result = await reader.read();
        } catch (e) {
          if (!preventAbort) {
            await writer.abort(e).catch(() => {});
          }
          reader.releaseLock();
          writer.releaseLock();
          throw e;
        }

        if (result.done) {
          if (!preventClose) {
            await writer.close().catch(() => {});
          }
          reader.releaseLock();
          writer.releaseLock();
          return;
        }

        try {
          await writer.write(result.value);
        } catch (e) {
          if (!preventCancel) {
            await reader.cancel(e).catch(() => {});
          }
          reader.releaseLock();
          writer.releaseLock();
          throw e;
        }
      }
    };

    return pump();
  }

  /** @internal */
  async _performCancel(reason?: unknown): Promise<void> {
    if (this._state === 'closed') return;
    if (this._state === 'errored') throw this._storedError;

    this._state = 'closed';
    // Reject any pending reads
    for (const req of this._readRequests) {
      req.resolve({ done: true, value: undefined });
    }
    this._readRequests = [];
    this._queue = [];
    this._queueTotalSize = 0;

    await this._source.cancel(reason);
    this._closedResolve();
  }

  /** @internal */
  _callPullIfNeeded(): void {
    if (!this._started) return;
    if (this._pulling) {
      this._pullAgain = true;
      return;
    }
    if (this._state !== 'readable') return;
    if (this._closeRequested) return;

    const desiredSize = this._highWaterMark - this._queueTotalSize;
    if (desiredSize <= 0 && this._readRequests.length === 0) return;

    this._pulling = true;
    Promise.resolve(this._source.pull(this._controller)).then(
      () => {
        this._pulling = false;
        if (this._pullAgain) {
          this._pullAgain = false;
          this._callPullIfNeeded();
        }
      },
      (e) => {
        this._pulling = false;
        this._errorStream(e);
      },
    );
  }

  /** @internal */
  _fulfillReadRequest(): void {
    while (this._readRequests.length > 0 && this._queue.length > 0) {
      const request = this._readRequests.shift()!;
      const chunk = this._queue.shift()!;
      const size = this._sizeAlgorithm(chunk);
      this._queueTotalSize -= size;
      request.resolve({ done: false, value: chunk });
    }

    if (this._queue.length === 0 && this._closeRequested && this._state === 'readable') {
      this._closeStream();
    }
  }

  /** @internal */
  _closeStream(): void {
    this._state = 'closed';
    for (const req of this._readRequests) {
      req.resolve({ done: true, value: undefined });
    }
    this._readRequests = [];
    this._closedResolve();
  }

  /** @internal */
  _errorStream(e: unknown): void {
    if (this._state !== 'readable') return;
    this._state = 'errored';
    this._storedError = e;
    this._queue = [];
    this._queueTotalSize = 0;
    for (const req of this._readRequests) {
      req.reject(e);
    }
    this._readRequests = [];
    this._closedReject(e);
  }
}

/** @internal */
class WBReadableStreamDefaultControllerImpl<R> implements ReadableStreamDefaultController<R> {
  private _stream: WBReadableStream<R>;

  constructor(stream: WBReadableStream<R>) {
    this._stream = stream;
  }

  get desiredSize(): number | null {
    if (this._stream._state === 'errored') return null;
    if (this._stream._state === 'closed') return 0;
    return this._stream._highWaterMark - this._stream._queueTotalSize;
  }

  close(): void {
    if (this._stream._closeRequested) {
      throw new TypeError('The stream has already been closed');
    }
    if (this._stream._state !== 'readable') {
      throw new TypeError('The stream is not in a readable state');
    }
    this._stream._closeRequested = true;
    if (this._stream._queue.length === 0) {
      this._stream._closeStream();
    }
  }

  enqueue(chunk: R): void {
    if (this._stream._closeRequested) {
      throw new TypeError('Cannot enqueue after close has been requested');
    }
    if (this._stream._state !== 'readable') {
      throw new TypeError('The stream is not in a readable state');
    }
    const size = this._stream._sizeAlgorithm(chunk);
    this._stream._queueTotalSize += size;
    this._stream._queue.push(chunk);

    // Fulfill pending read requests
    this._stream._fulfillReadRequest();

    // Pull again if needed
    this._stream._callPullIfNeeded();
  }

  error(e?: unknown): void {
    this._stream._errorStream(e);
  }
}

/** @internal */
class WBReadableStreamDefaultReader<R> implements ReadableStreamDefaultReader<R> {
  private _stream: WBReadableStream<R> | undefined;
  private _closedPromise: Promise<void>;

  constructor(stream: WBReadableStream<R>) {
    this._stream = stream;
    this._closedPromise = stream._closedPromise;
  }

  get closed(): Promise<void> {
    return this._closedPromise;
  }

  async read(): Promise<ReadableStreamReadResult<R>> {
    if (!this._stream) {
      throw new TypeError('Reader has been released');
    }

    if (this._stream._state === 'closed') {
      return { done: true, value: undefined };
    }

    if (this._stream._state === 'errored') {
      throw this._stream._storedError;
    }

    // If there's data in the queue, return it immediately
    if (this._stream._queue.length > 0) {
      const chunk = this._stream._queue.shift()!;
      const size = this._stream._sizeAlgorithm(chunk);
      this._stream._queueTotalSize -= size;

      if (this._stream._closeRequested && this._stream._queue.length === 0) {
        this._stream._closeStream();
      } else {
        this._stream._callPullIfNeeded();
      }

      return { done: false, value: chunk };
    }

    // Otherwise, queue a read request
    return new Promise<ReadableStreamReadResult<R>>((resolve, reject) => {
      this._stream!._readRequests.push({ resolve, reject });
      this._stream!._callPullIfNeeded();
    });
  }

  async cancel(reason?: unknown): Promise<void> {
    if (!this._stream) {
      throw new TypeError('Reader has been released');
    }
    const stream = this._stream;
    this.releaseLock();
    return stream._performCancel(reason);
  }

  releaseLock(): void {
    if (!this._stream) return;
    // Reject pending reads with a TypeError
    for (const req of this._stream._readRequests) {
      req.reject(new TypeError('Reader was released'));
    }
    this._stream._readRequests = [];
    this._stream._reader = undefined;
    this._stream = undefined;
  }
}
