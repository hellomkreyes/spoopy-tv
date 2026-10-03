/**
 * main: boots the app and picks which view to show.
 *
 * Flow
 *   rerun (?rerun in the URL)  -> rerunView
 *   off-air                    -> offAirView
 *   on-air / sign-off          -> liveView
 *   The real state is watched with scheduleNextBoundary and re-rendered when it changes.
 *
 * Gotchas
 *   - While a tape is in the deck the real clock is ignored; the rerun keeps its frozen time.
 *   - Playing or ejecting a tape updates the URL with history.replaceState (no reload)
 *     and moves focus to the new view's heading.
 *   - Sets <html data-ready="true"> once the first view is drawn; the e2e tests wait on it.
 *   - TODO (PR 4): channelController takes over view switching.
 */
import {
  currentListing,
  scheduleNextBoundary,
  state,
} from './broadcastClock.js';
import { renderLive } from './liveView.js';
import { renderOffAir } from './offAirView.js';
import { parseRerun } from './rerun.js';
import { renderRerun } from './rerunView.js';

const stage = document.getElementById('stage');
let rerunCh = parseRerun(location.search);
let teardown = () => {};

function show({ focus = false } = {}) {
  teardown();
  stage.replaceChildren();
  const now = new Date();
  if (rerunCh) {
    teardown = renderRerun(stage, {
      ch: rerunCh,
      onPlay: play,
      onEject: eject,
    });
  } else if (state(now) === 'off-air') {
    teardown = renderOffAir(stage, { onPlay: play });
  } else {
    teardown = renderLive(stage, {
      state: state(now),
      listing: currentListing(now),
    });
  }
  if (focus) stage.querySelector('[data-focus]')?.focus();
}

function setRerun(ch) {
  rerunCh = ch;
  history.replaceState(null, '', ch ? `?rerun=${ch}` : location.pathname);
  show({ focus: true });
}
const play = (ch) => setRerun(ch);
const eject = () => setRerun(null);

show();
// A tape in the deck keeps its frozen clock; real state changes only matter otherwise.
scheduleNextBoundary(() => {
  if (!rerunCh) show();
});
document.documentElement.dataset.ready = 'true';
