/**
 * The cream definition card (怪電波). Copy lives in shell.json.
 *
 * Functions
 *   renderDefinition()  returns the <section>
 *
 * Gotcha: sense text is a list of [kind, text] parts ('t' text, 'em' italic, 'ja' Japanese)
 * so italics and lang="ja" survive without putting HTML in the JSON.
 */
import { el } from './dom.js';
import copy from './shell.json';
import './definition.css';

const PART = {
  t: (text) => text,
  em: (text) => el('em', {}, text),
  ja: (text) => el('span', { lang: 'ja' }, text),
};

export function renderDefinition() {
  const d = copy.definition;
  return el(
    'section',
    { class: 'definition', 'aria-labelledby': 'definition-term' },
    el(
      'p',
      { class: 'definition-label' },
      el('span', { lang: 'ja' }, d.labelJa),
      ` · ${d.label}`,
    ),
    el(
      'h2',
      { id: 'definition-term', class: 'definition-term', lang: 'ja' },
      d.term,
    ),
    el(
      'p',
      { class: 'definition-pron' },
      el('span', { lang: 'ja' }, d.reading),
      ' · ',
      el('strong', {}, d.romaji),
      ' · ',
      el('em', {}, d.pos),
    ),
    el(
      'ol',
      { class: 'definition-senses' },
      d.senses.map((sense) =>
        el(
          'li',
          {},
          sense.parts.map(([kind, text]) => PART[kind](text)),
        ),
      ),
    ),
  );
}
