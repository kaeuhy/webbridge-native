/**
 * @module queuing-strategy
 * WHATWG Streams queuing strategies for backpressure control.
 */

/** Generic queuing strategy interface. */
export interface QueuingStrategy<T = unknown> {
  highWaterMark?: number;
  size?(chunk: T): number;
}

/**
 * A queuing strategy that counts each chunk as size 1.
 * Useful for object-mode streams where each chunk is one logical unit.
 */
export class CountQueuingStrategy {
  readonly highWaterMark: number;

  constructor(init: { highWaterMark: number }) {
    if (init.highWaterMark < 0) {
      throw new RangeError('highWaterMark must be non-negative');
    }
    this.highWaterMark = init.highWaterMark;
  }

  /** Always returns 1 regardless of the chunk. */
  size(): number {
    return 1;
  }
}

/**
 * A queuing strategy that uses the byte length of ArrayBufferView chunks.
 * Useful for byte streams where backpressure is based on memory usage.
 */
export class ByteLengthQueuingStrategy {
  readonly highWaterMark: number;

  constructor(init: { highWaterMark: number }) {
    if (init.highWaterMark < 0) {
      throw new RangeError('highWaterMark must be non-negative');
    }
    this.highWaterMark = init.highWaterMark;
  }

  /** Returns the byteLength of the chunk. */
  size(chunk: ArrayBufferView): number {
    return chunk.byteLength;
  }
}
