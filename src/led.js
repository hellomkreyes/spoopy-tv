/**
 * The channel LED: big digits for the eye, a polite live region for screen readers.
 *
 * Functions
 *   createLed()           { el, set(ch, title) }; set(null) shows off air
 *   debounce(fn, ms)      trailing debounce (exported for tests)
 *
 * Gotcha: the live region updates 500 ms after the last change (WCAG 4.1.3), so fast
 * flipping doesn't flood screen readers. The digits update immediately.
 */
import { el } from './dom.js';
import { fill } from './format.js';
import copy from './shell.json';

export const ANNOUNCE_MS = 500;

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function createLed() {
  const digits = el(
    'span',
    { class: 'led-digits', 'aria-hidden': 'true' },
    '– –',
  );
  const live = el('p', {
    class: 'sr-only',
    'aria-live': 'polite',
    'aria-atomic': 'true',
  });
  const announce = debounce((text) => {
    live.textContent = text;
  }, ANNOUNCE_MS);

  const node = el(
    'div',
    { class: 'led' },
    el('span', { class: 'led-label', 'aria-hidden': 'true' }, copy.tv.ledLabel),
    digits,
    live,
  );

  function set(ch, title) {
    digits.textContent = ch == null ? '– –' : ch.toUpperCase();
    if (ch == null) announce(copy.led.off);
    else if (ch === 'so') announce(fill(copy.led.signOff, { title }));
    else announce(fill(copy.led.channel, { ch: Number(ch), title }));
  }

  return { el: node, set };
}
