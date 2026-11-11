// L'étage (chantier « maison du coq », CONCEPTION « L'étage »), sans navigateur ni dessin : une maison d'essai à deux niveaux, faite de
// pièces d'essai ajoutées au catalogue le temps du test (murs, plancher, marches pleines, lit, table), et ce que le moteur en tire :
// - les dessus qui se marchent (world/decks.ts) : sous le plancher on reste en bas ; on monte l'escalier marche par marche ; une
//   marche vue de côté barre le passage ; le bord de la trémie est refusé (« pour lui ») ; on saute de côté depuis une marche basse ;
//   qui grimpe tout (?dieu « escalade ») ne passe pas pour autant à travers le plancher au-dessus de lui ;
// - le niveau change sur la 8ᵉ marche, au même pas de physique quel que soit le nombre de pas par image (1, 3 ou 8) ;
// - les niveaux du bâtiment (0 et 285), les pièces trouvées à chacun, ce que chaque niveau montre, la coupe de chacun, la trémie ;
// - les corps par tranche : le lit de l'étage ne barre pas la salle, la table pas l'étage, le mur les deux ;
// - les cinq plans d'avant (des maisons d'un seul niveau) n'ont pas d'étage ;
// - la planche couchée se marche et n'a pas de corps.
// Usage : npx tsx tools/test-etage-moteur.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mobility, props } from '../src/content';
import type { BuildPlan, Mobility } from '../src/content/types';
import { blocks, boxOf, planPieces, sliceHits, sliceOf, type BuildPiece } from '../src/world/build';
import { deckField, deckStep, footAt, settleAt, storeyHeights, storeyOf } from '../src/world/decks';
import { buildingsOf, storeyIndex } from '../src/world/interior';
import { interiorOf } from '../src/world/interiorMap';
import { refusalText } from '../src/world/relief';

// --- les pièces d'essai (jamais au contenu) ---
const defs = props as Record<string, unknown>;
function prop(key: string, w: number, d: number, h: number, extra: Record<string, unknown> = {}): string {
  defs[key] = { name: key, family: 'éléments', image: 'barrel', views: 'round', dims: { w, d, h, shape: 'box' }, body: { w: Math.max(1, w / 5), h: Math.max(1, d / 5), bottom: 0 }, ...extra };
  return key;
}
let id = 0;
const pieces: BuildPiece[] = [];
const put = (key: string, x: number, y: number, z: number, view = 0) => pieces.push({ id: ++id, piece: { prop: key }, x, y, z, view });

// la maison : dedans x 0-1000, y 0-600 ; murs de 40 ; rez-de-chaussée 0-270, l'assise du cordon 270-290, étage 290-530
for (const [z, h] of [
  [0, 270],
  [270, 20],
  [290, 240],
] as const) {
  put(prop(`essai-mur-n-${z}`, 1080, 40, h), -40, -40, z);
  put(prop(`essai-mur-o-${z}`, 40, 600, h), -40, 0, z);
  put(prop(`essai-mur-e-${z}`, 40, 600, h), 1000, 0, z);
  if (z === 0) {
    // le mur sud a sa porte (x 460-560), sous un linteau
    put(prop('essai-mur-s1', 500, 40, h), -40, 600, z);
    put(prop('essai-mur-s2', 480, 40, h), 560, 600, z);
    put(prop('essai-linteau', 100, 40, 70), 460, 600, 200);
    put('plank-door', 460, 617, 0);
  } else put(prop(`essai-mur-s-${z}`, 1080, 40, h), -40, 600, z);
}
// le plancher (282-285), sauf la trémie x 680-780, y 150-430
const floor = (key: string, x: number, y: number, w: number, d: number) => put(prop(key, w, d, 3, { walk: true, body: undefined }), x, y, 282);
floor('essai-plancher-a', 0, 0, 680, 600);
floor('essai-plancher-b', 780, 0, 220, 600);
floor('essai-plancher-c', 680, 0, 100, 150);
floor('essai-plancher-d', 680, 430, 100, 170);
// l'escalier : 14 marches pleines de 19 cm, giron de 26 cm, qui montent vers le nord (la 1ʳᵉ à y 488-514, la 14ᵉ à y 150-176)
for (let i = 1; i <= 14; i++) put(prop(`essai-marche-${i}`, 100, 26, 19 * i, { walk: true, body: undefined }), 680, 514 - 26 * i, 0);
// la cloison de l'étage, nord-sud, x 400-440, et sa porte (y 250-350)
put(prop('essai-cloison-1', 40, 250, 240), 400, 0, 285);
put(prop('essai-cloison-2', 40, 250, 240), 400, 350, 285);
put('plank-door', 417, 250, 285, 1);
// un lit à l'étage, une table en bas
put(prop('essai-lit', 200, 200, 60), 100, 100, 285);
put(prop('essai-table', 200, 100, 75), 100, 400, 0);

const f = deckField(pieces);
const mob: Mobility = { ...mobility };
const flat = () => 0;

// 1. les dessus
assert.equal(footAt(f, 0, 900, 300, 0, mob).z, 0, 'sous le plancher, il reste en bas');
assert.equal(footAt(f, 0, 900, 300, 285, mob).z, 285, 'sur le plancher, il reste en haut');
assert.equal(footAt(f, 0, 730, 501, 0, mob).z, 19, 'sur la 1re marche, il monte de 19 cm');
const climber: Mobility = { ...mob, step: Infinity, drop: Infinity, slope: Infinity };
assert.equal(footAt(f, 0, 900, 300, 0, climber).z, 0, 'qui grimpe tout ne passe pas à travers le plancher au-dessus de lui');
const side = deckStep(f, flat, { x: 640, y: 400 }, { x: 700, y: 400 }, 0, mob);
assert.equal(side.refused?.why, 'up', 'une marche vue de côté barre le passage');
assert.equal(side.refused?.height, 95, 'la 5e marche, 95 cm');
const edge = deckStep(f, flat, { x: 650, y: 300 }, { x: 700, y: 300 }, 285, mob);
assert.equal(edge.refused?.why, 'down', 'le bord de la trémie est refusé');
assert.match(refusalText(edge.refused!), /pour lui/, 'le refus dit ce qui lui manque');
const jump = deckStep(f, flat, { x: 690, y: 420 }, { x: 640, y: 420 }, 76, mob);
assert.ok(!jump.refused && jump.z === 0, 'de la 4e marche (76 cm), il saute de côté');
assert.equal(settleAt(f, 0, 900, 300, 285), 285, 'rechargé en haut, il est en haut');
assert.equal(settleAt(f, 0, 900, 300), 0, 'sans hauteur gardée, le sol le plus bas');

// 2. monter l'escalier, à 1, 3 et 8 pas de physique par image : le niveau change au même pas, sur la 8e marche
const levels = storeyHeights(f.decks, 40000, mob.step);
assert.deepEqual(levels, [0, 285], "deux niveaux : 0 et 285 (les marches n'en sont pas)");
assert.equal(storeyOf(levels, 133), 0, 'sur la 7e marche (133 cm) : encore le rez-de-chaussée');
assert.equal(storeyOf(levels, 152), 1, "sur la 8e marche (152 cm) : l'étage");
const climbs = [1, 3, 8].map((perFrame) => {
  let z = 0;
  let at = { x: 730, y: 580 };
  let changedAt: number | undefined;
  let n = 0;
  while (at.y > 80) {
    for (let k = 0; k < perFrame && at.y > 80; k++) {
      const to = { x: at.x, y: at.y - 7.5 };
      const r = deckStep(f, flat, at, to, z, mob);
      assert.ok(!r.refused, `le pas à y ${to.y} passe (z ${z})`);
      z = r.z;
      at = to;
      n++;
      if (changedAt === undefined && storeyOf(levels, z) === 1) changedAt = n;
    }
  }
  return { z, changedAt };
});
for (const c of climbs) assert.equal(c.z, 285, 'arrivé en haut');
assert.ok(climbs.every((c) => c.changedAt !== undefined && c.changedAt === climbs[0].changedAt), 'le niveau change au même pas de physique, quelle que soit la machine');

// 3. le bâtiment, ses niveaux, ses pièces
const houses = buildingsOf(pieces);
assert.equal(houses.length, 1, "un seul bâtiment où l'on entre");
const h = houses[0];
assert.ok(h.storeys && h.storeys.length === 2, 'deux niveaux');
const [down, up] = h.storeys!;
assert.equal(down.rooms.length, 1, 'en bas, une pièce');
assert.equal(up.rooms.length, 2, 'en haut, deux pièces (la cloison)');
const has = (list: readonly BuildPiece[], key: string) => list.some((p) => 'prop' in p.piece && p.piece.prop === key);
assert.ok(has(down.shell, 'essai-table') && !has(down.shell, 'essai-lit'), 'en bas : la table, pas le lit');
assert.ok(has(down.shell, 'essai-mur-n-0') && !has(down.shell, 'essai-mur-n-290'), "en bas : le mur du rez-de-chaussée, pas celui de l'étage");
assert.ok(!has(down.shell, 'essai-plancher-a'), 'en bas : le plancher au-dessus de la tête est caché');
assert.ok(has(up.shell, 'essai-lit') && !has(up.shell, 'essai-table'), 'en haut : le lit, pas la table');
assert.ok(has(up.shell, 'essai-plancher-a') && has(up.shell, 'essai-mur-n-290'), "en haut : le plancher et le mur de l'étage");
assert.ok(!has(up.shell, 'essai-mur-n-0'), 'en haut : pas le mur du rez-de-chaussée');
assert.ok(down.south.length > 0 && up.south.length > 0, 'chaque niveau a la coupe de son mur sud');
const hole = up.holes.reduce((a, r) => a + r.w * r.d, 0);
assert.equal(hole, 100 * 280, 'la trémie : 1 m × 2,80 m');
assert.equal(storeyIndex(h, 140), 0);
assert.equal(storeyIndex(h, 152), 1);

// 4. l'intérieur calculé garde ses deux niveaux, dans son repère
const it = interiorOf('essai', h, [], { floor: [1], void: 0 });
assert.equal(it.storeys?.length, 2, "l'intérieur a ses deux niveaux");
assert.equal(new Set(it.shell.map((p) => p.id)).size, it.shell.length, "chaque pièce n'est posée qu'une fois");
assert.ok(has(it.shell, 'essai-lit') && has(it.shell, 'essai-table'), 'les deux niveaux sont posés');
assert.equal(it.exits.length, 1, 'on ressort par la porte du rez-de-chaussée');
// l'escalier de pierre de la maison du coq, ses marches posées à leur hauteur (jusqu'à 247 cm, plus haut que la tête) : toutes dans
// l'intérieur, jamais prises pour ce qui passe au-dessus de la pièce (on y monte)
{
  const coq = JSON.parse(readFileSync('src/content/plans/maison-coq.json', 'utf8')) as BuildPlan;
  const all = planPieces(coq, { x: 0, y: 0, z: 0 }).map((p, k) => ({ ...p, id: 10000 + k }));
  const house = buildingsOf(all).find((b) => b.storeys?.length === 2)!;
  const inside = interiorOf('essai-coq', house, [], { floor: [1], void: 0 });
  const steps = (list: readonly BuildPiece[]) => list.filter((p) => 'prop' in p.piece && p.piece.prop === 'stone-step').length;
  assert.equal(steps(all), 14, 'la maison du coq a 14 marches');
  assert.equal(steps(inside.shell), 14, "les 14 marches sont dans l'intérieur (les hautes comprises)");
  // le seuil de la porte du palier (l'assise du cordon dans le refend est, 240-260, de y 130 à 420) : sous le plancher de l'étage, à
  // un pas de lui, il est dans l'intérieur (l'étage le prend)
  const sill = (list: readonly BuildPiece[]) => list.some((p) => 'prop' in p.piece && p.piece.prop === 'string-course-wall-40' && p.z === 240 && p.view % 2 === 1);
  assert.ok(sill(all), 'le plan a ses seuils de cordon dans les refends');
  assert.ok(sill(house.storeys![1].shell), "l'étage prend le seuil de la porte du palier");
}

// 5. les corps par tranche
const piece = (key: string) => pieces.find((p) => 'prop' in p.piece && p.piece.prop === key)!;
assert.ok(!sliceHits(sliceOf(piece('essai-lit')), 0), "le lit de l'étage ne barre pas la salle");
assert.ok(sliceHits(sliceOf(piece('essai-lit')), 285), "le lit barre l'étage");
assert.ok(!sliceHits(sliceOf(piece('essai-table')), 285), "la table ne barre pas l'étage");
assert.ok(sliceHits(sliceOf(piece('essai-mur-n-0')), 0) && sliceHits(sliceOf(piece('essai-mur-n-290')), 285), 'le mur, chacun à son niveau');
assert.ok(!blocks(piece('essai-marche-3')) && !blocks(piece('essai-plancher-a')), "les dessus qui se marchent n'ont pas de corps");

// 6. la planche couchée se marche ; les maisons d'avant n'ont pas d'étage
const plank: BuildPiece = { id: 999, piece: { wood: { size: 'big', length: 400, shape: 'plank', axis: 'ew' } }, x: 0, y: 0, z: 0, view: 0 };
assert.equal(deckField([plank]).decks.length, 1, 'la planche couchée se marche');
assert.ok(!blocks(plank), "la planche couchée n'a pas de corps");
assert.equal(deckField([plank]).decks[0].top, boxOf(plank).h, 'son dessus est le haut de sa boîte');
for (const n of ['cabane', 'etal', 'forge', 'grange', 'maison-xeros']) {
  const plan = JSON.parse(readFileSync(`src/content/plans/${n}.json`, 'utf8')) as BuildPlan;
  const ps = planPieces(plan, { x: 0, y: 0, z: 0 }).map((p, i) => ({ ...p, id: i + 1 }));
  for (const b of buildingsOf(ps)) assert.equal(b.storeys, undefined, `${n} : un seul niveau`);
}

console.log("test-etage-moteur : les dessus, l'escalier, les niveaux, les pièces par niveau, les tranches : tout passe");
