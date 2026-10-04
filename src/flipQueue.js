/**
 * Rate limit for channel changes: at most 3 per second (WCAG 2.3.1), however fast
 * the requests arrive (holding an arrow key sends ~30 a second).
 *
 * Functions
 *   createFlipQueue(run, options)  returns { request(action), clear(), size }
 *     run(action)   does one change; may return a promise (the next one waits for it)
 *     request()     returns false if the queue is full and the request was dropped
 *
 * Gotchas
 *   - Starts are at least 334 ms apart, so any 1 s window holds at most 3 starts.
 *   - Only 2 requests wait. Extra repeats are dropped, so letting go of a held key
 *     stops the flipping within a flip or two instead of draining a backlog.
 *   - options (now, setTimer) exist for tests.
 */
export const MIN_GAP_MS = 334;
export const MAX_PENDING = 2;

export function createFlipQueue(
  run,
  { now = () => Date.now(), setTimer = setTimeout } = {},
) {
  const pending = [];
  let lastStart = -Infinity;
  let busy = false;
  let waiting = false;

  function pump() {
    if (busy || waiting || !pending.length) return;
    const wait = lastStart + MIN_GAP_MS - now();
    if (wait > 0) {
      waiting = true;
      setTimer(() => {
        waiting = false;
        pump();
      }, wait);
      return;
    }
    const action = pending.shift();
    lastStart = now();
    busy = true;
    Promise.resolve()
      .then(() => run(action))
      .catch(console.error)
      .finally(() => {
        busy = false;
        pump();
      });
  }

  return {
    request(action) {
      if (pending.length >= MAX_PENDING) return false;
      pending.push(action);
      pump();
      return true;
    },
    clear() {
      pending.length = 0;
    },
    get size() {
      return pending.length;
    },
  };
}
