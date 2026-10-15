/**
 * CH 03 · Emergency Alert: the reference channel. Copy this folder for a new channel.
 *
 * Functions
 *   build(root, data)  draws into `root`; returns { timeline, loopMs, stillAt }
 *
 * Motion (8 s loop, from docs/PLAN.md): the kanji slam in with overshoot, magenta bars wipe
 * across and away, the warning sign pulses by scale only (no brightness change), the
 * ticker scrolls. The still frame (stillAt) is after the bars have cleared.
 *
 * Gotcha: call it inside gsap.context() (the controller does) so revert() cleans up.
 */
import { el, svg } from '../../dom.js';
import { fill } from '../../format.js';
import { gsap } from '../../motion.js';
import copy from './ch03.json';
import './ch03.css';

const LOOP_MS = 8000;
const STILL_AT = 0.6;

export function build(root, data = copy) {
  const kanji = [...data.kanji].map((c) => el('span', { class: 'ch03-char' }, c));
  const letters = [...data.alert].map((c) =>
    el('span', { class: 'ch03-letter' }, c),
  );

  const sign = svg(
    'svg',
    {
      class: 'ch03-sign',
      viewBox: '0 0 100 90',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    svg('path', { class: 'ch03-sign-shape', d: 'M50 4 L97 86 L3 86 Z' }),
    svg('rect', { class: 'ch03-sign-bar', x: 46, y: 30, width: 8, height: 34, rx: 4 }),
    svg('circle', { class: 'ch03-sign-dot', cx: 50, cy: 74, r: 5 }),
  );

  const barA = el('div', { class: 'ch03-bar ch03-bar--a', 'aria-hidden': 'true' });
  const barB = el('div', { class: 'ch03-bar ch03-bar--b', 'aria-hidden': 'true' });

  const track = el(
    'div',
    { class: 'ch03-ticker-track' },
    el('span', {}, data.ticker),
    el('span', {}, data.ticker),
  );
  const ticker = el('div', { class: 'ch03-ticker', 'aria-hidden': 'true' }, track);

  root.append(
    el(
      'section',
      { class: 'view ch03', 'aria-labelledby': 'channel-title' },
      barA,
      barB,
      el(
        'div',
        { class: 'ch03-stage', 'aria-hidden': 'true' },
        sign,
        el('span', { class: 'ch03-kanji' }, ...kanji),
        el('span', { class: 'ch03-alert' }, ...letters),
      ),
      el(
        'span',
        {
          class: 'ch03-baybayin',
          role: 'img',
          lang: 'tl-Tglg',
          'aria-label': data.baybayinLabel,
        },
        data.baybayin,
      ),
      el(
        'h2',
        {
          id: 'channel-title',
          class: 'view-title',
          tabindex: '-1',
          'data-focus': '',
        },
        `${fill(data.channel, { ch: data.ch })} · ${data.title}`,
      ),
      el(
        'div',
        { class: 'ch03-box' },
        el('p', { class: 'ch03-banner', lang: 'ja' }, data.banner),
        el('p', { class: 'ch03-body' }, data.transcript),
        el('p', { class: 'sr-only' }, `${data.tickerLabel} ${data.ticker}`),
      ),
      ticker,
    ),
  );

  const timeline = gsap.timeline({ repeat: -1, paused: true });

  // Warning sign: four scale pulses per loop. Scale only, never brightness.
  [0, 2, 4, 6].forEach((at) =>
    timeline.to(
      sign,
      { scale: 1.06, duration: 0.25, ease: 'sine.inOut', yoyo: true, repeat: 1 },
      at,
    ),
  );

  // Kanji slam in with overshoot.
  kanji.forEach((node, i) =>
    timeline.fromTo(
      node,
      { y: -60, scale: 1.5, opacity: 0 },
      { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.4)' },
      0.2 + i * 0.12,
    ),
  );

  // ALERT letters rise in one after another: movement and fade, no on/off steps.
  letters.forEach((node, i) =>
    timeline.fromTo(
      node,
      { y: 8, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' },
      1.4 + i * 0.12,
    ),
  );

  // Magenta bars wipe across and away.
  timeline
    .fromTo(
      barA,
      { scaleX: 0, transformOrigin: '0% 50%' },
      { scaleX: 1, duration: 0.8, ease: 'power2.out' },
      2.4,
    )
    .to(barA, { scaleX: 0, transformOrigin: '100% 50%', duration: 0.8, ease: 'power2.in' }, 3.2);
  timeline
    .fromTo(
      barB,
      { scaleX: 0, transformOrigin: '100% 50%' },
      { scaleX: 1, duration: 0.8, ease: 'power2.out' },
      2.6,
    )
    .to(barB, { scaleX: 0, transformOrigin: '0% 50%', duration: 0.8, ease: 'power2.in' }, 3.4);

  // Ticker: the copy is doubled, so moving half the track loops seamlessly.
  timeline.fromTo(
    track,
    { xPercent: 0 },
    { xPercent: -50, duration: LOOP_MS / 1000, ease: 'none' },
    0,
  );

  return { timeline, loopMs: LOOP_MS, stillAt: STILL_AT };
}
