/**
 * Boot: ?rerun -> rerunView, off air -> offAirView, else liveView.
 * While a tape is in the deck, real clock changes are ignored.
 * TODO (PR 4): channelController takes over view switching.
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
