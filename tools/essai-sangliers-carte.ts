// Essai hors jeu (chantier « sangliers ») : .art-preview/sangliers-carte.png, la forêt de l'ouest vue de très haut, avec les
// territoires de sangliers proposés et la ferme de Xéros. Rien de ce fichier n'entre dans le jeu : les bauges, leurs rayons et le
// nombre de bêtes sont des propositions, écrites ici seulement.
// Le fond est rendu comme .art-preview/monde.png (tools/world-preview.ts : mêmes cartes, même réduction, une case de 1,6 m = 4 px,
// soit 2,5 px par mètre), recadré de x 0 à 420 m et y 0 à 800 m du monde. Par-dessus : la teinte des trois sols de forêt, les
// bauges (symbole de sanglier), leurs cercles de jour et de nuit, la chaumière, la rivière, le pont, le sentier, le cabanon,
// une règle de 100 m, la plus courte distance d'un territoire de nuit à la chaumière, une légende.
// Lancer : npx tsx tools/essai-sangliers-carte.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import registry from '../art/tile-registry.json';
import { OUTLINE, world as P } from '../art/palette';
import { TILE } from '../src/config';
import propsJson from '../src/content/props.json';
import { maps } from '../src/generated/maps';
import { buildPlans } from './lib/build-plans';
import { blank, drawMap, put, rect, RenderKit, text as rawText, textWidth, toPng, type Img, type RGBA } from './lib/world-render';

/** Le texte de world-render, avec les deux-points que sa police n'a pas (dessinés à la main, liseré compris). */
function text(dst: Img, s: string, x: number, y: number, k: number, c: RGBA): void {
  rawText(dst, s.replace(/:/g, ' '), x, y, k, c);
  [...s].forEach((ch, i) => {
    if (ch !== ':') return;
    for (const r of [2, 5]) {
      rect(dst, x + (i * 6 + 1) * k, y + (r - 1) * k, k * 3, k * 3, [20, 14, 8, 255]);
      rect(dst, x + (i * 6 + 2) * k, y + r * k, k, k, c);
    }
  });
}

const F = 8; // réduction du monde (comme monde.png) : 1 px = 40 cm
const PXM = 100 / 5 / F; // px par mètre du monde : 2,5
const VIEW = { w: 420, h: 800 }; // m
const MAP_W = Math.round(VIEW.w * PXM);
const MAP_H = Math.round(VIEW.h * PXM);
const TOP = 56; // bandeau du titre
const PANEL = 660; // légende, à droite
const img = blank(MAP_W + PANEL, TOP + MAP_H + 8, [24, 18, 12, 255]);

const hex = (h: string, a = 255): RGBA => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];
/** Un point du monde (m) en px de la planche. */
const at = (x: number, y: number): [number, number] => [Math.round(x * PXM), TOP + Math.round(y * PXM)];

// ---------- le fond : les zones dans le cadre, rendues comme monde.png ----------
const kit = new RenderKit(F);
const props = propsJson as Record<string, { image: string; aged?: boolean }>;
const plans = buildPlans();
const zones = Object.values(maps).filter((m) => m.world && m.world.x / 20 < VIEW.w && m.world.y / 20 < VIEW.h);
for (const m of zones) {
  drawMap(img, kit, m, m.world!.x / F, TOP + m.world!.y / F, (t, age) => (props[t] ? props[t].image + (age && age !== 'new' && props[t].aged ? `-${age}` : '') : undefined), (p) => plans[p]?.size);
}

// ---------- la teinte des sols de forêt, case par case (calque ground) ----------
const names = (registry as { world: string[] }).world;
const SOILS = {
  deepwoods: { tint: [70, 34, 110, 120] as RGBA, swatch: [92, 62, 120, 255] as RGBA, label: 'FORET PROFONDE (DEEPWOODS)' },
  woods: { tint: [40, 120, 110, 70] as RGBA, swatch: [70, 120, 100, 255] as RGBA, label: 'SOUS-BOIS (WOODS)' },
  forest: { tint: [220, 180, 60, 70] as RGBA, swatch: [170, 160, 80, 255] as RGBA, label: 'LISIERE (FOREST)' },
};
const soilOf = (n: number) => {
  const s = names[n]?.replace(/\d+$/, '');
  return s === 'deepwoods' || s === 'woods' || s === 'forest' ? s : undefined;
};
const ts = TILE / F;
const pathCells: [number, number][] = []; // (m) les cases de sentier, pour trouver son bout ouest
const bridgeCells: [number, number][] = [];
const waterX: number[] = [];
for (const m of zones) {
  const ox = m.world!.x / F;
  const oy = TOP + m.world!.y / F;
  m.layers.ground.forEach((n, i) => {
    const cx = i % m.width;
    const cy = Math.floor(i / m.width);
    const s = soilOf(n);
    if (s) rect(img, ox + cx * ts, oy + cy * ts, ts, ts, SOILS[s].tint);
    const wx = (m.world!.x + cx * TILE) / 20 + 0.8;
    const wy = (m.world!.y + cy * TILE) / 20 + 0.8;
    const nm = names[n] ?? '';
    if (nm.startsWith('path-')) pathCells.push([wx, wy]);
    if (nm.startsWith('bridge')) bridgeCells.push([wx, wy]);
    if (nm.startsWith('water-') && wy > 0 && wy < 800 && wx > 200 && wx < 300) waterX.push(wx);
  });
}

// ---------- outils de tracé ----------
function disc(cx: number, cy: number, r: number, c: RGBA): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) put(img, cx + x, cy + y, c);
}
/** Un cercle de trait `w` px ; `dash` : longueur des tirets en px (0 = plein). */
function circle(cx: number, cy: number, r: number, c: RGBA, w = 1, dash = 0): void {
  const r2o = (r + w / 2) ** 2;
  const r2i = (r - w / 2) ** 2;
  for (let y = -r - w; y <= r + w; y++) {
    for (let x = -r - w; x <= r + w; x++) {
      const d = x * x + y * y;
      if (d > r2o || d < r2i) continue;
      if (dash) {
        const arc = (Math.atan2(y, x) + Math.PI) * r;
        if (Math.floor(arc / dash) % 2) continue;
      }
      put(img, cx + x, cy + y, c);
    }
  }
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGBA, w = 1, dash = 0): void {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let i = 0; i <= n; i++) {
    if (dash && Math.floor(i / dash) % 2) continue;
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    rect(img, x - Math.floor(w / 2), y - Math.floor(w / 2), w, w, c);
  }
}
/** Une image en pixels (lettres de `pal`, '.' transparent), agrandie de k, son coin en (x, y). */
function sprite(grid: string[], pal: Record<string, RGBA>, x: number, y: number, k: number): void {
  grid.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') rect(img, x + i * k, y + j * k, k, k, pal[ch]); }));
}
const textC = (s: string, cx: number, y: number, k: number, c: RGBA) => text(img, s, Math.round(cx - textWidth(s, k) / 2), y, k, c);

// ---------- le sanglier, de profil, groin à gauche (16 × 10) ----------
// Silhouette trapue, avant haut (garrot), crête de soies, groin plat, défense claire, queue courte.
const BOAR = [
  '.....K..K.K.K.K.....',
  '....KmKKmKmKmKmKK...',
  '....KmmmmmmmmmmmmmK.',
  '...KNNNNNNNNNNNNNNNK',
  '..KNNNNNNNNNNNNNNNNK',
  '.KNyNNNNNNNNNNNNNNNK',
  'KNNNNNNNNNNNNNNNNNNK',
  'KnNNNNNNNNNNNNNNNNK.',
  'KRKNNNNNNNNNNNNNNNK.',
  '.KKKNNNNNNNNNNNNNK..',
  '...KNNKKKKKKKKNNK...',
  '...KNK.......KNK....',
  '...KK........KK.....',
];
const BOAR_PAL: Record<string, RGBA> = { K: hex(OUTLINE), N: hex(P.N), m: hex(P.m), y: hex(P.y), R: hex(P.R), n: hex(P.n) };
const BK = 2; // agrandi deux fois : 32 × 20 px
function boarBadge(cx: number, cy: number): void {
  disc(cx, cy, 22, [244, 232, 200, 235]);
  circle(cx, cy, 22, hex(OUTLINE), 2);
  sprite(BOAR, BOAR_PAL, cx - 20, cy - 13, BK);
}

// ---------- les propositions ----------
const DAY_R = 10; // m : couchés à la bauge
const NIGHT_R = 60; // m : ils errent et fouillent
const DAY: RGBA = [255, 196, 40, 255];
const NIGHT: RGBA = [150, 215, 255, 255];
const WALLOWS = [
  { zone: 'NORD', x: 45, y: 90, n: 2 },
  { zone: 'PROFONDE', x: 40, y: 300, n: 1 },
  { zone: 'SUD', x: 50, y: 500, n: 2 },
  { zone: 'RONCES', x: 45, y: 700, n: 3 },
];
const COTTAGE = { x: 360, y: 284 };

// les aires de nuit d'abord (voile léger), puis les cercles, puis les badges
for (const w of WALLOWS) {
  const [cx, cy] = at(w.x, w.y);
  disc(cx, cy, NIGHT_R * PXM, [150, 215, 255, 26]);
}
for (const w of WALLOWS) {
  const [cx, cy] = at(w.x, w.y);
  circle(cx, cy, NIGHT_R * PXM, [20, 30, 50, 200], 4, 0);
  circle(cx, cy, NIGHT_R * PXM, NIGHT, 2, 7);
  disc(cx, cy, DAY_R * PXM, [255, 196, 40, 50]);
  circle(cx, cy, DAY_R * PXM, [40, 26, 8, 220], 4);
  circle(cx, cy, DAY_R * PXM, DAY, 2);
}
for (const w of WALLOWS) {
  const [cx, cy] = at(w.x, w.y);
  boarBadge(cx, cy);
  const label = `${w.n} BETE${w.n > 1 ? 'S' : ''}`;
  text(img, label, cx + 34, cy - 7, 2, [255, 240, 205, 255]);
}

// ---------- la plus courte distance d'un territoire de nuit à la chaumière ----------
const gaps = WALLOWS.map((w) => ({ w, d: Math.hypot(COTTAGE.x - w.x, COTTAGE.y - w.y) - NIGHT_R }));
const best = gaps.reduce((a, b) => (b.d < a.d ? b : a));
{
  const { w } = best;
  const L = Math.hypot(COTTAGE.x - w.x, COTTAGE.y - w.y);
  const ex = w.x + ((COTTAGE.x - w.x) * NIGHT_R) / L;
  const ey = w.y + ((COTTAGE.y - w.y) * NIGHT_R) / L;
  const [x0, y0] = at(ex, ey);
  const [x1, y1] = at(COTTAGE.x, COTTAGE.y);
  line(x0, y0, x1, y1, [20, 14, 8, 255], 4);
  line(x0, y0, x1, y1, [255, 90, 70, 255], 2, 6);
  disc(x0, y0, 4, [255, 90, 70, 255]);
  const s = `${Math.round(best.d)} M`;
  const mx = Math.round(x0 + (x1 - x0) * 0.4);
  const my = Math.round(y0 + (y1 - y0) * 0.4) - 62;
  textC(s, mx, my, 3, [255, 120, 100, 255]);
  textC('A VOL D OISEAU', mx, my + 28, 2, [255, 200, 190, 255]);
}

// ---------- les repères : rivière, pont, sentier, cabanon, chaumière ----------
const riverX = waterX.length ? waterX.reduce((a, b) => a + b, 0) / waterX.length : 270;
{
  const [rx] = at(riverX, 0);
  for (const [i, ch] of [...'RIVIERE'].entries()) text(img, ch, rx + 12, TOP + 560 + i * 18, 2, [190, 225, 255, 255]);
}
if (bridgeCells.length) {
  const bx = bridgeCells.reduce((a, c) => a + c[0], 0) / bridgeCells.length;
  const by = bridgeCells.reduce((a, c) => a + c[1], 0) / bridgeCells.length;
  const [x, y] = at(bx, by);
  circle(x, y, 9, [255, 255, 255, 230], 2);
  text(img, 'PONT', x + 14, y + 8, 2, [255, 255, 255, 255]);
}
// le bout ouest du sentier : la case de chemin la plus à l'ouest, à l'ouest de la rivière
const trail = pathCells.filter((c) => c[0] < riverX).sort((a, b) => a[0] - b[0]);
let trailEnd = 0;
if (trail.length) {
  const [tx, ty] = trail[0];
  trailEnd = tx;
  const [x, y] = at(tx, ty);
  rect(img, x - 1, y - 12, 3, 24, [255, 255, 255, 255]);
  text(img, 'FIN DU SENTIER', x - 6 - textWidth('FIN DU SENTIER', 2), y + 16, 2, [255, 255, 255, 255]);
  text(img, `X ${Math.round(tx)} M`, x - 6 - textWidth(`X ${Math.round(tx)} M`, 2), y + 36, 2, [255, 255, 255, 255]);
  const mid = trail[Math.floor(trail.length / 2)];
  const [sx, sy] = at(mid[0], mid[1]);
  textC('SENTIER', sx, sy + 12, 2, [255, 240, 205, 255]);
}
const farm = maps['ferme'];
const cabin = farm?.plans.find((p) => p.plan === 'cabane');
if (farm && cabin) {
  const cx = (farm.world!.x + cabin.x) / 20 + 3;
  const cy = (farm.world!.y + cabin.y) / 20 + 2;
  const [x, y] = at(cx, cy);
  circle(x, y, 10, [255, 255, 255, 230], 2);
  text(img, 'CABANON DU', x + 16, y - 6, 2, [255, 255, 255, 255]);
  text(img, 'CHASSEUR', x + 16, y + 12, 2, [255, 255, 255, 255]);
}
// la chaumière : une maison en pixels sur une pastille, et le nom de la ferme
const HOUSE = [
  '....KKK....',
  '...KYYYK...',
  '..KYYTYYK..',
  '.KYYYYYYYK.',
  'KKKKKKKKKKK',
  '.KSSSSSSSK.',
  '.KSKKSSzSK.',
  '.KSKKSSSSK.',
  '.KKKKKKKKK.',
];
const HOUSE_PAL: Record<string, RGBA> = { K: hex(OUTLINE), Y: [214, 176, 92, 255], T: [170, 128, 60, 255], S: hex(P.S), z: hex(P.N) };
{
  const [x, y] = at(COTTAGE.x, COTTAGE.y);
  disc(x, y, 15, [244, 232, 200, 235]);
  circle(x, y, 15, [200, 40, 30, 255], 2);
  sprite(HOUSE, HOUSE_PAL, x - 11, y - 9, 2);
  textC('CHAUMIERE', x, y - 58, 2, [255, 240, 205, 255]);
  textC('FERME DE XEROS', x, y - 38, 2, [255, 240, 205, 255]);
}

// ---------- les bords et noms des zones ----------
for (const m of zones) {
  const ox = m.world!.x / F;
  const oy = TOP + m.world!.y / F;
  const w = (m.width * TILE) / F;
  const h = (m.height * TILE) / F;
  rect(img, ox, oy, w, 1, [250, 240, 210, 150]);
  rect(img, ox, oy, 1, h, [250, 240, 210, 150]);
  if (ox >= MAP_W - 100) continue;
  const deep = m.world!.x === 0;
  text(img, m.name, ox + (deep ? 6 : 270), oy + 8, 2, [250, 236, 200, 255]);
  text(img, m.id, ox + (deep ? 6 : 270), oy + 26, 1, [200, 190, 160, 255]);
}
// le bord du cadre (420 m) et le bord sud du monde
rect(img, MAP_W, TOP, 2, MAP_H, [250, 240, 210, 255]);

// ---------- la règle de 100 m, en bas à gauche de la carte ----------
{
  const x = 20;
  const y = TOP + MAP_H - 30;
  const len = Math.round(100 * PXM);
  rect(img, x - 10, y - 30, len + 24, 50, [24, 18, 12, 210]);
  for (let i = 0; i < 4; i++) rect(img, x + Math.round((i * len) / 4), y, Math.round(len / 4), 6, i % 2 ? [24, 18, 12, 255] : [250, 240, 210, 255]);
  rect(img, x, y - 4, 2, 14, [250, 240, 210, 255]);
  rect(img, x + len - 2, y - 4, 2, 14, [250, 240, 210, 255]);
  text(img, '0', x - 4, y - 22, 2, [250, 240, 210, 255]);
  text(img, '50', x + Math.round(len / 2) - 11, y - 22, 2, [250, 240, 210, 255]);
  text(img, '100 M', x + len - textWidth('100 M', 2) + 6, y - 22, 2, [250, 240, 210, 255]);
}

// ---------- le titre ----------
textC('Les sangliers : ou ils vivent', (MAP_W + PANEL) / 2, 8, 3, [250, 236, 200, 255]);
textC('ESSAI HORS JEU - FORET DE L OUEST, X 0 A 420 M, Y 0 A 800 M - 2,5 PX PAR METRE, NORD EN HAUT', (MAP_W + PANEL) / 2, 36, 1, [200, 190, 160, 255]);

// ---------- la légende, à droite (fond plein : la carte s'arrête à 420 m) ----------
rect(img, MAP_W + 2, TOP, PANEL, MAP_H + 8, [24, 18, 12, 255]);
{
  const x0 = MAP_W + 22;
  const xt = x0 + 52;
  let y = TOP + 18;
  const T: RGBA = [250, 236, 200, 255];
  const D: RGBA = [200, 190, 160, 255];
  const RED: RGBA = [255, 120, 100, 255];
  const head = (s: string) => { text(img, s, x0, y, 3, [255, 214, 120, 255]); y += 36; };
  const row = (s: string, c = T, x = x0) => { text(img, s, x, y, 2, c); y += 20; };
  const two = (a: string, b: string, h: number) => { text(img, a, xt, y + h / 2 - 20, 2, T); text(img, b, xt, y + h / 2 + 2, 2, D); y += h; };

  head('LEGENDE');
  boarBadge(x0 + 22, y + 22);
  two('BAUGE, UNE PAR ZONE PROFONDE', 'ET NOMBRE DE BETES', 46);
  y += 8;
  disc(x0 + 20, y + 20, 10, [255, 196, 40, 50]);
  circle(x0 + 20, y + 20, 10, [40, 26, 8, 220], 4);
  circle(x0 + 20, y + 20, 10, DAY, 2);
  two('LE JOUR : COUCHES A LA BAUGE', `CERCLE PLEIN, RAYON ${DAY_R} M`, 46);
  y += 8;
  disc(x0 + 20, y + 20, 16, [150, 215, 255, 26]);
  circle(x0 + 20, y + 20, 16, [20, 30, 50, 200], 4);
  circle(x0 + 20, y + 20, 16, NIGHT, 2, 5);
  two('LA NUIT : ILS ERRENT, FOUILLENT', `TIRETS, RAYON ${NIGHT_R} M`, 46);
  y += 8;
  line(x0 + 2, y + 20, x0 + 38, y + 20, [20, 14, 8, 255], 4);
  line(x0 + 2, y + 20, x0 + 38, y + 20, [255, 90, 70, 255], 2, 6);
  two('PLUS COURTE DISTANCE', 'TERRITOIRE DE NUIT - CHAUMIERE', 46);
  y += 8;
  disc(x0 + 20, y + 20, 15, [244, 232, 200, 235]);
  circle(x0 + 20, y + 20, 15, [200, 40, 30, 255], 2);
  sprite(HOUSE, HOUSE_PAL, x0 + 9, y + 11, 2);
  two('LA CHAUMIERE DE XEROS', `(${COTTAGE.x}, ${COTTAGE.y}) M DU MONDE`, 46);
  y += 8;
  circle(x0 + 20, y + 20, 9, [255, 255, 255, 230], 2);
  two('REPERE : PONT, CABANON', 'DU CHASSEUR, BOUT DU SENTIER', 46);
  y += 14;
  for (const s of Object.values(SOILS)) {
    rect(img, x0 + 4, y, 34, 20, s.swatch);
    text(img, s.label, xt, y + 3, 2, T);
    y += 30;
  }
  y += 24;

  head('LES BAUGES');
  for (const g of gaps) {
    row(`${g.w.zone} (${g.w.x}, ${g.w.y}) M : ${g.w.n} BETE${g.w.n > 1 ? 'S' : ''}`);
    row(`  LA NUIT A ${Math.round(g.d)} M DE LA CHAUMIERE`, g === best ? RED : D);
    y += 10;
  }
  y += 24;
  head('A RETENIR');
  const far = Math.round(Math.max(...WALLOWS.map((w) => w.x)) + NIGHT_R);
  for (const [s, c] of [
    [`LE TERRITOIRE LE PLUS PROCHE (${best.w.zone})`, T],
    [`EST A ${Math.round(best.d)} M DE LA CHAUMIERE.`, RED],
    ['', D],
    [`LA NUIT, AUCUN NE DEPASSE X ${far} M :`, D],
    [`NI LA RIVIERE (X ${Math.round(riverX)} M),`, D],
    ...(trailEnd ? [[`NI LE BOUT DU SENTIER (X ${Math.round(trailEnd)} M,`, D], [`${Math.round(trailEnd - (best.w.x + NIGHT_R))} M A L EST DU TERRITOIRE ${best.w.zone}).`, D]] : []),
    ['', D],
    ['LES BAUGES SONT DANS LA FORET', D],
    ['PROFONDE (X 0 A 105 M), A L OUEST', D],
    ['DU SOUS-BOIS.', D],
  ] as [string, RGBA][]) row(s, c);
}

mkdirSync('.art-preview', { recursive: true });
writeFileSync('.art-preview/sangliers-carte.png', toPng(img as Img));
console.log(`.art-preview/sangliers-carte.png : ${img.w} × ${img.h} px ; plus courte distance nuit-chaumière : ${Math.round(best.d)} m (${best.w.zone}) ; rivière x ${Math.round(riverX)} m ; bout du sentier x ${Math.round(trailEnd)} m`);
