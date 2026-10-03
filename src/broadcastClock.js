/**
 * Decides what is on air, from local wall-clock fields (never elapsed ms, so DST can't shift it).
 *
 * Functions (all take `now`, so tests can pass any Date)
 *   state(now)                        'on-air' | 'sign-off' | 'off-air'
 *   currentListing(now)               the live show from schedule.json, or null off air
 *   nextBoundary(now)                 next local time the state or live show changes
 *   msUntilMidnight(now)              real ms to local midnight (23 h or 25 h on DST days)
 *   scheduleNextBoundary(cb, getNow)  calls cb({ state, listing }) on each change; returns stop()
 *
 * Gotcha: no single long setTimeout. The watcher re-checks on visibilitychange/focus/pageshow.
 */
import schedule from './schedule.json';

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const SIGN_OFF = toMinutes(schedule.window.signOff);
const END = toMinutes(schedule.window.end);
// Longest a single timer may sleep, so a throttled tab re-checks soon.
const MAX_SLEEP_MS = 30_000;

const listings = schedule.listings
  .map((l) => ({ ...l, minutes: toMinutes(l.start) }))
  .sort((a, b) => a.minutes - b.minutes);

export const minutesOfDay = (now) => now.getHours() * 60 + now.getMinutes();

/** 'on-air' 00:00-04:42, 'sign-off' 04:43, 'off-air' 04:44-23:59. */
export function state(now) {
  const m = minutesOfDay(now);
  if (m >= END) return 'off-air';
  if (m >= SIGN_OFF) return 'sign-off';
  return 'on-air';
}

/** The listing live right now, or null off air. Before the first listing, the cold open. */
export function currentListing(now) {
  if (state(now) === 'off-air') return null;
  const m = minutesOfDay(now);
  const live = listings.filter((l) => l.minutes <= m).at(-1);
  return live ?? listings.find((l) => l.ch === schedule.coldOpen);
}

/** Next local moment the state or the live listing changes. */
export function nextBoundary(now) {
  const y = now.getFullYear();
  const mo = now.getMonth();
  const d = now.getDate();
  const at = (dayOffset, minutes) =>
    new Date(y, mo, d + dayOffset, Math.floor(minutes / 60), minutes % 60);
  const candidates = [
    ...listings.map((l) => at(0, l.minutes)),
    at(0, END),
    at(1, 0),
  ];
  return candidates
    .filter((t) => t.getTime() > now.getTime())
    .reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
}

/** Real milliseconds until the next local midnight (23 h or 25 h on DST days). */
export function msUntilMidnight(now) {
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  return midnight.getTime() - now.getTime();
}

const snapshot = (now) => ({ state: state(now), listing: currentListing(now) });
const keyOf = (s) => `${s.state}:${s.listing?.ch ?? ''}`;

/**
 * Calls onChange({ state, listing }) whenever the state or live listing changes.
 * Never sleeps longer than MAX_SLEEP_MS and re-checks on visibilitychange,
 * focus and pageshow, because background tabs throttle timers.
 * Returns a function that stops watching.
 */
export function scheduleNextBoundary(onChange, getNow = () => new Date()) {
  let timer;
  let last = keyOf(snapshot(getNow()));

  const check = () => {
    clearTimeout(timer);
    const now = getNow();
    const snap = snapshot(now);
    const key = keyOf(snap);
    if (key !== last) {
      last = key;
      onChange(snap);
    }
    const wait = nextBoundary(now).getTime() - now.getTime();
    timer = setTimeout(check, Math.min(Math.max(wait, 0) + 50, MAX_SLEEP_MS));
  };

  const events = [
    [document, 'visibilitychange'],
    [window, 'focus'],
    [window, 'pageshow'],
  ];
  for (const [target, name] of events) target.addEventListener(name, check);
  check();

  return () => {
    clearTimeout(timer);
    for (const [target, name] of events)
      target.removeEventListener(name, check);
  };
}
