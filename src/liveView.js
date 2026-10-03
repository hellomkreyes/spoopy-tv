// Placeholder for on-air and sign-off until the TV shell and channels land.
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
