// La petite carte (src/world/minimap.ts, docs/CONCEPTION.md « La petite carte »), sans navigateur : les couleurs tirées des dessins,
// la grille du monde sans couture, un arbre abattu qui perd son point, un bâtiment posé qui prend la couleur de son toit, le hors-monde,
// la fenêtre centrée sur la case de Xéros à chaque cran, et les images du cadre et du point pour chaque cran de MINIMAP.
// Usage : tsx tools/test-minimap.ts (lancé par npm run test:fast, donc par npm run build ; après npm run art et npm run maps).

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { MINIMAP, START, TILE, ZOOM } from '../src/config';
import { maps, props } from '../src/content';
import { buildPlans as readPlans } from './lib/build-plans';
import { CM_PER_PX } from '../src/content/gabarit';
import type { MapData } from '../src/content/types';
import colors from '../src/generated/minimap.json';
import { world as worldPalette } from '../art/palette';
import { mapState, newGame } from '../src/state/GameState';
import { boxOf, planPieces } from '../src/world/build';
import { CM_PER_CELL, drawWindow, emptyGrid, nextStep, packColor, paintZone, pieceColor, tileColor, treeFeet, worldCell, zoneCorner, zonesAround, ZONES, TREE_COLOR } from '../src/world/minimap';

const buildPlans = readPlans();
const palette = new Set(Object.values(worldPalette as Record<string, string>).map((h) => h.toLowerCase()));

// 1. les couleurs : chaque tuile a la sienne, prise dans la palette du monde ; les images aussi
colors.tiles.forEach((c, n) => {
  assert.ok(c, `la tuile ${n} a une couleur`);
  assert.ok(palette.has(c.toLowerCase()), `la couleur de la tuile ${n} (${c}) est dans la palette`);
});
for (const [k, c] of Object.entries(colors.images as Record<string, string>)) assert.ok(palette.has(c.toLowerCase()), `la couleur de l'image ${k} (${c}) est dans la palette`);

// 2. la grille du monde entière, depuis les cartes et une partie neuve
const game = newGame();
const t0 = performance.now();
const grid = emptyGrid();
for (const m of ZONES) paintZone(grid, m, game.maps[m.id], buildPlans);
const tGrid = performance.now() - t0;
assert.ok(ZONES.length > 1, 'plusieurs zones dans le monde');

// le sol de chaque zone est à sa place dans le monde : aucune couture (ses coins et son milieu sont peints)
for (const m of ZONES) {
  const c = zoneCorner(m);
  for (const [i, j] of [[0, 0], [m.width - 1, 0], [0, m.height - 1], [m.width - 1, m.height - 1], [m.width >> 1, m.height >> 1]]) {
    if (m.layers.ground[j * m.width + i] >= 0) assert.notEqual(grid.get(c.x + i, c.y + j), 0, `${m.id} (${i}, ${j}) : peinte à sa place dans le monde`);
  }
}
// repeindre une zone ne touche pas à ses voisines
const ferme = maps[START.map] as MapData;
const before = Uint32Array.from(grid.cells);
paintZone(grid, ferme, game.maps[ferme.id], buildPlans);
assert.deepEqual(grid.cells, before, 'repeindre une zone inchangée ne change rien, ni chez elle ni chez ses voisines');

// la fenêtre à cheval sur deux zones lit la grille du monde : la case de part et d'autre du bord est celle de chaque zone
const fc = zoneCorner(ferme);
const neighbour = ZONES.find((m) => m !== ferme && zoneCorner(m).y <= fc.y && zoneCorner(m).y + m.height > fc.y && zoneCorner(m).x + m.width === fc.x);
if (neighbour) {
  const y = fc.y + 10;
  const size = 8;
  const out = new Uint32Array(size * size);
  drawWindow(grid, fc.x, y, size, 2, 1, out);
  // les deux colonnes de pixels juste à gauche du centre sont la case fc.x − 1 (la voisine), celles du centre la case fc.x (la ferme)
  assert.equal(out[4 * size + 2], grid.get(fc.x - 1, y) || 1, 'la case de la voisine, à gauche du bord');
  assert.equal(out[4 * size + 4], grid.get(fc.x, y) || 1, 'la case de la ferme, au centre');
}

// 3. la fenêtre est centrée sur la case de Xéros, à chaque cran
for (const { px, inner } of MINIMAP.steps) {
  assert.equal(inner % 2, 1, `le diamètre ${inner} est impair (le point au pixel du milieu)`);
  const size = inner * ZOOM;
  const out = new Uint32Array(size * size);
  const cx = fc.x + 40;
  const cy = fc.y + 40;
  drawWindow(grid, cx, cy, size, px, 1, out);
  const c = size / 2;
  // les px × px pixels du milieu (pour px = 1, le pixel juste après le milieu) montrent la case de Xéros
  const from = px === 1 ? c : c - px / 2;
  for (let v = from; v < from + px; v++) for (let u = from; u < from + px; u++) assert.equal(out[v * size + u], grid.get(cx, cy), `cran ${px} px : le centre est la case de Xéros`);
  assert.equal(out[0], 0, 'le coin est hors du disque');
  // les images du cran : son cadre (inner + 2 × bord), et les quatre points
  const frame = `src/generated/ui-minimap-frame-${inner}.png`;
  assert.ok(existsSync(frame), `le cadre ${frame}`);
  const fw = PNG.sync.read(readFileSync(frame)).width;
  assert.ok(fw > inner && (fw - inner) % 2 === 0, `le cadre de ${inner} a un bord égal des deux côtés`);
}
for (const f of ['down', 'up', 'left', 'right']) {
  const dot = PNG.sync.read(readFileSync(`src/generated/ui-minimap-dot-${f}.png`));
  assert.ok(dot.width === dot.height && dot.width % 2 === 1, `le point ${f} est un carré impair, centré sur la case`);
}
// un clic passe au cran suivant, puis revient au premier
assert.deepEqual(MINIMAP.steps.map((_, k) => nextStep(k, MINIMAP.steps.length)), [...MINIMAP.steps.keys()].map((k) => (k + 1) % MINIMAP.steps.length));
assert.ok(MINIMAP.start >= 0 && MINIMAP.start < MINIMAP.steps.length, 'le cran de départ existe');

// 4. au-delà du bord du monde : l'aplat sombre
{
  const size = 20;
  const out = new Uint32Array(size * size);
  const outside = packColor(MINIMAP.outside);
  drawWindow(grid, -30, -30, size, 2, outside, out);
  assert.equal(out[10 * size + 10], outside, "hors du monde, l'aplat de MINIMAP.outside");
}

// 5. un arbre abattu perd son point : l'arbre disparu (changes), sa case reprend son sol
const treeZone = ZONES.find((m) => m.objects.some((o) => !o.inside && props[o.type]?.tree))!;
const tree = treeZone.objects.find((o) => !o.inside && props[o.type]?.tree)!;
{
  const g = emptyGrid();
  const s = newGame();
  const ms = mapState(s, treeZone.id);
  paintZone(g, treeZone, ms, buildPlans);
  const foot = treeFeet(treeZone, ms)[treeZone.objects.filter((o) => !o.inside && props[o.type]?.tree).indexOf(tree)];
  const cell = worldCell(treeZone, foot.x, foot.y);
  assert.equal(g.get(cell.x, cell.y), TREE_COLOR, `l'arbre ${tree.type} de ${treeZone.id} est un point vert sombre`);
  ms.changes[String(tree.id)] = { x: tree.x, y: tree.y };
  paintZone(g, treeZone, ms, buildPlans);
  const others = treeFeet(treeZone, ms).some((f) => worldCell(treeZone, f.x, f.y).x === cell.x && worldCell(treeZone, f.x, f.y).y === cell.y);
  if (!others) assert.notEqual(g.get(cell.x, cell.y), TREE_COLOR, "l'arbre disparu n'a plus de point");
}

// 6. un bâtiment posé prend la couleur de sa pièce la plus haute (le toit), à partir de son plan comme de la partie
const planZone = ZONES.find((m) => m.plans.some((p) => buildPlans[p.plan]))!;
assert.ok(planZone, 'une zone avec un plan posé');
{
  const pl = planZone.plans.find((p) => buildPlans[p.plan])!;
  const pieces = planPieces({ ...buildPlans[pl.plan], ...(pl.age ? { age: pl.age } : {}) }, { x: Math.round(pl.x * CM_PER_PX), y: Math.round(pl.y * CM_PER_PX), z: 0 });
  const top = (p: (typeof pieces)[number]) => boxOf(p).z + boxOf(p).h;
  const highest = pieces.filter((p) => pieceColor(p)).sort((a, b) => top(b) - top(a))[0];
  const b = boxOf(highest);
  const i = Math.floor((b.x + b.w / 2) / CM_PER_CELL);
  const j = Math.floor((b.y + b.d / 2) / CM_PER_CELL);
  const c = zoneCorner(planZone);
  const g = emptyGrid();
  // zone jamais vue : le plan se lit de son plan
  paintZone(g, planZone, undefined, buildPlans);
  assert.equal(g.get(c.x + i, c.y + j), pieceColor(highest), `${pl.plan} (${planZone.id}) : sa case du milieu a la couleur de sa pièce la plus haute`);
  // zone vue : les mêmes pièces dans builds, les plans marqués posés
  const s = newGame();
  const ms = mapState(s, planZone.id);
  ms.builds = pieces.map((p, id) => ({ ...p, id }));
  ms.seeded = planZone.plans.map((p) => p.id);
  const g2 = emptyGrid();
  paintZone(g2, planZone, ms, buildPlans);
  assert.equal(g2.get(c.x + i, c.y + j), pieceColor(highest), 'posé dans la partie, le même bâtiment');
  // retiré en mode construction : la case reprend son sol
  ms.builds = [];
  paintZone(g2, planZone, ms, buildPlans);
  assert.notEqual(g2.get(c.x + i, c.y + j), pieceColor(highest), 'retiré, il disparaît de la carte');
}

// 7. dedans : le réveil de Xéros (un point « dedans » de la ferme, dans le repère du dehors) tombe sur sa maison, sous son toit
{
  const spawn = ferme.spawns[START.spawn];
  assert.ok(spawn?.inside, 'le réveil est dedans');
  const cell = worldCell(ferme, spawn.x, spawn.y);
  const ground = tileColor(ferme.layers.ground[Math.floor(spawn.y / TILE) * ferme.width + Math.floor(spawn.x / TILE)]);
  assert.notEqual(grid.get(cell.x, cell.y), ground, 'dans la maison, la case de Xéros est celle du toit, pas du sol');
}

// 8. les zones que touche une fenêtre
assert.ok(zonesAround(fc.x, fc.y, 1).includes(ferme), 'la fenêtre au coin de la ferme touche la ferme');

// le coût
const t1 = performance.now();
for (let k = 0; k < 20; k++) paintZone(grid, ferme, game.maps[ferme.id], buildPlans);
const tZone = (performance.now() - t1) / 20;
console.log(`test-minimap : ${ZONES.length} zones, ${colors.tiles.length} tuiles, ${Object.keys(colors.images).length} images ; la grille ${tGrid.toFixed(0)} ms, une zone ${tZone.toFixed(1)} ms. OK`);
