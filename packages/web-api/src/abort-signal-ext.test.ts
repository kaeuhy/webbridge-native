import { abortSignalTimeout, abortSignalAny } from './abort-signal-ext';

describe('AbortSignal extensions', () => {
  describe('abortSignalTimeout()', () => {
    it('aborts after specified ms', async () => {
      const signal = abortSignalTimeout(50);
      expect(signal.aborted).toBe(false);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(signal.aborted).toBe(true);
    });

    it('timeout(0) aborts very quickly', async () => {
      const signal = abortSignalTimeout(0);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(signal.aborted).toBe(true);
    });

    it('sets TimeoutError as reason', async () => {
      const signal = abortSignalTimeout(10);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(signal.aborted).toBe(true);
      expect(signal.reason).toBeDefined();
      expect(signal.reason.name).toBe('TimeoutError');
    });
  });

  describe('abortSignalAny()', () => {
    it('aborts when first signal aborts', () => {
      const c1 = new AbortController();
      const c2 = new AbortController();
      const combined = abortSignalAny([c1.signal, c2.signal]);

      expect(combined.aborted).toBe(false);
      c1.abort('reason1');
      expect(combined.aborted).toBe(true);
      expect(combined.reason).toBe('reason1');
    });

    it('is already aborted if any input signal is already aborted', () => {
      const c1 = new AbortController();
      c1.abort('already');
      const c2 = new AbortController();
      const combined = abortSignalAny([c1.signal, c2.signal]);
      expect(combined.aborted).toBe(true);
      expect(combined.reason).toBe('already');
    });

    it('only aborts once even if multiple signals abort', () => {
      const c1 = new AbortController();
      const c2 = new AbortController();
      const combined = abortSignalAny([c1.signal, c2.signal]);

      c1.abort('first');
      c2.abort('second');
      expect(combined.reason).toBe('first');
    });
  });
});
