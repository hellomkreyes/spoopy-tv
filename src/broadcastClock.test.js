import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  currentListing,
  msUntilMidnight,
  nextBoundary,
  scheduleNextBoundary,
  state,
} from './broadcastClock.js';
import schedule from './schedule.json';

const useTz = (tz) => {
  process.env.TZ = tz;
};
const at = (h, m, s = 0) => new Date(2026, 5, 15, h, m, s);
const utc = (iso) => new Date(iso);
const HOUR = 3_600_000;

beforeAll(() => useTz('America/Toronto'));
afterEach(() => useTz('America/Toronto'));

describe('state boundaries', () => {
  it.each([
    [[23, 59], 'off-air'],
    [[0, 0], 'on-air'],
    [[0, 1], 'on-air'],
    [[4, 42], 'on-air'],
    [[4, 42, 59], 'on-air'],
    [[4, 43], 'sign-off'],
    [[4, 43, 59], 'sign-off'],
    [[4, 44], 'off-air'],
    [[4, 59], 'off-air'],
    [[12, 0], 'off-air'],
  ])('%j is %s', ([h, m, s], expected) => {
    expect(state(at(h, m, s))).toBe(expected);
  });
});

describe('currentListing', () => {
  it('cold-opens on CH 03 before the first listing', () => {
    expect(currentListing(at(0, 0)).ch).toBe('03');
    expect(currentListing(at(2, 59)).ch).toBe('03');
  });

  it('switches at each listing start', () => {
    for (const l of schedule.listings) {
      const [h, m] = l.start.split(':').map(Number);
      expect(currentListing(at(h, m)).ch).toBe(l.ch);
    }
  });

  it('holds a listing until the next one starts', () => {
    expect(currentListing(at(3, 14)).ch).toBe('01');
    expect(currentListing(at(3, 15)).ch).toBe('03');
    expect(currentListing(at(4, 42)).ch).toBe('09');
  });

  it('is the sign-off at 04:43 and nothing off air', () => {
    expect(currentListing(at(4, 43)).ch).toBe('so');
    expect(currentListing(at(4, 44))).toBeNull();
    expect(currentListing(at(4, 59))).toBeNull();
    expect(currentListing(at(23, 59))).toBeNull();
  });

  it('rerun clock and default channel agree', () => {
    const [h, m] = schedule.rerun.clock.split(':').map(Number);
    expect(currentListing(at(h, m)).ch).toBe(schedule.rerun.default);
  });
});

describe('nextBoundary', () => {
  it('finds the next listing, sign-off, end and midnight in order', () => {
    expect(nextBoundary(at(0, 30))).toEqual(at(3, 0));
    expect(nextBoundary(at(4, 0))).toEqual(at(4, 43));
    expect(nextBoundary(at(4, 43))).toEqual(at(4, 44));
    expect(nextBoundary(at(4, 44))).toEqual(new Date(2026, 5, 16, 0, 0));
    expect(nextBoundary(at(23, 59, 30))).toEqual(new Date(2026, 5, 16, 0, 0));
  });

  it('is strictly after now', () => {
    expect(nextBoundary(at(3, 0)).getTime()).toBeGreaterThan(
      at(3, 0).getTime(),
    );
  });
});

describe('DST: America/Toronto', () => {
  // Spring forward 2026-03-08: 02:00 EST jumps to 03:00 EDT (07:00Z).
  it('spring-forward night keeps the window on wall-clock time', () => {
    expect(new Date(2026, 2, 8, 12).getTimezoneOffset()).toBe(240);
    // 01:59 EST is on air with the cold open.
    expect(state(utc('2026-03-08T06:59:00Z'))).toBe('on-air');
    expect(currentListing(utc('2026-03-08T06:59:00Z')).ch).toBe('03');
    // One minute later the wall clock reads 03:00 EDT and CH 01 starts.
    expect(currentListing(utc('2026-03-08T07:00:00Z')).ch).toBe('01');
    // Sign-off is 04:43 EDT = 08:43Z, only 3h43m of real time after 00:00 EST.
    // An elapsed-ms clock would still be on air here; the wall clock says sign-off.
    expect(state(utc('2026-03-08T08:42:59Z'))).toBe('on-air');
    expect(state(utc('2026-03-08T08:43:00Z'))).toBe('sign-off');
    expect(state(utc('2026-03-08T08:44:00Z'))).toBe('off-air');
  });

  // Fall back 2026-11-01: 02:00 EDT repeats as 01:00 EST (06:00Z).
  it('fall-back night repeats 01:00-02:00 without changing state', () => {
    expect(state(utc('2026-11-01T05:30:00Z'))).toBe('on-air'); // 01:30 EDT
    expect(state(utc('2026-11-01T06:30:00Z'))).toBe('on-air'); // 01:30 EST
    expect(currentListing(utc('2026-11-01T05:30:00Z')).ch).toBe('03');
    expect(currentListing(utc('2026-11-01T06:30:00Z')).ch).toBe('03');
    // CH 01 starts at 03:00 EST (08:00Z), not 3h after midnight EDT (07:00Z).
    expect(currentListing(utc('2026-11-01T07:30:00Z')).ch).toBe('03'); // 02:30 EST
    expect(currentListing(utc('2026-11-01T08:00:00Z')).ch).toBe('01');
    expect(state(utc('2026-11-01T09:43:00Z'))).toBe('sign-off'); // 04:43 EST
    expect(state(utc('2026-11-01T09:44:00Z'))).toBe('off-air');
  });

  it('nextBoundary lands on local time on a DST day', () => {
    expect(nextBoundary(new Date(2026, 10, 1, 0, 30))).toEqual(
      new Date(2026, 10, 1, 3, 0),
    );
    expect(nextBoundary(new Date(2026, 2, 8, 0, 30))).toEqual(
      new Date(2026, 2, 8, 3, 0),
    );
  });

  it('countdown to midnight counts real time (23 h and 25 h days)', () => {
    expect(msUntilMidnight(new Date(2026, 2, 8, 0, 0))).toBe(23 * HOUR);
    expect(msUntilMidnight(new Date(2026, 10, 1, 0, 0))).toBe(25 * HOUR);
    expect(msUntilMidnight(new Date(2026, 5, 15, 23, 59, 30))).toBe(30_000);
  });
});

describe('timezone change', () => {
  it('the same instant reads differently after the device timezone changes', () => {
    const instant = utc('2026-06-15T07:00:00Z');
    useTz('America/Toronto'); // 03:00
    expect(state(instant)).toBe('on-air');
    expect(currentListing(instant).ch).toBe('01');
    useTz('Asia/Tokyo'); // 16:00
    expect(state(instant)).toBe('off-air');
    expect(currentListing(instant)).toBeNull();
    useTz('Pacific/Kiritimati'); // 21:00 (UTC+14)
    expect(state(instant)).toBe('off-air');
    useTz('Pacific/Honolulu'); // 21:00 previous day (UTC-10)
    expect(state(instant)).toBe('off-air');
    useTz('Europe/London'); // 08:00
    expect(state(instant)).toBe('off-air');
    useTz('America/Los_Angeles'); // 00:00
    expect(state(instant)).toBe('on-air');
  });
});

describe('scheduleNextBoundary', () => {
  const doc = new EventTarget();
  const win = new EventTarget();

  const setup = () => {
    vi.useFakeTimers();
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', win);
    const onChange = vi.fn();
    const stop = scheduleNextBoundary(onChange);
    return { onChange, stop };
  };

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('fires when the sign-off minute arrives', () => {
    vi.setSystemTime(at(4, 42, 30));
    const { onChange, stop } = setup();
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(31_000);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0].state).toBe('sign-off');
    stop();
  });

  it('never sleeps in one long timeout', () => {
    vi.setSystemTime(at(0, 0));
    const { stop } = setup();
    // Next boundary is 03:00, hours away, but a timer is armed at most 30 s out.
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(30_100);
    expect(vi.getTimerCount()).toBe(1);
    stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    [() => doc, 'visibilitychange'],
    [() => win, 'focus'],
    [() => win, 'pageshow'],
  ])('re-checks on event #%# after a throttled tab wakes', (target, name) => {
    vi.setSystemTime(at(4, 40));
    const { onChange, stop } = setup();
    // The tab slept through 04:43; jump the clock without running timers.
    vi.setSystemTime(at(4, 44, 5));
    target().dispatchEvent(new Event(name));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0].state).toBe('off-air');
    stop();
  });
});
