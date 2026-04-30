/**
 * Performance API polyfill for React Native.
 * Provides performance.mark(), performance.measure(), and entry management.
 *
 * Spec: https://www.w3.org/TR/performance-timeline/
 */

/**
 * Represents a single performance entry (mark or measure).
 */
export interface WBPerformanceEntry {
  readonly name: string;
  readonly entryType: 'mark' | 'measure';
  readonly startTime: number;
  readonly duration: number;
  readonly detail?: unknown;
}

/**
 * Options for creating a performance mark.
 */
export interface WBPerformanceMarkOptions {
  /** Custom data to attach to the mark. */
  detail?: unknown;
  /** Override the default startTime (ms relative to timeOrigin). */
  startTime?: number;
}

/**
 * Options for creating a performance measure.
 */
export interface WBPerformanceMeasureOptions {
  /** Custom data to attach to the measure. */
  detail?: unknown;
  /** Start mark name or numeric timestamp (ms relative to timeOrigin). */
  start?: string | number;
  /** End mark name or numeric timestamp (ms relative to timeOrigin). */
  end?: string | number;
  /** Explicit duration in ms. */
  duration?: number;
}

/** Callback type for observer notifications. */
export type PerformanceObserverNotifyCallback = (entry: WBPerformanceEntry) => void;

/**
 * Performance API polyfill.
 *
 * Provides high-resolution timing, marks, and measures compatible
 * with the browser Performance interface.
 */
export class WBPerformance {
  /** The time origin (ms since Unix epoch) when this instance was created. */
  readonly timeOrigin: number;

  private readonly _entries: WBPerformanceEntry[] = [];
  private readonly _observerCallbacks: Set<PerformanceObserverNotifyCallback> = new Set();

  constructor() {
    this.timeOrigin = Date.now();
  }

  /**
   * Returns a high-resolution timestamp in milliseconds
   * relative to timeOrigin.
   */
  now(): number {
    return Date.now() - this.timeOrigin;
  }

  /**
   * Creates a named timestamp mark.
   *
   * @param name - The mark name.
   * @param options - Optional mark options.
   * @returns The created performance entry.
   */
  mark(name: string, options?: WBPerformanceMarkOptions): WBPerformanceEntry {
    if (typeof name !== 'string') {
      throw new TypeError(
        `Failed to execute 'mark': argument 'name' must be a string.`,
      );
    }

    const startTime =
      options?.startTime !== undefined ? options.startTime : this.now();

    const entry: WBPerformanceEntry = {
      name,
      entryType: 'mark',
      startTime,
      duration: 0,
      detail: options?.detail,
    };

    this._entries.push(entry);
    this._notifyObservers(entry);
    return entry;
  }

  /**
   * Creates a measure entry between two marks or timestamps.
   *
   * @param name - The measure name.
   * @param startOrOptions - Start mark name, or a WBPerformanceMeasureOptions object.
   * @param end - End mark name (only when startOrOptions is a string).
   * @returns The created performance entry.
   */
  measure(
    name: string,
    startOrOptions?: string | WBPerformanceMeasureOptions,
    end?: string,
  ): WBPerformanceEntry {
    if (typeof name !== 'string') {
      throw new TypeError(
        `Failed to execute 'measure': argument 'name' must be a string.`,
      );
    }

    let startTime: number;
    let endTime: number;
    let detail: unknown;

    if (startOrOptions === undefined && end === undefined) {
      // measure(name) — from timeOrigin to now
      startTime = 0;
      endTime = this.now();
    } else if (typeof startOrOptions === 'string') {
      // measure(name, startMark, endMark?)
      startTime = this._resolveMarkTime(startOrOptions);
      endTime = end !== undefined ? this._resolveMarkTime(end) : this.now();
    } else if (typeof startOrOptions === 'object' && startOrOptions !== null) {
      // measure(name, options)
      const opts = startOrOptions;
      detail = opts.detail;

      const hasStart = opts.start !== undefined;
      const hasEnd = opts.end !== undefined;
      const hasDuration = opts.duration !== undefined;

      if (hasStart && hasEnd && hasDuration) {
        throw new TypeError(
          `Failed to execute 'measure': Cannot specify all of start, end, and duration.`,
        );
      }

      const resolvedStart = hasStart ? this._resolveTime(opts.start!) : undefined;
      const resolvedEnd = hasEnd ? this._resolveTime(opts.end!) : undefined;

      if (hasStart && hasEnd) {
        startTime = resolvedStart!;
        endTime = resolvedEnd!;
      } else if (hasStart && hasDuration) {
        startTime = resolvedStart!;
        endTime = startTime + opts.duration!;
      } else if (hasEnd && hasDuration) {
        endTime = resolvedEnd!;
        startTime = endTime - opts.duration!;
      } else if (hasStart) {
        startTime = resolvedStart!;
        endTime = this.now();
      } else if (hasEnd) {
        startTime = 0;
        endTime = resolvedEnd!;
      } else if (hasDuration) {
        endTime = this.now();
        startTime = endTime - opts.duration!;
      } else {
        startTime = 0;
        endTime = this.now();
      }
    } else {
      throw new TypeError(
        `Failed to execute 'measure': invalid arguments.`,
      );
    }

    const duration = endTime - startTime;

    const entry: WBPerformanceEntry = {
      name,
      entryType: 'measure',
      startTime,
      duration,
      detail,
    };

    this._entries.push(entry);
    this._notifyObservers(entry);
    return entry;
  }

  /**
   * Returns all performance entries in chronological order.
   */
  getEntries(): WBPerformanceEntry[] {
    return [...this._entries];
  }

  /**
   * Returns entries filtered by entry type.
   * @param type - The entry type to filter by (e.g. 'mark', 'measure').
   */
  getEntriesByType(type: string): WBPerformanceEntry[] {
    return this._entries.filter((e) => e.entryType === type);
  }

  /**
   * Returns entries filtered by name and optionally type.
   * @param name - The entry name to filter by.
   * @param type - Optional entry type filter.
   */
  getEntriesByName(name: string, type?: string): WBPerformanceEntry[] {
    return this._entries.filter(
      (e) => e.name === name && (type === undefined || e.entryType === type),
    );
  }

  /**
   * Clears marks. If name is provided, only clears marks with that name.
   * @param name - Optional mark name to clear.
   */
  clearMarks(name?: string): void {
    this._clearEntries('mark', name);
  }

  /**
   * Clears measures. If name is provided, only clears measures with that name.
   * @param name - Optional measure name to clear.
   */
  clearMeasures(name?: string): void {
    this._clearEntries('measure', name);
  }

  /**
   * Registers an observer callback for new entries.
   * Used internally by WBPerformanceObserver.
   * @internal
   */
  _addObserverCallback(callback: PerformanceObserverNotifyCallback): void {
    this._observerCallbacks.add(callback);
  }

  /**
   * Removes an observer callback.
   * @internal
   */
  _removeObserverCallback(callback: PerformanceObserverNotifyCallback): void {
    this._observerCallbacks.delete(callback);
  }

  /**
   * Notifies all registered observers about a new entry.
   */
  private _notifyObservers(entry: WBPerformanceEntry): void {
    for (const callback of this._observerCallbacks) {
      try {
        callback(entry);
      } catch {
        // Observer errors should not break performance API
      }
    }
  }

  /**
   * Resolves a time value that can be either a mark name or numeric timestamp.
   */
  private _resolveTime(value: string | number): number {
    if (typeof value === 'number') {
      return value;
    }
    return this._resolveMarkTime(value);
  }

  /**
   * Looks up a mark by name and returns its startTime.
   * Throws if the mark is not found.
   */
  private _resolveMarkTime(markName: string): number {
    // Find the most recent mark with the given name
    for (let i = this._entries.length - 1; i >= 0; i--) {
      const entry = this._entries[i];
      if (entry.name === markName && entry.entryType === 'mark') {
        return entry.startTime;
      }
    }
    throw new DOMException(
      `Failed to execute 'measure': The mark '${markName}' does not exist.`,
      'SyntaxError',
    );
  }

  /**
   * Removes entries of the given type, optionally filtered by name.
   */
  private _clearEntries(type: 'mark' | 'measure', name?: string): void {
    for (let i = this._entries.length - 1; i >= 0; i--) {
      const entry = this._entries[i];
      if (entry.entryType === type && (name === undefined || entry.name === name)) {
        this._entries.splice(i, 1);
      }
    }
  }
}
