import { getRandomValues } from './get-random-values';

// Remove native crypto so we test the Math.random fallback path
const originalCrypto = globalThis.crypto;

beforeEach(() => {
  // Force Math.random fallback by removing native crypto
  Object.defineProperty(globalThis, 'crypto', {
    value: undefined,
    writable: true,
    configurable: true,
  });
});

afterAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: originalCrypto,
    writable: true,
    configurable: true,
  });
});

describe('getRandomValues', () => {
  it('fills Uint8Array with values', () => {
    const array = new Uint8Array(16);
    getRandomValues(array);
    // At least one value should be non-zero (statistically near certain for 16 bytes)
    expect(array.some((v) => v !== 0)).toBe(true);
  });

  it('fills Uint16Array with values', () => {
    const array = new Uint16Array(8);
    getRandomValues(array);
    expect(array.some((v) => v !== 0)).toBe(true);
  });

  it('fills Uint32Array with values', () => {
    const array = new Uint32Array(4);
    getRandomValues(array);
    expect(array.some((v) => v !== 0)).toBe(true);
  });

  it('fills Int8Array with values', () => {
    const array = new Int8Array(16);
    getRandomValues(array);
    expect(array.some((v) => v !== 0)).toBe(true);
  });

  it('fills Int16Array with values', () => {
    const array = new Int16Array(8);
    getRandomValues(array);
    expect(array.some((v) => v !== 0)).toBe(true);
  });

  it('fills Int32Array with values', () => {
    const array = new Int32Array(4);
    getRandomValues(array);
    expect(array.some((v) => v !== 0)).toBe(true);
  });

  it('fills Uint8ClampedArray with values', () => {
    const array = new Uint8ClampedArray(16);
    getRandomValues(array);
    expect(array.some((v) => v !== 0)).toBe(true);
  });

  it('returns the same array reference', () => {
    const array = new Uint8Array(8);
    const result = getRandomValues(array);
    expect(result).toBe(array);
  });

  it('different calls produce different values (statistical)', () => {
    const a = new Uint8Array(32);
    const b = new Uint8Array(32);
    getRandomValues(a);
    getRandomValues(b);
    // Probability of 32 bytes being identical is (1/256)^32 ≈ 0
    const identical = a.every((v, i) => v === b[i]);
    expect(identical).toBe(false);
  });

  it('throws TypeError for non-typed-array (plain object)', () => {
    expect(() => getRandomValues({} as Uint8Array)).toThrow(TypeError);
  });

  it('throws TypeError for null', () => {
    expect(() => getRandomValues(null as unknown as Uint8Array)).toThrow(TypeError);
  });

  it('throws TypeError for regular Array', () => {
    expect(() => getRandomValues([] as unknown as Uint8Array)).toThrow(TypeError);
  });

  it('throws for array byte length > 65536', () => {
    const array = new Uint8Array(65537);
    expect(() => getRandomValues(array)).toThrow();
  });

  it('does not throw for array byte length exactly 65536', () => {
    const array = new Uint8Array(65536);
    expect(() => getRandomValues(array)).not.toThrow();
  });

  it('values are within Uint8 range (0-255)', () => {
    const array = new Uint8Array(1000);
    getRandomValues(array);
    for (const v of array) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    }
  });

  it('values are within Uint16 range (0-65535)', () => {
    const array = new Uint16Array(500);
    getRandomValues(array);
    for (const v of array) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(65535);
    }
  });

  it('uses native crypto when available', () => {
    const mockGetRandomValues = jest.fn((arr: Uint8Array) => {
      arr[0] = 42;
      return arr;
    });
    Object.defineProperty(globalThis, 'crypto', {
      value: { getRandomValues: mockGetRandomValues },
      writable: true,
      configurable: true,
    });

    const array = new Uint8Array(4);
    getRandomValues(array);
    expect(mockGetRandomValues).toHaveBeenCalled();
  });
});
