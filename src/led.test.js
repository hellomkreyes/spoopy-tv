import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANNOUNCE_MS, debounce } from './led.js';

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('waits 500 ms after the last call and runs once with the last arguments', () => {
    const fn = vi.fn();
    const d = debounce(fn, ANNOUNCE_MS);
    d('ch 1');
    vi.advanceTimersByTime(300);
    d('ch 2');
    vi.advanceTimersByTime(300);
    d('ch 3');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(499);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('ch 3');
  });

  it('is 500 ms', () => {
    expect(ANNOUNCE_MS).toBe(500);
  });
});
