// PROPOSITION (hors jeu, jamais chargée par le jeu) : les bâtiments des quarts sud de la place du village (CADRAGE-village.md, section
// 13 : 13.5 le dépôt et l'étal de la ferme rivale, 13.6 la mercière, 13.7 la tailleuse et le frère du forgeron). Planches de contrôle :
// npx tsx tools/essai-place-sud.ts (.art-preview/place-sud-dehors.png, place-sud-dedans.png, place-sud-pieces.png).
//
// La règle qui commande (13.1) : le jeu ne montre que les faces sud, et un bâtiment haut cache le sol juste au nord de lui. Les trois
// bâtiments ouvrent donc au sud, sur leur cour (la mercière, la tailleuse) ou sur la ruelle des quarts (le dépôt) ; l'étal de la ferme
// rivale est à la pointe du huitième, sur le bord de la place, à 5,60 m au nord du dépôt (son toit ne le cache pas : voir NOTES).
//
// Le modèle est celui des maisons du village, validé par Grégoire : le dépôt est une maison de bois (art/proposals/village-maisons-bois-lib.ts,
// `frameScene` : le pan de bois de la maison de Xéros, torchis chaulé, chaume) ; la mercière reprend la maison de pierre à étage du
// meunier (enduit, pierres d'angle et de baie du coq, vitraux) avec un étage de pan de bois chaulé (les croix de Saint-André du vannier)
// et les tuiles plates du forgeron ; la tailleuse est neuve : ossature de bois, bardage à clins, bardeaux, la galerie. Les aides copiées
// sont dans place-sud-lib.ts, les pièces nouvelles dans place-sud-pieces.ts.
//
// Repère de chaque bâtiment : px du jeu (5 cm), x vers l'est, y vers le sud, z vers le haut ; les murs sont décrits dans leur repère
// (l'origine au coin nord-ouest des murs), puis décalés de `AT` dans l'emprise ; l'emprise (`size`) a son coin nord-ouest en `at` dans
// la zone village (px), d'après les emprises de art/proposals/village-plan-data.ts.

import {
  box, daub, doorTex, part, timber, voidTex, type Board, type Part, type Quad, type Scene, type Tex,
} from '../lib/volumes';
import type { PlaceBuilding, PlaceBuildingId } from './place-types';
import type { Rect } from './village-plan-data';
import {
  VOID, boards, dimmed, flagstones, furnWood, leaded, limeMasonry, limePlaster, palette, planks, rendered, rubble, rubbleSection, withBays,
  type StoneBay,
} from './village-maisons-pierre-matieres';
import { STAIR, pieceGrid as stonePieceGrid, pieceModel as stonePieceModel, stairModel } from './village-maisons-pierre-pieces';
import { crossTex, frameScene, moveScene, type HouseSpec } from './village-maisons-bois-lib';
import {
  bracketQuads, clapboard, darkBay, doorPlane, gableRoof, hearth, lift, moveBoard, moved, onFace, openShutter, place, placeImg, prop,
  quad, ridgeZ, shell, sill, stack, threshold, turned, wallRun, type Built, type Hole, type RoofSpec,
} from './place-sud-lib';
import {
  AWNING, GALLERY, PIECES as PIECE_LIST, awningModel, clothBoltQuads, fenceModel, furnitureGrid, galleryModel, gateModel, pieceGrid, pieceModel,
  tailorTableQuads,
} from './place-sud-pieces';
import { pieceGrid as woodPieceGrid } from './village-maisons-bois-pieces';
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
const boltBoard = (kind: 'red' | 'blue' | 'linen', x: number, y: number, z = 0) => furniture(clothBoltQuads(kind), x, y, 8, 6, z);
/** Le poteau planté qui porte une enseigne (son pied en (x, y), 2,60 m). */
const signPost = (x: number, y: number) => moved(bracketQuads(52, 0).filter((q) => ['dé', 'poteau'].includes(q.part.name)), [x, y, 0]);
/**
 * L'enseigne `hanging-sign` (dessinée par l'autre module, art/proposals/place-nord-pieces.ts : la potence de fer, le panneau peint, un
 * motif par métier) fixée par sa platine à une face tournée vers l'est (R0, le bras vers l'est, depuis x) ou vers l'ouest (R2, le bras
 * vers l'ouest, jusqu'à x) ; son bras à `armZ` px du sol, son panneau dans le plan est-ouest à y.
 */
function sign(motif: 's2' | 's3' | 's4', x: number, y: number, armZ: number, west = false): Board {
  const im = hangingSign(motif, west ? 2 : 0);
  const [x0, x1] = west ? [x - 20, x] : [x, x + 20];
  return placeImg(im, x0, x1, y, armZ - 16, y);
}
/** Une palissade le long de x (de x0 à x1, sur y) ou le long de y (de y0 à y1, sur x). */
const fenceX = (x0: number, x1: number, y: number, seed: number) => moved(fenceModel(x1 - x0, seed), [x0, y - 2, 0]);
const fenceY = (y0: number, y1: number, x: number, seed: number) => moved(turned(fenceModel(y1 - y0, seed), 1, y1 - y0, 3.5), [x - 2, y0, 0]);

/** Le bois d'une cloison ou d'un mur de planches vu du dedans. */
const plankInner = (seed: number): Tex => boards(seed, 5, [2]);
const W_ = (seed: number) => furnWood(seed);

/** Ce que la planche écrit et montre de chaque bâtiment (coordonnées de la scène posée en (0, 0)). */
export interface PlaceNotes {
  lines: string[];
  inside: string[];
  xeros: [number, number][];
  inXeros0?: [number, number];
  /** Xéros à l'étage : ses pieds sur le plancher (relevé de 2,85 m par l'outil). */
  inXeros1?: [number, number];
  /** La terre battue (cours, devant de porte), [x0, y0, x1, y1] de la scène. */
  yards: Rect[];
}

// =====================================================================================================================
// 13.5 La ferme rivale : l'étal de légumes à la pointe, le dépôt au large du huitième
// =====================================================================================================================
//
// Emprises du plan (zone village) : l'étal 3392-3520 × 2400-2448 (6,40 × 2,40 m), le dépôt 3392-3552 × 2560-2688 (8 × 6,40 m). La scène
// a son coin en (3376, 2380) ; l'étal y est en x 16-144, y 20-68, les murs du dépôt en x 16-176, y 180-308. Le toit du dépôt (chaume à
// 50°, faîte à 6,40 m) monte à l'écran jusqu'à y 103 de la scène : l'étal (son bas en y 68, son auvent jusqu'à y 23) reste dégagé.

const FR_AT: [number, number] = [3376, 2380];
const ST = { x: 16, y: 20 }; // le coin nord-ouest de l'étal
const DEP = { x: 16, y: 180 }; // l'axe du poteau nord-ouest du dépôt
const steps = (n: number, k = 32) => Array.from({ length: n + 1 }, (_, i) => i * k);
const DEPOT: HouseSpec = {
  L: 160, D: 128, T: 48, sill: 16, doorW: 18, innerDoorW: 16, age: 'worn', fill: 'lime',
  walls: [
    { side: 'S', ew: true, c: 128, posts: steps(5), out: 1, bays: ['window', 'plain', 'door', 'plain', 'window'] },
    { side: 'N', ew: true, c: 0, posts: steps(5), out: -1, bays: ['plain', 'plain', 'plain', 'plain', 'plain'] },
    { side: 'W', ew: false, c: 0, posts: steps(4), out: -1, bays: ['plain', 'plain', 'plain', 'plain'], ends: [true, true] },
    { side: 'E', ew: false, c: 160, posts: steps(4), out: 1, bays: ['plain', 'window', 'plain', 'plain'], ends: [true, true] },
  ],
  roof: { cover: 'thatch', pitch: 50, gables: ['lime', 'lime'] },
};

/** L'étal : l'auvent, deux travées garnies, les cageots et les paniers à terre devant (au nord, vers la place), la balance, l'ardoise. */
function stallScene(roof: boolean): Built {
  const Q: Quad[] = [], B: Board[] = [];
  const aw = moved(awningModel(), [ST.x, ST.y, 0]);
  Q.push(...(roof ? aw : aw.filter((q) => !q.part.roof)));
  B.push(piece('rough-stall', ST.x, ST.y + 20), piece('rough-stall-s1', ST.x + 64, ST.y + 20));
  B.push(piece('scale', ST.x + 117, ST.y + 23, 0, 16));
  B.push(piece('price-slate', ST.x + 4, ST.y + 6));
  // à terre devant l'étal (au nord, vers la place) : les cageots du vannier, les paniers
  for (const [x, k] of [[16, 0], [27, 2], [40, 1], [74, 0], [96, 2], [107, 1]] as const) B.push(piece(k ? `vegetable-crate-s${k}` : 'vegetable-crate', ST.x + x, ST.y + 9));
  for (const x of [56, 86, 120]) B.push(piece('vegetable-basket', ST.x + x, ST.y + 8));
  // derrière, du côté des filles : des cageots vides empilés, un sac de pommes de terre, un panier
  B.push(prop('crate', ST.x + 2, ST.y + 37), lift(prop('crate', ST.x + 2, ST.y + 37), 13), prop('sack', ST.x + 118, ST.y + 37), piece('vegetable-basket', ST.x + 108, ST.y + 39));
  return { quads: Q, boards: B };
}

/** Le dépôt : la maison de bois (le kit de Xéros), dedans les cageots, les paniers, les sacs, les tonneaux. */
function depotScene(cut: boolean, frame: number): Built {
  const sc = moveScene(frameScene(DEPOT, { cut, roof: !cut, rot: 0 }), DEP.x, DEP.y);
  const B = [...sc.boards];
  if (!cut) B.push(piece('vegetable-crate-s2', DEP.x + 52, DEP.y + 134), piece('vegetable-basket', DEP.x + 102, DEP.y + 136));
  if (cut) {
    const at = (b: Board) => moveBoard(b, DEP.x, DEP.y);
    B.push(...[
      prop('crate', 8, 8), lift(prop('crate', 8, 8), 13), prop('crate', 22, 8), prop('crate', 36, 8), lift(prop('crate', 36, 8), 13),
      piece('vegetable-crate', 52, 10), piece('vegetable-crate-s1', 64, 10), piece('vegetable-crate-s2', 76, 10),
      prop('sack', 100, 8), prop('sack', 111, 9), prop('sack', 122, 8), prop('sack', 105, 20), prop('sack', 117, 21),
      prop('barrel', 140, 8), prop('barrel', 140, 22),
      piece('vegetable-basket', 10, 40), piece('vegetable-basket', 20, 42), piece('vegetable-basket', 12, 52),
      prop('table', 46, 52), piece('scale', 52, 58, 0, 16), prop('stool', 70, 74), prop('bucket-water', 140, 100),
      lift(piece('vegetable-crate', 8, 100), 0), piece('vegetable-crate', 20, 100), piece('vegetable-crate-s1', 8, 108),
    ].map(at));
  }
  void frame;
  return { quads: sc.quads, boards: B, floor: sc.floor };
}

function fermeRivale(cut: boolean, frame: number): Built {
  const a = stallScene(!cut), b = depotScene(cut, frame);
  return { quads: [...a.quads, ...b.quads], boards: [...a.boards, ...b.boards], floor: b.floor };
}

const fermeRivaleBuilding: PlaceBuilding = {
  id: 'p-ferme-rivale', size: [200, 336], at: FR_AT, levels: 1, palette,
  pieces: ['rough-stall', 'rough-stall-s1', 'plank-awning-poles', 'vegetable-crate', 'vegetable-crate-s1', 'vegetable-crate-s2', 'vegetable-basket', 'scale', 'price-slate'],
  outside: (o, frame = 0) => place(fermeRivale(false, frame), [0, 0], o),
  inside: (o, _level = 0, frame = 0) => place(fermeRivale(true, frame), [0, 0], o),
};

// =====================================================================================================================
// 13.6 La mercière : rez de pierre enduite, étage de pan de bois chaulé, tuiles plates ; la boutique au sud sur sa cour
// =====================================================================================================================
//
// Murs (px, repère des murs) : x 0-192 (9,60 m), y 0-160 (8 m) ; le rez de moellons enduits, 50 cm d'épais, jusqu'à 52 (2,60 m), les
// solives et le plancher à 57 (2,85 m), l'étage de pan de bois jusqu'à 105 (5,25 m), tuiles plates à 45°, faîte à 9,35 m. Le plan met
// les murs en (3712, 2208) de la zone ; la scène a son coin 8 px à l'ouest et 12 au nord (le débord du toit). La cour (3792-3936 ×
// 2368-2600) : x 80-224, y 160-392 du repère des murs.

const ME = { W: 192, D: 160, t: 10, rez: 52, floor: 57, top: 105, pitch: 45, AT: [8, 12] as [number, number] };
const ME_AT: [number, number] = [3712 - 8, 2208 - 12];
const ME_ROOF: RoofSpec = { axis: 'x', a0: 0, a1: ME.W, b0: 0, b1: ME.D, z: ME.top, pitch: ME.pitch, eave: 6, gable: [4, 4], thick: 2, cover: 'tiles', seed: 1301, holes: [[40, 56, -1, 11]] };
/** Les baies du rez au sud : deux fenêtres vitrées (la boutique), la porte de la boutique ; au nord, sur la rue : une fenêtre, l'ouvroir. */
const ME_S: (Hole & { kind: 'leaded' | 'door' })[] = [
  { a0: 22, a1: 42, z0: 16, z1: 36, kind: 'leaded' },
  { a0: 96, a1: 114, z0: 0, z1: 36, kind: 'door' },
  { a0: 150, a1: 170, z0: 16, z1: 36, kind: 'leaded' },
];
const ME_N: Hole[] = [{ a0: 30, a1: 42, z0: 16, z1: 24 }, { a0: 116, a1: 148, z0: 18, z1: 34 }];
const ME_STAIR = { x: 164, y: 14 };
const meSouthTex = () => withBays(rendered(1311, ME.W, ['left', 'right']), ME_S.map((h, i) => ({ s0: h.a0, s1: h.a1, t0: h.z0, t1: h.z1, seed: i }) as StoneBay));

type UpBay = 'plain' | 'cross' | 'window' | 'door';
/**
 * Une façade de pan de bois chaulé (l'étage de la mercière) : sablières, poteaux aux `posts`, travée par travée : `plain` (une
 * entretoise, deux panneaux chaulés), `cross` (la croix de Saint-André du vannier), `window` (appui, linteau, deux montants, le jour
 * et son volet ouvert). `cut` : coupée à cette hauteur (le dedans).
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
    if (cut && w0 >= cut) return;
    if (!cut) { darkBay(Q, m - 6, m + 6, y0 + 1, w0, w1); B.push(openShutter(m - 6, y1, w0)); }
  });
}
const ME_POSTS = steps(6);
const ME_UP: UpBay[] = ['cross', 'window', 'plain', 'plain', 'window', 'cross'];

function meRez(Q: Quad[], cut?: number): void {
  const { W, D, t, rez } = ME;
  const plaster = limePlaster(1315);
  const inner: Tex = (_s, _t, c) => plaster(c.p[0] + c.p[1], c.p[2], c);
  const south = onFace(meSouthTex(), true, 0, W, rez);
  const outerN = onFace(rendered(1317, W, ['left', 'right']), true, 0, W, rez);
  shell(Q, {
    W, D, t, z0: 0, z1: rez, cut, south, north: cut !== undefined ? inner : outerN, inner: cut !== undefined ? inner : outerN,
    top: rubbleSection(1319, 'lime'), part: part('mur', 2, '~', 'full'),
    holes: { S: ME_S, N: ME_N, W: [], E: [] },
  });
}

/** La cour : la palissade au sud et à l'ouest, l'entrée à l'est sur la ruelle ; la potence de l'enseigne près de la porte. */
function meYard(Q: Quad[], B: Board[]): void {
  Q.push(...fenceX(80, 224, 392, 1351), ...fenceY(178, 392, 80, 1353), ...fenceY(178, 300, 222, 1355));
  Q.push(...signPost(124, 176));
  B.push(sign('s2', 125.5, 176.5, 48));
  B.push(prop('bench', 130, 192), prop('bucket-water', 200, 200), piece('vegetable-basket', 186, 196));
}

function merciereOutside(frame: number): Built {
  const Q: Quad[] = [], B: Board[] = [], { W, D, t, rez, floor, top } = ME;
  meRez(Q);
  for (const [k, h] of ME_S.entries()) {
    if (h.kind === 'door') { doorPlane(Q, h.a0, h.a1, D - 3, h.z1, doorTex(1321, h.a1 - h.a0)); B.push(threshold(h.a0 - 3, h.a1 + 3, D)); continue; }
    sill(Q, h.a0 - 2, h.a1 + 2, D, h.z0);
    Q.push(...box(h.a0, h.a1, D - 4, D - 3, h.z0, h.z1, part('vitrail', 1, '`', 'none'), (s, tt) => leaded(h.a1 - h.a0, h.z1 - h.z0, s, tt)));
    void k;
  }
  // le plancher entre les deux : la ceinture de bois (les bouts des solives sous la sablière de l'étage)
  Q.push(...box(0, W, D - 3, D, rez, floor, part('ceinture', 6, 'K', 'full', { eave: true }), (s, tt, c) => (c.face === 'S' ? (Math.floor(s) % 8 < 3 && tt < 3.5 ? '&' : '%') : '*')));
  halfTimber(Q, B, D, ME_POSTS, ME_UP, floor, top, 1331);
  // l'étage, au nord et aux pignons : on n'en voit que la tranche
  const wp = part('pan de bois', 3, 'K', 'full');
  Q.push(...box(0, W, 0, 3, floor, top, wp, W_(1341)), ...box(0, 3, 3, D - 3, floor, top, wp, W_(1343)), ...box(W - 3, W, 3, D - 3, floor, top, wp, W_(1345)));
  // la cuisine, sous ses solives, au rez : on n'en voit rien ; le toit, la souche (le conduit de la cuisine monte dans le mur nord)
  gableRoof(Q, ME_ROOF);
  stack(Q, 40, 56, -1, 11, 130, ridgeZ(ME_ROOF) + 12, onFace(rendered(1347, 16, ['left', 'right']), true, 40, 16, 200));
  // l'ouvroir sur la rue (au nord) : rabattu en comptoir les jours de marché, caché par le toit dans la vue du jeu (13.1)
  Q.push(...moved(turned(pieceModel('shop-flap-open').model(), 2, 32, 16), [116, -16, 0]));
  meYard(Q, B);
  void t; void frame;
  return { quads: Q, boards: B, floor: [80, 224, D, 392] };
}

/** Le dedans de la mercière, un niveau. */
function merciereInside(level: 0 | 1, frame: number): Built {
  const Q: Quad[] = [], B: Board[] = [], { W, D, t, rez, floor, top } = ME;
  const sx = ME_STAIR.x, sy = ME_STAIR.y;
  const plaster = limePlaster(1361);
  if (level === 0) {
    meRez(Q, 14);
    // la cloison de planches entre l'arrière-boutique et la boutique (y 76), ses deux portes ; est-ouest, coupée à 70 cm comme le jeu
    const pp = part('cloison', 3, '&', 'full');
    wallRun(Q, true, t, W - t, 76, 78, 0, 14, [{ a0: 96, a1: 112, z0: 0, z1: 36 }, { a0: sx, a1: sx + STAIR.w, z0: 0, z1: 36 }], pp, { top: () => '%', side: plankInner(1363) });
    // l'arrière-boutique : la cuisine (l'âtre au mur nord, sa hotte), la table, la réserve ; l'escalier à l'est
    Q.push(...hearth(frame, 26, t));
    Q.push(...box(25, 71, t + 16, t + 22, 30, 34, part('manteau', 7, 'K', 'full'), timber(1365)));
    Q.push(...box(28, 68, t, t + 16, 34, rez, part('hotte', 6, '~', 'full'), limePlaster(1367)));
    Q.push(...moved(stairModel(), [sx, sy, 0]));
    Q.push(quad([t, 78, 0.02], [W - 2 * t, 0, 0], [0, D - t - 78, 0], [0, 0, 1], part('dalles', 0, '~', 'none', { cast: false }), flagstones(13), 'top'));
    // l'ouvroir, fermé de l'intérieur (son volet rabattu dehors se voit par la baie)
    Q.push(...box(116, 148, 4, 5, 18, 34, part('volet', 2, '&', 'full'), boards(1369, 4, [2, 13])));
    B.push(
      prop('table', 84, 34), prop('bench', 85, 54), stonePiece('chair', 100, 22), prop('jar', 12, 50), prop('jar', 20, 58), prop('barrel', 136, 12),
      prop('sack', 12, 64), prop('bucket-water', 74, 14), prop('chest', 128, 50),
      // la boutique : le casier contre la cloison, le comptoir, le présentoir à rubans, une chaise derrière le comptoir
      piece('haberdashery-cabinet', 14, 79), piece('shop-counter', 64, 102), stonePiece('chair', 82, 90), piece('ribbon-rack', 150, 104),
      prop('chest', 14, 128, 1), prop('lantern', 102, 104, 0, 19),
    );
    return { quads: Q, boards: B, floor: [t, W - t, t, D - t] };
  }
  // l'étage : le plancher percé de la trémie, l'escalier dans la pénombre dessous, le vide sous la coupe
  const pp = part('plancher', 1, '&', 'full'), pl = { top: planks(), side: planks() };
  const [wx0, wx1, wy0, wy1] = [sx, sx + STAIR.w, sy, sy + STAIR.d];
  Q.push(...box(0, W, 0, wy0, rez, floor, pp, pl), ...box(0, W, wy1, D, rez, floor, pp, pl));
  Q.push(...box(0, wx0, wy0, wy1, rez, floor, pp, pl), ...box(wx1, W, wy0, wy1, rez, floor, pp, pl));
  Q.push(...box(0, W, D - t, D, 0, rez, part('vide', 3, 'o', 'none', { cast: false }), () => VOID));
  Q.push(...dimmed(moved(stairModel(), [sx, sy, 0])));
  const UB: Board[] = [];
  halfTimber(Q, UB, D, ME_POSTS, ME_UP, floor, top, 1331, floor + 14);
  const wallTex: Tex = (s, tt, c) => (c.face === 'top' ? '*' : Math.floor(c.p[0] + c.p[1]) % 32 < 4 ? timber(1371)(s, tt, c) : plaster(c.p[0] + c.p[1], c.p[2], c));
  const wp = part('pan de bois', 3, 'K', 'full');
  Q.push(...box(0, W, 0, 3, floor, top, wp, wallTex), ...box(0, 3, 3, D - 3, floor, top, wp, wallTex), ...box(W - 3, W, 3, D - 3, floor, top, wp, wallTex));
  // les cloisons : est-ouest à y 80 (la salle au nord ; coupée à 70 cm comme le jeu), nord-sud à x 96 (les deux chambres au sud) ; leurs portes
  const cp = part('cloison', 3, 'K', 'full');
  wallRun(Q, true, 3, W - 3, 80, 82, floor, floor + 14, [{ a0: 40, a1: 56, z0: floor, z1: floor + 36 }, { a0: 132, a1: 148, z0: floor, z1: floor + 36 }], cp, wallTex);
  wallRun(Q, false, 82, D - 3, 95, 97, floor, top, [], cp, wallTex);
  // le conduit de la cuisine qui monte dans le mur nord de la salle
  Q.push(...box(40, 56, 3, 11, floor, top, part('conduit', 4, '~', 'full'), limePlaster(1373)));
  // le garde-corps de la trémie
  const gp = part('garde-corps', 8, 'K', 'thin'), fw = furnWood(1375);
  Q.push(...box(wx0 - 1, wx0 + 1, wy0, wy1, floor + 17, floor + 19, gp, fw), ...box(wx0 - 1, wx1, wy1 - 1, wy1 + 1, floor + 17, floor + 19, gp, fw));
  for (let y = wy0 + 2; y < wy1; y += 6) Q.push(...box(wx0 - 0.5, wx0 + 0.5, y, y + 1, floor, floor + 17, gp, fw));
  const up = (b: Board) => lift(b, floor);
  B.push(...[
    // la salle : la table, deux chaises, le coffre, le coupon en cours sur la table
    prop('table', 70, 30), stonePiece('chair', 80, 18), stonePiece('chair', 120, 18), prop('chest', 12, 14), prop('stool', 20, 50),
    // la chambre de la mercière (ouest), celle de sa fille (est)
    prop('bed', 10, 90), prop('chest', 50, 86), stonePiece('chair', 70, 120),
    prop('bed', 150, 104), prop('chest', 104, 86), prop('stool', 120, 130),
  ].map(up), boltBoard('blue', 90, 36, floor + 16), boltBoard('red', 100, 38, floor + 16), ...UB);
  return { quads: Q, boards: B };
}

const merciereBuilding: PlaceBuilding = {
  id: 'p-merciere', size: [ME.W + 16 + 40, 410], at: ME_AT, levels: 2, palette,
  pieces: ['shop-counter', 'haberdashery-cabinet', 'ribbon-rack', 'shop-flap', 'shop-flap-open', 'yard-fence'],
  outside: (o, frame = 0) => place(merciereOutside(frame), ME.AT, o),
  inside: (o, level = 0, frame = 0) => place(level ? merciereInside(1, frame) : { ...merciereInside(0, frame), quads: [...merciereInside(0, frame).quads, ...yardOnly(merciereOutside(frame))] }, ME.AT, o),
};
/** Ce qui est dans la cour (la palissade, le poteau de l'enseigne) : on le voit aussi toit effacé. */
function yardOnly(b: Built): Quad[] {
  return b.quads.filter((q) => ['palissade', 'lisse', 'poteau', 'dé', 'bras', 'jambe de force', 'crochet', 'battant', 'chapeau'].includes(q.part.name) && q.o[1] > ME.D - 2);
}

// =====================================================================================================================
// 13.7 La tailleuse et le frère du forgeron : le grand bâtiment de bois à étage, la galerie, la cour et son portail
// =====================================================================================================================
//
// Murs (px, repère des murs) : x 0-288 (14,40 m), y 0-192 (9,60 m) ; ossature de bois sur un solin de pierre de 30 cm, bardage à clins ;
// le rez jusqu'à 52 (2,60 m), le plancher à 57, l'étage jusqu'à 105 (5,25 m) ; bardeaux à 40° (45 ferait un faîte à 10,10 m), faîte à
// 9,40 m. La galerie : y 192-212 (1 m ; le cadrage disait 1,60 m, mais son plancher cachait alors tout le haut des boutiques), son plancher à 2,85 m. La cour, x 0-528, y 224-512 : le plan la donnait jusqu'en 3200 de la zone ; elle
// va ici jusqu'en 3248 (x 528), pour que le portail ouvre sur la rue du sud (qui commence en 3264), dans la palissade est.
// Le dedans : au rez, l'atelier de couture (nord-ouest) et la boutique de vêtements (sud-ouest), l'atelier du cuir (nord-est) et la
// boutique d'aventure (sud-est), au milieu l'escalier (x 136-154) qui monte vers le nord, sa porte au sud ; à l'étage, la cuisine (nord-
// ouest, l'âtre contre la souche), la chambre (nord-est), la réserve d'étoffes et de cuirs (sud-ouest), la salle (sud-est), le palier et
// la porte de la galerie au milieu.

const TA = { W: 288, D: 192, t: 3, solin: 6, rez: 52, floor: 57, top: 105, pitch: 40, AT: [8, 12] as [number, number] };
const TA_AT: [number, number] = [2720 - 8, 2208 - 12];
const TA_ROOF: RoofSpec = { axis: 'x', a0: 0, a1: TA.W, b0: 0, b1: TA.D, z: TA.top, pitch: TA.pitch, eave: 6, gable: [4, 4], thick: 2, cover: 'shingles', seed: 1501, holes: [[40, 60, -4, 10]] };
const TA_STAIR = { x: 136, y: 100 };
type Op = Hole & { kind: 'door' | 'shop' | 'window' | 'gallery-door' };
const TA_S: Op[] = [
  { a0: 16, a1: 48, z0: 18, z1: 38, kind: 'shop' }, { a0: 60, a1: 78, z0: 0, z1: 36, kind: 'door' },
  { a0: 136, a1: 154, z0: 0, z1: 36, kind: 'door' },
  { a0: 210, a1: 228, z0: 0, z1: 36, kind: 'door' }, { a0: 240, a1: 272, z0: 18, z1: 38, kind: 'shop' },
  { a0: 28, a1: 40, z0: 73, z1: 89, kind: 'window' }, { a0: 96, a1: 108, z0: 73, z1: 89, kind: 'window' },
  { a0: 136, a1: 154, z0: 57, z1: 95, kind: 'gallery-door' },
  { a0: 180, a1: 192, z0: 73, z1: 89, kind: 'window' }, { a0: 248, a1: 260, z0: 73, z1: 89, kind: 'window' },
];
const TA_N: Hole[] = [{ a0: 100, a1: 112, z0: 18, z1: 30 }, { a0: 200, a1: 212, z0: 18, z1: 30 }, { a0: 200, a1: 212, z0: 73, z1: 85 }, { a0: 100, a1: 112, z0: 73, z1: 85 }];
const STACK: [number, number, number, number] = [40, 60, -4, 10];

/** Les murs de bois : le solin, la sole, le bardage à clins (dehors), les planches (dedans), les planches d'angle, la ceinture du plancher. */
function taWalls(Q: Quad[], cut?: number, level: 0 | 1 = 0): void {
  const { W, D, t, solin, rez, floor, top } = TA;
  const z1 = cut === undefined ? top : level ? top : rez;
  const z0 = cut !== undefined && level ? floor : 0;
  const zs = cut ?? z1;
  const P = part('bardage', 2, 'K', 'full', { eave: true });
  const S = part('solin', 2, '~', 'full');
  const out = (seed: number): Tex => clapboard(seed);
  const outer = (ew: boolean, a0: number, seed: number): Tex => (_s, _tt, c) => (c.face === 'top' ? '%' : out(seed)((ew ? c.p[0] : c.p[1]) - a0, c.p[2] - solin, c));
  const inner = (seed: number): Tex => (_s, _tt, c) => (c.face === 'top' ? '%' : plankInner(seed)(c.p[0] + c.p[1], c.p[2], c));
  const sTex = cut !== undefined ? outer(true, 0, 1511) : outer(true, 0, 1511);
  const nTex = cut !== undefined ? inner(1513) : outer(true, 0, 1513);
  const ewTex = cut !== undefined ? inner(1515) : outer(false, 0, 1515);
  const lo = Math.max(z0, solin);
  // le solin de pierre (au rez seulement)
  if (z0 === 0) {
    const r = (seed: number, len: number) => onFace(rubble(seed, len, solin, 'lime'), true, 0, len, solin, 0, rubbleSection(seed + 1, 'lime'));
    // devant, coupé aux portes (le seuil de la porte est au ras du sol)
    const doors = TA_S.filter((h) => h.kind === 'door').map((h) => ({ a0: h.a0, a1: h.a1, z0: 0, z1: solin }));
    wallRun(Q, true, -1, W + 1, D - t - 1, D + 1, 0, solin, doors, S, r(1521, W + 2));
    Q.push(...box(-1, W + 1, -1, t + 1, 0, solin, S, r(1523, W + 2)));
    Q.push(...box(-1, t + 1, t + 1, D - t - 1, 0, solin, S, r(1525, D)), ...box(W - t - 1, W + 1, t + 1, D - t - 1, 0, solin, S, r(1527, D)));
  }
  const sHoles = TA_S.map(({ a0, a1, z0: a, z1: b }) => ({ a0, a1, z0: a, z1: b }));
  wallRun(Q, true, 0, W, D - t, D, lo, Math.min(zs, z1), sHoles, P, sTex);
  wallRun(Q, true, 0, W, 0, t, lo, z1, TA_N, P, nTex);
  wallRun(Q, false, t, D - t, 0, t, lo, z1, [], P, ewTex);
  wallRun(Q, false, t, D - t, W - t, W, lo, z1, [], P, ewTex);
  // les planches d'angle debout, la ceinture entre les deux niveaux (sur la face sud)
  const T = (n: string, p = 4) => part(n, p, 'K', 'full', { eave: true });
  for (const x of [0, W - 3]) Q.push(...box(x, x + 3, D - t - 0.4, D + 0.4, lo, Math.min(zs, z1), T('planche d angle'), timber(1531 + x)));
  if (cut === undefined) Q.push(...box(-0.4, W + 0.4, D - t - 0.4, D + 0.6, rez, floor, T('ceinture', 4.5), timber(1535)));
}

/** Une baie de la face sud, du dehors : chambranle, porte, jour, volet ouvert, comptoir de boutique. */
function taBays(Q: Quad[], B: Board[]): void {
  const { D } = TA;
  const T = (n: string) => part(n, 5, 'K', 'full', { eave: true });
  for (const [k, h] of TA_S.entries()) {
    // le chambranle : deux montants, la traverse du haut (des planches de 10 cm, en saillie de 5 cm)
    Q.push(...box(h.a0 - 2, h.a0, D - 0.5, D + 1, h.z0, h.z1 + 2, T('chambranle'), timber(1541 + k)));
    Q.push(...box(h.a1, h.a1 + 2, D - 0.5, D + 1, h.z0, h.z1 + 2, T('chambranle'), timber(1542 + k)));
    Q.push(...box(h.a0 - 2, h.a1 + 2, D - 0.5, D + 1, h.z1, h.z1 + 2, T('chambranle'), timber(1543 + k)));
    if (h.kind === 'door' || h.kind === 'gallery-door') doorPlane(Q, h.a0, h.a1, D - 2, h.z1 - h.z0, doorTex(1551 + k, h.a1 - h.a0), h.z0);
    else {
      darkBay(Q, h.a0, h.a1, D - 2, h.z0, h.z1);
      if (h.kind === 'window') B.push(openShutter(h.a0, D, h.z0));
      if (h.kind === 'window') Q.push(...box(h.a0 - 2, h.a1 + 2, D - 0.5, D + 1.5, h.z0 - 1.5, h.z0, T('appui'), timber(1561 + k)));
    }
    if (h.kind === 'shop') {
      // le volet de boutique rabattu en comptoir (l'image du jeu `stall-shutter-open`), à 90 cm
      B.push(prop('stall-shutter-open', h.a0, D, 0, h.z0 - 1));
    }
  }
}

function taYard(Q: Quad[], B: Board[], open = true): void {
  // la palissade : au nord de la cour à l'est du bâtiment, à l'ouest, au sud, à l'est avec le portail (ouvert : la boutique est ouverte)
  Q.push(...fenceX(290, 528, 212, 1571), ...fenceY(212, 512, 0, 1573), ...fenceX(0, 528, 512, 1575));
  Q.push(...fenceY(212, 340, 526, 1577), ...fenceY(396, 512, 526, 1579));
  Q.push(...moved(turned(gateModel(open), 3, 56, 4), [524, 340, 0]));
  // les deux enseignes (les ciseaux, le sac), dos à dos au poteau du milieu de la galerie, sous sa sablière,
  // chacune du côté de sa boutique (pendues ailleurs, elles cachaient le haut des portes)
  B.push(sign('s3', 142, TA.D + GALLERY.d - 2, 48, true), sign('s4', 146, TA.D + GALLERY.d - 2, 48));
  B.push(prop('bench', 8, 230), prop('barrel', 236, 228), prop('barrel', 248, 230), prop('crate', 296, 240), prop('rope-coil', 266, 236), woodPiece('sawhorse', 100, 50, 330, 300),
    // les peaux qui sèchent au soleil, des caisses, un second banc contre la palissade
    piece('leather-hides', 380, 260), prop('crate', 440, 236), lift(prop('crate', 440, 236), 13), prop('crate', 454, 238), prop('bench', 200, 500));
}

function tailleuseOutside(frame: number): Built {
  const Q: Quad[] = [], B: Board[] = [], { W } = TA;
  taWalls(Q);
  taBays(Q, B);
  Q.push(...moved(galleryModel(-2, W + 2, [2, 72, 144, 216, W - 2]), [0, TA.D, 0]));
  gableRoof(Q, TA_ROOF);
  stack(Q, STACK[0], STACK[1], STACK[2], STACK[3], 100, ridgeZ(TA_ROOF) + 12, limeMasonry(1581, () => [true, true]));
  // devant les boutiques : les coupons sur le comptoir de la tailleuse, la corde et la lanterne sur celui de son mari
  B.push(boltBoard('red', 20, TA.D + 4, 18), boltBoard('blue', 30, TA.D + 3, 18), boltBoard('linen', 38, TA.D + 6, 18));
  B.push(prop('rope-coil', 246, TA.D + 4, 0, 18), prop('lantern', 262, TA.D + 3, 0, 18));
  taYard(Q, B);
  void frame;
  return { quads: Q, boards: B, floor: [0, 528, TA.D, 512] };
}

function tailleuseInside(level: 0 | 1, frame: number): Built {
  const Q: Quad[] = [], B: Board[] = [], { W, D, t, rez, floor, top } = TA;
  const sx = TA_STAIR.x, sy = TA_STAIR.y;
  const cp = part('cloison', 3, '&', 'full');
  const inner = (seed: number): Tex => (_s, _tt, c) => (c.face === 'top' ? '%' : plankInner(seed)(c.p[0] + c.p[1], c.p[2], c));
  const masonry = limeMasonry(1581, () => [true, true]);
  if (level === 0) {
    taWalls(Q, 14, 0);
    // la cage de l'escalier (x 134-136 et 154-156) et les cloisons entre ateliers et boutiques (y 84)
    wallRun(Q, false, t, D - t, 134, 136, 0, rez, [{ a0: 20, a1: 36, z0: 0, z1: 36 }], cp, inner(1601));
    wallRun(Q, false, t, D - t, 154, 156, 0, rez, [{ a0: 20, a1: 36, z0: 0, z1: 36 }], cp, inner(1603));
    wallRun(Q, true, t, 134, 84, 86, 0, 14, [{ a0: 96, a1: 112, z0: 0, z1: 36 }], cp, inner(1605));
    wallRun(Q, true, 156, W - t, 84, 86, 0, 14, [{ a0: 180, a1: 196, z0: 0, z1: 36 }], cp, inner(1607));
    Q.push(...moved(stairModel(), [sx, sy, 0]));
    // la souche dans le mur nord de l'atelier de couture, l'âtre devant (les fers à repasser chauffent), sa hotte
    Q.push(...box(STACK[0], STACK[1], STACK[2], t + 4, 0, rez, part('souche', 4, '~', 'full'), masonry));
    Q.push(...hearth(frame, 28, t + 4));
    Q.push(...box(27, 73, t + 20, t + 26, 30, 34, part('manteau', 7, 'K', 'full'), timber(1609)));
    Q.push(...box(30, 70, t + 4, t + 20, 34, rez, part('hotte', 6, '~', 'full'), limePlaster(1611)));
    B.push(
      // l'atelier de couture
      furniture(tailorTableQuads(), 82, 30, 28, 14), woodPiece('spinning-wheel', 90, 40, 8, 60), piece('dress-form', 118, 60), prop('stool', 92, 48),
      boltBoard('red', 10, 40), boltBoard('blue', 10, 46), boltBoard('linen', 18, 44), prop('chest', 100, 8),
      // la boutique de vêtements
      piece('clothes-rack', 8, 90), piece('clothes-rack', 60, 90), piece('shop-counter', 50, 140, 0), piece('dress-form', 110, 128), prop('stool', 70, 130),
      // l'atelier du cuir
      piece('saddler-bench', 170, 14), piece('leather-hides', 230, 4), prop('grindstone', 250, 50, 1), prop('barrel', 166, 56), prop('stool', 186, 30), prop('chest', 210, 60),
      // la boutique d'aventure
      piece('gear-rack', 162, 89), piece('gear-rack', 236, 89), piece('knife-display', 196, 120), piece('shop-counter', 230, 150, 0),
      prop('barrel', 270, 120), prop('rope-coil', 164, 150), prop('rope-coil', 168, 156), prop('lantern', 240, 152, 0, 19),
      prop('inner-door', 134, 20, 1), prop('inner-door', 154, 20, 1),
    );
    // la cour, toit effacé comme dehors
    const yQ: Quad[] = [], yB: Board[] = [];
    taYard(yQ, yB);
    Q.push(...yQ, ...moved(galleryModel(-2, W + 2, [2, 72, 144, 216, W - 2]), [0, TA.D, 0]).filter((q) => q.o[2] < floor - 1 && q.part.name === 'poteau'));
    B.push(...yB);
    return { quads: Q, boards: B, floor: [t, W - t, t, D - t] };
  }
  // l'étage : le plancher percé de la trémie, l'escalier dans la pénombre, la galerie au sud (coupée comme le mur)
  const pp = part('plancher', 1, '&', 'full'), pl = { top: planks(), side: planks() };
  const [wx0, wx1, wy0, wy1] = [sx, sx + STAIR.w, sy, sy + STAIR.d];
  Q.push(...box(0, W, 0, wy0, rez, floor, pp, pl), ...box(0, W, wy1, D, rez, floor, pp, pl));
  Q.push(...box(0, wx0, wy0, wy1, rez, floor, pp, pl), ...box(wx1, W, wy0, wy1, rez, floor, pp, pl));
  Q.push(...box(0, W, D - t, D, 0, rez, part('vide', 3, 'o', 'none', { cast: false }), () => VOID));
  Q.push(...dimmed(moved(stairModel(), [sx, sy, 0])));
  taWalls(Q, floor + 14, 1);
  Q.push(...moved(galleryModel(-2, W + 2, [2, 72, 144, 216, W - 2]), [0, TA.D, 0]).filter((q) => q.o[2] >= floor - 6));
  // les cloisons de l'étage : est-ouest à y 96 (au nord la cuisine et la chambre), la cage au milieu ; leurs portes
  wallRun(Q, true, t, 134, 96, 98, floor, floor + 14, [{ a0: 96, a1: 112, z0: floor, z1: floor + 36 }], cp, inner(1621));
  wallRun(Q, true, 156, W - t, 96, 98, floor, floor + 14, [{ a0: 176, a1: 192, z0: floor, z1: floor + 36 }], cp, inner(1623));
  wallRun(Q, false, t, 96, 134, 136, floor, top, [], cp, inner(1625));
  wallRun(Q, false, t, 96, 154, 156, floor, top, [], cp, inner(1627));
  wallRun(Q, false, 98, D - t, 134, 136, floor, top, [{ a0: 160, a1: 176, z0: floor, z1: floor + 36 }], cp, inner(1629));
  wallRun(Q, false, 98, D - t, 154, 156, floor, top, [{ a0: 160, a1: 176, z0: floor, z1: floor + 36 }], cp, inner(1631));
  // la cuisine : l'âtre contre la souche, sa hotte jusqu'au plafond
  Q.push(...box(STACK[0], STACK[1], STACK[2], t + 4, floor, top, part('souche', 4, '~', 'full'), masonry));
  Q.push(...hearth(frame, 28, t + 4, floor));
  Q.push(...box(27, 73, t + 20, t + 26, floor + 30, floor + 34, part('manteau', 7, 'K', 'full'), timber(1633)));
  Q.push(...box(30, 70, t + 4, t + 20, floor + 34, top, part('hotte', 6, '~', 'full'), limePlaster(1635)));
  // le garde-corps de la trémie
  const gp = part('garde-corps', 8, 'K', 'thin'), fw = furnWood(1637);
  Q.push(...box(wx0 - 1, wx0 + 1, wy0, wy1, floor + 17, floor + 19, gp, fw), ...box(wx1 - 1, wx1 + 1, wy0, wy1, floor + 17, floor + 19, gp, fw));
  for (let y = wy0 + 2; y < wy1; y += 6) Q.push(...box(wx0 - 0.5, wx0 + 0.5, y, y + 1, floor, floor + 17, gp, fw), ...box(wx1 - 0.5, wx1 + 0.5, y, y + 1, floor, floor + 17, gp, fw));
  const up = (b: Board) => lift(b, floor);
  B.push(...[
    // la cuisine
    prop('table', 70, 50), prop('bench', 71, 70), prop('barrel', 8, 60), prop('jar', 8, 76), prop('bucket-water', 80, 14), prop('jar', 112, 14),
    // la chambre
    prop('bed', 240, 12), prop('chest', 196, 12), prop('stool', 220, 70),
    // la réserve d'étoffes et de cuirs
    prop('chest', 8, 110), prop('chest', 8, 130), prop('crate', 60, 104), piece('leather-hides', 70, 100),
    // la salle
    prop('table', 190, 130), prop('bench', 191, 150), prop('chest', 250, 106, 1),
  ].map(up),
  ...[[10, 150, 'red'], [20, 150, 'blue'], [30, 150, 'linen'], [10, 160, 'blue'], [20, 162, 'red'], [40, 152, 'linen']].map(([x, y, k]) => boltBoard(k as 'red', x as number, y as number, floor)),
  ...[[16, 112], [26, 112]].map(([x, y]) => boltBoard('red', x, y, floor + 11)),
  );
  void top;
  return { quads: Q, boards: B };
}

const tailleuseBuilding: PlaceBuilding = {
  id: 'p-tailleuse', size: [540, 530], at: TA_AT, levels: 2, palette,
  pieces: ['clapboard-wall', 'timber-gallery', 'yard-gate', 'yard-fence', 'clothes-rack', 'dress-form', 'gear-rack', 'knife-display', 'saddler-bench', 'leather-hides', 'shop-counter'],
  outside: (o, frame = 0) => place(tailleuseOutside(frame), TA.AT, o),
  inside: (o, level = 0, frame = 0) => place(tailleuseInside(level, frame), TA.AT, o),
};

// =====================================================================================================================
// Les exports
// =====================================================================================================================

export const BUILDINGS: PlaceBuilding[] = [fermeRivaleBuilding, merciereBuilding, tailleuseBuilding];

const sh = (r: Rect, [dx, dy]: [number, number]): Rect => [r[0] + dx, r[1] + dy, r[2] + dx, r[3] + dy];
export const NOTES: Partial<Record<PlaceBuildingId, PlaceNotes>> = {
  'p-ferme-rivale': {
    lines: [
      'L’étal à la pointe, sur le bord de la place : deux travées de planches sur tréteaux sous un auvent de planches mal jointes sur quatre perches, sans fond ; les légumes en tas, les cageots et les paniers à terre devant, au nord (vers la place) ; la balance, l’ardoise.',
      'Le dépôt, à 5,60 m au sud de l’étal : la maison de Xéros en 8 x 6,40 m (pan de bois, torchis chaulé, chaume à 50°), façade au sud sur la ruelle des quarts.',
    ],
    inside: ['Le dépôt : cageots vides et pleins, paniers, sacs de pommes de terre, tonneaux ; la table et la seconde balance. L’étal sans son auvent.'],
    xeros: [[170, 64], [100, 350]],
    inXeros0: [110, 300],
    yards: [[DEP.x - 6, DEP.y + 128, DEP.x + 166, 380]],
  },
  'p-merciere': {
    lines: [
      'Rez de moellons enduits (les pierres d’angle et de baie du coq), deux fenêtres vitrées de boutique et la porte au sud sur la cour ; étage de pan de bois chaulé, deux croix de Saint-André, deux fenêtres à volet ; tuiles plates à 45°.',
      'La cour fermée d’une palissade, l’entrée à l’est sur la ruelle ; l’enseigne à l’aiguille (le dessin de place-nord.ts) sur son poteau près de la porte. L’ouvroir est au nord, sur la rue : le toit le cache dans la vue du jeu (13.1).',
    ],
    inside: ['Au rez : la cuisine et l’arrière-boutique au nord (l’âtre, la table, la réserve, l’escalier), la boutique au sud (le casier à tiroirs, le comptoir, le présentoir à rubans). À l’étage : la salle au nord, la chambre de la mercière et celle de sa fille au sud.'],
    xeros: [[ME.AT[0] + 140, ME.AT[1] + 230]],
    inXeros0: [ME.AT[0] + 120, ME.AT[1] + 136],
    inXeros1: [ME.AT[0] + 60, ME.AT[1] + 136],
    yards: [sh([80, 160, 224, 392], ME.AT)],
  },
  'p-tailleuse': {
    lines: [
      'Ossature de bois sur un solin de pierre, bardage à clins, bardeaux à 40°, bois patiné. Au sud, sous la galerie de l’étage (1 m) : la boutique de vêtements et la boutique d’aventure, chacune sa porte et son volet rabattu en comptoir ; au milieu, la porte de l’escalier du logis.',
      'La cour fermée d’une palissade ; le portail à l’est, ouvert, sur la rue du sud ; les deux enseignes (les ciseaux, le sac : les dessins de place-nord.ts) pendues dos à dos au poteau du milieu de la galerie.',
    ],
    inside: ['Au rez : l’atelier de couture (la table, le rouet, le mannequin, l’âtre des fers) et la boutique de vêtements à l’ouest ; l’atelier du cuir (l’établi, les peaux, la meule) et la boutique d’aventure (les râteliers, le présentoir à couteaux, le comptoir) à l’est. À l’étage : la cuisine, la chambre, la réserve d’étoffes et de cuirs, la salle.'],
    xeros: [[TA.AT[0] + 120, TA.AT[1] + 262], [TA.AT[0] + 560, TA.AT[1] + 370]],
    inXeros0: [TA.AT[0] + 100, TA.AT[1] + 170],
    inXeros1: [TA.AT[0] + 220, TA.AT[1] + 170],
    yards: [sh([0, 192, 528, 512], TA.AT)],
  },
};

export type { PlaceBuildingId, Scene };
void AWNING; void voidTex;
