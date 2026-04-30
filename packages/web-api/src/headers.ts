/**
 * Fetch API Headers spec-compliant implementation for WebBridge Native.
 *
 * Key behaviors:
 * - Case-insensitive header name lookup
 * - Sorted iteration (alphabetical by normalized name)
 * - append() joins values with ", " for same name
 * - Validates header names and values
 */

const INVALID_HEADER_NAME = /[^a-zA-Z0-9\-!#$%&'*+.^_`|~]/;
const INVALID_HEADER_VALUE = /[\x00-\x08\x0a-\x1f\x7f]/;

function validateHeaderName(name: string): void {
  if (name.length === 0) {
    throw new TypeError('Header name must not be empty');
  }
  if (INVALID_HEADER_NAME.test(name)) {
    throw new TypeError(`Invalid header name: "${name}"`);
  }
}

function validateHeaderValue(value: string): void {
  if (INVALID_HEADER_VALUE.test(value)) {
    throw new TypeError(`Invalid header value for header`);
  }
}

function normalizeHeaderName(name: string): string {
  return name.toLowerCase();
}

export class WBHeaders {
  /** Internal storage: normalized-name -> value */
  private _map: Map<string, string> = new Map();

  constructor(init?: Record<string, string> | [string, string][] | WBHeaders) {
    if (!init) return;

    if (init instanceof WBHeaders) {
      init.forEach((value, key) => {
        this._map.set(key, value);
      });
    } else if (Array.isArray(init)) {
      for (const [name, value] of init) {
        this.append(name, value);
      }
    } else {
      for (const name of Object.keys(init)) {
        this.set(name, init[name]);
      }
    }
  }

  /**
   * Returns the first value of the given header name, or null if not present.
   */
  get(name: string): string | null {
    validateHeaderName(name);
    const normalized = normalizeHeaderName(name);
    return this._map.get(normalized) ?? null;
  }

  /**
   * Sets the value for the given header name, replacing any existing value.
   */
  set(name: string, value: string): void {
    validateHeaderName(name);
    validateHeaderValue(value);
    this._map.set(normalizeHeaderName(name), value);
  }

  /**
   * Returns whether the given header name exists.
   */
  has(name: string): boolean {
    validateHeaderName(name);
    return this._map.has(normalizeHeaderName(name));
  }

  /**
   * Deletes the header with the given name.
   */
  delete(name: string): void {
    validateHeaderName(name);
    this._map.delete(normalizeHeaderName(name));
  }

  /**
   * Appends a value to the header. If the header already exists, the value
   * is joined with ", ".
   */
  append(name: string, value: string): void {
    validateHeaderName(name);
    validateHeaderValue(value);
    const normalized = normalizeHeaderName(name);
    const existing = this._map.get(normalized);
    if (existing !== undefined) {
      this._map.set(normalized, `${existing}, ${value}`);
    } else {
      this._map.set(normalized, value);
    }
  }

  /**
   * Iterates over all headers in sorted order.
   */
  forEach(
    callback: (value: string, key: string, parent: WBHeaders) => void,
  ): void {
    const sorted = this._sortedEntries();
    for (const [key, value] of sorted) {
      callback(value, key, this);
    }
  }

  /**
   * Returns an iterator over [name, value] pairs, sorted alphabetically.
   */
  *entries(): IterableIterator<[string, string]> {
    yield* this._sortedEntries();
  }

  /**
   * Returns an iterator over header names, sorted alphabetically.
   */
  *keys(): IterableIterator<string> {
    for (const [key] of this._sortedEntries()) {
      yield key;
    }
  }

  /**
   * Returns an iterator over header values, sorted alphabetically by name.
   */
  *values(): IterableIterator<string> {
    for (const [, value] of this._sortedEntries()) {
      yield value;
    }
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.entries();
  }

  /**
   * Converts headers to a plain Record<string, string> for WebBridge interop.
   */
  toRecord(): Record<string, string> {
    const record: Record<string, string> = {};
    for (const [key, value] of this._sortedEntries()) {
      record[key] = value;
    }
    return record;
  }

  /**
   * Creates a WBHeaders instance from a plain Record<string, string>.
   */
  static fromRecord(record: Record<string, string>): WBHeaders {
    return new WBHeaders(record);
  }

  private _sortedEntries(): [string, string][] {
    return Array.from(this._map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }
}
