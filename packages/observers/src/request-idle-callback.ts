/**
 * requestIdleCallback / cancelIdleCallback polyfill for React Native.
 *
 * Uses setTimeout with a 50ms budget simulation to approximate
 * the browser's idle callback behavior.
 *
 * Spec: https://www.w3.org/TR/requestidlecallback/
 */

/**
 * Represents the deadline object passed to idle callbacks.
 */
export interface IdleDeadline {
  /** True if the callback was invoked because the timeout expired. */
  readonly didTimeout: boolean;
  /** Returns the estimated remaining idle time in milliseconds. */
  timeRemaining(): number;
}

/** Maximum idle budget per callback (ms), per spec recommendation. */
const IDLE_BUDGET_MS = 50;

/** Delay before invoking the idle callback (ms). */
const IDLE_DELAY_MS = 1;

/** Counter for generating unique callback IDs. */
let nextId = 1;

/** Map of active timeout handles for cancellation. */
const activeCallbacks = new Map<number, ReturnType<typeof setTimeout>>();

/**
 * Schedules a callback to run during idle periods.
 *
 * The callback receives an IdleDeadline object that reports:
 * - `timeRemaining()`: the estimated ms of idle time left (max 50ms)
 * - `didTimeout`: whether the optional timeout was exceeded
 *
 * @param callback - Function to invoke when idle time is available.
 * @param options - Optional configuration with a `timeout` property.
 * @returns A numeric ID that can be passed to wbCancelIdleCallback.
 */
export function wbRequestIdleCallback(
  callback: (deadline: IdleDeadline) => void,
  options?: { timeout?: number },
): number {
  if (typeof callback !== 'function') {
    throw new TypeError(
      `Failed to execute 'requestIdleCallback': callback must be a function.`,
    );
  }

  const id = nextId++;
  const scheduledAt = Date.now();
  const timeoutMs = options?.timeout;

  const handle = setTimeout(() => {
    activeCallbacks.delete(id);

    const invokedAt = Date.now();
    const didTimeout =
      timeoutMs !== undefined && invokedAt - scheduledAt >= timeoutMs;

    const deadline: IdleDeadline = {
      didTimeout,
      timeRemaining(): number {
        const elapsed = Date.now() - invokedAt;
        return Math.max(0, IDLE_BUDGET_MS - elapsed);
      },
    };

    callback(deadline);
  }, IDLE_DELAY_MS);

  activeCallbacks.set(id, handle);
  return id;
}

/**
 * Cancels a previously scheduled idle callback.
 *
 * @param id - The ID returned by wbRequestIdleCallback.
 */
export function wbCancelIdleCallback(id: number): void {
  const handle = activeCallbacks.get(id);
  if (handle !== undefined) {
    clearTimeout(handle);
    activeCallbacks.delete(id);
  }
}
