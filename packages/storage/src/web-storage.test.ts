import { WBStorage } from './web-storage';
import type { StorageAdapter } from './web-storage';

describe('WBStorage', () => {
  let storage: WBStorage;

  beforeEach(() => {
    storage = new WBStorage();
  });

  it('setItem/getItem roundtrip', () => {
    storage.setItem('key', 'value');
    expect(storage.getItem('key')).toBe('value');
  });

  it('getItem returns null for missing key', () => {
    expect(storage.getItem('nonexistent')).toBeNull();
  });

  it('removeItem deletes entry', () => {
    storage.setItem('key', 'value');
    storage.removeItem('key');
    expect(storage.getItem('key')).toBeNull();
  });

  it('removeItem is a no-op for missing key', () => {
    expect(() => storage.removeItem('nonexistent')).not.toThrow();
  });

  it('clear removes all entries', () => {
    storage.setItem('a', '1');
    storage.setItem('b', '2');
    storage.setItem('c', '3');
    storage.clear();
    expect(storage.length).toBe(0);
    expect(storage.getItem('a')).toBeNull();
  });

  it('length reflects count', () => {
    expect(storage.length).toBe(0);
    storage.setItem('a', '1');
    expect(storage.length).toBe(1);
    storage.setItem('b', '2');
    expect(storage.length).toBe(2);
    storage.removeItem('a');
    expect(storage.length).toBe(1);
  });

  it('key(index) returns correct key in insertion order', () => {
    storage.setItem('alpha', '1');
    storage.setItem('beta', '2');
    storage.setItem('gamma', '3');
    expect(storage.key(0)).toBe('alpha');
    expect(storage.key(1)).toBe('beta');
    expect(storage.key(2)).toBe('gamma');
  });

  it('key(out of bounds) returns null', () => {
    storage.setItem('a', '1');
    expect(storage.key(-1)).toBeNull();
    expect(storage.key(1)).toBeNull();
    expect(storage.key(100)).toBeNull();
  });

  it('setItem converts number value to string', () => {
    storage.setItem('num', 42 as unknown as string);
    expect(storage.getItem('num')).toBe('42');
  });

  it('setItem converts boolean value to string', () => {
    storage.setItem('bool', true as unknown as string);
    expect(storage.getItem('bool')).toBe('true');
  });

  it('overwrite existing key', () => {
    storage.setItem('key', 'old');
    storage.setItem('key', 'new');
    expect(storage.getItem('key')).toBe('new');
    expect(storage.length).toBe(1);
  });

  it('multiple operations sequence', () => {
    storage.setItem('a', '1');
    storage.setItem('b', '2');
    storage.setItem('c', '3');
    storage.removeItem('b');
    storage.setItem('d', '4');
    expect(storage.length).toBe(3);
    expect(storage.getItem('a')).toBe('1');
    expect(storage.getItem('b')).toBeNull();
    expect(storage.getItem('c')).toBe('3');
    expect(storage.getItem('d')).toBe('4');
  });

  it('quota exceeded (5MB)', () => {
    // 5MB = 5 * 1024 * 1024 bytes. Each char is 2 bytes in our calculation.
    // So max chars ≈ 2,621,440 (minus key overhead)
    // Create a string that when combined with key will exceed 5MB
    const bigValue = 'x'.repeat(2_621_450); // exceeds 5MB with key overhead
    expect(() => storage.setItem('key', bigValue)).toThrow();
  });

  it('quota allows data just under 5MB', () => {
    // 5MB / 2 bytes per char = 2,621,440 chars total (key + value)
    // Key "k" = 1 char = 2 bytes. Value needs to be <= 2,621,439 chars
    const value = 'x'.repeat(2_621_435); // safely under limit with key
    expect(() => storage.setItem('k', value)).not.toThrow();
  });

  it('custom adapter integration', () => {
    const backingStore = new Map<string, string>();
    backingStore.set('preloaded', 'data');

    const adapter: StorageAdapter = {
      load: jest.fn(() => new Map(backingStore)),
      save: jest.fn((data: Map<string, string>) => {
        backingStore.clear();
        for (const [k, v] of data) {
          backingStore.set(k, v);
        }
      }),
    };

    const persistentStorage = new WBStorage(adapter);

    // Should load preexisting data
    expect(adapter.load).toHaveBeenCalledTimes(1);
    expect(persistentStorage.getItem('preloaded')).toBe('data');

    // Should persist on setItem
    persistentStorage.setItem('newKey', 'newValue');
    expect(adapter.save).toHaveBeenCalled();
    expect(backingStore.get('newKey')).toBe('newValue');

    // Should persist on removeItem
    persistentStorage.removeItem('preloaded');
    expect(backingStore.has('preloaded')).toBe(false);

    // Should persist on clear
    persistentStorage.clear();
    expect(backingStore.size).toBe(0);
  });

  it('setItem with empty string key and value', () => {
    storage.setItem('', '');
    expect(storage.getItem('')).toBe('');
    expect(storage.length).toBe(1);
  });

  it('setItem with special characters', () => {
    storage.setItem('key with spaces', 'value\nwith\nnewlines');
    expect(storage.getItem('key with spaces')).toBe('value\nwith\nnewlines');
  });
});
