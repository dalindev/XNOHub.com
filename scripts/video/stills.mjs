// Stills from the trailer's shots: the poster, the social card and the README's
// images. Each is a shot from shots.mjs run to `at` seconds and captured as a
// PNG, with its caption swapped for `caption` (or none).
//   node scripts/video/record.mjs --stills            # all, into video/out/stills
//   node scripts/video/record.mjs --stills --shots poster
import { shots } from './shots.mjs';

const still = (name, from, at, caption = null) => {
  const s = shots.find((x) => x.name === from);
  const text = caption ? `__film.caption(${JSON.stringify(caption[0])}, ${JSON.stringify(caption[1])}, 1);` : `__film.caption('', '', 0);`;
  return { name, setup: s.setup, hold: s.hold, at, frame: `(t) => { (${s.frame})(t); __film.black(0); ${text} }` };
};

export const stills = [
  // The poster: one block's votes in flight over the Atlantic, Europe's lights on.
  still('poster', 'votes', 1.7, ['<span class="xno">ӾNO</span>Hub', 'the Nano network, live']),
  still('votes', 'votes', 1.7),
  still('sunrise', 'sunrise', 3.2),
  still('starlink', 'starlink', 2),
  still('liftoff', 'liftoff', 1.6),
  still('release', 'release', 2.6)
];
