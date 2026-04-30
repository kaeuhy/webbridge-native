/**
 * PerformanceObserver — watches for new performance entries.
 *
 * Spec: https://www.w3.org/TR/performance-timeline/#performanceobserver
 */

import { WBPerformance, WBPerformanceEntry } from './performance';

/**
 * Provides access to a list of performance entries
 * collected by the observer since the last callback invocation.
 */
export class WBPerformanceObserverEntryList {
  private readonly _entries: WBPerformanceEntry[];

  /** @internal */
  constructor(entries: WBPerformanceEntry[]) {
    this._entries = [...entries];
  }

  /**
   * Returns all entries in the list.
   */
  getEntries(): WBPerformanceEntry[] {
    return [...this._entries];
  }

  /**
   * Returns entries filtered by type.
   * @param type - The entry type to filter by.
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
}

/**
 * Callback type for PerformanceObserver.
 */
export type PerformanceObserverCallback = (
  list: WBPerformanceObserverEntryList,
  observer: WBPerformanceObserver,
) => void;

/**
 * PerformanceObserver watches for new performance entries on a
 * WBPerformance instance and invokes a callback when entries
 * matching the observed types are recorded.
 */
export class WBPerformanceObserver {
  private readonly _callback: PerformanceObserverCallback;
  private _entryTypes: Set<string> = new Set();
  private _buffer: WBPerformanceEntry[] = [];
  private _performance: WBPerformance | null = null;
  private _connected = false;

  /**
   * Creates a new PerformanceObserver.
   * @param callback - Function to invoke when new entries are available.
   */
  constructor(callback: PerformanceObserverCallback) {
    if (typeof callback !== 'function') {
      throw new TypeError(
        `Failed to construct 'PerformanceObserver': callback must be a function.`,
      );
    }
    this._callback = callback;
  }

  /**
   * Starts observing for performance entries of the given types.
   *
   * @param options - Must include `entryTypes` array and a `performance` instance.
   */
  observe(options: {
    entryTypes: string[];
    performance: WBPerformance;
  }): void {
    if (
      !options ||
      !Array.isArray(options.entryTypes) ||
      options.entryTypes.length === 0
    ) {
      throw new TypeError(
        `Failed to execute 'observe': 'entryTypes' must be a non-empty array.`,
      );
    }

    if (!options.performance) {
      throw new TypeError(
        `Failed to execute 'observe': 'performance' instance is required.`,
      );
    }

    this._entryTypes = new Set(options.entryTypes);
    this._performance = options.performance;
    this._buffer = [];

    if (!this._connected) {
      this._performance._addObserverCallback(this._handleEntry);
      this._connected = true;
    }
  }

  /**
   * Stops observing and removes the observer from the performance instance.
   */
  disconnect(): void {
    if (this._performance && this._connected) {
      this._performance._removeObserverCallback(this._handleEntry);
      this._connected = false;
    }
    this._entryTypes.clear();
  }

  /**
   * Returns the current buffer of entries and clears it.
   */
  takeRecords(): WBPerformanceEntry[] {
    const records = [...this._buffer];
    this._buffer = [];
    return records;
  }

  /**
   * Internal handler invoked by the performance instance when a new entry is created.
   * @internal
   */
  private readonly _handleEntry = (entry: WBPerformanceEntry): void => {
    if (!this._entryTypes.has(entry.entryType)) {
      return;
    }

    this._buffer.push(entry);

    // Deliver via microtask to batch entries created synchronously
    queueMicrotask(() => {
      if (this._buffer.length === 0) {
        return;
      }

      const entries = [...this._buffer];
      this._buffer = [];
      const list = new WBPerformanceObserverEntryList(entries);

      try {
        this._callback(list, this);
      } catch {
        // Observer callback errors should not break the performance API
      }
    });
  };
}
