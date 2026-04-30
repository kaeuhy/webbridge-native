import { WBPerformance } from './performance';

describe('WBPerformance', () => {
  let perf: WBPerformance;

  beforeEach(() => {
    perf = new WBPerformance();
  });

  describe('now()', () => {
    it('returns a number greater than or equal to 0', () => {
      const value = perf.now();
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(0);
    });

    it('increases over time', async () => {
      const first = perf.now();
      await delay(10);
      const second = perf.now();
      expect(second).toBeGreaterThan(first);
    });
  });

  describe('timeOrigin', () => {
    it('is a number representing ms since epoch', () => {
      expect(typeof perf.timeOrigin).toBe('number');
      // Should be close to Date.now() at construction time
      expect(perf.timeOrigin).toBeLessThanOrEqual(Date.now());
      expect(perf.timeOrigin).toBeGreaterThan(Date.now() - 5000);
    });
  });

  describe('mark()', () => {
    it('creates an entry with the given name', () => {
      const entry = perf.mark('my-mark');
      expect(entry.name).toBe('my-mark');
      expect(entry.entryType).toBe('mark');
      expect(entry.duration).toBe(0);
      expect(entry.startTime).toBeGreaterThanOrEqual(0);
    });

    it('respects custom startTime option', () => {
      const entry = perf.mark('custom-time', { startTime: 42 });
      expect(entry.startTime).toBe(42);
    });

    it('stores detail in the entry', () => {
      const entry = perf.mark('with-detail', { detail: { foo: 'bar' } });
      expect(entry.detail).toEqual({ foo: 'bar' });
    });
  });

  describe('measure()', () => {
    it('measures between two marks', async () => {
      perf.mark('start');
      await delay(10);
      perf.mark('end');

      const measure = perf.measure('my-measure', 'start', 'end');
      expect(measure.name).toBe('my-measure');
      expect(measure.entryType).toBe('measure');
      expect(measure.duration).toBeGreaterThan(0);
    });

    it('measures with start/end options', () => {
      perf.mark('opt-start');
      perf.mark('opt-end');

      const measure = perf.measure('opt-measure', {
        start: 'opt-start',
        end: 'opt-end',
      });
      expect(measure.entryType).toBe('measure');
      expect(measure.duration).toBeGreaterThanOrEqual(0);
    });

    it('measures with numeric start/end options', () => {
      const measure = perf.measure('numeric-measure', {
        start: 10,
        end: 60,
      });
      expect(measure.startTime).toBe(10);
      expect(measure.duration).toBe(50);
    });

    it('measures with start and duration options', () => {
      const measure = perf.measure('dur-measure', {
        start: 10,
        duration: 25,
      });
      expect(measure.startTime).toBe(10);
      expect(measure.duration).toBe(25);
    });

    it('throws for missing mark', () => {
      expect(() => {
        perf.measure('bad-measure', 'nonexistent-mark');
      }).toThrow(/does not exist/);
    });

    it('throws when all three options provided', () => {
      perf.mark('s');
      perf.mark('e');
      expect(() => {
        perf.measure('bad', { start: 's', end: 'e', duration: 10 });
      }).toThrow(/Cannot specify all/);
    });
  });

  describe('getEntries()', () => {
    it('returns all entries', () => {
      perf.mark('a');
      perf.mark('b');
      perf.measure('m', 'a', 'b');

      const entries = perf.getEntries();
      expect(entries).toHaveLength(3);
    });

    it('returns a copy (not the internal array)', () => {
      perf.mark('x');
      const entries = perf.getEntries();
      entries.length = 0;
      expect(perf.getEntries()).toHaveLength(1);
    });
  });

  describe('getEntriesByType()', () => {
    it('filters by mark type', () => {
      perf.mark('m1');
      perf.mark('m2');
      perf.measure('measure', 'm1', 'm2');

      const marks = perf.getEntriesByType('mark');
      expect(marks).toHaveLength(2);
      expect(marks.every((e) => e.entryType === 'mark')).toBe(true);
    });

    it('filters by measure type', () => {
      perf.mark('a');
      perf.mark('b');
      perf.measure('m1', 'a', 'b');
      perf.measure('m2', 'a', 'b');

      const measures = perf.getEntriesByType('measure');
      expect(measures).toHaveLength(2);
    });
  });

  describe('getEntriesByName()', () => {
    it('filters by name', () => {
      perf.mark('target');
      perf.mark('other');
      perf.mark('target');

      const entries = perf.getEntriesByName('target');
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.name === 'target')).toBe(true);
    });

    it('filters by name and type', () => {
      perf.mark('shared-name');
      perf.mark('start-ref');
      perf.measure('shared-name', 'start-ref', 'shared-name');

      const marks = perf.getEntriesByName('shared-name', 'mark');
      expect(marks).toHaveLength(1);
      expect(marks[0].entryType).toBe('mark');

      const measures = perf.getEntriesByName('shared-name', 'measure');
      expect(measures).toHaveLength(1);
      expect(measures[0].entryType).toBe('measure');
    });
  });

  describe('clearMarks()', () => {
    it('removes a specific mark by name', () => {
      perf.mark('keep');
      perf.mark('remove');

      perf.clearMarks('remove');
      const entries = perf.getEntriesByType('mark');
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('keep');
    });

    it('removes all marks when called without arguments', () => {
      perf.mark('a');
      perf.mark('b');
      perf.mark('c');

      perf.clearMarks();
      expect(perf.getEntriesByType('mark')).toHaveLength(0);
    });

    it('does not remove measures', () => {
      perf.mark('s');
      perf.mark('e');
      perf.measure('m', 's', 'e');

      perf.clearMarks();
      expect(perf.getEntriesByType('measure')).toHaveLength(1);
    });
  });

  describe('clearMeasures()', () => {
    it('removes a specific measure by name', () => {
      perf.mark('s');
      perf.mark('e');
      perf.measure('keep', 's', 'e');
      perf.measure('remove', 's', 'e');

      perf.clearMeasures('remove');
      const measures = perf.getEntriesByType('measure');
      expect(measures).toHaveLength(1);
      expect(measures[0].name).toBe('keep');
    });

    it('removes all measures when called without arguments', () => {
      perf.mark('s');
      perf.mark('e');
      perf.measure('m1', 's', 'e');
      perf.measure('m2', 's', 'e');

      perf.clearMeasures();
      expect(perf.getEntriesByType('measure')).toHaveLength(0);
    });
  });
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
