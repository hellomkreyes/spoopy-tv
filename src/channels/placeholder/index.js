/**
 * Stand-in for any channel without its own folder yet. Follows the real channel contract.
 *
 * Functions
 *   build(el, { ch, title })  draws into `el`; returns { timeline, loopMs, stillAt }
 *
 * Gotcha: call it inside gsap.context() (the controller does) so revert() cleans up.
 * Copy this file's shape for a new channel; CH 03 replaces it as the reference in PR 5.
 */
import { el } from '../../dom.js';
import { fill } from '../../format.js';
import { gsap } from '../../motion.js';
import copy from './placeholder.json';
import './placeholder.css';

export function build(root, { ch, title }) {
  const label = ch === 'so' ? copy.signOff : fill(copy.channel, { ch });
  const band = el('div', { class: 'ph-band', 'aria-hidden': 'true' });
  root.append(
    el(
      'section',
      { class: 'view ph', 'aria-labelledby': 'channel-title' },
      band,
      el(
        'h2',
        {
          id: 'channel-title',
          class: 'view-title',
          tabindex: '-1',
          'data-focus': '',
        },
        `${label} · ${title}`,
      ),
      el('p', { class: 'view-sub' }, copy.note),
    ),
  );

  // A slow tracking band drifting down the screen; position only, no brightness change.
  const timeline = gsap.timeline({ repeat: -1, paused: true });
  timeline.fromTo(
    band,
    { yPercent: -100 },
    { yPercent: 100, duration: 12, ease: 'none' },
  );
  return { timeline, loopMs: 12000, stillAt: 0.4 };
}
