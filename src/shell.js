/**
 * The page frame and the TV: header, bezel + CRT, controls, LED, definition card, footer.
 *
 * Functions
 *   mountShell(root)  builds the page into `root`; returns
 *     screen        element channels and the test card draw into (inside the CRT)
 *     overlay       element for the rerun bug and EJECT, above the screen
 *     staticLayer   { layer, canvas, label } for the static burst (see fx.js)
 *     crt           the CRT element (gets .is-off when powered down)
 *     guide         element the guide is drawn into
 *     led           the channel LED ({ set(ch, title) })
 *     controls      { up, down, motion, power } buttons; the controller wires them
 *     setMode(mode)       'live' | 'off' | 'rerun': re-orders the layout, swaps the caption
 *     setMotionPaused(p)  MOTION button state (aria-pressed + icon)
 *     setPowerOn(on)      POWER button state and the dark screen
 *
 * Gotcha: layer order inside the CRT is screen < overlay < static < scanlines.
 */
import { el, svg } from './dom.js';
import { renderDefinition } from './definition.js';
import { createLed } from './led.js';
import copy from './shell.json';
import './tv.css';

const icon = (...children) =>
  svg('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true' }, ...children);

const ICONS = {
  up: () => icon(svg('polyline', { points: '3,11 8,5 13,11' })),
  down: () => icon(svg('polyline', { points: '3,5 8,11 13,5' })),
  pause: () =>
    icon(
      svg('rect', { x: 3, y: 3, width: 3.5, height: 10, class: 'fill' }),
      svg('rect', { x: 9.5, y: 3, width: 3.5, height: 10, class: 'fill' }),
    ),
  play: () => icon(svg('polygon', { points: '4,3 13,8 4,13', class: 'fill' })),
  power: () =>
    icon(
      svg('path', { d: 'M8 2v6' }),
      svg('path', { d: 'M4.6 4.6a5.5 5.5 0 1 0 6.8 0' }),
    ),
};

/** A control button. `text` is the visible label (hidden on mobile); `name` is the accessible name. */
function control(iconName, text, name, extra = {}) {
  return el(
    'button',
    { type: 'button', class: 'ctl', ...extra },
    ICONS[iconName](),
    el('span', { class: 'ctl-text', 'aria-hidden': 'true' }, text),
    el('span', { class: 'sr-only' }, name),
  );
}

function header() {
  return el(
    'header',
    { class: 'site-header' },
    el(
      'div',
      { class: 'brand' },
      el(
        'h1',
        { class: 'wordmark' },
        el('span', { lang: 'ja' }, copy.wordmark),
        el('span', { class: 'sr-only' }, ` ${copy.wordmarkSr}`),
      ),
      el(
        'span',
        { class: 'domain' },
        el('span', { class: 'domain-name' }, `${copy.brandName} · `),
        copy.domain,
      ),
    ),
    el(
      'nav',
      { class: 'site-nav', 'aria-label': 'Site' },
      copy.nav.map((link) =>
        el(
          'a',
          { href: link.href, rel: link.external ? 'noopener' : null },
          link.label,
        ),
      ),
    ),
  );
}

function footer() {
  return el(
    'footer',
    { class: 'site-footer' },
    el(
      'p',
      {},
      copy.footer.left,
      el('span', { class: 'footer-extra' }, ` · ${copy.footer.leftExtra}`),
    ),
    el('p', {}, copy.footer.right),
  );
}

export function mountShell(root) {
  const led = createLed();
  const screen = el('div', { class: 'crt-content', id: 'screen' });
  const overlay = el('div', { class: 'crt-overlay' });
  const canvas = el('canvas', { class: 'static-canvas' });
  const label = el('span', { class: 'static-ch' });
  const layer = el(
    'div',
    { class: 'static-layer', 'aria-hidden': 'true' },
    canvas,
    label,
    el('span', { class: 'static-tuning' }, copy.static.tuning),
  );
  const crt = el(
    'div',
    { class: 'crt' },
    screen,
    overlay,
    layer,
    el('div', { class: 'crt-fx', 'aria-hidden': 'true' }),
  );

  const controls = {
    up: control('up', copy.tv.chUp, copy.tv.chUpSr),
    down: control('down', copy.tv.chDown, copy.tv.chDownSr),
    motion: control('pause', copy.tv.motion, copy.tv.motion, {
      'aria-pressed': 'false',
    }),
    power: control('power', copy.tv.power, copy.tv.power, {
      'aria-pressed': 'true',
    }),
  };

  const wide = el('span', { class: 'cap-wide' });
  const narrow = el('span', { class: 'cap-narrow' });
  const caption = el('p', { class: 'tv-caption' }, wide, narrow);
  const guide = el('div', { class: 'slot-guide' });

  const tv = el(
    'section',
    { class: 'slot-tv', 'aria-label': copy.tv.label },
    el(
      'div',
      { class: 'tv-bezel' },
      crt,
      el(
        'div',
        { class: 'controls' },
        led.el,
        controls.up,
        controls.down,
        controls.motion,
        controls.power,
        el('div', { class: 'grille', 'aria-hidden': 'true' }),
      ),
    ),
    caption,
  );

  const layout = el(
    'div',
    { class: 'layout' },
    tv,
    el('div', { class: 'slot-def' }, renderDefinition()),
    guide,
  );
  root.append(header(), el('main', { class: 'site-main' }, layout), footer());

  const swapIcon = (button, name) =>
    button.querySelector('svg').replaceWith(ICONS[name]());

  return {
    screen,
    overlay,
    staticLayer: { layer, canvas, label },
    crt,
    guide,
    led,
    controls,
    setMode(mode) {
      layout.dataset.mode = mode;
      const live = mode === 'live';
      wide.textContent = live ? copy.captions.live : copy.captions.off;
      narrow.textContent = live ? copy.captions.liveNarrow : copy.captions.off;
    },
    setMotionPaused(paused) {
      controls.motion.setAttribute('aria-pressed', String(paused));
      swapIcon(controls.motion, paused ? 'play' : 'pause');
    },
    setPowerOn(on) {
      controls.power.setAttribute('aria-pressed', String(on));
      crt.classList.toggle('is-off', !on);
    },
  };
}
