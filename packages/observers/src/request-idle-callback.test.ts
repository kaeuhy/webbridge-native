import { wbRequestIdleCallback, wbCancelIdleCallback } from './request-idle-callback';

describe('wbRequestIdleCallback', () => {
  it('callback is called', (done) => {
    wbRequestIdleCallback(() => {
      done();
    });
  });

  it('deadline has timeRemaining method that returns a number', (done) => {
    wbRequestIdleCallback((deadline) => {
      expect(typeof deadline.timeRemaining).toBe('function');
      const remaining = deadline.timeRemaining();
      expect(typeof remaining).toBe('number');
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(50);
      done();
    });
  });

  it('returns a numeric ID', () => {
    const id = wbRequestIdleCallback(() => {});
    expect(typeof id).toBe('number');
    wbCancelIdleCallback(id);
  });

  it('successive calls return different IDs', () => {
    const id1 = wbRequestIdleCallback(() => {});
    const id2 = wbRequestIdleCallback(() => {});
    expect(id1).not.toBe(id2);
    wbCancelIdleCallback(id1);
    wbCancelIdleCallback(id2);
  });

  it('didTimeout is false when no timeout option', (done) => {
    wbRequestIdleCallback((deadline) => {
      expect(deadline.didTimeout).toBe(false);
      done();
    });
  });
});

describe('wbCancelIdleCallback', () => {
  it('prevents callback execution', (done) => {
    let called = false;
    const id = wbRequestIdleCallback(() => {
      called = true;
    });

    wbCancelIdleCallback(id);

    setTimeout(() => {
      expect(called).toBe(false);
      done();
    }, 50);
  });

  it('cancelling an invalid ID does not throw', () => {
    expect(() => wbCancelIdleCallback(999999)).not.toThrow();
  });
});
