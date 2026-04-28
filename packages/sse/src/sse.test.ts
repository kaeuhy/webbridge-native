import { parseEventStream, parseRetryField } from './event-parser';
import { EventSource } from './event-source';

describe('parseEventStream', () => {
  it('parses a single event', () => {
    const events = parseEventStream('data: hello\n\n');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('message');
    expect(events[0].data).toBe('hello');
  });

  it('parses multi-line data', () => {
    const events = parseEventStream('data: line1\ndata: line2\n\n');
    expect(events[0].data).toBe('line1\nline2');
  });

  it('parses named events', () => {
    const events = parseEventStream('event: update\ndata: payload\n\n');
    expect(events[0].type).toBe('update');
    expect(events[0].data).toBe('payload');
  });

  it('parses id field', () => {
    const events = parseEventStream('id: 42\ndata: test\n\n');
    expect(events[0].lastEventId).toBe('42');
  });

  it('parses multiple events', () => {
    const events = parseEventStream('data: first\n\ndata: second\n\n');
    expect(events).toHaveLength(2);
    expect(events[0].data).toBe('first');
    expect(events[1].data).toBe('second');
  });

  it('ignores comments', () => {
    const events = parseEventStream(': this is a comment\ndata: visible\n\n');
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('visible');
  });

  it('ignores empty blocks', () => {
    const events = parseEventStream('\n\n\n\n');
    expect(events).toHaveLength(0);
  });

  it('handles data with colon in value', () => {
    const events = parseEventStream('data: key: value\n\n');
    expect(events[0].data).toBe('key: value');
  });

  it('handles field without value', () => {
    const events = parseEventStream('data\n\n');
    expect(events[0].data).toBe('');
  });
});

describe('parseRetryField', () => {
  it('extracts retry value', () => {
    expect(parseRetryField('retry: 5000\n')).toBe(5000);
  });

  it('returns undefined when no retry', () => {
    expect(parseRetryField('data: hello\n')).toBeUndefined();
  });

  it('ignores non-numeric retry', () => {
    expect(parseRetryField('retry: abc\n')).toBeUndefined();
  });
});

describe('EventSource', () => {
  it('starts in CONNECTING state', () => {
    const es = new EventSource('https://example.com/stream');
    expect(es.readyState).toBe(EventSource.CONNECTING);
    expect(es.url).toBe('https://example.com/stream');
  });

  it('close() sets CLOSED state', () => {
    const es = new EventSource('https://example.com/stream');
    es.close();
    expect(es.readyState).toBe(EventSource.CLOSED);
  });

  it('withCredentials defaults to false', () => {
    const es = new EventSource('https://example.com/stream');
    expect(es.withCredentials).toBe(false);
  });

  it('withCredentials can be set via options', () => {
    const es = new EventSource('https://example.com/stream', { withCredentials: true });
    expect(es.withCredentials).toBe(true);
  });

  it('dispatches message events via onmessage', () => {
    const es = new EventSource('https://example.com/stream');
    const handler = jest.fn();
    es.onmessage = handler;
    es._handleChunk('data: hello\n\n');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'message', data: 'hello' }),
    );
  });

  it('dispatches named events via addEventListener', () => {
    const es = new EventSource('https://example.com/stream');
    const handler = jest.fn();
    es.addEventListener('update', handler);
    es._handleChunk('event: update\ndata: payload\n\n');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'update', data: 'payload' }),
    );
  });

  it('removeEventListener stops dispatch', () => {
    const es = new EventSource('https://example.com/stream');
    const handler = jest.fn();
    es.addEventListener('update', handler);
    es.removeEventListener('update', handler);
    es._handleChunk('event: update\ndata: payload\n\n');
    expect(handler).not.toHaveBeenCalled();
  });

  it('tracks lastEventId', () => {
    const es = new EventSource('https://example.com/stream');
    es.onmessage = jest.fn();
    es._handleChunk('id: 99\ndata: test\n\n');
    expect(es.currentLastEventId).toBe('99');
  });

  it('updates retry delay from retry field', () => {
    const es = new EventSource('https://example.com/stream');
    expect(es.currentRetryDelay).toBe(3000);
    es._handleChunk('retry: 5000\ndata: test\n\n');
    expect(es.currentRetryDelay).toBe(5000);
  });

  it('does not dispatch after close', () => {
    const es = new EventSource('https://example.com/stream');
    const handler = jest.fn();
    es.onmessage = handler;
    es.close();
    es._handleChunk('data: should not fire\n\n');
    expect(handler).not.toHaveBeenCalled();
  });

  it('_handleOpen sets OPEN state and calls onopen', () => {
    const es = new EventSource('https://example.com/stream');
    const handler = jest.fn();
    es.onopen = handler;
    es._handleOpen();
    expect(es.readyState).toBe(EventSource.OPEN);
    expect(handler).toHaveBeenCalled();
  });

  it('_handleError sets CONNECTING state and calls onerror', () => {
    const es = new EventSource('https://example.com/stream');
    es._handleOpen();
    const handler = jest.fn();
    es.onerror = handler;
    es._handleError();
    expect(es.readyState).toBe(EventSource.CONNECTING);
    expect(handler).toHaveBeenCalled();
  });
});
