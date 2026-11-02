// ESSAI (hors jeu, jamais chargé par le jeu) : la maison de Xéros refaite à la vraie taille, une chaumière bâtie comme la grange.
// Planche : npx tsx tools/essai-maison-xeros.ts écrit .art-preview/essai-maison-xeros.png.
//
// Ce que Grégoire a décidé : un solin de pierres brutes (40 cm de haut, 50 cm d'épais), une ossature en pan de bois (traverse
// basse 20 × 20 sur le solin, poteaux 20 × 20 tous les 1,60 m, sablières hautes), entre deux poteaux le mur en quatre étapes
// (palançons, clayonnage, torchis, chaux), un toit de chaume de seigle à 50° sur des chevrons ronds et des lattes, un faîtage en
// terre où l'herbe pousse, un foyer au milieu de la pièce, de petites fenêtres à volets et une porte en planches.
//
// Le plan, en pixels du jeu (5 cm par pixel) : les axes des poteaux forment un rectangle de 128 × 96 px (6,40 × 4,80 m), poteaux en
// x = 0, 32, 64, 96, 128 (murs sud et nord) et y = 0, 32, 64, 96 (murs ouest et est) ; le solin court sous la traverse basse,
// emprise 138 × 106 px (6,90 × 5,30 m). Hauteurs (z) : solin 0-8, traverse basse 8-12, poteaux 12-48, sablière 48-52, chevrons à
// 50° posés sur la sablière (dessous du chevron à l'axe du mur : z = 52), faîte du chaume à 126 (6,32 m, 5,46 m sous le chaume).
//
// La projection : celle du jeu pour les bâtiments (docs/STYLE.md section 8, pièces `ground`) : un point (x, y, z) s'affiche en
// (x, y − z), profondeur au sol sans raccourci. Rien ici n'est dessiné en perspective à la main : la maison est un petit modèle
// en volumes (boîtes, prismes, faces planes), chacun avec sa matière dessinée au pixel (fonctions de texture), et un rendu qui
// garde, pour chaque pixel de l'écran, le point le plus au sud (sur un rayon de vue, y croît avec z : le plus au sud est le plus
// proche). Puis le contour (section 3 : la teinte sombre de la matière en haut et à gauche, OUTLINE en bas et à droite, contre ce
// qui est derrière), l'ombre portée du toit au sol (la règle du jeu : `SHADOW` de src/config.ts, un point à z px tombe à
// (x + 0,25 z, y + 0,1 z)), l'ombre sous l'avant-toit. Les objets du jeu (pierres du solin, volets, meubles, personnages) sont
// leurs images, posées à leur place avec leur profondeur.
//
// Matières (toutes de art/palette.ts) :
// - bois équarri (poteaux, traverses, sablières, huisseries, linteaux, appuis, lattes, palançons fendus) : la rampe du bois
//   travaillé, à l'âge patiné (`woodAges.worn`, signes ^ * % & @) ; contour clair K ;
// - chevrons et faîtière : des perches avec leur écorce (M m N K) ;
// - baguettes du clayonnage : l'écorce de noisetier de la baguette du jeu (A B Q, art/items/fibres.ts) ;
// - torchis : la terre du chemin (U u n e) et des brins de paille (Y t) ;
// - chaux : la rampe du calcaire (! + = ; ~) : la chaux vient du calcaire cuit, blanc cassé chaud, ombres vers le brun-violet ;
//   des éclaboussures de terre au pied (D E, le torchis de la palette) ;
// - chaume : la rampe du chaume (Y t T P) ; faîtage : la terre (U u n e) et l'herbe (G g v) ;
// - seuil : une dalle de calcaire ; foyer : les pierres brutes du jeu en cercle, le feu en lueurs (H h i).

import { Canvas, type Grid, type Palette } from '../lib/canvas';
import { gameImage } from '../lib/walls';
import { stonePalette } from '../items/stones';
import { woodAges } from '../palette';
import { wallKit } from './walls-high';

/** La palette de l'essai : celle des pierres (le monde et la pierre fraîche), le bois travaillé à l'âge patiné. */
export const PAL: Palette = { ...stonePalette, ...woodAges.worn };

// =====================================================================================================================
// Géométrie
// =====================================================================================================================

export type V3 = [number, number, number];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => mul(a, 1 / len(a));

/** Hachage déterministe, dans [0, 1). */
export function hash(...n: number[]): number {
  let h = 2166136261;
  for (const v of n) {
    h = Math.imul(h ^ ((v | 0) + 0x9e3779b9), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

export type Outline = 'full' | 'thin' | 'none';
/**
 * Une pièce : son contour (`full` : sombre en haut et à gauche, OUTLINE en bas et à droite ; `thin` : OUTLINE seul, pour ce qui
 * fait 1 ou 2 px, une perche, une latte ; `none`), sa priorité à profondeur égale (deux faces au même plan : la plus haute
 * passe devant et prend le contour), et ce qu'elle est (toit, mur sous l'avant-toit, sol).
 */
export interface Part { name: string; prio: number; dark: string; outline: Outline; roof?: boolean; eave?: boolean; ground?: boolean; cast?: boolean }
export const part = (name: string, prio: number, dark: string, outline: Outline = 'full', extra: Partial<Part> = {}): Part =>
  ({ name, prio, dark, outline, cast: true, ...extra });

export type Face = 'top' | 'S' | 'N' | 'E' | 'W' | 'slope' | 'under' | 'edge' | 'cap' | 'ground';
/** Ce qu'une texture sait du pixel : la taille de la face (px), le point, la normale (dans la vue), le pixel de l'écran. */
export interface Ctx { w: number; h: number; p: V3; n: V3; X: number; Y: number; face: Face }
/** Une texture : un signe de PAL, une couleur '#rrggbb', ou null (transparent). (s, t) en px sur la face, t vers le haut. */
export type Tex = (s: number, t: number, c: Ctx) => string | null;
export interface Quad { o: V3; u: V3; v: V3; n: V3; part: Part; tex: Tex; face: Face }
/** Une image du jeu posée dans la scène : coin haut-gauche à l'écran, profondeur par rangée. */
export interface Board { grid: Grid; pal: Palette; x: number; y: number; depth: (row: number) => number; part?: Part }
export interface Scene { quads: Quad[]; boards: Board[]; floor?: [number, number, number, number] }

/** Une boîte : le dessus et les quatre faces debout (u de gauche à droite vu du dehors, v vers le haut). */
export function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, p: Part, tex: Tex | { top: Tex; side: Tex }): Quad[] {
  const T = typeof tex === 'function' ? { top: tex, side: tex } : tex;
  const w = x1 - x0, d = y1 - y0, h = z1 - z0;
  return [
    { o: [x0, y0, z1], u: [w, 0, 0], v: [0, d, 0], n: [0, 0, 1], part: p, tex: T.top, face: 'top' },
    { o: [x0, y1, z0], u: [w, 0, 0], v: [0, 0, h], n: [0, 1, 0], part: p, tex: T.side, face: 'S' },
    { o: [x1, y0, z0], u: [-w, 0, 0], v: [0, 0, h], n: [0, -1, 0], part: p, tex: T.side, face: 'N' },
    { o: [x0, y0, z0], u: [0, d, 0], v: [0, 0, h], n: [-1, 0, 0], part: p, tex: T.side, face: 'W' },
    { o: [x1, y1, z0], u: [0, -d, 0], v: [0, 0, h], n: [1, 0, 0], part: p, tex: T.side, face: 'E' },
  ];
}

/** Un prisme droit le long de a → b, section w1 (selon e1) × w2 (selon e2) : faces `slope` (+e2), `under`, `edge`, `cap`. (s le long de l'axe.) */
export function prism(a: V3, b: V3, e1: V3, e2: V3, w1: number, w2: number, p: Part, tex: Tex): Quad[] {
  const ax = sub(b, a), h1 = mul(e1, w1 / 2), h2 = mul(e2, w2 / 2);
  const c = (s1: number, s2: number) => add(add(a, mul(h1, s1)), mul(h2, s2));
  const A = unit(ax);
  return [
    { o: c(-1, 1), u: ax, v: mul(e1, w1), n: e2, part: p, tex, face: 'slope' },
    { o: c(-1, -1), u: ax, v: mul(e1, w1), n: mul(e2, -1), part: p, tex, face: 'under' },
    { o: c(1, -1), u: ax, v: mul(e2, w2), n: e1, part: p, tex, face: 'edge' },
    { o: c(-1, -1), u: ax, v: mul(e2, w2), n: mul(e1, -1), part: p, tex, face: 'edge' },
    { o: c(-1, -1), u: mul(e1, w1), v: mul(e2, w2), n: mul(A, -1), part: p, tex, face: 'cap' },
    { o: add(c(-1, -1), ax), u: mul(e1, w1), v: mul(e2, w2), n: A, part: p, tex, face: 'cap' },
  ];
}

/** Un prisme le long de x, de section polygonale [y, z] (le faîtage de terre) ; la normale de chaque face, loin du centre. */
export function polyPrism(x0: number, x1: number, sec: [number, number][], p: Part, tex: Tex): Quad[] {
  const cy = sec.reduce((s, q) => s + q[0], 0) / sec.length, cz = sec.reduce((s, q) => s + q[1], 0) / sec.length;
  const out: Quad[] = [];
  for (let i = 0; i + 1 < sec.length; i++) {
    const [y0, z0] = sec[i], [y1, z1] = sec[i + 1];
    let n: V3 = unit([0, z1 - z0, -(y1 - y0)]);
    if (dot(n, [0, (y0 + y1) / 2 - cy, (z0 + z1) / 2 - cz]) < 0) n = mul(n, -1);
    out.push({ o: [x0, y0, z0], u: [x1 - x0, 0, 0], v: [0, y1 - y0, z1 - z0], n, part: p, tex, face: 'slope' });
  }
  return out;
}

/** Centre de la maison (axe des poteaux), autour duquel on tourne la vue. */
export const CENTER: [number, number] = [64, 48];
/** Une vue : 0 du sud (le jeu), 1 de l'ouest, 2 du nord, 3 de l'est (le côté vu passe au sud de la vue). */
export type Rot = 0 | 1 | 2 | 3;
export function rotP(p: V3, r: Rot): V3 {
  const [cx, cy] = CENTER, [x, y, z] = p;
  if (r === 1) return [cx + (y - cy), cy - (x - cx), z];
  if (r === 2) return [2 * cx - x, 2 * cy - y, z];
  if (r === 3) return [cx - (y - cy), cy + (x - cx), z];
  return p;
}
const rotV = (v: V3, r: Rot): V3 => (r === 1 ? [v[1], -v[0], v[2]] : r === 2 ? [-v[0], -v[1], v[2]] : r === 3 ? [-v[1], v[0], v[2]] : v);
export const rotQuads = (qs: Quad[], r: Rot): Quad[] => qs.map((q) => ({ ...q, o: rotP(q.o, r), u: rotV(q.u, r), v: rotV(q.v, r), n: rotV(q.n, r) }));
/** Un rectangle au sol, tourné : [x0, x1, y0, y1]. */
export function rotRect(r4: [number, number, number, number], r: Rot): [number, number, number, number] {
  const a = rotP([r4[0], r4[2], 0], r), b = rotP([r4[1], r4[3], 0], r);
  return [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])];
}

// =====================================================================================================================
// Rendu
// =====================================================================================================================

const VIEW: V3 = [0, Math.SQRT1_2, Math.SQRT1_2];
const proj = (p: V3): [number, number] => [p[0], p[1] - p[2]];

export interface Layer { w: number; h: number; x: number; y: number; rgba: Uint8ClampedArray; roof: Uint8Array }
export type Bounds = [number, number, number, number];

/** Le cadre d'une scène à l'écran (x0, y0, x1, y1 exclus), avec une marge. */
export function bounds(sc: Scene, m: [number, number, number, number]): Bounds {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const see = (x: number, y: number) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const q of sc.quads) for (const p of [q.o, add(q.o, q.u), add(q.o, q.v), add(add(q.o, q.u), q.v)]) see(...proj(p));
  for (const b of sc.boards) { see(b.x, b.y); see(b.x + b.grid[0].length, b.y + b.grid.length); }
  return [Math.floor(x0) - m[0], Math.floor(y0) - m[1], Math.ceil(x1) + m[2], Math.ceil(y1) + m[3]];
}

const DARKER: Record<string, string> = {
  '!': '+', '+': '=', '=': ';', ';': '~', '^': '*', '*': '%', '%': '&', '&': '@', U: 'u', u: 'n', n: 'e', e: 'e', Y: 't', t: 'T', T: 'P',
  A: 'B', B: 'Q', D: 'E', d: 'D', M: 'm', m: 'N', N: 'K', K: 'o', G: 'g', g: 'v', v: 'V',
};
export const darker = (k: string) => DARKER[k] ?? k;

const hex = (h: string): [number, number, number, number] => {
  const s = h.replace('#', '');
  const n = (i: number) => parseInt(s.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), s.length === 8 ? n(6) / 255 : 1];
};
const SHADOW_RGB = hex(PAL.x);
/** L'ombre portée d'un toit, celle du jeu (src/config.ts `SHADOW`). */
const SH = { dx: 0.25, dy: 0.1 };

/**
 * Le rendu d'une scène dans le cadre `bd` : le sol (herbe ; terre battue dans `floor`), les faces, les images, le contour,
 * l'ombre sous l'avant-toit, l'ombre portée au sol. `grass` et `floor` : les tuiles du jeu (signe → couleur déjà résolue).
 */
export function render(sc: Scene, bd: Bounds, tiles: { grass: (x: number, y: number) => string; floor: (x: number, y: number) => string }): Layer {
  const [bx, by, bx1, by1] = bd, W = bx1 - bx, H = by1 - by, N = W * H;
  const depth = new Float64Array(N).fill(-Infinity);
  const ch: string[] = new Array(N).fill('');
  const parts: (Part | undefined)[] = new Array(N);
  const shade = new Uint8Array(N);
  const ground = part('sol', -100, '', 'none', { ground: true, cast: false });
  const fl = sc.floor;
  const groundTex: Tex = (_s, _t, c) => {
    const x = Math.floor(c.p[0]), y = Math.floor(c.p[1]);
    return fl && x >= fl[0] && x < fl[1] && y >= fl[2] && y < fl[3] ? tiles.floor(x, y) : tiles.grass(x, y);
  };
  const quads: Quad[] = [{ o: [bx, by, 0], u: [W, 0, 0], v: [0, H, 0], n: [0, 0, 1], part: ground, tex: groundTex, face: 'ground' }, ...sc.quads];

  // les faces
  for (const q of quads) {
    if (dot(q.n, VIEW) <= 1e-6) continue;
    const a11 = q.u[0], a12 = q.v[0], a21 = q.u[1] - q.u[2], a22 = q.v[1] - q.v[2], det = a11 * a22 - a12 * a21;
    if (Math.abs(det) < 1e-9) continue;
    const cs = [q.o, add(q.o, q.u), add(q.o, q.v), add(add(q.o, q.u), q.v)].map(proj);
    const X0 = Math.max(bx, Math.floor(Math.min(...cs.map((c) => c[0])))), X1 = Math.min(bx1 - 1, Math.ceil(Math.max(...cs.map((c) => c[0]))));
    const Y0 = Math.max(by, Math.floor(Math.min(...cs.map((c) => c[1])))), Y1 = Math.min(by1 - 1, Math.ceil(Math.max(...cs.map((c) => c[1]))));
    const ox = q.o[0], oy = q.o[1] - q.o[2], lu = len(q.u), lv = len(q.v);
    for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) {
      const b1 = X + 0.5 - ox, b2 = Y + 0.5 - oy;
      const s = (b1 * a22 - a12 * b2) / det, t = (a11 * b2 - a21 * b1) / det;
      if (s < 0 || s >= 1 || t < 0 || t >= 1) continue;
      const p = add(add(q.o, mul(q.u, s)), mul(q.v, t));
      const dp = p[1] + q.part.prio * 1e-3;
      const i = (Y - by) * W + (X - bx);
      if (dp <= depth[i]) continue;
      const k = q.tex(s * lu, t * lv, { w: lu, h: lv, p, n: q.n, X, Y, face: q.face });
      if (k === null) continue;
      depth[i] = dp; ch[i] = k; parts[i] = q.part;
    }
  }

  // les images du jeu (leur ombre `x` assombrit ce qui est dessous)
  for (const b of sc.boards) {
    const bp = b.part ?? part('image', 0, '', 'none');
    b.grid.forEach((row, r) => [...row].forEach((k, cI) => {
      if (k === '.') return;
      const X = b.x + cI, Y = b.y + r;
      if (X < bx || X >= bx1 || Y < by || Y >= by1) return;
      const i = (Y - by) * W + (X - bx), dp = b.depth(r);
      if (k === 'x') { if (depth[i] <= dp + 3) shade[i] = 1; return; }
      if (dp <= depth[i]) return;
      depth[i] = dp; ch[i] = b.pal[k]; parts[i] = bp; shade[i] = 0;
    }));
  }

  // le contour : contre ce qui est derrière (plus au nord, ou au même plan et de moindre priorité)
  const out = ch.slice();
  const behind = (i: number, j: number) => {
    if (j < 0) return true;
    const pj = parts[j], pi = parts[i]!;
    if (!pj || pj === pi) return pj ? false : true;
    return depth[j] < depth[i] - 0.6 || (depth[j] <= depth[i] + 0.6 && pj.prio < pi.prio);
  };
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const i = Y * W + X, p = parts[i];
    if (!p || p.outline === 'none') continue;
    const at = (dx: number, dy: number) => (X + dx < 0 || X + dx >= W || Y + dy < 0 || Y + dy >= H ? -1 : (Y + dy) * W + X + dx);
    if (behind(i, at(1, 0)) || behind(i, at(0, 1))) out[i] = 'o';
    else if (p.outline === 'full' && (behind(i, at(-1, 0)) || behind(i, at(0, -1)))) out[i] = p.dark;
  }
  // l'ombre sous l'avant-toit : trois rangées du mur sous le chaume
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const i = Y * W + X;
    if (!parts[i]?.eave) continue;
    for (let k = 1; k <= 3; k++) if (Y - k >= 0 && parts[i - k * W]?.roof) { out[i] = darker(out[i]); if (k === 1) out[i] = darker(out[i]); break; }
  }
  // l'ombre portée du toit et des murs sur l'herbe
  const mask = new Uint8Array(N);
  for (const q of sc.quads) {
    if (!q.part.cast) continue;
    const lu = len(q.u), lv = len(q.v), nu = Math.ceil(lu * 2), nv = Math.ceil(lv * 2);
    for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) {
      const p = add(add(q.o, mul(q.u, (a + 0.5) / nu)), mul(q.v, (b + 0.5) / nv));
      if (p[2] < 0.5) continue;
      const gx = Math.floor(p[0] + SH.dx * p[2]) - bx, gy = Math.floor(p[1] + SH.dy * p[2]) - by;
      if (gx >= 0 && gx < W && gy >= 0 && gy < H) mask[gy * W + gx] = 1;
    }
  }
  for (let i = 0; i < N; i++) {
    if (parts[i] !== ground) continue;
    const X = i % W, Y = (i - X) / W;
    let m = mask[i];
    if (!m) { // on bouche les trous de l'échantillonnage
      let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (mask[(Y + dy) * W + X + dx]) n++;
      m = n >= 3 ? 1 : 0;
    }
    if (m && !(fl && X + bx >= fl[0] && X + bx < fl[1] && Y + by >= fl[2] && Y + by < fl[3])) shade[i] = 1;
  }

  const rgba = new Uint8ClampedArray(N * 4), roof = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const k = out[i];
    const c = hex(k.startsWith('#') ? k : PAL[k] ?? '#ff00ff');
    let [r, g, b] = c;
    if (shade[i]) { const a = SHADOW_RGB[3]; r = r * (1 - a) + SHADOW_RGB[0] * a; g = g * (1 - a) + SHADOW_RGB[1] * a; b = b * (1 - a) + SHADOW_RGB[2] * a; }
    rgba.set([r, g, b, 255], i * 4);
    roof[i] = parts[i]?.roof ? 1 : 0;
  }
  return { w: W, h: H, x: bx, y: by, rgba, roof };
}

/** Le toit effacé du jeu (`ROOF.alpha` de src/config.ts : 0,35) : là où il y a du toit, le toit à 35 % sur la vue sans toit. */
export function fadeRoof(full: Layer, bare: Layer, alpha = 0.35): Layer {
  const rgba = full.rgba.slice();
  for (let i = 0; i < full.roof.length; i++) {
    if (!full.roof[i]) continue;
    for (let k = 0; k < 3; k++) rgba[i * 4 + k] = full.rgba[i * 4 + k] * alpha + bare.rgba[i * 4 + k] * (1 - alpha);
  }
  return { ...full, rgba };
}

// =====================================================================================================================
// Matières
// =====================================================================================================================

/** Un tiret de fil : la voie `lane` (une colonne ou une rangée), la position le long. */
function dash(seed: number, lane: number, pos: number, rate = 0.7): boolean {
  const per = 7 + Math.floor(hash(seed, lane, 1) * 7), l = 2 + Math.floor(hash(seed, lane, 2) * 3), ph = Math.floor(hash(seed, lane, 3) * per);
  return hash(seed, lane, 4) < rate && (((pos + ph) % per) + per) % per < l;
}

/** Bois équarri patiné : le dessus éclairé, la face debout du clair à gauche à l'ombre à droite, le fil en tirets, les chevilles. */
export function timber(seed: number, pegs: [number, number][] = []): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') {
      if (c.w < 5 && c.h < 5) { // bois de bout (le poteau coupé) : l'aubier, puis le cœur
        const e = Math.min(i, j, Math.floor(c.w) - 1 - i, Math.floor(c.h) - 1 - j);
        return e <= 0 ? '*' : '%';
      }
      const alongS = c.w >= c.h, along = alongS ? i : j, across = alongS ? j : i;
      return dash(seed, across, along, 0.35) ? '*' : '^';
    }
    if (pegs.some(([a, b]) => a === i && b === j)) return '@';
    if (c.h > c.w) {
      const f = (i + 0.5) / c.w, base = f < 0.45 ? '^' : f < 0.8 ? '*' : '%';
      return dash(seed, i, j, 0.55) ? darker(base) : base;
    }
    const base = (j + 0.5) / c.h < 0.3 ? '%' : '*';
    return base === '*' && dash(seed, j, i, 0.4) ? '%' : base;
  };
}

/** Une perche avec son écorce (chevron, faîtière) : la face du dessus claire, le dessous à l'ombre, le bout coupé en bois. */
export function pole(seed: number): Tex {
  return (s, t, c) => {
    if (c.face === 'cap') return '*';
    if (c.face === 'under') return 'N';
    const k = c.face === 'edge' ? 'm' : t < c.h * 0.5 ? 'M' : 'm';
    return dash(seed, Math.floor(t * 2), Math.floor(s), 0.4) ? darker(k) : k;
  };
}

/** Une latte fendue : le dessus clair, le chant à l'ombre. */
export function lath(seed: number): Tex {
  return (s, _t, c) => (c.face === 'edge' || c.face === 'cap' ? '%' : dash(seed, 0, Math.floor(s), 0.5) ? '*' : '^');
}

/** Les mottes du torchis : centres sur une grille tremblée de 5 px ; le plus proche, l'écart au second (le joint), le décalage. */
function lumps(seed: number, s: number, t: number) {
  const ci = Math.floor(s / 5), cj = Math.floor(t / 5);
  let d1 = Infinity, d2 = Infinity, dx = 0, dy = 0, id = 0;
  for (let a = ci - 1; a <= ci + 1; a++) for (let b = cj - 1; b <= cj + 1; b++) {
    const cx = a * 5 + 1 + hash(seed, a, b, 1) * 3, cy = b * 5 + 1 + hash(seed, a, b, 2) * 3;
    const d = Math.hypot(s - cx, t - cy);
    if (d < d1) { d2 = d1; d1 = d; dx = s - cx; dy = t - cy; id = hash(seed, a, b, 3); } else if (d < d2) d2 = d;
  }
  return { e: d2 - d1, dx, dy, id };
}

/** Un brin de paille dans le torchis : un tiret de 2 px, couché ou debout. */
function straw(seed: number, i: number, j: number): boolean {
  const at = (a: number, b: number) => hash(seed, a, b, 9) < 0.045;
  const flat = (a: number, b: number) => hash(seed, a, b, 10) < 0.6;
  return at(i, j) || (at(i - 1, j) && flat(i - 1, j)) || (at(i, j - 1) && !flat(i, j - 1));
}

/**
 * Le remplissage d'un pan, étape 3 (torchis) ou 4 (chaux), vu de face ; le dessus (une coupe : le mur tranché de l'intérieur) :
 * la chaux des deux côtés, le torchis au milieu, les baguettes du clayonnage en points.
 */
export function daub(seed: number, lime: boolean): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') {
      const across = c.w >= c.h ? j : i, n = Math.floor(c.w >= c.h ? c.h : c.w);
      if (lime && (across === 0 || across === n - 1)) return '+';
      const along = c.w >= c.h ? i : j;
      return across === Math.floor(n / 2) && along % 3 === 1 ? 'B' : hash(seed, i, j) < 0.3 ? 'n' : 'u';
    }
    const L = lumps(seed, s, t);
    let k: string;
    if (!lime) {
      if (L.e < 0.55 && L.id < 0.35) k = 'e';
      else if (L.e < 0.8 && L.dx - L.dy > 0.3) k = 'n';
      else if (-L.dx + L.dy > 1.2) k = 'U';
      else k = 'u';
      if (straw(seed, i, j)) k = k === 'U' ? 'Y' : 't';
    } else {
      if (L.e < 0.35 && L.id < 0.12 && L.dx - L.dy > 0) k = ';';
      else if (L.e < 0.6 && L.dx - L.dy > 0.8 && L.id < 0.6) k = '=';
      else if (-L.dx + L.dy > 1.8 && L.id > 0.45) k = '!';
      else k = '+';
      // la terre qui rejaillit au pied du mur
      if (t < 3 && hash(seed, Math.floor(s / 3), 5) < 0.55 && t < 1 + hash(seed, i, 6) * 2.5) k = t < 1 ? 'E' : 'D';
    }
    // l'ombre du bois qui encadre : sous la pièce du haut, à droite de la pièce de gauche
    if (t > c.h - 1 || s < 1) k = darker(k);
    return k;
  };
}

/** Les positions (bord gauche) des palançons dans un pan de `w` px : environ tous les 30 cm. */
export function stickPositions(w: number): number[] {
  const n = Math.max(1, Math.round((w - 2) / 6));
  return Array.from({ length: n }, (_, k) => Math.max(0, Math.min(w - 2, Math.round(((k + 0.5) * w) / n - 1))));
}

/** Un palançon : un bâton fendu, la face fendue claire, l'arête d'écorce à droite (le contour la prend). */
export function stick(seed: number): Tex {
  return (s, t, c) => (c.face === 'top' ? '*' : dash(seed, Math.floor(s), Math.floor(t), 0.5) ? '*' : '^');
}

/**
 * Le clayonnage : des baguettes tressées, une par rangée, qui passent devant un palançon et derrière le suivant (une rangée sur
 * deux décalée) : devant, l'écorce claire (A) ; au passage, la teinte moyenne (B) ; derrière, l'ombre (Q) ; là où la baguette
 * passe derrière, on voit le palançon.
 */
export function wattle(seed: number, w: number): Tex {
  const st = stickPositions(w);
  return (s, t, c) => {
    if (c.face === 'top') return 'B';
    const i = Math.floor(s), j = Math.floor(t);
    const k = st.findIndex((x) => i === x || i === x + 1);
    const sign = (n: number) => ((j + n + (seed & 1)) % 2 === 0 ? 1 : -1);
    if (k >= 0) {
      if (sign(k) > 0) return hash(seed, i, j) < 0.25 ? 'S' : 'A';
      return i === st[k] ? '^' : '%';
    }
    let a = st.findIndex((x) => x > i) - 1;
    if (a < -1) a = st.length - 1;
    const x0 = a >= 0 ? st[a] + 2 : -1, x1 = a + 1 < st.length ? st[a + 1] : w + 1;
    const d0 = a >= 0 ? sign(a) : -sign(0), d1 = a + 1 < st.length ? sign(a + 1) : -d0;
    const u = (i - x0 + 0.5) / Math.max(1, x1 - x0), d = d0 * (1 - u) + d1 * u;
    return d > 0.35 ? 'A' : d > -0.35 ? 'B' : 'Q';
  };
}

/** Le noir d'une baie : le dedans dans la pénombre. */
export const voidTex: Tex = (_s, t, c) => (t > c.h - 2 ? '@' : 'o');

/** La porte en planches (90 × 180 cm) : quatre planches debout, joints, chevilles des traverses du dos, bas mouillé, le loquet. */
export function doorTex(seed: number): Tex {
  const joints = [4, 8, 13];
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), h = Math.floor(c.h);
    if (c.face === 'top') return '^';
    if (joints.includes(i)) return '@';
    let k = joints.includes(i - 1) || i === 0 ? '^' : '*';
    if (k === '*' && dash(seed, i, j, 0.6)) k = '%';
    if ((j === 7 || j === h - 8) && [2, 6, 11, 15].includes(i)) k = '@';
    if (i >= 14 && i <= 15 && j === 17) k = '&';
    if (i === 15 && j === 16) k = '@';
    return j < 2 ? darker(k) : k;
  };
}

/** Une dalle de calcaire (le seuil). */
export function slabTex(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') return hash(seed, i >> 1, j) < 0.18 ? '=' : j === Math.floor(c.h) - 1 ? '!' : '+';
    return j === Math.floor(c.h) - 1 ? '+' : hash(seed, i, j) < 0.2 ? ';' : '=';
  };
}

/**
 * Le chaume, la face du dessus d'un pan (t le long de la pente, depuis l'égout) : des rangs de 30 cm posés de bas en haut, chacun
 * couvre le haut du précédent ; le bas de chaque rang en pointes inégales, l'ombre sous les pointes, les brins clairs en tirets
 * dans le sens de la pente ; quelques plaques de paille plus vieille.
 */
export function thatchSlope(seed: number): Tex {
  const C = 6;
  return (s, t) => {
    const i = Math.floor(s);
    const tip = (k: number) => [0, 0.6, 1.1, 1.6][Math.floor(hash(seed, i, k) * 4)] + (hash(seed, i >> 1, k, 7) < 0.3 ? 0.6 : 0);
    let k = Math.floor(t / C);
    if (t >= (k + 1) * C - tip(k + 1)) k++;
    const f = t - (k * C - tip(k));
    let r = 1; // Y t T P : 0 lumière, 1 paille, 2 ombre, 3 creux
    if (f >= C - 1.6) r = f >= C - 0.7 && hash(seed, i, k, 3) < 0.5 ? 3 : 2;
    else if (f < 1) r = hash(seed, i, k, 4) < 0.45 ? 0 : 1;
    else if (dash(seed + 3, i, Math.floor(t * 1.4), 0.45)) r = 0;
    if (hash(seed, i >> 3, k, 11) < 0.05 && r === 1) r = 2;
    return 'YtTP'[r];
  };
}

/** L'égout : la tranche du chaume, les bouts des brins, à l'ombre ; le bas effiloché (des colonnes plus courtes). */
export function thatchEave(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), h = Math.floor(c.h);
    if (j < [0, 0, 1, 1, 2][Math.floor(hash(seed, i, 1) * 5)]) return null;
    if (j >= h - 1) return 't';
    if ((i + Math.floor(hash(seed, Math.floor(i / 3), 2) * 3)) % 3 === 2 && hash(seed, i, j >> 2) < 0.7) return 'P';
    return dash(seed, i, j, 0.5) ? 't' : 'T';
  };
}

/** Le faîtage de terre : la terre modelée par sa pente (le dessus clair), des mottes, l'herbe en touffes sur le dessus. */
export function earthRidge(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), nz = c.n[2];
    // le pied du bourrelet, inégal : le chaume se voit entre les mottes
    if (nz < 0.3 && t < c.h * (0.25 + 0.6 * hash(seed, Math.floor(i / 2), 3))) return null;
    // le bourrelet arrondi : le dessus clair, la joue sud en terre moyenne, le pied à l'ombre (sur le chaume)
    let r = nz > 0.9 ? 0 : nz > 0.3 ? 1 : nz > 0.12 ? 2 : 3;
    const z = Math.floor(c.p[2] * 1.4);
    if (r < 3 && hash(seed, i >> 1, z >> 1) < 0.16) r++;
    else if (r > 0 && hash(seed, i, z, 2) < 0.1) r--;
    // l'herbe : en touffes (4 à 7 px) sur le dessus, quelques brins qui descendent sur la joue
    const tuft = Math.floor((i + Math.floor(hash(seed, Math.floor(i / 6), 8) * 4)) / 6);
    if (hash(seed, tuft, 5) < 0.55 && nz > 0.5) {
      const g = hash(seed, i, z, 6);
      if (nz > 0.9 ? g < 0.8 : g < 0.35) return g < 0.2 ? 'G' : g < 0.5 ? 'g' : 'v';
    }
    return 'Uune'[r];
  };
}

/** Un pignon (vu de face, dans le plan du mur de bout) : le remplissage à l'étape du mur, masqué au triangle sous les chevrons ; `hole` : le trou de fumée. */
export function gableTex(inner: Tex, apex: (s: number) => number, hole?: (s: number, t: number) => boolean): Tex {
  return (s, t, c) => (t >= apex(s) || hole?.(s, t) ? null : inner(s, t, c));
}

// =====================================================================================================================
// La maison
// =====================================================================================================================

/** Étape des murs : 0 l'ossature seule, 1 palançons, 2 clayonnage, 3 torchis, 4 chaux. */
export type WallStage = 0 | 1 | 2 | 3 | 4;
/** Étape du toit : 0 aucun, 1 chevrons (et faîtière), 2 lattes, 3 une couche de chaume, 4 chaume plein, 5 faîtage de terre. */
export type RoofStage = 0 | 1 | 2 | 3 | 4 | 5;
export interface HouseOpts { rot: Rot; wall: WallStage; roof: RoofStage; cut?: boolean }

type Side = 'S' | 'N' | 'E' | 'W';
type Bay = 'plain' | 'door' | 'window';
const SIDES: Record<Side, { c: number; posts: number[]; ew: boolean; out: 1 | -1; bays: Bay[] }> = {
  S: { c: 96, posts: [0, 32, 64, 96, 128], ew: true, out: 1, bays: ['plain', 'door', 'plain', 'window'] },
  N: { c: 0, posts: [0, 32, 64, 96, 128], ew: true, out: -1, bays: ['plain', 'window', 'plain', 'plain'] },
  W: { c: 0, posts: [0, 32, 64, 96], ew: false, out: -1, bays: ['plain', 'plain', 'plain'] },
  E: { c: 128, posts: [0, 32, 64, 96], ew: false, out: 1, bays: ['plain', 'plain', 'plain'] },
};

const RAD = (50 * Math.PI) / 180;
const TAN = Math.tan(RAD), SIN = Math.sin(RAD), COS = Math.cos(RAD);
/** Dessous des chevrons, à la distance d de l'axe du faîtage (y = 48) : z = 52 sur l'axe des murs (d = 48). */
const zU = (d: number) => 52 + (48 - d) * TAN;
/** Un point d'un versant (sud : +1, nord : −1) : sur le dessous des chevrons à la distance d du faîtage, plus k le long de la normale. */
const slopePt = (side: 1 | -1, x: number, d: number, k: number): V3 => [x, 48 + side * (d + k * SIN), zU(d) + k * COS];
/** Le chaume : dessous des chevrons + 3 (chevron et latte) à + 11 (40 cm de paille). Égout coupé d'aplomb à 62 px du faîtage (y = 110). */
const TH_LO = 3, TH_HI = 11, EAVE = 62;
const dAt = (y: number, k: number) => y - k * SIN; // la distance d du point de l'égout (d + k sin = y)
/** Le toit dépasse les pignons de 20 cm (la rive : au-delà, elle cacherait le trou de fumée vu de l'ouest). */
const RX0 = -6, RX1 = 134;
/** Le trou de fumée du pignon ouest : un triangle, pointe en haut, de 50 cm de base (z = 96) et 40 cm de haut, sous le faîte. */
const HOLE_Z = 96, HOLE_H = 8, HOLE_W = 5;
/** Sur la face du pignon ouest (s : y + 2, t : z − 52). */
const inHole = (s: number, t: number) => t >= HOLE_Z - 52 && Math.abs(s - 50) < (HOLE_Z - 52 + HOLE_H - t) * (HOLE_W / HOLE_H);

/** Le remplissage d'un pan à son étape. */
function infillTex(stage: WallStage, seed: number, w: number): Tex {
  return stage === 2 ? wattle(seed, w) : daub(seed, stage === 4);
}

/** Les pièces de la maison, dans le monde (puis tournées dans la vue). */
function houseQuads(o: HouseOpts): Quad[] {
  const Q: Quad[] = [];
  const cutZ = o.cut ? 14 : Infinity;
  const timberP = (name: string, prio: number) => part(name, prio, 'K', 'full', { eave: true });
  /** Une boîte sur un côté : a le long du mur, k en travers (positif vers le dehors), z en hauteur ; le mur sud coupé en mode coupe. */
  const wb = (side: Side, a0: number, a1: number, k0: number, k1: number, z0: number, z1: number, p: Part, tex: Tex | { top: Tex; side: Tex }) => {
    if (side === 'S' && z0 >= cutZ) return;
    if (side === 'S') z1 = Math.min(z1, cutZ);
    const S = SIDES[side], b0 = S.c + S.out * k0, b1 = S.c + S.out * k1;
    const [c0, c1] = [Math.min(b0, b1), Math.max(b0, b1)];
    Q.push(...(S.ew ? box(a0, a1, c0, c1, z0, z1, p, tex) : box(c0, c1, a0, a1, z0, z1, p, tex)));
  };
  let seed = 100;
  const fill = (side: Side, a0: number, a1: number, z0: number, z1: number) => {
    if (a1 - a0 < 1 || z1 - z0 < 1) return;
    const sd = seed++;
    if (o.wall === 1) {
      for (const x of stickPositions(a1 - a0)) wb(side, a0 + x, a0 + x + 2, -1, 1, z0, z1, part('palançon', 2, 'K', 'thin', { eave: true }), stick(sd + x));
    } else if (o.wall >= 2) {
      const k = o.wall === 2 ? 1.5 : 2;
      const p = part(o.wall === 2 ? 'clayonnage' : 'torchis', 1, ';', 'none', { eave: true });
      wb(side, a0, a1, -k, k, z0, z1, p, infillTex(o.wall, sd, a1 - a0));
    }
  };

  for (const side of ['S', 'N', 'W', 'E'] as Side[]) {
    const S = SIDES[side], ew = S.ew;
    const end = ew ? 130 : 94, start = ew ? -2 : 2;
    // traverse basse, sablière
    const sole = timberP('traverse basse', 4);
    if (side === 'S') { wb(side, start, 36, -2, 2, 8, 12, sole, timber(11)); wb(side, 60, end, -2, 2, 8, 12, sole, timber(12)); }
    else wb(side, start, end, -2, 2, 8, 12, sole, timber(13 + S.c));
    if (!o.cut || side !== 'S') {
      const pegs: [number, number][] = S.posts.map((p) => [p - start, 1] as [number, number]);
      wb(side, start, end, -2, 2, 48, 52, timberP('sablière', 7), timber(21 + S.c, pegs));
    }
    // poteaux (les angles, une fois : sur les murs sud et nord)
    for (const p of S.posts) {
      if (!ew && (p === 0 || p === 96)) continue;
      wb(side, p - 2, p + 2, -2, 2, 12, 48, timberP('poteau', 5), timber(31 + p, [[2, 33], [1, 2]]));
    }
    // travées
    S.bays.forEach((bay, b) => {
      const a0 = S.posts[b] + 2, a1 = S.posts[b + 1] - 2, m = (S.posts[b] + S.posts[b + 1]) / 2;
      if (bay === 'plain') fill(side, a0, a1, 12, 48);
      else if (bay === 'door') {
        for (const [j0, j1] of [[36, 39], [57, 60]]) wb(side, j0, j1, -2, 2, 4, 48, timberP('huisserie', 6), timber(41 + j0, [[1, 40], [1, 3]]));
        fill(side, a0, 36, 12, 48); fill(side, 60, a1, 12, 48);
        if (!o.cut) {
          wb(side, 39, 57, -2, 2, 40, 43, timberP('linteau', 6), timber(45));
          fill(side, 39, 57, 43, 48);
          wb(side, 39, 57, -1, 0, 4, 40, part('porte', 3, 'K', 'full', { eave: true }), doorTex(7));
        }
      } else {
        const T = timberP('fenêtre', 6);
        wb(side, a0, a1, -2, 2, 18, 20, T, timber(51 + m));
        wb(side, a0, a1, -2, 2, 28, 30, T, timber(52 + m));
        wb(side, m - 7, m - 5, -2, 2, 20, 28, part('montant', 6, 'K', 'thin', { eave: true }), timber(53 + m));
        wb(side, m + 5, m + 7, -2, 2, 20, 28, part('montant', 6, 'K', 'thin', { eave: true }), timber(54 + m));
        fill(side, a0, a1, 12, 18); fill(side, a0, a1, 30, 48); fill(side, a0, m - 7, 20, 28); fill(side, m + 7, a1, 20, 28);
        if (!o.cut) wb(side, m - 5, m + 5, -2.4, -2, 20, 28, part('baie', 0, 'o', 'none'), voidTex);
      }
    });
  }
  // le seuil : une dalle de calcaire à la place du solin, sous la porte
  Q.push(...box(36, 60, 91, 101, 0, 4, part('seuil', 3, '~', 'full'), slabTex(3)));

  if (o.cut || o.roof === 0) return Q;

  // ---------- le toit ----------
  const roofP = (name: string, prio: number, dark: string, outline: Outline = 'full') => part(name, prio, dark, outline, { roof: true });
  const X: V3 = [1, 0, 0];
  for (const side of [1, -1] as const) {
    const nrm: V3 = [0, side * SIN, COS];
    // chevrons : des perches de 10 cm tous les 40 cm, croisées au faîte, 50 cm au-delà du mur
    for (let x = 0; x <= 128; x += 8) {
      const a = slopePt(side, x, 60, 1), b = slopePt(side, x, -3, 1);
      Q.push(...prism(a, b, X, nrm, 2, 2, roofP('chevron', 8, 'K', 'thin'), pole(x * 3 + side)));
    }
    // lattes : tous les 30 cm le long de la pente, sur les chevrons
    if (o.roof >= 2) {
      for (let q = 2; q < 60 / COS - 2; q += 6) {
        const d = 60 - q * COS;
        const a = slopePt(side, RX0, d, 2.5), b = slopePt(side, RX1, d, 2.5);
        Q.push(...prism(a, b, unit([0, -side * COS, SIN]), nrm, 1.3, 1, roofP('latte', 9, '%', 'thin'), lath(Math.round(q) + side * 50)));
      }
    }
    // le chaume : une couche (le bas du pan), puis plein
    if (o.roof >= 3) {
      const y = 48 + side * EAVE;
      const dHi = dAt(EAVE, TH_HI), dLo = dAt(EAVE, TH_LO);
      const dTop = o.roof === 3 ? 34 : -TH_HI * SIN;
      const thatch = roofP('chaume', 10, 'P');
      const A = slopePt(side, RX0, dHi, TH_HI), B = slopePt(side, RX0, dTop, TH_HI);
      Q.push({ o: A, u: [RX1 - RX0, 0, 0], v: sub(B, A), n: nrm, part: thatch, tex: thatchSlope(side > 0 ? 5 : 6), face: 'slope' });
      const E0: V3 = [RX0, y, zU(dLo) + TH_LO * COS];
      Q.push({ o: E0, u: [RX1 - RX0, 0, 0], v: [0, 0, (TH_HI - TH_LO) / COS], n: [0, side, 0], part: thatch, tex: thatchEave(side > 0 ? 8 : 9), face: 'S' });
      if (o.roof === 3) {
        const lo = slopePt(side, RX0, dTop, TH_LO);
        Q.push({ o: lo, u: [RX1 - RX0, 0, 0], v: mul(nrm, TH_HI - TH_LO), n: [0, -side * COS, SIN], part: thatch, tex: thatchEave(12), face: 'edge' });
      }
      // les rives : la tranche du chaume au-delà des pignons
      for (const [x, nx] of [[RX0, -1], [RX1, 1]] as const) {
        const lo = slopePt(side, x, dLo, TH_LO), hi = slopePt(side, x, dTop, TH_LO);
        Q.push({ o: lo, u: sub(hi, lo), v: mul(nrm, TH_HI - TH_LO), n: [nx, 0, 0], part: thatch, tex: thatchEave(14), face: 'edge' });
      }
    }
  }
  // la faîtière : une perche dans la fourche des chevrons
  const ridgeZ = zU(0) + 2.2;
  Q.push(...prism([RX0 + 4, 48, ridgeZ], [RX1 - 4, 48, ridgeZ], [0, 1, 0], [0, 0, 1], 2.4, 2.4, roofP('faîtière', 8, 'K', 'thin'), pole(77)));
  // le faîtage de terre, un bourrelet sur le faîte, ses pieds dans le chaume
  if (o.roof >= 5) {
    const top = zU(-TH_HI * SIN) + TH_HI * COS;
    const prof: [number, number][] = [[6, -6 * TAN + 0.4], [5, -3.6], [3.8, -1.2], [2.4, 0.7], [0.8, 1.7], [-0.8, 1.7], [-2.4, 0.7], [-3.8, -1.2], [-5, -3.6], [-6, -6 * TAN + 0.4]];
    Q.push(...polyPrism(RX0 - 0.5, RX1 + 0.5, prof.map(([dy, dz]) => [48 + dy, top + dz]), roofP('faîtage', 11, 'e'), earthRidge(31)));
  }
  // les pignons, en torchis sur clayonnage chaulé (au stade des murs), le trou de fumée sous le faîte à l'ouest
  for (const [x, nx] of [[-2, -1], [130, 1]] as const) {
    const apex = (s: number) => zU(Math.abs(s - 2 - 48)) - 52;
    const inner = infillTex(o.wall === 0 ? 4 : o.wall, 90 + x, 100);
    const p = part('pignon', 1, ';', 'none');
    const tex = gableTex(inner, apex, nx < 0 ? inHole : undefined);
    if (nx < 0) Q.push({ o: [x, -2, 52], u: [0, 100, 0], v: [0, 0, 62], n: [-1, 0, 0], part: p, tex, face: 'W' });
    else Q.push({ o: [x, 98, 52], u: [0, -100, 0], v: [0, 0, 62], n: [1, 0, 0], part: p, tex: gableTex(inner, (s) => apex(100 - s)), face: 'E' });
    // l'entrait retroussé, à 1,40 m au-dessus de la sablière
    const d = 48 - (81 - 52) / TAN;
    const T = part('entrait', 6, 'K', 'full');
    Q.push(...box(x - 0 + (nx < 0 ? 0 : -4), x + (nx < 0 ? 4 : 0), 48 - d + 1, 48 + d - 1, 78, 81, T, timber(61 + x)));
  }
  // le trou de fumée : une traverse sous lui, le noir du comble derrière
  Q.push(...box(-2, 2, 48 - HOLE_W - 2, 48 + HOLE_W + 2, HOLE_Z - 2, HOLE_Z, part('chevêtre', 6, 'K', 'full'), timber(71)));
  Q.push({ o: [3, 36, HOLE_Z - 2], u: [0, 24, 0], v: [0, 0, 14], n: [-1, 0, 0], part: part('comble', 0, 'o', 'none'), tex: voidTex, face: 'W' });
  return Q;
}

// ---------- le solin, avec les pierres du jeu ----------

const kit = wallKit(gameImage);
const SOLIN = part('solin', 2, 'o', 'none');

/** Les images du solin dans la vue : les deux murs « est-ouest de la vue » pleine longueur, les bandes de côté entre eux ; le seuil coupe celui où il est. */
function solinBoards(r: Rot, seed: number): Board[] {
  const R = rotRect([-5, 133, -5, 101], r), G = rotRect([36, 60, 91, 101], r);
  const [X0, X1, Y0, Y1] = R, out: Board[] = [];
  const run = (x0: number, x1: number, y0: number, sd: number) => {
    if (x1 - x0 < 4) return;
    const g = kit.highWall('rough', sd, { length: x1 - x0, face: 8, top: 10 }, { left: 'head', right: 'head' });
    out.push({ grid: g, pal: PAL, x: x0, y: y0 - 8, depth: (row) => (row < 10 ? y0 + row + 0.5 : y0 + 10), part: SOLIN });
  };
  const band = (x0: number, y0: number, y1: number, sd: number) => {
    if (y1 - y0 < 2) return;
    const g = kit.highWall('rough', sd, { length: 10, face: 4, top: y1 - y0 + 4, axis: 'ns' }, { left: 'head', right: 'head' }).slice(0, y1 - y0);
    out.push({ grid: g, pal: PAL, x: x0, y: y0 - 8, depth: (row) => y0 + row + 0.5, part: SOLIN });
  };
  for (const [y0, sd] of [[Y1 - 10, seed], [Y0, seed + 1]] as const) {
    if (G[2] >= y0 - 0.5 && G[3] <= y0 + 10.5) { run(X0, G[0], y0, sd); run(G[1], X1, y0, sd + 7); } else run(X0, X1, y0, sd);
  }
  for (const [x0, sd] of [[X0, seed + 2], [X1 - 10, seed + 3]] as const) {
    if (G[0] >= x0 - 0.5 && G[1] <= x0 + 10.5) { band(x0, Y0 + 10, G[2], sd); band(x0, G[3], Y1 - 10, sd + 7); } else band(x0, Y0 + 10, Y1 - 10, sd);
  }
  return out;
}

/** Une image posée au sol dans la vue : son bas sur y (le bord sud), sa gauche sur x, à la hauteur z ; profondeur y. */
export function placed(grid: Grid, pal: Palette, x: number, y: number, z = 0, depth = y): Board {
  return { grid, pal, x: Math.round(x), y: Math.round(y - z - grid.length), depth: () => depth };
}

/** La maison dans une vue : ses pièces tournées, le solin, les volets du côté vu. `img(nom)` : une image du jeu. */
export function houseScene(o: HouseOpts, img: (name: string) => { grid: Grid; pal: Palette }): Scene {
  const quads = rotQuads(houseQuads(o), o.rot);
  const boards = solinBoards(o.rot, 41);
  if (!o.cut && o.wall >= 3) {
    // fenêtre sud : volet ouvert, de chant (la vue suivante du volet, r1), contre le montant ouest
    if (o.rot === 0) { const s = img('plank-shutter-r1-worn'); boards.push(placed(s.grid, s.pal, 104, 111, 20, 110)); }
    // fenêtre nord : volet fermé, vu du nord
    if (o.rot === 2) { const s = img('plank-shutter-worn'); boards.push(placed(s.grid, s.pal, 128 - 54, 99.5, 20, 99.5)); }
  }
  const fl = rotRect([5, 123, 5, 91], o.rot);
  return { quads, boards, floor: fl };
}

/** Une travée seule (rangée 1 de la planche) : deux poteaux, traverse basse sur son solin, sablière, le remplissage à son étape. */
export function bayScene(stage: WallStage): Scene {
  const Q: Quad[] = [];
  const T = (n: string, prio: number) => part(n, prio, 'K', 'full');
  Q.push(...box(-2, 34, 94, 98, 8, 12, T('traverse basse', 4), timber(11)));
  Q.push(...box(-2, 34, 94, 98, 48, 52, T('sablière', 7), timber(21, [[2, 1], [34, 1]])));
  for (const x of [0, 32]) Q.push(...box(x - 2, x + 2, 94, 98, 12, 48, T('poteau', 5), timber(31 + x, [[2, 33], [1, 2]])));
  if (stage === 1) for (const x of stickPositions(28)) Q.push(...box(2 + x, 4 + x, 95, 97, 12, 48, part('palançon', 2, 'K', 'thin'), stick(x)));
  if (stage >= 2) {
    const k = stage === 2 ? 1.5 : 2;
    Q.push(...box(2, 30, 96 - k, 96 + k, 12, 48, part('remplissage', 1, ';', 'none'), infillTex(stage, 7, 28)));
  }
  // les encoches des palançons : sous la sablière et dans la traverse basse, des creux sombres
  if (stage === 1) for (const x of stickPositions(28)) Q.push(...box(2 + x, 4 + x, 95, 97, 11.6, 12, part('encoche', 4.5, 'o', 'none'), () => '@'));
  const g = kit.highWall('rough', 9, { length: 42, face: 8, top: 10 }, { left: 'head', right: 'head' });
  return { quads: Q, boards: [{ grid: g, pal: PAL, x: -5, y: 83, depth: (row) => (row < 10 ? 91 + row + 0.5 : 101), part: SOLIN }] };
}

// =====================================================================================================================
// Le dedans : le foyer, et les deux vues nord-sud qui manquent aux meubles (paillasse, table)
// =====================================================================================================================

/** Le feu du foyer : deux bûches croisées, les flammes (H h i), les braises ; 12 × 11, posé au milieu du cercle. */
export const FIRE: Grid = [
  '.....H......',
  '....HH..h...',
  '....Hh..h...',
  '...hHHh.hh..',
  '...hHHHhih..',
  '..ihHHHHhi..',
  '..ihHHhHhii.',
  '.KNihHHhiNK.',
  'KNNiihhiiNNo',
  '.oKNiiiiNKo.',
  '..ooKKKKoo..',
];
/** Les cendres au fond du cercle : un disque gris (r z), des braises (i). */
export function ashes(r: number): Grid {
  const c = new Canvas(2 * r, 2 * r);
  for (let y = 0; y < 2 * r; y++) for (let x = 0; x < 2 * r; x++) {
    const d = Math.hypot(x + 0.5 - r, y + 0.5 - r);
    if (d > r) continue;
    c.set(x, y, d > r - 1.2 ? 'Z' : hash(3, x, y) < 0.12 ? 'i' : hash(4, x >> 1, y) < 0.4 ? 'r' : 'z');
  }
  return c.toGrid();
}

/**
 * La paillasse vue en long (nord-sud) : 90 × 200 × 20 cm, boîte : 18 × (4 + 20) px. Le traversin au nord, la paille (Y t), la
 * couverture de laine (u n e) sur la moitié sud, la toile de la paillasse de face (T P). Même matière que la paillasse est-ouest.
 */
export const PALLET_NS: Grid = [
  '..PPPPPPPPPPPPPP..',
  '.PYYYYYYYYYYYYYYto',
  'PYYddddddddddddYto',
  'PYYdddddddddddDYto',
  'PYYddddddddddDDYto',
  'PYYDDDDDDDDDDDDYto',
  'PYYYYYYtYYYYYYYYto',
  'PYtYYYYYYYYYYtYYto',
  'PYYYYYtYYYYYYYYYto',
  'Puuuuuuuuuuuuuuueo',
  'Punnnnnnnnnnnnnneo',
  'Punnnneennnnnnnneo',
  'Punnnnnnnnnnnnnneo',
  'Punnnnnnnnneennneo',
  'Punnnnnnnnnnnnnneo',
  'Pnnneennnnnnnnnneo',
  'Pnnnnnnnnnnnnnnneo',
  'Pnnnnnnnnnnneennno',
  'Pnnnnnnnnnnnnnnneo',
  'Peeeeeeeeeeeeeeeeo',
  'PTTTTTTTTTTTTTTTTo',
  'PTTPTTTTTTTPTTTTTo',
  'oPPPPPPPPPPPPPPPPo',
  '.oooooooooooooooo.',
  '..xxxxxxxxxxxxxxxx',
];

/**
 * La table vue en long (nord-sud) : 90 × 210 × 78 cm, boîte : 18 × (16 + 21) px. Trois planches dans le sens de la longueur, le
 * bord nord éclairé, le chant du plateau, la ceinture, les pieds de devant (ceux de derrière sont derrière eux). Bois des meubles
 * (M m N K), comme la table est-ouest.
 */
export const TABLE_NS: Grid = (() => {
  const rows: string[] = [];
  rows.push('.KKKKKKKKKKKKKKKK.');
  rows.push('KYYYYYYYYYYYYYYYYo');
  for (let j = 2; j < 20; j++) {
    let r = 'K';
    for (let i = 1; i < 17; i++) {
      if (i === 6 || i === 11) r += 'm';
      else if (i >= 15) r += j > 16 ? 'N' : 'm';
      else r += hash(12, i, j >> 2) < 0.12 ? 'm' : 'M';
    }
    rows.push(r + 'o');
  }
  rows.push('KNNNNNNNNNNNNNNNNo');
  rows.push('.oKKKKKKKKKKKKKKo.');
  rows.push('.KMmNNNNNNNNNNMmNo');
  rows.push('.KMmNoooooooooKMmNo'.slice(0, 18));
  for (let j = 0; j < 11; j++) rows.push('.KMmNo.......KMmNo');
  rows.push('.KMmNoxxxxxxxKMmNo');
  rows.push('.ooooxxxxxxxxooooxx'.slice(0, 18));
  return rows;
})();
