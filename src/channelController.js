/**
 * Decides how the screen changes. Owns the current channel, mode, power and the cut
 * between channels: exit (40 ms black) -> static burst (280 ms) -> new channel.
 *
 * Functions
 *   createController({ shell, fx })  returns:
 *     init(rerunCh)       first draw (no static); rerunCh is the ?rerun channel or null
 *     clockChanged(snap)  { state, listing } from broadcastClock; call before init too
 *     flip(dir)           +1 channel up, -1 down (rate limited to 3 a second)
 *     tuneDigit(n)        jump to channel 0n if it exists (0 does nothing: CH 00 is hidden)
 *     play(ch), eject()   put a tape in / take it out
 *     togglePower(), togglePaused()
 *     subscribe(fn)       fn({ mode, ch, tape, power }) after each change
 *     debug               test hooks (cut log, timeline count, progress)
 *
 * Modes: 'live' (on air), 'off' (test card), 'rerun' (a tape in the deck).
 *
 * Gotchas
 *   - Channels run inside gsap.context() and are revert()ed on exit, so flipping leaks nothing.
 *   - Each channel is seeked to the clock: progress = ((now - origin) % loopMs) / loopMs, with
 *     origin = local midnight on air, tape start in a rerun. Re-synced on resume and on
 *     visibilitychange.
 *   - No static burst under reduced motion or while paused: a hard cut. Reduced motion
 *     holds every channel on its designed still frame (stillAt).
 *   - Clock changes (midnight, 04:43, 04:44) re-tune on air; a tape in the deck is left alone.
 */
import { loadChannel } from './channels/index.js';
import { createFlipQueue } from './flipQueue.js';
import { fill } from './format.js';
import { renderGuide } from './guide.js';
import {
  gsap,
  isPaused,
  isReduced,
  onMotionChange,
  togglePaused,
} from './motion.js';
import { renderOffAir } from './offAirView.js';
import { renderRerunOverlay } from './rerunOverlay.js';
import { listings } from './rerun.js';
import copy from './shell.json';

export const EXIT_MS = 40;
export const BURST_MS = 280;
const CUT_LOG_MAX = 200;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createController({ shell, fx }) {
  const store = {
    power: true,
    mode: 'off',
    ch: null,
    tape: null,
    tapeStart: 0,
    liveCh: null,
  };
  let clock = null;
  let current = null;
  let overlayTeardown = null;
  let shown = false;
  let guideKey = '';
  let chain = Promise.resolve();
  const subscribers = new Set();

  const debug = {
    cuts: [],
    timelineCount: () =>
      gsap.globalTimeline.getChildren(true, true, true).length,
    progress: () => current?.result?.timeline.progress() ?? null,
    stillAt: () => current?.result?.stillAt ?? null,
  };

  const run = (fn) => {
    chain = chain.then(fn).catch(console.error);
    return chain;
  };

  const notify = () =>
    subscribers.forEach((fn) =>
      fn({
        mode: store.mode,
        ch: store.ch,
        tape: store.tape,
        power: store.power,
      }),
    );

  // ---- clock sync -------------------------------------------------------

  function origin() {
    if (store.mode === 'rerun') return store.tapeStart;
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  /** Reduced motion: still frame. Otherwise seek to the clock and play. */
  function applyMotion() {
    if (!current?.result) return;
    const { timeline, loopMs, stillAt } = current.result;
    if (isReduced()) {
      timeline.progress(stillAt).pause();
    } else {
      timeline.progress(((Date.now() - origin()) % loopMs) / loopMs);
      timeline.play();
    }
  }

  // ---- what can be tuned ------------------------------------------------

  function flippable() {
    if (store.mode === 'rerun') return listings.map((l) => l.ch);
    if (store.mode === 'live' && clock.state === 'on-air') {
      return listings.filter((l) => l.ch !== 'so').map((l) => l.ch);
    }
    return [];
  }

  function target() {
    if (store.tape) return { mode: 'rerun', ch: store.tape };
    if (clock.state === 'off-air') return { mode: 'off', ch: null };
    const ch =
      clock.state === 'sign-off' ? 'so' : (store.liveCh ?? clock.listing.ch);
    return { mode: 'live', ch };
  }

  // ---- drawing ----------------------------------------------------------

  function updateControls() {
    const canFlip = store.power && flippable().length > 1;
    shell.controls.up.disabled = !canFlip;
    shell.controls.down.disabled = !canFlip;
  }

  function renderGuideIfChanged() {
    const key = `${store.mode}|${store.tape}|${store.mode === 'live' ? clock.listing?.ch : ''}`;
    if (key === guideKey) return;
    guideKey = key;
    shell.guide.replaceChildren(
      renderGuide({
        mode: store.mode,
        listing: clock.listing,
        playingCh: store.tape,
        onPlay: play,
      }),
    );
  }

  function teardownCurrent() {
    current?.ctx?.revert();
    current?.teardown?.();
    overlayTeardown?.();
    overlayTeardown = null;
    shell.screen.classList.remove('is-tuning');
    shell.screen.replaceChildren();
    current = null;
  }

  async function mount(next) {
    if (next.mode === 'off') {
      current = { teardown: renderOffAir(shell.screen, { onPlay: play }) };
      return;
    }
    const listing = listings.find((l) => l.ch === next.ch);
    const { build, data } = await loadChannel(next.ch, listing);
    let result;
    const ctx = gsap.context(() => {
      result = build(shell.screen, data);
    }, shell.screen);
    current = { ctx, result };
    if (next.mode === 'rerun') {
      overlayTeardown = renderRerunOverlay(shell.overlay, {
        ch: next.ch,
        onEject: eject,
      });
      if (!isReduced()) {
        shell.screen.classList.add('is-tuning');
        shell.screen.addEventListener(
          'animationend',
          () => shell.screen.classList.remove('is-tuning'),
          { once: true },
        );
      }
    }
    applyMotion();
  }

  async function transition(next, { burst = true, focus = false } = {}) {
    const useBurst = burst && shown && !isReduced() && !isPaused();
    // The first draw is not a cut (nothing is replaced), so it isn't logged.
    if (shown) {
      debug.cuts.push({ t: Date.now(), burst: useBurst, ...next });
      if (debug.cuts.length > CUT_LOG_MAX) debug.cuts.shift();
    }

    teardownCurrent();
    store.mode = next.mode;
    store.ch = next.ch;
    const listing = listings.find((l) => l.ch === next.ch);
    shell.setMode(next.mode);
    shell.led.set(next.ch, listing?.title);
    renderGuideIfChanged();
    updateControls();

    if (useBurst) {
      shell.staticLayer.label.textContent = !next.ch
        ? ''
        : next.ch === 'so'
          ? copy.static.signOff
          : fill(copy.static.channel, { ch: next.ch });
      await wait(EXIT_MS);
      await fx.burst(BURST_MS);
    }
    if (!store.power) return;

    await mount(next);
    shown = true;
    notify();
    if (focus) shell.screen.querySelector('[data-focus]')?.focus();
  }

  // ---- user actions, rate limited ---------------------------------------

  async function handle(action) {
    if (!store.power) return;
    if (action.type === 'play') {
      store.tape = action.ch;
      store.tapeStart = Date.now();
      return transition(target(), { focus: true });
    }
    if (action.type === 'eject') {
      store.tape = null;
      return transition(target(), { focus: true });
    }
    const list = flippable();
    if (!list.length) return;
    const ch =
      action.type === 'to'
        ? action.ch
        : list[
            (list.indexOf(store.ch) + action.dir + list.length) % list.length
          ];
    if (!list.includes(ch) || ch === store.ch) return;
    if (store.mode === 'rerun') {
      store.tape = ch;
      store.tapeStart = Date.now();
    } else {
      store.liveCh = ch;
    }
    return transition(target());
  }

  const queue = createFlipQueue((action) => run(() => handle(action)));

  const flip = (dir) => store.power && queue.request({ type: 'flip', dir });
  const tuneDigit = (n) =>
    n !== 0 && queue.request({ type: 'to', ch: `0${n}` });
  const play = (ch) => queue.request({ type: 'play', ch });
  const eject = () => queue.request({ type: 'eject' });

  function togglePower() {
    return run(async () => {
      store.power = !store.power;
      shell.setPowerOn(store.power);
      if (store.power) return transition(target());
      queue.clear();
      fx.stop();
      teardownCurrent();
      shell.led.set(null);
      updateControls();
      notify();
    });
  }

  // ---- clock and boot ---------------------------------------------------

  function clockChanged(snap) {
    const prev = clock;
    clock = snap;
    if (!prev || store.tape || !store.power) {
      if (prev && prev.state !== snap.state) store.liveCh = null;
      return;
    }
    if (prev.state !== snap.state) {
      store.liveCh = null;
      run(() => transition(target()));
    } else {
      renderGuideIfChanged();
    }
  }

  function init(rerunCh) {
    store.tape = rerunCh;
    store.tapeStart = Date.now();
    shell.controls.up.addEventListener('click', () => flip(+1));
    shell.controls.down.addEventListener('click', () => flip(-1));
    shell.controls.motion.addEventListener('click', togglePaused);
    shell.controls.power.addEventListener('click', togglePower);
    onMotionChange(({ paused, reduced }) => {
      shell.setMotionPaused(paused);
      // While paused, keep the frozen frame; re-sync to the clock on resume.
      if (!paused || reduced) applyMotion();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !isPaused()) applyMotion();
    });
    return run(() => transition(target(), { burst: false }));
  }

  return {
    init,
    clockChanged,
    flip,
    tuneDigit,
    play,
    eject,
    togglePower,
    togglePaused,
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    debug,
  };
}
