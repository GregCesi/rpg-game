// La naissance du monde (chantier « monde », CONCEPTION « Le monde ») : un seul plan pour tout le monde, 5 × 4 zones de 125 × 125 cases
// (200 × 200 m, 1 case = 1,60 m), dessiné ici en lettres et en objets placés au pixel, puis découpé en une esquisse par zone
// (tiled/sketches/<zone>.json). On fait ensuite naître chaque zone avec `npm run sketch -- <zone>` ; la ferme, qui existe déjà, est
// agrandie : son ancien .tmj est gardé tel quel (sol, objets, identifiants, sorties vers la maison), posé au milieu de la zone.
// Ensuite les .tmj font foi : cet outil ne sert qu'à la naissance (il n'écrit pas l'esquisse d'une zone dont le .tmj existe, et
// n'agrandit pas une ferme déjà agrandie). Écrit aussi tiled/maps/monde.world, l'assemblage des zones que Tiled ouvre.
//
// Usage : npx tsx tools/monde-esquisses.ts   puis   for z in $(cat tiled/sketches/zones.txt); do npm run sketch -- $z; done
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { TILE } from '../src/config';
import { buildPlans } from './lib/build-plans';
import { loadContext, serializeTmj, sketchToTmj, SketchLegendSchema, type Sketch } from './lib/sketch';

// --- Le plan du monde, en cases (x vers l'est, y vers le sud) ---
const Z = 125; // une zone
const COLS = 5;
const ROWS = 4;
const W = Z * COLS;
const H = Z * ROWS;
const PX = TILE; // px par case

/** Les zones, rangée par rangée, colonne par colonne : identifiant et nom affiché. */
const NAMES: [string, string][][] = [
  [['foret-profonde-nord', 'La forêt profonde, au nord'], ['bois-du-nord', 'Le bois du nord'], ['pres-du-nord', 'Les prés du nord'], ['ferme-du-riche', 'La ferme du riche'], ['champs-du-riche', 'Les champs du riche']],
  [['foret-profonde', 'La forêt profonde'], ['ferme', 'La ferme'], ['chemin', 'Le chemin du village'], ['village', 'Le village'], ['route-de-la-ville', 'La route de la ville']],
  [['foret-profonde-sud', 'La forêt profonde, au sud'], ['bois-du-sud', 'Le bois du sud'], ['pres-du-sud', 'Les prés du sud'], ['quartier-sud', 'Le quartier du sud'], ['pres-de-l-est', "Les prés de l'est"]],
  [['foret-des-ronces', 'La forêt des ronces'], ['bois-de-la-riviere', 'Le bois de la rivière'], ['friches', 'Les friches'], ['ferme-rivale', 'La ferme rivale'], ['champs-rivaux', 'Les champs rivaux']],
];

// Repères (cases du monde)
const FOREST_EDGE = 187; // 300 m : la lisière
const DEEP = 70; // la forêt profonde à l'ouest de cette colonne, le sous-bois jusqu'à WOODS
const WOODS = 140;
const ROAD_Y = 190; // le chemin, rangées 190-191 ; les rues du village, 190-192
const PLACE = { x: 478.5, y: 191.5, r: 9.5 }; // la place ronde, 30 m (centre en cases)
const ABORDS_X = 406; // 650 m : le chemin arrive au village
const EAST_END = 538; // fin des parcelles officielles, début de la route de la ville
const NORTH_END = 119; // 190 m : le haut du quartier riche
const SOUTH_END = 312; // 500 m : le bas du quartier résidentiel
const OLD_FARM = { x: 203, y: 168, w: 32, h: 22 }; // l'ancienne ferme.tmj, posée dans la zone de la ferme
const FARM_PATH_X = 218; // son chemin nord-sud (anciennes colonnes 15-16)

// --- Hasard stable ---
function hash(x: number, y: number, s = 0): number {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Bruit lisse (valeurs aux nœuds d'une grille de `cell` cases, interpolées). */
function noise(x: number, y: number, cell: number, s: number): number {
  const gx = x / cell;
  const gy = y / cell;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const sm = (t: number) => t * t * (3 - 2 * t);
  const fx = sm(gx - x0);
  const fy = sm(gy - y0);
  const a = hash(x0, y0, s) + (hash(x0 + 1, y0, s) - hash(x0, y0, s)) * fx;
  const b = hash(x0, y0 + 1, s) + (hash(x0 + 1, y0 + 1, s) - hash(x0, y0 + 1, s)) * fx;
  return a + (b - a) * fy;
}
let seq = 1;
const rand = () => hash(seq++, 7, 99);

// --- Le sol, en lettres (voir tiled/sketch-legend.json) ---
const ground: string[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => '.'));
/** Ce qui est pris : ni arbre ni buisson ne s'y pose (chemins, eau, cours, parcelles, plans, champs, l'ancienne ferme). */
const taken: boolean[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => false));
const set = (x: number, y: number, ch: string) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  ground[y][x] = ch;
  taken[y][x] = true;
};
const fill = (x0: number, y0: number, x1: number, y1: number, ch: string) => {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, ch);
};
const reserve = (x0: number, y0: number, x1: number, y1: number) => {
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) taken[y][x] = true;
};

// 1. le fond : forêt à l'ouest (trois profondeurs ; leurs bords en bandes de passage étroites), prés et herbe à l'est
const clearing = (x: number, y: number) => x < FOREST_EDGE && noise(x, y, 16, 4) > (x < WOODS ? 0.78 : 0.7);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const wob = (noise(x, y, 9, 1) - 0.5) * 10;
    // une bande de passage de deux cases où les deux sols se mêlent
    const mix = (edge: number, a: string, b: string) => (x + wob < edge - 1 ? a : x + wob > edge + 1 ? b : hash(x, y, 2) < 0.5 ? a : b);
    let ch: string;
    if (x + wob < (DEEP + WOODS) / 2) ch = mix(DEEP, '!', ':');
    else if (x + wob * 0.6 < (WOODS + FOREST_EDGE) / 2) ch = mix(WOODS, ':', ';');
    else if (x + wob * 0.6 < FOREST_EDGE) ch = ';';
    else {
      // la prairie : son bord est une bande où les deux herbes se mêlent, de plus en plus haute vers le milieu
      const m = noise(x, y, 14, 2);
      const meadow = m > 0.66 || (m > 0.58 && hash(x, y, 9) < (m - 0.58) / 0.08);
      ch = meadow ? '"' : noise(x, y, 5, 3) > 0.86 ? ',' : '.';
    }
    // clairières : le sol de la lisière, de l'herbe, des fleurs
    if (clearing(x, y)) ch = noise(x, y, 4, 5) > 0.8 ? ',' : x < WOODS ? ';' : '.';
    ground[y][x] = ch;
  }
}

// 2. la rivière, nord-sud, 5 cases (8 m), qui serpente un peu ; droite au pont
const RIVER = 169;
const riverX = (y: number) => {
  const d = Math.abs(y - ROAD_Y);
  const k = Math.min(1, Math.max(0, (d - 4) / 14));
  return Math.round(RIVER + k * (2.6 * Math.sin(y / 23) + 1.6 * Math.sin(y / 57 + 1)));
};
for (let y = 0; y < H; y++) {
  const c = riverX(y);
  fill(c - 2, y, c + 3, y + 1, '~');
  reserve(c - 3, y, c + 4, y + 1);
}
// le pont : rangées 190-191, le tablier sur l'eau, ses bouts sur les berges
const BRIDGE = riverX(ROAD_Y);
for (let x = BRIDGE - 2; x <= BRIDGE + 2; x++) {
  set(x, ROAD_Y, 'b');
  set(x, ROAD_Y + 1, 'd');
}
set(BRIDGE - 3, ROAD_Y, 'w');
set(BRIDGE - 3, ROAD_Y + 1, 'x');
set(BRIDGE + 3, ROAD_Y, 'e');
set(BRIDGE + 3, ROAD_Y + 1, 'z');

// 3. les chemins : de la ferme au village (250 m), et le sentier de la forêt à l'ouest du pont
const path = (x0: number, x1: number, y0: number, h = 2) => {
  for (let x = x0; x < x1; x++) for (let y = y0; y < y0 + h; y++) if (!'bdwxez'.includes(ground[y][x])) set(x, y, '=');
  reserve(x0, y0 - 2, x1, y0 + h + 2);
};
path(BRIDGE + 4, ABORDS_X, ROAD_Y);
path(118, BRIDGE - 3, ROAD_Y);
// le chemin nord-sud de la ferme, prolongé jusqu'au chemin
fill(FARM_PATH_X, OLD_FARM.y + OLD_FARM.h, FARM_PATH_X + 2, ROAD_Y, '=');

// 4. le village : rues de terre battue en croix (3 cases), la place ronde
fill(ABORDS_X, ROAD_Y, EAST_END, ROAD_Y + 3, 'y');
fill(477, NORTH_END - 40, 480, SOUTH_END + 38, 'y');
for (let y = -12; y <= 12; y++) {
  for (let x = -12; x <= 12; x++) {
    const cx = Math.floor(PLACE.x) + x;
    const cy = Math.floor(PLACE.y) + y;
    if ((cx + 0.5 - PLACE.x) ** 2 + (cy + 0.5 - PLACE.y) ** 2 <= PLACE.r * PLACE.r) set(cx, cy, 'y');
  }
}
reserve(ABORDS_X, ROAD_Y - 1, EAST_END, ROAD_Y + 4);
reserve(476, NORTH_END - 40, 481, SOUTH_END + 38);
reserve(Math.floor(PLACE.x - PLACE.r) - 1, Math.floor(PLACE.y - PLACE.r) - 1, Math.ceil(PLACE.x + PLACE.r) + 2, Math.ceil(PLACE.y + PLACE.r) + 2);
// la route de la ville : 4 cases (6,4 m), empierrée et bordée, jusqu'au bord du monde
fill(EAST_END, ROAD_Y - 1, W, ROAD_Y + 3, 'R');
reserve(EAST_END, ROAD_Y - 3, W, ROAD_Y + 5);

// 5. les fermes : cours de terre battue au bout des rues, champs labourés entre des haies
interface Field { x: number; y: number; w: number; h: number; ns: boolean }
const fields: Field[] = [];
const field = (f: Field) => {
  fill(f.x, f.y, f.x + f.w, f.y + f.h, f.ns ? '|' : '%');
  fields.push(f);
};
/** Une grande ferme : sa cour, et des champs en damier dans son emprise, en évitant rues, cours et tout ce qui est pris. */
function bigFarm(x0: number, y0: number, x1: number, y1: number, yard: { x: number; y: number; w: number; h: number }, s: number): void {
  fill(yard.x, yard.y, yard.x + yard.w, yard.y + yard.h, 'y');
  reserve(yard.x - 2, yard.y - 2, yard.x + yard.w + 2, yard.y + yard.h + 2);
  for (let y = y0; y < y1 - 14; y += 34) {
    for (let x = x0; x < x1 - 14; x += 40) {
      const f = { x: x + 2, y: y + 2, w: Math.min(30 + Math.floor(hash(x, y, s) * 6), x1 - x - 4), h: Math.min(24 + Math.floor(hash(y, x, s) * 6), y1 - y - 4), ns: hash(x, y, s + 1) > 0.5 };
      let free = f.w > 12 && f.h > 10;
      for (let j = f.y - 2; j < f.y + f.h + 2 && free; j++) for (let i = f.x - 2; i < f.x + f.w + 2 && free; i++) if (taken[j]?.[i]) free = false;
      if (free) field(f);
    }
  }
}
bigFarm(378, 0, 578, NORTH_END, { x: 462, y: NORTH_END - 40, w: 32, h: 26 }, 11);
bigFarm(378, SOUTH_END + 1, 578, H, { x: 462, y: SOUTH_END + 12, w: 32, h: 26 }, 23);
// la ferme de Xéros : un petit champ à l'est de l'ancienne ferme
field({ x: 238, y: 170, w: 10, h: 16, ns: true });

// 6. l'ancienne ferme : son emprise est prise (on la recopie telle quelle)
reserve(OLD_FARM.x - 1, OLD_FARM.y - 1, OLD_FARM.x + OLD_FARM.w + 1, OLD_FARM.y + OLD_FARM.h + 1);

// --- Les objets, au pixel du monde (milieu du bas de l'image) ---
interface Obj { type: string; x: number; y: number; age?: 'new' | 'worn' | 'old' }
const objects: Obj[] = [];
interface Rect { x: number; y: number; w: number; h: number; use?: string; name?: string; plan?: string; age?: 'new' | 'worn' | 'old' }
const parcels: Rect[] = [];
const plans: Rect[] = [];

const bp = buildPlans();
/** Un plan posé, son coin nord-ouest en (px, py) du monde ; sa taille (cm) en px pour qu'on le voie dans Tiled. */
function plan(name: string, px: number, py: number, age?: 'new' | 'worn' | 'old'): void {
  const p = bp[name];
  if (!p) throw new Error(`plan ${name} introuvable`);
  const w = Math.round(p.size.w / 5);
  const h = Math.round(p.size.d / 5);
  plans.push({ x: Math.round(px), y: Math.round(py), w, h, plan: name, ...(age ? { age } : {}) });
  reserve(Math.floor(px / PX) - 2, Math.floor(py / PX) - 2, Math.ceil((px + w) / PX) + 2, Math.ceil((py + h) / PX) + 3);
}
/** Une parcelle réservée, en cases ; jamais à cheval sur deux zones. */
function parcel(x: number, y: number, w: number, h: number, use: string, name?: string): void {
  if (Math.floor(x / Z) !== Math.floor((x + w - 1) / Z) || Math.floor(y / Z) !== Math.floor((y + h - 1) / Z)) return;
  parcels.push({ x: x * PX, y: y * PX, w: w * PX, h: h * PX, use, ...(name ? { name } : {}) });
  reserve(x, y, x + w, y + h);
}

// les huit étals autour de la place, entre les quatre rues (le plan de l'étal regarde le sud)
for (let k = 0; k < 8; k++) {
  const a = (Math.PI / 4) * k + Math.PI / 8;
  const cx = PLACE.x * PX + Math.cos(a) * 6.4 * PX;
  const cy = PLACE.y * PX + Math.sin(a) * 6.4 * PX;
  plan('etal', cx - bp.etal.size.w / 10, cy - bp.etal.size.d / 10);
}
// les granges des deux fermes, dans leur cour
plan('grange', 466 * PX, (NORTH_END - 36) * PX);
plan('grange', 466 * PX, (SOUTH_END + 16) * PX);
// la cabane du chasseur, à la lisière, juste au sud de la ferme
plan('cabane', 190 * PX, 197 * PX);

// les parcelles : les abords (3 de chaque côté de la rue), le quartier riche, le quartier résidentiel, les parcelles officielles
for (let i = 0; i < 3; i++) {
  parcel(ABORDS_X + 1 + i * 17, ROAD_Y - 17, 15, 15, 'cottage');
  parcel(ABORDS_X + 1 + i * 17, ROAD_Y + 5, 15, 15, 'cottage');
}
for (const [y, h] of [[127, 26], [155, 25]]) {
  parcel(456, y, 20, h, 'rich-house');
  parcel(481, y, 18, h, 'rich-house');
}
for (let y = Math.ceil(PLACE.y + PLACE.r + 3); y + 8 <= SOUTH_END; y += 9) {
  parcel(464, y, 12, 8, 'house');
  parcel(481, y, 12, 8, 'house');
}
parcel(501, ROAD_Y - 16, 18, 15, 'town-hall', 'Mairie');
parcel(521, ROAD_Y - 14, 15, 13, 'tavern', 'Taverne');
parcel(501, ROAD_Y + 5, 18, 14, 'reserve');
parcel(521, ROAD_Y + 5, 15, 14, 'reserve');
parcel(482, NORTH_END - 37, 11, 9, 'farmhouse', 'Logis du riche');
parcel(482, SOUTH_END + 15, 11, 9, 'farmhouse', 'Logis de la ferme rivale');

// le panneau, au bord nord de la route, près du bord du monde (vieux, la flèche vers l'est)
objects.push({ type: 'signpost', x: (W - 6) * PX, y: (ROAD_Y - 1) * PX - 2, age: 'old' });
reserve(W - 9, ROAD_Y - 4, W - 3, ROAD_Y);

// les haies : têtards et buissons le long des champs, une brèche pour entrer
for (const f of fields) {
  const edge: [number, number][] = [];
  for (let x = f.x - 1; x <= f.x + f.w; x += 3) edge.push([x, f.y - 1], [x, f.y + f.h + 1]);
  for (let y = f.y; y < f.y + f.h; y += 3) edge.push([f.x - 1, y], [f.x + f.w + 1, y]);
  const gap = Math.floor(hash(f.x, f.y, 5) * edge.length);
  edge.forEach(([x, y], i) => {
    if (Math.abs(i - gap) < 2 || x < 7 || y < 0 || x >= W - 8 || y >= H || taken[y][x]) return;
    const h = hash(x, y, 8);
    if (h < 0.18) objects.push({ type: 'big-pollard', x: x * PX + 16, y: y * PX + 30 });
    else if (h < 0.55) objects.push({ type: 'bush', x: x * PX + 16, y: y * PX + 30 });
    taken[y][x] = true;
  });
}

// les arbres : tirage de Poisson (un écart minimal entre deux troncs), plus serré en s'enfonçant, des clairières ; quelques arbres et
// buissons dans les prés. Rien sur ce qui est pris.
const trunks: { x: number; y: number; r: number }[] = [];
const grid = new Map<string, number[]>();
const CELL = 8 * PX;
function tooClose(x: number, y: number, r: number): boolean {
  const gx = Math.floor(x / CELL);
  const gy = Math.floor(y / CELL);
  for (let j = gy - 1; j <= gy + 1; j++) {
    for (let i = gx - 1; i <= gx + 1; i++) {
      for (const k of grid.get(`${i},${j}`) ?? []) {
        const t = trunks[k];
        if (Math.hypot(t.x - x, t.y - y) < Math.min(CELL, Math.max(r, t.r))) return true;
      }
    }
  }
  return false;
}
function addTrunk(type: string, x: number, y: number, r: number): void {
  const k = trunks.push({ x, y, r }) - 1;
  const key = `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
  grid.set(key, [...(grid.get(key) ?? []), k]);
  objects.push({ type, x: Math.round(x), y: Math.round(y) });
}
/** Écart minimal entre deux troncs (px) à la case (x, y) du monde, ou rien : pas d'arbre ici. */
function spacing(x: number, y: number): number | undefined {
  // au bord du monde, un arbre doit pouvoir tomber des deux côtés dans la carte
  if (taken[y][x] || x < 7 || x > W - 8) return undefined;
  if (x < DEEP) return clearing(x, y) ? 240 : 70;
  if (x < WOODS) return clearing(x, y) ? 250 : 82;
  if (x < FOREST_EDGE) return clearing(x, y) ? 256 : Math.min(240, 96 + (x - WOODS) * 2.4);
  // les prés : des bosquets, des arbres isolés
  return noise(x, y, 20, 6) > 0.74 ? 150 : 256;
}
for (let y = 3; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    const s = spacing(x, y);
    if (s === undefined) continue;
    if (s >= 256 && hash(x, y, 31) > 0.02) continue; // les prés ouverts : rare
    const px = x * PX + 4 + rand() * (PX - 8);
    const py = y * PX + 8 + rand() * (PX - 10);
    if (tooClose(px, py, s)) continue;
    const r = rand();
    if (x >= FOREST_EDGE) {
      if (r < 0.3) addTrunk('bush', px, py, s * 0.5);
      else if (r < 0.34) addTrunk('rock', px, py, s * 0.5);
      else addTrunk(r < 0.62 ? 'normal-tree' : r < 0.8 ? 'big-pollard' : 'big-tree', px, py, s);
    } else if (r < 0.06) addTrunk('bush', px, py, s * 0.6);
    else if (r < 0.072) addTrunk('rock', px, py, s * 0.6);
    else addTrunk(r < (x < WOODS ? 0.55 : 0.42) ? 'big-tree' : 'normal-tree', px, py, s);
  }
}

// --- Le découpage en zones ---
const legend = SketchLegendSchema.parse(JSON.parse(readFileSync('tiled/sketch-legend.json', 'utf8')));
const ctx = loadContext();
mkdirSync('tiled/sketches', { recursive: true });
const zoneIds: string[] = [];
const world: { fileName: string; x: number; y: number; width: number; height: number }[] = [];
const inZone = (c: number, r: number) => (o: { x: number; y: number }) => Math.floor(o.x / (Z * PX)) === c && Math.floor((o.y - 1) / (Z * PX)) === r;

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const [id, name] = NAMES[r][c];
    world.push({ fileName: `${id}.tmj`, x: c * Z * PX, y: r * Z * PX, width: Z * PX, height: Z * PX });
    const ox = c * Z * PX;
    const oy = r * Z * PX;
    const inside = inZone(c, r);
    // un objet est à la zone où tombe le coin gauche de son image (son image peut dépasser sur la voisine, à l'est)
    const mine = (o: { x: number; y: number; type?: string }) => inside({ x: o.x - (o.type ? (ctx.propTiles[o.type]?.width ?? 0) / 2 : 0), y: o.y });
    // un point d'apparition (outils de test) : la case libre la plus proche du milieu de la zone, loin des troncs
    let sp: { x: number; y: number } | undefined;
    for (let d = 0; d < Z / 2 && !sp; d++) {
      for (let j = -d; j <= d && !sp; j++) {
        for (let i = -d; i <= d && !sp; i++) {
          const x = c * Z + 62 + i;
          const y = r * Z + 62 + j;
          if ('~bdwxez'.includes(ground[y][x])) continue;
          const fx = x * PX + 16;
          const fy = y * PX + 28;
          if (!trunks.some((t) => Math.abs(t.x - fx) < 30 && fy - t.y < 30 && fy - t.y > -40)) sp = { x: x - c * Z, y: y - r * Z };
        }
      }
    }
    const sketch: Sketch = {
      name,
      ground: ground.slice(r * Z, (r + 1) * Z).map((row) => row.slice(c * Z, (c + 1) * Z).join('')),
      props: Array.from({ length: Z }, () => '.'.repeat(Z)),
      spawns: { centre: { x: sp!.x, y: sp!.y, facing: 'down' } },
      objects: objects.filter((o) => mine(o)).map((o) => ({ ...o, x: o.x - ox, y: o.y - oy })),
      parcels: parcels.filter((p) => mine({ x: p.x, y: p.y + 1 })).map((p) => ({ x: p.x - ox, y: p.y - oy, w: p.w, h: p.h, use: p.use!, ...(p.name ? { name: p.name } : {}) })),
      plans: plans.filter((p) => mine({ x: p.x, y: p.y + 1 })).map((p) => ({ x: p.x - ox, y: p.y - oy, w: p.w, h: p.h, plan: p.plan!, ...(p.age ? { age: p.age } : {}) })),
    };
    console.log(`  ${id} : ${sketch.objects!.length} objets, ${sketch.parcels!.length} parcelles, ${sketch.plans!.length} plans`);
    if (id === 'ferme') growFarm(sketch);
    else if (existsSync(`tiled/maps/${id}.tmj`)) console.log(`    le .tmj existe : esquisse non écrite`);
    else {
      writeFileSync(`tiled/sketches/${id}.json`, JSON.stringify(sketch));
      zoneIds.push(id);
    }
  }
}
writeFileSync('tiled/sketches/zones.txt', zoneIds.join('\n') + '\n');
writeFileSync('tiled/maps/monde.world', JSON.stringify({ type: 'world', onlyShowAdjacentMaps: false, maps: world }, null, 2) + '\n');
console.log(`esquisses : ${zoneIds.length} zones (tiled/sketches/zones.txt) ; monde : tiled/maps/monde.world`);

/**
 * La ferme : l'ancienne carte (32 × 22) est posée telle quelle dans la zone (sol, objets avec leurs identifiants, points, sorties), le
 * reste vient de l'esquisse ; les raccords du sol (clôtures, chemins, eau) sont recalculés au bord de l'ancienne carte.
 */
function growFarm(sketch: Sketch): void {
  const path = 'tiled/maps/ferme.tmj';
  const old = JSON.parse(readFileSync(path, 'utf8'));
  if (old.width === Z) return void console.log('    déjà agrandie');
  const reg: string[] = JSON.parse(readFileSync('art/tile-registry.json', 'utf8')).world;
  const lx = OLD_FARM.x - Z; // dans la zone
  const ly = OLD_FARM.y - Z;
  const oldGround: number[] = old.layers.find((l: { name: string }) => l.name === 'ground').data;
  // l'ancien sol en lettres, pour que les raccords se recalculent avec ce qui l'entoure
  const letterOf = (n: string) => (n.startsWith('fence') ? 'F' : n.startsWith('path') ? '=' : n.startsWith('water') ? '~' : n.startsWith('field') ? '#' : n.startsWith('flowers') ? ',' : '.');
  const rows = sketch.ground.map((row) => [...row]);
  for (let y = 0; y < OLD_FARM.h; y++) for (let x = 0; x < OLD_FARM.w; x++) rows[ly + y][lx + x] = letterOf(reg[oldGround[y * OLD_FARM.w + x] - 1]);
  const { tmj, errors } = sketchToTmj('ferme', { ...sketch, ground: rows.map((row) => row.join('')), spawns: {} }, legend, ctx);
  if (!tmj) throw new Error(errors.join('\n'));
  type Layer = { name: string; data?: number[]; objects?: { id: number; x: number; y: number }[] };
  const t = tmj as { width: number; layers: Layer[]; nextobjectid: number; properties: unknown[] };
  const data = t.layers.find((l) => l.name === 'ground')!.data!;
  // le sol de l'ancienne carte tel quel, sauf les raccords recalculés (terrains)
  for (let y = 0; y < OLD_FARM.h; y++) {
    for (let x = 0; x < OLD_FARM.w; x++) {
      const g = oldGround[y * OLD_FARM.w + x];
      if (!/-\d+$/.test(reg[g - 1])) data[(ly + y) * Z + lx + x] = g;
    }
  }
  // ses objets et ses zones, décalés, avec leurs identifiants ; les nouveaux après eux
  const shift = (o: { id: number; x: number; y: number }) => ({ ...o, x: o.x + lx * PX, y: o.y + ly * PX });
  const oldLayer = (name: string) => old.layers.find((l: { name: string }) => l.name === name).objects.map(shift);
  let next = old.nextobjectid;
  const renum = (list: { id: number }[]) => list.map((o) => ({ ...o, id: next++ }));
  const objectsLayer = t.layers.find((l) => l.name === 'objects')!;
  objectsLayer.objects = [...oldLayer('objects'), ...renum(objectsLayer.objects!)] as Layer['objects'];
  const zonesLayer = t.layers.find((l) => l.name === 'zones')!;
  zonesLayer.objects = oldLayer('zones');
  const parcelsLayer = t.layers.find((l) => l.name === 'parcelles');
  if (parcelsLayer) parcelsLayer.objects = renum(parcelsLayer.objects!) as Layer['objects'];
  t.nextobjectid = next;
  t.properties = old.properties;
  writeFileSync(path, serializeTmj(t as Parameters<typeof serializeTmj>[0]));
  console.log(`    agrandie à ${Z} × ${Z}, l'ancienne carte en (${lx}, ${ly})`);
}
