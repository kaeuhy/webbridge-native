/**
 * @module writable-stream
 * WHATWG WritableStream implementation for React Native.
 */

import type { QueuingStrategy } from './queuing-strategy';

/** Controller passed to the underlying sink's write/start callbacks. */
export interface WritableStreamDefaultController {
  readonly signal: AbortSignal;
  error(e?: unknown): void;
}

/** Underlying sink that receives data written to the stream. */
export interface UnderlyingSink<W = unknown> {
  start?(controller: WritableStreamDefaultController): void | Promise<void>;
  write?(chunk: W, controller: WritableStreamDefaultController): void | Promise<void>;
  close?(): void | Promise<void>;
  abort?(reason?: unknown): void | Promise<void>;
  type?: undefined;
}

/** Writer interface for writing chunks to a WritableStream. */
export interface WritableStreamDefaultWriter<W = unknown> {
  readonly closed: Promise<void>;
  readonly ready: Promise<void>;
  readonly desiredSize: number | null;
  write(chunk: W): Promise<void>;
  close(): Promise<void>;
  abort(reason?: unknown): Promise<void>;
  releaseLock(): void;
}

type WritableState = 'writable' | 'erroring' | 'closed' | 'errored';

/**
 * WHATWG WritableStream implementation.
 * Provides a standard interface for writing streaming data to a sink.
 */
export class WBWritableStream<W = unknown> {
  /** @internal */ _state: WritableState = 'writable';
  /** @internal */ _storedError: unknown = undefined;
  /** @internal */ _writer: WBWritableStreamDefaultWriter<W> | undefined = undefined;
  /** @internal */ _sink: Omit<Required<UnderlyingSink<W>>, 'type'>;
  /** @internal */ _controller: WBWritableStreamDefaultController;
  /** @internal */ _highWaterMark: number;
  /** @internal */ _sizeAlgorithm: (chunk: W) => number;
  /** @internal */ _queue: Array<{ chunk: W; resolve: () => void; reject: (e: unknown) => void }> = [];
  /** @internal */ _queueTotalSize = 0;
  /** @internal */ _started = false;
  /** @internal */ _writing = false;
  /** @internal */ _closeRequest: { resolve: () => void; reject: (e: unknown) => void } | undefined = undefined;
  /** @internal */ _abortController: AbortController;
  /** @internal */ _closedPromise: Promise<void>;
  /** @internal */ _closedResolve!: () => void;
  /** @internal */ _closedReject!: (e: unknown) => void;

  constructor(sink?: UnderlyingSink<W>, strategy?: QueuingStrategy<W>) {
    const s = sink ?? {};
    this._sink = {
      start: s.start ?? (() => undefined),
      write: s.write ?? (() => undefined),
      close: s.close ?? (() => undefined),
      abort: s.abort ?? (() => undefined),
    };
    this._highWaterMark = strategy?.highWaterMark ?? 1;
    this._sizeAlgorithm = strategy?.size ?? (() => 1);
    this._abortController = new AbortController();
    this._controller = new WBWritableStreamDefaultController(this);

    this._closedPromise = new Promise<void>((resolve, reject) => {
      this._closedResolve = resolve;
      this._closedReject = reject;
    });
    // Prevent unhandled rejection for streams that error
    this._closedPromise.catch(() => {});

    const startResult = this._sink.start(this._controller);
    Promise.resolve(startResult).then(
      () => { this._started = true; this._advanceQueue(); },
      (e) => { this._errorStream(e); },
    );
  }

  /** Whether the stream has an active writer. */
  get locked(): boolean {
    return this._writer !== undefined;
  }

  /** Returns a writer that can be used to write to the stream. */
  getWriter(): WritableStreamDefaultWriter<W> {
    if (this.locked) {
      throw new TypeError('This stream has already been locked for exclusive writing by another writer');
    }
    const writer = new WBWritableStreamDefaultWriter<W>(this);
    this._writer = writer;
    return writer;
  }

  /** Closes the stream, signaling that no more chunks will be written. */
  async close(): Promise<void> {
    if (this.locked) {
      throw new TypeError('Cannot close a locked writable stream');
    }
    if (this._state === 'closed' || this._state === 'errored') {
      throw new TypeError(`Cannot close stream in state: ${this._state}`);
    }
    return this._performClose();
  }

  /** Aborts the stream, signaling an error condition. */
  async abort(reason?: unknown): Promise<void> {
    if (this.locked) {
      throw new TypeError('Cannot abort a locked writable stream');
    }
    return this._performAbort(reason);
  }

  /** @internal */
  async _performClose(): Promise<void> {
    if (this._state !== 'writable') {
      throw new TypeError(`Cannot close stream in state: ${this._state}`);
    }
    return new Promise<void>((resolve, reject) => {
      this._closeRequest = { resolve, reject };
      if (this._started && !this._writing && this._queue.length === 0) {
        this._finishClose();
      }
    });
  }

  /** @internal */
  async _performAbort(reason?: unknown): Promise<void> {
    if (this._state === 'closed' || this._state === 'errored') {
      return;
    }
    this._abortController.abort(reason);
    // Reject all pending writes
    for (const entry of this._queue) {
      entry.reject(reason);
    }
    this._queue = [];
    this._queueTotalSize = 0;

    try {
      await this._sink.abort(reason);
    } finally {
      this._state = 'errored';
      this._storedError = reason;
      this._closedReject(reason);
    }
  }

  /** @internal */
  _enqueue(chunk: W): Promise<void> {
    if (this._state !== 'writable') {
      return Promise.reject(new TypeError(`Cannot write to stream in state: ${this._state}`));
    }
    const size = this._sizeAlgorithm(chunk);
    this._queueTotalSize += size;

    return new Promise<void>((resolve, reject) => {
      this._queue.push({ chunk, resolve, reject });
      this._advanceQueue();
    });
  }

  /** @internal */
  _advanceQueue(): void {
    if (!this._started || this._writing) return;
    if (this._queue.length === 0) {
      if (this._closeRequest) {
        this._finishClose();
      }
      return;
    }

    const entry = this._queue.shift()!;
    const size = this._sizeAlgorithm(entry.chunk);
    this._queueTotalSize -= size;
    this._writing = true;

    let writeResult: void | Promise<void>;
    try {
      writeResult = this._sink.write(entry.chunk, this._controller);
    } catch (e) {
      this._writing = false;
      entry.reject(e);
      this._errorStream(e);
      return;
    }

    Promise.resolve(writeResult).then(
      () => {
        this._writing = false;
        entry.resolve();
        this._advanceQueue();
      },
      (e) => {
        this._writing = false;
        entry.reject(e);
        this._errorStream(e);
      },
    );
  }

  /** @internal */
  _finishClose(): void {
    Promise.resolve(this._sink.close()).then(
      () => {
        this._state = 'closed';
        this._closedResolve();
        this._closeRequest?.resolve();
      },
      (e) => {
        this._errorStream(e);
        this._closeRequest?.reject(e);
      },
    );
  }

  /** @internal */
  _errorStream(e: unknown): void {
    if (this._state === 'errored' || this._state === 'closed') return;
    this._state = 'errored';
    this._storedError = e;
    for (const entry of this._queue) {
      entry.reject(e);
    }
    this._queue = [];
    this._queueTotalSize = 0;
    this._closedReject(e);
  }

  /** @internal */
  get _desiredSize(): number | null {
    if (this._state === 'errored') return null;
    if (this._state === 'closed') return 0;
    return this._highWaterMark - this._queueTotalSize;
  }
}

/** @internal */
class WBWritableStreamDefaultController implements WritableStreamDefaultController {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _stream: WBWritableStream<any>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(stream: WBWritableStream<any>) {
    this._stream = stream;
  }

  get signal(): AbortSignal {
    return this._stream._abortController.signal;
  }

  error(e?: unknown): void {
    this._stream._errorStream(e);
  }
}

/** @internal */
class WBWritableStreamDefaultWriter<W> implements WritableStreamDefaultWriter<W> {
  private _stream: WBWritableStream<W> | undefined;
  private _closedPromise: Promise<void>;

  constructor(stream: WBWritableStream<W>) {
    this._stream = stream;
    this._closedPromise = stream._closedPromise;
  }

  get closed(): Promise<void> {
    return this._closedPromise;
  }

  get ready(): Promise<void> {
    // Simplified: resolve immediately if we have desired size > 0
    if (!this._stream) return Promise.reject(new TypeError('Writer has been released'));
    if ((this._stream._desiredSize ?? 0) > 0) return Promise.resolve();
    return Promise.resolve(); // simplified — full spec would wait for backpressure relief
  }

  get desiredSize(): number | null {
    if (!this._stream) throw new TypeError('Writer has been released');
    return this._stream._desiredSize;
  }

  async write(chunk: W): Promise<void> {
    if (!this._stream) throw new TypeError('Writer has been released');
    return this._stream._enqueue(chunk);
  }

  async close(): Promise<void> {
    if (!this._stream) throw new TypeError('Writer has been released');
    return this._stream._performClose();
  }

  async abort(reason?: unknown): Promise<void> {
    if (!this._stream) throw new TypeError('Writer has been released');
    return this._stream._performAbort(reason);
  }

  releaseLock(): void {
    if (!this._stream) return;
    this._stream._writer = undefined;
    this._stream = undefined;
  }
}
