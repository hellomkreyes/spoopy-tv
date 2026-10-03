/**
 * Placeholder for the on-air and sign-off states.
 *
 * Functions
 *   renderLive(stage, { state, listing })  draws a heading for the live show; returns a no-op teardown
 *
 * TODO (PR 3/4): delete this when the TV shell and channelController land.
 */
import { el } from './dom.js';
import { fill } from './format.js';
import copy from './offAir.json';

export function renderLive(stage, { state, listing }) {
  const label = state === 'sign-off' ? copy.live.signOff : copy.live.onAir;
  const channel =
    listing.ch === 'so' ? '' : fill(copy.rerun.channel, { ch: listing.ch });
  stage.append(
    el(
      'section',
      { class: 'screen live', 'aria-labelledby': 'live-title' },
      el(
        'h2',
        {
          id: 'live-title',
          class: 'screen-title',
          tabindex: '-1',
          'data-focus': '',
        },
        [label, channel, listing.title].filter(Boolean).join(' · '),
      ),
      el('p', { class: 'screen-sub' }, copy.live.placeholder),
    ),
  );
  return () => {};
}
