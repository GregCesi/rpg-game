// Plans du chemin creux (chantier « relief », troisièmes plans) : des SCHÉMAS en gros aplats, pas des dessins.
// Planche : .art-preview/relief-plans.png (npx tsx tools/essai-relief-plans.ts). Rien de ce fichier n'entre dans le jeu.
// (Les plans d'avant : art/proposals/relief-plans-v1.ts, le double talus ; relief-plans-v2.ts, le trou rond lisse.)
//
// La forme (Grégoire) : les parois descendent en demi-escalier, par gradins, du dessus de la terre jusqu'au chemin.
// Chaque gradin porte de petits arbres et des buissons penchés vers le chemin, le dessus porte les grands arbres penchés ;
// racines et lierre pendent d'un gradin à l'autre. Ce sont les gradins et leur végétation qui referment le cercle.
//
// Les mesures, en mètres depuis le milieu du chemin (h depuis le chemin) :
//   chemin ±1,25 ; quatre contremarches de 1,25 m aux distances 1,25 / 2,25 / 3,25 / 4,25 ; trois gradins de 1 m ; le dessus à 5 m.
//   Le cercle (l'enveloppe) passe par (±1,25 ; 0) et (±4,25 ; 5) : centre à 4,15 m, rayon 4,33 m, haut à 8,48 m.
//
// Trois parties, de haut en bas :
//   1. la coupe nord-sud côté ferme (nord à gauche) ;
//   2. la même coupe au-dessus de la rivière ;
//   3. ce que voit le joueur : deux écrans de 427 × 240 px (agrandis x2), Xéros les pieds à la ligne 130 ;
//   puis la légende des couleurs.

import type { Grid, Palette } from '../lib/canvas';
import xeros from '../characters/xeros';

export type Rgb = [number, number, number];

/** Ce que le schéma demande à la feuille (la `Sheet` de tools/lib/audit-preview.ts le fournit). */
export interface PlanSurface {
  readonly w: number;
  readonly h: number;
  dot(x: number, y: number, c: Rgb, a?: number): void;
  text(s: string, x: number, y: number, c: Rgb, k?: number): void;
  blit(grid: Grid, palette: Palette, ox: number, oy: number, k: number, rows?: [number, number]): void;
}

export const PLAN_W = 1800;
export const PLAN_H = 4600;
export const PLAN_BG: Rgb = [40, 44, 36];

// ---------- la palette, la même partout ----------

const BG = PLAN_BG;
const WHITE: Rgb = [245, 245, 235];
const GOLD: Rgb = [245, 215, 120];

const EARTH: Rgb = [146, 100, 60]; // la terre
const EARTH_DARK: Rgb = [100, 66, 38]; // la terre au bord de l'air (les contremarches)
const EARTH_LIGHT: Rgb = [176, 128, 82]; // la terre éclairée (les contremarches vues du jeu)
const GRASS: Rgb = [92, 162, 62]; // l'herbe du dessus et des gradins
const SKY: Rgb = [204, 230, 248]; // le ciel
const PATH: Rgb = [242, 234, 210]; // le chemin
const WATER: Rgb = [60, 126, 204]; // l'eau
const CUT: Rgb = [84, 50, 32]; // la terre en coupe
const CUT_HATCH: Rgb = [150, 100, 64];
const FARM: Rgb = [184, 218, 124]; // le sol de la ferme, en pleine lumière
const IVY: Rgb = [34, 86, 36]; // le lierre
const ROOT: Rgb = [66, 40, 22]; // les racines
const TRUNK: Rgb = [92, 58, 32];
const LEAF: Rgb = [42, 104, 50];
const LEAF_EDGE: Rgb = [24, 66, 30];
const BUSH: Rgb = [70, 134, 54]; // les buissons des gradins
const LIGHT: Rgb = [255, 236, 150];

/** Ce qui est rendu transparent : son contour en pointillé clair, et une teinte très légère par-dessus. */
const GHOST_A = 0.13;
const GHOST_TINT: Rgb = [235, 245, 255];
const GHOST_LINE: Rgb = [250, 250, 235];

// ---------- la forme (en mètres, depuis le milieu du chemin) ----------

const TOP = 5; // le dessus de la masse
const PATH_HALF = 1.25;
const STEP_H = 1.25; // hauteur d'une contremarche
const STEP_D = 1; // profondeur d'un gradin
const RISERS = [1.25, 2.25, 3.25, 4.25]; // la distance de chaque contremarche au milieu
const EDGE = RISERS[3]; // le bord du dessus
const CY = 4.15; // centre du cercle-enveloppe
const R = Math.sqrt(PATH_HALF ** 2 + CY ** 2); // 4,33 m

/** La hauteur du sol à la distance a du milieu (dans la masse) ; le bord des contremarches un peu irrégulier (de la terre). */
function groundAt(a: number, hh: number): number {
  const wob = 0.05 * Math.sin(hh * 7.3) + 0.03 * Math.sin(hh * 17);
  for (let i = 0; i < RISERS.length; i++) if (a <= RISERS[i] + wob) return i * STEP_H;
  return TOP;
}

// ---------- primitives ----------

let S: PlanSurface;

function rect(x: number, y: number, w: number, h: number, c: Rgb, a = 1): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) S.dot(x + i, y + j, c, a);
}
function frame(x: number, y: number, w: number, h: number, c: Rgb, t = 2): void {
  rect(x - t, y - t, w + 2 * t, t, c);
  rect(x - t, y + h, w + 2 * t, t, c);
  rect(x - t, y, t, h, c);
  rect(x + w, y, t, h, c);
}
/** Trait épais de t px. */
function line(x0: number, y0: number, x1: number, y1: number, c: Rgb, t = 3, dash = 0): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  const o = Math.floor(t / 2);
  for (let k = 0; k <= n; k++) {
    if (dash && Math.floor(k / dash) % 2 === 1) continue;
    rect(Math.round(x0 + ((x1 - x0) * k) / n) - o, Math.round(y0 + ((y1 - y0) * k) / n) - o, t, t, c);
  }
}
function arrow(x0: number, y0: number, x1: number, y1: number, c: Rgb = WHITE, t = 3): void {
  line(x0, y0, x1, y1, c, t);
  const l = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / l;
  const uy = (y1 - y0) / l;
  const size = 12;
  for (const s of [1, -1]) line(Math.round(x1 - size * ux - s * size * 0.55 * uy), Math.round(y1 - size * uy + s * size * 0.55 * ux), x1, y1, c, t);
}
function disc(cx: number, cy: number, r: number, c: Rgb, a = 1): void {
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) S.dot(cx + i, cy + j, c, a);
}
function fillPoly(pts: [number, number][], c: Rgb, a = 1): void {
  const ys = pts.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + ((y + 0.5 - ay) * (bx - ax)) / (by - ay));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) S.dot(x, y, c, a);
  }
}
/** Hachures de la terre en coupe (diagonales). */
const hatchAt = (x: number, y: number, step = 8) => (x - y + 100000) % step < 2;

const tw = (s: string, k = 3) => s.length * 4 * k - k;
/** La police n'a ni point-virgule ni guillemets. */
const clean = (s: string) => s.replace(/ ;/g, ',').replace(/;/g, ',').replace(/[«»"]/g, '');
function text(s: string, x: number, y: number, c: Rgb = WHITE, k = 3): void {
  S.text(clean(s), x, y, c, k);
}
/** Une étiquette sur un fond sombre, lisible sur n'importe quel aplat. */
function tag(s: string, x: number, y: number, k = 3, c: Rgb = WHITE): void {
  rect(x - 5, y - 5, tw(s, k) + 10, 5 * k + 10, BG, 0.88);
  text(s, x, y, c, k);
}
/** Coupe un texte en lignes d'au plus `max` caractères. */
function wrap(s: string, max: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of s.split(' ')) {
    if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) out.push(cur);
  return out;
}
/** Un titre (or, gros) et une ou deux phrases dessous ; rend la hauteur prise. */
function heading(title: string, caption: string, x: number, y: number, width: number): number {
  text(title, x, y, GOLD, 6);
  const lines = wrap(clean(caption), Math.floor(width / 12));
  lines.forEach((l, i) => text(l, x, y + 50 + i * 24, WHITE, 3));
  return 50 + lines.length * 24 + 18;
}
/** Un texte de plusieurs lignes ; rend la hauteur prise. */
function para(s: string, x: number, y: number, width: number, k = 3): number {
  const lines = wrap(clean(s), Math.floor(width / (4 * k)));
  lines.forEach((l, i) => text(l, x, y + i * 8 * k, WHITE, k));
  return lines.length * 8 * k;
}

// ---------- Xéros, son vrai sprite (image 0 de idle-down, rangées 14 à 45 : 32 px, 1,60 m) ----------

const XEROS_GRID = xeros.animations['idle-down'].frames[0];
const XEROS_ROWS: [number, number] = [14, 45];
const XEROS_CX = (() => {
  let x0 = Infinity;
  let x1 = -1;
  XEROS_GRID.forEach((row, y) => {
    if (y < XEROS_ROWS[0] || y > XEROS_ROWS[1]) return;
    [...row].forEach((ch, x) => { if (ch !== '.') { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } });
  });
  return (x0 + x1 + 1) / 2;
})();
/** Xéros, les pieds en (x, y), à k px par pixel du jeu (k = 3 : 60 px par mètre). */
function drawXeros(x: number, y: number, k: number): void {
  S.blit(XEROS_GRID, xeros.palette, Math.round(x - XEROS_CX * k), y - (XEROS_ROWS[1] + 1) * k, k, XEROS_ROWS);
}

// ---------- 1 et 2 : les coupes nord-sud ----------

interface Tree { base: [number, number]; top: [number, number]; trunk: number; crown: [number, number, number] }

/** Les arbres du côté sud (m > 0) ; le nord est leur miroir, un peu décalé. Chacun penche vers le chemin. */
const SOUTH_TREES: Tree[] = [
  // le dessus : les grands arbres (tronc 30 cm, 7 m), le premier penché au-dessus du chemin
  { base: [7.6, TOP], top: [6.7, 11.0], trunk: 0.3, crown: [6.5, 11.0, 1.6] },
  { base: [5.0, TOP], top: [1.7, 8.9], trunk: 0.3, crown: [1.35, 9.2, 1.6] },
  // gradin 3 (h 3,75), gradin 2 (h 2,5), gradin 1 (h 1,25) : petits arbres (tronc 18 cm, 3 à 4 m)
  { base: [3.8, 3 * STEP_H], top: [2.95, 6.8], trunk: 0.18, crown: [2.85, 7.0, 1.0] },
  { base: [2.8, 2 * STEP_H], top: [1.95, 5.6], trunk: 0.18, crown: [1.9, 5.75, 0.95] },
  { base: [1.8, STEP_H], top: [1.05, 4.3], trunk: 0.18, crown: [0.95, 4.4, 0.85] },
];
const mirror = (t: Tree, d: number): Tree => ({
  base: [-t.base[0], t.base[1]], top: [-t.top[0], t.top[1] + d], trunk: t.trunk, crown: [-t.crown[0], t.crown[1] + d, t.crown[2]],
});
const TREES: Tree[] = SOUTH_TREES.flatMap((t, i) => [t, mirror(t, i % 2 ? 0.12 : -0.1)]);
/** Les buissons de chaque gradin (m, h, rayon), côté sud ; le nord en miroir. */
const SOUTH_BUSHES: [number, number, number][] = [
  [2.15, STEP_H, 0.35], [1.45, STEP_H, 0.25],
  [3.15, 2 * STEP_H, 0.3], [2.45, 2 * STEP_H, 0.28],
  [4.12, 3 * STEP_H, 0.32], [3.45, 3 * STEP_H, 0.26],
  [4.6, TOP, 0.35],
];

interface Section {
  x: number;
  y: number;
  w: number;
  h: number;
  /** px par mètre */
  ppm: number;
  /** hauteur du haut du cadre, en m */
  top: number;
  /** la masse s'arrête à cette distance du milieu (m), par une face ; sans : sur toute la largeur */
  faces?: number;
  /** dehors, au pied des faces : l'eau ou le sol de la ferme */
  outside?: 'water' | 'farm';
}

type Cell = 'sky' | 'earth' | 'grass' | 'path' | 'water' | 'farm';

function cellAt(sec: Section, m: number, hh: number): Cell {
  const face = sec.faces === undefined ? Infinity : sec.faces + Math.max(0, TOP - hh) * 0.15;
  if (Math.abs(m) > face) {
    if (hh > 0) return 'sky';
    if (sec.outside === 'water') return hh > -1.6 ? 'water' : 'earth';
    return hh > -0.2 ? 'farm' : 'earth';
  }
  const g = groundAt(Math.abs(m), hh);
  if (hh > g) return 'sky';
  if (g > 0 && hh > g - 0.14) return 'grass';
  if (g === 0 && hh > -0.22) return 'path';
  return 'earth';
}
const CELL_COLOR: Record<Cell, Rgb> = { sky: SKY, earth: EARTH, grass: GRASS, path: PATH, water: WATER, farm: FARM };

function drawTree(tr: Tree, X: (m: number) => number, Y: (h: number) => number, ppm: number): void {
  const w0 = tr.trunk / 2 + 0.03;
  const w1 = tr.trunk / 2 - 0.02;
  fillPoly([[X(tr.base[0] - w0), Y(tr.base[1])], [X(tr.base[0] + w0), Y(tr.base[1])], [X(tr.top[0] + w1), Y(tr.top[1])], [X(tr.top[0] - w1), Y(tr.top[1])]], TRUNK);
}
function drawCrown(tr: Tree, X: (m: number) => number, Y: (h: number) => number, ppm: number): void {
  const [mx, my, r] = tr.crown;
  disc(X(mx), Y(my), Math.round(r * ppm), LEAF_EDGE);
  disc(X(mx), Y(my), Math.round(r * ppm) - 3, LEAF);
}

function drawSection(sec: Section): { X: (m: number) => number; Y: (h: number) => number } {
  const cx = sec.x + sec.w / 2;
  const X = (m: number) => Math.round(cx + m * sec.ppm);
  const Y = (hh: number) => Math.round(sec.y + (sec.top - hh) * sec.ppm);
  // tout ce que la coupe dessine reste dans son cadre
  const outer = S;
  S = { w: outer.w, h: outer.h, text: outer.text.bind(outer), blit: outer.blit.bind(outer),
    dot: (x, y, c, a) => { if (x >= sec.x && x < sec.x + sec.w && y >= sec.y && y < sec.y + sec.h) outer.dot(x, y, c, a); } };
  const cells: Cell[][] = [];
  for (let j = 0; j < sec.h; j++) {
    const row: Cell[] = [];
    for (let i = 0; i < sec.w; i++) row.push(cellAt(sec, (sec.x + i - cx) / sec.ppm, sec.top - j / sec.ppm));
    cells.push(row);
  }
  // aplats ; la terre qui touche l'air (les contremarches, les faces) plus sombre sur quelques px
  const dark = Math.max(3, Math.round(sec.ppm / 12));
  for (let j = 0; j < sec.h; j++) for (let i = 0; i < sec.w; i++) {
    const c = cells[j][i];
    let col = CELL_COLOR[c];
    if (c === 'earth') {
      for (let d = 1; d <= dark && col !== EARTH_DARK; d++) {
        for (const [di, dj] of [[d, 0], [-d, 0], [0, -d]]) if (cells[j + dj]?.[i + di] === 'sky') col = EARTH_DARK;
      }
    }
    S.dot(sec.x + i, sec.y + j, col);
  }
  const t = Math.max(2, Math.round(sec.ppm / 22));
  // le lierre et les racines : ils pendent de chaque lèvre jusqu'au gradin du dessous (ou au chemin)
  for (const s of [-1, 1]) {
    for (let r = 0; r < RISERS.length; r++) {
      const hTop = (r + 1) * STEP_H;
      const hLow = r * STEP_H;
      for (let i = 0; i < 4; i++) {
        const m0 = s * (RISERS[r] - 0.06 - i * 0.09);
        const len = 0.55 + (((i * 5 + r * 3 + (s > 0 ? 2 : 0)) % 7) / 6) * (STEP_H - 0.7);
        const end = Math.max(hLow + 0.08, hTop - len);
        const col = (i + r) % 3 === 0 ? ROOT : IVY;
        const n = Math.round((hTop - end) * sec.ppm);
        for (let k = 0; k <= n; k++) {
          const wob = Math.round(Math.sin(k / 8 + i + r) * (t / 2));
          rect(X(m0) + wob, Y(hTop) + k, t, 1, col);
          if (col === IVY && k % 9 === 4) rect(X(m0) + wob - t, Y(hTop) + k, t * 3, t, IVY);
        }
      }
    }
  }
  // les buissons, puis les arbres (troncs d'abord, houppiers par-dessus)
  for (const [m, hh, r] of SOUTH_BUSHES) for (const s of [-1, 1]) {
    disc(X(s * m), Y(hh + r * 0.7), Math.round(r * sec.ppm), LEAF_EDGE);
    disc(X(s * m), Y(hh + r * 0.7), Math.round(r * sec.ppm) - 2, BUSH);
  }
  const inFrame = (tr: Tree) => sec.faces === undefined || Math.abs(tr.base[0]) < sec.faces;
  for (const tr of TREES) if (inFrame(tr)) drawTree(tr, X, Y, sec.ppm);
  for (const tr of TREES) if (inFrame(tr)) drawCrown(tr, X, Y, sec.ppm);
  // le cercle-enveloppe, en pointillé épais
  const steps = Math.round(2 * Math.PI * R * sec.ppm);
  const dot = Math.max(3, Math.round(sec.ppm / 15));
  for (let k = 0; k < steps; k++) {
    if (Math.floor(k / 9) % 2) continue;
    const a = (2 * Math.PI * k) / steps;
    rect(X(R * Math.sin(a)) - 1, Y(CY + R * Math.cos(a)) - 1, dot, dot, WHITE);
  }
  drawXeros(X(0), Y(0), sec.ppm / 20);
  S = outer;
  frame(sec.x, sec.y, sec.w, sec.h, WHITE, 2);
  return { X, Y };
}

/** Une cote horizontale (de xa à xb) avec son texte centré dessous. */
function hDim(xa: number, xb: number, y: number, label: string, k = 3, below = true): void {
  const xm = Math.round((xa + xb) / 2);
  arrow(xm, y, xa, y, WHITE, 3);
  arrow(xm, y, xb, y, WHITE, 3);
  rect(xa - 1, y - 10, 3, 21, WHITE);
  rect(xb - 1, y - 10, 3, 21, WHITE);
  tag(label, xm - Math.round(tw(label, k) / 2), below ? y + 16 : y - 16 - 5 * k, k);
}

function partFarm(y: number): number {
  const width = PLAN_W - 100;
  y += heading('1. LA COUPE COTE FERME',
    'Du nord (a gauche) au sud. Les parois descendent en gradins, du dessus jusqu au chemin. Des arbres a chaque etage, penches vers le chemin. Le cercle en pointille : en bas la terre en gradins, en haut les houppiers.',
    50, y, width);
  const sec: Section = { x: 50, y, w: width, h: Math.round(14.2 * 60), ppm: 60, top: 12.9 };
  const { X, Y } = drawSection(sec);
  tag('NORD', sec.x + 16, sec.y + 16, 5, GOLD);
  tag('SUD', sec.x + sec.w - 16 - tw('SUD', 5), sec.y + 16, 5, GOLD);
  // les hauteurs : un trait par niveau, à travers la terre du sud, et la cote
  for (let i = 1; i <= 4; i++) {
    const hh = i * STEP_H;
    line(X(RISERS[i - 1] + (i < 4 ? STEP_D * 0.6 : 0.4)), Y(hh), X(11.3), Y(hh), WHITE, 2, 8);
    const label = i === 4 ? '5 M' : `${(hh).toFixed(2).replace('.', ',')} M`;
    tag(label, X(11.5), Y(hh) - 10, 4);
  }
  line(X(-1.3), Y(0), X(11.3), Y(0), WHITE, 2, 8);
  tag('0', X(11.5), Y(0) - 10, 4);
  // sous le chemin : le chemin et les gradins du sud, en largeur
  const yd = Y(-0.55);
  hDim(X(-PATH_HALF), X(PATH_HALF), yd, 'CHEMIN 2,5 M', 4);
  for (let i = 0; i < 3; i++) hDim(X(RISERS[i]), X(RISERS[i + 1]), yd, '1 M', 4);
  // l'ouverture en haut
  hDim(X(-EDGE), X(EDGE), Y(TOP) - 2, 'OUVERTURE 8,5 M', 4, false);
  // les noms, côté nord, sur la terre
  tag('LE DESSUS', X(-13.6), Y(TOP + 0.8), 4);
  tag('GRADIN 3', X(-8.4), Y(3.75) - 12, 4);
  arrow(X(-8.4) + tw('GRADIN 3', 4) + 12, Y(3.75) - 2, X(-3.85), Y(3.85));
  tag('GRADIN 2', X(-8.4), Y(2.5) - 12, 4);
  arrow(X(-8.4) + tw('GRADIN 2', 4) + 12, Y(2.5) - 2, X(-2.85), Y(2.6));
  tag('GRADIN 1', X(-8.4), Y(1.25) - 12, 4);
  arrow(X(-8.4) + tw('GRADIN 1', 4) + 12, Y(1.25) - 2, X(-1.85), Y(1.35));
  tag('LIERRE ET RACINES', X(-13.6), Y(0.4), 4);
  tag("D'UN GRADIN A L'AUTRE", X(-13.6), Y(0.4) + 32, 3);
  arrow(X(-13.6) + tw('LIERRE ET RACINES', 4) + 12, Y(0.4) + 8, X(-1.35), Y(0.7));
  // le cercle
  tag('LE CERCLE : HAUT 8,48 M', X(-12.6), Y(8.5) - 10, 4);
  arrow(X(-12.6) + tw('LE CERCLE : HAUT 8,48 M', 4) + 12, Y(8.5), X(-0.3), Y(8.46), WHITE, 3);
  tag('LES HOUPPIERS FERMENT LE HAUT', X(-13.6), Y(11.6), 4, GOLD);
  // Xéros
  tag('XEROS 1,70 M', X(0.4), Y(0.9), 3);
  return y + sec.h + 110;
}

function partRiver(y: number): number {
  const width = PLAN_W - 100;
  y += heading('2. LA MEME COUPE, AU-DESSUS DE LA RIVIERE',
    'Les memes gradins. De chaque cote, au moins 6 m de dessus plat, puis la terre descend dans l eau. L eau reste dehors, au niveau du chemin.',
    50, y, width);
  const ppm = 40;
  const w = 34 * ppm;
  const sec: Section = { x: 50 + Math.round((width - w) / 2), y, w, h: Math.round(13.4 * ppm), ppm, top: 11.4, faces: EDGE + 6, outside: 'water' };
  const { X, Y } = drawSection(sec);
  tag('NORD', sec.x + 12, sec.y + 12, 4, GOLD);
  tag('SUD', sec.x + sec.w - 12 - tw('SUD', 4), sec.y + 12, 4, GOLD);
  tag("L'EAU", X(-16.2), Y(-0.75), 4);
  tag("L'EAU", X(13.9), Y(-0.75), 4);
  for (const s of [-1, 1]) {
    const a = X(s * EDGE);
    const b = X(s * (EDGE + 6));
    hDim(Math.min(a, b), Math.max(a, b), Y(3.6), '6 M', 4);
  }
  const msg = "L'EAU RESTE DEHORS, CONTRE LA TERRE : JAMAIS DANS LE TROU";
  tag(msg, sec.x + Math.round((sec.w - tw(msg, 4)) / 2), sec.y + sec.h + 24, 4, GOLD);
  return y + sec.h + 90;
}

// ---------- 3 : ce que voit le joueur ----------

const GW = 427;
const GH = 240;
const FEET = 130;

/** Les lignes du nord, depuis les pieds (px, négatif = plus haut) : contremarche, gradin, contremarche... */
const N_RISER = [[-50, -25], [-95, -70], [-140, -115]] as const;
const N_STEP = [[-70, -50], [-115, -95]] as const;
/** Les lèvres sud (vues du dessus, cachées par la masse sud) : dessus, gradin 3, gradin 2, gradin 1. */
const S_LIPS = [-15, -10, -5, 0];

type Shot = 'farm' | 'mouth';

/** Un écran du jeu (427 × 240), agrandi x2. Les lignes sont comptées depuis les pieds de Xéros (bas positif). */
function screen(ox: number, oy: number, shot: Shot): void {
  const k = 2;
  const cx = Math.floor(GW / 2);
  const face = shot === 'mouth' ? cx + 40 : GW + 10; // Xéros 2 m (40 px) à l'intérieur
  const inside = (x: number) => x < face;
  const px = (x: number, y: number, c: Rgb, a = 1) => {
    if (x < 0 || y < 0 || x >= GW || y >= GH) return;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) S.dot(ox + x * k + i, oy + y * k + j, c, a);
  };
  const row = (r: number) => FEET + r;
  // le fond : la ferme dehors, et dedans les contremarches et les gradins du nord, le chemin, la masse sud en coupe
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const r = y - FEET;
    let c: Rgb;
    if (x >= face + 3) c = r >= -25 && r < 25 ? PATH : FARM;
    else if (x >= face) c = EARTH_DARK; // la face est, vue par la tranche
    else if (r >= 25) c = hatchAt(x, y, 7) ? CUT_HATCH : CUT;
    else if (r >= -25) c = PATH;
    else if (N_STEP.some(([a, b]) => r >= a && r < b)) c = GRASS;
    else c = r >= -28 || N_RISER.some(([a]) => r >= a && r < a + 3) ? EARTH_DARK : EARTH_LIGHT;
    px(x, y, c);
  }
  // le lierre et les racines, de chaque lèvre nord jusqu'au gradin du dessous
  for (const [lip, foot] of N_RISER) {
    for (let x = 2; x < face - 2; x += 7) {
      const len = 6 + ((x * 13 + lip) % 17);
      const n = Math.min(len, foot - lip - 1);
      const col = (x + lip) % 21 === 0 ? ROOT : IVY;
      for (let j = 0; j < n; j++) px(x + ((j >> 2) % 2), row(lip) + j, col);
      if (col === IVY) for (let j = 3; j < n; j += 4) px(x - 1 + (j % 3), row(lip) + j, IVY);
    }
  }
  // les buissons des gradins nord
  for (const [a, b] of N_STEP) for (let x = 18; x < face - 6; x += 46) {
    const yy = row(b) - 4;
    for (let j = -5; j <= 3; j++) for (let i = -7; i <= 7; i++) if ((i * i) / 49 + (j * j) / 25 <= 1) px(x + ((a * 3) % 13) + i, yy + j, (i * i) / 49 + (j * j) / 25 > 0.6 ? LEAF_EDGE : BUSH);
  }
  // les arbres du nord : gradin 2 (pied à −105, houppier qui n'entre que par son bas), gradin 1 (pied à −60, houppier vers −97)
  const crownN = (x0: number, yc: number, r: number) => {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const d = i * i + j * j;
      if (d <= r * r && inside(x0 + i)) px(x0 + i, row(yc) + j, d > (r - 2) * (r - 2) ? LEAF_EDGE : LEAF);
    }
  };
  const trunkN = (x0: number, r0: number, r1: number, w: number) => {
    for (let r = r1; r <= r0; r++) for (let i = 0; i < w; i++) if (inside(x0 + i)) px(x0 + i + Math.round((r0 - r) / 30), row(r), TRUNK);
  };
  for (const x0 of [70, 250, 370]) { trunkN(x0, -105, -135, 4); crownN(x0 + 2, -143, 18); }
  for (const x0 of [20, 150, 300]) { trunkN(x0, -60, -108, 4); crownN(x0 + 3, -98, 17); }
  // la lumière du dehors, sur les premiers mètres
  if (shot === 'mouth') for (let y = 0; y < FEET + 25; y++) for (let x = face - 70; x < face; x++) px(x, y, LIGHT, 0.45 * ((x - face + 70) / 70));
  // par-dessus, ce qui devient transparent : la masse sud (son dessus et ses gradins cachés, de −15 à +25)
  // et ses arbres penchés vers le nord. Une teinte très légère, le contour de chaque forme en pointillé clair.
  const mask: number[][] = Array.from({ length: GH }, () => new Array<number>(GW).fill(0));
  const put = (x: number, y: number, id: number) => { if (x >= 0 && inside(x) && y >= 0 && y < GH) mask[y][x] = id; };
  let id = 1;
  for (let y = row(S_LIPS[0]); y < row(25); y++) for (let x = 0; x < GW; x++) put(x, y, id);
  const ghostTree = (x0: number, base: number, top: number, w: number, ccy: number, rc: number) => {
    id++;
    for (let r = top; r <= base; r++) for (let i = 0; i < w; i++) put(x0 + i, row(r), id);
    id++;
    for (let j = -rc; j <= rc; j++) for (let i = -rc; i <= rc; i++) if (i * i + j * j <= rc * rc) put(x0 + 2 + i, row(ccy) + j, id);
  };
  // le dessus sud : grands arbres, pied à 0, tronc qui sort par le haut, houppier centré vers −150 (n'entre que son bas)
  for (const x0 of [120, 330]) ghostTree(x0, 0, -130, 6, -152, 30);
  // gradins 3, 2, 1 sud : pied à +2, +7, +12 ; houppier vers −80, −74, −70
  for (const x0 of [30, 280]) ghostTree(x0, 2, -80, 4, -82, 19);
  for (const x0 of [190, 400]) ghostTree(x0, 7, -74, 4, -76, 18);
  for (const x0 of [75, 245]) ghostTree(x0, 12, -68, 4, -70, 17);
  const same = (x: number, y: number, v: number) => x < 0 || y < 0 || x >= GW || y >= GH || !inside(x) || mask[y][x] === v;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const v = mask[y][x];
    if (!v) continue;
    px(x, y, GHOST_TINT, GHOST_A);
    const edge = !same(x - 1, y, v) || !same(x + 1, y, v) || !same(x, y - 1, v) || !same(x, y + 1, v);
    if (edge && (x + y) % 4 < 2) px(x, y, GHOST_LINE);
  }
  // les lèvres sud cachées (gradins 3, 2, 1), en pointillé plus lâche
  for (const r of S_LIPS.slice(1)) for (let x = 0; x < face; x++) if (x % 6 < 2) px(x, row(r), GHOST_LINE);
  drawXeros(ox + cx * k, oy + FEET * k, k);
  frame(ox, oy, GW * k, GH * k, WHITE, 2);
  if (shot === 'mouth') {
    tag('LA FERME', ox + (face + 16) * k, oy + 12 * k, 3);
    arrow(ox + (GW - 10) * k, oy + (FEET - 40) * k, ox + (face - 30) * k, oy + (FEET - 40) * k, LIGHT, 7);
    tag('LA LUMIERE ENTRE', ox + (face + 16) * k, oy + (FEET - 70) * k, 3);
  }
}

/** La règle des lignes, à droite de l'écran : chaque ligne depuis les pieds. */
function ruler(x: number, oy: number): void {
  const marks: [number, string][] = [[-130, '-130'], [-115, '-115'], [-95, '-95'], [-70, '-70'], [-50, '-50'], [-25, '-25'], [-15, '-15'], [0, '0 PIEDS'], [25, '+25']];
  rect(x, oy, 3, GH * 2, WHITE);
  for (const [r, s] of marks) {
    const yy = oy + (FEET + r) * 2;
    rect(x, yy - 1, 14, 3, r === 0 ? GOLD : WHITE);
    text(s, x + 20, yy - 6, r === 0 ? GOLD : WHITE, 3);
  }
}

function partScreens(y: number): number {
  const width = PLAN_W - 100;
  y += heading('3. CE QUE VOIT LE JOUEUR',
    'Le jeu regarde depuis le sud, de biais. Derriere Xeros, les gradins nord montent l ecran. Devant lui, la masse sud : tranchee au ras du chemin, ses gradins et ses arbres en fantome.',
    50, y, width);
  const sw = GW * 2;
  const xr = 50 + sw + 14;
  const xc = xr + 150;
  const cw = PLAN_W - 50 - xc;

  // A. côté ferme
  screen(50, y, 'farm');
  ruler(xr, y);
  const k = 2;
  const L = (r: number) => y + (FEET + r) * k;
  tag('GRADIN 2', 50 + 8, L(-106), 3);
  tag('GRADIN 1', 50 + 8, L(-62), 3);
  tag('LE CHEMIN', 50 + 8, L(14), 3);
  tag('LA TERRE EN COUPE', 50 + 8, L(70), 3);
  tag('FANTOME : LE SUD', 50 + 520, L(-40), 3, GOLD);
  text('A. COTE FERME', xc, y + 6, GOLD, 5);
  para('Derriere Xeros : 2 gradins nord entiers et le bas de la 3e contremarche. Les arbres du gradin 1 en entier, ceux du gradin 2 par leur tronc.', xc, y + 56, cw, 3);
  para('Devant lui, en fantome : le dessus sud et ses gradins (lignes de -15 a 0), leurs arbres penches vers le nord. Les houppiers du dessus sud entrent par le haut de l ecran.', xc, y + 56 + 8 * 24, cw, 3);
  y += GH * 2 + 50;

  // B. à la bouche est
  screen(50, y, 'mouth');
  ruler(xr, y);
  text('B. A LA BOUCHE EST', xc, y + 6, GOLD, 5);
  const t = para('Xeros 2 m a l interieur. A droite, la ferme en pleine lumiere. Le jeu voit la face est par la tranche : le fer a cheval en gradins se voit de face, depuis la ferme :', xc, y + 56, cw, 3);
  // l'encart : la bouche est vue de face, depuis la ferme
  const ppm = 18;
  const iw = Math.min(cw, 30 * ppm);
  const sec: Section = { x: xc, y: y + 56 + t + 14, w: iw, h: Math.round(13.4 * ppm), ppm, top: 12.4, faces: EDGE + 6, outside: 'farm' };
  drawSection(sec);
  y += Math.max(GH * 2, 56 + t + 14 + sec.h) + 50;
  return y;
}

// ---------- la légende et la planche ----------

function legend(y: number): number {
  text('LES COULEURS', 50, y, GOLD, 4);
  y += 40;
  const swatch = (c: Rgb) => (x: number, yy: number) => rect(x, yy, 40, 40, c);
  const chips: [string, (x: number, y: number) => void][] = [
    ['LA TERRE', swatch(EARTH)],
    ['CONTREMARCHE', swatch(EARTH_DARK)],
    ["L'HERBE (DESSUS, GRADINS)", swatch(GRASS)],
    ['LE CIEL', swatch(SKY)],
    ['LE CHEMIN', swatch(PATH)],
    ["L'EAU", swatch(WATER)],
    ['LA FERME', swatch(FARM)],
    ['FEUILLAGE', (x, yy) => { rect(x, yy, 40, 40, LEAF_EDGE); rect(x + 3, yy + 3, 34, 34, LEAF); }],
    ['BUISSON', swatch(BUSH)],
    ['LIERRE ET RACINES', (x, yy) => { rect(x, yy, 40, 40, EARTH_DARK); for (let j = 0; j < 36; j++) { rect(x + 10 + ((j >> 2) % 2), yy + j, 3, 1, IVY); rect(x + 26 + ((j >> 2) % 2), yy + j, 3, 1, ROOT); } }],
    ['LA TERRE EN COUPE', (x, yy) => { for (let j = 0; j < 40; j++) for (let i = 0; i < 40; i++) S.dot(x + i, yy + j, hatchAt(i, j, 7) ? CUT_HATCH : CUT); }],
    ['TRANSPARENT', (x, yy) => {
      for (let j = 0; j < 40; j++) for (let i = 0; i < 40; i++) {
        S.dot(x + i, yy + j, hatchAt(i, j, 7) ? CUT_HATCH : CUT);
        S.dot(x + i, yy + j, GHOST_TINT, GHOST_A);
      }
      for (let i = 4; i < 36; i++) if (i % 4 < 2) { S.dot(x + i, yy + 10, GHOST_LINE); S.dot(x + i, yy + 11, GHOST_LINE); }
      for (let j = 12; j < 32; j++) if (j % 4 < 2) { S.dot(x + 18, yy + j, GHOST_LINE); S.dot(x + 21, yy + j, GHOST_LINE); }
    }],
    ['LE CERCLE (POINTILLE)', (x, yy) => { rect(x, yy, 40, 40, SKY); for (let a = 0; a < 40; a += 2) if ((a >> 2) % 2 === 0) { const t = (a / 40) * Math.PI; rect(x + 20 + Math.round(16 * Math.cos(t)) - 1, yy + 32 - Math.round(16 * Math.sin(t)) - 1, 3, 3, BG); } }],
  ];
  let x = 50;
  let yy = y;
  for (const [name, draw] of chips) {
    const w = 40 + 16 + tw(name, 3) + 44;
    if (x + w > PLAN_W - 50) { x = 50; yy += 60; }
    draw(x, yy);
    frame(x, yy, 40, 40, WHITE, 1);
    text(name, x + 56, yy + 13, WHITE, 3);
    x += w;
  }
  return yy + 60 - (y - 40);
}

export function drawReliefPlans(surface: PlanSurface): number {
  S = surface;
  let y = 30;
  text('LE CHEMIN CREUX - LES PLANS (3)', 50, y, WHITE, 7);
  y += 80;
  y = partFarm(y);
  y = partRiver(y);
  y = partScreens(y);
  y += legend(y) + 20;
  return y;
}
