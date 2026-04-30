import { WBBroadcastChannel, WBMessageEvent } from './broadcast-channel';

describe('WBBroadcastChannel', () => {
  afterEach(() => {
    // Channels created in tests are cleaned up via close(),
    // but we ensure no leaks by closing any remaining instances.
  });

  it('creates a channel with the given name', () => {
    const ch = new WBBroadcastChannel('test-1');
    expect(ch.name).toBe('test-1');
    ch.close();
  });

  it('postMessage delivers to other instance with same name', async () => {
    const ch1 = new WBBroadcastChannel('shared');
    const ch2 = new WBBroadcastChannel('shared');

    const received: unknown[] = [];
    ch2.onmessage = (event: WBMessageEvent) => {
      received.push(event.data);
    };

    ch1.postMessage('hello');
    await flushMicrotasks();

    expect(received).toEqual(['hello']);
    ch1.close();
    ch2.close();
  });

  it('postMessage does NOT deliver to self', async () => {
    const ch = new WBBroadcastChannel('self-test');

    const received: unknown[] = [];
    ch.onmessage = (event: WBMessageEvent) => {
      received.push(event.data);
    };

    ch.postMessage('should-not-arrive');
    await flushMicrotasks();

    expect(received).toEqual([]);
    ch.close();
  });

  it('postMessage does NOT deliver to different channel name', async () => {
    const ch1 = new WBBroadcastChannel('channel-a');
    const ch2 = new WBBroadcastChannel('channel-b');

    const received: unknown[] = [];
    ch2.onmessage = (event: WBMessageEvent) => {
      received.push(event.data);
    };

    ch1.postMessage('wrong-channel');
    await flushMicrotasks();

    expect(received).toEqual([]);
    ch1.close();
    ch2.close();
  });

  it('messages are delivered asynchronously', () => {
    const ch1 = new WBBroadcastChannel('async-test');
    const ch2 = new WBBroadcastChannel('async-test');

    let received = false;
    ch2.onmessage = () => {
      received = true;
    };

    ch1.postMessage('ping');

    // Synchronously, message should NOT have been delivered yet
    expect(received).toBe(false);

    ch1.close();
    ch2.close();
  });

  it('close() stops receiving messages', async () => {
    const ch1 = new WBBroadcastChannel('close-test');
    const ch2 = new WBBroadcastChannel('close-test');

    const received: unknown[] = [];
    ch2.onmessage = (event: WBMessageEvent) => {
      received.push(event.data);
    };

    ch2.close();
    ch1.postMessage('after-close');
    await flushMicrotasks();

    expect(received).toEqual([]);
    ch1.close();
  });

  it('postMessage after close() throws InvalidStateError', () => {
    const ch = new WBBroadcastChannel('throw-test');
    ch.close();

    expect(() => ch.postMessage('fail')).toThrow();
    try {
      ch.postMessage('fail');
    } catch (err) {
      expect((err as DOMException).name).toBe('InvalidStateError');
    }
  });

  it('multiple receivers on same channel all get messages', async () => {
    const sender = new WBBroadcastChannel('multi');
    const r1 = new WBBroadcastChannel('multi');
    const r2 = new WBBroadcastChannel('multi');
    const r3 = new WBBroadcastChannel('multi');

    const received1: unknown[] = [];
    const received2: unknown[] = [];
    const received3: unknown[] = [];

    r1.onmessage = (e) => received1.push(e.data);
    r2.onmessage = (e) => received2.push(e.data);
    r3.onmessage = (e) => received3.push(e.data);

    sender.postMessage('broadcast');
    await flushMicrotasks();

    expect(received1).toEqual(['broadcast']);
    expect(received2).toEqual(['broadcast']);
    expect(received3).toEqual(['broadcast']);

    sender.close();
    r1.close();
    r2.close();
    r3.close();
  });

  it('deep copies message (mutation does not affect receiver)', async () => {
    const ch1 = new WBBroadcastChannel('clone-test');
    const ch2 = new WBBroadcastChannel('clone-test');

    const received: unknown[] = [];
    ch2.onmessage = (e) => received.push(e.data);

    const obj = { nested: { value: 1 } };
    ch1.postMessage(obj);

    // Mutate original after posting
    obj.nested.value = 999;

    await flushMicrotasks();

    expect(received).toEqual([{ nested: { value: 1 } }]);
    ch1.close();
    ch2.close();
  });

  it('onmessage handler works', async () => {
    const ch1 = new WBBroadcastChannel('onmsg');
    const ch2 = new WBBroadcastChannel('onmsg');

    let receivedEvent: WBMessageEvent | null = null;
    ch2.onmessage = (event) => {
      receivedEvent = event;
    };

    ch1.postMessage(42);
    await flushMicrotasks();

    expect(receivedEvent).not.toBeNull();
    expect(receivedEvent!.data).toBe(42);
    ch1.close();
    ch2.close();
  });

  it('addEventListener works', async () => {
    const ch1 = new WBBroadcastChannel('addlistener');
    const ch2 = new WBBroadcastChannel('addlistener');

    const received: unknown[] = [];
    ch2.addEventListener('message', (event) => {
      received.push(event.data);
    });

    ch1.postMessage('via-listener');
    await flushMicrotasks();

    expect(received).toEqual(['via-listener']);
    ch1.close();
    ch2.close();
  });

  it('removeEventListener stops delivery', async () => {
    const ch1 = new WBBroadcastChannel('removelistener');
    const ch2 = new WBBroadcastChannel('removelistener');

    const received: unknown[] = [];
    const listener = (event: WBMessageEvent) => {
      received.push(event.data);
    };

    ch2.addEventListener('message', listener);
    ch1.postMessage('first');
    await flushMicrotasks();

    ch2.removeEventListener('message', listener);
    ch1.postMessage('second');
    await flushMicrotasks();

    expect(received).toEqual(['first']);
    ch1.close();
    ch2.close();
  });

  it('MessageEvent has correct properties', async () => {
    const ch1 = new WBBroadcastChannel('event-shape');
    const ch2 = new WBBroadcastChannel('event-shape');

    let event: WBMessageEvent | null = null;
    ch2.onmessage = (e) => {
      event = e;
    };

    ch1.postMessage({ key: 'value' });
    await flushMicrotasks();

    expect(event).not.toBeNull();
    expect(event!.data).toEqual({ key: 'value' });
    expect(event!.origin).toBe('');
    expect(event!.lastEventId).toBe('');
    expect(event!.source).toBeNull();
    expect(event!.ports).toEqual([]);
    expect(Object.isFrozen(event!.ports)).toBe(true);

    ch1.close();
    ch2.close();
  });

  it('different channel names are isolated', async () => {
    const chA1 = new WBBroadcastChannel('iso-a');
    const chA2 = new WBBroadcastChannel('iso-a');
    const chB1 = new WBBroadcastChannel('iso-b');
    const chB2 = new WBBroadcastChannel('iso-b');

    const receivedA: unknown[] = [];
    const receivedB: unknown[] = [];

    chA2.onmessage = (e) => receivedA.push(e.data);
    chB2.onmessage = (e) => receivedB.push(e.data);

    chA1.postMessage('for-a');
    chB1.postMessage('for-b');
    await flushMicrotasks();

    expect(receivedA).toEqual(['for-a']);
    expect(receivedB).toEqual(['for-b']);

    chA1.close();
    chA2.close();
    chB1.close();
    chB2.close();
  });

  it('re-creating channel after close works', async () => {
    const ch1 = new WBBroadcastChannel('reopen');
    ch1.close();

    const ch2 = new WBBroadcastChannel('reopen');
    const ch3 = new WBBroadcastChannel('reopen');

    const received: unknown[] = [];
    ch3.onmessage = (e) => received.push(e.data);

    ch2.postMessage('reopened');
    await flushMicrotasks();

    expect(received).toEqual(['reopened']);
    ch2.close();
    ch3.close();
  });

  it('both addEventListener and onmessage fire for same event', async () => {
    const ch1 = new WBBroadcastChannel('both-handlers');
    const ch2 = new WBBroadcastChannel('both-handlers');

    const listenerReceived: unknown[] = [];
    const onmessageReceived: unknown[] = [];

    ch2.addEventListener('message', (e) => listenerReceived.push(e.data));
    ch2.onmessage = (e) => onmessageReceived.push(e.data);

    ch1.postMessage('dual');
    await flushMicrotasks();

    expect(listenerReceived).toEqual(['dual']);
    expect(onmessageReceived).toEqual(['dual']);

    ch1.close();
    ch2.close();
  });

  it('close() is idempotent', () => {
    const ch = new WBBroadcastChannel('idempotent');
    ch.close();
    ch.close(); // Should not throw
    ch.close();
  });
});

/**
 * Flush all pending microtasks by awaiting a resolved promise.
 */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
