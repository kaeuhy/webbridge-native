/**
 * Web Storage API (localStorage/sessionStorage) polyfill.
 *
 * Implements the full Storage interface with an in-memory Map backend.
 * Optionally backed by a persistent adapter for integration with
 * AsyncStorage, MMKV, or other native storage solutions.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Storage
 * @packageDocumentation
 */

/** 5 MB quota limit (in bytes), matching browser localStorage limits. */
const QUOTA_BYTES = 5 * 1024 * 1024;

/**
 * Adapter interface for persistent storage backends.
 * Implement this to back WBStorage with AsyncStorage, MMKV, etc.
 */
export interface StorageAdapter {
  /** Load all stored data. Called once during construction. */
  load(): Map<string, string>;
  /** Persist all current data. Called on every mutation. */
  save(data: Map<string, string>): void;
}

/**
 * Creates a QuotaExceededError.
 */
function createQuotaExceededError(): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(
      'The quota has been exceeded.',
      'QuotaExceededError',
    );
  }
  const error = new Error('The quota has been exceeded.');
  error.name = 'QuotaExceededError';
  return error;
}

/**
 * Calculates the byte size of a string (UTF-16 code units * 2).
 * This matches browser behavior where each character is 2 bytes.
 */
function getStringByteSize(str: string): number {
  return str.length * 2;
}

/**
 * Web Storage API polyfill.
 *
 * Provides a synchronous key-value store that follows the
 * [Storage interface](https://developer.mozilla.org/en-US/docs/Web/API/Storage).
 *
 * Keys are maintained in insertion order for `key()` access.
 */
export class WBStorage {
  /** Internal data store. Keys are in insertion order. */
  private _data: Map<string, string>;

  /** Optional persistence adapter. */
  private _adapter: StorageAdapter | undefined;

  /**
   * Create a new WBStorage instance.
   *
   * @param adapter - Optional persistence adapter. If omitted, storage is in-memory only.
   */
  constructor(adapter?: StorageAdapter) {
    this._adapter = adapter;
    this._data = adapter ? adapter.load() : new Map<string, string>();
  }

  /**
   * The number of key/value pairs currently stored.
   */
  get length(): number {
    return this._data.size;
  }

  /**
   * Returns the value associated with the given key, or null if not found.
   *
   * @param key - The key to look up
   * @returns The stored value, or null
   */
  getItem(key: string): string | null {
    const value = this._data.get(key);
    return value !== undefined ? value : null;
  }

  /**
   * Stores a key/value pair. The value is converted to a string.
   *
   * @param key - The key to store under
   * @param value - The value to store (will be converted to string)
   * @throws {DOMException} QuotaExceededError if the 5MB limit would be exceeded
   */
  setItem(key: string, value: string): void {
    const stringValue = String(value);

    // Calculate the new total size
    const currentSize = this._calculateSize();
    const existingValue = this._data.get(key);

    let delta = getStringByteSize(key) + getStringByteSize(stringValue);
    if (existingValue !== undefined) {
      // Replacing: subtract old key+value, add new key+value
      delta = getStringByteSize(stringValue) - getStringByteSize(existingValue);
    }

    if (currentSize + delta > QUOTA_BYTES) {
      throw createQuotaExceededError();
    }

    this._data.set(key, stringValue);
    this._persist();
  }

  /**
   * Removes the key/value pair with the given key, if it exists.
   *
   * @param key - The key to remove
   */
  removeItem(key: string): void {
    if (this._data.has(key)) {
      this._data.delete(key);
      this._persist();
    }
  }

  /**
   * Removes all key/value pairs from the storage.
   */
  clear(): void {
    this._data.clear();
    this._persist();
  }

  /**
   * Returns the key at the given index in insertion order, or null if
   * the index is out of bounds.
   *
   * @param index - Zero-based index
   * @returns The key at that index, or null
   */
  key(index: number): string | null {
    if (index < 0 || index >= this._data.size) {
      return null;
    }
    const keys = Array.from(this._data.keys());
    return keys[index];
  }

  /**
   * Calculate the total byte size of all stored data.
   */
  private _calculateSize(): number {
    let size = 0;
    for (const [key, value] of this._data) {
      size += getStringByteSize(key) + getStringByteSize(value);
    }
    return size;
  }

  /**
   * Persist data to the adapter if one is configured.
   */
  private _persist(): void {
    if (this._adapter) {
      this._adapter.save(new Map(this._data));
    }
  }
}
