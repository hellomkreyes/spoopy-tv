/**
 * The page frame and the TV: header, bezel + CRT, controls, LED, definition card, footer.
 *
 * Functions
 *   mountShell(root)  builds the page into `root`; returns
 *                     { screen, guide, led, setMode }
 *     screen         element views draw into (inside the CRT)
 *     guide          element the guide is drawn into
 *     led            the channel LED ({ set(ch, title) })
 *     setMode(mode)  'live' | 'off' | 'rerun': re-orders the layout and swaps the caption
 *
 * Gotcha: CH, MOTION and POWER start `disabled`; PR 4 (channelController) wires them up.
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
  power: () =>
    icon(
      svg('path', { d: 'M8 2v6' }),
      svg('path', { d: 'M4.6 4.6a5.5 5.5 0 1 0 6.8 0' }),
    ),
};

/** A control button. `text` is the visible label (hidden on mobile); `name` is the accessible name. */
function control(iconName, text, name) {
  return el(
    'button',
    { type: 'button', class: 'ctl', disabled: true },
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
      el(
        'div',
        { class: 'crt' },
        screen,
        el('div', { class: 'crt-fx', 'aria-hidden': 'true' }),
      ),
      el(
        'div',
        { class: 'controls' },
        led.el,
        control('up', copy.tv.chUp, copy.tv.chUpSr),
        control('down', copy.tv.chDown, copy.tv.chDownSr),
        control('pause', copy.tv.motion, copy.tv.motion),
        control('power', copy.tv.power, copy.tv.power),
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

  return {
    screen,
    guide,
    led,
    setMode(mode) {
      layout.dataset.mode = mode;
      caption.textContent =
        mode === 'live' ? copy.captions.live : copy.captions.off;
    },
  };
}
