// PROPOSITION (hors jeu, jamais chargée par le jeu) : la boîte à outils du centre de la place (CADRAGE-village.md, section 14 : le
// rond de 20 m, le grand arbre, les bancs, l'abreuvoir, les charrettes, le linge, tout ce qui remplit). Les pièces sont dessinées dans
// art/proposals/place-centre-pieces.ts, posées dans art/proposals/place-centre.ts.
//
// Rien n'est réinventé : la projection, les volumes et le contour sont ceux de art/lib/volumes.ts et du rendu `render` de
// art/proposals/maison-xeros.ts ; les images du jeu viennent de art/index.ts. Ce fichier ne dépend pas des modules de la place qu'on
// refait en même temps (place-nord*, place-sud*) : ce qu'il leur emprunte est copié ici (le rendu d'une pièce en couleurs, la barre,
// le cylindre debout), pour que le centre se monte quel que soit leur état.
//
// Ce qu'il ajoute :
//   - les couleurs nouvelles du centre, en `#rrggbb` (le rendu de l'essai les accepte telles quelles ; à ajouter à art/palette.ts,
//     avec ces commentaires, si le centre entre au jeu) ;
//   - `pieceImg` : une pièce en volumes rendue seule comme le jeu rend un meuble (dessus raccourci de moitié, contour de STYLE.md
//     section 3, ombre portée), qui garde **son origine** (où tombe le point (0, 0, 0) du modèle dans l'image), pour qu'une pièce
//     coupée en deux images (le banc rond, devant et derrière le tronc) se recolle au pixel ;
//   - `extrude` : un prisme de section polygonale le long d'un axe quelconque, ses deux bouts compris (les bûches, les tonneaux,
//     les roues, le banc rond) ;
//   - la pose d'une image dans une scène, comme le jeu la pose : le bas de l'image au bord sud de l'emprise.

import type { Grid, Palette } from '../lib/canvas';
import { sources } from '../index';
import { iron, terracotta, woad, woodAges } from '../palette';
import {
  add, dot, len, mul, unit,
  type Board, type Face, type Part, type Quad, type Scene, type Tex, type V3,
} from '../lib/volumes';
import { PAL as XPAL } from './maison-xeros';
import { formView } from '../../src/world/natural';
import { variantImage } from '../../src/content/views';
import { silhouette } from '../../src/content/gabarit';
import propsJson from '../../src/content/props.json';

export { XPAL };
export type Img = { grid: Grid; pal: Palette };

// =====================================================================================================================
// Les couleurs nouvelles du centre (hors de la palette du monde)
// =====================================================================================================================

export const CC = {
  // le lin blanchi des draps et des chemises : NOUVEAU (plus blanc et plus froid que le torchis d D E, plus chaud que le calcaire)
  linenLight: '#f1ebda', linen: '#dcd3bb', linenShade: '#b4a98f', linenDeep: '#8b7f69',
  // la toile écrue des torchons : le torchis (d D E) de la palette
  // la guède (art/palette.ts `woad`) : un tablier, une chemise teinte
  woadLight: woad.light, woad: woad.base, woadShade: woad.shade, woadDeep: woad.deep,
  // la garance (la palette du coq, maison-coq ; la même que la toile rayée de la ferme du riche, place-nord-lib) : un jupon
  madderLight: '#b8705a', madder: '#a5614f', madderShade: '#7e4a40', madderDeep: '#5a3631',
  // la terre cuite (art/palette.ts `terracotta`) : les pots de fleurs
  tcLight: terracotta["'"], tc: terracotta['"'], tcMid: terracotta['`'], tcShade: terracotta['\\'], tcDeep: terracotta['?'],
  // le fer (art/palette.ts `iron`) : les cercles des tonneaux, les bandages des roues, les frettes
  ironLight: iron['('], iron: iron[')'], ironShade: iron['<'], ironDeep: iron['>'],
  // le chou : NOUVEAU (vert pâle et bleuté, plus clair et plus froid que le feuillage j L l k, pour s'en détacher)
  cabbageLight: '#b9c58e', cabbage: '#93a66c', cabbageShade: '#6c7f50', cabbageDeep: '#4d5c3d',
  // la pomme : le rouge des fleurs (c) au jour, NOUVEAU au soleil et à l'ombre
  appleLight: '#d27f5c', apple: '#b8584a', appleShade: '#86403a',
  // le bois de bout frais des bûches : le bois neuf (woodAges.new), plus clair que le patiné de l'essai
  endLight: woodAges.new['^'], end: woodAges.new['*'], endShade: woodAges.new['%'],
} as const;

// =====================================================================================================================
// Les images du jeu
// =====================================================================================================================

const byName = new Map(sources.map((s) => [s.name, s]));
export const has = (k: string) => byName.has(k);
/** Une image du jeu (la première image d'une planche). */
export function img(name: string, frame = 0): Img {
  const s = byName.get(name);
  if (s?.kind === 'image') return { grid: s.grid, pal: s.palette };
  if (s?.kind === 'spritesheet') {
    const fr = Object.values(s.animations)[0].frames;
    return { grid: fr[frame % fr.length], pal: s.palette };
  }
  throw new Error(`place-centre : pas d'image « ${name} »`);
}
type PropDef = { image: string; views: never; aged?: boolean; dims: { w: number; d: number; h: number } };
const props = propsJson as unknown as Record<string, PropDef>;
export type Age = 'new' | 'worn' | 'old';
/** L'image du jeu d'un objet de props.json dans sa vue, à l'âge voulu s'il prend l'âge (le bois de la place : patiné). */
export function propImg(key: string, view = 0, age: Age = 'worn'): Img {
  const def = props[key];
  if (!def) throw new Error(`place-centre : pas d'objet « ${key} »`);
  const k = formView(variantImage(def.image, undefined), def.views, view, undefined, has);
  return img(def.aged && age !== 'new' && has(`${k}-${age}`) ? `${k}-${age}` : k);
}
export const propDims = (key: string) => props[key].dims;
/** L'emprise au sol d'un objet de props.json dans sa vue (px : est-ouest, nord-sud). */
export function propFoot(key: string, view = 0): [number, number] {
  const d = props[key].dims;
  return view % 2 ? [d.d / 5, d.w / 5] : [d.w / 5, d.d / 5];
}

// =====================================================================================================================
// La pose d'une image dans une scène
// =====================================================================================================================

/**
 * Une image posée comme le jeu la pose : sa silhouette centrée sur son emprise (x0 → x0 + w, px), son bas (l'ombre dessous) au bord
 * sud `ySouth`, relevée de `z` (px :
 * une pièce posée sur une autre) ; sa profondeur : le bord sud, plus `dz` (à profondeur égale, l'image du dessus passe devant).
 */
export function placeImg(o: Img, x0: number, w: number, ySouth: number, z = 0, dz = 0): Board {
  const s = silhouette(o.grid, o.pal);
  return { grid: o.grid, pal: o.pal, x: Math.round(x0 + w / 2 - (s.x + s.w / 2)), y: Math.round(ySouth - z) - (s.y + s.h), depth: () => ySouth + dz };
}
/** Un objet de props.json posé comme le jeu le pose : le coin nord-ouest de son emprise en (x, y) px, dans sa vue, à la hauteur z. */
export function prop(key: string, x: number, y: number, view = 0, z = 0, dz = 0, age: Age = 'worn'): Board {
  const [w, d] = propFoot(key, view);
  return placeImg(propImg(key, view, age), x, w, y + d, z, dz);
}
export const sceneOf = (boards: Board[], quads: Quad[] = []): Scene => ({ quads, boards });

// =====================================================================================================================
// Le rendu d'une pièce seule (la copie de `renderPiece` de art/lib/volumes.ts, en couleurs, qui garde son origine)
// =====================================================================================================================

/** Une image de pièce et l'endroit, dans l'image, où tombe le pied du modèle : le point (0, 0, 0) projeté. */
export interface PieceImg extends Img { ox: number; oy: number }

const hexOf = (k: string) => (k.startsWith('#') ? k : XPAL[k] ?? k);
const POOL = [...'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξπρστυφχψωБГДЖЗИЙЛПФЦЧШЩЪЫЬЭЮЯбвгджзийклмнптфцчшщъыьэюя'];

/** Des cellules (couleurs, signes de XPAL, `x` l'ombre) en une image : chaque couleur hors de XPAL prend un signe de `POOL`. */
export function cellsToImg(cells: string[][]): Img {
  const pal: Palette = {};
  const sign = new Map<string, string>();
  let n = 0;
  const grid = cells.map((row) => row.map((k) => {
    if (k === '.' || k === '') return '.';
    if (k === 'x') { pal.x = XPAL.x; return 'x'; }
    if (!k.startsWith('#') && XPAL[k] !== undefined) { pal[k] = XPAL[k]; return k; }
    const h = hexOf(k);
    let s = sign.get(h);
    if (!s) { s = POOL[n++]; sign.set(h, s); pal[s] = h; }
    return s;
  }).join(''));
  return { grid, pal };
}

/**
 * Une pièce rendue seule : ses faces dans la projection (x, k·y − z) (k = ½ : un meuble, le dessus raccourci de moitié ; k = 1 : une
 * pièce de bâtiment), le point le plus au sud gardé, le contour de STYLE.md section 3. Recadrée sur ce qui est dessiné, le bas de
 * l'image au bord sud de la pièce à sa base (`floorY` : un autre bord sud, celui de l'emprise entière quand on rend une partie) ;
 * `shadow` : l'ombre portée d'une rangée sous la silhouette, décalée d'un pixel vers l'est. L'origine (ox, oy) : où tombe (0, 0, 0).
 */
export function pieceImg(quads: Quad[], opts: { k?: number; shadow?: boolean; floorY?: number; frame?: [number, number, number, number] } = {}): PieceImg {
  const k = opts.k ?? 0.5;
  const view = unit([0, 1, k]);
  const P = (p: V3): [number, number] => [p[0], k * p[1] - p[2]];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of quads) for (const p of [q.o, add(q.o, q.u), add(q.o, q.v), add(add(q.o, q.u), q.v)]) {
    const [X, Y] = P(p);
    x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
  }
  const bx = Math.floor(x0) - 1, by = Math.floor(y0) - 1, W = Math.ceil(x1) + 1 - bx, H = Math.ceil(y1) + 1 - by, N = W * H;
  const depth = new Float64Array(N).fill(-Infinity);
  const ch: string[] = new Array(N).fill('.');
  const parts: (Part | undefined)[] = new Array(N);
  for (const q of quads) {
    if (dot(q.n, view) <= 1e-6) continue;
    const a11 = q.u[0], a12 = q.v[0], a21 = k * q.u[1] - q.u[2], a22 = k * q.v[1] - q.v[2], det = a11 * a22 - a12 * a21;
    if (Math.abs(det) < 1e-9) continue;
    const cs = [q.o, add(q.o, q.u), add(q.o, q.v), add(add(q.o, q.u), q.v)].map(P);
    const X0 = Math.floor(Math.min(...cs.map((c) => c[0]))), X1 = Math.ceil(Math.max(...cs.map((c) => c[0])));
    const Y0 = Math.floor(Math.min(...cs.map((c) => c[1]))), Y1 = Math.ceil(Math.max(...cs.map((c) => c[1])));
    const [ox, oy] = P(q.o), lu = len(q.u), lv = len(q.v);
    for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) {
      const b1 = X + 0.5 - ox, b2 = Y + 0.5 - oy;
      const E = 1e-6;
      let s = (b1 * a22 - a12 * b2) / det, t = (a11 * b2 - a21 * b1) / det;
      if (s < -E || s > 1 + E || t < -E || t > 1 + E) continue;
      s = Math.min(Math.max(s, 0), 1 - 1e-9); t = Math.min(Math.max(t, 0), 1 - 1e-9);
      const p = add(add(q.o, mul(q.u, s)), mul(q.v, t));
      const dp = p[1] + q.part.prio * 1e-3;
      const i = (Y - by) * W + (X - bx);
      if (dp <= depth[i]) continue;
      const c = q.tex(s * lu, t * lv, { w: lu, h: lv, p, n: q.n, X, Y, face: q.face });
      if (c === null) continue;
      depth[i] = dp; ch[i] = c; parts[i] = q.part;
    }
  }
  const out = ch.slice();
  const behind = (i: number, j: number) => {
    if (j < 0) return true;
    const pj = parts[j], pi = parts[i]!;
    if (!pj) return true;
    if (pj === pi) return false;
    return depth[j] < depth[i] - 0.6 || (depth[j] <= depth[i] + 0.6 && pj.prio < pi.prio);
  };
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const i = Y * W + X, p = parts[i];
    if (!p || p.outline === 'none') continue;
    const at = (dx: number, dy: number) => (X + dx < 0 || X + dx >= W || Y + dy < 0 || Y + dy >= H ? -1 : (Y + dy) * W + X + dx);
    if (behind(i, at(1, 0)) || behind(i, at(0, 1))) out[i] = 'o';
    else if (p.outline === 'full' && (behind(i, at(-1, 0)) || behind(i, at(0, -1)))) out[i] = p.dark;
  }
  let cells: string[][] = [];
  for (let Y = 0; Y < H; Y++) cells.push(out.slice(Y * W, (Y + 1) * W));
  // recadrer : un cadre imposé (pour les morceaux d'une même pièce), sinon ce qui est dessiné, le bas au bord sud à la base
  let maxY = -Infinity, minZ = Infinity;
  for (const q of quads) for (const p of [q.o, add(q.o, q.u), add(q.o, q.v), add(add(q.o, q.u), q.v)]) { maxY = Math.max(maxY, p[1]); minZ = Math.min(minZ, p[2]); }
  const southRow = Math.ceil(k * (opts.floorY ?? maxY) - Math.min(0, minZ) - 1e-6) - 1 - by;
  let l: number, top: number;
  if (opts.frame) {
    // cadre en coordonnées projetées (x0, y0, x1, y1 exclus)
    const [fx0, fy0, fx1, fy1] = opts.frame;
    const rows: string[][] = [];
    for (let Y = fy0; Y < fy1; Y++) {
      const r: string[] = [];
      for (let X = fx0; X < fx1; X++) r.push(Y - by >= 0 && Y - by < H && X - bx >= 0 && X - bx < W ? cells[Y - by][X - bx] : '.');
      rows.push(r);
    }
    cells = rows; l = fx0 - bx; top = fy0 - by;
  } else {
    const used = (r: string[]) => r.some((c) => c !== '.');
    top = cells.findIndex(used);
    const last = Math.max(cells.length - 1 - [...cells].reverse().findIndex(used), southRow);
    l = Infinity; let r = -1;
    for (const row of cells) for (let x = 0; x < row.length; x++) if (row[x] !== '.') { l = Math.min(l, x); r = Math.max(r, x); }
    const keep: string[][] = [];
    for (let y = top; y <= last; y++) keep.push(y < cells.length ? cells[y].slice(l, r + 1) : new Array(r - l + 1).fill('.'));
    cells = keep;
  }
  if (opts.shadow) {
    // l'ombre portée : sous la rangée la plus basse de chaque colonne, décalée d'un pixel vers l'est
    cells = cells.map((r) => [...r, '.']);
    cells.push(new Array(cells[0].length).fill('.'));
    const H2 = cells.length, W2 = cells[0].length;
    const low = Array.from({ length: W2 }, (_, x) => { let y = H2 - 1; while (y >= 0 && cells[y][x] === '.') y--; return y; });
    const ground = Math.max(...low); // l'ombre ne tombe qu'au sol : sous ce qui touche la rangée du bas
    for (let x = 0; x + 1 < W2; x++) if (low[x] >= ground - 1 && low[x] >= 0 && cells[low[x] + 1][x + 1] === '.') cells[low[x] + 1][x + 1] = 'x';
    while (cells.length > 1 && cells[cells.length - 1].every((c) => c === '.')) cells.pop();
  }
  const im = cellsToImg(cells);
  return { ...im, ox: -bx - l, oy: -by - top };
}

/**
 * Une pièce en volumes posée dans une scène comme le jeu pose un meuble : le coin nord-ouest de son emprise (0, 0 du modèle) en
 * (x, y) px de la scène, son emprise profonde de `d` px (le bas de l'image au bord sud y + d) ; profondeur : le bord sud, plus `dz`.
 */
export function pieceBoard(pi: PieceImg, x: number, y: number, d: number, k = 0.5, dz = 0, z = 0): Board {
  // le point (0, 0, 0) du modèle tombe en (ox, oy) de l'image ; à l'écran, le sol au bord sud est en y + d, et un point (x, y', 0)
  // du modèle s'affiche k·(y' − d) au-dessus de ce bord
  return { grid: pi.grid, pal: pi.pal, x: Math.round(x - pi.ox), y: Math.round(y + d - k * d - z - pi.oy), depth: () => y + d + dz };
}

// =====================================================================================================================
// La géométrie
// =====================================================================================================================

/** La face d'une normale (le nom que lisent les matières). */
export function faceOf(n: V3): Face {
  if (n[2] > 0.95) return 'top';
  if (n[2] < -0.95) return 'under';
  if (Math.abs(n[2]) < 0.05) {
    if (n[1] > 0.95) return 'S';
    if (n[1] < -0.95) return 'N';
    if (n[0] > 0.95) return 'E';
    if (n[0] < -0.95) return 'W';
    return 'edge';
  }
  return n[2] > 0 ? 'slope' : 'under';
}
export function inPoly(poly: [number, number][], a: number, b: number): boolean {
  let inside = false;
  for (let i = 0, k = poly.length - 1; i < poly.length; k = i++) {
    const [xi, yi] = poly[i], [xk, yk] = poly[k];
    if ((yi > b) !== (yk > b) && a < ((xk - xi) * (b - yi)) / (yk - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Un polygone régulier de `n` côtés, de rayon r, centré en (a, b) ; `rot` : l'angle du premier sommet. */
export const ngon = (a: number, b: number, r: number, n: number, rot = 0): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const t = rot + (i / n) * Math.PI * 2;
    return [a + Math.cos(t) * r, b + Math.sin(t) * r] as [number, number];
  });

const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * Un prisme droit : la section `sec` (polygone en coordonnées (a, b) le long de e1 et e2, à partir de `o`), poussée le long de `ax`
 * (un vecteur, sa longueur comprise). Les faces du tour ont s le long de l'axe et t le long du côté ; leur `face` vient de leur
 * normale. Les deux bouts (`cap`) sont des faces planes découpées à la section (s, t : les coordonnées a, b moins le coin du cadre) ;
 * `capTex` : leur matière (sinon celle du tour).
 */
export function extrude(o: V3, ax: V3, e1: V3, e2: V3, sec: [number, number][], p: Part, tex: Tex, capTex: Tex = tex, caps: [boolean, boolean] = [true, true]): Quad[] {
  const out: Quad[] = [];
  const ca = sec.reduce((s, q) => s + q[0], 0) / sec.length, cb = sec.reduce((s, q) => s + q[1], 0) / sec.length;
  const P = (a: number, b: number): V3 => add(o, add(mul(e1, a), mul(e2, b)));
  for (let i = 0; i < sec.length; i++) {
    const [a0, b0] = sec[i], [a1, b1] = sec[(i + 1) % sec.length];
    const ed = add(mul(e1, a1 - a0), mul(e2, b1 - b0));
    let n = unit(cross3(ax, ed));
    const mid = add(mul(e1, (a0 + a1) / 2 - ca), mul(e2, (b0 + b1) / 2 - cb));
    if (dot(n, mid) < 0) n = mul(n, -1);
    out.push({ o: P(a0, b0), u: ax, v: ed, n, part: p, tex, face: faceOf(n) });
  }
  const A0 = Math.min(...sec.map((q) => q[0])), A1 = Math.max(...sec.map((q) => q[0]));
  const B0 = Math.min(...sec.map((q) => q[1])), B1 = Math.max(...sec.map((q) => q[1]));
  const cut: Tex = (s, t, c) => (inPoly(sec, A0 + s, B0 + t) ? capTex(s, t, c) : null);
  const A = unit(ax);
  // un bout tourné vers le haut ou le bas est un dessus ou un dessous (les matières le lisent ainsi)
  const capFace = (n: V3): Face => { const f = faceOf(n); return f === 'top' || f === 'under' ? f : 'cap'; };
  if (caps[0]) out.push({ o: P(A0, B0), u: mul(e1, A1 - A0), v: mul(e2, B1 - B0), n: mul(A, -1), part: p, tex: cut, face: capFace(mul(A, -1)) });
  if (caps[1]) out.push({ o: add(P(A0, B0), ax), u: mul(e1, A1 - A0), v: mul(e2, B1 - B0), n: A, part: p, tex: cut, face: capFace(A) });
  return out;
}

/** Une barre de section carrée w de a à b (une perche, un brancard, un montant d'échelle), ses faces tournées vers le dehors. */
export function bar(a: V3, b: V3, w: number, p: Part, tex: Tex): Quad[] {
  const ax: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const A = unit(ax);
  const ref: V3 = Math.abs(A[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  const e1 = unit(cross3(A, ref)), e2 = cross3(A, e1);
  const h1 = mul(e1, w / 2), h2 = mul(e2, w / 2);
  const c = (s1: number, s2: number) => add(add(a, mul(h1, s1)), mul(h2, s2));
  const out: Quad[] = [];
  for (const [o, v, n] of [
    [c(-1, 1), mul(e1, w), e2], [c(-1, -1), mul(e1, w), mul(e2, -1)], [c(1, -1), mul(e2, w), e1], [c(-1, -1), mul(e2, w), mul(e1, -1)],
  ] as [V3, V3, V3][]) out.push({ o, u: ax, v, n, part: p, tex, face: faceOf(n) === 'top' ? 'top' : 'edge' });
  out.push({ o: c(-1, -1), u: mul(e1, w), v: mul(e2, w), n: mul(A, -1), part: p, tex, face: 'cap' });
  out.push({ o: add(c(-1, -1), ax), u: mul(e1, w), v: mul(e2, w), n: A, part: p, tex, face: 'cap' });
  return out;
}

/** La lumière d'une face (sa normale) : 0 au jour (le dessus, le nord-ouest), 1 au milieu (le sud), 2 à l'ombre (l'est, le dessous). */
export function litOf(n: V3): 0 | 1 | 2 {
  const v = -n[0] * 0.75 + n[2] * 0.9 - n[1] * 0.15;
  return v > 0.45 ? 0 : v > -0.3 ? 1 : 2;
}
