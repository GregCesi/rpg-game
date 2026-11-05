// PROPOSITION (hors jeu, jamais chargée par le jeu) : les bâtiments des quarts sud de la place resserrée (CADRAGE-village.md, section
// 14 : le rond de 20 m, les bâtiments en équerre serrés autour, leurs portes sur le rond ; 14.2 : les deux solutions des bâtiments qui
// tournent le dos au joueur ; 14.3 : chaque bâtiment est le commerce et le logis de quelqu'un). Planches de contrôle :
// npx tsx tools/essai-place-sud.ts (.art-preview/place-sud-dehors.png, place-sud-dedans.png, place-sud-pieces.png).
//
// Les trois bâtiments ont leur entrée au nord, sur le rond : le jeu ne montre que les faces sud, on n'en voit que le toit. Ce que la
// géométrie du jeu impose (projection (x, y − z), vue à 45°) : un pan tourné vers le nord à moins de 45° se voit ; un bâtiment à étage
// (égout à 5,25 m) cache le sol au nord de lui sur la hauteur de son égout, plus son débord : 5,35 m. Un appentis bas (égout à 1,90 m,
// 2,80 m de profondeur) se trouve donc tout entier dans cette bande : on ne le voit pas du dehors, seulement quand le toit s'efface
// au-dessus de Xéros. Ce qui se voit, c'est ce qui est à plus de 5,35 m du mur, soit 2,55 m au-delà de l'égout de l'appentis (14.2 en
// demandait 2 au moins) : c'est là que sont les étals de la solution 1. Les deux ailes « le long d'une rue nord-sud » (l'aile du cuir,
// la ferme rivale) ont leur faîtage nord-sud et une croupe au nord : un pignon tourné vers le rond, haut de 9,40 m, cacherait 9,40 m de
// place (tout le recoin et le bord du rond).
//
//   - Solution 1 (`BUILDINGS`) : l'appentis ouvert contre la façade nord, les grands étals à ciel ouvert devant lui, dans la bande qui
//     se voit (sur la rue de l'ouest, sur la rue de l'est, dans le recoin et sur le bord du rond).
//   - Solution 2 (`BUILDINGS_S2`) : la façade nord sans appentis, la boutique meublée dedans ; dehors, peu de choses. `S2_SHOPS` donne
//     les pièces de boutique, `s2Reveal` la scène nue (toit et étage ôtés, murs coupés) et `fadeHoles` le fondu du jeu (toit et mur nord
//     de la pièce à 0,35, comme `windowFade` et `windowHole` de src/world/roofView.ts) : ce que voit le joueur debout devant la porte.
//
// Le modèle est celui des maisons du village, validé par Grégoire ; les aides copiées sont dans place-sud-lib.ts, les pièces nouvelles
// dans place-sud-pieces.ts. Repère de chaque bâtiment : px du jeu (5 cm), x vers l'est, y vers le sud, z vers le haut, l'origine au
// coin nord-ouest de son emprise (`size`), posée en `at` dans la zone village.

import {
  box, doorTex, part, timber, type Board, type Part, type Quad, type Scene, type Tex,
} from '../lib/volumes';
import { daub } from '../lib/volumes';
import type { Layer } from './maison-xeros';
import type { PlaceBuilding, PlaceBuildingId } from './place-types';
import type { Rect } from './village-plan-data';
import {
  VOID, boards, dimmed, furnWood, leaded, limeMasonry, limePlaster, palette, planks, rendered, rubble, rubbleSection, withBays,
  type StoneBay,
} from './village-maisons-pierre-matieres';
import { STAIR, pieceGrid as stonePieceGrid, pieceModel as stonePieceModel, stairModel } from './village-maisons-pierre-pieces';
import { crossTex } from './village-maisons-bois-lib';
import {
  bar, clapboard, darkBay, doorPlane, flowerPot, gableRoof, gableYS, hearth, ladder, leanToX, lift, moved, onFace, openShutter, place,
  placeImg, prop, ridgeZ, ridgeZY, roofY, stack, threshold, turned, wallRun, washingLine, type Built, type Cover, type Hole,
  type RoofSpec, type RoofYSpec,
} from './place-sud-lib';
import {
  GALLERY, PIECES as PIECE_LIST, clothBoltQuads, fenceModel, furnitureGrid, galleryModel, gateModel, pieceGrid, pieceModel,
  tailorTableQuads,
} from './place-sud-pieces';
import { pieceGrid as woodPieceGrid } from './village-maisons-bois-pieces';
import { HEARTH, hearthModel } from '../world/chimney';
import { PIECE_PAL } from './village-maisons-bois-lib';
import { hangingSign } from './place-nord-pieces';

export const PIECES = PIECE_LIST;
export { palette };

// =====================================================================================================================
// Outils
// =====================================================================================================================

/** Une pièce nouvelle (meuble) posée comme un objet du jeu : son emprise au coin nord-ouest (x, y) en px, dans sa vue, à la hauteur z. */
function piece(key: string, x: number, y: number, view = 0, z = 0): Board {
  const m = pieceModel(key), [w, d] = view % 2 ? [m.dims.d / 5, m.dims.w / 5] : [m.dims.w / 5, m.dims.d / 5];
  return placeImg({ grid: pieceGrid(m, view), pal: palette }, x, x + w, y + d, z);
}
/** Un meuble d'un modèle quelconque (la table de la tailleuse, un coupon), son emprise w × d px. */
function furniture(q: Quad[], x: number, y: number, w: number, d: number, z = 0, view = 0): Board {
  return placeImg({ grid: furnitureGrid(q, view), pal: palette }, x, x + w, y + d, z);
}
/** Une pièce des maisons de pierre (la chaise). */
function stonePiece(key: string, x: number, y: number, view = 0, z = 0): Board {
  const m = stonePieceModel(key), [w, d] = view % 2 ? [m.dims.d / 5, m.dims.w / 5] : [m.dims.w / 5, m.dims.d / 5];
  return placeImg({ grid: stonePieceGrid(m, view), pal: palette }, x, x + w, y + d, z);
}
/** Une pièce des maisons de bois (le rouet, le chevalet). */
function woodPiece(key: string, w: number, d: number, x: number, y: number, view = 0, z = 0): Board {
  const [ww, dd] = view % 2 ? [d, w] : [w, d];
  return placeImg({ grid: woodPieceGrid(key, view), pal: PIECE_PAL }, x, x + ww / 5, y + dd / 5, z);
}
/** L'âtre du jeu tourné le dos au sud (contre le mur sud, la souche au-dessus) : son dos en (x .. x + 44, ySouth). */
function hearthNorth(frame: number, x: number, ySouth: number, z: number): Quad[] {
  return moved(turned(hearthModel(frame)(), 2, HEARTH.w, HEARTH.d), [x, ySouth - HEARTH.d, z]);
}
const boltBoard = (kind: 'red' | 'blue' | 'linen', x: number, y: number, z = 0) => furniture(clothBoltQuads(kind), x, y, 8, 6, z);

/** Le poteau planté qui porte une enseigne (2,60 m, sur un dé), son pied en (x, y). */
function signPost(x: number, y: number): Quad[] {
  const Q: Quad[] = [];
  Q.push(...box(x - 2.5, x + 2.5, y - 2, y + 2, 0, 3, part('dé', 2, '~', 'full'), (_s, _t, c) => (c.face === 'top' ? '+' : '=')));
  Q.push(...box(x - 1.5, x + 1.5, y - 1.5, y + 1.5, 3, 52, part('poteau', 5, 'K', 'full'), timber(907)));
  return Q;
}
/**
 * L'enseigne `hanging-sign` (dessinée par l'autre module, art/proposals/place-nord-pieces.ts : la potence de fer, le panneau peint, un
 * motif par métier) fixée à une face tournée vers l'est (R0, le bras vers l'est, depuis x) ou vers l'ouest (R2) ; son bras à `armZ` px.
 */
function sign(motif: 's2' | 's3' | 's4', x: number, y: number, armZ: number, west = false): Board {
  const im = hangingSign(motif, west ? 2 : 0);
  const [x0, x1] = west ? [x - 20, x] : [x, x + 20];
  return placeImg(im, x0, x1, y, armZ - 16, y);
}
/** Une enseigne sur son poteau planté : le poteau en (x, y), l'enseigne vers l'est. */
function postSign(Q: Quad[], B: Board[], motif: 's2' | 's3' | 's4', x: number, y: number): void {
  Q.push(...signPost(x, y));
  B.push(sign(motif, x + 1.5, y + 0.5, 48));
}
/** Une palissade le long de x (de x0 à x1, sur y) ou le long de y (de y0 à y1, sur x). */
const fenceX = (x0: number, x1: number, y: number, seed: number) => moved(fenceModel(x1 - x0, seed), [x0, y - 2, 0]);
const fenceY = (y0: number, y1: number, x: number, seed: number) => moved(turned(fenceModel(y1 - y0, seed), 1, y1 - y0, 3.5), [x - 2, y0, 0]);

/** Le bois d'une cloison ou d'un mur de planches vu du dedans. */
const plankInner = (seed: number): Tex => boards(seed, 5, [2]);
const steps = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => Math.round(a + ((b - a) * i) / n));

// =====================================================================================================================
// Le modèle commun : des ailes (un corps de bâtiment à étage, son toit), assemblées
// =====================================================================================================================

/** Les hauteurs de tous les bâtiments : le rez à 2,60 m, le plancher à 2,85 m, l'égout à 5,25 m. */
const H = { rez: 52, floor: 57, top: 105, solin: 6 };

type Mat = 'clap' | 'merc' | 'rival';
type BayKind = 'door' | 'window' | 'shop' | 'leaded';
interface Bay { a0: number; a1: number; z0: number; z1: number; kind: BayKind }
type UpBay = 'plain' | 'cross' | 'window';
interface Wing {
  /** Les murs, dans le repère de la scène. */
  x0: number; x1: number; y0: number; y1: number;
  /** Le faîtage : le long de x (est-ouest) ou de y (nord-sud, croupe au nord, pignon au sud). */
  axis: 'x' | 'y';
  mat: Mat;
  cover: Cover; pitch: number; seed: number;
  /** Les baies de la face sud (la seule qu'on voit) ; a depuis x0. Pour `merc` et `rival`, celles du rez. */
  south: Bay[];
  /** L'étage de pan de bois (`merc`, `rival`) : les travées entre les poteaux. */
  up?: UpBay[];
  /** La porte de la boutique au nord, sur le rond (a depuis x0). */
  northDoor?: [number, number];
  /** La souche de cheminée : x0, x1, y0, y1 (repère de la scène). */
  stack?: [number, number, number, number];
  /** La galerie de bois sur la face sud : ses poteaux (x de la scène). */
  gallery?: number[];
}
/** L'épaisseur des murs : les planches 15 cm, la pierre 50. */
const thick = (m: Mat) => (m === 'clap' ? 3 : 8);

const roofX = (w: Wing): RoofSpec => ({
  axis: 'x', a0: w.x0, a1: w.x1, b0: w.y0, b1: w.y1, z: H.top, pitch: w.pitch, eave: 6, gable: [4, 4], thick: 2, cover: w.cover, seed: w.seed,
  holes: w.stack ? [w.stack] : undefined,
});
const roofYOf = (w: Wing): RoofYSpec => ({
  x0: w.x0, x1: w.x1, y0: w.y0, y1: w.y1, z: H.top, pitch: w.pitch, eave: 6, gableS: 4, thick: 2, cover: w.cover, seed: w.seed, hipN: true,
  holes: w.stack ? [w.stack] : undefined,
});
const ridgeOf = (w: Wing) => (w.axis === 'x' ? ridgeZ({ pitch: w.pitch, b0: w.y0, b1: w.y1, z: H.top, thick: 2 }) : ridgeZY(roofYOf(w)));
const abs = (w: Wing, b: Bay): Hole => ({ a0: w.x0 + b.a0, a1: w.x0 + b.a1, z0: b.z0, z1: b.z1 });

/** La matière d'un mur de face (s le long du mur depuis a0, t depuis le pied), selon la matière de l'aile. */
function faceTex(w: Wing, ew: boolean, a0: number, len: number, seed: number): Tex {
  if (w.mat === 'clap') return (_s, _t, c) => (c.face === 'top' ? '%' : clapboard(seed)((ew ? c.p[0] : c.p[1]) - a0, c.p[2] - H.solin, c));
  if (w.mat === 'merc') {
    const bays: StoneBay[] = w.south.filter((b) => b.kind !== 'door').map((b, i) => ({ s0: b.a0, s1: b.a1, t0: b.z0, t1: b.z1, seed: i }));
    return onFace(withBays(rendered(seed, len, ['left', 'right']), ew && a0 === w.x0 ? bays : []), ew, a0, len, H.rez);
  }
  const holes = ew ? w.south.map((b) => ({ s0: b.a0, s1: b.a1, t0: b.z0, t1: b.z1, kind: 'lintel' as const })) : [];
  return onFace(rubble(seed, len, H.rez, 'lime', holes), ew, a0, len, H.rez, 0, rubbleSection(seed + 1, 'lime'));
}

/**
 * Les murs d'une aile. `cut` : la vue de dedans (le rez coupé à 70 cm, ou l'étage coupé à 70 cm au-dessus de son plancher) ; sinon
 * tout le volume, l'étage de pan de bois des ailes de pierre compris.
 */
function wingWalls(Q: Quad[], B: Board[], w: Wing, view: 'out' | 'in0' | 'in1'): void {
  const t = thick(w.mat), W = w.x1 - w.x0, D = w.y1 - w.y0;
  const P = part('mur', 2, w.mat === 'clap' ? 'K' : '~', 'full', { eave: true });
  const S = part('solin', 2, '~', 'full');
  const stone = w.mat !== 'clap';
  // la hauteur des murs de chaque vue
  const [z0, z1] = view === 'out' ? [0, stone ? H.rez : H.top] : view === 'in0' ? [0, 14] : [H.floor, H.floor + 14];
  const inner = (seed: number): Tex => (_s, _t, c) => (c.face === 'top' ? (stone && view !== 'in1' ? rubbleSection(seed, 'lime')(_s, _t, c) : '%') : stone && view !== 'in1' ? limePlaster(seed)(c.p[0] + c.p[1], c.p[2], c) : plankInner(seed)(c.p[0] + c.p[1], c.p[2], c));
  const sHoles = w.south.map((b) => abs(w, b));
  const nHoles: Hole[] = w.northDoor ? [{ a0: w.x0 + w.northDoor[0], a1: w.x0 + w.northDoor[1], z0: 0, z1: 36 }] : [];
  if (view === 'in1' && stone) {
    // l'étage des ailes de pierre est de pan de bois : coupé à 70 cm, ses poteaux et ses panneaux chaulés
    const posts = steps(w.x0, w.x1, w.up!.length);
    halfTimber(Q, B, w.y1, posts, w.up!, H.floor, H.top, w.seed + 30, H.floor + 14);
    const wt: Tex = (s, tt, c) => (c.face === 'top' ? '*' : Math.floor(c.p[0] + c.p[1]) % 32 < 4 ? timber(w.seed + 31)(s, tt, c) : limePlaster(w.seed + 32)(c.p[0] + c.p[1], c.p[2], c));
    const wp = part('pan de bois', 3, 'K', 'full');
    Q.push(...box(w.x0, w.x1, w.y0, w.y0 + 3, z0, z1, wp, wt), ...box(w.x0, w.x0 + 3, w.y0 + 3, w.y1 - 3, z0, z1, wp, wt), ...box(w.x1 - 3, w.x1, w.y0 + 3, w.y1 - 3, z0, z1, wp, wt));
    return;
  }
  const lo = w.mat === 'clap' ? Math.max(z0, H.solin) : z0;
  if (w.mat === 'clap' && z0 === 0) {
    const r = (seed: number, len: number) => onFace(rubble(seed, len, H.solin, 'lime'), true, 0, len, H.solin, 0, rubbleSection(seed + 1, 'lime'));
    const doors = w.south.filter((b) => b.kind === 'door').map((b) => ({ ...abs(w, b), z0: 0, z1: H.solin }));
    wallRun(Q, true, w.x0 - 1, w.x1 + 1, w.y1 - t - 1, w.y1 + 1, 0, H.solin, doors, S, r(w.seed + 21, W + 2));
    wallRun(Q, true, w.x0 - 1, w.x1 + 1, w.y0 - 1, w.y0 + t + 1, 0, H.solin, nHoles.map((h) => ({ ...h, z1: H.solin })), S, r(w.seed + 23, W + 2));
    Q.push(...box(w.x0 - 1, w.x0 + t + 1, w.y0 + t + 1, w.y1 - t - 1, 0, H.solin, S, r(w.seed + 25, D)), ...box(w.x1 - t - 1, w.x1 + 1, w.y0 + t + 1, w.y1 - t - 1, 0, H.solin, S, r(w.seed + 27, D)));
  }
  const out = view === 'out';
  wallRun(Q, true, w.x0, w.x1, w.y1 - t, w.y1, lo, z1, sHoles, P, out ? faceTex(w, true, w.x0, W, w.seed + 1) : inner(w.seed + 1));
  wallRun(Q, true, w.x0, w.x1, w.y0, w.y0 + t, lo, z1, nHoles, P, out ? faceTex(w, true, w.x0, W, w.seed + 3) : inner(w.seed + 3));
  wallRun(Q, false, w.y0 + t, w.y1 - t, w.x0, w.x0 + t, lo, z1, [], P, out ? faceTex(w, false, w.y0, D, w.seed + 5) : inner(w.seed + 5));
  wallRun(Q, false, w.y0 + t, w.y1 - t, w.x1 - t, w.x1, lo, z1, [], P, out ? faceTex(w, false, w.y0, D, w.seed + 7) : inner(w.seed + 7));
  if (!out) return;
  const T = (n: string, p = 4) => part(n, p, 'K', 'full', { eave: true });
  if (w.mat === 'clap') {
    // les planches d'angle debout, la ceinture entre les deux niveaux (sur la face sud)
    for (const x of [w.x0, w.x1 - 3]) Q.push(...box(x, x + 3, w.y1 - t - 0.4, w.y1 + 0.4, lo, z1, T('planche d angle'), timber(w.seed + 41 + x)));
    Q.push(...box(w.x0 - 0.4, w.x1 + 0.4, w.y1 - t - 0.4, w.y1 + 0.6, H.rez, H.floor, T('ceinture', 4.5), timber(w.seed + 43)));
    return;
  }
  // les ailes de pierre : la ceinture de bois (les bouts des solives), l'étage de pan de bois chaulé
  Q.push(...box(w.x0, w.x1, w.y1 - 3, w.y1, H.rez, H.floor, part('ceinture', 6, 'K', 'full', { eave: true }), (s, tt, c) => (c.face === 'S' ? (Math.floor(s) % 8 < 3 && tt < 3.5 ? '&' : '%') : '*')));
  halfTimber(Q, B, w.y1, steps(w.x0, w.x1, w.up!.length), w.up!, H.floor, H.top, w.seed + 30);
  const wp = part('pan de bois', 3, 'K', 'full');
  const W_ = furnWood(w.seed + 33);
  Q.push(...box(w.x0, w.x1, w.y0, w.y0 + 3, H.floor - 5, H.top, wp, W_), ...box(w.x0, w.x0 + 3, w.y0 + 3, w.y1 - 3, H.floor - 5, H.top, wp, W_), ...box(w.x1 - 3, w.x1, w.y0 + 3, w.y1 - 3, H.floor - 5, H.top, wp, W_));
  Q.push(...box(w.x0, w.x1, w.y0, w.y1 - 3, H.rez, H.floor - 5, wp, W_));
}

/**
 * Une façade de pan de bois chaulé (l'étage de la mercière et de la ferme rivale) le long de x, au nu y1 : sablières, poteaux aux
 * `posts`, travée par travée : `plain` (une entretoise, deux panneaux chaulés), `cross` (la croix de Saint-André du vannier), `window`
 * (appui, linteau, deux montants, le jour et son volet ouvert). `cut` : coupée à cette hauteur (le dedans).
 */
function halfTimber(Q: Quad[], B: Board[], y1: number, posts: number[], bays: UpBay[], z0: number, z1: number, seed: number, cut?: number): void {
  const top = cut ?? z1, y0 = y1 - 3;
  const T = (n: string, p = 6) => part(n, p, 'K', 'full', { eave: true });
  const put = (xa: number, xb: number, za: number, zb: number, p: Part, tex: Tex) => { if (za < top && xb - xa > 0.1) Q.push(...box(xa, xb, y0, y1, za, Math.min(zb, top), p, tex)); };
  const panel = (xa: number, xb: number, za: number, zb: number, sd: number) => put(xa, xb, za, zb, part('torchis', 1, ';', 'none', { eave: true }), daub(sd, true));
  put(posts[0], posts[posts.length - 1], z0, z0 + 4, T('sablière basse', 7), timber(seed));
  if (!cut) put(posts[0], posts[posts.length - 1], z1 - 4, z1, T('sablière haute', 7), timber(seed + 1));
  posts.forEach((p, k) => {
    const a = k === 0 ? p : k === posts.length - 1 ? p - 4 : p - 2;
    put(a, a + 4, z0 + 4, z1 - 4, T('poteau', 6), timber(seed + 10 + k, [[1, 2], [2, 36]]));
  });
  bays.forEach((bay, k) => {
    const a = posts[k] + (k === 0 ? 4 : 2), b = posts[k + 1] - (k + 1 === posts.length - 1 ? 4 : 2), m = (a + b) / 2, sd = seed + 100 + k * 7;
    const zm = (z0 + z1) / 2;
    if (bay === 'plain') { put(a, b, zm - 1, zm + 1, T('entretoise', 5), timber(sd)); panel(a, b, z0 + 4, zm - 1, sd + 1); panel(a, b, zm + 1, z1 - 4, sd + 2); return; }
    if (bay === 'cross') { put(a, b, z0 + 4, z1 - 4, part('croix', 1, ';', 'none', { eave: true }), crossTex(sd, 'worn')); return; }
    const w0 = z0 + 14, w1 = z0 + 30;
    put(a, b, w0 - 2, w0, T('appui', 6), timber(sd));
    put(a, b, w1, w1 + 2, T('linteau', 6), timber(sd + 1));
    panel(a, b, z0 + 4, w0 - 2, sd + 2); panel(a, b, w1 + 2, z1 - 4, sd + 3);
    put(m - 8, m - 6, w0, w1, T('montant', 6), timber(sd + 4)); put(m + 6, m + 8, w0, w1, T('montant', 6), timber(sd + 5));
    panel(a, m - 8, w0, w1, sd + 6); panel(m + 8, b, w0, w1, sd + 7);
    if (cut) return;
    darkBay(Q, m - 6, m + 6, y0 + 1, w0, w1); B.push(openShutter(m - 6, y1, w0));
    // un pot de fleurs sur l'appui d'une fenêtre sur deux
    if ((k + seed) % 2 === 0) flowerPot(Q, m - 2, y1 + 1.5, w0, sd);
  });
}

/** Les baies de la face sud d'une aile, du dehors : chambranle ou pierre, porte, jour, volet ouvert, vitrail, appui fleuri. */
function wingBays(Q: Quad[], B: Board[], w: Wing): void {
  const y = w.y1;
  const T = (n: string) => part(n, 5, 'K', 'full', { eave: true });
  w.south.forEach((b, k) => {
    const h = abs(w, b), sd = w.seed + 51 + k;
    if (w.mat === 'clap') {
      Q.push(...box(h.a0 - 2, h.a0, y - 0.5, y + 1, h.z0, h.z1 + 2, T('chambranle'), timber(sd)));
      Q.push(...box(h.a1, h.a1 + 2, y - 0.5, y + 1, h.z0, h.z1 + 2, T('chambranle'), timber(sd + 1)));
      Q.push(...box(h.a0 - 2, h.a1 + 2, y - 0.5, y + 1, h.z1, h.z1 + 2, T('chambranle'), timber(sd + 2)));
    } else if (w.mat === 'rival') {
      Q.push(...box(h.a0 - 2, h.a1 + 2, y - 0.5, y + 0.6, h.z1, h.z1 + 3, T('linteau'), timber(sd + 2)));
    }
    if (b.kind === 'door') {
      doorPlane(Q, h.a0, h.a1, y - 2, h.z1 - h.z0, doorTex(sd, h.a1 - h.a0), h.z0);
      if (w.mat !== 'clap') B.push(threshold(h.a0 - 3, h.a1 + 3, y));
      return;
    }
    if (b.kind === 'leaded') {
      Q.push(...box(h.a0 - 2, h.a1 + 2, y - 0.5, y + 0.7, h.z0 - 1.5, h.z0, part('appui', 4, '~', 'full'), (_s, _t, c) => (c.face === 'top' ? '!' : '=')));
      Q.push(...box(h.a0, h.a1, y - 4, y - 3, h.z0, h.z1, part('vitrail', 1, '`', 'none'), (s, tt) => leaded(h.a1 - h.a0, h.z1 - h.z0, s, tt)));
      flowerPot(Q, h.a0 + 1, y + 0.5, h.z0, sd); flowerPot(Q, h.a1 - 5, y + 0.5, h.z0, sd + 3);
      return;
    }
    darkBay(Q, h.a0, h.a1, y - 2, h.z0, h.z1);
    if (b.kind === 'window') {
      B.push(openShutter(h.a0, y, h.z0));
      Q.push(...box(h.a0 - 2, h.a1 + 2, y - 0.5, y + 1.5, h.z0 - 1.5, h.z0, T('appui'), timber(sd + 3)));
      if (k % 2 === 0) flowerPot(Q, (h.a0 + h.a1) / 2 - 2, y + 1.2, h.z0, sd);
    }
  });
}

/** Le pignon sud d'une aile à faîtage nord-sud : bardage à clins (la tailleuse) ou planches debout (la ferme rivale), une lucarne. */
function wingGable(Q: Quad[], w: Wing): void {
  const r = roofYOf(w);
  const P = part('pignon', 2, 'K', 'full', { eave: true });
  const tex: Tex = w.mat === 'clap'
    ? (_s, _t, c) => clapboard(w.seed + 61)(c.p[0] - w.x0, c.p[2] - H.solin, c)
    : (_s, _t, c) => { const i = Math.floor(c.p[0] - w.x0), j = Math.floor(c.p[2]); return i % 5 === 0 ? '&' : j % 23 === 0 ? '%' : (i + j) % 11 === 0 ? '%' : i % 5 === 1 ? '^' : '*'; };
  gableYS(Q, r, tex, P);
  const m = (w.x0 + w.x1) / 2;
  darkBay(Q, m - 5, m + 5, w.y1 + 0.2, H.top + 10, H.top + 22);
  Q.push(...box(m - 6, m + 6, w.y1, w.y1 + 1.2, H.top + 8.5, H.top + 10, part('appui', 5, 'K', 'full'), timber(w.seed + 63)));
}

/** Le toit d'une aile et sa souche. */
function wingRoof(Q: Quad[], w: Wing): void {
  if (w.axis === 'x') gableRoof(Q, roofX(w));
  else { roofY(Q, roofYOf(w)); wingGable(Q, w); }
  if (w.stack) {
    const [a, b, c, d] = w.stack;
    stack(Q, a, b, c, d, H.top - 5, ridgeOf(w) + 12, w.mat === 'merc' ? onFace(rendered(w.seed + 71, b - a, ['left', 'right']), true, a, b - a, 300) : limeMasonry(w.seed + 71, () => [true, true]));
  }
}

/** L'appentis ouvert de la solution 1 contre la façade nord d'une aile (2,80 m, égout à 1,90 m). */
const LEAN = { depth: 56, zE: 38, zW: 50 };
function wingLeanTo(Q: Quad[], w: Wing, x0 = w.x0, x1 = w.x1): void {
  leanToX(Q, x0, x1, w.y0, LEAN.depth, LEAN.zE, LEAN.zW, w.seed + 81, 64);
}

/** Le dehors d'un bâtiment : ses ailes, leurs baies, leurs toits ; la galerie ; les appentis (solution 1). */
function shellOutside(Q: Quad[], B: Board[], wings: Wing[], lean: boolean): void {
  for (const w of wings) {
    wingWalls(Q, B, w, 'out');
    wingBays(Q, B, w);
    if (w.gallery) Q.push(...moved(galleryModel(w.x0 - 2, w.x1 + 2, w.gallery), [0, w.y1, 0]));
    wingRoof(Q, w);
    if (lean && w.northDoor) wingLeanTo(Q, w);
  }
}

/** Le dedans : le rez coupé à 70 cm (`level` 0), ou l'étage sur son plancher, l'escalier dans la pénombre (`level` 1). */
function shellInside(Q: Quad[], B: Board[], wings: Wing[], level: 0 | 1, stairs: [number, number][]): void {
  for (const w of wings) {
    if (level === 1) {
      const pp = part('plancher', 1, '&', 'full'), pl = { top: planks(), side: planks() };
      const holes = stairs.filter(([sx, sy]) => sx >= w.x0 && sx < w.x1 && sy >= w.y0 && sy < w.y1);
      if (!holes.length) Q.push(...box(w.x0, w.x1, w.y0, w.y1, H.rez, H.floor, pp, pl));
      else {
        const [sx, sy] = holes[0], [a, b, c, d] = [sx, sx + STAIR.w, sy, sy + STAIR.d];
        Q.push(...box(w.x0, w.x1, w.y0, c, H.rez, H.floor, pp, pl), ...box(w.x0, w.x1, d, w.y1, H.rez, H.floor, pp, pl));
        Q.push(...box(w.x0, a, c, d, H.rez, H.floor, pp, pl), ...box(b, w.x1, c, d, H.rez, H.floor, pp, pl));
        const gp = part('garde-corps', 8, 'K', 'thin'), fw = furnWood(w.seed + 91);
        Q.push(...box(a - 1, a + 1, c, d, H.floor + 17, H.floor + 19, gp, fw), ...box(a - 1, b, d - 1, d + 1, H.floor + 17, H.floor + 19, gp, fw));
        for (let y = c + 2; y < d; y += 6) Q.push(...box(a - 0.5, a + 0.5, y, y + 1, H.floor, H.floor + 17, gp, fw));
        Q.push(...dimmed(moved(stairModel(), [sx, sy, 0])));
      }
      Q.push(...box(w.x0, w.x1, w.y1 - thick(w.mat), w.y1, 0, H.rez, part('vide', 3, 'o', 'none', { cast: false }), () => VOID));
    }
    wingWalls(Q, B, w, level === 0 ? 'in0' : 'in1');
    if (w.stack) {
      const [a, b, c, d] = w.stack;
      Q.push(...box(a, b, Math.max(c, w.y0), d, level ? H.floor : 0, level ? H.floor + 30 : H.rez, part('souche', 4, '~', 'full'), limeMasonry(w.seed + 93, () => [true, true])));
    }
  }
  if (level === 0) for (const [sx, sy] of stairs) Q.push(...moved(stairModel(), [sx, sy, 0]));
}

/** Une cloison de planches (coupée à 70 cm au-dessus de son niveau), le long de x ou de y, ses portes [a0, a1]. */
function partition(Q: Quad[], ew: boolean, a0: number, a1: number, c: number, level: 0 | 1, doors: [number, number][], seed: number): void {
  const z0 = level ? H.floor : 0;
  wallRun(Q, ew, a0, a1, c, c + 2, z0, z0 + 14, doors.map(([d0, d1]) => ({ a0: d0, a1: d1, z0, z1: z0 + 36 })), part('cloison', 3, '&', 'full'),
    { top: () => '%', side: (_s, _t, cx) => plankInner(seed)(cx.p[0] + cx.p[1], cx.p[2], cx) });
}

/** Ce que la planche écrit et montre de chaque bâtiment (coordonnées de la scène posée en (0, 0)). */
export interface PlaceNotes {
  /** Le titre et qui y vit (PLACE_META de place-types.ts date de la section 13). */
  title: string;
  who: string;
  lines: string[];
  /** Ce que montre la solution 2. */
  s2: string[];
  inside: string[];
  xeros: [number, number][];
  inXeros0?: [number, number];
  /** Xéros à l'étage : ses pieds sur le plancher (relevé de 2,85 m par l'outil). */
  inXeros1?: [number, number];
  /** La terre battue (cours, devant de porte), [x0, y0, x1, y1] de la scène. */
  yards: Rect[];
}
/** Une pièce de boutique de la solution 2 : son rectangle au sol (scène) et Xéros debout devant sa porte, sur le rond. */
export interface ShopRoom { name: string; room: Rect; door: [number, number] }

interface Def {
  id: PlaceBuildingId;
  at: [number, number];
  size: [number, number];
  wings: Wing[];
  stairs: [number, number][];
  /** Le dehors propre au bâtiment (cour, palissades, vie) : commun aux deux solutions. */
  yard(Q: Quad[], B: Board[]): void;
  /** Les étals de la solution 1, devant les appentis. */
  stallsS1(Q: Quad[], B: Board[]): void;
  /** Le peu qui est dehors dans la solution 2. */
  stallsS2(Q: Quad[], B: Board[]): void;
  /** Les cloisons et les meubles d'un niveau. */
  furnish(Q: Quad[], B: Board[], level: 0 | 1, frame: number): void;
  shops: ShopRoom[];
  pieces: string[];
}

function outsideOf(d: Def, sol: 1 | 2, frame: number): Built {
  const Q: Quad[] = [], B: Board[] = [];
  shellOutside(Q, B, d.wings, sol === 1);
  d.yard(Q, B);
  (sol === 1 ? d.stallsS1 : d.stallsS2)(Q, B);
  void frame;
  return { quads: Q, boards: B };
}
function insideOf(d: Def, level: 0 | 1, frame: number, sol: 1 | 2 = 1): Built {
  const Q: Quad[] = [], B: Board[] = [];
  shellInside(Q, B, d.wings, level, d.stairs);
  d.furnish(Q, B, level, frame);
  if (level === 0) {
    d.yard(Q, B);
    (sol === 1 ? d.stallsS1 : d.stallsS2)(Q, B);
    // les appentis de la solution 1 gardent leurs poteaux, leur toit effacé
    if (sol === 1) for (const w of d.wings) if (w.northDoor) { const L: Quad[] = []; wingLeanTo(L, w); Q.push(...L.filter((q) => !q.part.roof)); }
    // la galerie : ses poteaux seuls
    for (const w of d.wings) if (w.gallery) Q.push(...moved(galleryModel(w.x0 - 2, w.x1 + 2, w.gallery), [0, w.y1, 0]).filter((q) => q.part.name === 'poteau'));
  }
  return { quads: Q, boards: B };
}
function buildingOf(d: Def, sol: 1 | 2): PlaceBuilding {
  return {
    id: d.id, size: d.size, at: d.at, levels: 2, palette,
    pieces: d.pieces.filter((k) => sol === 1 || k !== 'shop-lean-to'),
    outside: (o, frame = 0) => place(outsideOf(d, sol, frame), [0, 0], o),
    inside: (o, level = 0, frame = 0) => place(insideOf(d, level, frame, sol), [0, 0], o),
  };
}

// =====================================================================================================================
// La tailleuse et le frère du forgeron (quart sud-ouest) : un seul bâtiment de bois à étage, en équerre
// =====================================================================================================================
//
// Zone village : l'aile des vêtements, murs 2720-3040 × 2272-2432 (16 × 8 m), le long de la rue de l'ouest ; l'aile du cuir et des
// armes, murs 3040-3248 × 2320-2704 (10,40 × 19,20 m), le long de la rue du sud. D'un seul tenant (le mur de l'une contre celui de
// l'autre), les deux portes de boutique dans l'angle, sur le rond (au nord). L'aile des vêtements est reculée de 4 m sur la proposition
// (2192) : ses étals (solution 1) tiennent alors sur le bord sud de la rue de l'ouest en lui laissant 3,30 m. La cour au sud-ouest, dans
// l'équerre, fermée de palissades, le portail sur la ruelle des quarts. Scène : son coin en (2688, 2096).

const TA_AT: [number, number] = [2688, 2096];
const TA_W: Wing = {
  x0: 32, x1: 352, y0: 176, y1: 336, axis: 'x', mat: 'clap', cover: 'shingles', pitch: 40, seed: 1501,
  south: [
    { a0: 20, a1: 32, z0: 18, z1: 30, kind: 'window' }, { a0: 66, a1: 84, z0: 0, z1: 36, kind: 'door' },
    { a0: 120, a1: 132, z0: 18, z1: 30, kind: 'window' }, { a0: 184, a1: 196, z0: 18, z1: 30, kind: 'window' },
    { a0: 250, a1: 268, z0: 0, z1: 36, kind: 'door' }, { a0: 290, a1: 302, z0: 18, z1: 30, kind: 'window' },
    { a0: 36, a1: 48, z0: 73, z1: 89, kind: 'window' }, { a0: 104, a1: 116, z0: 73, z1: 89, kind: 'window' },
    { a0: 150, a1: 168, z0: 57, z1: 95, kind: 'door' }, { a0: 204, a1: 216, z0: 73, z1: 89, kind: 'window' },
    { a0: 272, a1: 284, z0: 73, z1: 89, kind: 'window' },
  ],
  northDoor: [266, 284],
  stack: [92, 110, 318, 333],
  gallery: [32, 96, 160, 224, 288, 350],
};
const TA_S: Wing = {
  x0: 352, x1: 560, y0: 224, y1: 608, axis: 'y', mat: 'clap', cover: 'shingles', pitch: 40, seed: 1601,
  south: [
    { a0: 22, a1: 38, z0: 18, z1: 32, kind: 'window' }, { a0: 95, a1: 113, z0: 0, z1: 36, kind: 'door' },
    { a0: 170, a1: 186, z0: 18, z1: 32, kind: 'window' },
    { a0: 36, a1: 48, z0: 73, z1: 89, kind: 'window' }, { a0: 160, a1: 172, z0: 73, z1: 89, kind: 'window' },
  ],
  northDoor: [40, 58],
};

const tailleuse: Def = {
  id: 'p-tailleuse', at: TA_AT, size: [576, 656], wings: [TA_W, TA_S], stairs: [[326, 272], [362, 450]],
  yard(Q, B) {
    // la cour dans l'équerre : la palissade à l'ouest (sur la ruelle) et au sud, le portail sur la ruelle des quarts
    Q.push(...fenceY(338, 654, 2, 1571), ...fenceX(0, 132, 654, 1573), ...fenceX(188, 352, 654, 1575));
    Q.push(...moved(gateModel(false), [132, 650, 0]));
    // le linge qui sèche entre deux fenêtres de l'étage, sous l'égout ; le linge de la cour, sur sa corde entre deux perches
    washingLine(Q, TA_W.x0 + 50, TA_W.x0 + 102, TA_W.y1 + 2, 94, 1581);
    washingLine(Q, TA_W.x0 + 218, TA_W.x0 + 270, TA_W.y1 + 2, 94, 1583);
    for (const x of [40, 150]) Q.push(...box(x - 1, x + 1, 470, 472, 0, 36, part('perche', 5, 'K', 'full'), timber(1585 + x)));
    washingLine(Q, 41, 149, 471, 35, 1587);
    // des pots de fleurs sur la main courante de la galerie
    for (const x of [60, 132, 196, 316]) flowerPot(Q, TA_W.x0 + x - 32, TA_W.y1 + GALLERY.d - 1, GALLERY.floor + GALLERY.rail, x);
    // l'échelle contre le pignon de l'aile du cuir, des tonneaux, la meule, les peaux qui sèchent, le chevalet, des caisses
    ladder(Q, 536, TA_S.y1, 62, 1589);
    B.push(
      prop('barrel', 210, 352), prop('barrel', 222, 354), prop('bench', 40, 352), prop('bucket-water', 300, 356),
      piece('leather-hides', 220, 520), woodPiece('sawhorse', 100, 50, 260, 580), prop('grindstone', 300, 470, 0),
      prop('crate', 312, 600), lift(prop('crate', 312, 600), 13), prop('crate', 326, 602), prop('rope-coil', 296, 612),
      prop('chopping-block', 80, 600), prop('sack', 20, 600), prop('sack', 30, 602), piece('egg-basket', 60, 380),
      prop('barrel', 382, 616), prop('bucket', 460, 618),
    );
  },
  stallsS1(Q, B) {
    // les vêtements et les étoffes, sur le bord sud de la rue de l'ouest (au-delà de 5,35 m du mur : le toit ne les cache pas)
    B.push(
      piece('cloth-table', 36, 50), piece('cloth-table', 106, 50),
      piece('clothes-rack', 46, 34), piece('clothes-rack', 92, 32), piece('clothes-rack', 138, 34),
      piece('clothes-rack', 178, 56), piece('clothes-rack', 222, 58),
      piece('dress-form', 268, 56), piece('dress-form', 282, 59), piece('hat-stand', 298, 54), piece('dress-form', 186, 36),
      boltBoard('red', 316, 60), boltBoard('blue', 318, 58, 2), piece('bread-basket', 330, 62),
    );
    postSign(Q, B, 's3', 330, 70);
    // le cuir, les armures, les armes, l'équipement d'aventure : dans le recoin devant l'aile du cuir, sur le bord du rond
    B.push(
      piece('weapon-rack', 358, 106), piece('shield-stand', 394, 106), piece('armor-form', 436, 104), piece('armor-form-s1', 452, 105),
      piece('saddle-stand', 358, 84), piece('gear-rack', 380, 80), piece('knife-display', 424, 84), prop('rope-coil', 450, 90), prop('lantern', 456, 94),
      prop('barrel', 470, 100), prop('sack', 478, 106),
    );
    postSign(Q, B, 's4', 486, 112);
    // contre le mur est de l'aile du cuir, sur la rue du sud (à l'est d'un bâtiment, rien n'est caché)
    B.push(piece('armor-form', 566, 250), piece('saddle-stand', 566, 270, 1), piece('armor-form-s1', 566, 300), prop('barrel', 566, 320));
  },
  stallsS2(Q, B) {
    B.push(piece('dress-form', 286, 58), prop('bench', 230, 60), piece('armor-form', 420, 104), prop('barrel', 440, 106));
    postSign(Q, B, 's3', 330, 70);
    postSign(Q, B, 's4', 486, 112);
  },
  furnish(Q, B, level, frame) {
    if (level === 0) {
      // l'aile des vêtements : l'atelier de couture à l'ouest, la boutique au nord-est, la réserve et l'escalier au sud-est
      partition(Q, false, 179, 333, 192, 0, [[210, 226]], 1601);
      partition(Q, true, 194, 349, 270, 0, [[286, 302]], 1603);
      Q.push(...hearthNorth(frame, 79, 333, 0));
      B.push(
        furniture(tailorTableQuads(), 90, 230, 28, 14), woodPiece('spinning-wheel', 90, 40, 40, 290), piece('dress-form', 150, 220), prop('stool', 100, 250),
        boltBoard('red', 40, 200), boltBoard('blue', 40, 206), boltBoard('linen', 48, 204), prop('chest', 140, 300), piece('cloth-table', 40, 250, 0),
        // la boutique des vêtements
        piece('clothes-rack', 198, 182), piece('clothes-rack', 240, 182), piece('dress-form', 200, 228), piece('hat-stand', 334, 186),
        piece('cloth-table', 210, 246), piece('shop-counter', 286, 228, 1), piece('dress-form', 318, 240),
        // la réserve
        prop('chest', 200, 280), prop('chest', 200, 300), prop('crate', 240, 300), prop('crate', 254, 304), boltBoard('red', 280, 300), boltBoard('blue', 288, 306),
      );
      // l'aile du cuir : la boutique au nord, l'atelier, la réserve et l'escalier au sud
      partition(Q, true, 355, 557, 352, 0, [[450, 466]], 1611);
      partition(Q, true, 355, 557, 480, 0, [[450, 466]], 1613);
      B.push(
        piece('gear-rack', 420, 228), piece('weapon-rack', 470, 228), piece('shield-stand', 548, 250, 1), piece('armor-form', 360, 280), piece('armor-form-s1', 378, 282),
        piece('saddle-stand', 410, 290), piece('knife-display', 450, 296), piece('shop-counter', 500, 300, 1), piece('gear-rack', 360, 340 - 8),
        prop('lantern', 506, 304, 0, 19), prop('rope-coil', 440, 330), prop('rope-coil', 446, 336),
        piece('saddler-bench', 370, 372), piece('leather-hides', 440, 362), prop('grindstone', 520, 384, 1), prop('barrel', 520, 440), prop('stool', 386, 392), prop('chest', 470, 440),
        prop('sack', 400, 500), prop('sack', 412, 502), prop('barrel', 520, 500), prop('barrel', 520, 514), prop('crate', 420, 560), prop('crate', 434, 562),
      );
      return;
    }
    const up = (b: Board) => lift(b, H.floor);
    partition(Q, false, 179, 333, 192, 1, [[290, 306]], 1621);
    partition(Q, true, 355, 557, 400, 1, [[450, 466]], 1623);
    Q.push(...hearthNorth(frame, 79, 333, H.floor));
    B.push(...[
      // la cuisine et la salle (l'aile des vêtements, à l'ouest)
      prop('table', 70, 240), prop('bench', 71, 260), prop('barrel', 40, 200), prop('jar', 40, 216), prop('bucket-water', 130, 200), stonePiece('chair', 100, 228),
      // leur chambre (à l'est de la cloison)
      prop('bed', 260, 190), prop('chest', 220, 190), prop('stool', 236, 260),
      // la chambre de l'apprentie et la réserve d'étoffes et de cuirs (l'aile du cuir)
      prop('bed', 500, 240), prop('chest', 470, 240), prop('chest', 370, 420), prop('chest', 370, 440), prop('crate', 420, 420), piece('leather-hides', 470, 420),
    ].map(up), ...[[380, 480, 'red'], [390, 480, 'blue'], [400, 482, 'linen']].map(([x, y, k]) => boltBoard(k as 'red', x as number, y as number, H.floor)));
  },
  shops: [
    { name: 'la boutique des vêtements', room: [195, 179, 349, 270], door: [307, 168] },
    { name: 'la boutique du cuir et des armes', room: [355, 227, 557, 352], door: [401, 216] },
  ],
  pieces: [
    'shop-lean-to', 'clapboard-wall', 'timber-gallery', 'yard-fence', 'cloth-table', 'clothes-rack', 'dress-form', 'hat-stand', 'gear-rack', 'knife-display',
    'armor-form', 'armor-form-s1', 'shield-stand', 'weapon-rack', 'saddle-stand', 'saddler-bench', 'leather-hides', 'shop-counter', 'hanging-sign-s3', 'hanging-sign-s4',
  ],
};

// =====================================================================================================================
// La mercière (huitième sud-est, le long de la rue de l'est) : rez de pierre enduite, étage de pan de bois chaulé, tuiles plates
// =====================================================================================================================
//
// Zone village : murs 3536-3872 × 2240-2400 (16,80 × 8 m), reculés de 2,40 m sur la proposition (2192) pour que l'étal long tienne sur le
// bord sud de la rue de l'est (2116-2130) en laissant 2,60 m de passage devant le bûcheron et la boutique abandonnée. La porte de la
// boutique au nord, à l'ouest, sur le rond. Sa cour au sud (3576-3936 × 2400-2560), où sèche le linge. Scène : coin en (3520, 2080).

const ME_AT: [number, number] = [3520, 2080];
const ME_W: Wing = {
  x0: 16, x1: 352, y0: 160, y1: 320, axis: 'x', mat: 'merc', cover: 'tiles', pitch: 45, seed: 1301,
  south: [
    { a0: 40, a1: 60, z0: 16, z1: 36, kind: 'leaded' }, { a0: 150, a1: 168, z0: 0, z1: 36, kind: 'door' },
    { a0: 236, a1: 256, z0: 16, z1: 36, kind: 'leaded' },
  ],
  up: ['cross', 'window', 'plain', 'window', 'window', 'cross'],
  northDoor: [30, 48],
  stack: [270, 286, 156, 168],
};
const merciere: Def = {
  id: 'p-merciere', at: ME_AT, size: [416, 480], wings: [ME_W], stairs: [[316, 220]],
  yard(Q, B) {
    Q.push(...fenceY(322, 478, 58, 1351), ...fenceX(58, 416, 478, 1353));
    // le linge entre deux fenêtres de l'étage (la 2e et la 4e travée), sous l'égout
    washingLine(Q, ME_W.x0 + 70, ME_W.x0 + 210, ME_W.y1 + 2, 95, 1355);
    ladder(Q, 326, ME_W.y1, 50, 1357);
    B.push(prop('bench', 200, 336), prop('bucket-water', 120, 338), piece('vegetable-basket', 140, 340), prop('barrel', 340, 330), prop('barrel', 352, 334),
      prop('crate', 260, 400), prop('chopping-block', 300, 420), prop('sack', 90, 440));
  },
  stallsS1(Q, B) {
    // l'étal long sur le bord sud de la rue de l'est, au-delà de la bande cachée (5,35 m du mur) ; le présentoir à rubans, les paniers
    B.push(
      piece('haberdashery-stall', 36, 36), piece('haberdashery-stall', 104, 36), piece('ribbon-rack', 174, 40),
      piece('vegetable-basket', 22, 42), prop('crate', 198, 42), lift(prop('crate', 198, 42), 13), piece('bread-basket', 210, 44), prop('sack', 222, 42),
    );
    postSign(Q, B, 's2', 8, 50);
  },
  stallsS2(Q, B) {
    B.push(prop('bench', 60, 40), piece('vegetable-basket', 80, 44));
    postSign(Q, B, 's2', 8, 50);
  },
  furnish(Q, B, level, frame) {
    if (level === 0) {
      // la boutique à l'ouest (la porte au nord), la cuisine et l'escalier à l'est
      partition(Q, false, 168, 312, 200, 0, [[280, 296]], 1361);
      partition(Q, true, 24, 200, 240, 0, [[150, 166]], 1363);
      Q.push(...hearth(frame, 250, 168));
      B.push(
        piece('haberdashery-cabinet', 24, 196, 1), piece('haberdashery-cabinet', 90, 168), piece('shop-counter', 64, 222), stonePiece('chair', 84, 212),
        piece('ribbon-rack', 150, 172), piece('ribbon-rack', 176, 200, 1), prop('lantern', 70, 226, 0, 19),
        piece('haberdashery-stall', 40, 290), boltBoard('blue', 30, 260), boltBoard('red', 40, 266), prop('chest', 140, 260),
        prop('table', 240, 230), prop('bench', 241, 250), prop('barrel', 210, 180), prop('jar', 210, 200), prop('sack', 220, 290), prop('chest', 280, 290), prop('bucket-water', 300, 180),
      );
      return;
    }
    const up = (b: Board) => lift(b, H.floor);
    partition(Q, false, 163, 317, 180, 1, [[240, 256]], 1371);
    B.push(...[
      prop('table', 220, 220), stonePiece('chair', 230, 208), prop('chest', 200, 170), prop('stool', 260, 260),
      prop('bed', 30, 180), prop('chest', 60, 260), prop('bed', 120, 250), prop('chest', 140, 180), stonePiece('chair', 100, 200),
    ].map(up));
  },
  shops: [{ name: 'la boutique de la mercière', room: [24, 168, 200, 240], door: [55, 152] }],
  pieces: ['shop-lean-to', 'haberdashery-stall', 'shop-counter', 'haberdashery-cabinet', 'ribbon-rack', 'yard-fence', 'hanging-sign-s2'],
};

// =====================================================================================================================
// La ferme rivale (huitième sud-est, le long de la rue du sud) : rez de moellons, étage de pan de bois, laves ; croupe au nord
// =====================================================================================================================
//
// Zone village : murs 3376-3568 × 2408-2672 (9,60 × 13,20 m) : à 40 cm de la mercière (presque collés). Sa fille aînée et son mari
// tiennent la boutique et logent à l'étage. Le grand étal (deux fois plus long : quatre travées de 3,20 m) en équerre dans le recoin
// sud-est du rond : deux travées est-ouest sur le bord du rond (3376-3504 × 2284-2298), deux nord-sud contre le pignon de la mercière
// (3506-3520 × 2154-2282). Scène : coin en (3360, 2140).

const FR_AT: [number, number] = [3360, 2140];
const FR_W: Wing = {
  x0: 16, x1: 208, y0: 268, y1: 532, axis: 'y', mat: 'rival', cover: 'laves', pitch: 40, seed: 1701,
  south: [
    { a0: 22, a1: 36, z0: 16, z1: 30, kind: 'window' }, { a0: 88, a1: 106, z0: 0, z1: 36, kind: 'door' },
    { a0: 156, a1: 170, z0: 16, z1: 30, kind: 'window' },
  ],
  up: ['window', 'plain', 'cross', 'window'],
  northDoor: [88, 106],
  stack: [150, 166, 380, 396],
};
const fermeRivale: Def = {
  id: 'p-ferme-rivale', at: FR_AT, size: [224, 612], wings: [FR_W], stairs: [[180, 440]],
  yard(Q, B) {
    Q.push(...fenceX(16, 208, 610, 1751));
    ladder(Q, 186, FR_W.y1, 48, 1753);
    B.push(prop('hay-bale', 30, 560), prop('hay-bale', 52, 562), prop('bucket-water', 120, 548), piece('vegetable-crate', 140, 556), piece('vegetable-crate-s1', 152, 558),
      lift(piece('vegetable-crate', 140, 556), 8), prop('barrel', 180, 552), prop('chopping-block', 90, 580));
    // contre le flanc ouest, sur la rue du sud (rien n'est caché à l'ouest d'un bâtiment) : des cageots empilés, des sacs, un tas de citrouilles
    B.push(piece('vegetable-crate', 0, 300), lift(piece('vegetable-crate', 0, 300), 8), piece('vegetable-crate-s3', 0, 310), piece('pumpkin-pile', -10, 330, 1), prop('sack', 1, 360), prop('sack', 1, 372));
  },
  stallsS1(_Q, B) {
    B.push(
      // les deux travées est-ouest sur le bord du rond, les deux nord-sud contre le pignon de la mercière
      piece('rough-stall', 16, 144), piece('rough-stall-s2', 80, 144),
      piece('rough-stall-s1', 146, 14, 1), piece('rough-stall-s3', 146, 78, 1),
      piece('scale', 66, 145, 0, 16), piece('price-slate', 4, 150), piece('price-slate', 150, 4),
      // à terre devant (au nord, vers la place) : cageots, paniers, citrouilles
      piece('vegetable-crate', 18, 132), piece('vegetable-crate-s2', 30, 133), piece('vegetable-crate-s3', 42, 132), piece('egg-basket', 56, 133),
      piece('vegetable-crate-s1', 84, 132), piece('bread-basket', 98, 133), piece('apple-basket', 108, 132), piece('vegetable-basket', 118, 133),
      piece('pumpkin-pile', 120, 100), piece('vegetable-crate', 130, 20), lift(piece('vegetable-crate', 130, 20), 8), piece('apple-basket', 134, 34),
      piece('vegetable-crate-s2', 132, 52), piece('vegetable-crate-s1', 132, 64), piece('egg-basket', 136, 78), piece('vegetable-basket', 136, 88),
      // derrière l'étal, dans la bande cachée : les sacs de pommes de terre, des cageots vides
      prop('sack', 20, 170), prop('sack', 32, 172), prop('crate', 100, 170),
    );
  },
  stallsS2(_Q, B) {
    B.push(piece('rough-stall', 16, 144), piece('vegetable-crate', 18, 132), piece('vegetable-basket', 34, 133), piece('pumpkin-pile', 120, 100));
  },
  furnish(Q, B, level, _frame) {
    if (level === 0) {
      partition(Q, true, 24, 200, 380, 0, [[100, 116]], 1761);
      B.push(
        // la boutique : deux étals le long des murs, le comptoir et la balance, les cageots et les paniers à terre
        piece('rough-stall', 24, 290, 1), piece('rough-stall-s2', 182, 290, 1), piece('shop-counter', 70, 350), piece('scale', 80, 352, 0, 19),
        piece('vegetable-crate', 50, 290), piece('vegetable-crate-s2', 62, 290), piece('egg-basket', 140, 292), piece('bread-basket', 150, 300), piece('apple-basket', 130, 310),
        piece('pumpkin-pile', 60, 320), piece('vegetable-crate-s1', 140, 330), piece('price-slate', 112, 292),
        // la réserve
        prop('sack', 30, 400), prop('sack', 42, 402), prop('sack', 30, 414), prop('barrel', 60, 400), prop('barrel', 74, 402), prop('crate', 100, 420), lift(prop('crate', 100, 420), 13),
        prop('crate', 114, 422), prop('table', 60, 470), prop('stool', 80, 490), prop('hay-bale', 30, 500),
      );
      return;
    }
    const up = (b: Board) => lift(b, H.floor);
    partition(Q, true, 24, 200, 400, 1, [[100, 116]], 1771);
    Q.push(...hearth(0, 140, 384, H.floor));
    B.push(...[
      prop('bed', 30, 290), prop('chest', 70, 290), prop('chest', 140, 300), stonePiece('chair', 120, 340),
      prop('table', 60, 450), prop('bench', 61, 470), prop('barrel', 30, 420), prop('jar', 30, 440), prop('bucket-water', 120, 420),
    ].map(up));
  },
  shops: [{ name: 'la boutique de la ferme', room: [24, 276, 200, 380], door: [113, 260] }],
  pieces: ['shop-lean-to', 'rough-stall', 'rough-stall-s1', 'rough-stall-s2', 'rough-stall-s3', 'vegetable-crate', 'vegetable-crate-s1', 'vegetable-crate-s2', 'vegetable-crate-s3',
    'vegetable-basket', 'egg-basket', 'bread-basket', 'apple-basket', 'pumpkin-pile', 'scale', 'price-slate', 'shop-counter', 'yard-fence'],
};

// =====================================================================================================================
// Les exports
// =====================================================================================================================

const DEFS: Def[] = [fermeRivale, merciere, tailleuse];
/** Solution 1 (recommandée par le cadrage) : l'appentis bas, les étals à ciel ouvert devant lui. */
export const BUILDINGS: PlaceBuilding[] = DEFS.map((d) => buildingOf(d, 1));
/** Solution 2 : la façade sur le rond sans appentis, la boutique meublée dedans, peu de choses dehors. */
export const BUILDINGS_S2: PlaceBuilding[] = DEFS.map((d) => buildingOf(d, 2));
/** Les pièces de boutique de la solution 2 (coordonnées de la scène) et la place de Xéros devant leur porte. */
export const S2_SHOPS: Partial<Record<PlaceBuildingId, ShopRoom[]>> = Object.fromEntries(DEFS.map((d) => [d.id, d.shops]));

/**
 * Ce que voit le joueur devant la porte d'une boutique (solution 2) : `full`, le dehors (toit posé) ; `bare`, la même vue sans toit ni
 * étage, les murs coupés à 70 cm, la boutique meublée ; `holes`, les trous à l'écran (px de la scène posée en `o`), ceux de
 * `windowHole` (src/world/roofView.ts) : la largeur de la pièce, de 3 m au-dessus de son mur nord à son mur sud et l'avant-toit.
 */
export function s2Reveal(id: PlaceBuildingId, o: [number, number], frame = 0): { full: Scene; bare: Scene; holes: Rect[] } {
  const d = DEFS.find((x) => x.id === id)!;
  const full = place(outsideOf(d, 2, frame), [0, 0], o);
  const bare = place(insideOf(d, 0, frame, 2), [0, 0], o);
  const holes = d.shops.map((s) => [s.room[0] + o[0] - 3, s.room[1] + o[1] - 60, s.room[2] + o[0] + 3, s.room[3] + o[1] + 6] as Rect);
  return { full, bare, holes };
}
/** Le fondu du jeu dans les trous : le toit et le mur nord de la pièce à `alpha` (ROOF.alpha : 0,35) sur la vue nue. */
export function fadeHoles(full: Layer, bare: Layer, holes: Rect[], alpha = 0.35): Layer {
  const rgba = full.rgba.slice();
  for (const [x0, y0, x1, y1] of holes) {
    for (let Y = Math.max(0, y0 - full.y); Y < Math.min(full.h, y1 - full.y); Y++) for (let X = Math.max(0, x0 - full.x); X < Math.min(full.w, x1 - full.x); X++) {
      const i = (Y * full.w + X) * 4, bx = X + full.x - bare.x, by = Y + full.y - bare.y;
      if (bx < 0 || by < 0 || bx >= bare.w || by >= bare.h) continue;
      const j = (by * bare.w + bx) * 4;
      for (let k = 0; k < 3; k++) rgba[i + k] = full.rgba[i + k] * alpha + bare.rgba[j + k] * (1 - alpha);
    }
  }
  return { ...full, rgba };
}

/**
 * La terre battue de la place entre le rond (rayon 200 px) et les façades des quarts sud, et les rues qui y mènent (px de la zone) :
 * le rond lui-même et les cours de chaque bâtiment s'y ajoutent.
 */
export const PLACE_SUD_DIRT: Rect[] = [
  [2688, 2064, 3160, 2272], [3040, 2176, 3264, 2330], [3264, 2176, 3360, 2752],
  [3360, 2064, 3936, 2240], [3360, 2176, 3536, 2408], [2624, 2752, 4000, 2816],
];
export const PLACE_RADIUS = 200;
/** Les murs de chaque bâtiment (scène) : le plancher de la vue nue. */
export const FOOTPRINTS: Partial<Record<PlaceBuildingId, Rect[]>> = Object.fromEntries(DEFS.map((d) => [d.id, d.wings.map((w) => [w.x0, w.y0, w.x1, w.y1] as Rect)]));

const sh = (r: Rect, [dx, dy]: [number, number]): Rect => [r[0] + dx, r[1] + dy, r[2] + dx, r[3] + dy];
void sh; void bar;
export const NOTES: Partial<Record<PlaceBuildingId, PlaceNotes>> = {
  'p-ferme-rivale': {
    title: 'La boutique de la ferme rivale',
    who: 'Sa fille aînée et son mari tiennent la boutique et logent à l’étage',
    lines: [
      'Rez de moellons, étage de pan de bois chaulé, laves ; le faîtage nord-sud et la croupe au nord (un pignon de 9,40 m face au rond cacherait tout le recoin). Le pignon sud sur la cour : la porte de la réserve, la lucarne du grenier, une échelle.',
      'Solution 1 : l’appentis contre la façade nord (caché sous l’égout) ; le grand étal en équerre, quatre travées : légumes, pain et œufs sur le bord du rond, fruits et oignons contre le pignon de la mercière ; cageots, paniers, citrouilles à terre devant ; la balance, deux ardoises.',
    ],
    s2: ['Solution 2 : une travée dehors ; dedans, deux étals le long des murs, le comptoir et la balance, les cageots et les paniers.'],
    inside: ['Au rez : la boutique au nord (sa porte sur le rond), la réserve au sud (sacs, tonneaux, cageots). À l’étage : la chambre de la fille aînée et de son mari, la salle et l’âtre.'],
    xeros: [[100, 124], [60, 590]],
    inXeros0: [110, 370],
    inXeros1: [100, 380],
    yards: [[16, 532, 208, 612], [0, 268, 16, 532]],
  },
  'p-merciere': {
    title: 'La mercière',
    who: 'La mercière, sœur du coq, veuve, et sa fille, à l’étage',
    lines: [
      'Rez de moellons enduits (les pierres d’angle et de baie du coq), deux fenêtres vitrées fleuries et la porte de la cour au sud ; étage de pan de bois chaulé, deux croix de Saint-André, trois fenêtres à volet ; tuiles plates à 45° ; le linge entre deux fenêtres de l’étage.',
      'Solution 1 : l’appentis contre la façade nord (caché sous l’égout) ; l’étal long (deux travées) sur le bord de la rue de l’est, le présentoir à rubans, les paniers du vannier ; l’enseigne à l’aiguille sur son poteau.',
    ],
    s2: ['Solution 2 : dedans, les deux casiers à tiroirs, le comptoir, le présentoir à rubans, un étal ; dehors, un banc.'],
    inside: ['Au rez : la boutique à l’ouest (sa porte sur le rond), la cuisine et l’escalier à l’est. À l’étage : la chambre de la mercière et celle de sa fille, la salle.'],
    xeros: [[250, 60], [180, 380]],
    inXeros0: [120, 300],
    inXeros1: [200, 300],
    yards: [[58, 320, 416, 480]],
  },
  'p-tailleuse': {
    title: 'La tailleuse et le frère du forgeron',
    who: 'La tailleuse (les vêtements, les étoffes) et son mari (le cuir, les armes, l’équipement d’aventure), à l’étage des deux ailes',
    lines: [
      'Un seul bâtiment de bois à étage, en équerre : l’aile des vêtements (16 x 8 m) le long de la rue de l’ouest, l’aile du cuir et des armes (10,40 x 19,20 m, faîtage nord-sud, croupe au nord) le long de la rue du sud ; bardage à clins, bardeaux, bois patiné ; la galerie au sud sur la cour, le linge entre deux fenêtres.',
      'Solution 1 : les appentis contre les façades nord (cachés sous l’égout) ; devant, les vêtements et les étoffes sur le bord de la rue de l’ouest (deux longues tables, cinq perches, trois mannequins, le portemanteau) ; le cuir et les armes dans le recoin (râteliers, boucliers, gambison et cotte de cuir, selle, couteaux) ; boucliers et lances contre le mur est, sur la rue du sud.',
    ],
    s2: ['Solution 2 : dedans, les deux boutiques meublées (perches, mannequins, table des étoffes ; râteliers, boucliers, armures, selle, présentoir) ; dehors, un mannequin, un banc, les deux enseignes.'],
    inside: ['Au rez : l’atelier de couture (l’âtre des fers, la table, le rouet), la boutique des vêtements et sa réserve ; la boutique du cuir et des armes, l’atelier du cuir, la réserve. À l’étage : la cuisine et la salle, leur chambre, la chambre de l’apprentie, la réserve d’étoffes et de cuirs.'],
    xeros: [[250, 30], [500, 70], [100, 420]],
    inXeros0: [250, 260],
    inXeros1: [150, 300],
    yards: [[0, 336, 352, 656]],
  },
};

export type { PlaceBuildingId, Scene };
