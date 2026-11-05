// PROPOSITION (hors jeu, jamais chargée par le jeu) : la boîte à outils des bâtiments des quarts sud de la place (CADRAGE-village.md,
// section 13 : 13.5 la ferme rivale, 13.6 la mercière, 13.7 la tailleuse). Elle ne dessine rien d'elle-même : elle reprend le modèle
// des maisons du village, validé par Grégoire, sans le changer.
//
// COPIÉ (les fonctions ne sont pas exportées par leur module ; à réunir quand la place s'intégrera) de
// art/proposals/village-maisons-pierre.ts : `wallRun`, `onFace`, `quad`, le toit à deux pans (`gableRoof`, `ridgeTex`, `ridgeX`,
// `coverTex`, `EAVE_EDGE`), la souche (`stack`), le jour d'une baie (`darkBay`), l'appui (`sill`), le linteau de bois (`woodLintel`),
// la porte au fond de l'embrasure (`doorPlane`), le volet ouvert (`openShutter`), le seuil (`threshold`), l'âtre (`hearth`), la pose
// d'une scène (`place`), les images du jeu posées comme le jeu les pose (`img`, `propImg`, `placeImg`, `prop`).
//
// NOUVEAU ici : le bardage à clins (`clapboard` : la tailleuse), la boule (`ball` : les légumes sur l'étal), la barre (`bar`, copiée de
// village-maisons-bois-pieces.ts), le poteau planté qui porte une enseigne (`bracketQuads` : sa potence de remplacement n'a servi que tant que l'enseigne de
// place-nord-pieces.ts n'existait pas).
//
// Les couleurs : la palette des maisons de pierre (`palette` de village-maisons-pierre-matieres.ts : le monde, le bois patiné, le coq,
// la terre cuite) ; les faces d'une scène passent par `hexify` (ce que le rendu de l'essai ne connaît pas s'écrit en #rrggbb), comme
// le module de pierre : une scène de la place se rend à côté de n'importe quelle maison du village.

import type { Grid } from '../lib/canvas';
import { sources } from '../index';
import { hearthModel } from '../world/chimney';
import {
  box, dash, hash, part, polyPrism, prism, timber, voidTex, type Board, type Part, type Quad, type Scene, type Tex, type V3,
} from '../lib/volumes';
import propsJson from '../../src/content/props.json';
import { formView } from '../../src/world/natural';
import { variantImage } from '../../src/content/views';
import type { Img } from './village-types';
import { hexify, laves, lavesRidge, palette, shingles, tiles } from './village-maisons-pierre-matieres';
import { moved, turned } from './village-maisons-pierre-pieces';

export { palette, moved, turned };

// =====================================================================================================================
// Les images du jeu, posées comme le jeu les pose (copie de village-maisons-pierre.ts)
// =====================================================================================================================

const byName = new Map(sources.map((s) => [s.name, s]));
export const has = (k: string) => byName.has(k);
export function img(name: string, frame = 0): Img {
  const s = byName.get(name);
  if (s?.kind === 'image') return { grid: s.grid, pal: s.palette };
  if (s?.kind === 'spritesheet') { const fr = Object.values(s.animations)[0].frames; return { grid: fr[frame % fr.length], pal: s.palette }; }
  throw new Error(`place-sud : pas d'image « ${name} »`);
}
interface PropDef { image: string; views: never; aged?: boolean; dims: { w: number; d: number; h: number } }
const props = propsJson as unknown as Record<string, PropDef>;
/** L'image d'un objet de props.json dans sa vue, au bois patiné s'il prend l'âge. */
export function propImg(key: string, view = 0): Img {
  const def = props[key];
  if (!def) throw new Error(`place-sud : pas d'objet « ${key} »`);
  const k = formView(variantImage(def.image, undefined), def.views, view, undefined, has);
  return img(def.aged && has(`${k}-worn`) ? `${k}-worn` : k);
}
export const propDims = (key: string) => props[key].dims;
/** Une image centrée sur son emprise (x0–x1, px), son bas au bord sud y relevé de z ; profondeur : le bord sud. */
export function placeImg(o: Img, x0: number, x1: number, ySouth: number, z = 0, depth = ySouth): Board {
  const w = o.grid[0].length;
  return { grid: o.grid, pal: o.pal, x: Math.round((x0 + x1) / 2 - w / 2), y: Math.round(ySouth - z) - o.grid.length, depth: () => depth };
}
/** Un objet de props.json, son emprise au coin nord-ouest (x, y) en px, dans sa vue, posé à la hauteur z (px). */
export function prop(key: string, x: number, y: number, view = 0, z = 0): Board {
  const d = props[key].dims, [w, dd] = view % 2 ? [d.d / 5, d.w / 5] : [d.w / 5, d.d / 5];
  return placeImg(propImg(key, view), x, x + w, y + dd, z);
}
export const lift = (b: Board, z: number): Board => ({ ...b, y: b.y - z });
export const moveBoard = (b: Board, dx: number, dy: number): Board => ({ ...b, x: b.x + dx, y: b.y + dy, depth: (r) => b.depth(r) + dy });

// =====================================================================================================================
// La géométrie des murs (copie de village-maisons-pierre.ts)
// =====================================================================================================================

export interface Hole { a0: number; a1: number; z0: number; z1: number }
export const quad = (o: V3, u: V3, v: V3, n: V3, p: Part, tex: Tex, face: Quad['face'] = 'S'): Quad => ({ o, u, v, n, part: p, tex, face });

/** Un mur droit percé, le long de x (`ew`) ou de y, de a0 à a1, épaisseur c0-c1, de z0 à z1 ; les trous le découpent en boîtes. */
export function wallRun(Q: Quad[], ew: boolean, a0: number, a1: number, c0: number, c1: number, z0: number, z1: number, holes: Hole[], p: Part, tex: Tex | { top: Tex; side: Tex }): void {
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

/** Une matière de face lue en coordonnées du mur (s = x − a0 ou y − a0, t = z − z0), pour que la matière se suive d'un morceau à l'autre. */
export function onFace(tex: Tex, ew: boolean, a0: number, w: number, h: number, z0 = 0, top?: Tex): Tex {
  return (s, t, c) => {
    if (c.face === 'top' || c.face === 'under') return top ? top(s, t, c) : '+';
    if (!ew && (c.face === 'S' || c.face === 'N')) return tex(c.p[0] + c.p[1] * 0.37, c.p[2] - z0, { ...c, w, h });
    return tex((ew ? c.p[0] : c.p[1]) - a0, c.p[2] - z0, { ...c, w, h });
  };
}

// =====================================================================================================================
// Le toit à deux pans, la souche (copie de village-maisons-pierre.ts)
// =====================================================================================================================

export type Cover = 'tiles' | 'shingles' | 'laves';
export interface RoofSpec {
  axis: 'x' | 'y';
  a0: number; a1: number; b0: number; b1: number;
  z: number; pitch: number;
  eave: number; gable: [number, number]; thick: number;
  cover: Cover; seed: number;
  holes?: [number, number, number, number][];
}
const RIDGE_P = (cover: Cover) => part('faîtage', 11, cover === 'tiles' ? 'π' : cover === 'shingles' ? '&' : '"', 'full', { roof: true });
function coverTex(cover: Cover, K: number, seed: number): Tex {
  return cover === 'tiles' ? tiles(K, seed) : cover === 'shingles' ? shingles(K, seed) : laves(seed);
}
const EAVE_EDGE: Record<Cover, Tex> = { tiles: (_s, t) => (t > 1 ? 'ν' : 'π'), shingles: (_s, t) => (t > 1 ? '%' : '&'), laves: laves(5) };
function ridgeTex(cover: Cover): Tex {
  if (cover === 'laves') return lavesRidge();
  if (cover === 'tiles') return (s, _t, c) => {
    const j = Math.floor(s) % 8;
    if (j === 0) return '!';
    if (j === 7) return 'π';
    return c.n[2] > 0.85 ? 'κ' : c.n[2] > 0.4 ? (c.n[1] > 0 ? 'μ' : 'κ') : c.n[1] > 0 ? 'ν' : 'ξ';
  };
  return (s, t, c) => {
    const i = Math.floor(s), side = c.n[1] > 0 ? 1 : 0;
    if ((i + side * 2) % 4 === 0) return '&';
    return side ? (Math.floor(t) === 0 ? '%' : '*') : '^';
  };
}
function ridgeX(Q: Quad[], cover: Cover, x0: number, x1: number, y: number, z: number, holes?: [number, number, number, number][]): void {
  const sec: [number, number][] = cover === 'tiles'
    ? Array.from({ length: 9 }, (_, k) => { const a = Math.PI - (k / 8) * Math.PI; return [y + 3.2 * Math.cos(a), z - 0.8 + 3.2 * Math.sin(a)] as [number, number]; })
    : cover === 'shingles' ? [[y - 3, z - 0.6], [y, z + 2.2], [y + 3, z - 0.6]]
      : [[y + 3, z - 1], [y + 2, z + 2], [y - 2, z + 2], [y - 3, z - 1]];
  const tex = ridgeTex(cover);
  const cut: Tex = (s, t, c) => (holes?.some(([a, b, y0, y1]) => c.p[0] > a - 0.3 && c.p[0] < b + 0.3 && y >= y0 - 3 && y <= y1 + 3) ? null : tex(s, t, c));
  Q.push(...polyPrism(x0, x1, sec, RIDGE_P(cover), cut));
}
/** Le toit à deux pans, faîtage le long de x (le seul cas de la place sud) : les pans, la tranche de l'égout sud, le faîtage. */
export function gableRoof(Q: Quad[], r: RoofSpec): void {
  const tan = Math.tan((r.pitch * Math.PI) / 180), H2 = (r.b1 - r.b0) / 2, mid = r.b0 + H2;
  const run = H2 + r.eave, zE = r.z + r.thick - r.eave * tan, zR = r.z + r.thick + H2 * tan;
  const len = Math.hypot(run, run * tan), sn = (run * tan) / len, cs = run / len;
  const P = part('pan', 9, r.cover === 'tiles' ? 'π' : r.cover === 'shingles' ? '&' : '"', 'full', { roof: true });
  const A0 = r.a0 - r.gable[0], A1 = r.a1 + r.gable[1];
  const pierce = (tex: Tex): Tex => (s, t, c) => {
    const [x, y] = c.p;
    if (r.holes?.some(([x0, x1, y0, y1]) => x > x0 - 0.3 && x < x1 + 0.3 && y > y0 - 0.3 && y < y1 + 0.3)) return null;
    return tex(s, t, c);
  };
  const Ks = cs + sn;
  Q.push(quad([A0, r.b1 + r.eave, zE], [A1 - A0, 0, 0], [0, -run, run * tan], [0, sn, cs], P, pierce(coverTex(r.cover, Ks, r.seed)), 'slope'));
  Q.push(quad([A0, r.b0 - r.eave, zE], [A1 - A0, 0, 0], [0, run, run * tan], [0, -sn, cs], P, pierce(coverTex(r.cover, Ks, r.seed + 1)), 'slope'));
  Q.push(quad([A0, r.b1 + r.eave, zE - r.thick], [A1 - A0, 0, 0], [0, 0, r.thick], [0, 1, 0], P, EAVE_EDGE[r.cover], 'S'));
  ridgeX(Q, r.cover, A0, A1, mid, zR, r.holes);
}
/** Le faîte d'un toit (z) : pour poser une souche. */
export const ridgeZ = (r: Pick<RoofSpec, 'pitch' | 'b0' | 'b1' | 'z' | 'thick'>) => r.z + r.thick + ((r.b1 - r.b0) / 2) * Math.tan((r.pitch * Math.PI) / 180);

/** Une souche de cheminée : son fût (`tex`), la dalle de couronnement, le noir du conduit. */
export function stack(Q: Quad[], x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, tex: Tex): void {
  Q.push(...box(x0, x1, y0, y1, z0, z1 - 2, part('souche', 12, '~', 'full'), tex));
  Q.push(...box(x0 - 1, x1 + 1, y0 - 1, y1 + 1, z1 - 2, z1, part('couronnement', 12.5, '~', 'full'), (_s, t, c) => (c.face === 'top' ? '+' : t > 1 ? '!' : ';')));
  Q.push(...box(x0 + 2, x1 - 2, y0 + 2, y1 - 2, z1, z1 + 0.01, part('conduit', 13, 'o', 'none'), () => 'o'));
}

// =====================================================================================================================
// Les baies (copie de village-maisons-pierre.ts)
// =====================================================================================================================

export function darkBay(Q: Quad[], x0: number, x1: number, y: number, z0: number, z1: number): void {
  Q.push(quad([x0, y, z0], [x1 - x0, 0, 0], [0, 0, z1 - z0], [0, 1, 0], part('baie', 0, 'o', 'none', { cast: false }), voidTex));
}
export function sill(Q: Quad[], x0: number, x1: number, yFace: number, z: number): void {
  Q.push(...box(x0, x1, yFace - 0.5, yFace + 0.7, z - 1.5, z, part('appui', 4, '~', 'full'), (_s, _t, c) => (c.face === 'top' ? '!' : '=')));
}
export function woodLintel(Q: Quad[], x0: number, x1: number, y0: number, y1: number, z0: number, seed: number): void {
  Q.push(...box(x0, x1, y0, y1 + 0.02, z0, z0 + 4, part('linteau', 6, 'K', 'full'), timber(seed)));
}
export function doorPlane(Q: Quad[], x0: number, x1: number, y: number, h: number, tex: Tex, z0 = 0): void {
  Q.push(...box(x0, x1, y - 1, y, z0, z0 + h, part('porte', 3, '&', 'full'), tex));
}
export function openShutter(x: number, yFace: number, z: number): Board {
  const s = img('plank-shutter-r1-worn');
  return { grid: s.grid, pal: s.pal, x: Math.round(x - 8), y: Math.round(yFace + 1 - z - s.grid.length), depth: () => yFace + 0.5 };
}
export function threshold(x0: number, x1: number, yFace: number): Board {
  return placeImg(propImg('threshold-stone'), x0, x1, yFace + 5);
}
/** L'âtre du jeu (`stone-hearth`) le dos au nord, posé en (x, y, z). */
export function hearth(frame: number, x: number, y: number, z = 0): Quad[] {
  return moved(hearthModel(frame)(), [x, y, z]);
}
/** Les murs d'une pièce : les quatre côtés, le sud coupé à `cut`. */
export interface ShellSpec {
  W: number; D: number; t: number; z0: number; z1: number; cut?: number;
  south: Tex; north: Tex; inner: Tex; top: Tex;
  holes: { S: Hole[]; N: Hole[]; W: Hole[]; E: Hole[] };
  part: Part;
}
export function shell(Q: Quad[], s: ShellSpec): void {
  const zs = s.cut ?? s.z1;
  wallRun(Q, true, 0, s.W, s.D - s.t, s.D, s.z0, zs, s.holes.S, s.part, { top: s.top, side: s.south });
  wallRun(Q, true, 0, s.W, 0, s.t, s.z0, s.z1, s.holes.N, s.part, { top: s.top, side: s.north });
  wallRun(Q, false, s.t, s.D - s.t, 0, s.t, s.z0, s.z1, s.holes.W, s.part, { top: s.top, side: s.inner });
  wallRun(Q, false, s.t, s.D - s.t, s.W - s.t, s.W, s.z0, s.z1, s.holes.E, s.part, { top: s.top, side: s.inner });
}

export interface Built { quads: Quad[]; boards: Board[]; floor?: [number, number, number, number] }
/** Une scène du repère du bâtiment posée à l'origine `o` (px) plus son décalage `AT` dans l'emprise. */
export function place(b: Built, AT: [number, number], o: [number, number]): Scene {
  const dx = o[0] + AT[0], dy = o[1] + AT[1];
  return {
    quads: hexify(moved(b.quads, [dx, dy, 0])),
    boards: b.boards.map((x) => moveBoard(x, dx, dy)),
    floor: b.floor ? [b.floor[0] + dx, b.floor[1] + dx, b.floor[2] + dy, b.floor[3] + dy] : undefined,
  };
}

// =====================================================================================================================
// NOUVEAU : les matières et les formes de la place sud
// =====================================================================================================================

/**
 * Le bardage à clins (la tailleuse) : des planches horizontales de 20 cm (4 px) qui se recouvrent, vues de face (s le long du mur,
 * t vers le haut). Chaque planche : son bord bas (le talon, plus épais) au jour, le fil en tirets, le haut dans l'ombre portée par le
 * talon de la planche du dessus ; les aboutages décalés d'un rang à l'autre (une planche de 3 à 5 m) ; le bas du mur mouillé.
 */
export function clapboard(seed: number): Tex {
  return (s, t, c) => {
    if (c.face === 'top' || c.face === 'under') return '%';
    if (c.face === 'E' || c.face === 'W' || c.face === 'edge') return c.face === 'W' ? '*' : '%';
    const i = Math.floor(s), j = Math.floor(t), r = Math.floor(j / 4), y = j - r * 4;
    const L = 60 + Math.floor(hash(seed, r, 1) * 40), off = Math.floor(hash(seed, r, 2) * L);
    if ((((i + off) % L) + L) % L === 0) return y === 3 ? '&' : '@';
    let k = y === 3 ? '&' : y === 0 ? '^' : dash(seed + r, y, i, 0.45) ? '%' : '*';
    if (y === 0 && hash(seed, i, r, 3) < 0.12) k = '*';
    if (j < 2 && k !== '&') k = k === '^' ? '*' : '%';
    return k;
  };
}

/** Une barre de bois de a à b, section w (perches, pieds écartés ; copie de `bar` de village-maisons-bois-pieces.ts). */
export function bar(a: V3, b: V3, w: number, p: Part, tex: Tex): Quad[] {
  const ax: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e1: V3 = Math.abs(ax[0]) > Math.abs(ax[1]) ? [0, 1, 0] : [1, 0, 0];
  const c: V3 = [ax[1] * e1[2] - ax[2] * e1[1], ax[2] * e1[0] - ax[0] * e1[2], ax[0] * e1[1] - ax[1] * e1[0]];
  const cl = Math.hypot(...c) || 1, e2: V3 = [c[0] / cl, c[1] / cl, c[2] / cl];
  return prism(a, b, e1, e2[2] < 0 ? [-e2[0], -e2[1], -e2[2]] : e2, w, w, p, tex);
}

/**
 * Une boule (un chou, une rave, une pomme, un oignon) : une boîte aux coins arrondis, vue du dessus et du sud ; la rampe [lumière,
 * teinte, ombre, contour côté lumière]. Chaque boule est sa propre pièce : son contour la sépare de ses voisines.
 */
export function ball(cx: number, cy: number, z0: number, r: number, ramp: string, h = r * 1.6, name = 'légume'): Quad[] {
  const P = part(name, 3, ramp[3], 'full');
  const tex: Tex = (s, t, c) => {
    if (c.face === 'top') {
      const dx = (s - r) / r, dy = (t - r) / r;
      if (dx * dx + dy * dy > 1.05) return null;
      return dx < -0.15 && dy > -0.1 ? ramp[0] : ramp[1];
    }
    if (c.face === 'S') {
      const dx = (s - r) / r, dz = (t - h / 2) / (h / 2);
      if (dx * dx + dz * dz > 1.25) return null;
      return dz > 0.2 ? ramp[1] : ramp[2];
    }
    return null;
  };
  return box(cx - r, cx + r, cy - r, cy + r, z0, z0 + h, P, tex);
}

/** Un tas de boules en pyramide sur un plateau : couche après couche, chacune en retrait d'un demi-pas. */
export function ballHeap(x0: number, x1: number, y0: number, y1: number, z0: number, r: number, ramps: string[], seed: number, layers = 2): Quad[] {
  const Q: Quad[] = [], step = r * 1.9;
  for (let L = 0; L < layers; L++) {
    const inset = L * step * 0.5;
    for (let y = y0 + r + inset; y <= y1 - r - inset + 0.01; y += step) {
      for (let x = x0 + r + inset; x <= x1 - r - inset + 0.01; x += step) {
        const k = Math.floor(hash(seed, Math.round(x * 3), Math.round(y * 3), L) * ramps.length);
        Q.push(...ball(x + (hash(seed, x, y, 7) - 0.5) * 0.6, y, z0 + L * r * 1.1, r, ramps[k]));
      }
    }
  }
  return Q;
}

/**
 * Le poteau d'enseigne : un poteau de bois sur un dé de pierre ; et, en repli, une potence vide (le bras de fer vers l'est, deux crochets),
 * tant que l'enseigne `hanging-sign` de l'autre module (art/proposals/place-nord-pieces.ts) manquerait (`arm` 0 : pas de bras). Dans le repère : le pied en (0, 0), haut de `h` px.
 */
export function bracketQuads(h = 52, arm = 16): Quad[] {
  const Q: Quad[] = [], W = timber(907);
  const iron: Tex = (_s, t, c) => (c.face === 'top' || (c.face === 'S' && t > c.h - 1) ? '-' : '_');
  Q.push(...box(-2.5, 2.5, -2, 2, 0, 3, part('dé', 2, '~', 'full'), (_s, _t, c) => (c.face === 'top' ? '+' : '=')));
  Q.push(...box(-1.5, 1.5, -1.5, 1.5, 3, h, part('poteau', 5, 'K', 'full'), W));
  if (!arm) return Q;
  Q.push(...box(1.5, 1.5 + arm, -0.5, 0.5, h - 4, h - 3, part('bras', 6, '_', 'thin'), iron));
  Q.push(...bar([1.5, 0, h - 10], [9, 0, h - 3.5], 0.8, part('jambe de force', 6, '_', 'thin'), iron));
  for (const x of [4, arm - 1]) Q.push(...box(x, x + 0.8, -0.4, 0.4, h - 7, h - 4, part('crochet', 6, '_', 'thin'), iron));
  return Q;
}

/** Une grille couleur de la palette (pour la planche). */
export type { Grid };
