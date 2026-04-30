/**
 * StorageEvent -- dispatched when storage changes.
 *
 * Mirrors the browser StorageEvent API.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent
 */

import type { WBStorage } from './web-storage';

/**
 * Initialization options for WBStorageEvent.
 */
export interface WBStorageEventInit {
  /** The key that changed, or null for clear(). */
  readonly key: string | null;
  /** The previous value, or null if new. */
  readonly oldValue: string | null;
  /** The new value, or null if removed. */
  readonly newValue: string | null;
  /** The URL of the document whose storage changed. */
  readonly url?: string;
  /** The Storage object that was affected. */
  readonly storageArea: WBStorage;
}

/**
 * Event dispatched when a storage area is modified.
 *
 * This mirrors the browser's `StorageEvent` interface for use in
 * React Native environments.
 */
export class WBStorageEvent {
  /** The key that changed, or null for clear(). */
  readonly key: string | null;
  /** The previous value, or null if new or for clear(). */
  readonly oldValue: string | null;
  /** The new value, or null if removed or for clear(). */
  readonly newValue: string | null;
  /** The URL of the document whose storage changed. */
  readonly url: string;
  /** The Storage object that was affected. */
  readonly storageArea: WBStorage;

  /**
   * Create a new WBStorageEvent.
   *
   * @param init - Event initialization properties
   */
  constructor(init: WBStorageEventInit) {
    this.key = init.key;
    this.oldValue = init.oldValue;
    this.newValue = init.newValue;
    this.url = init.url ?? '';
    this.storageArea = init.storageArea;
  }
}
