/**
 * format: small string helpers for the screen copy.
 *
 * Functions
 *   to12h('04:20')       '04:20 AM'
 *   countdown(ms)        'HH:MM:SS', rounded up so 00:00:00 only shows at zero
 *   fill(text, values)   replaces {name} slots in copy strings, e.g. fill('REC {time}', { time })
 *
 * Gotchas
 *   - fill() swaps a missing value for '' instead of throwing; check the copy JSON keys.
 *   - Results are plain text. Insert them with el()/textContent, never innerHTML.
 */
const pad = (n) => String(n).padStart(2, '0');

/** '04:20' -> '04:20 AM' */
export function to12h(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${pad(h % 12 || 12)}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Milliseconds -> 'HH:MM:SS', rounded up so 00:00:00 only shows at zero. */
export function countdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
    .map(pad)
    .join(':');
}

/** Fill {name} slots in copy strings. */
export const fill = (text, values) =>
  text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
