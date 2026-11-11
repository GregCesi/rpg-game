// Ne recalculer que ce qui change, sans navigateur (chantier « corrections », DIAGNOSTIC.md étape 3) : sur tous les plans du dépôt
// (src/content/plans/), les raccourcis donnent exactement ce que donnerait le calcul complet :
// - `SupportIndex` (les pièces rangées par leur dessus) trouve les mêmes porteurs que `supportsOf` pour chaque pièce, et `depthsOf`
//   donne les mêmes profondeurs avec ou sans lui ;
// - `swungIn` (une porte ou un volet qui tourne) donne les mêmes bâtiments que `buildingsOf` recalculé, pour chaque porte et chaque
//   volet de chaque plan, ouvert puis refermé ;
// - `jointiveSpans` : les planches de l'étage du coq sont jointives deux à deux, sauf la dernière de chaque rangée (DIAGNOSTIC.md 2.2).
// Le jeu, lui, est vérifié par le scénario test:recalcul (une porte ne refait pas toute la carte).
// Usage : npx tsx tools/test-recalcul-pur.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { props } from '../src/content';
import type { BuildPlan } from '../src/content/types';
import { depthsOf, planPieces, SupportIndex, supportsOf, swung, type BuildPiece } from '../src/world/build';
import { buildingsOf, swungIn } from '../src/world/interior';
import { jointiveSpans } from '../src/world/jointShade';

const dir = 'src/content/plans';
let checked = 0;
let swings = 0;
for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
  const plan = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as BuildPlan;
  const pieces: BuildPiece[] = planPieces(plan, { x: 0, y: 0, z: 0 }).map((p, i) => ({ ...p, id: i + 1 }));
  const index = new SupportIndex(pieces);
  for (const p of pieces) {
    const a = supportsOf(pieces, p).map((q) => q.id).sort((x, y) => x - y);
    const b = index.supportsOf(p).map((q) => q.id).sort((x, y) => x - y);
    assert.deepEqual(b, a, `${f} : les porteurs de la pièce ${p.id}`);
    checked++;
  }
  assert.deepEqual([...depthsOf(pieces, undefined, index)], [...depthsOf(pieces)], `${f} : les profondeurs avec l'index`);
  // chaque porte, chaque volet : tourné, puis tourné encore
  const before = buildingsOf(pieces);
  for (const p of pieces) {
    if (!('prop' in p.piece) || !props[p.piece.prop]?.swing) continue;
    let cur = pieces;
    let blds = before;
    for (let k = 0; k < 2; k++) {
      const q = cur.find((x) => x.id === p.id)!;
      const t = swung(q);
      if (!t) break;
      const next = { ...t, id: p.id };
      cur = cur.map((x) => (x.id === p.id ? next : x));
      blds = swungIn(blds, cur, next);
      assert.deepEqual(blds, buildingsOf(cur), `${f} : les bâtiments après que ${p.piece.prop} (${p.id}) a tourné ${k + 1} fois`);
      swings++;
    }
  }
  if (f === 'maison-coq.json') {
    const planks = pieces.filter((p) => 'wood' in p.piece && p.piece.wood.shape === 'plank');
    const joined = planks.filter((p) => jointiveSpans(p, pieces).length);
    // chaque rangée de planches de même x a une dernière planche au sud, sans voisine : les autres sont jointives
    const lasts = new Set(planks.map((p) => p.x)).size;
    assert.ok(joined.length >= planks.length - lasts * 2 && joined.length > planks.length / 2, `maison du coq : ${joined.length} planches jointives sur ${planks.length}`);
    console.log(`  · maison du coq : ${joined.length} planches sur ${planks.length} ont une voisine jointive au sud`);
  }
}
// deux bâtiments sur une même carte (la ferme du riche : la maison du coq et la grange, 2 m l'un de l'autre) : une porte de l'un
// ne recalcule que lui, et le résultat reste celui du calcul complet
{
  const read = (n: string) => JSON.parse(readFileSync(`${dir}/${n}`, 'utf8')) as BuildPlan;
  const coq = planPieces(read('maison-coq.json'), { x: 0, y: 0, z: 0 });
  const grange = planPieces(read('grange.json'), { x: 1640 + 200, y: 0, z: 0 });
  let cur: BuildPiece[] = [...coq, ...grange].map((p, i) => ({ ...p, id: i + 1 }));
  let blds = buildingsOf(cur);
  assert.ok(blds.length >= 2, `deux bâtiments (${blds.length})`);
  for (const p of cur.filter((q) => 'prop' in q.piece && props[q.piece.prop]?.swing?.passage)) {
    const t = swung(cur.find((x) => x.id === p.id)!)!;
    const next = { ...t, id: p.id };
    cur = cur.map((x) => (x.id === p.id ? next : x));
    blds = swungIn(blds, cur, next);
    assert.deepEqual(blds, buildingsOf(cur), `deux bâtiments : après que ${"prop" in p.piece ? p.piece.prop : "?"} (${p.id}) a tourné`);
    swings++;
  }
}
assert.ok(swings > 0, 'des portes et des volets dans les plans');
console.log(`✓ recalcul : ${checked} pièces, mêmes porteurs et mêmes profondeurs par l'index ; ${swings} portes et volets tournés, mêmes bâtiments que le calcul complet`);
