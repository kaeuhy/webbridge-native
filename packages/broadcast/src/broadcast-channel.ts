/**
 * BroadcastChannel API polyfill for React Native.
 *
 * Enables communication between different parts of the app
 * (different screens, components, modules) using named channels.
 *
 * Browser spec: https://html.spec.whatwg.org/multipage/web-messaging.html#broadcastchannel
 */

/**
 * Represents a message event delivered to BroadcastChannel listeners.
 */
export interface WBMessageEvent {
  readonly data: unknown;
  readonly origin: string;
  readonly lastEventId: string;
  readonly source: null;
  readonly ports: readonly [];
}

/**
 * Global registry of all open channels, keyed by channel name.
 * Each name maps to a set of active WBBroadcastChannel instances.
 */
const channelRegistry = new Map<string, Set<WBBroadcastChannel>>();

/**
 * Creates a structured-clone-like deep copy of data.
 * Uses JSON round-trip for simplicity (handles plain objects, arrays, primitives).
 * Throws a DataCloneError-like error for non-serializable values.
 */
function structuredClone(data: unknown): unknown {
  if (data === undefined || data === null) {
    return data;
  }
  if (
    typeof data === 'number' ||
    typeof data === 'string' ||
    typeof data === 'boolean'
  ) {
    return data;
  }
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    throw new DOMException(
      'Failed to execute \'postMessage\': the message could not be cloned.',
      'DataCloneError',
    );
  }
}

/**
 * Creates a WBMessageEvent from the given data.
 */
function createMessageEvent(data: unknown): WBMessageEvent {
  return {
    data,
    origin: '',
    lastEventId: '',
    source: null,
    ports: Object.freeze([]) as readonly [],
  };
}

type EventType = 'message' | 'messageerror';

/**
 * BroadcastChannel polyfill for React Native.
 *
 * Allows simple communication between different contexts (components,
 * modules, workers) sharing the same channel name within a single
 * JS runtime.
 */
export class WBBroadcastChannel {
  /** The channel name this instance is subscribed to. */
  readonly name: string;

  /** Event handler for incoming messages. */
  onmessage: ((event: WBMessageEvent) => void) | null = null;

  /** Event handler for message deserialization errors. */
  onmessageerror: ((event: WBMessageEvent) => void) | null = null;

  private _closed = false;
  private readonly _listeners: Map<EventType, Set<(event: WBMessageEvent) => void>> = new Map();

  /**
   * Creates a new BroadcastChannel with the given name.
   * @param name - The channel name. Must be a non-empty string.
   */
  constructor(name: string) {
    if (typeof name !== 'string') {
      throw new TypeError(
        `Failed to construct 'BroadcastChannel': argument 'name' must be a string.`,
      );
    }

    this.name = name;

    // Register in the global channel registry
    let channels = channelRegistry.get(name);
    if (!channels) {
      channels = new Set();
      channelRegistry.set(name, channels);
    }
    channels.add(this);
  }

  /**
   * Posts a message to all other BroadcastChannel instances with the same name.
   * The message is deep-copied (structured clone semantics) and delivered asynchronously.
   *
   * @param message - The message to send. Must be serializable.
   * @throws DOMException with name 'InvalidStateError' if the channel is closed.
   */
  postMessage(message: unknown): void {
    if (this._closed) {
      throw new DOMException(
        'Failed to execute \'postMessage\' on \'BroadcastChannel\': Channel is closed.',
        'InvalidStateError',
      );
    }

    // Clone the message eagerly (detect serialization errors synchronously)
    const clonedData = structuredClone(message);

    const channels = channelRegistry.get(this.name);
    if (!channels) {
      return;
    }

    // Snapshot current receivers (excluding self)
    const receivers = Array.from(channels).filter((ch) => ch !== this && !ch._closed);

    // Deliver asynchronously to each receiver
    for (const receiver of receivers) {
      queueMicrotask(() => {
        if (receiver._closed) {
          return;
        }

        const event = createMessageEvent(structuredClone(clonedData));

        // Invoke addEventListener listeners
        const listeners = receiver._listeners.get('message');
        if (listeners) {
          for (const listener of listeners) {
            try {
              listener(event);
            } catch {
              // Errors in listeners should not break delivery to other listeners
            }
          }
        }

        // Invoke onmessage handler
        if (receiver.onmessage) {
          try {
            receiver.onmessage(event);
          } catch {
            // Errors in onmessage should not break delivery
          }
        }
      });
    }
  }

  /**
   * Closes the channel. After closing:
   * - No more messages will be received
   * - postMessage() will throw
   */
  close(): void {
    if (this._closed) {
      return;
    }

    this._closed = true;

    const channels = channelRegistry.get(this.name);
    if (channels) {
      channels.delete(this);
      if (channels.size === 0) {
        channelRegistry.delete(this.name);
      }
    }

    this._listeners.clear();
    this.onmessage = null;
    this.onmessageerror = null;
  }

  /**
   * Adds an event listener for the specified event type.
   * @param type - Either 'message' or 'messageerror'.
   * @param listener - The callback to invoke when an event of that type fires.
   */
  addEventListener(
    type: EventType,
    listener: (event: WBMessageEvent) => void,
  ): void {
    if (type !== 'message' && type !== 'messageerror') {
      return;
    }

    let listeners = this._listeners.get(type);
    if (!listeners) {
      listeners = new Set();
      this._listeners.set(type, listeners);
    }
    listeners.add(listener);
  }

  /**
   * Removes a previously added event listener.
   * @param type - Either 'message' or 'messageerror'.
   * @param listener - The callback to remove.
   */
  removeEventListener(
    type: EventType,
    listener: (event: WBMessageEvent) => void,
  ): void {
    const listeners = this._listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }
}
