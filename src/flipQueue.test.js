import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_PENDING, MIN_GAP_MS, createFlipQueue } from './flipQueue.js';

const FLIP_MS = 320; // exit 40 + static 280

describe('flip queue', () => {
  let starts;
  let queue;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    starts = [];
    queue = createFlipQueue(async (action) => {
      starts.push({ action, t: Date.now() });
      await new Promise((resolve) => setTimeout(resolve, FLIP_MS));
    });
  });
  afterEach(() => vi.useRealTimers());

  it('never starts more than 3 flips in any 1 s window, even when held down', async () => {
    // A held key: a request every 30 ms for 3 seconds.
    for (let t = 0; t < 3000; t += 30) {
      queue.request({ n: t });
      await vi.advanceTimersByTimeAsync(30);
    }
    await vi.advanceTimersByTimeAsync(2000);

    expect(starts.length).toBeGreaterThan(5);
    for (const s of starts) {
      const inWindow = starts.filter((o) => o.t > s.t - 1000 && o.t <= s.t);
      expect(inWindow.length).toBeLessThanOrEqual(3);
    }
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i].t - starts[i - 1].t).toBeGreaterThanOrEqual(MIN_GAP_MS);
    }
  });

  it('runs the first request at once and keeps order', async () => {
    queue.request('a');
    queue.request('b');
    await vi.advanceTimersByTimeAsync(0);
    expect(starts.map((s) => s.action)).toEqual(['a']);
    await vi.advanceTimersByTimeAsync(MIN_GAP_MS);
    expect(starts.map((s) => s.action)).toEqual(['a', 'b']);
  });

  it('drops requests beyond the pending limit, so a released key stops quickly', async () => {
    const accepted = Array.from({ length: 10 }, (_, i) => queue.request(i));
    // One runs immediately; MAX_PENDING wait; the rest are dropped.
    expect(accepted.filter(Boolean)).toHaveLength(1 + MAX_PENDING);
    await vi.advanceTimersByTimeAsync(5000);
    expect(starts).toHaveLength(1 + MAX_PENDING);
  });
});
