// Self-hosted font subsets (no Google Fonts requests at runtime).
//
//   npm run fonts        picks the font slices the copy needs and writes src/fonts/
//   npm run lint:fonts   fails if src/fonts/ is stale or the copy uses an uncovered glyph
//
// @fontsource ships each family pre-sliced by unicode-range. We keep the latin slice
// plus the fewest extra slices needed for the CJK characters used in src/**/*.json, so
// the Japanese subset grows only when the copy does. Symbols (arrows, etc.) are left to
// the system font. Output is committed so builds are deterministic.
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const OUT = 'src/fonts';
// `cjk` limits which CJK characters a face must cover: omit for all of them, '' for
// none. Dela Gothic One only styles the wordmark and definition term; Zen Kaku bold is
// only used for the latin romanisation.
const FAMILIES = [
  {
    pkg: 'dela-gothic-one',
    name: 'Dela Gothic One',
    faces: [{ weight: 400, cjk: '怪電波' }],
  },
  { pkg: 'dotgothic16', name: 'DotGothic16', faces: [{ weight: 400 }] },
  {
    pkg: 'zen-kaku-gothic-new',
    name: 'Zen Kaku Gothic New',
    faces: [{ weight: 400 }, { weight: 700, cjk: '' }],
  },
];

// Kana, kanji and fullwidth forms start here. Below it is latin/symbols.
const CJK_START = 0x2e80;

function* jsonFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* jsonFiles(path);
    else if (entry.name.endsWith('.json')) yield path;
  }
}

function* strings(value) {
  if (typeof value === 'string') yield value;
  else if (Array.isArray(value)) for (const v of value) yield* strings(v);
  else if (value && typeof value === 'object')
    for (const v of Object.values(value)) yield* strings(v);
}

/** Code points used by the copy that are not plain ASCII (ASCII comes from the latin slice). */
function copyCodePoints() {
  const points = new Set();
  for (const file of jsonFiles('src')) {
    for (const s of strings(JSON.parse(readFileSync(file, 'utf8')))) {
      for (const ch of s)
        if (ch.codePointAt(0) > 0x7f) points.add(ch.codePointAt(0));
    }
  }
  return points;
}

function parseRanges(list) {
  return list.split(',').map((part) => {
    const [a, b] = part.trim().replace(/^U\+/i, '').split('-');
    const lo = parseInt(a, 16);
    return [lo, b ? parseInt(b, 16) : lo];
  });
}

const inRanges = (ranges, cp) =>
  ranges.some(([lo, hi]) => cp >= lo && cp <= hi);

/** All @font-face slices of one family + weight, from the @fontsource css. */
function slices(pkg, weight) {
  const dir = `node_modules/@fontsource/${pkg}`;
  const css = readFileSync(`${dir}/${weight}.css`, 'utf8');
  return [
    ...css.matchAll(/\/\*\s*(\S+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g),
  ].map(([, comment, body]) => ({
    comment,
    isLatin: /-latin-\d+-normal$/.test(comment),
    ranges: parseRanges(/unicode-range:\s*([^;]+);/.exec(body)[1]),
    file: /url\(\.\/files\/([^)]+\.woff2)\)/.exec(body)[1],
    dir,
  }));
}

function plan() {
  const points = [...copyCodePoints()];
  const covered = new Set();
  const picked = [];
  for (const family of FAMILIES) {
    for (const { weight, cjk } of family.faces) {
      const all = slices(family.pkg, weight);
      const latin = all.filter((sl) => sl.isLatin);
      const wanted = points.filter(
        (cp) =>
          cp >= CJK_START &&
          (cjk === undefined || cjk.includes(String.fromCodePoint(cp))),
      );
      for (const sl of latin) picked.push({ family, weight, slice: sl });
      for (const cp of points)
        if (latin.some((sl) => inRanges(sl.ranges, cp))) covered.add(cp);
      // Greedy: take the slice covering the most still-uncovered wanted characters.
      let todo = wanted.filter(
        (cp) => !latin.some((sl) => inRanges(sl.ranges, cp)),
      );
      while (todo.length) {
        const best = all
          .filter((sl) => !sl.isLatin)
          .map((sl) => ({
            sl,
            hits: todo.filter((cp) => inRanges(sl.ranges, cp)),
          }))
          .sort((a, b) => b.hits.length - a.hits.length)[0];
        if (!best || !best.hits.length) break;
        picked.push({ family, weight, slice: best.sl });
        best.hits.forEach((cp) => covered.add(cp));
        todo = todo.filter((cp) => !best.hits.includes(cp));
      }
    }
  }
  const missing = points.filter((cp) => cp >= CJK_START && !covered.has(cp));
  return { picked, missing };
}

function render(picked) {
  const blocks = picked.map(({ family, weight, slice }) => {
    const ranges = slice.ranges.map(([lo, hi]) =>
      lo === hi
        ? `U+${lo.toString(16)}`
        : `U+${lo.toString(16)}-${hi.toString(16)}`,
    );
    return `@font-face {
  font-family: '${family.name}';
  font-style: normal;
  font-display: swap;
  font-weight: ${weight};
  src: url(./${slice.file}) format('woff2');
  unicode-range: ${ranges.join(',')};
}`;
  });
  return `/* Generated by scripts/fonts.mjs. Do not edit; run \`npm run fonts\`. */\n${blocks.join('\n')}\n`;
}

const { picked, missing } = plan();
if (missing.length) {
  const list = missing
    .map(
      (cp) =>
        `${String.fromCodePoint(cp)} (U+${cp.toString(16).toUpperCase()})`,
    )
    .join(', ');
  console.error(`No font covers these characters used in the copy: ${list}`);
  process.exit(1);
}

const css = render(picked);
const files = [...new Set(picked.map((p) => p.slice.file))].sort();

if (process.argv.includes('--check')) {
  const have = new Set(readdirSync(OUT).filter((f) => f.endsWith('.woff2')));
  const stale =
    files.some((f) => !have.has(f)) ||
    [...have].some((f) => !files.includes(f)) ||
    readFileSync(join(OUT, 'fonts.css'), 'utf8') !== css;
  if (stale) {
    console.error(
      'src/fonts is out of date with the copy. Run `npm run fonts` and commit the result.',
    );
    process.exit(1);
  }
  console.log(`fonts ok: ${files.length} subset file(s)`);
} else {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  for (const { slice } of picked)
    copyFileSync(`${slice.dir}/files/${slice.file}`, join(OUT, slice.file));
  writeFileSync(join(OUT, 'fonts.css'), css);
  console.log(`wrote ${files.length} subset file(s) to ${OUT}`);
}
