// La lumière qui suit l'heure (docs/CONCEPTION.md, « Le temps » ; src/world/daylight.ts), sans navigateur : le plein jour sans voile, la
// nuit sombre et bleue, l'aube et le crépuscule teintés, le soleil des rais éteint la nuit ; tout varie sans saut d'une minute à l'autre,
// minuit compris ; les moments du cadran.
// Usage : tsx tools/test-daylight.ts (lancé par npm run test:fast, donc par npm run build).

import assert from 'node:assert/strict';
import { lightAt, momentAt } from '../src/world/daylight';

const at = (h: number) => lightAt(h * 60);
assert.equal(at(13).alpha, 0, 'à 13 h, aucun voile');
assert.equal(at(13).sun, 1, 'à 13 h, plein soleil');
assert.ok(at(23).alpha > 0.4 && at(23).sun === 0, 'à 23 h, la nuit : un voile sombre, pas de soleil');
assert.ok((at(23).color & 0xff) > ((at(23).color >> 16) & 0xff), 'la nuit est bleue');
assert.ok(at(6.5).alpha > 0 && at(6.5).alpha < at(23).alpha && at(6.5).sun > 0, 'l’aube : un voile léger, un peu de soleil');
assert.ok(((at(20).color >> 16) & 0xff) > (at(20).color & 0xff), 'le crépuscule est orangé');
// sans saut : d'une minute à la suivante, toute la journée, minuit compris
for (let m = 0; m < 1440; m++) {
  const a = lightAt(m);
  const b = lightAt(m + 1);
  assert.ok(Math.abs(a.alpha - b.alpha) < 0.01 && Math.abs(a.sun - b.sun) < 0.02, `pas de saut à ${Math.floor(m / 60)} h ${m % 60}`);
}
assert.deepEqual([6, 13, 19.5, 23, 3].map((h) => momentAt(h * 60)), ['dawn', 'day', 'dusk', 'night', 'night'], 'les moments du cadran');
console.log('✓ lumière : le plein jour, la nuit bleue, l’aube et le crépuscule teintés, le soleil des rais, sans saut ; les moments du cadran');
