/**
 * AbortSignal extensions missing from React Native.
 *
 * Provides AbortSignal.timeout() and AbortSignal.any() polyfills.
 */

/**
 * Creates an AbortSignal that will abort after the specified number of milliseconds.
 *
 * @param ms - Timeout in milliseconds
 * @returns An AbortSignal that aborts with a TimeoutError after ms milliseconds
 */
export function abortSignalTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => {
    controller.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
  }, ms);
  return controller.signal;
}

/**
 * Creates an AbortSignal that aborts when any of the given signals abort.
 *
 * @param signals - Array of AbortSignals to monitor
 * @returns An AbortSignal that aborts when any input signal aborts
 */
export function abortSignalAny(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
  }

  for (const signal of signals) {
    signal.addEventListener(
      'abort',
      () => {
        if (!controller.signal.aborted) {
          controller.abort(signal.reason);
        }
      },
      { once: true },
    );
  }

  return controller.signal;
}
