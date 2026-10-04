/**
 * The TV guide. On air it is TONIGHT'S LISTINGS; off air or in a rerun it becomes the
 * tape rack, where every listing is a real <button> that starts that tape.
 *
 * Functions
 *   renderGuide({ mode, listing, tunedCh, canTune, onTune, playingCh, onPlay })
 *     mode       'live' | 'off' | 'rerun'
 *     listing    the listing the clock says is live (live mode: gets the ON AIR badge)
 *     tunedCh    the channel on screen (live mode: gets the highlight)
 *     canTune    false disables the live rows (sign-off, power off)
 *     onTune     called with a channel id when a live row is pressed
 *     playingCh  the tape in the deck (rerun mode: gets PLAYING)
 *     onPlay     called with a channel id when a tape row is pressed
 *
 * Gotcha: the 04:43 sign-off is a tape-rack row only; it is not a channel on the live guide.
 */
import { el } from './dom.js';
import { fill, to12h } from './format.js';
import offAir from './offAir.json';
import { listings, rerunClock, rerunDefault } from './rerun.js';
import shell from './shell.json';
import './guide.css';

const signalLost = () =>
  el(
    'li',
    { class: 'guide-row guide-lost' },
    el('span', { class: 'guide-time', 'aria-hidden': 'true' }, '--:--'),
    el('span', { class: 'guide-ch' }, shell.guide.signalLostCh),
    el(
      'span',
      { class: 'guide-title' },
      el('span', { class: 'guide-static', 'aria-hidden': 'true' }),
      shell.guide.signalLost,
    ),
  );

function liveRows({ listing, tunedCh, canTune, onTune }) {
  return listings
    .filter((l) => l.ch !== 'so')
    .map((l) =>
      el(
        'li',
        { class: 'guide-row guide-row-tape' },
        el(
          'button',
          {
            type: 'button',
            class: 'guide-item guide-item-live',
            'data-ch': l.ch,
            'aria-current': l.ch === tunedCh ? 'true' : null,
            disabled: !canTune,
            onclick: () => onTune(l.ch),
          },
          el('span', { class: 'sr-only' }, shell.guide.tune),
          el('time', { class: 'guide-time' }, l.start),
          el('span', { class: 'guide-ch' }, `CH ${l.ch}`),
          el(
            'span',
            { class: 'guide-title' },
            l.title,
            l.ch === listing?.ch
              ? el(
                  'span',
                  { class: 'guide-badge guide-badge-live' },
                  ` ● ${shell.guide.onAir}`,
                )
              : null,
          ),
        ),
      ),
    );
}

function rackRows(playingCh, onPlay) {
  const text = offAir.rack;
  return listings.map((l) => {
    const isPlaying = l.ch === playingCh;
    const badge = isPlaying
      ? text.playing
      : !playingCh && l.ch === rerunDefault
        ? text.startsHere
        : null;
    return el(
      'li',
      { class: 'guide-row guide-row-tape' },
      el(
        'button',
        {
          type: 'button',
          class: 'guide-item',
          'data-ch': l.ch,
          'aria-current': isPlaying ? 'true' : null,
          onclick: () => onPlay(l.ch),
        },
        el('span', { class: 'sr-only' }, text.play),
        el('span', { class: 'guide-play', 'aria-hidden': 'true' }, '▶'),
        el('time', { class: 'guide-time' }, l.start),
        el(
          'span',
          { class: 'guide-ch' },
          l.ch === 'so' ? text.signOffLabel : `CH ${l.ch}`,
        ),
        el(
          'span',
          { class: 'guide-title' },
          l.title,
          badge ? el('span', { class: 'guide-badge' }, ` · ${badge}`) : null,
        ),
      ),
    );
  });
}

export function renderGuide({
  mode,
  listing,
  tunedCh,
  canTune,
  onTune,
  playingCh,
  onPlay,
}) {
  const isLive = mode === 'live';
  return el(
    'section',
    { class: 'guide', id: 'listings', 'aria-labelledby': 'guide-title' },
    el(
      'h2',
      { id: 'guide-title', class: 'guide-heading' },
      isLive ? shell.guide.title : offAir.rack.title,
    ),
    isLive
      ? null
      : el(
          'p',
          { class: 'guide-intro' },
          fill(offAir.rack.intro, { time: to12h(rerunClock) }),
        ),
    el(
      'ol',
      { class: 'guide-list' },
      isLive
        ? liveRows({ listing, tunedCh, canTune, onTune })
        : rackRows(playingCh, onPlay),
      signalLost(),
    ),
  );
}
