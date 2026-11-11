// ESSAI (hors jeu, jamais chargé par le jeu) : la maison du coq, maître de la ferme du riche (CADRAGE-coq.md, chantier
// « maison du coq »). Planches : npx tsx tools/essai-coq.ts écrit .art-preview/coq-dehors.png, coq-niveaux.png, coq-escalier.png et
// coq-vue-joueur.png.
//
// La méthode est celle de la maison de Xéros (art/proposals/maison-xeros.ts, art/lib/volumes.ts) : un modèle en volumes (boîtes,
// prismes, faces), chaque face avec sa matière dessinée au pixel, rendu dans la projection du jeu (un point (x, y, z) s'affiche en
// (x, y − z), STYLE.md section 8, pièces `ground`), le point le plus au sud gardé, puis le contour de STYLE.md section 3 et l'ombre
// portée du toit par la règle `SHADOW` de src/config.ts. Les meubles du jeu sont leurs images ; les meubles qui manquent sont des
// petits modèles rendus comme un meuble du jeu (le dessus en raccourci à ½, `renderPiece` avec k = ½), puis posés comme eux.
//
// Tout est mesuré au plan du cadrage (section 3), en px du jeu (5 cm par pixel), depuis le coin nord-ouest hors œuvre, nord en haut :
// 16,40 × 6,80 m hors œuvre = 328 × 136 px ; murs de 60 cm (12 px), refends de 40 cm (8 px) en x 104-112 et 156-164 ; dans œuvre
// x 12-316, y 12-124. Hauteurs (z, px) : sol 0, plancher de l'étage 57 (2,85 m ; dessous des solives 52,4), cordon 54-58, haut des
// gouttereaux 109 (5,45 m : corrigé du cadrage, la croisée de l'étage, appui à 90 cm et 1,60 m de jour, monte à 2,50 m au-dessus
// du plancher), égout des laves 111 à 20 cm du mur, faîte 183 (9,15 m), souches 204 (10,20 m).
//
// La pierre, les baies, les tentures sont celles de l'autre dessinateur du chantier, importées telles quelles, ni recopiées ni
// modifiées : art/proposals/coq-pierre.ts (`COQ_PAL`, `ashlarWall`, `stringCourse`, `laves`, `lavesRidge`, `flagstones`,
// `limePlaster` ; `quoinWall` ne sert pas : les chaînes d'angle passent par l'option `quoins` d'`ashlarWall`, sur la face entière),
// art/proposals/coq-baies.ts (`withBays`, `crossWindow`, `archDoor`) et art/proposals/coq-tentures.ts (`verdure`, `tenture`). Les
// parements sont appelés en coordonnées du monde (s = x, t = z, une face de 328 px), pour que les assises se suivent d'un morceau
// de mur à l'autre.

import type { Grid, Palette } from '../lib/canvas';
import { COQ_PAL, ashlarWall, stringCourse, laves, lavesRidge, flagstones, limePlaster } from './coq-pierre';
import { withBays, crossWindow, archDoor, type Bay as StoneBay } from './coq-baies';
import { verdure as verdureGrid, tenture as tentureGrid } from './coq-tentures';
import {
  add, sub, mul, dot, len, unit, box, polyPrism, part, hash, dash, renderPiece,
  type V3, type Part, type Quad, type Tex, type Board, type Scene,
} from '../lib/volumes';

// =====================================================================================================================
// Palette et matières de pierre (art/proposals/coq-pierre.ts), baies (coq-baies.ts), tentures (coq-tentures.ts)
// =====================================================================================================================

/**
 * La palette de l'essai : `COQ_PAL` de coq-pierre.ts (le monde, la pierre fraîche, le calcaire taillé θ λ, les laves ( ) ? ",
 * le verre et le plomb > < `, le fer - _, la guède α β γ δ, la garance ρ σ τ, le bois travaillé patiné). Rien n'y est ajouté.
 */
export const PAL: Palette = { ...COQ_PAL };
/** Les matières de pierre prises à coq-pierre.ts (pour la légende des planches). */
export const STONE_USED = ['ashlarWall', 'stringCourse', 'laves', 'lavesRidge', 'flagstones', 'limePlaster'];

/** La largeur d'une face de la maison (px) : les matières de coq-pierre.ts sont appelées en coordonnées du monde, s = x, t = z. */
const FACE_W = 328;
/**
 * Le parement d'un mur en coordonnées du monde (s = x, t = z, la face entière de 328 px de large), pour que les assises, les
 * joints et les chaînes d'angle (`quoins`) se suivent d'un morceau de mur à l'autre ; le dessus (l'arase) dans ses coordonnées.
 */
function worldAshlar(seed: number, quoins = true, bays: StoneBay[] = []): Tex {
  const a = ashlarWall(seed, quoins ? { quoins: ['left', 'right'] } : {});
  const face = bays.length ? withBays(a, bays) : a;
  return (s, t, c) => (c.face === 'top' || c.face === 'under' ? a(s, t, c) : face(c.p[0], c.p[2], { ...c, w: FACE_W, h: 200 }));
}

// =====================================================================================================================
// Matières de bois et de drap (le reste : coq-pierre.ts, coq-baies.ts)
// =====================================================================================================================

/** Des planches de chêne debout (la porte de l'étage du bolet, la baie de la lucarne), deux pentures de fer. */
function planksDoor(plank = 4): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), h = Math.floor(c.h);
    if (i < 1 || j >= h - 1) return '&'; // l'ombre de l'embrasure, en haut et à gauche
    if (j === 4 || j === h - 6) return i % 2 ? '_' : '-';
    if (i % plank === 0) return '@';
    return i % plank === 1 ? '^' : j < 2 ? '%' : '*';
  };
}
/** Un petit jour vitré (losanges plombés, le reflet en biais). */
function leadedTex(): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), w = Math.floor(c.w), h = Math.floor(c.h);
    if (i === 0 || j === 0 || i === w - 1 || j === h - 1 || (i + j) % 4 === 0 || (((i - j) % 4) + 4) % 4 === 0) return '`';
    const d = i + (h - 1 - j);
    return d >= 3 && d <= 5 ? '<' : '>';
  };
}
/** Le bois des meubles (bois travaillé, signes de woodAges) : le dessus clair, la face sud, l'ombre à droite, le fil. */
function furnWood(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') return dash(seed, j, i, 0.35) ? '*' : '^';
    if (c.face === 'E' || c.face === 'edge') return '%';
    return dash(seed, i, j, 0.3) ? '%' : '*';
  };
}
/** Un panneau de bois (porte de dressoir, chevet) : cadre clair, panneau, l'ombre du cadre. */
function panelWood(): Tex {
  return (s, t, c) => {
    if (c.face === 'top') return '^';
    const i = Math.floor(s), j = Math.floor(t), h = Math.floor(c.h);
    if (i === 0 || j === h - 1) return '^';
    if (i === 1 || j === h - 2) return '%';
    return '*';
  };
}
/** Un drap : la garance (ρ σ τ) ou la guède (α β γ δ) de COQ_PAL, plis verticaux, le haut éclairé. */
function cloth(kind: 'red' | 'blue', folds = 3): Tex {
  const R = kind === 'red' ? 'ρρστ' : 'αβγδ';
  return (s, t, c) => {
    if (c.face === 'top') return R[0];
    const f = Math.floor(s) % folds;
    return f === 0 ? R[3] : f === folds - 1 ? R[2] : t > c.h - 1.5 ? R[0] : R[1];
  };
}

// =====================================================================================================================
// Rendu d'une scène (le monde ou le dedans)
// =====================================================================================================================

export interface Layer { w: number; h: number; x: number; y: number; rgba: Uint8ClampedArray }
export type Bounds = [number, number, number, number];
const proj = (p: V3): [number, number] => [p[0], p[1] - p[2]];
const VIEW: V3 = [0, Math.SQRT1_2, Math.SQRT1_2];

export const hex = (h: string): [number, number, number, number] => {
  const s = h.replace('#', '');
  const n = (i: number) => parseInt(s.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), s.length === 8 ? n(6) / 255 : 1];
};
/** L'ombre portée du jeu (src/config.ts `SHADOW`) : un point à z px tombe en (x + 0,25 z, y + 0,1 z). */
const SH = { dx: 0.25, dy: 0.1 };
/** Le vide autour d'un intérieur (`INTERIOR.void` de src/config.ts) et la pénombre (`INTERIOR.shade`). */
export const VOID = '#1e1610';
const SHADE: [number, number, number] = [0x1a, 0x0e, 0x06];

/** Une pièce sombre : ce qu'on voit de l'étage du dessous par la trémie, dans l'ombre (`dim` : la part de la pénombre). */
export interface CoqPart extends Part { dim?: number }

/** Le cadre d'une scène à l'écran, avec une marge (gauche, haut, droite, bas). */
export function bounds(sc: Scene, m: [number, number, number, number]): Bounds {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const see = (x: number, y: number) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const q of sc.quads) for (const p of [q.o, add(q.o, q.u), add(q.o, q.v), add(add(q.o, q.u), q.v)]) see(...proj(p));
  for (const b of sc.boards) { see(b.x, b.y); see(b.x + b.grid[0].length, b.y + b.grid.length); }
  return [Math.floor(x0) - m[0], Math.floor(y0) - m[1], Math.ceil(x1) + m[2], Math.ceil(y1) + m[3]];
}

/**
 * Le rendu d'une scène dans le cadre `bd` : le sol (`ground(x, y)` : une couleur, ou null pour le vide), les faces, les images, le
 * contour, l'ombre portée au sol de ce qui a une hauteur (`cast`), la pénombre des pièces `dim`.
 */
export function render(sc: Scene, bd: Bounds, ground: (x: number, y: number) => string | null): Layer {
  const [bx, by, bx1, by1] = bd, W = bx1 - bx, H = by1 - by, N = W * H;
  const depth = new Float64Array(N).fill(-Infinity);
  const ch: string[] = new Array(N).fill('');
  const parts: (CoqPart | undefined)[] = new Array(N);
  const shade = new Uint8Array(N);
  const gp = part('sol', -100, '', 'none', { ground: true, cast: false });
  const groundTex: Tex = (_s, _t, c) => ground(Math.floor(c.p[0]), Math.floor(c.p[1])) ?? VOID;
  const quads: Quad[] = [{ o: [bx, by, 0], u: [W, 0, 0], v: [0, H + 400, 0], n: [0, 0, 1], part: gp, tex: groundTex, face: 'ground' }, ...sc.quads];

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
  // l'ombre portée au sol (le toit, les murs, les souches)
  const mask = new Uint8Array(N);
  for (const q of sc.quads) {
    if (!q.part.cast) continue;
    const lu = len(q.u), lv = len(q.v), nu = Math.ceil(lu * 1.5), nv = Math.ceil(lv * 1.5);
    for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) {
      const p = add(add(q.o, mul(q.u, (a + 0.5) / nu)), mul(q.v, (b + 0.5) / nv));
      if (p[2] < 0.5) continue;
      const gx = Math.floor(p[0] + SH.dx * p[2]) - bx, gy = Math.floor(p[1] + SH.dy * p[2]) - by;
      if (gx >= 0 && gx < W && gy >= 0 && gy < H) mask[gy * W + gx] = 1;
    }
  }
  for (let i = 0; i < N; i++) {
    if (parts[i] !== gp || ch[i] === VOID) continue;
    const X = i % W, Y = (i - X) / W;
    let m = mask[i];
    if (!m) { let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (mask[(Y + dy) * W + X + dx]) n++; m = n >= 3 ? 1 : 0; }
    if (m) shade[i] = 1;
  }
  const SR = hex(PAL.x);
  const rgba = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N; i++) {
    const k = out[i];
    let [r, g, b] = hex(k.startsWith('#') ? k : PAL[k] ?? '#ff00ff');
    if (shade[i]) { const a = SR[3]; r = r * (1 - a) + SR[0] * a; g = g * (1 - a) + SR[1] * a; b = b * (1 - a) + SR[2] * a; }
    const d = parts[i]?.dim ?? 0;
    if (d) { r = r * (1 - d) + SHADE[0] * d; g = g * (1 - d) + SHADE[1] * d; b = b * (1 - d) + SHADE[2] * d; }
    rgba.set([r, g, b, 255], i * 4);
  }
  return { w: W, h: H, x: bx, y: by, rgba };
}

// =====================================================================================================================
// Géométrie : les murs percés, les faces
// =====================================================================================================================

export interface Hole { a0: number; a1: number; z0: number; z1: number }
const quad = (o: V3, u: V3, v: V3, n: V3, p: Part, tex: Tex, face: Quad['face'] = 'S'): Quad => ({ o, u, v, n, part: p, tex, face });

/**
 * Un mur droit percé (le dedans : les portes des refends, les baies coupées) : le long de x (`ew`) ou de y, de a0 à a1, épaisseur
 * c0-c1, de z0 à z1 ; les trous le découpent en boîtes (une colonne par intervalle entre les bords des trous).
 */
function wall(Q: Quad[], ew: boolean, a0: number, a1: number, c0: number, c1: number, z0: number, z1: number, holes: Hole[], p: Part, tex: Tex | { top: Tex; side: Tex }): void {
  if (z1 - z0 < 0.01 || a1 - a0 < 0.01) return;
  const cuts = [...new Set([a0, a1, ...holes.flatMap((h) => [h.a0, h.a1]).filter((a) => a > a0 && a < a1)])].sort((x, y) => x - y);
  for (let k = 0; k + 1 < cuts.length; k++) {
    const p0 = cuts[k], p1 = cuts[k + 1], m = (p0 + p1) / 2;
    const hs = holes.filter((h) => h.a0 <= m && h.a1 >= m && h.z1 > z0 && h.z0 < z1).sort((x, y) => x.z0 - y.z0);
    let z = z0;
    const put = (za: number, zb: number) => {
      if (zb - za < 0.01) return;
      Q.push(...(ew ? box(p0, p1, c0, c1, za, zb, p, tex) : box(c0, c1, p0, p1, za, zb, p, tex)));
    };
    for (const h of hs) { put(z, Math.max(z, h.z0)); z = Math.max(z, h.z1); }
    put(z, z1);
  }
}

/** La coupe d'un mur tranché (le dedans) : les deux parements de pierre de taille, le blocage de moellons et de chaux au milieu. */
function section(seed: number, ew: boolean, c0: number, c1: number): Tex {
  return (_s, _t, c) => {
    const k = ew ? c.p[1] : c.p[0], d = Math.min(k - c0, c1 - k);
    if (d < 2) return d < 1 && k - c0 < 1 ? '+' : '=';
    return hash(seed, Math.floor(c.p[0] / 2), Math.floor(c.p[1] / 2)) < 0.3 ? 'z' : hash(seed + 1, Math.floor(c.p[0]), Math.floor(c.p[1])) < 0.2 ? 'R' : 'r';
  };
}

// =====================================================================================================================
// La maison : le plan, au cm du cadrage (px)
// =====================================================================================================================

export const HOUSE = {
  W: 328, D: 136, wall: 12, floor: 57, slab: 52, gutter: 109, eaveY: 4, eaveZ: 111, ridge: 183, stack: 204,
  /** Les refends de pierre (x0, x1) : la cuisine | le passage | la salle. */
  refends: [[104, 112], [156, 164]] as [number, number][],
  /** La cloison de pan de bois de l'étage, entre la chambre du coq et celle de la fille (x 1300-1315). */
  partition: [260, 263] as [number, number],
  /** L'escalier : 15 marches de 19 cm (3,8 px), 14 girons de 26 cm (5,2 px), x 680-780, première contremarche à y 514, arrivée à y 150. */
  stair: { x0: 136, x1: 156, y0: 102.8, rise: 3.8, run: 5.2, n: 15 },
  /** La trémie (x 680-780, y 150-430). */
  well: [136, 156, 30, 86] as [number, number, number, number],
};

/** Les baies du mur sud ; `kind` : ce qui les ferme. */
interface Bay extends Hole { kind: 'door' | 'half' | 'cross' | 'small' | 'upper-door' }
export function southBays(v: Version): Bay[] {
  const up = (a0: number): Bay => ({ a0, a1: a0 + 21, z0: 75, z1: 107, kind: 'cross' }); // croisée 1,05 × 1,60, appui à 90 cm du plancher
  const half = (a0: number): Bay => ({ a0, a1: a0 + 20, z0: 18, z1: 46, kind: 'half' }); // demi-croisée 1,00 × 1,40, appui à 90 cm
  if (v === 'B') return [
    half(48), { a0: 78, a1: 100, z0: 0, z1: 44, kind: 'door' }, half(224), half(280),
    up(48), { a0: 117, a1: 135, z0: 57, z1: 95, kind: 'upper-door' }, up(202), up(279),
  ];
  return [
    half(48), { a0: 114, a1: 136, z0: 0, z1: 44, kind: 'door' }, half(190), half(270),
    up(48), { a0: 121, a1: 129, z0: 75, z1: 85, kind: 'small' }, up(202), up(279),
  ];
}
const asStoneBay = (b: Bay, seed: number): StoneBay => ({ s0: b.a0, s1: b.a1, t0: b.z0, t1: b.z1, arch: b.kind === 'door', seed });
/** Les baies du mur nord (vues du dedans) : la petite fenêtre de l'évier ; à l'étage, un jour sur le palier. */
const NORTH_BAYS: Hole[] = [{ a0: 42, a1: 52, z0: 22, z1: 32 }, { a0: 124, a1: 132, z0: 75, z1: 85 }];
/** Les portes des refends et de la cloison (le long de y) : en bas, la cuisine et la salle ; en haut, sur le palier ; la fille. */
const INNER_DOORS: { wall: 'W' | 'E' | 'P'; y0: number; y1: number; level: 0 | 1 }[] = [
  { wall: 'W', y0: 60, y1: 78, level: 0 }, { wall: 'E', y0: 105, y1: 122, level: 0 },
  { wall: 'W', y0: 12, y1: 30, level: 1 }, { wall: 'E', y0: 12, y1: 30, level: 1 }, { wall: 'P', y0: 100, y1: 118, level: 1 },
];
/** Les deux cheminées du mur nord (la salle, la chambre du coq au-dessus), dans la même souche (x ≈ 1060). */
const SALLE_FIRE = { x0: 188, x1: 236 }, CHAMBER_FIRE = { x0: 200, x1: 224 };

export type Version = 'A' | 'B' | 'C';
export type View = { kind: 'outside'; version: Version } | { kind: 'inside'; level: 0 | 1 };

const STONE = (name = 'pierre de taille') => part(name, 2, '~', 'full');

/** Les volumes d'une baie du mur sud (coq-baies.ts, et la porte de planches et le petit jour), devant la face percée. */
function bayVolumes(Q: Quad[], b: Bay, y: number): void {
  const w = b.a1 - b.a0, h = b.z1 - b.z0;
  if (b.kind === 'door') { Q.push(...archDoor({ x: b.a0, face: y, w, h })); return; }
  if (b.kind === 'cross' || b.kind === 'half') {
    Q.push(...crossWindow({ x: b.a0, face: y, z: b.z0, w, h, kind: b.kind, low: Math.round(h * 0.5), open: false }));
    return;
  }
  const p = part('baie', 1, '&', 'none');
  Q.push(quad([b.a0, y - 3, b.z0], [w, 0, 0], [0, 0, h], [0, 1, 0], p, b.kind === 'small' ? leadedTex() : planksDoor()));
}

/** Le mur sud vu du dehors : une seule face de pierre de taille percée de ses baies (coq-baies.ts `withBays`), ses volumes, le cordon. */
function southFace(Q: Quad[], v: Version, P: Part): void {
  const H = HOUSE, bays = southBays(v);
  Q.push(...box(0, H.W, H.D - H.wall, H.D, 0, H.gutter, P, worldAshlar(11, true, bays.map((b, i) => asStoneBay(b, i)))));
  for (const b of bays) bayVolumes(Q, b, H.D);
}

/** Le toit à deux pans de laves entre les pignons découverts, l'égout, le faîtage ; `x0`-`x1` le long de la maison. */
function roofQuads(Q: Quad[], x0: number, x1: number): void {
  const H = HOUSE, s2 = Math.SQRT1_2, mid = H.D / 2, run = mid + H.eaveY;
  const roofP = part('laves', 10, '"', 'full', { roof: true });
  // pan sud (le pan nord, vu du sud, est caché par lui)
  Q.push(quad([x0, H.D + H.eaveY, H.eaveZ], [x1 - x0, 0, 0], [0, -run, run], [0, s2, s2], roofP, laves(21), 'slope'));
  Q.push(quad([x0, -H.eaveY, H.eaveZ], [x1 - x0, 0, 0], [0, run, run], [0, -s2, s2], roofP, laves(22), 'slope'));
  // l'égout : le chant des laves empilées
  Q.push(quad([x0, H.D + H.eaveY, H.eaveZ - 3], [x1 - x0, 0, 0], [0, 0, 3], [0, 1, 0], roofP, laves(23), 'S'));
  // le faîtage de pierre
  const top = H.eaveZ + run;
  Q.push(...polyPrism(x0, x1, [[mid + 3, top - 1], [mid + 2, top + 2], [mid - 2, top + 2], [mid - 3, top - 1]], part('faîtage', 11, '~', 'full', { roof: true }), lavesRidge()));
}

/**
 * Un pignon découvert (x0-x1) : au-dessus du gouttereau, le triangle du mur de bout monte plus haut que les laves, couronné de
 * dalles en rampant (des pierres plates de 60 cm le long de la pente, leur joint, l'arête au soleil) ; sa face sud a la chaîne d'angle.
 */
function gable(Q: Quad[], x0: number, x1: number, P: Part): void {
  const H = HOUSE, mid = H.D / 2, top = H.eaveZ + mid + H.eaveY + 4, foot = top - mid;
  const fac = worldAshlar(11);
  const tex: Tex = (s, t, c) => {
    if (Math.abs(c.n[2]) < 0.1) return fac(s, t, c);
    const along = c.p[2] * 1.41, i = Math.floor(along) % 12, k = Math.floor(c.p[0] - x0);
    if (i === 0) return ';';
    if (i === 1 || k === 0) return '!';
    return hash(31, Math.floor(along / 12), 3) < 0.4 ? 'θ' : '+';
  };
  Q.push(...polyPrism(x0, x1, [[H.D, H.gutter], [H.D, foot], [mid, top], [0, foot], [0, H.gutter]], P, tex));
  // le mur de bout sous le pignon (sa face sud est celle du mur sud)
  Q.push(...box(x0, x1, 0, H.D - H.wall, 0, H.gutter, P, fac));
  // l'ombre du pignon sur les laves, le long de son flanc est (le soleil est au nord-ouest)
  if (x0 === 0) Q.push(quad([x1, H.D + H.eaveY, H.eaveZ + 0.2], [1.5, 0, 0], [0, -(mid + H.eaveY), mid + H.eaveY], [0, Math.SQRT1_2, Math.SQRT1_2], part('ombre', 10.5, '"', 'none'), () => '"', 'slope'));
}

/** Une souche de cheminée de pierre de taille, sa corniche, le noir de ses conduits. */
function stack(Q: Quad[], x0: number, x1: number, y0: number, y1: number, z1: number, flues = 1): void {
  const P = part('souche', 12, '~', 'full');
  Q.push(...box(x0, x1, y0, y1, 0, z1 - 3, P, ashlarWall(41, { quoins: ['left', 'right'] })));
  Q.push(...box(x0 - 1, x1 + 1, y0 - 1, y1 + 1, z1 - 3, z1, part('corniche', 12.5, '~', 'full'), stringCourse()));
  const w = (x1 - x0 - 2 - (flues - 1) * 2) / flues;
  for (let k = 0; k < flues; k++) {
    const a = x0 + 1 + k * (w + 2);
    Q.push(...box(a + 1, a + w, y0 + 2, y1 - 2, z1 - 0.5, z1 + 0.01, part('conduit', 13, 'o', 'none'), () => 'o'));
  }
}

/** La lucarne de pierre du grenier, au sud : sa face au nu du mur, sa baie à volet de bois, son fronton, son petit toit de laves, la poulie. */
function dormer(Q: Quad[], x0: number, x1: number): void {
  const H = HOUSE, y = H.D, zb = H.gutter, zt = zb + 30, cx = (x0 + x1) / 2, half = (x1 - x0) / 2;
  const P = part('lucarne', 12, '~', 'full');
  const bay: StoneBay = { s0: x0 + 6, s1: x1 - 6, t0: zb + 2, t1: zb + 24, seed: 3 };
  const fac = worldAshlar(51, false, [bay]);
  Q.push(...box(x0, x1, y - 40, y, zb - 6, zt, P, fac));
  // le fronton : un triangle de pierre, l'arête de ses rampants au soleil
  Q.push(quad([x0, y, zt], [x1 - x0, 0, 0], [0, 0, half + 2], [0, 1, 0], P, (s, t, c) => {
    const e = half + 1 - Math.abs(c.p[0] - cx) - t;
    return e < 0 ? null : e < 1.2 ? '!' : fac(s, t, c);
  }));
  Q.push(quad([x0 + 6, y - 3, zb + 2], [x1 - x0 - 12, 0, 0], [0, 0, 22], [0, 1, 0], part('baie', 1, '&', 'none'), planksDoor(3)));
  // le petit toit : deux pans tournés vers l'est et l'ouest, du fronton jusque dans le grand toit
  const rp = part('laves', 12.2, '"', 'full', { roof: true }), ridgeZ = zt + half + 1, s2 = Math.SQRT1_2;
  for (const side of [-1, 1] as const) {
    const ex = cx + side * (half + 2);
    Q.push(quad([ex, y + 1, zt - 2], [0, -44, 0], [-side * (half + 2), 0, ridgeZ - zt + 2], [side * s2, 0, s2], rp, laves(60 + side), 'slope'));
  }
  // la poulie : une pièce de chêne en saillie sous le faîte, sa roue
  Q.push(...box(cx - 1, cx + 1, y, y + 8, ridgeZ - 6, ridgeZ - 4, part('poulie', 13, 'K', 'thin'), furnWood(3)));
  Q.push(...box(cx - 1.5, cx + 1.5, y + 6, y + 8, ridgeZ - 10, ridgeZ - 6, part('roue', 13.5, 'K', 'thin'), () => '%'));
}

/** Le bolet de la version B : l'escalier de pierre contre la façade, montant d'est en ouest, le palier, l'auvent de laves sur deux poteaux. */
function bolet(Q: Quad[]): void {
  const H = HOUSE, y0 = H.D, y1 = H.D + 20, top = 140, rise = H.stair.rise, run = H.stair.run;
  const P = part('escalier dehors', 4, '~', 'full');
  for (let k = 1; k <= 14; k++) {
    const xa = top + run * (k - 1), xb = top + run * k, z = H.floor - rise * k;
    Q.push(...box(xa, xb, y0, y1, 0, z, P, { top: (_s, _t, c) => (Math.floor(c.p[0] - xa) === 0 ? '!' : '+'), side: worldAshlar(71, false) }));
  }
  // le palier : une dalle de pierre sur un massif plein
  Q.push(...box(104, top, y0, y1, 0, H.floor, P, { top: (_s, _t, c) => flagstones(7)(c.p[0], c.p[1], c), side: worldAshlar(72, false) }));
  // le garde-corps de bois du palier, entre les poteaux de l'auvent
  const T = part('poteau', 14, 'K', 'thin');
  for (const x of [105, 139]) Q.push(...box(x - 1, x + 1, y1 - 2, y1, H.floor, 95, part('poteau', 14, 'K', 'full'), furnWood(x)));
  Q.push(...box(106, 138, y1 - 1.5, y1 - 0.5, H.floor + 17, H.floor + 18.5, T, furnWood(9)));
  for (let x = 108; x < 138; x += 3) Q.push(...box(x, x + 1, y1 - 1.5, y1 - 0.5, H.floor, H.floor + 17, T, furnWood(x)));
  // l'auvent : un pan de laves du mur aux poteaux, sur sa sablière
  Q.push(...box(102, 142, y1 - 2, y1, 93, 95, part('sablière', 14.5, 'K', 'full'), furnWood(12)));
  const rp = part('auvent', 15, '"', 'full', { roof: true }), dy = y1 + 3 - y0;
  Q.push(quad([100, y1 + 3, 93], [44, 0, 0], [0, -dy, 12], unit([0, 12, dy]), rp, laves(81), 'slope'));
  Q.push(quad([100, y1 + 3, 91], [44, 0, 0], [0, 0, 2], [0, 1, 0], rp, laves(82), 'S'));
}

/** La version C : l'aile de la cuisine au nord-ouest (6 × 6 m) et, dans l'angle, la tourelle d'escalier coiffée d'un cône de laves. */
function wingAndTower(Q: Quad[]): void {
  const H = HOUSE, P = STONE();
  const wx0 = 0, wx1 = 120, wy0 = -120, wy1 = 0;
  const tex = worldAshlar(91);
  Q.push(...box(wx0, wx1, wy0, wy0 + 12, 0, H.gutter, P, tex));
  Q.push(...box(wx0, wx0 + 12, wy0, wy1, 0, H.gutter, P, tex));
  Q.push(...box(wx1 - 12, wx1, wy0, wy1, 0, H.gutter, P, tex));
  // son toit : faîte nord-sud, pans tournés vers l'est et l'ouest
  const mid = (wx0 + wx1) / 2, run = mid + 4, rp = part('laves', 10, '"', 'full', { roof: true }), s2 = Math.SQRT1_2;
  // les pans de l'aile entrent dans le grand toit jusqu'à son faîte (la noue se fait d'elle-même au rendu)
  const yIn = H.D / 2;
  Q.push(quad([wx1 + 4, yIn, H.eaveZ], [0, wy0 - 4 - yIn, 0], [-run, 0, run], [s2, 0, s2], rp, laves(93), 'slope'));
  Q.push(quad([wx0 - 4, wy0 - 4, H.eaveZ], [0, yIn - wy0 + 4, 0], [run, 0, run], [-s2, 0, s2], rp, laves(94), 'slope'));
  stack(Q, mid - 8, mid + 8, wy0 + 2, wy0 + 16, 196, 1);
  // la tourelle : Ø 3 m dans l'angle rentrant ; murs jusqu'à 9,60 m, cône de laves de 2,90 m, épi de plomb
  const cx = wx1 + 30, cy = -30, r = 30, zt = 192, N = 48, C = 2 * Math.PI * r;
  const tp = part('tourelle', 6, '~', 'full'), ash = ashlarWall(95), cord = stringCourse();
  for (let k = 0; k < N; k++) {
    const a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2, am = (a0 + a1) / 2;
    const p0: V3 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0), 0], p1: V3 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1), 0];
    Q.push(quad(p0, sub(p1, p0), [0, 0, zt], [Math.cos(am), Math.sin(am), 0], tp, (_s, _t, c) => {
      const ang = Math.atan2(c.p[1] - cy, c.p[0] - cx), arc = (Math.PI - ang) * r, z = c.p[2];
      // les jours de l'escalier à vis : des fentes de 15 × 60 cm qui montent en tournant
      const slitA = Math.PI / 2 - 0.5 + Math.floor(z / 34) * 0.35, zz = z % 34;
      if (zz > 18 && zz < 30 && Math.abs(ang - slitA) * r < 1.6) return zz > 28.5 ? '~' : 'o';
      if (z > zt - 4) return cord(arc, z - (zt - 4), { ...c, w: C, h: 4, face: 'S' });
      return ash(arc, z, { ...c, w: C, h: 200, face: 'S' });
    }));
  }
  const R = r + 3, CH = 58, apex: V3 = [cx, cy, zt + CH], cp = part('cône', 11, '"', 'full', { roof: true }), lav = laves(97);
  const slant = Math.hypot(R, CH);
  for (let k = 0; k < N; k++) {
    const a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2;
    const p0: V3 = [cx + R * Math.cos(a0), cy + R * Math.sin(a0), zt - 2], p1: V3 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1), zt - 2];
    const u = sub(p1, p0), v = sub(apex, p0);
    let n = unit([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
    if (n[2] < 0) n = mul(n, -1);
    Q.push(quad(p0, u, v, n, cp, (s, t, c) => {
      if (s / c.w + t / c.h > 1) return null;
      const z = c.p[2] - (zt - 2), ang = Math.atan2(c.p[1] - cy, c.p[0] - cx);
      return lav((Math.PI - ang) * R, (z / CH) * slant, { ...c, w: 2 * Math.PI * R, h: slant, face: 'slope' });
    }, 'slope'));
  }
  Q.push(...box(cx - 1, cx + 1, cy - 1, cy + 1, zt + CH - 2, zt + CH + 8, part('épi', 12, '_', 'thin'), () => '-'));
}

/** La maison vue du dehors, close : murs, baies, cordon, pignons, toit, souches, lucarne ; B et C leurs ajouts. */
function outsideQuads(v: Version): Quad[] {
  const H = HOUSE, Q: Quad[] = [], P = STONE();
  southFace(Q, v, P);
  Q.push(...box(H.wall, H.W - H.wall, 0, H.wall, 0, H.gutter, P, worldAshlar(13)));
  gable(Q, 0, H.wall, P);
  gable(Q, H.W - H.wall, H.W, P);
  // le cordon, au niveau du plancher de l'étage, de pignon à pignon (coupé par la porte de l'étage en B)
  const sc = part('cordon', 4, '~', 'full'), cord = stringCourse();
  const runs: [number, number][] = v === 'B' ? [[0, 115], [137, H.W]] : [[0, H.W]];
  for (const [a, b] of runs) Q.push(...box(a, b, H.D, H.D + 1, 54, 58, sc, cord));
  roofQuads(Q, H.wall, H.W - H.wall);
  stack(Q, -1, 17, 60, 76, H.stack, 1); // la souche du pignon ouest (la cuisine)
  stack(Q, 202, 222, 0, 14, H.stack, 2); // la souche du mur nord (la salle et la chambre)
  dormer(Q, 238, 262);
  if (v === 'B') bolet(Q);
  if (v === 'C') wingAndTower(Q);
  return Q;
}

// ---------- le dedans ----------

/** Les sols du dedans, au rez-de-chaussée : terre battue à la cuisine (les tuiles du jeu), dalles au passage et à la salle. */
export function insideGround(level: 0 | 1, tiles: { floor: (x: number, y: number) => string }) {
  const H = HOUSE, flags = flagstones(5);
  return (x: number, y: number): string | null => {
    if (level === 1 || x < H.wall || x >= H.W - H.wall || y < H.wall || y >= H.D - H.wall) return null;
    if (x < H.refends[0][0]) return tiles.floor(x, y);
    const k = flags(x, y, { w: 400, h: 400, p: [x, y, 0], n: [0, 0, 1], X: x, Y: y, face: 'top' });
    return k ? PAL[k] ?? k : null;
  };
}

/** Le plancher de l'étage : des planches de 25 cm posées est-ouest sur les solives, joints de bout décalés. */
function planks(): Tex {
  return (_s, _t, c) => {
    const x = Math.floor(c.p[0]), y = Math.floor(c.p[1]), row = Math.floor(y / 5), r = y - row * 5;
    if (r === 4) return '@';
    const L = 58 + Math.floor(hash(17, row) * 20), off = Math.floor(hash(18, row) * L);
    if ((x + off) % L === 0) return '@';
    if (r === 0) return '^';
    return dash(19, y, x, 0.35) ? '%' : '*';
  };
}

/** Les marches de pierre : le giron clair, son nez au soleil, la contremarche, le mur d'échiffre plein dessous. */
function stairQuads(Q: Quad[], dim = 0): void {
  const S = HOUSE.stair, P: CoqPart = { ...part('escalier', 4, '~', 'full'), dim };
  const ech = worldAshlar(61, false);
  for (let k = 1; k <= 14; k++) {
    const ya = S.y0 - S.run * k, yb = S.y0 - S.run * (k - 1), z = S.rise * k;
    Q.push(...box(S.x0, S.x1, ya, yb, 0, z, P, {
      top: (_s, _t, c) => (c.p[1] > yb - 1 ? '!' : Math.floor(c.p[0] - S.x0) === 10 ? 'θ' : '+'),
      side: (s, t, c) => (c.p[2] > z - S.rise ? (c.p[2] > z - 1 ? '+' : c.p[2] < z - S.rise + 1 ? ';' : '=') : ech(s, t, c)),
    }));
  }
}

/** Une image de coq-tentures.ts pendue au mur nord (sa face du dedans en y = 12) : son haut à `zTop`, sa tringle de fer. */
function hang(Q: Quad[], g: Grid, x: number, zTop: number): void {
  const w = g[0].length, h = g.length, p = part('tenture', 1, 'K', 'none');
  Q.push(quad([x, HOUSE.wall + 0.4, zTop - h], [w, 0, 0], [0, 0, h], [0, 1, 0], p, (s, t) => {
    const k = g[h - 1 - Math.floor(t)]?.[Math.floor(s)];
    return !k || k === '.' ? null : k;
  }));
  Q.push(...box(x - 2, x + w + 2, HOUSE.wall, HOUSE.wall + 1, zTop, zTop + 1, part('tringle', 5, '_', 'none'), (_s, _t, c) => (c.face === 'top' ? '-' : '_')));
}

/** Le dedans, un niveau : les murs coupés, les sols, l'escalier, la trémie et son garde-corps, les cheminées, les tentures. */
function insideQuads(level: 0 | 1): Quad[] {
  const H = HOUSE, Q: Quad[] = [], P = STONE();
  const zLo = level ? H.slab : 0, cut = level ? H.floor + 14 : 14, back = level ? H.gutter : H.slab;
  const plaster = limePlaster(7);
  // le mur nord, sa face du dedans enduite de chaux jusqu'au plafond du niveau
  const north: Tex = (s, t, c) => (c.face === 'top' ? section(3, true, 0, H.wall)(s, t, c) : plaster(c.p[0], c.p[2], { ...c, h: 200 }));
  wall(Q, true, H.wall, H.W - H.wall, 0, H.wall, zLo, back, NORTH_BAYS, P, north);
  for (const b of NORTH_BAYS) if (b.z0 < back && b.z0 >= zLo) Q.push(quad([b.a0, 6, b.z0], [b.a1 - b.a0, 0, 0], [0, 0, b.z1 - b.z0], [0, 1, 0], part('baie', 1, '`', 'none'), leadedTex()));
  // les pignons, entiers jusqu'au plafond du niveau (vus par leur tranche)
  for (const [x0, x1] of [[0, H.wall], [H.W - H.wall, H.W]]) wall(Q, false, 0, H.D - H.wall, x0, x1, zLo, back, [], P, section(4, false, x0, x1));
  // le mur sud, coupé à 70 cm au-dessus du plancher du niveau : sa face de dehors (percée de ses baies), sa coupe
  const bays = southBays('A');
  const sb = bays.filter((b) => b.z0 < cut && b.z1 > zLo);
  wall(Q, true, 0, H.W, H.D - H.wall, H.D, zLo, cut, sb, P, { top: section(5, true, H.D - H.wall, H.D), side: worldAshlar(11, true, bays.map((b, i) => asStoneBay(b, i))) });
  for (const b of sb) if (b.kind === 'door') Q.push(...box(b.a0 - 1, b.a1 + 1, H.D - H.wall, H.D + 1, 0, 1, part('seuil', 3, '~', 'full'), (_s, _t, c) => (c.face === 'top' ? '+' : '=')));
  // les refends, coupés de même, leurs portes ; leurs faces se voient par la tranche
  H.refends.forEach(([x0, x1], i) => {
    const doors = INNER_DOORS.filter((d) => d.wall === (i ? 'E' : 'W') && d.level === level).map((d) => ({ a0: d.y0, a1: d.y1, z0: zLo, z1: zLo + 40 }));
    wall(Q, false, H.wall, H.D - H.wall, x0, x1, zLo, cut, doors, P, { top: section(6 + i, false, x0, x1), side: plaster });
  });
  const fp = part('cheminée', 5, '~', 'full'), fac = ashlarWall(15);
  if (level === 0) {
    stairQuads(Q);
    // la cheminée de la salle, au mur nord : deux piédroits, le manteau mouluré, la hotte de pierre, le contrecœur noirci
    const F = SALLE_FIRE;
    for (const x of [F.x0, F.x1 - 4]) Q.push(...box(x, x + 4, H.wall, H.wall + 14, 0, 26, fp, fac));
    Q.push(...box(F.x0 - 1, F.x1 + 1, H.wall, H.wall + 16, 26, 30, fp, stringCourse()));
    Q.push(...box(F.x0 + 3, F.x1 - 3, H.wall, H.wall + 10, 30, H.slab, fp, fac));
    Q.push(quad([F.x0 + 4, H.wall + 0.5, 0], [F.x1 - F.x0 - 8, 0, 0], [0, 0, 26], [0, 1, 0], part('contrecœur', 0.5, 'o', 'none'), (_s, t) => (t > 18 ? 'o' : '@')));
    Q.push(...box(F.x0 + 2, F.x1 - 2, H.wall, H.wall + 18, 0, 0.6, part('âtre', 0.6, '~', 'none'), (s, t, c) => flagstones(9)(s, t, c) === ';' ? '~' : 'z'));
    // la verdure, pendue au mur nord derrière la grande table (2,40 × 1,60 m, le haut à 2,50 m)
    hang(Q, verdureGrid(), 248, 50);
    // la hotte de pierre de l'âtre de la cuisine, au-dessus de l'âtre du jeu (pignon ouest)
    Q.push(...box(H.wall, H.wall + 18, 28, 72, 31, H.slab, fp, fac));
    Q.push(...box(H.wall, H.wall + 20, 27, 73, 29, 31, fp, stringCourse()));
    // le potager maçonné (1,20 × 0,60 × 0,85), ses deux réchauds de braise
    Q.push(...box(H.wall, H.wall + 12, 84, 108, 0, 17, part('potager', 3, '~', 'full'), {
      top: (_s, _t, c) => ((Math.hypot(c.p[0] - 18, c.p[1] - 90) < 2.2 || Math.hypot(c.p[0] - 18, c.p[1] - 101) < 2.2) ? (hash(1, Math.floor(c.p[0]), Math.floor(c.p[1])) < 0.35 ? 'i' : 'o') : '+'),
      side: fac,
    }));
    // l'évier de pierre sous la petite fenêtre nord (0,80 × 0,50 × 0,85), sa cuvette, son pied
    Q.push(...box(38, 56, H.wall, H.wall + 10, 0, 17, part('évier', 3, '~', 'full'), {
      top: (_s, _t, c) => (c.p[0] > 40 && c.p[0] < 54 && c.p[1] < H.wall + 8 ? (c.p[1] < H.wall + 2 ? '~' : ';') : c.p[1] > H.wall + 9 ? '!' : '+'),
      side: (_s, _t, c) => (c.p[2] > 16 ? '+' : c.p[2] < 3 ? ';' : '='),
    }));
  } else {
    // le plancher : des planches sur les solives, percé de la trémie
    const [wx0, wx1, wy0, wy1] = H.well, pp = part('plancher', 1, '&', 'full');
    const pl = { top: planks(), side: (_s: number, t: number) => (t > 4 ? '%' : '&') };
    Q.push(...box(H.wall, H.W - H.wall, H.wall, wy0, H.slab, H.floor, pp, pl));
    Q.push(...box(H.wall, H.W - H.wall, wy1, H.D - H.wall, H.slab, H.floor, pp, pl));
    Q.push(...box(H.wall, wx0, wy0, wy1, H.slab, H.floor, pp, pl));
    Q.push(...box(wx1, H.W - H.wall, wy0, wy1, H.slab, H.floor, pp, pl));
    // le niveau du dessous est caché : sous la coupe du mur sud de l'étage, le vide de l'intérieur (INTERIOR.void)
    Q.push(...box(0, H.W, H.D - H.wall, H.D, 0, H.slab, part('vide', 3, 'o', 'none', { cast: false }), () => VOID));
    // par la trémie : l'escalier qui descend dans l'ombre, et les dalles du passage
    stairQuads(Q, 0.5);
    Q.push(quad([wx0 - 24, wy0 - 40, 0.01], [wx1 - wx0 + 24, 0, 0], [0, H.D - H.wall - wy0 + 40, 0], [0, 0, 1], { ...part('dalles', 0, '~', 'none'), dim: 0.6 } as CoqPart, (_s, _t, c) => flagstones(5)(c.p[0], c.p[1], { ...c, face: 'top' }), 'top'));
    // le garde-corps de chêne : poteaux, main courante, balustres, le long du bord ouest et du bord sud de la trémie
    const gp = part('garde-corps', 8, 'K', 'thin'), fw = furnWood(23), z0 = H.floor, zr = H.floor + 18;
    for (const [x, y] of [[wx0 - 1, wy0], [wx0 - 1, 58], [wx0 - 1, wy1 - 1], [wx1 - 2, wy1 - 1]]) Q.push(...box(x, x + 2, y, y + 2, z0, zr + 1, part('poteau', 9, 'K', 'full'), fw));
    Q.push(...box(wx0 - 1, wx0 + 1, wy0, wy1 + 1, zr - 1, zr + 1, gp, fw));
    Q.push(...box(wx0 - 1, wx1, wy1 - 1, wy1 + 1, zr - 1, zr + 1, gp, fw));
    for (let y = wy0 + 4; y < wy1 - 2; y += 4) Q.push(...box(wx0 - 0.5, wx0 + 0.5, y, y + 1, z0, zr - 1, gp, fw));
    for (let x = wx0 + 3; x < wx1 - 2; x += 4) Q.push(...box(x, x + 1, wy1 - 0.5, wy1 + 0.5, z0, zr - 1, gp, fw));
    // la cloison de pan de bois chaulé (x 1300-1315), coupée à 70 cm : les poteaux tous les 1,60 m, le torchis chaulé, sa porte
    const [px0, px1] = H.partition;
    const doors = INNER_DOORS.filter((d) => d.wall === 'P').map((d) => ({ a0: d.y0, a1: d.y1, z0: H.floor, z1: H.floor + 36 }));
    wall(Q, false, H.wall, H.D - H.wall, px0, px1, H.floor, cut, doors, part('cloison', 3, 'K', 'full'), {
      top: (_s, _t, c) => (Math.floor(c.p[1]) % 32 < 3 || Math.abs(c.p[1] - 100) < 1 || Math.abs(c.p[1] - 118) < 1 ? '*' : c.p[0] - px0 < 0.8 || px1 - c.p[0] < 0.8 ? '+' : 'u'),
      side: () => '+',
    });
    // la cheminée de la chambre du coq, au mur nord (dans la même souche) : plus petite, sa hotte
    const F = CHAMBER_FIRE;
    for (const x of [F.x0, F.x1 - 3]) Q.push(...box(x, x + 3, H.wall, H.wall + 10, H.floor, H.floor + 20, fp, fac));
    Q.push(...box(F.x0 - 1, F.x1 + 1, H.wall, H.wall + 11, H.floor + 20, H.floor + 23, fp, stringCourse()));
    Q.push(...box(F.x0 + 2, F.x1 - 2, H.wall, H.wall + 7, H.floor + 23, H.gutter, fp, fac));
    Q.push(quad([F.x0 + 3, H.wall + 0.5, H.floor], [F.x1 - F.x0 - 6, 0, 0], [0, 0, 20], [0, 1, 0], part('contrecœur', 0.5, 'o', 'none'), (_s, t) => (t > 13 ? 'o' : '@')));
    // le conduit de la cuisine qui monte dans le pignon ouest : son manteau saillant chauffe la chambre des garçons
    Q.push(...box(H.wall, H.wall + 10, 44, 68, H.floor, H.gutter, fp, plaster));
    // la tenture de garance de la chambre du coq, au mur nord, à côté de la cheminée (1,60 × 1,20 m)
    hang(Q, tentureGrid(), 166, H.floor + 44);
  }
  return Q;
}

/** La scène d'une vue : ses faces (sans les images, que pose l'essai). */
export function coqQuads(v: View): Quad[] {
  return v.kind === 'outside' ? outsideQuads(v.version) : insideQuads(v.level);
}

// =====================================================================================================================
// Les meubles qui manquent au jeu : petits modèles rendus comme un meuble (dessus à ½), posés comme une image du jeu
// =====================================================================================================================

const F = (n: string, prio = 2) => part(n, prio, '&', 'full');
/** Un meuble rendu : son image (contour, ombre portée d'une rangée sous lui). */
function furniture(quads: Quad[]): Grid {
  const g = renderPiece(quads, { k: 0.5 });
  const rows = g.map((r) => r + '.');
  const last = rows[rows.length - 1];
  return [...rows, [...('.' + last.slice(0, -1))].map((c) => (c === '.' ? '.' : 'x')).join('')];
}

/**
 * Le lit à courtines du coq et de sa femme : 160 × 210 cm, colonnes de chêne de 2 m, le ciel de drap rouge, sa pente (la frange),
 * les courtines ramassées aux colonnes, la couverture bleue, le chevet au nord. Dessus vu à ½ : 32 × (40 + 21) px.
 */
export function fourPoster(): Grid {
  const Q: Quad[] = [], w = 32, d = 42, wood = furnWood(31);
  Q.push(...box(0, w, 0, d, 0, 8, F('bois de lit'), wood));
  Q.push(...box(1, w - 1, 2, d - 1, 8, 11, F('couverture', 1), { top: (s, t) => (Math.floor(t) < 6 ? 'a' : Math.floor(s) % 6 === 0 ? 'γ' : 'β'), side: () => 'γ' }));
  Q.push(...box(0, w, 0, 2, 8, 22, F('chevet', 3), panelWood()));
  for (const [x, y] of [[0, 0], [w - 2, 0], [0, d - 2], [w - 2, d - 2]]) Q.push(...box(x, x + 2, y, y + 2, 0, 40, F('colonne', 4), wood));
  Q.push(...box(-0.5, w + 0.5, -0.5, d + 0.5, 37, 40, F('ciel', 5), { top: (s) => (Math.floor(s) % 8 === 0 ? 'σ' : 'ρ'), side: (s, t) => (t < 1 ? 'τ' : Math.floor(s) % 3 === 0 ? 'τ' : 'σ') }));
  // les courtines ramassées aux colonnes du pied, tombant du ciel
  for (const x of [2, w - 6]) Q.push(...box(x, x + 4, d - 3, d - 1, 3, 37, F('courtine', 4.5), cloth('red', 2)));
  // celles du chevet, tirées le long des côtés
  for (const x of [0.5, w - 2.5]) Q.push(...box(x, x + 2, 2, d - 4, 6, 37, F('courtine', 4.2), cloth('red', 3)));
  return furniture(Q);
}
/** Le dressoir (100 × 45 × 180 cm) : le bas fermé de deux portes, le dosseret et ses deux tablettes, les étains debout (plats, pichet). */
export function dresser(): Grid {
  const Q: Quad[] = [], w = 20, wood = furnWood(41);
  Q.push(...box(0, w, 0, 9, 0, 18, F('bas'), { top: () => '^', side: (s, t, c) => (c.face === 'S' ? (Math.floor(s) === 10 ? '@' : panelWood()(s % 10, t, { ...c, w: 10 })) : '%') }));
  Q.push(...box(0, w, 0, 2, 18, 36, F('dosseret', 1), {
    top: () => '^',
    side: (s, t) => {
      // les plats d'étain debout contre le dosseret, au-dessus de chaque tablette
      for (const [cx, cz] of [[4, 22.5], [10, 22.5], [16, 22.5], [5, 31.5], [12, 31.5]]) {
        const d = Math.hypot(s - cx, t + 18 - cz);
        if (d < 3) return d > 2.2 ? 'z' : s - cx < -0.5 && t + 18 - cz > 0.5 ? '!' : 'R';
      }
      if (Math.abs(s - 17) < 1.5 && t + 18 > 28 && t + 18 < 34) return s < 17 ? '!' : 'r'; // le pichet
      return '%';
    },
  }));
  for (const z of [26, 35]) Q.push(...box(0, w, 0, 5, z, z + 1, F('tablette', 3), wood));
  Q.push(...box(-0.5, w + 0.5, 0, 6, 36, 37.5, F('corniche', 3), wood));
  return furniture(Q);
}
/** La chaise à haut dossier du coq (55 × 50 × 130 cm), tournée vers l'est : le dossier à l'ouest, le coussin rouge. */
export function highChair(): Grid {
  const Q: Quad[] = [], wood = furnWood(51);
  for (const [x, y] of [[0, 0], [9, 0], [0, 8], [9, 8]]) Q.push(...box(x, x + 2, y, y + 2, 0, 9, F('pied'), wood));
  Q.push(...box(0, 11, 0, 10, 8, 9.5, F('siège', 2), wood));
  Q.push(...box(1, 10, 1, 9, 9.5, 10.5, F('coussin', 3), { top: () => 'ρ', side: () => 'σ' }));
  Q.push(...box(0, 2, 0, 10, 9, 26, F('dossier', 4), { top: () => '^', side: (s, t, c) => (c.face === 'S' ? (t > 15 ? '^' : '*') : panelWood()(s, t, c)) }));
  for (const y of [0, 8]) Q.push(...box(0, 11, y, y + 2, 14, 15, F('accoudoir', 4), wood));
  return furniture(Q);
}
/** Le pétrin (150 × 60 × 80 cm) : la huche à pâte sur ses pieds, son couvercle de planches. */
export function kneadingTrough(): Grid {
  const Q: Quad[] = [], wood = furnWood(61);
  for (const x of [1, 26]) Q.push(...box(x, x + 3, 1, 11, 0, 8, F('pied'), wood));
  Q.push(...box(0, 30, 0, 12, 8, 15, F('huche', 2), { top: () => '^', side: (s, t, c) => (c.face === 'S' ? (Math.floor(s) % 10 === 0 ? '@' : t > 6 ? '^' : '*') : '%') }));
  Q.push(...box(-0.5, 30.5, -0.5, 12.5, 15, 16, F('couvercle', 3), { top: (_s, t) => (Math.floor(t) % 4 === 3 ? '%' : '^'), side: () => '%' }));
  return furniture(Q);
}
/** L'écritoire de l'intellectuel (90 × 60 × 75 cm) : la table, le pupitre incliné, les livres (reliures rouges, brunes, bleue). */
export function writingDesk(): Grid {
  const Q: Quad[] = [], wood = furnWood(71);
  for (const x of [0, 16]) Q.push(...box(x, x + 2, 0, 12, 0, 14, F('pied'), wood));
  Q.push(...box(0, 18, 0, 12, 14, 15, F('plateau', 2), wood));
  Q.push(...polyPrism(1, 11, [[2, 15], [2, 18], [11, 15]], F('pupitre', 3), (s, t, c) => (c.n[2] > 0.5 ? (hash(2, Math.floor(s), Math.floor(t)) < 0.15 ? '*' : '^') : '%')));
  Q.push(quad([3, 6, 16.6], [6, 0, 0], [0, -3, 1.5], unit([0, 1, 2]), F('feuille', 4), () => 'a', 'slope'));
  const book = (x: number, y: number, z: number, w: number, d: number, h: number, c: string, sd: string) => Q.push(...box(x, x + w, y, y + d, z, z + h, F('livre', 4), { top: () => 'a', side: (s) => (s < 0.8 ? c : sd) }));
  book(12, 2, 15, 5, 4, 2, 'σ', 'τ'); book(12.5, 2.5, 17, 4, 3, 1.5, 'm', 'N'); book(12, 7, 15, 5, 4, 1.5, 'β', 'γ');
  return furniture(Q);
}
/** La table de la tailleuse (140 × 70 × 75 cm) : les coupons d'étoffe pliés (drap rouge, laine bleue, lin), les ciseaux, le panier. */
export function tailorTable(): Grid {
  const Q: Quad[] = [], wood = furnWood(81);
  for (const x of [0, 26]) for (const y of [0, 12]) Q.push(...box(x, x + 2, y, y + 2, 0, 14, F('pied'), wood));
  Q.push(...box(0, 28, 0, 14, 14, 15, F('plateau', 2), wood));
  const bolt = (x: number, y: number, w: number, d: number, h: number, R: string) => Q.push(...box(x, x + w, y, y + d, 15, 15 + h, F('coupon', 3), { top: (s) => (Math.floor(s) % 4 === 0 ? R[1] : R[0]), side: (_s, t) => (Math.floor(t * 2) % 2 ? R[1] : R[2]) }));
  bolt(2, 2, 9, 6, 2, 'ρστ'); bolt(13, 1, 8, 5, 1.5, 'αβγ'); bolt(3, 8, 7, 5, 1, 'adD');
  Q.push(...box(22, 26, 9, 12, 15, 15.4, F('ciseaux', 4), () => 'Z'));
  // le panier à ouvrage, posé au bout
  for (let k = 0; k < 10; k++) {
    const a0 = (k / 10) * Math.PI * 2, a1 = ((k + 1) / 10) * Math.PI * 2;
    const p0: V3 = [24 + 2.5 * Math.cos(a0), 4 + 2.5 * Math.sin(a0), 15], p1: V3 = [24 + 2.5 * Math.cos(a1), 4 + 2.5 * Math.sin(a1), 15];
    Q.push(quad(p0, sub(p1, p0), [0, 0, 3], [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0], F('panier', 3), (_s, t) => (Math.floor(t) % 2 ? 'O' : 'C')));
  }
  Q.push(...box(21.5, 26.5, 1.5, 6.5, 17.5, 18, F('ouvrage', 2.9), () => 'J'));
  return furniture(Q);
}

/** Un meuble de l'essai au catalogue : son image, sa palette. */
export const COQ_FURNITURE = { fourPoster, dresser, highChair, kneadingTrough, writingDesk, tailorTable };

/** Une image posée dans la scène, soulevée de `lift` px (l'étage) ; sa profondeur, le bord sud au sol. */
export function lifted(b: Board, lift: number): Board {
  return { ...b, y: b.y - lift };
}
export type { Board, Scene };
