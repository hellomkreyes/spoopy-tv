/**
 * rerun: helpers for ?rerun mode (the Haunted Tape), where the clock is frozen at 04:20.
 *
 * Functions
 *   parseRerun(search)  null if not a rerun, else a valid channel id ('04', 'so', ...)
 *   frozenNow(now)      today's date pinned to schedule.rerun.clock
 *   listings, rerunClock, rerunDefault   re-exports from schedule.json
 *
 * Use
 *   parseRerun(location.search) at boot. Plain ?rerun, an empty value, or an
 *   unknown channel falls back to schedule.rerun.default (Sky Watch).
 *
 * Gotchas
 *   - Single digits are padded ('?rerun=4' is CH 04); values are lowercased.
 *   - frozenNow only pins the guide and on-screen time. Channel loops run from tape start.
 *   - TODO (PR 4): feed frozenNow into the guide's ON AIR marker once the TV shell exists.
 */
import schedule from './schedule.json';

export const listings = schedule.listings;

/** null when not a rerun; otherwise a valid channel id ('04', 'so', ...). */
export function parseRerun(search) {
  const params = new URLSearchParams(search);
  if (!params.has('rerun')) return null;
  let ch = params.get('rerun').trim().toLowerCase();
  if (/^\d$/.test(ch)) ch = `0${ch}`;
  return listings.some((l) => l.ch === ch) ? ch : schedule.rerun.default;
}

/** Today's date with the time pinned to the rerun clock (04:20). */
export function frozenNow(now) {
  const [h, m] = schedule.rerun.clock.split(':').map(Number);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
}

export const rerunClock = schedule.rerun.clock;
export const rerunDefault = schedule.rerun.default;
