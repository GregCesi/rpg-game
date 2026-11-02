// Le fagot selon son nombre de branches (Grégoire : le monde ne limite pas ; un fagot se noue à partir de 2 branches, sa taille, sa
// masse et son dessin suivent le nombre de branches ; la quête en demandera 10, ce n'est pas une règle du fagot). Sans le jeu : le
// genre du tas de fagots, ses images par nombre de branches (dessinées : faggot-n<n>, et -ns), la masse, l'identité dans un tas.
// Usage : npx tsx tools/test-fagot.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { piles, props } from '../src/content';
import { propMass } from '../src/content/mass';
import { bundleOfKind, pileDefOf, sameKind, stateImage } from '../src/world/pileShape';
import { pileOf } from '../src/world/offer';

const manifest = JSON.parse(readFileSync('src/generated/manifest.json', 'utf8')) as { spritesheets: { key: string; animations: Record<string, unknown> }[]; images: { key: string }[] };
const anims = new Map(manifest.spritesheets.map((s) => [s.key, new Set(Object.keys(s.animations))]));
const drawn = new Set([...manifest.spritesheets, ...manifest.images].map((a) => a.key));

const genre = Object.keys(piles).find((g) => {
  const p = piles[g].piece;
  return 'prop' in p && Object.values(piles).some((b) => b.tie?.into === p.prop);
})!;
assert.ok(genre, 'un tas de fagots (sa pièce est ce que noue un tas de branches)');
const full = bundleOfKind({ pile: genre })!;
assert.ok(full >= 2, `un fagot plein : ${full} branches`);

for (let n = 2; n <= 12; n++) {
  const def = pileDefOf({ pile: genre, bundle: n });
  const images = [...Object.values(def.places), ...Object.values(def.turned?.places ?? {})].map((p) => p.image);
  for (const img of new Set(images)) assert.ok(drawn.has(img), `fagot de ${n} branches : image '${img}' dessinée`);
}
const kg = (n?: number) => propMass('faggot', undefined, undefined, undefined, undefined, n);
assert.ok(kg(2) < kg(4) && kg(4) < kg(10) && kg(10) < kg(12), `la masse suit le nombre de branches (${kg(2).toFixed(1)}, ${kg(4).toFixed(1)}, ${kg(10).toFixed(1)}, ${kg(12).toFixed(1)} kg)`);
assert.equal(kg(), kg(full), 'sans nombre : le fagot plein');
assert.ok(!sameKind({ pile: genre, bundle: 4 }, { pile: genre, bundle: 7 }), 'un fagot de 4 ne va pas sur un tas de fagots de 7');
assert.ok(sameKind({ pile: genre }, { pile: genre, bundle: full }), 'le fagot plein, nommé ou non, est le même');
assert.deepEqual(pileOf({ prop: 'faggot', bundle: 4 }), { pile: genre, bundle: 4 }, 'le fagot tenu offre son nombre de branches au tas');
// toutes ses vues suivent son nombre de branches, au sol comme en main (contrat de l'objet portable) : l'image que le jeu choisit
// (stateImage : le sol, le fantôme, Xéros qui le porte, la case de main) est dessinée, pour chaque nombre et pour le fagot plein
const fagot = (piles[Object.keys(piles).find((g) => piles[g].tie)!].tie!.into)!;
const take = props[fagot].take!;
for (const n of [...Array.from({ length: 11 }, (_, i) => i + 2), undefined]) {
  const what = n ? `fagot de ${n}` : 'fagot plein';
  const ground = stateImage(props[fagot].image, fagot, n);
  assert.ok(drawn.has(ground), `${what} : au sol, '${ground}' dessinée`);
  assert.notEqual(ground, props[fagot].image, `${what} : au sol, le dessin de son nombre, pas celui du catalogue`);
  const sheet = stateImage(take.hold.image!, fagot, n);
  for (const dir of ['down', 'up', 'right']) assert.ok(anims.get(sheet)?.has(dir), `${what} : porté, '${sheet}' (${dir}) dessinée`);
  if (n) assert.equal(sheet, `${take.hold.image}-n${n}`, `${what} : porté, le dessin de ${n} branches`);
  const icon = stateImage(take.icon, fagot, n);
  assert.ok(drawn.has(icon), `${what} : icône '${icon}' dessinée`);
  if (n) assert.equal(icon, `${take.icon}-n${n}`, `${what} : l'icône de ${n} branches`);
}
console.log(`✓ fagot : de 2 à 12 branches, ses images au sol, portées et en icône, sa masse (${kg(2).toFixed(1)} à ${kg(12).toFixed(1)} kg), un tas par nombre de branches`);
