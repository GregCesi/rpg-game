// Le relief (src/world/relief.ts ; docs/CONCEPTION.md, « Le relief »), sans navigateur :
// - la hauteur des formes : un niveau plat, un talus en long (crête et flanc), un couloir creusé (sol, talus intérieur), leur composition ;
// - les pas de Xéros (mobility.json) : 50 cm se montent et se descendent, 1 m se saute en descente et pas en montée, au-delà le refus dit
//   la hauteur (« Trop haute pour lui (5 m). ») ; une pente de plus de 20 % compte comme une marche de toute sa hauteur ; l'eau profonde
//   est refusée à qui ne nage pas, jamais quand il en sort ; l'escalade (?dieu) passe tout ;
// - un lapin (creatures.json `mobility`) voit une marche comme un mur, pas le couloir ;
// - l'image d'un point de l'écran (`pick`), l'inverse de la projection ;
// - un lancer au-dessus du relief retombe sous le sol ou au pied d'une face (world/throw.ts `landing`) ;
// - sur les vraies cartes (une fois le relief posé) : le plateau, la falaise, le chemin creux de bout en bout, jamais d'eau dans le couloir.
// Usage : npx tsx tools/test-hauteurs.ts (lancé par npm run test:fast ; le scénario dans le vrai jeu : npm run test:relief).

import assert from 'node:assert/strict';
import { creatures, maps, mobility } from '../src/content';
import type { MapData, Relief } from '../src/content/types';
import terrain from '../src/generated/terrain.json';
import { deepAt, heightAt, heightText, pick, refusalText, stepRefusal, wallAt } from '../src/world/relief';
import { landing } from '../src/world/throw';

const WATER = (terrain as Record<string, { deep: number[] }>).world.deep[0];
const T = 32;

/** Une carte d'essai de `w` × `h` cases, de l'herbe (tuile 0), de l'eau sur les colonnes `water`, avec ce relief. */
function trial(relief: Relief, w = 40, h = 20, water: number[] = []): MapData {
  return {
    id: `essai-${Math.random()}`,
    name: 'essai',
    tileset: 'world',
    width: w,
    height: h,
    layers: { ground: Array.from({ length: w * h }, (_, i) => (water.includes(i % w) ? WATER : 0)) },
    objects: [],
    spawns: {},
    exits: [],
    npcs: [],
    parcels: [],
    plans: [],
    places: [],
    piles: [],
    warrens: [],
    items: [],
    relief,
  };
}
const rect = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];
const none: Relief = { base: 0, levels: [], ridges: [], lanes: [] };
const near = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what} : ${a} au lieu de ${b} (± ${tol})`);

// --- un niveau plat : le plateau à l'ouest
const plateau = trial({ ...none, levels: [{ id: 1, height: 500, points: rect(0, 0, 20 * T, 20 * T) }] });
near(heightAt(plateau, 5 * T, 10 * T), 500, 0.01, 'sur le plateau');
near(heightAt(plateau, 30 * T, 10 * T), 0, 0.01, 'sur la ferme');
const cliff = stepRefusal(plateau, { x: 21 * T, y: 10 * T }, { x: 19 * T, y: 10 * T }, mobility);
assert.ok(cliff && cliff.why === 'up', 'la falaise se refuse en montant');
near(cliff.why === 'up' ? cliff.height : 0, 500, 1, 'la hauteur de la falaise');
assert.equal(refusalText(cliff), 'Trop haute pour lui (5 m).');
const down = stepRefusal(plateau, { x: 19 * T, y: 10 * T }, { x: 21 * T, y: 10 * T }, mobility);
assert.ok(down && down.why === 'down', 'on ne saute pas de 5 m');
assert.equal(stepRefusal(plateau, { x: 21 * T, y: 10 * T }, { x: 19 * T, y: 10 * T }, { ...mobility, step: Infinity, drop: Infinity, slope: Infinity }), undefined, "l'escalade passe tout");
assert.equal(stepRefusal(plateau, { x: 5 * T, y: 5 * T }, { x: 15 * T, y: 15 * T }, mobility), undefined, 'on marche sur le plateau');

// --- les marches : 50 cm, 1 m, 1,2 m
for (const [h, up, dn] of [
  [40, true, true],
  [50, true, true],
  [80, false, true],
  [100, false, true],
  [120, false, false],
] as const) {
  const m = trial({ ...none, levels: [{ id: 1, height: h, points: rect(0, 0, 20 * T, 20 * T) }] });
  const u = stepRefusal(m, { x: 21 * T, y: 10 * T }, { x: 19 * T, y: 10 * T }, mobility);
  const d = stepRefusal(m, { x: 19 * T, y: 10 * T }, { x: 21 * T, y: 10 * T }, mobility);
  assert.equal(!u, up, `une marche de ${h} cm ${up ? 'se monte' : 'ne se monte pas'}`);
  assert.equal(!d, dn, `une marche de ${h} cm ${dn ? 'se descend (ou se saute)' : 'ne se saute pas'}`);
  if (u) assert.equal(refusalText(u), `Trop haute pour lui (${heightText(h)}).`);
}
assert.equal(heightText(120), '1,2 m');
assert.equal(heightText(80), '80 cm');
assert.equal(heightText(500), '5 m');

// --- un talus en long et un couloir creusé : la crête, le flanc, le sol, le talus intérieur
const y = 10 * T;
const bank = trial({
  ...none,
  ridges: [{ id: 2, points: [{ x: 20 * T, y, h: 500, crest: 630, flank: 470 }, { x: 33 * T, y, h: 0, crest: 630, flank: 470 }] }],
  lanes: [{ id: 3, width: 250, inner: 20, innerSlope: 0.2, points: [{ x: 0, y, h: 500 }, { x: 20 * T, y, h: 0 }, { x: 38 * T, y, h: 0 }] }],
  levels: [{ id: 1, height: 500, points: rect(0, 0, 20 * T, 20 * T) }],
});
near(heightAt(bank, 20 * T, y), 0, 1, 'le sol du couloir au pied du plateau');
near(heightAt(bank, 10 * T, y), 250, 3, 'le sol du couloir à mi-pente');
near(heightAt(bank, 20 * T, y - 56), 500, 2, 'la crête du talus nord au pied du plateau (2,80 m de l’axe)');
near(heightAt(bank, 22 * T, y - (315 + 470) / 5 - 4), 0, 30, 'au pied du flanc nord');
assert.equal(stepRefusal(bank, { x: 37 * T, y }, { x: 1 * T, y }, mobility), undefined, 'le couloir se marche de bout en bout');
assert.equal(stepRefusal(bank, { x: 1 * T, y }, { x: 37 * T, y }, mobility), undefined, 'et dans l’autre sens');
const flank = stepRefusal(bank, { x: 21 * T, y: y - 7 * T }, { x: 21 * T, y }, mobility);
assert.ok(flank && flank.why === 'up', 'le flanc du talus est trop haut pour lui');
const crest = stepRefusal(bank, { x: 32 * T, y: y - 56 }, { x: 21 * T, y: y - 56 }, mobility);
assert.ok(crest, 'la crête (≈ 24 %) ne se monte pas comme un chemin : elle compte comme une marche');
assert.ok(!wallAt(bank, 25 * T, y, creatures[Object.keys(creatures)[0]].mobility), 'le couloir n’est pas un mur pour un lapin');
assert.ok(wallAt(plateau, 20 * T, 10 * T, creatures[Object.keys(creatures)[0]].mobility), 'la falaise est un mur pour un lapin');

// --- l'eau : il n'y entre pas, il en sort
const river = trial(none, 40, 20, [20, 21, 22]);
assert.ok(deepAt(river, 21 * T, 5 * T));
const swim = stepRefusal(river, { x: 19.5 * T, y: 5 * T }, { x: 20.5 * T, y: 5 * T }, mobility);
assert.ok(swim && swim.why === 'swim', "l'eau se refuse à qui ne nage pas");
assert.equal(refusalText(swim), 'Il ne sait pas nager.');
assert.equal(stepRefusal(river, { x: 20.5 * T, y: 5 * T }, { x: 19.5 * T, y: 5 * T }, mobility), undefined, "on sort toujours de l'eau");
assert.equal(stepRefusal(river, { x: 19.5 * T, y: 5 * T }, { x: 20.5 * T, y: 5 * T }, { ...mobility, swim: true }), undefined, 'qui nage y entre');

// --- l'image d'un point de l'écran : sur le plateau, 100 px plus bas que l'écran
assert.deepEqual(pick(trial(none), 100, 100), { x: 100, y: 100 }, 'carte plate : le point lui-même');
assert.deepEqual(pick(plateau, 5 * T, 5 * T), { x: 5 * T, y: 5 * T + 100 }, 'le plateau soulevé de 100 px');
assert.deepEqual(pick(plateau, 30 * T, 5 * T), { x: 30 * T, y: 5 * T }, 'la ferme à 0');

// --- un vol au-dessus du relief : il retombe sous le sol, ou au pied d'une face
const zs = [2, 1.8, 1.4, 0.9, 0.3, -0.5];
assert.equal(landing(zs.length, (i) => zs[i], () => 0), 5, 'il retombe au premier point sous le sol');
assert.equal(landing(zs.length, (i) => zs[i], (i) => (i >= 2 ? 5 : 0)), 1, 'contre une face plus haute que lui, il tombe à son pied');
assert.equal(landing(zs.length, (i) => zs[i] + 5, (i) => (i >= 3 ? 0 : 5)), 5, 'lancé du plateau, il retombe plus loin, en bas');

// --- les vraies cartes, une fois le relief posé (étape 3 du chantier)
const ferme = maps.ferme;
if (ferme.relief) {
  near(heightAt(ferme, 30 * T, 30 * T), 500, 1, 'ferme : le plateau à l’ouest');
  near(heightAt(ferme, 80 * T, 30 * T), 0, 1, 'ferme : la ferme à l’est');
  const lane = ferme.relief.lanes[0];
  assert.ok(lane, 'ferme : le chemin creux');
  const a = lane.points[0];
  const b = lane.points[lane.points.length - 1];
  const east = a.x > b.x ? a : b;
  const west = a.x > b.x ? b : a;
  assert.equal(stepRefusal(ferme, { x: east.x + 32, y: east.y }, east, mobility), undefined, 'ferme : on entre dans le couloir');
  for (let i = 0; i + 1 < lane.points.length; i++) {
    const p = lane.points[i];
    const q = lane.points[i + 1];
    assert.equal(stepRefusal(ferme, p, q, mobility), undefined, `ferme : le couloir se marche (${p.x},${p.y} → ${q.x},${q.y})`);
    for (let k = 0; k <= 20; k++) {
      const x = p.x + ((q.x - p.x) * k) / 20;
      const yy = p.y + ((q.y - p.y) * k) / 20;
      assert.ok(!deepAt(ferme, x, yy), `ferme : jamais d'eau dans le couloir (${Math.round(x)}, ${Math.round(yy)})`);
    }
  }
  near(heightAt(ferme, west.x, west.y), 500, 2, 'ferme : le couloir finit sur le plateau');
  near(heightAt(ferme, east.x, east.y), 0, 2, 'ferme : le couloir commence sur la ferme');
  for (const id of ['bois-du-nord', 'bois-du-sud', 'bois-de-la-riviere', 'foret-profonde-nord', 'foret-profonde', 'foret-profonde-sud', 'foret-des-ronces'])
    near(heightAt(maps[id], 10 * T, 60 * T), 500, 1, `${id} : sur le plateau`);
}

console.log('test-hauteurs : ok');
