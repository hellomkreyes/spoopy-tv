// textlint can't read JSON, so pull every Japanese string out of the copy files
// (src/**/*.json) into build/ja-copy.txt, one string per line, for textlint.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const JA = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;

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

const lines = [];
for (const file of jsonFiles('src')) {
  for (const s of strings(JSON.parse(readFileSync(file, 'utf8')))) {
    if (JA.test(s)) lines.push(...s.split('\n').filter(Boolean));
  }
}

mkdirSync('build', { recursive: true });
writeFileSync('build/ja-copy.txt', lines.join('\n') + '\n');
console.log(
  `extracted ${lines.length} Japanese string(s) to build/ja-copy.txt`,
);
