/**
 * Boots the app: mounts the shell, the static canvas and the controller, then feeds
 * the controller the broadcast clock.
 *
 * Flow
 *   shell      the page and TV (shell.js)
 *   clock      broadcastClock decides what is on air -> controller.clockChanged
 *   controller decides how the screen changes; input.js sends it keys and swipes
 *
 * Gotchas
 *   - Sets <html data-ready="true"> after the first draw; the e2e tests wait on it.
 *   - window.__kaidenpa is a test hook (cut log, timeline count). Nothing else reads it.
 *   - The URL follows the tape in the deck (?rerun=NN) and is cleared on eject.
 */
import {
  currentListing,
  scheduleNextBoundary,
  state,
} from './broadcastClock.js';
import { createController } from './channelController.js';
import { createFx } from './fx.js';
import { bindInput } from './input.js';
import { parseRerun } from './rerun.js';
import { mountShell } from './shell.js';
import './screen.css';

const shell = mountShell(document.getElementById('app'));
const fx = createFx(shell.staticLayer);
const controller = createController({ shell, fx });
bindInput({ controller, swipeTarget: shell.crt });

const snapshot = () => {
  const now = new Date();
  return { state: state(now), listing: currentListing(now) };
};

controller.clockChanged(snapshot());
window.__kaidenpa = controller.debug;

controller.init(parseRerun(location.search)).then(() => {
  controller.subscribe(({ tape }) => {
    const url = tape ? `?rerun=${tape}` : location.pathname;
    if (location.pathname + location.search !== url) {
      history.replaceState(null, '', url);
    }
  });
  scheduleNextBoundary((snap) => controller.clockChanged(snap));
  document.documentElement.dataset.ready = 'true';
});
