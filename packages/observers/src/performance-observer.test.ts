import { WBPerformance } from './performance';
import { WBPerformanceObserver } from './performance-observer';

describe('WBPerformanceObserver', () => {
  let perf: WBPerformance;

  beforeEach(() => {
    perf = new WBPerformance();
  });

  it('callback fires on new mark', async () => {
    const entries: string[] = [];
    const observer = new WBPerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        entries.push(entry.name);
      }
    });

    observer.observe({ entryTypes: ['mark'], performance: perf });
    perf.mark('observed-mark');
    await flushMicrotasks();

    expect(entries).toContain('observed-mark');
    observer.disconnect();
  });

  it('filters by entryTypes', async () => {
    const entries: string[] = [];
    const observer = new WBPerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        entries.push(`${entry.entryType}:${entry.name}`);
      }
    });

    observer.observe({ entryTypes: ['measure'], performance: perf });

    perf.mark('m1');
    perf.mark('m2');
    perf.measure('my-measure', 'm1', 'm2');
    await flushMicrotasks();

    // Should only have the measure, not the marks
    expect(entries).toEqual(['measure:my-measure']);
    observer.disconnect();
  });

  it('disconnect() stops notifications', async () => {
    const entries: string[] = [];
    const observer = new WBPerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        entries.push(entry.name);
      }
    });

    observer.observe({ entryTypes: ['mark'], performance: perf });
    perf.mark('before-disconnect');
    await flushMicrotasks();

    observer.disconnect();
    perf.mark('after-disconnect');
    await flushMicrotasks();

    expect(entries).toContain('before-disconnect');
    expect(entries).not.toContain('after-disconnect');
  });

  it('takeRecords() returns buffered entries and clears buffer', async () => {
    const observer = new WBPerformanceObserver(() => {
      // intentionally empty — we use takeRecords instead
    });

    observer.observe({ entryTypes: ['mark'], performance: perf });
    perf.mark('buffered');

    // Before microtask flush, entries should be in the buffer
    const records = observer.takeRecords();
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('buffered');

    // Buffer should now be empty
    const empty = observer.takeRecords();
    expect(empty).toHaveLength(0);

    observer.disconnect();
  });

  it('multiple observers on same type both receive entries', async () => {
    const entries1: string[] = [];
    const entries2: string[] = [];

    const obs1 = new WBPerformanceObserver((list) => {
      for (const e of list.getEntries()) entries1.push(e.name);
    });
    const obs2 = new WBPerformanceObserver((list) => {
      for (const e of list.getEntries()) entries2.push(e.name);
    });

    obs1.observe({ entryTypes: ['mark'], performance: perf });
    obs2.observe({ entryTypes: ['mark'], performance: perf });

    perf.mark('shared-entry');
    await flushMicrotasks();

    expect(entries1).toContain('shared-entry');
    expect(entries2).toContain('shared-entry');

    obs1.disconnect();
    obs2.disconnect();
  });

  it('entryList getEntriesByType works', async () => {
    let markCount = 0;
    const observer = new WBPerformanceObserver((list) => {
      markCount += list.getEntriesByType('mark').length;
    });

    observer.observe({ entryTypes: ['mark', 'measure'], performance: perf });
    perf.mark('a');
    perf.mark('b');
    await flushMicrotasks();

    expect(markCount).toBe(2);
    observer.disconnect();
  });

  it('throws if entryTypes is empty', () => {
    const observer = new WBPerformanceObserver(() => {});
    expect(() => {
      observer.observe({ entryTypes: [], performance: perf });
    }).toThrow(/entryTypes/);
  });
});

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}
