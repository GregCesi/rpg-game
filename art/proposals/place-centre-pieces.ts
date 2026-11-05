// PROPOSITION (hors jeu, jamais chargée par le jeu) : les pièces nouvelles du centre de la place (CADRAGE-village.md, section 14.1 :
// « Le milieu » et « Ce qui remplit »). Chacune part de ses dimensions réelles (cm, `dims` : w est-ouest, d nord-sud, h hauteur, posée
// en R0) et du gabarit (docs/STYLE.md section 8, 5 cm par pixel, face sud en vraie grandeur, dessus à ½) :
//
//   clé                 nom                                   dims (cm)           vues  à l'écran (px, contour compris)
//   linden-tree         Tilleul de la place                   650 × 650 × 750     1     130 × 215 (boîte : W × H + D/2)
//   round-bench         Banc rond autour du tilleul           250 × 250 × 45      1     50 × 34
//   stone-trough        Abreuvoir de pierre                   300 × 90 × 75       2     60 × 24 ; 18 × 45
//   hand-cart           Charrette à bras chargée              220 × 110 × 100     4     44 × 28 ; 22 × 32 (boîte : 44 × 31 ; 22 × 42)
//   two-wheel-cart      Charrette à deux roues dételée        420 × 170 × 135     4     84 × 44 ; 34 × 35 (boîte : 84 × 44 ; 34 × 69)
//   leaning-ladder      Échelle appuyée (3,60 m)              50 × 160 × 320      4     10 × 80 ; 32 × 69 ; 10 × 50 (R2 : penchée vers nous)
//   laundry-line        Corde à linge sur deux poteaux        420 × 20 × 220      2     84 × 46 ; 4 × 86
//   laundry-line-high   Linge tendu entre deux fenêtres       400 × 20 × 370      2     80 × 25 de linge, 50 rangées vides dessous
//   flower-pot          Pot de fleurs (œillets)               35 × 35 × 55        1     7 × 14
//   flower-pot-yellow   Pot de fleurs (soucis)                35 × 35 × 50        1     7 × 13
//   window-box          Jardinière d'appui                    80 × 20 × 35        2     16 × 9 ; 4 × 15
//   cageot              Cageot vide                           50 × 35 × 25        2     10 × 9 ; 7 × 10
//   cageot-apples       Cageot de pommes                      50 × 35 × 30        2     10 × 10 ; 7 × 11
//   barrel-lying        Tonneau couché (pour les tas)         90 × 60 × 60        2     18 × 13 ; 13 × 18 (règle D)
//   basket              Panier d'osier                        45 × 35 × 35        2     9 × 10 ; 7 × 11
//
// Deux façons de dessiner, selon la pièce :
//   - en volumes (art/lib/volumes.ts, comme les maisons et leurs meubles) : ce qui est fait de planches, de pierre taillée, de roues,
//     de bûches (le banc rond, l'abreuvoir, les deux charrettes, l'échelle, le linge, le cageot) ; rendu comme le jeu rend un meuble
//     (`pieceImg` de place-centre-lib.ts : dessus à ½, contour de STYLE.md section 3, ombre portée) ; les vues R1 à R3 sont le même
//     modèle tourné d'un quart de tour (STYLE.md section 8, « Toutes les faces ») ;
//   - à la main sur la grille (art/lib/canvas.ts, comme les arbres et les objets du jeu) : ce qui est naturel ou trop petit pour des
//     volumes (le tilleul, ses masses de feuillage, le pot de fleurs, la jardinière, le tonneau couché, le panier).
//
// Matières : le bois travaillé patiné (^ * % & @, `woodAges.worn`, l'âge de la place), l'écorce (M m N K), le feuillage (j L l k), le
// calcaire (! + = ; ~), l'eau (w W q), la paille et l'osier (Y t T P), le chanvre des sacs (J O C X) ; en `#rrggbb` les couleurs
// nouvelles de place-centre-lib.ts (`CC` : le lin, la guède, la garance, la terre cuite, le fer, le chou, la pomme, le bois de bout).

import { Canvas, EMPTY, rng } from '../lib/canvas';
import { box, dash, hash, part, rotQuads, type Part, type Quad, type Rot, type Tex, type V3 } from '../lib/volumes';
import { despeckle, shadedOutline } from '../world/big-tree';
import { bark } from '../world/wood';
import { CC, XPAL, bar, cellsToImg, extrude, litOf, ngon, pieceImg, type Img, type PieceImg } from './place-centre-lib';
import type { VillagePiece } from './village-types';

// =====================================================================================================================
// Les matières des volumes
// =====================================================================================================================

/** Le bois travaillé patiné : le dessus au jour (le fil en tirets), la face sud, l'ombre à l'est et dessous. */
function wood(seed: number, lightTop = true): Tex {
  return (s, t, c) => {
    const L = litOf(c.n);
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top' || (L === 0 && lightTop)) return dash(seed, j, i, 0.3) ? '*' : '^';
    if (L === 1) return dash(seed + 1, j, i, 0.25) ? '%' : '*';
    return dash(seed + 2, j, i, 0.3) ? '&' : '%';
  };
}
/** Le fer : le cercle d'un tonneau, le bandage d'une roue. */
const ironTex: Tex = (_s, _t, c) => { const L = litOf(c.n); return L === 0 ? CC.ironLight : L === 1 ? CC.iron : CC.ironShade; };
/** L'écorce d'une bûche, du jour à l'ombre, ses sillons en tirets le long. */
function barkTex(seed: number): Tex {
  return (s, t, c) => {
    const L = litOf(c.n);
    const base = L === 0 ? 'M' : L === 1 ? 'm' : 'N';
    return dash(seed, Math.floor(t), Math.floor(s), 0.35) ? (base === 'M' ? 'm' : base === 'm' ? 'N' : 'K') : base;
  };
}
/** Le bois de bout frais d'une bûche (bout de rayon r) : l'écorce au bord, le cerne, le cœur ; la lumière en haut à gauche. */
function endGrain(r: number): Tex {
  return (s, t) => {
    const u = (s - r) / r, v = (r - t) / r; // v vers le bas de l'écran
    const d = Math.hypot(u, v);
    if (d > 0.78) return 'N';
    if (Math.hypot(u - 0.1, v - 0.1) < 0.22) return CC.endShade;
    return u + v < 0.1 ? CC.endLight : CC.end;
  };
}
/** Le calcaire taillé : le dessus clair, l'arête vive au sud, la face sud et ses coups de ciseau, l'ombre à l'est. */
function limestone(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') return j >= Math.round(c.h) - 1 ? '!' : hash(seed, i >> 1, j) < 0.12 ? '=' : '+';
    const L = litOf(c.n);
    if (L === 2) return hash(seed, i, j, 2) < 0.15 ? '~' : ';';
    if (j >= Math.round(c.h) - 1) return '+';
    if (j <= 1) return hash(seed, i, 3) < 0.5 ? ';' : '='; // le pied, mouillé
    return i % 4 === 1 && hash(seed, i, j >> 1) < 0.5 ? ';' : '=';
  };
}

const P = (name: string, prio: number, dark: string, outline: 'full' | 'thin' | 'none' = 'full'): Part => part(name, prio, dark, outline);

// =====================================================================================================================
// Le modèle et ses vues
// =====================================================================================================================

interface Model {
  key: string;
  name: string;
  dims: { w: number; d: number; h: number };
  /** Le nombre de vues : 1 (rond), 2 (symétrique), 4. */
  n: 1 | 2 | 4;
  /** Ce qu'elle est et d'où viennent ses matières (écrit sur la planche). */
  note: string;
  /** Les volumes (px, emprise de 0 à w/5 et 0 à d/5), ou une image dessinée à la main pour la vue v. */
  quads?: () => Quad[];
  hand?: (v: number) => Img;
}

/** Les volumes de la vue v (0 à 3) : tournés d'un quart de tour par vue autour du milieu de l'emprise, puis ramenés à l'origine. */
export function viewQuads(m: Model, v: number): Quad[] {
  const W = m.dims.w / 5, D = m.dims.d / 5;
  const qs = rotQuads(m.quads!(), ((4 - v) % 4) as Rot, [W / 2, D / 2]);
  if (v % 2 === 0) return qs;
  const dx = D / 2 - W / 2, dy = W / 2 - D / 2;
  return qs.map((q) => ({ ...q, o: [q.o[0] + dx, q.o[1] + dy, q.o[2]] as V3 }));
}
const cache = new Map<string, PieceImg>();
/** L'image de la vue v d'une pièce, son ombre portée comprise ; pour une pièce en volumes, son origine (`ox`, `oy`). */
export function viewImg(m: Model, v: number): PieceImg {
  const key = `${m.key}:${v}`;
  let r = cache.get(key);
  if (!r) {
    r = m.quads ? pieceImg(viewQuads(m, v), { shadow: true }) : { ...m.hand!(v), ox: 0, oy: 0 };
    cache.set(key, r);
  }
  return r;
}

// =====================================================================================================================
// Le tilleul de la place (à la main, comme le gros arbre du jeu, art/world/big-tree.ts : des masses de feuillage festonnées,
// découpées en grappes ombrées vers la lumière ; l'écorce commune de art/world/wood.ts)
// =====================================================================================================================
//
// Un vieux tilleul, l'arbre de la place : 7,50 m de haut, un houppier de 6,50 m, un fût de 90 cm (le gros arbre du jeu : 5,65 m, 2,70 m,
// 55 cm). Gabarit (boîte) : 130 × (150 + 65) = 130 × 215 px, le pied du tronc au bas de l'image. Le houppier ovale, plus haut que
// large, en neuf masses ; ses fleurs (les bractées pâles du tilleul en juin) en grappes de `y`, l'herbe sèche de la palette ; le fût
// visible sur 2,75 m (le banc rond, un homme debout passent dessous), évasé au pied, ses racines qui sortent de terre.

const TREE_W = 136, TREE_H = 222;
/** Le pied du tronc (bas, milieu) dans l'image du tilleul. */
export const LINDEN_FOOT: [number, number] = [68, 216];

interface Mass { cx: number; cy: number; rx: number; ry: number; seed: number; dim: number }
const LINDEN_MASSES: Mass[] = [
  { cx: 68, cy: 92, rx: 56, ry: 70, seed: 40, dim: 0.35 }, // le fond : bouche les jours
  { cx: 64, cy: 28, rx: 30, ry: 25, seed: 41, dim: 0 },
  { cx: 41, cy: 58, rx: 30, ry: 27, seed: 42, dim: 0.02 },
  { cx: 93, cy: 52, rx: 29, ry: 26, seed: 43, dim: 0.08 },
  { cx: 66, cy: 84, rx: 30, ry: 27, seed: 44, dim: 0.08 },
  { cx: 30, cy: 100, rx: 26, ry: 27, seed: 45, dim: 0.12 },
  { cx: 104, cy: 98, rx: 27, ry: 27, seed: 46, dim: 0.16 },
  { cx: 46, cy: 140, rx: 33, ry: 23, seed: 47, dim: 0.2 },
  { cx: 92, cy: 142, rx: 32, ry: 22, seed: 48, dim: 0.26 },
];

function massShape(m: Mass): Canvas {
  const s = new Canvas(TREE_W, TREE_H);
  const r = rng(m.seed);
  s.ellipse(m.cx, m.cy, m.rx * 0.86, m.ry * 0.86, 'l');
  const n = 17;
  for (let i = 0; i < n; i++) {
    const a = ((i + r() * 0.5) / n) * Math.PI * 2;
    const b = Math.min(m.rx, m.ry) * (0.17 + r() * 0.07);
    s.ellipse(m.cx + Math.cos(a) * m.rx * 0.8, m.cy + Math.sin(a) * m.ry * 0.8, b, b * 0.85, 'l');
  }
  return s;
}

function paintFoliage(c: Canvas, masses: Mass[]): void {
  const [lx, ly] = [-Math.SQRT1_2, -Math.SQRT1_2];
  const ramp = ['k', 'l', 'L', 'j'];
  for (const m of masses) {
    const shape = massShape(m);
    const r = rng(m.seed * 31);
    const sites: [number, number, number][] = [];
    for (let gy = m.cy - m.ry - 4; gy <= m.cy + m.ry + 4; gy += 7) {
      for (let gx = m.cx - m.rx - 4; gx <= m.cx + m.rx + 4; gx += 8) sites.push([gx + (r() - 0.5) * 4.5, gy + (r() - 0.5) * 4, r()]);
    }
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      if (shape.get(x, y) === EMPTY) continue;
      const px = x + 0.5, py = y + 0.5;
      let best = sites[0], bd = Infinity;
      for (const s of sites) {
        const d = (s[0] - px) ** 2 + (s[1] - py) ** 2;
        if (d < bd) { bd = d; best = s; }
      }
      const v = ((best[0] - m.cx) / m.rx) * lx + ((best[1] - m.cy) / m.ry) * ly - m.dim;
      let i = v > 0.4 ? 3 : v > 0.05 ? 2 : v > -0.45 ? 1 : 0;
      const local = (px - best[0]) * lx + (py - best[1]) * ly;
      if (local < -2 && i > 0) i--;
      let k = ramp[i];
      // les fleurs du tilleul : une grappe pâle au cœur de quelques grappes au jour
      if (i >= 2 && best[2] < 0.22 && Math.abs(px - best[0] - 0.5) < 1.3 && Math.abs(py - best[1] - 0.4) < 0.9) k = 'y';
      c.set(x, y, k);
    }
  }
}

function lindenBody(): Canvas {
  const c = new Canvas(TREE_W, TREE_H);
  const [fx, fy] = LINDEN_FOOT;
  // deux maîtresses branches, sous le feuillage, qu'on devine dans les jours du bas du houppier
  c.polygon([[fx - 4, 150], [fx - 26, 118], [fx - 21, 116], [fx + 1, 146]], 'm');
  c.polygon([[fx + 2, 148], [fx + 25, 120], [fx + 30, 123], [fx + 7, 152]], 'm');
  // le fût : 18 px (90 cm) sous le houppier, évasé au pied ; les racines qui sortent de terre
  const trunk = new Canvas(TREE_W, TREE_H);
  trunk.polygon([[fx - 9, 140], [fx + 9, 140], [fx + 9, 196], [fx + 11, 206], [fx + 14, 212], [fx + 16, fy + 1], [fx - 17, fy + 1], [fx - 13, 211], [fx - 10.5, 204], [fx - 9.5, 194]], 'm');
  trunk.polygon([[fx + 9, 209], [fx + 22, 213], [fx + 24, fy + 1], [fx + 12, fy + 1]], 'm'); // racine à l'est
  trunk.polygon([[fx - 10, 210], [fx - 24, 214], [fx - 25, fy + 1], [fx - 12, fy + 1]], 'm'); // racine à l'ouest
  trunk.polygon([[fx - 2, 213], [fx + 3, 213], [fx + 5, fy + 1], [fx - 4, fy + 1]], 'm'); // racine au sud
  for (let y = 0; y < c.h; y++) {
    const xs: number[] = [];
    for (let x = 0; x < c.w; x++) if (trunk.get(x, y) !== EMPTY) xs.push(x);
    if (!xs.length) continue;
    const x0 = xs[0], w = xs[xs.length - 1] - x0 + 1;
    for (const x of xs) c.set(x, y, bark(y * 0.6, (x + 0.5 - x0) / w));
  }
  paintFoliage(c, LINDEN_MASSES);
  // l'ombre du houppier sur le haut du fût, et sous les branches
  c.within('MmN', (k) => k.polygon([[fx - 10, 140], [fx + 10, 140], [fx + 10, 172], [fx, 176], [fx - 10, 170]], 'N'));
  c.within('N', (k) => k.polygon([[fx - 1, 140], [fx + 10, 140], [fx + 10, 166], [fx - 1, 170]], 'K'));
  // un trou dans le bas du feuillage, où l'on voit la branche de l'ouest dans l'ombre
  c.within('kl', (k) => k.polygon([[fx - 20, 152], [fx - 8, 150], [fx - 10, 157], [fx - 19, 158]], 'k'));
  return despeckle(c, 'Ky');
}

function lindenTree(): Img {
  const c = shadedOutline(lindenBody());
  // l'ombre au pied (l'ombre du houppier, au sol, est une image à part : `lindenShade`)
  const s = new Canvas(TREE_W, TREE_H).ellipse(LINDEN_FOOT[0] + 3, LINDEN_FOOT[1] + 1, 21, 3.5, 'x');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (s.get(x, y) !== EMPTY && c.get(x, y) === EMPTY) c.set(x, y, 'x');
  return cellsToImg(c.toGrid().map((r) => [...r]));
}

/**
 * L'ombre du houppier au sol (px, à plat : le sol n'a pas de raccourci) : le houppier, à 5 m de haut en moyenne, la porte vers le
 * sud-est (`SHADOW` de src/config.ts : un point à z tombe en (x + 0,25 z, y + 0,1 z)) ; un disque de 6 m, son bord mangé de jours.
 * Son origine : le pied du tronc est en (`foot`) de l'image.
 */
export function lindenShade(): Img & { foot: [number, number] } {
  const R = 60, cx = 25 + R + 4, cy = 10 + R + 4, w = 2 * R + 8 + 25, h = 2 * R + 8 + 10;
  const rows: string[][] = [];
  for (let y = 0; y < h; y++) {
    const r: string[] = [];
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.05);
      const edge = R - 3 + hash(71, Math.floor(Math.atan2(y - cy, x - cx) * 9)) * 6;
      const hole = d > R - 18 && hash(72, x >> 2, y >> 2) < 0.12;
      r.push(d < edge && !hole ? 'x' : '.');
    }
    rows.push(r);
  }
  return { ...cellsToImg(rows), foot: [cx - 25, cy - 10] };
}

// =====================================================================================================================
// Le banc rond (volumes) : huit pans de planches autour du tronc, deux planches par pan, seize pieds
// =====================================================================================================================
//
// Diamètre 2,50 m (Ro 25 px), le jour au tronc 1,50 m (Ri 15 : le fût de 90 cm et ses racines), l'assise à 45 cm (z 9), épaisse de
// 12 cm avec sa ceinture. Emprise 50 × 50 px, centre (25, 25). Gabarit : 50 × (9 + 25) = 50 × 34.

export const BENCH = { R: 25, Ri: 15, z: 9 };
function roundBench(): Quad[] {
  const { R, Ri, z } = BENCH, cx = 25, cy = 25, n = 8, rot = Math.PI / 8;
  const Q: Quad[] = [];
  const seat = P('assise', 3, 'K');
  const seatTex: Tex = (_s, _t, c) => {
    const dx = c.p[0] - cx, dy = c.p[1] - cy, r = Math.hypot(dx, dy);
    if (c.face !== 'top') {
      const L = litOf(c.n);
      return L === 0 ? '^' : L === 1 ? (c.p[2] < z - 1.6 ? '%' : '*') : '%';
    }
    const a = (Math.atan2(dy, dx) - rot + Math.PI * 4) % ((Math.PI * 2) / n);
    if (a * r < 0.7 || ((Math.PI * 2) / n - a) * r < 0.4) return '@'; // le joint entre deux pans
    if (Math.abs(r - (Ri + 5.2)) < 0.5) return '&'; // le jour entre les deux planches
    return hash(13, Math.floor(r / 5), Math.floor(Math.atan2(dy, dx) * r / 3)) < 0.25 ? '*' : '^';
  };
  const outer = ngon(cx, cy, R / Math.cos(Math.PI / n), n, rot);
  const inner = ngon(cx, cy, Ri / Math.cos(Math.PI / n), n, rot);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const sec: [number, number][] = [outer[i], outer[j], inner[j], inner[i]];
    Q.push(...extrude([0, 0, z - 2.5], [0, 0, 2.5], [1, 0, 0], [0, 1, 0], sec, seat, seatTex));
  }
  // les pieds : sous chaque sommet, dehors et dedans
  const leg = P('pied', 2, 'K');
  const lp = (a: [number, number], k: number) => [cx + (a[0] - cx) * k, cy + (a[1] - cy) * k] as [number, number];
  for (let i = 0; i < n; i++) {
    for (const [x, y] of [lp(outer[i], 0.9), lp(inner[i], 1.12)]) Q.push(...box(x - 0.8, x + 0.8, y - 0.8, y + 0.8, 0, z - 2.5, leg, wood(14)));
  }
  return Q;
}

/** Le banc rond coupé en deux : la moitié nord (derrière le tronc) et la moitié sud (devant), dans le cadre de l'image entière. */
export function roundBenchHalves(): { north: PieceImg; south: PieceImg; whole: PieceImg } {
  const all = roundBench();
  const whole = pieceImg(all, { shadow: true });
  const W = whole.grid[0].length - 1, H = whole.grid.length - 1;
  const frame: [number, number, number, number] = [-whole.ox, -whole.oy, W - whole.ox, H - whole.oy];
  const mid = (q: Quad) => q.o[1] + (q.u[1] + q.v[1]) / 2;
  const north = pieceImg(all.filter((q) => mid(q) < 25), { frame, floorY: 50 });
  const south = pieceImg(all.filter((q) => mid(q) >= 25), { frame, floorY: 50, shadow: true });
  return { north, south, whole };
}

// =====================================================================================================================
// L'abreuvoir de pierre (volumes) : une auge de calcaire d'un seul bloc, sur un socle, l'eau à 15 cm du bord
// =====================================================================================================================
//
// 3 m × 90 cm × 75 cm (60 × 18 × 15 px) : deux fois l'abreuvoir de bois des maisons (`water-trough`, 2 m × 60 × 60), pour les chevaux du
// maquignon et les bœufs. Le socle déborde de 5 cm ; le bord fait 15 cm ; un anneau de fer pour attacher, à l'avant.

function stoneTrough(): Quad[] {
  const Q: Quad[] = [];
  const st = P('auge', 3, '~'), sc = P('socle', 2, '~');
  Q.push(...box(0, 60, 0, 18, 0, 2, sc, limestone(81)));
  const rim = 3, zw = 12;
  const body = limestone(82);
  const top: Tex = (s, t, c) => {
    // en coordonnées de la face (s, t), pas du monde : la vue tournée garde son creux
    const inner = s > rim && s < c.w - rim && t > rim && t < c.h - rim;
    return inner ? null : body(s, t, c);
  };
  Q.push(...box(1, 59, 1, 17, 2, 15, st, { top, side: body }));
  // le dedans : les quatre parois (vues de dedans : celle du nord fait face au sud, à l'ombre du bord ; la mousse au fil de l'eau), l'eau
  const a0 = 1 + rim, a1 = 59 - rim, b0 = 1 + rim, b1 = 17 - rim, hh = 15 - zw;
  const wall: Tex = (s, t) => (t > 2 ? ';' : hash(83, Math.floor(s)) < 0.4 ? 'l' : '~');
  Q.push({ o: [a0, b0, zw], u: [a1 - a0, 0, 0], v: [0, 0, hh], n: [0, 1, 0], part: st, face: 'S', tex: wall });
  Q.push({ o: [a1, b1, zw], u: [a0 - a1, 0, 0], v: [0, 0, hh], n: [0, -1, 0], part: st, face: 'N', tex: wall });
  Q.push({ o: [a0, b1, zw], u: [0, b0 - b1, 0], v: [0, 0, hh], n: [1, 0, 0], part: st, face: 'E', tex: wall });
  Q.push({ o: [a1, b0, zw], u: [0, b1 - b0, 0], v: [0, 0, hh], n: [-1, 0, 0], part: st, face: 'W', tex: wall });
  Q.push({
    o: [a0, b0, zw], u: [a1 - a0, 0, 0], v: [0, b1 - b0, 0], n: [0, 0, 1], part: P('eau', 3.5, 'q', 'none'), face: 'top',
    tex: (s, t) => (t < 1.2 ? 'q' : hash(84, Math.floor(s / 3), Math.floor(t)) < 0.14 ? 'W' : 'w'),
  });
  // l'anneau de fer, au milieu de la face sud
  Q.push({ o: [28.5, 17.01, 9], u: [3, 0, 0], v: [0, 0, 3], n: [0, 1, 0], part: P('anneau', 4, CC.ironDeep, 'none'), face: 'S', tex: (s, t) => (Math.abs(Math.hypot(s - 1.5, t - 1.5) - 1.1) < 0.6 ? CC.ironShade : null) });
  return Q;
}

// =====================================================================================================================
// Les roues (volumes) : la face d'une roue (bandage de fer, jante, rais, moyeu), ses deux côtés, l'épaisseur du bandage
// =====================================================================================================================

/** Une roue d'axe nord-sud : centre (cx, ·, cz), rayon r, de y0 à y1, `spokes` rais. */
function wheel(cx: number, cz: number, r: number, y0: number, y1: number, spokes: number, seed: number): Quad[] {
  const Q: Quad[] = [];
  const pt = P('roue', 5, 'K');
  const face = (sign: 1 | -1): Tex => (s, t) => {
    const dx = (s - r) * sign, dz = t - r, d = Math.hypot(dx, dz);
    if (d > r) return null;
    const lit = -dx * 0.7 + dz * 0.7;
    if (d > r - 1) return lit > r * 0.25 ? CC.ironLight : lit > -r * 0.35 ? CC.iron : CC.ironShade;
    if (d > r - 2.6) return lit > r * 0.3 ? '^' : lit > -r * 0.3 ? '*' : '%';
    if (d < 1.6) return '@';
    if (d < 2.8) return lit > 0 ? '*' : '%';
    const a = Math.atan2(dz, dx), step = (Math.PI * 2) / spokes;
    const off = ((a + hash(seed) * step) % step + step) % step;
    const across = Math.min(off, step - off) * d;
    if (across < 0.75) return lit > 0 ? '^' : '%';
    return null;
  };
  Q.push({ o: [cx - r, y1, cz - r], u: [2 * r, 0, 0], v: [0, 0, 2 * r], n: [0, 1, 0], part: pt, face: 'S', tex: face(1) });
  Q.push({ o: [cx + r, y0, cz - r], u: [-2 * r, 0, 0], v: [0, 0, 2 * r], n: [0, -1, 0], part: pt, face: 'N', tex: face(-1) });
  Q.push(...extrude([cx, y0, cz], [0, y1 - y0, 0], [1, 0, 0], [0, 0, 1], ngon(0, 0, r, 16, Math.PI / 16), P('bandage', 5, CC.ironDeep), ironTex, ironTex, [false, false]));
  return Q;
}
/** Le moyeu qui dépasse de la roue (vers +y si `out` > 0, vers −y sinon) : un petit cylindre et son bout. */
function hub(cx: number, cz: number, y: number, out: number, r: number): Quad[] {
  const y0 = out > 0 ? y : y + out;
  return extrude([cx, y0, cz], [0, Math.abs(out), 0], [1, 0, 0], [0, 0, 1], ngon(0, 0, r, 8, Math.PI / 8), P('moyeu', 6, 'K'), wood(17), (s, t) => (Math.hypot(s - r, t - r) < 0.9 ? CC.ironShade : '%'));
}

// =====================================================================================================================
// La charrette à bras chargée (volumes) : un plateau à ridelles sur deux roues, deux bras, deux béquilles ; deux sacs de chanvre,
// un cageot de choux, un cageot de pommes
// =====================================================================================================================
//
// 2,20 m (bras compris) × 1,10 m (moyeux compris) × 1 m (chargée) : 44 × 22 × 20 px. Le plateau de 1,30 × 0,70 m à 50 cm, des
// ridelles de 20 cm ; les roues de 80 cm (r 8) sous le milieu du plateau ; les bras vers l'ouest, à 70 cm du sol à leur bout ; deux
// béquilles sous l'avant du plateau.

function sackTex(seed: number): Tex {
  return (s, t, c) => {
    const L = litOf(c.n);
    const k = c.face === 'top' || L === 0 ? 'O' : L === 1 ? 'C' : 'X';
    if (k === 'O' && hash(seed, Math.floor(s / 3), Math.floor(t / 2), 5) < 0.2) return 'J';
    return hash(seed, Math.floor(s / 2), Math.floor(t)) < 0.12 ? (k === 'O' ? 'C' : 'X') : k;
  };
}
/** Un sac couché le long de x : section arrondie. */
function sack(x0: number, x1: number, y0: number, y1: number, z0: number, h: number, seed: number): Quad[] {
  const w = y1 - y0, sec: [number, number][] = [[w * 0.1, 0], [w * 0.9, 0], [w, h * 0.4], [w * 0.88, h * 0.82], [w * 0.6, h], [w * 0.35, h], [w * 0.1, h * 0.85], [0, h * 0.4]];
  return extrude([x0, y0, z0], [x1 - x0, 0, 0], [0, 1, 0], [0, 0, 1], sec, P('sac', 7, 'X'), sackTex(seed));
}
/** Un cageot plein (x0-x1, y0-y1, posé à z0, haut de h) : ses lattes, et sur le dessus son contenu (`fill` : 'apple' ou 'cabbage'). */
function crateQuads(x0: number, x1: number, y0: number, y1: number, z0: number, h: number, fill: 'apple' | 'cabbage' | 'none', seed: number): Quad[] {
  const Q: Quad[] = [];
  const p = P('cageot', 7, 'K');
  const slats: Tex = (s, t, c) => {
    if (c.face === 'top') {
      const edge = s < 0.9 || s > c.w - 0.9 || t < 0.9 || t > c.h - 0.9;
      if (edge) return t > c.h - 0.9 ? '^' : '*';
      if (fill === 'none') return t > c.h - 2 ? '%' : Math.floor(s) % 3 === 1 ? '&' : '%'; // le fond à claire-voie
      const sz = fill === 'apple' ? 1.7 : 2.6;
      const gi = Math.floor(s / sz), gj = Math.floor(t / (sz * 0.8));
      const u = (s / sz - gi) - 0.5, v = (t / (sz * 0.8) - gj) - 0.5;
      const lit = -u + v;
      if (fill === 'apple') return lit > 0.35 ? CC.appleLight : lit > -0.3 ? CC.apple : CC.appleShade;
      return lit > 0.3 ? CC.cabbageLight : lit > -0.25 ? CC.cabbage : hash(seed, gi, gj) < 0.5 ? CC.cabbageShade : CC.cabbageDeep;
    }
    const L = litOf(c.n);
    const j = Math.floor(t), corner = s < 1 || s > c.w - 1;
    if (corner) return L === 2 ? '%' : '^';
    if (j % 2 === 1 && t < c.h - 0.5) return L === 2 ? '&' : '%'; // le jour entre deux lattes
    return L === 0 ? '^' : L === 1 ? '*' : '%';
  };
  Q.push(...box(x0, x1, y0, y1, z0, z0 + h, p, slats));
  return Q;
}

function handCart(): Quad[] {
  const Q: Quad[] = [];
  const fr = P('plateau', 4, 'K');
  const bz = 10, side = 4;
  // le plateau et ses ridelles
  Q.push(...box(18, 44, 3, 17, bz - 1, bz, fr, wood(21)));
  Q.push(...box(18, 44, 3, 4, bz, bz + side, fr, wood(22)));
  Q.push(...box(18, 44, 16, 17, bz, bz + side, fr, wood(23)));
  Q.push(...box(43, 44, 4, 16, bz, bz + side, fr, wood(24)));
  Q.push(...box(18, 19, 4, 16, bz, bz + side - 1, fr, wood(25)));
  // les bras (deux longerons qui passent sous le plateau et sortent à l'ouest), les béquilles
  const arm = P('bras', 4.5, 'K', 'thin');
  for (const y of [5.5, 14.5]) {
    Q.push(...bar([44, y, bz - 1.5], [0.5, y, bz + 3.5], 2, arm, wood(26)));
    Q.push(...box(18.5, 20, y - 0.7, y + 0.7, 0, bz - 2, arm, wood(27)));
  }
  // l'essieu, les roues de 80 cm sous le milieu du plateau
  Q.push(...bar([31, 1, 8], [31, 19, 8], 1.2, P('essieu', 3, 'K'), wood(28)));
  Q.push(...wheel(31, 8, 8, 0.5, 2, 6, 29), ...wheel(31, 8, 8, 18, 19.5, 6, 30));
  Q.push(...hub(31, 8, 19.5, 1.2, 1.6), ...hub(31, 8, 0.5, -1.2, 1.6));
  // le chargement : deux sacs couchés, deux cageots
  Q.push(...sack(19.5, 30.5, 4, 10.5, bz, 6.5, 31), ...sack(20, 31, 10, 16, bz, 6, 32), ...sack(21, 29.5, 6.5, 13, bz + 5.2, 5.5, 33));
  Q.push(...crateQuads(32, 42.5, 4, 10, bz, 5, 'cabbage', 34), ...crateQuads(32, 42.5, 10, 16, bz, 5, 'apple', 35));
  Q.push(...crateQuads(33, 42, 3.5, 9.5, bz + 5, 5, 'cabbage', 36));
  return Q;
}

// =====================================================================================================================
// La charrette à deux roues dételée (volumes), brancards posés au sol, chargée de bûches
// =====================================================================================================================
//
// 4,20 m × 1,70 m × 1,35 m : 84 × 34 × 27 px. Les brancards vers l'ouest, leur bout au sol (x 0) ; le plateau de 2 × 1,30 m (x 44-84,
// y 4-30) penche vers l'avant (11°) comme une charrette dételée ; les roues de 1,30 m (r 13) à dix rais, l'essieu sous le milieu du
// plateau ; des ridelles basses à ranchers ; le bois coupé du bûcheron, des bûches de 1 m en travers (Ø 20 à 25 cm), deux rangs et demi.

const CART_SLOPE = 13 / 64;
const frameZ = (x: number) => 1 + CART_SLOPE * x;
function twoWheelCart(): Quad[] {
  const Q: Quad[] = [];
  const fr = P('plateau', 4, 'K');
  const ax: V3 = [40, 0, 40 * CART_SLOPE];
  const z0 = frameZ(44);
  // le plancher, penché
  Q.push({ o: [44, 4, z0 + 1], u: ax, v: [0, 26, 0], n: [-CART_SLOPE / Math.hypot(1, CART_SLOPE), 0, 1 / Math.hypot(1, CART_SLOPE)], part: fr, face: 'top', tex: (_s, t) => (Math.floor(t) % 5 === 4 ? '%' : '*') });
  Q.push(...extrude([44, 4, z0], ax, [0, 1, 0], [0, 0, 1], [[0, 0], [26, 0], [26, 1], [0, 1]], fr, wood(41), wood(41), [true, true]));
  // les ridelles basses (une planche de 10 cm) et les ranchers tous les 50 cm : entre eux, les bouts des bûches
  const rail = P('ridelle', 6, 'K');
  for (const [y0, y1] of [[4, 5], [29, 30]]) {
    Q.push(...extrude([44, y0, z0 + 1], ax, [0, 1, 0], [0, 0, 1], [[0, 0], [y1 - y0, 0], [y1 - y0, 2], [0, 2]], rail, wood(42), wood(42)));
    for (let x = 45; x <= 84; x += 9.6) Q.push(...box(x - 0.6, x + 0.6, y0, y1, frameZ(x) + 1, frameZ(x) + 8, rail, wood(44)));
  }
  // la tête (la planche de devant)
  Q.push(...box(43.5, 45, 4, 30, z0, z0 + 8, P('tête', 6, 'K'), wood(45)));
  // les brancards : du bout au sol jusque sous l'arrière du plateau
  const sh = P('brancard', 3, 'K', 'thin');
  for (const y of [9, 25]) Q.push(...bar([0.5, y, 1.2], [84, y, frameZ(84) - 0.4], 2, sh, wood(46)));
  Q.push(...bar([30, 9, frameZ(30)], [30, 25, frameZ(30)], 1.1, sh, wood(47))); // la traverse des brancards
  // l'essieu et les roues
  Q.push(...bar([64, 0, 13], [64, 34, 13], 1.6, P('essieu', 2, 'K'), wood(48)));
  Q.push(...wheel(64, 13, 13, 1.2, 3, 10, 49), ...wheel(64, 13, 13, 31, 32.8, 10, 50));
  Q.push(...hub(64, 13, 32.8, 1.2, 2.2), ...hub(64, 13, 1.2, -1.2, 2.2));
  // les bûches : en travers du plancher penché, deux rangs pleins et un demi, de l'avant vers l'arrière
  const logPart = P('bûche', 7, 'K');
  const r0 = 2.25, step = 4.6;
  const logAt = (x: number, z: number, k: number) => {
    const r = r0 + (hash(51, k) - 0.5) * 0.5, y0 = 5.5 + hash(52, k) * 2, y1 = 26.5 + hash(53, k) * 2.2;
    Q.push(...extrude([x, y0, z], [0, y1 - y0, 0], [1, 0, 0], [0, 0, 1], ngon(0, 0, r, 8, Math.PI / 8 + hash(54, k)), logPart, barkTex(55 + k), endGrain(r)));
  };
  let k = 0;
  for (let x = 47.6; x < 83; x += step) logAt(x, frameZ(x) + 2 + r0, k++);
  for (let x = 47.6 + step / 2; x < 81; x += step) logAt(x, frameZ(x) + 2 + r0 + step * 0.87, k++);
  for (let x = 52.2 + step / 2; x < 79; x += step) logAt(x, frameZ(x) + 2 + r0 + 2 * step * 0.87, k++);
  return Q;
}

// =====================================================================================================================
// L'échelle appuyée (volumes) : deux montants, des barreaux tous les 30 cm ; elle penche vers le nord
// =====================================================================================================================
//
// 3,60 m de long, 50 cm de large, le pied à 1,60 m de ce qui la porte, le haut à 3,20 m : emprise 10 × 32 px, haute de 64.

function ladder(): Quad[] {
  const Q: Quad[] = [];
  const rl = P('montant', 4, 'K', 'thin'), rg = P('barreau', 3, 'K', 'thin');
  const top = 64, foot = 31.5;
  for (const x of [1, 9]) Q.push(...bar([x, foot, 0], [x, 0.5, top], 1.8, rl, wood(61)));
  for (let z = 6; z < top - 2; z += 6) {
    const y = foot - ((foot - 0.5) * z) / top;
    Q.push(...bar([1.6, y, z], [8.4, y, z], 1.2, rg, wood(62)));
  }
  return Q;
}

// =====================================================================================================================
// Le linge (volumes) : une corde de chanvre qui fléchit, les pièces qui pendent, plates, face au sud
// =====================================================================================================================

interface Cloth { x0: number; x1: number; h: number; kind: 'sheet' | 'shirt' | 'towel' | 'skirt'; ramp: [string, string, string, string] }
const LINEN: [string, string, string, string] = [CC.linenLight, CC.linen, CC.linenShade, CC.linenDeep];
const BLUE: [string, string, string, string] = [CC.woadLight, CC.woad, CC.woadShade, CC.woadDeep];
const RED: [string, string, string, string] = [CC.madderLight, CC.madder, CC.madderShade, CC.madderDeep];
const RAW: [string, string, string, string] = ['d', 'D', 'E', '$'];

/** La corde : de x0 à x1 à la hauteur z, une flèche de `sag` au milieu. */
const sagZ = (x: number, x0: number, x1: number, z: number, sag: number) => z - sag * (1 - ((2 * (x - x0)) / (x1 - x0) - 1) ** 2);

function clothQuad(c: Cloth, y: number, zAt: (x: number) => number, seed: number): Quad[] {
  const w = c.x1 - c.x0, top = Math.max(zAt(c.x0), zAt(c.x1));
  const p = P('linge', 6, c.ramp[3]);
  const tex: Tex = (s, _t, ctx) => {
    const zl = zAt(c.x0 + s); // le haut, suit la corde
    const down = zl - ctx.p[2]; // la profondeur sous la corde
    if (down < -0.2) return null;
    const u = s / w;
    let len = c.h;
    if (c.kind === 'shirt') len = u < 0.22 || u > 0.78 ? c.h * 0.42 : c.h; // les manches
    if (c.kind === 'skirt') len = c.h - Math.abs(u - 0.5) * 2;
    len += (hash(seed, Math.floor(s / 2)) - 0.5) * 1.2; // l'ourlet qui ondule
    if (down > len) return null;
    if (c.kind === 'skirt' && (s < (down / c.h) * -1.2 + 0 || s > w)) return null;
    if (down < 0.9) return hash(seed, Math.floor(s / 3)) < 0.3 ? 'C' : c.ramp[2]; // la pince, le pli sur la corde
    // les plis : des bandes verticales, le jour à gauche de chaque pli
    const fold = (s + hash(seed, 9) * 4) % 4.5;
    if (s < 1) return c.ramp[0];
    if (s > w - 1) return c.ramp[2];
    if (fold > 3.6) return c.ramp[2];
    if (fold < 1.2) return c.ramp[0];
    return down > len - 1.2 ? c.ramp[2] : c.ramp[1];
  };
  return [{ o: [c.x0, y, top - c.h - 2], u: [w, 0, 0], v: [0, 0, c.h + 2.5], n: [0, 1, 0], part: p, face: 'S', tex }];
}

function lineQuads(x0: number, x1: number, y: number, z: number, sag: number): Quad[] {
  const Q: Quad[] = [];
  const n = 8, rope = P('corde', 5, 'X', 'none');
  for (let i = 0; i < n; i++) {
    const a = x0 + ((x1 - x0) * i) / n, b = x0 + ((x1 - x0) * (i + 1)) / n;
    const za = sagZ(a, x0, x1, z, sag), zb = sagZ(b, x0, x1, z, sag);
    Q.push({ o: [a, y, za - 0.5], u: [b - a, 0, zb - za], v: [0, 0, 1], n: [0, 1, 0], part: rope, face: 'S', tex: () => 'C' });
    Q.push({ o: [a, y - 0.5, za + 0.5], u: [b - a, 0, zb - za], v: [0, 1, 0], n: [0, 0, 1], part: rope, face: 'top', tex: () => 'O' });
  }
  return Q;
}

const LAUNDRY: Cloth[] = [
  { x0: 5, x1: 26, h: 22, kind: 'sheet', ramp: LINEN },
  { x0: 29, x1: 40, h: 13, kind: 'shirt', ramp: BLUE },
  { x0: 42, x1: 48, h: 7, kind: 'towel', ramp: RAW },
  { x0: 49.5, x1: 55.5, h: 8, kind: 'towel', ramp: LINEN },
  { x0: 57, x1: 67, h: 15, kind: 'skirt', ramp: RED },
  { x0: 69, x1: 80, h: 17, kind: 'sheet', ramp: RAW },
];

function laundryLine(): Quad[] {
  const Q: Quad[] = [];
  const pole = P('poteau', 4, 'K');
  const y = 2, z = 42, sag = 2.5;
  for (const x of [1.5, 82.5]) {
    Q.push(...box(x - 1.2, x + 1.2, y - 1.2, y + 1.2, 0, 44, pole, barkTex(70)));
    Q.push(...box(x - 1.8, x + 1.8, y - 0.6, y + 0.6, 43, 44.3, pole, wood(71))); // la traverse en tête
  }
  Q.push(...lineQuads(2.7, 81.3, y, z, sag));
  LAUNDRY.forEach((c, i) => Q.push(...clothQuad(c, y + 0.05, (x) => sagZ(x, 2.7, 81.3, z, sag), 90 + i)));
  return Q;
}

function laundryLineHigh(): Quad[] {
  const Q: Quad[] = [];
  const y = 2, z = 70, sag = 3;
  // deux pitons de fer, scellés dans les deux façades
  for (const x of [0.2, 78.8]) Q.push(...box(x, x + 1, y - 0.5, y + 0.5, z - 0.5, z + 1, P('piton', 5, CC.ironDeep), ironTex));
  Q.push(...lineQuads(1, 79, y, z, sag));
  LAUNDRY.map((c) => ({ ...c, x0: c.x0 - 2, x1: c.x1 - 2 })).forEach((c, i) => Q.push(...clothQuad(c, y + 0.05, (x) => sagZ(x, 1, 79, z, sag), 110 + i)));
  return Q;
}

// =====================================================================================================================
// Le cageot (volumes)
// =====================================================================================================================

const cageot = (fill: 'none' | 'apple') => (): Quad[] => crateQuads(0, 10, 0, 7, 0, fill === 'none' ? 5 : 5, fill, fill === 'none' ? 101 : 102).concat(
  fill === 'apple' ? appleHeap() : [],
);
/** Les pommes qui dépassent du bord : un dôme bas sur le cageot. */
function appleHeap(): Quad[] {
  const p = P('pommes', 8, CC.appleShade);
  const sec: [number, number][] = [[0, 0], [8, 0], [7, 0.8], [5, 1.2], [3, 1.2], [1, 0.8]];
  return extrude([1, 1, 5], [0, 5, 0], [1, 0, 0], [0, 0, 1], sec, p, (_s, _t, c) => {
    const L = litOf(c.n), g = hash(103, Math.floor(c.p[0] / 1.7), Math.floor(c.p[1] / 1.4));
    if (L === 0) return g < 0.5 ? CC.appleLight : CC.apple;
    return g < 0.3 ? CC.appleShade : CC.apple;
  });
}

// =====================================================================================================================
// À la main : le pot de fleurs, la jardinière, le tonneau couché, le panier
// =====================================================================================================================

/** Une grille dessinée (lettres) en image ; `.` vide ; les signes de la clé `k` en couleurs. */
function drawn(rows: string[], k: Record<string, string>): Img {
  return cellsToImg(rows.map((r) => [...r].map((ch) => (ch === '.' ? '.' : k[ch] ?? ch))));
}
const POT_KEY: Record<string, string> = { '1': CC.tcLight, '2': CC.tc, '3': CC.tcMid, '4': CC.tcShade, '5': CC.tcDeep };

/** Le pot de fleurs, Ø 35 cm, 30 cm de terre cuite, la touffe à 55 cm : 7 × 14 px. `f` : la fleur (c rouge, b jaune). */
function flowerPot(f: 'c' | 'b'): Img {
  const hi = f === 'c' ? 'a' : 'Y';
  const rows = f === 'c' ? [
    '..kfk..',
    '.kLlfk.',
    'kfLHLlk',
    'kLlLfLk',
    'kHlLlfk',
    '.klLlk.',
    '5111125',
    '5122345',
    '.51234.',
    '.52234.',
    '.52344.',
    '.52344.',
    '..oooo.',
    '..xxxxx',
  ] : [
    '.k.k...',
    'kfkfLk.',
    'kLlHlfk',
    'kfLlLlk',
    '.klfLk.',
    '5111125',
    '5122345',
    '.51234.',
    '.52234.',
    '.52344.',
    '.52344.',
    '..oooo.',
    '..xxxxx',
  ];
  return drawn(rows, { ...POT_KEY, f, H: hi });
}

/** La jardinière d'appui, 80 × 20 cm, 20 cm de planches et 15 cm de fleurs : 16 × 9 px ; de côté, 4 × 15. */
function windowBox(v: number): Img {
  const rows = v % 2 === 0 ? [
    '.kfk.kLfk.kfLk..',
    'kLlfkLHlfkLlfLk.',
    'kfLlLflLlLfHlLlk',
    'K^^^^^^^^^^^^^^o',
    'K**%***%****%**o',
    'K*%***%**%****%o',
    'K&&&&&&&&&&&&&&o',
    '.oooooooooooooo.',
    '..xxxxxxxxxxxxxx',
  ] : [
    '.kk.',
    'kfLk',
    'kLHk',
    'klfk',
    'kfLk',
    'kLlk',
    'kHfk',
    'kLlk',
    'K^^o',
    'K*%o',
    'K*%o',
    'K*%o',
    'K&&o',
    '.oo.',
    '.xxx',
  ];
  return drawn(rows, { f: 'c', H: 'a' });
}

/**
 * Le tonneau couché, 90 cm × Ø 60 cm, couché est-ouest : 18 × 13 px, le fond à l'ouest en ovale de 6 × 12 (comme le bout d'une bille,
 * STYLE.md section 8), les douelles et trois cercles de fer ; nord-sud (règle D) : 13 × 18, le fond en bande de 13 × 6 au sud.
 */
function barrelLying(v: number): Img {
  // a : douelle au jour, b : douelle, c : douelle à l'ombre ; i j : cercle (fer au jour, à l'ombre) ; e f g : le fond (bois de bout)
  const rows = v % 2 === 0 ? [
    '...KKKKKKKKKKKK...',
    '..KeKaiaaaaaiaaKo.',
    '.KeeeKaiaaaaaiabbo',
    '.KefeKbjbbbbbjbbbo',
    'KeeffgKjbbbbbjbbbo',
    'KeffgfKjbbbbbjbcco',
    'KefgffKjbbbbbjccco',
    'KeffgfKjbcbbbjccco',
    'KeefggKjccccc jcco',
    '.KffggKjcccccjccco',
    '.KgggKcjcccccjcco.',
    '..oooooooooooooo..',
    '...xxxxxxxxxxxxxxx',
    '....xxxxxxxxxxx...',
  ] : [
    '..KKKKKKKKK..',
    '.KaaaabbbbbK.',
    'KaaaaabbbbbbK',
    'KiiiiijjjjjjK',
    'KaaaaabbbbbcK',
    'KabaaabbbbccK',
    'KaaaaabbbbccK',
    'KabaaabbbcccK',
    'KiiiiijjjjjjK',
    'Kbbbbbbbcccco',
    'KbbbbbbcccccK',
    'KiiiiijjjjjjK',
    'KbbbbcccccccK',
    'KeeeeeffffggK',
    'KefeeffgfggfK',
    'KeeffffgfggfK',
    '.KfggggfggfK.',
    '..ooooooooo..',
    '...xxxxxxxxx.',
  ];
  return drawn(rows.map((r) => r.replace(/ /g, 'c')), { a: '^', b: '*', c: '%', i: CC.ironLight, j: CC.ironShade, e: CC.endLight, f: CC.end, g: CC.endShade });
}

/** Le panier d'osier à anse, 45 × 35 cm, 20 cm de corbeille, l'anse à 35 cm, plein de pommes : 9 × 10 px ; de côté, 7 × 11. */
function basket(v: number): Img {
  const rows = v % 2 === 0 ? [
    '...PPP...',
    '..P...P..',
    '.P.....P.',
    '.PrRrRrP.',
    'PrRRrRRrP',
    'PYtYtYtTo',
    'PtYtYtTTo',
    'PYtYtTtTo',
    '.PTTTTTo.',
    '..ooooo..',
    '...xxxxxx',
  ] : [
    '...P...',
    '...P...',
    '...P...',
    '..PPP..',
    '.PrRrP.',
    'PrRRrRP',
    'PYtYtTo',
    'PtYtTTo',
    'PYtYtTo',
    '.PTTTo.',
    '..ooo..',
    '...xxxx',
  ];
  return drawn(rows, { r: CC.apple, R: CC.appleLight });
}

// =====================================================================================================================
// Le catalogue
// =====================================================================================================================

export const MODELS: Model[] = [
  { key: 'linden-tree', name: 'Tilleul de la place', dims: { w: 650, d: 650, h: 750 }, n: 1, note: 'Vieux tilleul, fût de 90 cm, houppier ovale en neuf masses, fleurs pâles ; écorce et feuillage du jeu ; son ombre au sol à part', hand: () => lindenTree() },
  { key: 'round-bench', name: 'Banc rond', dims: { w: 250, d: 250, h: 45 }, n: 1, note: 'Huit pans de deux planches autour du tronc, seize pieds ; bois patiné. Coupé en deux sur la place (derrière, devant le tronc)', quads: roundBench },
  { key: 'stone-trough', name: 'Abreuvoir de pierre', dims: { w: 300, d: 90, h: 75 }, n: 2, note: 'Auge de calcaire d’un bloc sur son socle, l’eau à 15 cm du bord, la mousse au fil de l’eau, un anneau de fer', quads: stoneTrough },
  { key: 'hand-cart', name: 'Charrette à bras chargée', dims: { w: 220, d: 110, h: 100 }, n: 4, note: 'Plateau à ridelles, roues de 80 cm à six rais cerclées de fer, bras et béquilles ; trois sacs de chanvre, des cageots de choux et de pommes', quads: handCart },
  { key: 'two-wheel-cart', name: 'Charrette dételée, bûches', dims: { w: 420, d: 170, h: 135 }, n: 4, note: 'Brancards au sol, plateau penché, roues de 1,30 m à dix rais, ridelles à ranchers ; bûches de 1 m en travers, le bois de bout frais', quads: twoWheelCart },
  { key: 'leaning-ladder', name: 'Échelle appuyée', dims: { w: 50, d: 160, h: 320 }, n: 4, note: 'Échelle de 3,60 m, barreaux tous les 30 cm, penchée vers le nord (contre un mur, contre le tilleul pour la cueillette)', quads: ladder },
  { key: 'laundry-line', name: 'Corde à linge', dims: { w: 420, d: 20, h: 220 }, n: 2, note: 'Deux poteaux écorcés, la corde de chanvre qui fléchit ; un drap, une chemise de guède, deux torchons, un jupon de garance, un drap écru', quads: laundryLine },
  { key: 'laundry-line-high', name: 'Linge entre deux fenêtres', dims: { w: 400, d: 20, h: 370 }, n: 2, note: 'La même corde tendue à 3,50 m entre deux pitons de façade, d’une fenêtre d’étage à l’autre ; vide dessous (pièce en hauteur)', quads: laundryLineHigh },
  { key: 'flower-pot', name: 'Pot de fleurs (œillets)', dims: { w: 35, d: 35, h: 55 }, n: 1, note: 'Pot de terre cuite, une touffe d’œillets rouges ; au sol, sur un appui, sur une marche', hand: () => flowerPot('c') },
  { key: 'flower-pot-yellow', name: 'Pot de fleurs (soucis)', dims: { w: 35, d: 35, h: 50 }, n: 1, note: 'Le même pot, des soucis jaunes', hand: () => flowerPot('b') },
  { key: 'window-box', name: 'Jardinière d’appui', dims: { w: 80, d: 20, h: 35 }, n: 2, note: 'Caisse de planches sur l’appui d’une fenêtre, des œillets ; posée à la hauteur de l’appui par les bâtiments', hand: windowBox },
  { key: 'cageot', name: 'Cageot vide', dims: { w: 50, d: 35, h: 25 }, n: 2, note: 'Cageot à claire-voie, lattes de bois patiné ; s’empile', quads: cageot('none') },
  { key: 'cageot-apples', name: 'Cageot de pommes', dims: { w: 50, d: 35, h: 30 }, n: 2, note: 'Le même, plein de pommes en dôme', quads: cageot('apple') },
  { key: 'barrel-lying', name: 'Tonneau couché', dims: { w: 90, d: 60, h: 60 }, n: 2, note: 'Pour les tas : douelles patinées, trois cercles de fer, le fond en ovale comme le bout d’une bille (règle D)', hand: barrelLying },
  { key: 'basket', name: 'Panier d’osier', dims: { w: 45, d: 35, h: 35 }, n: 2, note: 'Corbeille d’osier (la paille du jeu), anse, pleine de pommes', hand: basket },
];

export const model = (key: string): Model => {
  const m = MODELS.find((x) => x.key === key);
  if (!m) throw new Error(`place-centre : pas de pièce « ${key} »`);
  return m;
};

/** Les pièces nouvelles, selon l'interface commune (art/proposals/village-types.ts). */
export const PIECES: VillagePiece[] = MODELS.map((m) => ({
  key: m.key,
  name: m.name,
  dims: m.dims,
  houses: [],
  views: (): Img[] => Array.from({ length: m.n }, (_, v) => viewImg(m, v)),
}));
export const PIECE_NOTES: Record<string, string> = Object.fromEntries(MODELS.map((m) => [m.key, m.note]));
export { XPAL };
