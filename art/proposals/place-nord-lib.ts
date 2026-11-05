// PROPOSITION (hors jeu, jamais chargée par le jeu) : la boîte à outils des bâtiments des quarts nord de la place (CADRAGE-village.md,
// section 13 : la ferme du riche, le bûcheron, le menuisier, le panneau). Rien n'est réinventé : les matières et les rendus viennent
// des maisons du village validées par Grégoire (art/proposals/village-maisons-bois-lib.ts, village-maisons-pierre-matieres.ts, le
// rendu `render` de art/proposals/maison-xeros.ts, art/lib/volumes.ts). Ce fichier ajoute :
//   - les couleurs nouvelles de la place (la toile rayée guède et garance, le miel, la cire, le fromage, le papier, la peinture des
//     enseignes, le fer rouillé), en `#rrggbb` : le rendu de l'essai les accepte telles quelles, à ajouter à art/palette.ts si la
//     place entre au jeu ;
//   - un rendu des pièces seules qui accepte ces couleurs (`pieceImg` : la copie de `renderPiece` de art/lib/volumes.ts, qui écrit
//     des couleurs au lieu de signes, puis donne à chaque couleur un signe de la palette de l'image) ;
//   - les outils des murs de pierre du riche, copiés de village-maisons-pierre.ts (non exportés là-bas) : `wallRun`, `onFace`, le
//     toit à deux pans de laves, la souche, l'appui, la baie sombre ;
//   - les tas de bois du jeu tels qu'il les calcule (`woodPileDef` de src/world/woodPile.ts, chaque pièce par `composeWood`).
//
// Les palettes se composent avec celles des maisons : toutes les faces d'un bâtiment de la place sont écrites en signes de la palette
// de l'essai de Xéros (`XPAL` : le monde, le bois patiné, le bois vieux) ou en `#rrggbb`. Les faces tirées du module de pierre passent
// par son `hexify`, celles du module de bois par son `foreign` (leurs signes propres, le fer du bois et la lave de la pierre, se
// recouvrent : chacun les convertit avec sa palette avant qu'on les mêle).

import { withFoot } from './place-types';
import type { Grid, Palette } from '../lib/canvas';
import { sources } from '../index';
import { woodAges, iron, terracotta, woad, world } from '../palette';
import { composeWood } from '../world/wood-pieces';
import {
  add, box, dot, len, mul, part, polyPrism, unit, voidTex,
  type Board, type Part, type Quad, type Scene, type Tex, type V3,
} from '../lib/volumes';
import { PAL as XPAL } from './maison-xeros';
import { hexify, laves, lavesRidge, palette as STONE_PAL } from './village-maisons-pierre-matieres';
import { formView } from '../../src/world/natural';
import { variantImage } from '../../src/content/views';
import { woodPileDef } from '../../src/world/woodPile';
import type { PileWood, WoodPiece } from '../../src/content/types';
import propsJson from '../../src/content/props.json';

export { XPAL };
export type Img = { grid: Grid; pal: Palette };

// =====================================================================================================================
// Les couleurs nouvelles (hors de la palette du monde) : à ajouter à art/palette.ts, avec ces commentaires, si la place entre au jeu
// =====================================================================================================================

export const C = {
  // la guède (art/palette.ts `woad`) et la garance (la palette du coq, maison-coq) : les couleurs de la ferme du riche
  woadLight: woad.light, woad: woad.base, woadShade: woad.shade, woadDeep: woad.deep,
  madderLight: '#b8705a', // NOUVEAU : la garance au soleil, sur la toile neuve de l'auvent
  madder: '#a5614f', // la garance au jour (coq : ρ)
  madderShade: '#7e4a40', // la garance à l'ombre (coq : σ)
  madderDeep: '#5a3631', // la garance au creux du pli (coq : τ)
  // le miel et la cire : NOUVEAU (plus chauds et plus dorés que le chaume Y t T P)
  honeyLight: '#e2b252', honey: '#c08a32', honeyShade: '#8a5a26',
  waxLight: '#eadfa8', wax: '#d3c07e', waxShade: '#a58f58',
  // le fromage affiné : NOUVEAU (la croûte lavée orangée, la pâte crème)
  rindLight: '#d9a868', rind: '#b9834a', rindShade: '#86593a', paste: '#ecdcaa',
  // le grès des pots : NOUVEAU (gris brun, entre le torchis et la pierre)
  stonewareLight: '#b6a68a', stoneware: '#94826a', stonewareShade: '#6c5c4b',
  // le papier des feuillets et l'encre : NOUVEAU
  paper: '#ebe2c6', paperShade: '#cbbf9d', ink: '#4a3b33',
  // les épices en boîte, la peinture des enseignes : NOUVEAU (ocre jaune et ocre rouge des enseignes peintes)
  ochre: '#c49a4a', ochreShade: '#9a7438', redOchre: '#9c5638',
  // le fer (art/palette.ts `iron`) et le fer rouillé de l'atelier abandonné : NOUVEAU (la rouille)
  ironLight: iron['('], iron: iron[')'], ironShade: iron['<'], ironDeep: iron['>'],
  rust: '#8c4f30', rustLight: '#a8673e',
  // la terre cuite des jardinières (art/palette.ts `terracotta`, les tuiles de la forge) : déjà dans la palette du jeu
  terraLight: terracotta["'"], terra: terracotta['"'], terraShade: terracotta['\\'], terraDeep: terracotta['?'],
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
  throw new Error(`place-nord : pas d'image « ${name} »`);
}
type PropDef = { image: string; views: never; aged?: boolean; dims: { w: number; d: number; h: number } };
const props = propsJson as unknown as Record<string, PropDef>;
export type Age = 'new' | 'worn' | 'old';
/** L'image du jeu d'un objet dans sa vue, à l'âge voulu s'il prend l'âge. */
export function propImg(key: string, view = 0, age: Age = 'worn'): Img {
  const def = props[key];
  if (!def) throw new Error(`place-nord : pas d'objet « ${key} »`);
  const k = formView(variantImage(def.image, undefined), def.views, view, undefined, has);
  return img(def.aged && age !== 'new' && has(`${k}-${age}`) ? `${k}-${age}` : k);
}
/** Une image centrée sur son emprise (x0–x1, px), son bas au bord sud y relevé de z ; profondeur : le bord sud. */
export function placeImg(o: Img, x0: number, x1: number, ySouth: number, z = 0, depth = ySouth): Board {
  const w = o.grid[0].length;
  return { grid: o.grid, pal: o.pal, x: Math.round((x0 + x1) / 2 - w / 2), y: Math.round(ySouth - z) - o.grid.length, depth: () => depth };
}
/** Un objet de props.json posé comme le jeu le pose : le coin nord-ouest de son emprise en (x, y) px, dans sa vue, à la hauteur z (px). */
export function prop(key: string, x: number, y: number, view = 0, age: Age = 'worn', z = 0): Board {
  const d = props[key].dims, [w, dd] = view % 2 ? [d.d / 5, d.w / 5] : [d.w / 5, d.d / 5];
  return withFoot(placeImg(propImg(key, view, age), x, x + w, y + dd, z), x, x + w, dd);
}
export const propDims = (key: string) => props[key].dims;

/** Une pièce de bois du jeu, assemblée comme le jeu l'assemble (`composeWood`), palette du monde. */
export function woodImg(piece: WoodPiece): Img {
  return { grid: composeWood(piece).toGrid(), pal: world };
}
/** Une pièce de bois couchée posée au sol : son coin nord-ouest d'emprise en (x, y) px. */
export function woodBoard(piece: WoodPiece, x: number, ySouth: number, z = 0): Board {
  const g = woodImg(piece);
  return { grid: g.grid, pal: g.pal, x: Math.round(x), y: Math.round(ySouth - z) - g.grid.length, depth: () => ySouth };
}

/**
 * Un tas de bois du jeu, calculé comme le jeu le calcule (`woodPileDef`, src/world/woodPile.ts : 3 au sol, 2 dans les creux, 1 au
 * sommet pour le rond ; rangées de 3 × 3 pour le fendu), `n` pièces (dans l'ordre des places), est-ouest ou nord-sud ; l'origine du
 * tas (x, y) : le coin bas-gauche de la pièce de devant, comme le jeu. Les places s'affichent dans leur ordre (couche par couche).
 */
export function pileBoards(w: PileWood, x: number, y: number, n = 99, axis: 'ew' | 'ns' = 'ew'): Board[] {
  const def = woodPileDef(w);
  const places = axis === 'ew' ? def.places : def.turned!.places;
  const out: Board[] = [];
  Object.values(places).slice(0, n).forEach((p, i) => {
    const g = woodImg({ ...(p.wood as WoodPiece) });
    out.push({ grid: g.grid, pal: g.pal, x: Math.round(x + p.x), y: Math.round(y + p.y) - g.grid.length, depth: () => y + i * 0.01 });
  });
  return out;
}

// =====================================================================================================================
// Le rendu d'une pièce seule (copie de `renderPiece` de art/lib/volumes.ts, en couleurs), sa palette tirée des couleurs
// =====================================================================================================================

const VIEW_K = (k: number) => unit([0, 1, k]);
/** Un signe ou une couleur, en couleur. */
const hexOf = (k: string) => (k.startsWith('#') ? k : XPAL[k] ?? STONE_PAL[k] ?? k);
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
 * Une pièce rendue seule : ses faces dans la projection (x, k·y − z) (k = 1 pour une pièce de bâtiment, ½ pour un meuble), le point
 * le plus au sud gardé, le contour de STYLE.md section 3, recadrée ; `shadow` : l'ombre portée d'une rangée sous la silhouette,
 * décalée d'un pixel vers l'est ; `keepBottom` : garder sous la pièce les rangées jusqu'à son bord sud au sol (une pièce en hauteur).
 */
export function pieceImg(quads: Quad[], opts: { k?: number; shadow?: boolean; keepBottom?: boolean } = {}): Img {
  const k = opts.k ?? 0.5;
  const view = VIEW_K(k);
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
  // recadrer ; le bas de l'image : le bord sud de la boîte à sa base
  let maxY = -Infinity, minZ = Infinity;
  for (const q of quads) for (const p of [q.o, add(q.o, q.u), add(q.o, q.v), add(add(q.o, q.u), q.v)]) { maxY = Math.max(maxY, p[1]); minZ = Math.min(minZ, p[2]); }
  const bottom = opts.keepBottom ? Math.ceil(k * maxY - Math.min(0, minZ) - 1e-6) - 1 - by : Math.ceil(k * maxY - minZ - 1e-6) - 1 - by;
  cells = cropCells(cells, bottom);
  if (opts.shadow) {
    cells = cells.map((r) => [...r, '.']);
    const last = cells[cells.length - 1];
    cells.push(['.', ...last.slice(0, last.length - 1)].map((c) => (c === '.' ? '.' : 'x')));
  }
  return cellsToImg(cells);
}

function cropCells(rows: string[][], bottom: number): string[][] {
  const used = (r: string[]) => r.some((c) => c !== '.');
  const top = rows.findIndex(used), last = rows.length - 1 - [...rows].reverse().findIndex(used);
  if (top < 0) return [['.']];
  let l = Infinity, r = -1;
  for (const row of rows) for (let x = 0; x < row.length; x++) if (row[x] !== '.') { l = Math.min(l, x); r = Math.max(r, x); }
  const out = rows.slice(top, last + 1).map((row) => row.slice(l, r + 1));
  for (let y = last + 1; y <= bottom; y++) out.push(new Array(r - l + 1).fill('.'));
  return out;
}

// =====================================================================================================================
// Les faces : passer en couleurs ce qui n'est pas de la palette de l'essai
// =====================================================================================================================

/** Les faces tirées des matières de pierre (laves, verre, pierre de taille) : le `hexify` du module de pierre. */
export const stoneHex = hexify;
/** Des faces déplacées, leur matière lisant toujours le repère d'origine. */
export function moved(qs: Quad[], [dx, dy, dz]: V3): Quad[] {
  return qs.map((q) => ({ ...q, o: [q.o[0] + dx, q.o[1] + dy, q.o[2] + dz] as V3, tex: (s, t, c) => q.tex(s, t, { ...c, p: [c.p[0] - dx, c.p[1] - dy, c.p[2] - dz] }) }));
}
export const moveBoard = (b: Board, dx: number, dy: number): Board => ({ ...b, x: b.x + dx, y: b.y + dy, depth: (r) => b.depth(r) + dy });
export function moveScene(sc: Scene, dx: number, dy: number): Scene {
  return {
    quads: moved(sc.quads, [dx, dy, 0]),
    boards: sc.boards.map((b) => moveBoard(b, dx, dy)),
    floor: sc.floor ? [sc.floor[0] + dx, sc.floor[1] + dx, sc.floor[2] + dy, sc.floor[3] + dy] : undefined,
  };
}
/** Une image de pièce posée comme une pièce : centrée sur l'emprise x0–x1 (px), son bas au bord sud relevé de z. */
export const imgBoard = placeImg;

// =====================================================================================================================
// Le bois travaillé aux trois âges (les signes du monde : le neuf `woodAges.new` n'est pas dans la palette de l'essai, on l'écrit
// en couleur ; le patiné ^ * % & @ ; le vieux { } [ ] |)
// =====================================================================================================================

const OLD_SIGN: Record<string, string> = { '^': '{', '*': '}', '%': '[', '&': ']', '@': '|' };
/** Une texture de bois travaillé (signes du patiné) à un âge. */
export function agedTex(tex: Tex, age: Age): Tex {
  if (age === 'worn') return tex;
  return (s, t, c) => {
    const k = tex(s, t, c);
    if (k === null) return k;
    if (age === 'old') return OLD_SIGN[k] ?? k;
    return (woodAges.new as Record<string, string>)[k] ?? k;
  };
}

// =====================================================================================================================
// Copié de art/proposals/village-maisons-pierre.ts (non exporté là-bas) : les murs percés, le toit de laves, la souche, l'appui
// =====================================================================================================================

export interface Hole { a0: number; a1: number; z0: number; z1: number }
/** Un mur droit percé, le long de x (`ew`) ou de y, de a0 à a1, épaisseur c0–c1, de z0 à z1 ; les trous le découpent en boîtes. */
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
/** Une matière de face lue en coordonnées du mur (s = x − a0 ou y − a0, t = z − z0), pour que les pierres se suivent. */
export function onFace(tex: Tex, ew: boolean, a0: number, w: number, h: number, z0 = 0, top?: Tex): Tex {
  return (s, t, c) => {
    if (c.face === 'top' || c.face === 'under') return top ? top(s, t, c) : '+';
    if (!ew && (c.face === 'S' || c.face === 'N')) return tex(c.p[0] + c.p[1] * 0.37, c.p[2] - z0, { ...c, w, h });
    return tex((ew ? c.p[0] : c.p[1]) - a0, c.p[2] - z0, { ...c, w, h });
  };
}
export const quad = (o: V3, u: V3, v: V3, n: V3, p: Part, tex: Tex, face: Quad['face'] = 'S'): Quad => ({ o, u, v, n, part: p, tex, face });

/**
 * Le toit de laves à deux pans, faîtage est-ouest (copie de `gableRoof` de village-maisons-pierre.ts, axe x, couverture « laves ») :
 * les nus des pignons a0–a1, des gouttereaux b0–b1, le haut des murs z ; les percements (souches) x0, x1, y0, y1.
 */
export function lavesRoof(Q: Quad[], r: { a0: number; a1: number; b0: number; b1: number; z: number; pitch: number; eave: number; gable: [number, number]; thick: number; seed: number; holes?: [number, number, number, number][] }): void {
  const tan = Math.tan((r.pitch * Math.PI) / 180), H2 = (r.b1 - r.b0) / 2, mid = r.b0 + H2;
  const run = H2 + r.eave, zE = r.z + r.thick - r.eave * tan, zR = r.z + r.thick + H2 * tan;
  const L = Math.hypot(run, run * tan), sn = (run * tan) / L, cs = run / L;
  const P = part('pan', 9, '"', 'full', { roof: true });
  const A0 = r.a0 - r.gable[0], A1 = r.a1 + r.gable[1];
  const pierce = (tex: Tex): Tex => (s, t, c) => {
    const [x, y] = c.p;
    if (r.holes?.some(([x0, x1, y0, y1]) => x > x0 - 0.3 && x < x1 + 0.3 && y > y0 - 0.3 && y < y1 + 0.3)) return null;
    return tex(s, t, c);
  };
  Q.push(quad([A0, r.b1 + r.eave, zE], [A1 - A0, 0, 0], [0, -run, run * tan], [0, sn, cs], P, pierce(laves(r.seed)), 'slope'));
  Q.push(quad([A0, r.b0 - r.eave, zE], [A1 - A0, 0, 0], [0, run, run * tan], [0, -sn, cs], P, pierce(laves(r.seed + 1)), 'slope'));
  Q.push(quad([A0, r.b1 + r.eave, zE - r.thick], [A1 - A0, 0, 0], [0, 0, r.thick], [0, 1, 0], P, laves(5), 'S'));
  const RP = part('faîtage', 11, '"', 'full', { roof: true });
  const sec: [number, number][] = [[mid + 3, zR - 1], [mid + 2, zR + 2], [mid - 2, zR + 2], [mid - 3, zR - 1]];
  const ridge = lavesRidge();
  const cut: Tex = (s, t, c) => (r.holes?.some(([a, b, y0, y1]) => c.p[0] > a - 0.3 && c.p[0] < b + 0.3 && mid >= y0 - 3 && mid <= y1 + 3) ? null : ridge(s, t, c));
  Q.push(...polyPrism(A0, A1, sec, RP, cut));
}
/** Le pignon d'un toit à deux pans (le nu du mur, sous les rampants) : la face au-dessus de la sablière, triangle. */
export function gableFace(x: number, nx: 1 | -1, b0: number, b1: number, z: number, pitch: number, p: Part, tex: Tex): Quad {
  const tan = Math.tan((pitch * Math.PI) / 180), D = b1 - b0, gh = (D / 2) * tan;
  const apex = (s: number) => (D / 2 - Math.abs(s - D / 2)) * tan;
  if (nx < 0) return { o: [x, b0, z], u: [0, D, 0], v: [0, 0, gh], n: [-1, 0, 0], part: p, tex: (s, t, c) => (t > apex(s) ? null : tex(s, t, c)), face: 'W' };
  return { o: [x, b1, z], u: [0, -D, 0], v: [0, 0, gh], n: [1, 0, 0], part: p, tex: (s, t, c) => (t > apex(D - s) ? null : tex(s, t, c)), face: 'E' };
}
/** Une souche de cheminée : son fût, la dalle de couronnement, le noir du conduit. */
export function stack(Q: Quad[], x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, tex: Tex): void {
  Q.push(...box(x0, x1, y0, y1, z0, z1 - 2, part('souche', 12, '~', 'full'), tex));
  Q.push(...box(x0 - 1, x1 + 1, y0 - 1, y1 + 1, z1 - 2, z1, part('couronnement', 12.5, '~', 'full'), (_s, t, c) => (c.face === 'top' ? '+' : t > 1 ? '!' : ';')));
  Q.push(...box(x0 + 2, x1 - 2, y0 + 2, y1 - 2, z1, z1 + 0.01, part('conduit', 13, 'o', 'none'), () => 'o'));
}
/** Le jour d'une fenêtre vu du dehors : la pénombre du dedans, au fond de l'embrasure. */
export function darkBay(Q: Quad[], x0: number, x1: number, y: number, z0: number, z1: number): void {
  Q.push(quad([x0, y, z0], [x1 - x0, 0, 0], [0, 0, z1 - z0], [0, 1, 0], part('baie', 0, 'o', 'none', { cast: false }), voidTex));
}
/** L'appui d'une fenêtre : une pierre plate à peine saillante. */
export function sill(Q: Quad[], x0: number, x1: number, yFace: number, z: number): void {
  Q.push(...box(x0, x1, yFace - 0.5, yFace + 0.7, z - 1.5, z, part('appui', 4, '~', 'full'), (_s, _t, c) => (c.face === 'top' ? '!' : '=')));
}

// =====================================================================================================================
// Petites géométries
// =====================================================================================================================

const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Une barre de section carrée w de a à b (perche penchée, bras de fer), ses faces tournées vers le dehors. */
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
  ] as [V3, V3, V3][]) out.push({ o, u: ax, v, n, part: p, tex, face: 'edge' });
  out.push({ o: c(-1, -1), u: mul(e1, w), v: mul(e2, w), n: mul(A, -1), part: p, tex, face: 'cap' });
  out.push({ o: add(c(-1, -1), ax), u: mul(e1, w), v: mul(e2, w), n: A, part: p, tex, face: 'cap' });
  return out;
}
/** Un cylindre debout (axe z) de rayon r, de z0 à z1, `n` pans : la face latérale éclairée du nord-ouest, le dessus. */
export function upright(cx: number, cy: number, r: number, z0: number, z1: number, p: Part, side: Tex, top: Tex, n = 10): Quad[] {
  const Q: Quad[] = [];
  const w = 2 * r * Math.tan(Math.PI / n);
  for (let k = 0; k < n; k++) {
    const ang = ((k + 0.5) / n) * Math.PI * 2;
    const nr: V3 = [Math.cos(ang), Math.sin(ang), 0];
    const tg: V3 = [-Math.sin(ang), Math.cos(ang), 0];
    const c0: V3 = [cx + nr[0] * r * Math.cos(Math.PI / n) - (tg[0] * w) / 2, cy + nr[1] * r * Math.cos(Math.PI / n) - (tg[1] * w) / 2, z0];
    Q.push({ o: c0, u: mul(tg, w), v: [0, 0, z1 - z0], n: nr, part: p, tex: side, face: 'edge' });
  }
  Q.push({ o: [cx - r, cy - r, z1], u: [2 * r, 0, 0], v: [0, 2 * r, 0], n: [0, 0, 1], part: p, face: 'top', tex: (s, t, c) => (Math.hypot(s - r, t - r) > r + 0.05 ? null : top(s, t, c)) });
  return Q;
}
/** La lumière d'une face latérale de cylindre (n de la face) : 0 au jour (nord-ouest et ouest), 1 au milieu, 2 à l'ombre (est). */
export const litOf = (n: V3): 0 | 1 | 2 => (n[0] < -0.35 ? 0 : n[0] > 0.45 ? 2 : 1);
