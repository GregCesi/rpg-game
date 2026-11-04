// Les toits vus du dehors (src/world/roofView.ts ; retouche de Grégoire, CONCEPTION « La maison de Xéros »), sans navigateur, sur le
// plan de la maison de Xéros (src/content/plans/maison-xeros.json) :
// - dehors, le toit de la maison ne s'efface pas, même sous l'avant-toit : on n'est dedans que dans son intérieur ;
// - devant une fenêtre au volet ouvert, dehors, la pièce de cette fenêtre seule devient transparente (le toit au-dessus d'elle, ce qui
//   passe en hauteur, son mur sud), sauf le conduit et sa souche (chantier « maison-2 ») ; pas devant un volet fermé, ni de loin ;
// - le toit d'un abri ouvert s'efface quand Xéros est dessous, plus quand il approche ; tout le toit, ses pans qui se touchent (forge).
// Usage : npx tsx tools/test-roofs.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUILD, ROOF } from '../src/config';
import type { BuildPlan } from '../src/content/types';
import { boxOf, planPieces, type BuildPiece } from '../src/world/build';
import { buildingsOf } from '../src/world/interior';
import { lightCovers, lightShown, roofView, windowHole } from '../src/world/roofView';

const plan = JSON.parse(readFileSync('src/content/plans/maison-xeros.json', 'utf8')) as BuildPlan;
const pieces: BuildPiece[] = planPieces(plan, { x: 0, y: 0, z: 0 }).map((p, i) => ({ ...p, id: i + 1 }));
const isProp = (p: BuildPiece, k: RegExp) => 'prop' in p.piece && k.test(p.piece.prop);
const roofIds = pieces.filter((p) => isProp(p, /^(thatch-roof|earth-ridge)/)).map((p) => p.id);
assert.ok(roofIds.length >= 3, 'la maison a ses pans de chaume et son faîtage');

let houses = buildingsOf(pieces);
assert.equal(houses.length, 1, "un bâtiment où l'on entre");
const house = houses[0];
const r = house.room;

// 1. sous l'avant-toit du sud, dehors, et au milieu du mur : le toit reste
for (const [fx, fy, where] of [
  [r.x + r.w / 2, r.y + r.d + 40, "sous l'avant-toit du sud"],
  [r.x + 200, r.y - 30, 'contre le mur nord'],
] as const) {
  const v = roofView(pieces, houses, fx, fy);
  assert.deepEqual([...v.faded], [], `${where} : le toit de la maison ne s'efface pas`);
  assert.equal(v.reveal, undefined, `${where} : rien ne se découvre (volets fermés)`);
}

// 2. un volet du sud ouvert : devant sa fenêtre, dehors, on voit dedans : la pièce de cette fenêtre seule devient transparente
// (Grégoire, chantier « maison-2 »)
const south = house.windows.filter((w) => w.side === 'south');
assert.ok(south.length >= 2, 'des fenêtres au sud');
const win = south[0];
const opened = pieces.map((p) => (p.id === win.id ? { ...p, piece: { prop: 'plank-shutter-open' } } : p));
houses = buildingsOf(opened);
const mid = (win.span[0] + win.span[1]) / 2;
const front = roofView(opened, houses, mid, r.y + r.d + ROOF.wall + 60);
assert.ok(front.reveal, 'devant la fenêtre ouverte, on voit la pièce');
const room = front.reveal!.room;
assert.ok(mid >= room.x && mid <= room.x + room.w && room.y + room.d >= r.y + r.d - 2 * ROOF.wall, `la pièce de cette fenêtre, au sud (${JSON.stringify(room)})`);
assert.ok(room.w < r.w, 'une pièce de la maison, pas toute la maison');
// les pans de chaume : transparents dans le trou de la pièce seulement (ils couvrent toute la maison : découpés à l'écran)
assert.ok(front.reveal!.roofs.length >= 1 && front.reveal!.roofs.every((id) => roofIds.includes(id)), 'les pans au-dessus de la pièce se découpent');
for (const id of roofIds) assert.ok(!front.faded.has(id), 'aucun pan entier ne pâlit : le toit hors de la pièce reste opaque');
const hole = windowHole(room);
assert.deepEqual([hole.x * 5, hole.w * 5], [room.x, room.w], 'le trou a la largeur de la pièce');
const boxOfP = (p: BuildPiece) => boxOf(p);
const inRoomX = (p: BuildPiece) => boxOfP(p).x < room.x + room.w && boxOfP(p).x + boxOfP(p).w > room.x;
const facade = opened.filter((p) => !roofIds.includes(p.id) && boxOfP(p).y >= r.y + r.d - 5 && boxOfP(p).z >= 40 && boxOfP(p).z < 250);
assert.ok(facade.filter(inRoomX).length >= 3 && facade.filter(inRoomX).every((p) => front.faded.has(p.id)), 'le mur sud de la pièce devient transparent');
const farX = (p: BuildPiece) => boxOfP(p).x >= room.x + room.w + ROOF.wall || boxOfP(p).x + boxOfP(p).w <= room.x - ROOF.wall;
assert.ok(facade.filter(farX).length > 0 && facade.filter(farX).every((p) => !front.faded.has(p.id)), 'le mur sud des autres pièces reste');
const flue = opened.filter((p) => isProp(p, /^chimney-(flue|cap)$/));
assert.ok(flue.length && flue.every((p) => !front.faded.has(p.id)), 'le conduit et sa souche restent opaques');
const north = opened.filter((p) => !roofIds.includes(p.id) && boxOfP(p).y + boxOfP(p).d <= r.y && boxOfP(p).z < 180);
assert.ok(north.length && north.every((p) => !front.faded.has(p.id)), 'le mur du fond reste : on voit la pièce');
// de loin, ou devant une autre fenêtre (fermée) : rien
assert.equal(roofView(opened, houses, mid, r.y + r.d + ROOF.wall + ROOF.window.front + 50).reveal, undefined, 'de loin : rien');
const other = south[1];
assert.equal(roofView(opened, houses, (other.span[0] + other.span[1]) / 2, r.y + r.d + ROOF.wall + 60).reveal, undefined, 'devant un volet fermé : rien');

// 3. un abri ouvert (un pan de toit de planches seul, en hauteur, sans murs) : il s'efface quand Xéros est dessous, pas à côté
const shed = { id: 999, piece: { prop: 'plank-roof' }, x: 5000, y: 5000, z: BUILD.head + 20 } as BuildPiece;
const alone = [shed];
assert.deepEqual([...roofView(alone, [], 5020, 5020).faded], [999], "sous l'abri : son toit s'efface");
assert.deepEqual([...roofView(alone, [], 4990, 5020).faded], [], "à côté de l'abri : il ne s'efface plus quand Xéros approche");
// un abri ouvert à deux pans (l'atelier de la forge, src/content/plans/forge.json) : sous le pan nord, devant le feu, le pan sud s'efface
// aussi (il cacherait Xéros et la forge) ; dans la rue, rien ne s'efface (chantier « forge »)
const forgePlan = JSON.parse(readFileSync('src/content/plans/forge.json', 'utf8')) as BuildPlan;
const forge: BuildPiece[] = planPieces(forgePlan, { x: 0, y: 0, z: 0 }).map((p, i) => ({ ...p, id: i + 1 }));
assert.deepEqual(buildingsOf(forge), [], "l'atelier de la forge est un abri ouvert, pas un bâtiment où l'on entre");
const pans = forge.filter((p) => isProp(p, /^shingle-roof-large/));
assert.equal(pans.length, 2, "l'atelier a ses deux pans de bardeaux");
const northPan = pans.reduce((a, b) => (boxOf(a).y < boxOf(b).y ? a : b));
const nb = boxOf(northPan);
const under = roofView(forge, [], nb.x + nb.w / 4, nb.y + nb.d - 40);
for (const p of pans) assert.ok(under.faded.has(p.id), `sous le pan nord, les deux pans s'effacent (${p.id})`);
const shedPan = forge.find((p) => isProp(p, /^shingle-shed-roof$/));
assert.ok(shedPan && !under.faded.has(shedPan.id), "le toit de l'abri à charbon, à part, reste");
const street = roofView(forge, [], nb.x + nb.w / 4, Math.max(...pans.map((p) => boxOf(p).y + boxOf(p).d)) + 200);
assert.deepEqual([...street.faded], [], 'dans la rue, le toit de la forge reste');

// ce qui est caché ne se voit pas, lumière comprise (chantier « correctifs ») : l'âtre est sous le chaume ; sa lueur est cachée tant
// que le toit est opaque, entière quand il est effacé
const hearth = pieces.find((p) => isProp(p, /^stone-hearth$/));
assert.ok(hearth, "la maison a son âtre");
const covers = lightCovers(pieces);
assert.ok((covers.get(hearth.id) ?? []).some((id) => roofIds.includes(id)), "l'âtre est sous un pan de chaume");
assert.equal(lightShown([1]), 0, 'sous le toit opaque, la lueur est cachée');
assert.equal(lightShown([1, ROOF.alpha]), 0, 'le plus opaque des toits l’emporte');
assert.equal(lightShown([ROOF.alpha]), 1, 'le toit effacé : la lueur se voit');
assert.equal(lightShown([]), 1, 'sans toit, la lueur se voit');
assert.ok(lightShown([(1 + ROOF.alpha) / 2]) > 0 && lightShown([(1 + ROOF.alpha) / 2]) < 1, 'pendant le fondu du toit, la lueur revient peu à peu');

console.log("✓ toits : la maison garde son toit dehors ; devant une fenêtre ouverte, sa pièce seule transparente (les pans découpés au-dessus d'elle), pas le conduit ; l'abri ouvert s'efface dessous ; la lueur de l'âtre cachée sous le toit");
