/**
 * @webbridge-native/storage
 *
 * Web Storage API polyfill (localStorage, sessionStorage) for React Native.
 *
 * @packageDocumentation
 */

import { WBStorage } from './web-storage';
import type { StorageAdapter } from './web-storage';

export { WBStorage } from './web-storage';
export type { StorageAdapter } from './web-storage';
export { WBStorageEvent } from './storage-event';
export type { WBStorageEventInit } from './storage-event';

/**
 * Create a localStorage-like storage instance.
 *
 * When an adapter is provided, data persists across app restarts (like browser localStorage).
 * Without an adapter, behaves as in-memory storage.
 *
 * @param adapter - Optional persistence adapter (e.g., AsyncStorage, MMKV wrapper)
 * @returns A WBStorage instance configured for persistent storage
 */
export function createLocalStorage(adapter?: StorageAdapter): WBStorage {
  return new WBStorage(adapter);
}

/**
 * Create a sessionStorage-like storage instance.
 *
 * Data lives only in memory and is lost when the app is closed,
 * matching browser sessionStorage behavior.
 *
 * @returns A WBStorage instance configured for session-only storage
 */
export function createSessionStorage(): WBStorage {
  return new WBStorage();
}
