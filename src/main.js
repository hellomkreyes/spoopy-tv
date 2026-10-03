/**
 * Boots the app: mounts the shell, then picks what plays on the screen and what
 * the guide shows.
 *   ?rerun in the URL -> rerunView + tape rack
 *   off air           -> offAirView + tape rack
 *   on air / sign-off -> liveView + TONIGHT'S LISTINGS
 *
 * Gotchas
 *   - While a tape is in the deck, real clock changes are ignored.
 *   - Sets <html data-ready="true"> after the first draw; the e2e tests wait on it.
 * TODO (PR 4): channelController takes over view switching.
 */
import {
  currentListing,
  scheduleNextBoundary,
  state,
} from './broadcastClock.js';
import { renderGuide } from './guide.js';
import { renderLive } from './liveView.js';
import { renderOffAir } from './offAirView.js';
import { listings, parseRerun } from './rerun.js';
import { renderRerun } from './rerunView.js';
import { mountShell } from './shell.js';
import './screen.css';

const shell = mountShell(document.getElementById('app'));
let rerunCh = parseRerun(location.search);
let teardown = () => {};

function show({ focus = false } = {}) {
  teardown();
  shell.screen.replaceChildren();
  const now = new Date();
  const real = state(now);
  const listing = currentListing(now);
  const mode = rerunCh ? 'rerun' : real === 'off-air' ? 'off' : 'live';

  shell.setMode(mode);
  if (mode === 'rerun') {
    teardown = renderRerun(shell.screen, { ch: rerunCh, onEject: eject });
    shell.led.set(rerunCh, listings.find((l) => l.ch === rerunCh).title);
  } else if (mode === 'off') {
    teardown = renderOffAir(shell.screen, { onPlay: play });
    shell.led.set(null);
  } else {
    teardown = renderLive(shell.screen, { state: real, listing });
    shell.led.set(listing.ch, listing.title);
  }
  shell.guide.replaceChildren(
    renderGuide({ mode, listing, playingCh: rerunCh, onPlay: play }),
  );
  if (focus) shell.screen.querySelector('[data-focus]')?.focus();
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
