// ?rerun mode: the Haunted Tape. Clock is frozen at schedule.rerun.clock.
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
