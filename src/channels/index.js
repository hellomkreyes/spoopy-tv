/**
 * Channel registry.
 *
 * Functions
 *   loadChannel(ch, listing)  resolves { build, data } for a channel id ('03', 'so', ...)
 *
 * Use
 *   A real channel is a folder src/channels/chNN/ with index.js and chNN.json; it is
 *   picked up automatically. Anything without a folder gets the placeholder.
 *
 * Gotcha: real channels load on demand (dynamic import), so first tune-in can take a
 * moment. That happens behind the static burst.
 */
import { build as buildPlaceholder } from './placeholder/index.js';

const modules = import.meta.glob('./ch[0-9][0-9]/index.js');
const data = import.meta.glob('./ch[0-9][0-9]/ch[0-9][0-9].json', {
  eager: true,
  import: 'default',
});

export async function loadChannel(ch, listing) {
  const load = modules[`./ch${ch}/index.js`];
  if (!load) {
    return { build: buildPlaceholder, data: { ch, title: listing.title } };
  }
  const mod = await load();
  return { build: mod.build, data: data[`./ch${ch}/ch${ch}.json`] ?? {} };
}
