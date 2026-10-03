import { msUntilMidnight } from './broadcastClock.js';
import { el } from './dom.js';
import { countdown, fill, to12h } from './format.js';
import copy from './offAir.json';
import { renderRack } from './rack.js';
import { rerunClock, rerunDefault } from './rerun.js';

const BAR_COUNT = 7;

/** Off-air test card + tape rack. Returns a teardown function. */
export function renderOffAir(stage, { onPlay }) {
  const time = to12h(rerunClock);
  const counter = el(
    'time',
    { class: 'countdown' },
    countdown(msUntilMidnight(new Date())),
  );

  const tape = el(
    'button',
    { type: 'button', class: 'tape', onclick: () => onPlay(rerunDefault) },
    el(
      'span',
      { class: 'tape-art', 'aria-hidden': 'true' },
      el(
        'span',
        { class: 'tape-label' },
        el('span', { class: 'tape-label-title' }, copy.tapeLabel),
        el('span', { class: 'tape-label-rec' }, fill(copy.tapeRec, { time })),
      ),
      el(
        'span',
        { class: 'tape-reels' },
        el('span', { class: 'reel' }),
        el('span', { class: 'reel' }),
      ),
    ),
    el('span', { class: 'tape-text' }, '▶ ', fill(copy.tapeButton, { time })),
  );

  const screen = el(
    'section',
    { class: 'screen test-card', 'aria-labelledby': 'off-air-title' },
    el(
      'div',
      { class: 'bars', 'aria-hidden': 'true' },
      Array.from({ length: BAR_COUNT }, () => el('span')),
    ),
    el(
      'h2',
      {
        id: 'off-air-title',
        class: 'screen-title',
        tabindex: '-1',
        'data-focus': '',
      },
      copy.title,
    ),
    el(
      'p',
      { class: 'screen-sub' },
      el('span', { lang: 'ja' }, copy.titleJa),
      ` · ${copy.tagline}`,
    ),
    el('p', { class: 'screen-count' }, `${copy.resumes} `, counter),
    el('p', { class: 'sr-only' }, copy.resumesText),
    tape,
  );

  stage.append(el('div', { class: 'tv-grid' }, screen, renderRack({ onPlay })));

  const timer = setInterval(() => {
    counter.textContent = countdown(msUntilMidnight(new Date()));
  }, 1000);
  return () => clearInterval(timer);
}
