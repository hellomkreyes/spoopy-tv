/**
 * The Haunted Tape overlay on top of whatever channel is playing: RERUN bug, the clock
 * frozen at 04:20, and the EJECT button.
 *
 * Functions
 *   renderRerunOverlay(layer, { ch, onEject })  draws into `layer`; returns a teardown function
 *
 * Gotcha: the sign-off tape ('so') ejects itself after 60 s; other tapes run until ejected.
 */
import { el } from './dom.js';
import { to12h } from './format.js';
import copy from './offAir.json';
import { rerunClock } from './rerun.js';

const SIGN_OFF_MS = 60_000;

export function renderRerunOverlay(layer, { ch, onEject }) {
  layer.append(
    el(
      'div',
      { class: 'rerun-top' },
      el('span', { class: 'rerun-bug' }, `● ${copy.rerun.bug}`),
      el('time', { class: 'rerun-clock' }, to12h(rerunClock)),
    ),
    el(
      'button',
      { type: 'button', class: 'eject', onclick: onEject },
      copy.rerun.eject,
    ),
  );
  const timer = ch === 'so' ? setTimeout(onEject, SIGN_OFF_MS) : null;
  return () => {
    clearTimeout(timer);
    layer.replaceChildren();
  };
}
