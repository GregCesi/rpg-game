// Plans du chemin creux (chantier « relief », CADRAGE.md section 13.1 à 13.5) : des SCHÉMAS en gros aplats, pas des dessins.
// Planche : .art-preview/relief-plans.png (npx tsx tools/essai-relief-plans.ts). Rien de ce fichier n'entre dans le jeu.
// (Les premiers plans, la mauvaise forme à deux talus : art/proposals/relief-plans-v1.ts, gardés tels quels.)
//
// La forme : une masse de terre au dessus plat (5 m au-dessus du chemin), creusée d'un cercle de 5,50 m de diamètre dont le centre
// est à 2,45 m au-dessus du chemin ; le bas du cercle aplati (le chemin, 2,5 m), le haut ouvert (la fente, environ 2 m, là où le
// cercle coupe le dessus).
//
// Quatre parties, de haut en bas :
//   1. la grande coupe nord-sud, côté ferme (nord à gauche) ;
//   2. la même coupe au-dessus de la rivière ;
//   3. la vue de dessus du tunnel entier, et l'encart de la bouche est vue de face ;
//   4. ce que voit le joueur : trois écrans de 427 × 240 px (agrandis x2), Xéros les pieds à la ligne 130.

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
const EARTH_DARK: Rgb = [100, 66, 38]; // la terre dans l'ombre (sous la lèvre, le bord du trou)
const EARTH_LIGHT: Rgb = [176, 128, 82]; // la terre éclairée (le bas de la paroi)
const GRASS: Rgb = [92, 162, 62]; // l'herbe du dessus
const SKY: Rgb = [204, 230, 248]; // le ciel
const PATH: Rgb = [242, 234, 210]; // le chemin
const WATER: Rgb = [60, 126, 204]; // l'eau
const CUT: Rgb = [84, 50, 32]; // la terre en coupe
const CUT_HATCH: Rgb = [150, 100, 64];
const FARM: Rgb = [184, 218, 124]; // le sol de la ferme, en bas, en pleine lumière
const IVY: Rgb = [34, 86, 36]; // le lierre
const ROOT: Rgb = [66, 40, 22]; // les racines
const TRUNK: Rgb = [92, 58, 32];
const LEAF: Rgb = [42, 104, 50];
const LEAF_EDGE: Rgb = [24, 66, 30];
const LIGHT: Rgb = [255, 236, 150];

/** Ce qui est rendu transparent : son contour en pointillé clair, et une teinte très légère par-dessus. */
const GHOST_A = 0.13;
const GHOST_TINT: Rgb = [235, 245, 255];
const GHOST_LINE: Rgb = [250, 250, 235];

// ---------- la forme (en mètres, depuis le milieu du chemin) ----------

const CY = 2.45; // centre du cercle
const R = 2.75; // rayon
const TOP = 5; // le dessus de la masse
const PATH_HALF = 1.25;
const SLIT_HALF = Math.sqrt(R * R - (TOP - CY) ** 2); // 1,03 m

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
  const size = 14;
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
  text(title, x, y, GOLD, 5);
  const lines = wrap(clean(caption), Math.floor(width / 12));
  lines.forEach((l, i) => text(l, x, y + 42 + i * 24, WHITE, 3));
  return 42 + lines.length * 24 + 16;
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

interface Tree { base: number; top: [number, number]; crown: [number, number, number] }

/** Deux arbres de chaque côté : le plus près du trou se penche au-dessus. */
const TREES: Tree[] = [
  { base: -2.5, top: [-1.5, 8.4], crown: [-1.8, 9.2, 1.5] },
  { base: -7.2, top: [-7.0, 8.8], crown: [-7.2, 9.4, 1.6] },
  { base: 2.3, top: [1.5, 8.0], crown: [1.9, 8.8, 1.4] },
  { base: 6.6, top: [6.3, 8.6], crown: [6.4, 9.2, 1.5] },
];

interface Section {
  x: number;
  y: number;
  w: number;
  h: number;
  /** px par mètre : 60 (Xéros x3) ou 40 (Xéros x2) */
  ppm: number;
  /** hauteur du haut du cadre, en m */
  top: number;
  /** la masse s'arrête à cette distance du milieu (m), par une face ; sans : sur toute la largeur */
  faces?: number;
  /** dehors, au pied des faces : l'eau ou le sol de la ferme */
  outside?: 'water' | 'farm';
  trees: Tree[];
}

type Cell = 'sky' | 'earth' | 'grass' | 'path' | 'water' | 'farm';

function cellAt(sec: Section, m: number, hh: number): Cell {
  const face = sec.faces === undefined ? Infinity : sec.faces + Math.max(0, TOP - hh) * 0.12;
  if (Math.abs(m) > face) {
    if (hh > 0) return 'sky';
    if (sec.outside === 'water') return hh > -1.6 ? 'water' : 'earth';
    return hh > -0.2 ? 'farm' : 'earth';
  }
  if (hh > TOP) return 'sky';
  if (hh >= 0 && m * m + (hh - CY) ** 2 <= R * R) return 'sky';
  if (hh > TOP - 0.2) return 'grass';
  if (Math.abs(m) <= PATH_HALF && hh > -0.22) return 'path';
  return 'earth';
}
const CELL_COLOR: Record<Cell, Rgb> = { sky: SKY, earth: EARTH, grass: GRASS, path: PATH, water: WATER, farm: FARM };

function drawSection(sec: Section): { X: (m: number) => number; Y: (h: number) => number } {
  const cx = sec.x + sec.w / 2;
  const X = (m: number) => Math.round(cx + m * sec.ppm);
  const Y = (hh: number) => Math.round(sec.y + (sec.top - hh) * sec.ppm);
  const cells: Cell[][] = [];
  for (let j = 0; j < sec.h; j++) {
    const row: Cell[] = [];
    for (let i = 0; i < sec.w; i++) row.push(cellAt(sec, (sec.x + i - cx) / sec.ppm, sec.top - j / sec.ppm));
    cells.push(row);
  }
  // aplats, avec un bord sombre de 3 px là où la terre touche l'air (le bord du trou, les faces)
  for (let j = 0; j < sec.h; j++) for (let i = 0; i < sec.w; i++) {
    const c = cells[j][i];
    let col = CELL_COLOR[c];
    if (c === 'earth' || c === 'grass') {
      for (let d = 1; d <= 5 && col !== EARTH_DARK; d++) {
        for (const [di, dj] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
          const n = cells[j + dj]?.[i + di];
          if (n === 'sky' && c === 'earth') col = EARTH_DARK;
        }
      }
    }
    S.dot(sec.x + i, sec.y + j, col);
  }
  // le cercle entier, en pointillé fin : le haut enlevé (au-dessus du dessus) et le bas aplati (sous le chemin)
  const steps = Math.round(2 * Math.PI * R * sec.ppm);
  for (let k = 0; k < steps; k++) {
    if (Math.floor(k / 7) % 2) continue;
    const a = (2 * Math.PI * k) / steps;
    const px = X(R * Math.sin(a));
    const py = Y(CY + R * Math.cos(a));
    rect(px - 1, py - 1, 2, 2, WHITE);
  }
  // les racines, le lierre et l'herbe qui pendent des lèvres
  const t = Math.max(2, Math.round(sec.ppm / 20));
  for (const s of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const theta = ((24 + i * 4.6) * Math.PI) / 180;
      const m0 = s * R * Math.sin(theta) - s * 0.06;
      const h0 = CY + R * Math.cos(theta);
      const len = 0.5 + (((i * 7 + (s > 0 ? 3 : 0)) % 9) / 9) * 1.3;
      const end = Math.max(2.1, h0 - len);
      const col = i % 3 === 0 ? ROOT : IVY;
      const n = Math.round((h0 - end) * sec.ppm);
      for (let k = 0; k <= n; k++) {
        const wob = Math.round(Math.sin(k / 9 + i) * (t / 2));
        rect(X(m0) + wob, Y(h0) + k, t, 1, col);
        if (col === IVY && k % 10 === 5) rect(X(m0) + wob - t, Y(h0) + k, t * 3, t, IVY);
      }
    }
    // l'herbe du dessus, qui retombe au bord de la fente
    for (let i = 0; i < 4; i++) {
      const m0 = s * (SLIT_HALF + 0.04 + i * 0.1);
      line(X(m0), Y(TOP), X(m0 - s * 0.08), Y(TOP - 0.35 - (i % 2) * 0.2), GRASS, t);
    }
  }
  // les arbres, sur le dessus, au bord de la fente
  for (const tr of sec.trees) {
    const w0 = 0.22;
    const w1 = 0.12;
    fillPoly([[X(tr.base - w0), Y(TOP)], [X(tr.base + w0), Y(TOP)], [X(tr.top[0] + w1), Y(tr.top[1])], [X(tr.top[0] - w1), Y(tr.top[1])]], TRUNK);
    const [mx, my, r] = tr.crown;
    disc(X(mx), Y(my), Math.round(r * sec.ppm), LEAF_EDGE);
    disc(X(mx), Y(my), Math.round(r * sec.ppm) - 3, LEAF);
  }
  drawXeros(X(0), Y(0), sec.ppm / 20);
  frame(sec.x, sec.y, sec.w, sec.h, WHITE, 2);
  return { X, Y };
}

/** Une barre d'échelle de `meters` m. */
function scaleBar(x: number, y: number, ppm: number, meters: number): void {
  const w = Math.round(meters * ppm);
  rect(x, y, w, 6, WHITE);
  rect(x, y - 6, 3, 18, WHITE);
  rect(x + w - 3, y - 6, 3, 18, WHITE);
  text(`${meters} M`, x + w + 12, y - 4, WHITE, 3);
}

/** Une cote verticale (de h0 à h1) avec son texte. */
function vDim(x: number, y0: number, y1: number, label: string): void {
  arrow(x, Math.round((y0 + y1) / 2), x, y0);
  arrow(x, Math.round((y0 + y1) / 2), x, y1);
  rect(x - 12, y0 - 1, 25, 3, WHITE);
  rect(x - 12, y1 - 1, 25, 3, WHITE);
  tag(label, x + 18, Math.round((y0 + y1) / 2) - 9, 4);
}

function partFarm(y: number): number {
  const width = PLAN_W - 100;
  y += heading('LE CHEMIN CREUX : UN TROU ROND CREUSE DANS LA TERRE',
    'Coupe du nord au sud, cote ferme. Une terre au dessus plat, et dedans un trou rond : le haut est ouvert (la fente), le bas est aplati (le chemin). Les bords du trou reviennent au-dessus du chemin.',
    50, y, width);
  const sec: Section = { x: 50, y, w: width, h: 13.5 * 60, ppm: 60, top: 12, trees: TREES };
  const { X, Y } = drawSection(sec);
  // le nord, le sud
  tag('NORD', sec.x + 16, sec.y + 16, 4, GOLD);
  tag('SUD', sec.x + sec.w - 16 - tw('SUD', 4), sec.y + 16, 4, GOLD);
  // le dessus, de chaque côté
  tag('LE DESSUS : LE SOL DU PAYS', X(-13.4), Y(6.3), 3);
  arrow(X(-10.5), Y(6.0), X(-10.5), Y(5.05));
  tag('LE DESSUS : LE SOL DU PAYS', X(8.4), Y(6.3), 3);
  arrow(X(11.2), Y(6.0), X(11.2), Y(5.05));
  // la fente
  tag('LA FENTE VERS LE CIEL', X(0) - Math.round(tw('LA FENTE VERS LE CIEL', 4) / 2), Y(11.6), 4);
  arrow(X(0.15), Y(11.1), X(0.15), Y(5.35));
  // les lèvres et les racines, côté nord
  tag('LES LEVRES : LA VOUTE', X(-12.8), Y(3.9), 4);
  arrow(X(-12.8) + tw('LES LEVRES : LA VOUTE', 4) + 10, Y(3.9) + 10, X(-1.3), Y(4.75));
  tag('LES RACINES QUI PENDENT', X(-12.8), Y(1.9), 4);
  arrow(X(-12.8) + tw('LES RACINES QUI PENDENT', 4) + 10, Y(1.9) + 10, X(-2.05), Y(2.6));
  // la profondeur
  vDim(X(4.0), Y(TOP), Y(0), '5 M');
  // Xéros
  tag('XEROS', X(0.55), Y(1.2), 4);
  // le chemin
  const yb = Y(-0.5);
  rect(X(-PATH_HALF), yb, X(PATH_HALF) - X(-PATH_HALF), 3, WHITE);
  rect(X(-PATH_HALF), yb - 8, 3, 19, WHITE);
  rect(X(PATH_HALF) - 3, yb - 8, 3, 19, WHITE);
  tag('LE CHEMIN (2,5 M)', X(0) - Math.round(tw('LE CHEMIN (2,5 M)', 4) / 2), Y(-0.75), 4);
  scaleBar(sec.x, sec.y + sec.h + 28, sec.ppm, 2);
  text('POINTILLE : LE CERCLE ENTIER', sec.x + 260, sec.y + sec.h + 20, WHITE, 3);
  return y + sec.h + 60;
}

function partRiver(y: number): number {
  const width = PLAN_W - 100;
  y += heading('LA MEME COUPE, AU-DESSUS DE LA RIVIERE',
    'Le meme trou, la meme terre. La terre s arrete a quelques metres du trou, et l eau arrive contre elle, dehors.',
    50, y, width);
  const w = 32 * 40;
  const sec: Section = { x: 50 + Math.round((width - w) / 2), y, w, h: 13.5 * 40, ppm: 40, top: 11.5, faces: 9.8, outside: 'water', trees: TREES.slice(0, 1).concat(TREES.slice(2, 3)) };
  const { X, Y } = drawSection(sec);
  tag('NORD', sec.x + 12, sec.y + 12, 3, GOLD);
  tag('SUD', sec.x + sec.w - 12 - tw('SUD', 3), sec.y + 12, 3, GOLD);
  tag("L'EAU", X(-14.2), Y(-0.75), 4);
  tag("L'EAU", X(12.6), Y(-0.75), 4);
  tag('LA TERRE', X(-6.4), Y(2.2), 4);
  tag('LA TERRE', X(3.6), Y(2.2), 4);
  const msg = "L'EAU RESTE DEHORS, CONTRE LA MASSE DE TERRE : JAMAIS DANS LE TROU";
  tag(msg, sec.x + Math.round((sec.w - tw(msg, 3)) / 2), sec.y + sec.h + 22, 3, GOLD);
  arrow(X(-12.2), Y(-0.2), X(-10.4), Y(-0.2), GOLD);
  arrow(X(12.2), Y(-0.2), X(10.4), Y(-0.2), GOLD);
  return y + sec.h + 70;
}

// ---------- 3 : la vue de dessus ----------

function partTop(y: number): number {
  const width = PLAN_W - 100;
  y += heading('VU DE DESSUS : LE TUNNEL ENTIER',
    'Le nord en haut. La terre d un seul tenant, du plateau a la ferme, et la fente ouverte au milieu, d un bout a l autre. La riviere s arrete contre la terre, au nord et au sud : elle ne passe ni dessous ni dedans.',
    50, y, width);
  const x0 = 50;
  const W = 1240;
  const H = 520;
  const yc = y + H / 2;
  const half = 118; // demi-largeur de la masse
  const slit = 16; // demi-largeur de la fente
  const plateau = x0 + 230;
  const xE = x0 + 1010; // la face est
  const xr = x0 + 600; // la rivière
  const rw = 110;
  // le sol bas (la ferme, au niveau du chemin)
  rect(x0, y, W, H, FARM);
  // la rivière, du nord au sud
  rect(xr, y, rw, H, WATER);
  for (let j = y + 14; j < y + H; j += 26) for (let i = xr + 14; i < xr + rw - 20; i += 34) rect(i + ((j / 26) % 2) * 12, j, 14, 3, [150, 196, 240]);
  // le plateau et la masse : l'herbe du dessus, d'un seul tenant
  rect(x0, y, plateau - x0, H, GRASS);
  rect(plateau, yc - half, xE - plateau, 2 * half, GRASS);
  // les faces (là où le dessus s'arrête) : une bande de terre
  const F = 9;
  rect(plateau, y, F, yc - half - y, EARTH_DARK);
  rect(plateau, yc + half, F, y + H - yc - half, EARTH_DARK);
  rect(plateau, yc - half - F, xE - plateau + F, F, EARTH_DARK);
  rect(plateau, yc + half, xE - plateau + F, F, EARTH_DARK);
  rect(xE, yc - half - F, F, 2 * half + 2 * F, EARTH_DARK);
  // la fente : son ombre de chaque côté, le chemin clair au fond ; à l'ouest, elle s'efface, le chemin sort à fleur du plateau
  const west = x0 + 70;
  for (let x = west; x < xE + F; x++) {
    const fade = Math.min(1, Math.max(0, (x - west) / 170));
    for (let j = -slit - 8; j <= slit + 8; j++) {
      const inner = Math.abs(j) <= slit - 4;
      if (inner) S.dot(x, yc + j, PATH);
      else S.dot(x, yc + j, EARTH_DARK, fade);
    }
  }
  rect(x0, yc - 12, west - x0, 25, PATH);
  // le chemin continue sur la ferme
  rect(xE + F, yc - 12, x0 + W - xE - F, 25, PATH);
  // les arbres le long des deux bords, penchés vers la fente
  for (let x = plateau + 50; x < xE - 20; x += 64) {
    for (const s of [-1, 1]) {
      const cyy = yc + s * (slit + 12 + 22) + Math.round(Math.sin(x) * 3);
      disc(x, cyy, 22, LEAF_EDGE);
      disc(x, cyy, 19, LEAF);
    }
  }
  // un peu d'arbres sur le plateau
  for (const [tx, ty] of [[x0 + 60, y + 60], [x0 + 150, y + 120], [x0 + 80, y + 400], [x0 + 170, y + 460]] as [number, number][]) {
    disc(tx, ty, 22, LEAF_EDGE);
    disc(tx, ty, 19, LEAF);
  }
  // la ferme : deux toits
  rect(x0 + 1090, y + 60, 90, 60, [168, 84, 60]);
  rect(x0 + 1120, y + 380, 70, 50, [168, 84, 60]);
  frame(x0, y, W, H, WHITE, 2);
  // les légendes
  tag('LE PLATEAU', x0 + 18, y + 190, 4);
  tag('LA FERME', x0 + W - 18 - tw('LA FERME', 4), y + 200, 4);
  tag('LA RIVIERE', xr + rw / 2 - Math.round(tw('LA RIVIERE', 4) / 2), y + 40, 4);
  tag('LA RIVIERE', xr + rw / 2 - Math.round(tw('LA RIVIERE', 4) / 2), y + H - 60, 4);
  tag('LA FENTE', x0 + 760, yc - half - 70, 4);
  arrow(x0 + 800, yc - half - 46, x0 + 820, yc - 6);
  tag('BOUCHE EST', xE - 40, yc + half + 50, 4);
  arrow(xE + 30, yc + half + 44, xE + 6, yc + 14);
  tag('BOUCHE OUEST', x0 + 18, yc + 60, 4);
  arrow(x0 + 80, yc + 54, x0 + 90, yc + 14);
  tag('LA TERRE (SON DESSUS)', plateau + 70, yc + half - 36, 3);
  // le nord
  arrow(x0 + W - 40, y + 70, x0 + W - 40, y + 20, WHITE);
  text('N', x0 + W - 66, y + 30, WHITE, 4);

  // l'encart : la bouche est, vue de face, depuis la ferme
  const ex = x0 + W + 40;
  const ew = PLAN_W - 50 - ex;
  text('LA BOUCHE EST,', ex, y, GOLD, 4);
  text('VUE DE FACE', ex, y + 30, GOLD, 4);
  const ppm = 20;
  const sec: Section = { x: ex, y: y + 70, w: ew, h: Math.round(12.5 * ppm), ppm, top: 11.5, faces: 9.8, outside: 'farm', trees: TREES };
  drawSection(sec);
  const t = para('Le trou en fer a cheval : le cercle sans son haut. On y entre comme dans un tronc creux.', ex, sec.y + sec.h + 20, ew, 3);
  return y + Math.max(H, sec.h + 90 + t) + 50;
}

// ---------- 4 : ce que voit le joueur ----------

const GW = 427;
const GH = 240;
const FEET = 130;

type Shot = 'farm' | 'river' | 'mouth';

/** Un écran du jeu (427 × 240), agrandi x2. Les lignes sont comptées depuis les pieds de Xéros (bas positif). */
function screen(ox: number, oy: number, shot: Shot, labels: boolean): void {
  const k = 2;
  const cx = Math.floor(GW / 2);
  const face = shot === 'mouth' ? cx + 40 : Infinity; // Xéros 2 m (40 px) à l'intérieur
  const hang = (x: number, seed: number) => 8 + ((x * 7 + seed) % 15); // longueur d'une racine
  const px = (x: number, y: number, c: Rgb, a = 1) => { for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) S.dot(ox + x * k + i, oy + y * k + j, c, a); };
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const r = y - FEET;
    let c: Rgb;
    if (x >= face + 4) c = r >= -25 && r < 25 ? PATH : FARM; // la ferme, en pleine lumière
    else if (x >= face) c = r < 25 ? EARTH_DARK : CUT; // la face est, en raccourci
    else if (r < -121) c = GRASS; // le dessus au nord
    else if (r < -25) c = r < -104 ? EARTH_DARK : r < -60 ? EARTH : EARTH_LIGHT; // la paroi nord
    else if (r < 25) c = PATH;
    else c = hatchAt(x, y, 7) ? CUT_HATCH : CUT; // la masse sud, tranchée au niveau du chemin
    px(x, y, c);
  }
  // la lèvre nord, ses racines et son lierre
  for (let x = 0; x < Math.min(GW, face); x++) {
    px(x, FEET - 121, EARTH_DARK);
    px(x, FEET - 120, EARTH_DARK);
    if (x % 11 === 0) {
      const len = hang(x, 3);
      const col = x % 33 === 0 ? ROOT : IVY;
      for (let j = 0; j < len; j++) { px(x + (j % 10 < 5 ? 0 : 1), FEET - 121 + j, col); px(x + 1 + (j % 10 < 5 ? 0 : 1), FEET - 121 + j, col); }
      if (col === IVY) for (let j = 4; j < len; j += 5) { px(x - 1, FEET - 121 + j, IVY); px(x + 3, FEET - 119 + j, IVY); }
    }
    if (x % 6 === 3) for (let j = 0; j < 3; j++) px(x, FEET - 122 + j, GRASS); // l'herbe qui retombe
  }
  // le pied des arbres du bord nord
  for (const tx of [40, 150, 300, 390]) if (tx < face - 6) for (let j = 0; j < 7; j++) for (let i = 0; i < 6; i++) px(tx + i, FEET - 130 + j, TRUNK);
  // la lumière qui entre par la bouche
  if (shot === 'mouth') for (let y = FEET - 121; y < FEET + 25; y++) for (let x = face - 60; x < face; x++) px(x, y, LIGHT, 0.4 * ((x - face + 60) / 60));
  // par-dessus, ce qui devient transparent (la terre sud, de sa lèvre au bas du cadre, ses racines, ses arbres) :
  // une teinte très légère, et le contour de chaque forme en pointillé clair d'un pixel
  const GROUND = 1;
  const ROOTS = 2;
  const WOOD = 3;
  const CROWN = 4;
  const mask: number[][] = Array.from({ length: GH }, () => new Array<number>(GW).fill(0));
  const put = (x: number, y: number, id: number) => { if (x >= 0 && x < Math.min(GW, face) && y >= 0 && y < GH) mask[y][x] = id; };
  for (let y = FEET - 79; y < GH; y++) for (let x = 0; x < GW; x++) put(x, y, GROUND);
  for (const [tx, lean] of [[110, 14], [280, 10]] as [number, number][]) {
    const ccx = tx + lean + 4;
    for (let j = -40; j <= 40; j++) for (let i = -46; i <= 46; i++) if ((i * i) / 2116 + (j * j) / 1600 <= 1) put(ccx + i, FEET - 150 + j, CROWN);
    for (let y = FEET - 140; y < FEET - 79; y++) {
      const xx = Math.round(tx + lean * ((FEET - 72 - y) / 68));
      for (let i = -5; i <= 5; i++) put(xx + i, y, WOOD);
    }
  }
  for (let x = 0; x < GW; x++) if (x % 11 === 5) { const len = hang(x, 11); for (let j = 3; j < len; j++) put(x, FEET - 79 + j, ROOTS); }
  const same = (x: number, y: number, id: number) => x < 0 || y < 0 || x >= GW || y >= GH || x >= face || mask[y][x] === id;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const id = mask[y][x];
    if (!id) continue;
    px(x, y, GHOST_TINT, GHOST_A);
    const edge = !same(x - 1, y, id) || !same(x + 1, y, id) || !same(x, y - 1, id) || !same(x, y + 1, id);
    if (edge && (id === ROOTS ? y % 4 < 2 : (x + y) % 4 < 2)) px(x, y, GHOST_LINE);
  }
  // Xéros, par-dessus pour qu'on le lise (dans le jeu, il est vu à travers la teinte légère)
  drawXeros(ox + cx * k, oy + FEET * k, k);
  frame(ox, oy, GW * k, GH * k, WHITE, 2);
  if (labels) {
    tag('LE DESSUS NORD', ox + 12, oy + 4, 2);
    tag('LA PAROI NORD', ox + 12, oy + (FEET - 50) * k, 3);
    tag('LE CHEMIN', ox + 12, oy + (FEET - 6) * k, 3);
    tag('LA TERRE EN COUPE', ox + 12, oy + (FEET + 70) * k, 3);
    tag('TRANSPARENT : LA TERRE SUD, SA LEVRE, SES ARBRES', ox + (GW - 196) * k, oy + (FEET - 50) * k, 2);
    arrow(ox + (GW - 150) * k, oy + (FEET - 50) * k - 8, ox + (GW - 150) * k, oy + (FEET - 74) * k);
    tag('LA LEVRE NORD ET SES RACINES', ox + (GW - 150) * k, oy + (FEET - 98) * k, 2);
  }
  if (shot === 'mouth') {
    tag('LA FERME', ox + (face + 20) * k, oy + (FEET - 115) * k, 3);
    text('LA LUMIERE ENTRE', ox + (face + 14) * k, oy + (FEET - 76) * k, BG, 3);
    text('PAR LA BOUCHE', ox + (face + 14) * k, oy + (FEET - 64) * k, BG, 3);
    arrow(ox + (GW - 14) * k, oy + (FEET - 40) * k, ox + (face - 24) * k, oy + (FEET - 40) * k, LIGHT, 7);
  }
}

function partScreens(y: number): number {
  const width = PLAN_W - 100;
  y += heading('CE QUE VOIT LE JOUEUR',
    'Le jeu regarde depuis le sud, de biais : ce qui est haut se dessine plus haut. Dans le trou, la terre au sud de Xeros passe devant lui : on la rend transparente, comme un toit.',
    50, y, width);
  const sw = GW * 2;
  const xc = 50 + sw + 40; // la colonne du texte, à droite de l'écran
  const cw = PLAN_W - 50 - xc;
  const shots: [Shot, string, string][] = [
    ['farm', 'A. COTE FERME', 'Dans le trou : la terre au sud et ses arbres deviennent transparents. Devant Xeros, la terre en coupe. Derriere lui, la paroi et les racines.'],
    ['river', 'B. AU-DESSUS DE LA RIVIERE', 'La meme chose : sous Xeros, de la terre, jamais l eau. La terre au sud est assez large pour que l eau reste hors de l ecran.'],
    ['mouth', 'C. A LA BOUCHE EST', "Xeros juste a l'interieur. A l'entree : la transparence ne commence que la ou la terre passe devant Xeros. A droite, la ferme en pleine lumiere : ni terre en coupe, ni transparence."],
  ];
  for (const [shot, title, caption] of shots) {
    screen(50, y, shot, shot === 'farm');
    text(title, xc, y + 10, GOLD, 4);
    para(caption, xc, y + 56, cw, 3);
    y += GH * 2 + 40;
  }
  return y;
}

// ---------- la légende et la planche ----------

function legend(y: number): number {
  const chips: [string, (x: number, y: number) => void][] = [
    ['LA TERRE', (x, yy) => rect(x, yy, 40, 40, EARTH)],
    ["L'HERBE DU DESSUS", (x, yy) => rect(x, yy, 40, 40, GRASS)],
    ['LE CIEL', (x, yy) => rect(x, yy, 40, 40, SKY)],
    ['LE CHEMIN', (x, yy) => rect(x, yy, 40, 40, PATH)],
    ["L'EAU", (x, yy) => rect(x, yy, 40, 40, WATER)],
    ['LA TERRE EN COUPE', (x, yy) => { for (let j = 0; j < 40; j++) for (let i = 0; i < 40; i++) S.dot(x + i, yy + j, hatchAt(i, j, 7) ? CUT_HATCH : CUT); }],
    ['TRANSPARENT', (x, yy) => {
      // un carré de terre en coupe, teinté, et une forme (une lèvre et une racine) en pointillé clair
      for (let j = 0; j < 40; j++) for (let i = 0; i < 40; i++) {
        S.dot(x + i, yy + j, hatchAt(i, j, 7) ? CUT_HATCH : CUT);
        S.dot(x + i, yy + j, GHOST_TINT, GHOST_A);
      }
      for (let i = 4; i < 36; i++) if (i % 4 < 2) { S.dot(x + i, yy + 10, GHOST_LINE); S.dot(x + i, yy + 11, GHOST_LINE); }
      for (let j = 12; j < 32; j++) if (j % 4 < 2) { S.dot(x + 18, yy + j, GHOST_LINE); S.dot(x + 21, yy + j, GHOST_LINE); }
    }],
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
  return yy + 60 - y;
}

export function drawReliefPlans(surface: PlanSurface): number {
  S = surface;
  let y = 30;
  text('LE CHEMIN CREUX - LES PLANS', 50, y, WHITE, 6);
  y += 60;
  y += legend(y) + 30;
  y = partFarm(y);
  y = partRiver(y);
  y = partTop(y);
  y = partScreens(y);
  return y;
}
