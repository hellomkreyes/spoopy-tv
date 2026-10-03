/**
 * liveView: placeholder for the on-air and sign-off states.
 *
 * Functions
 *   renderLive(stage, { state, listing })  returns a no-op teardown
 *
 * Use
 *   renderLive(stage, { state: 'on-air', listing: currentListing(now) })
 *
 * Gotchas
 *   - TODO (PR 3/4): replaced by the TV shell and channelController. Delete this file then.
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
