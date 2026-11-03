// Le paysage du monde tel que Grégoire l'a voulu (chantier « correctifs »), sans navigateur, sur les cartes traduites
// (src/generated/maps.ts) :
// - un village en champs ouverts : aucune clôture nulle part (les haies de têtards et de buissons restent) ;
// - plus de champ près de la maison de Xéros (le grand champ de l'est, le champ clos, le potager) : à 40 m autour, de l'herbe ;
// - la garenne de 7 lapins sous les arbres à l'ouest de la maison ;
// - la tempête : des arbres normaux couchés, déracinés, cassés (le chicot et sa cime) et des branches, jamais dans la forêt de l'ouest,
//   jamais en travers d'un chemin ; les arbres déracinés à 20 m au moins de la maison ; le chicot et sa cime pèsent l'arbre entier.
// Usage : tsx tools/test-paysage.ts (lancé par npm run test:fast, donc par npm run build).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TILE } from '../src/config';
import { maps } from '../src/content';
import { CM_PER_PX } from '../src/content/gabarit';
import { props } from '../src/content';
import { woodMass } from '../src/content/mass';

const world: string[] = JSON.parse(readFileSync('art/tile-registry.json', 'utf8')).world;
const nameOf = (v: number) => world[v] ?? '';

// aucune clôture dans le monde
for (const m of Object.values(maps)) {
  if (m.tileset !== 'world') continue;
  const fences = (m.layers.ground ?? []).filter((v) => nameOf(v).startsWith('fence')).length;
  assert.equal(fences, 0, `${m.id} : ${fences} tuiles de clôture (le village est en champs ouverts)`);
}

// la maison de Xéros : plus de champ à 40 m autour
const ferme = maps.ferme;
const house = ferme.plans.find((p) => p.plan === 'maison-xeros');
assert.ok(house, 'la maison de Xéros est posée sur la ferme');
const R = 4000 / CM_PER_PX / TILE;
const hx = house.x / TILE;
const hy = house.y / TILE;
let fields = 0;
for (let y = Math.max(0, Math.floor(hy - R)); y < Math.min(ferme.height, hy + R); y++) {
  for (let x = Math.max(0, Math.floor(hx - R)); x < Math.min(ferme.width, hx + R); x++) {
    if (nameOf(ferme.layers.ground[y * ferme.width + x]).startsWith('field')) fields++;
  }
}
assert.equal(fields, 0, `${fields} cases de champ à moins de 40 m de la maison de Xéros`);

// la garenne du grand champ est partie avec lui : sous les arbres à l'ouest de la maison (choix de Grégoire), à moins de 25 m
const big = ferme.warrens.find((w) => w.population === 7);
assert.ok(big, 'la garenne de 7 lapins de la ferme');
const wx = big.x + big.w / 2;
const wy = big.y + big.h / 2;
assert.ok(wx < house.x, `la garenne est à l'ouest de la maison (${Math.round(wx)} px, la maison à ${house.x} px)`);
const metres = (Math.hypot(wx - house.x, wy - (house.y + 80)) * CM_PER_PX) / 100;
assert.ok(metres < 25, `la garenne à ${metres.toFixed(1)} m du pignon ouest de la maison (moins de 25 m)`);
const trees = ferme.objects.filter((o) => o.type.endsWith('-tree') || o.type.endsWith('-pollard'));
const shaded = trees.filter((t) => t.x > big.x - TILE && t.x < big.x + big.w + TILE && t.y > big.y - TILE && t.y < big.y + big.h + 2 * TILE);
assert.ok(shaded.length >= 2, `la garenne est sous des arbres (${shaded.length} au bord ou dedans)`);

// la tempête (CONCEPTION « La tempête ») : des arbres normaux couchés et des branches autour de la ferme surtout, le long du chemin et
// dans les prés ; rien dans la forêt de l'ouest (0 à 300 m du monde : elle est magique) ; aucun arbre couché en travers d'un chemin
const FOREST_END = (30000 / CM_PER_PX); // 300 m, en px du monde
let stormTrees = 0;
let stormBranches = 0;
for (const m of Object.values(maps)) {
  if (!m.world) continue;
  const felled = m.objects.filter((o) => o.type.endsWith('-felled-tree') || o.type === 'normal-snag-top');
  const branches = m.items.filter((i) => i.item === 'branch');
  for (const o of [...felled, ...branches, ...m.objects.filter((o) => /^(normal-snag|root-plate|uprooted-hole)$/.test(o.type))]) {
    assert.ok(m.world.x + o.x >= FOREST_END, `${m.id} : rien de la tempête dans la forêt de l'ouest (${o.x}, ${o.y})`);
  }
  for (const f of felled) {
    assert.ok(/^normal-/.test(f.type), `${m.id} : la tempête a couché des arbres normaux (${f.type})`);
    for (let k = 0; k <= (f.type === 'normal-snag-top' ? 91 : 140); k += 8) {
      const v = m.layers.ground[Math.floor((f.y - 6) / TILE) * m.width + Math.floor((f.x + k) / TILE)];
      assert.ok(!/^(path|road|yard)/.test(nameOf(v)), `${m.id} : l'arbre couché en (${f.x}, ${f.y}) ne barre pas un chemin`);
    }
  }
  stormTrees += felled.length;
  stormBranches += branches.length;
}
const near = (m: (typeof maps)[string], r: number) => m.items.filter((i) => Math.hypot(i.x - house.x, i.y - house.y) < r).length;
assert.ok(ferme.objects.filter((o) => o.type === 'normal-felled-tree').length >= 4, 'au moins quatre arbres couchés sur la ferme');
assert.ok(ferme.objects.some((o) => o.type === 'normal-tree-stump'), 'un arbre déjà coupé sur la ferme (sa souche)');
assert.ok(near(ferme, 6000 / CM_PER_PX) >= 30, `beaucoup de branches à moins de 60 m de la maison (${near(ferme, 6000 / CM_PER_PX)})`);
for (const id of ['chemin', 'pres-du-nord', 'pres-du-sud']) assert.ok(maps[id].objects.some((o) => o.type === 'normal-felled-tree') && maps[id].items.length > 0, `${id} : la tempête y est passée`);

// la matière se conserve : le chicot et sa cime sont l'arbre normal entier, la souche (40 cm de tronc) et l'arbre couché
const normal = (length: number) => woodMass({ size: 'normal', length, shape: 'round', axis: 'ew' });
const massOf = (k: string) => props[k].mass as number;
const crown = massOf('normal-felled-tree') - normal(props['normal-felled-tree'].harvest!.wood!.length);
assert.ok(Math.abs(massOf('normal-snag') - normal(250)) < 0.5, `le chicot : 2,5 m de tronc (${massOf('normal-snag')} kg, ${normal(250).toFixed(1)} attendus)`);
assert.ok(Math.abs(massOf('normal-snag-top') - (normal(370) + crown)) < 0.5, `la cime : 3,7 m de tronc et le houppier (${massOf('normal-snag-top')} kg, ${(normal(370) + crown).toFixed(1)} attendus)`);
const whole = normal(40) + massOf('normal-felled-tree');
assert.ok(Math.abs(massOf('normal-snag') + massOf('normal-snag-top') - whole) < 0.5, `chicot + cime = l'arbre entier (${massOf('normal-snag') + massOf('normal-snag-top')} kg, souche et arbre couché : ${whole.toFixed(1)})`);
// ce qu'ils deviennent n'en crée pas : le chicot abattu, sa souche et le tronc couché ; la cime ébranchée, sa pièce de bois et ses branches
const snagLog = props['normal-snag'].harvest!.spawns[0].wood!;
assert.ok(normal(40) + woodMass(snagLog) <= massOf('normal-snag') + 1e-6, 'le chicot abattu ne crée pas de bois');
assert.ok(normal(props['normal-snag-top'].harvest!.wood!.length) <= massOf('normal-snag-top'), 'la cime ébranchée ne crée pas de bois');

// les arbres déracinés : la galette au pied d'un arbre couché, son trou à côté ; sur la ferme, à 20 m au moins de la maison
const wallDist = (x: number, y: number) => {
  const dx = Math.max(house.x - x, 0, x - (house.x + 1330 / CM_PER_PX));
  const dy = Math.max(house.y - y, 0, y - (house.y + 690 / CM_PER_PX));
  return (Math.hypot(dx, dy) * CM_PER_PX) / 100;
};
const storm = (m: (typeof maps)[string], t: string) => m.objects.filter((o) => o.type === t);
for (const id of ['ferme', 'chemin']) {
  const m = maps[id];
  for (const p of storm(m, 'root-plate')) {
    assert.ok(storm(m, 'normal-felled-tree').some((f) => f.x - p.x === 18 && p.y - f.y === 1), `${id} : la galette en (${p.x}, ${p.y}) est au pied d'un arbre couché`);
    assert.ok(storm(m, 'uprooted-hole').some((h) => p.x - h.x === 13 && p.y - h.y === 3), `${id} : la galette en (${p.x}, ${p.y}) a son trou`);
  }
  for (const n of storm(m, 'normal-snag')) assert.ok(storm(m, 'normal-snag-top').some((t) => t.x - n.x === 18 && t.y - n.y === 3), `${id} : le chicot en (${n.x}, ${n.y}) a sa cime au sol`);
}
assert.equal(storm(ferme, 'root-plate').length, 2, 'deux arbres déracinés sur la ferme');
for (const p of storm(ferme, 'root-plate')) assert.ok(wallDist(p.x - 13, p.y) >= 20, `l'arbre déraciné à ${wallDist(p.x - 13, p.y).toFixed(1)} m de la maison (20 m au moins)`);
assert.equal(storm(ferme, 'normal-snag').length, 2, 'deux chicots sur la ferme');
assert.equal(storm(maps.chemin, 'root-plate').length, 1, 'un arbre déraciné le long du chemin');
assert.equal(storm(maps.chemin, 'normal-snag').length, 1, 'un chicot le long du chemin');

console.log(`  ✓ paysage : la tempête, ${stormTrees} arbres couchés et ${stormBranches} branches hors de la forêt de l'ouest, aucun en travers d'un chemin`);
console.log(`  ✓ paysage : aucune clôture dans le monde ; plus de champ autour de la maison de Xéros ; la garenne de 7 lapins à ${metres.toFixed(1)} m à l'ouest de la maison, sous ${shaded.length} arbres`);
