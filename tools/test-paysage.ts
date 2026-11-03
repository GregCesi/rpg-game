// Le paysage du monde tel que Grégoire l'a voulu (chantier « correctifs »), sans navigateur, sur les cartes traduites
// (src/generated/maps.ts) :
// - un village en champs ouverts : aucune clôture nulle part (les haies de têtards et de buissons restent) ;
// - plus de champ près de la maison de Xéros (le grand champ de l'est, le champ clos, le potager) : à 40 m autour, de l'herbe.
// Usage : tsx tools/test-paysage.ts (lancé par npm run test:fast, donc par npm run build).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TILE } from '../src/config';
import { maps } from '../src/content';
import { CM_PER_PX } from '../src/content/gabarit';

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

console.log(`  ✓ paysage : aucune clôture dans le monde ; plus de champ autour de la maison de Xéros ; la garenne de 7 lapins à ${metres.toFixed(1)} m à l'ouest de la maison, sous ${shaded.length} arbres`);
