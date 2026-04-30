/**
 * @module transform-stream
 * WHATWG TransformStream implementation for React Native.
 */

import { WBReadableStream } from './readable-stream';
import type { ReadableStreamDefaultController } from './readable-stream';
import { WBWritableStream } from './writable-stream';

/** Controller passed to the transformer's transform/flush callbacks. */
export interface TransformStreamDefaultController<O = unknown> {
  readonly desiredSize: number | null;
  enqueue(chunk: O): void;
  error(reason?: unknown): void;
  terminate(): void;
}

/** Transformer that processes chunks from the writable side and produces output on the readable side. */
export interface Transformer<I = unknown, O = unknown> {
  start?(controller: TransformStreamDefaultController<O>): void | Promise<void>;
  transform?(chunk: I, controller: TransformStreamDefaultController<O>): void | Promise<void>;
  flush?(controller: TransformStreamDefaultController<O>): void | Promise<void>;
}

/**
 * WHATWG TransformStream implementation.
 * Pairs a writable stream (input) with a readable stream (output),
 * applying a transformation to data flowing through.
 */
export class WBTransformStream<I = unknown, O = unknown> {
  readonly readable: WBReadableStream<O>;
  readonly writable: WBWritableStream<I>;

  constructor(transformer?: Transformer<I, O>) {
    const t = transformer ?? {};

    let readableController!: ReadableStreamDefaultController<O>;

    this.readable = new WBReadableStream<O>({
      start(controller) {
        readableController = controller;
      },
    });

    const transformController = new TransformStreamDefaultControllerImpl<O>(readableController);

    const startPromise = t.start
      ? Promise.resolve(t.start(transformController))
      : Promise.resolve();

    const transformFn = t.transform ?? ((chunk: I, ctrl: TransformStreamDefaultController<O>) => {
      // Default: pass through (identity transform)
      ctrl.enqueue(chunk as unknown as O);
    });

    const flushFn = t.flush;

    this.writable = new WBWritableStream<I>({
      start() {
        return startPromise;
      },
      write(chunk) {
        try {
          return Promise.resolve(transformFn(chunk, transformController));
        } catch (e) {
          readableController.error(e);
          throw e;
        }
      },
      close() {
        if (flushFn) {
          return Promise.resolve(flushFn(transformController)).then(() => {
            readableController.close();
          });
        }
        readableController.close();
      },
      abort(reason) {
        readableController.error(reason);
      },
    });
  }
}

/** @internal */
class TransformStreamDefaultControllerImpl<O> implements TransformStreamDefaultController<O> {
  private _readableController: ReadableStreamDefaultController<O>;

  constructor(readableController: ReadableStreamDefaultController<O>) {
    this._readableController = readableController;
  }

  get desiredSize(): number | null {
    return this._readableController.desiredSize;
  }

  enqueue(chunk: O): void {
    this._readableController.enqueue(chunk);
  }

  error(reason?: unknown): void {
    this._readableController.error(reason);
  }

  terminate(): void {
    this._readableController.close();
  }
}
