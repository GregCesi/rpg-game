// La maison de Xéros (CONCEPTION « La maison de Xéros », étape 2 : « Les pièces de l'étape 2 ») : les pièces de la chaumière
// en pan de bois, chacune un objet de props.json, dessinées par le modèle en volumes de l'essai validé par Grégoire
// (art/lib/volumes.ts : ses matières à l'identique, « parfait, j'adore »). Chaque vue est le même modèle tourné (r1 : un quart de
// tour dans le sens des aiguilles d'une montre, la face du dehors à l'ouest ; r2 : le demi-tour, la face du dedans ; r3 : la face
// du dehors à l'est), rendu dans la projection du jeu : rien n'est une rotation de pixels.
//
// Échelle : 5 cm par pixel. Les pièces de mur (remplissages, jambages, portes) et de toit sont des pièces `ground` (STYLE.md
// section 8 : leur profondeur à l'échelle du sol, comme les poteaux entre lesquels elles se posent) : projection (x, y − z). Les
// pignons et le faîtage, qu'on ne voit jamais de dessus, gardent le gabarit de leur boîte ; le banc et le seuil, des meubles posés
// au sol, se voient le dessus en raccourci (x, y/2 − z), leur ombre portée dessous. Le bois travaillé se dessine dans la rampe
// `woodAges` à l'âge neuf (^ * % & @) : le build tire le patiné (celui de l'essai) et le vieux.
//
// - Le remplissage d'une travée (140 × 15 × 180 cm entre deux poteaux, sur la traverse basse, sous la sablière) en quatre
//   étapes : `staves-` (les palançons fendus, tous les 30 cm environ), `wattle-` (le clayonnage de noisetier tressé), `daub-`
//   (le torchis en mottes, ses brins de paille), `lime-` (la chaux, la terre rejaillie au pied) ; plein (`-panel`) ou à fenêtre
//   (`-window-panel` : l'appui à 30 cm du bas de la travée, soit 1 m du sol, la baie de 50 × 40 cm entre deux montants, le
//   linteau ; le volet `plank-shutter` s'y pose). Face : 28 × 39 px ; de chant : 4 × 64 px.
// - La baie de porte (proposition validée par Grégoire, art/proposals/baie-porte.ts) : la travée de 1,40 m = une bande de
//   remplissage de 10 cm (`-jamb`, sans bois, quatre étapes), l'huisserie (`door-frame`, 15 × 15 × 180, sur le seuil), la porte de
//   90, l'huisserie, la bande ; au-dessus, la tête de baie (`-door-head`, 120 × 15 × 50 : les huisseries prolongées jusqu'à la
//   sablière, le linteau à 2 m, le remplissage au-dessus, quatre étapes) ; le seuil intérieur (`inner-threshold-stone`,
//   120 × 30 × 20). Les anciens jambages intérieurs de 30 cm (`-inner-jamb`, l'huisserie du côté de la baie) restent au catalogue.
// - Les portes en planches, 0,90 × 1,80 m (`cottage-door`, `inner-door`) : quatre planches debout, les chevilles des traverses,
//   le loquet, le bas mouillé (l'essai) ; du dedans, les deux traverses et l'écharpe.
// - Les pignons en torchis chaulé (`lime-gable`, `lime-gable-smoke`) : le triangle d'une demi-portée de 3,20 m à 45°, 6,40 m sur
//   3,20 m au-dessus de la sablière, l'entrait retroussé à 1,40 m ; le trou de fumée (50 × 40 cm, sous le faîte, sa traverse
//   dessous, le noir du comble derrière).
// - Le pan de toit, sur 13,80 m (12,80 + deux débords de 50 cm) : `thatch-roof-frame` (chevrons en perches avec leur écorce tous
//   les 40 cm, croisés au faîte ; lattes tous les 30 cm), `thatch-roof-half` (une couche de chaume, le bas du pan), `thatch-roof`
//   (le chaume plein, 40 cm, ses rives) ; `earth-ridge`, le faîtage de terre où l'herbe prend.
//   `thatch-roof-pierced` : le chaume plein du pan nord, percé pour le conduit de la cheminée (art/world/chimney.ts), son solin de
//   mortier de chaux.
// - Le solin des cloisons (`narrow-sill-wall`) : le morceau de solin brut à 30 cm d'épaisseur (3 rangées de dessus).
// - Le foyer (`hearth`), le seuil (`threshold-stone`), le banc (`bench`).

import { Canvas, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { stonePalette } from '../items/stones';
import { PAN_STACK } from './chimney';
import { gameImage, walls } from '../lib/walls';
import {
  box, crop, daub, doorTex, earthRidge, gableTex, hash, lath, mirror, part, polyPrism, pole, prism, renderPiece, rotP, rotQuads, rotRect, slabTex, stick, thatchEave,
  thatchSlope, timber, unit, voidTex, wattle, withGroundShadow, type Quad, type Rot, type Tex, type V3,
} from '../lib/volumes';

const PAL = stonePalette;

/** Les vues du jeu (r0 à r3, un quart de tour de plus dans le sens des aiguilles d'une montre) dans les rotations du modèle. */
const VIEW_ROT: Rot[] = [0, 3, 2, 1];
const suffix = (v: number) => (v ? `-r${v}` : '');

/** Les quatre vues d'un modèle (`model(v)` : ses faces, la vue v pouvant en changer, comme le noir d'une baie vu du dehors seul). */
function fourViews(name: string, model: (view: number) => Quad[], k = 1, post: (g: Grid) => Grid = (g) => g): ImageSource[] {
  return [0, 1, 2, 3].map((v) => ({ kind: 'image', name: `${name}${suffix(v)}`, palette: PAL, grid: post(renderPiece(rotQuads(model(v), VIEW_ROT[v], [0, 0]), { k })) }));
}

// =====================================================================================================================
// Les remplissages : quatre étapes
// =====================================================================================================================

export const STAGES = ['staves', 'wattle', 'daub', 'lime'] as const;
export type Stage = (typeof STAGES)[number];

/** Une travée : 140 cm entre les poteaux, 180 de haut. */
const BAY_W = 28;
const BAY_H = 36;

/** Les palançons d'une bande de `w` px : aux deux bords et tous les 30 cm environ entre eux (bord gauche de chacun, 2 px de large). */
function staves(w: number): number[] {
  if (w <= 3) return [0];
  const n = Math.max(1, Math.round((w - 2) / 6.5));
  return Array.from({ length: n + 1 }, (_, k) => Math.round((k * (w - 2)) / n));
}

const timberPart = (name: string) => part(name, 6, 'K', 'full');

/**
 * Le remplissage d'une bande de la travée (x a0 à a1, z z0 à z1), à son étape ; le mur dans le plan y = 0, le dehors vers +y.
 * `raised` : une bande en l'air (au-dessus du linteau d'une porte) n'a pas de terre rejaillie au pied (la matière lue 3 px plus haut).
 */
export function fill(Q: Quad[], stage: Stage, seed: number, a0: number, a1: number, z0: number, z1: number, raised = false) {
  const w = a1 - a0;
  if (w < 1 || z1 - z0 < 1) return;
  const st = staves(w);
  if (stage === 'staves') {
    for (const x of st) Q.push(...box(a0 + x, a0 + x + 2, -1, 1, z0, z1, part('palançon', 2, 'K', 'thin'), stick(seed + x)));
  } else if (stage === 'wattle') {
    Q.push(...box(a0, a1, -1.5, 1.5, z0, z1, part('clayonnage', 1, 'Q', 'full'), wattle(seed, w, st)));
  } else {
    const lime = stage === 'lime';
    const d = daub(seed, lime);
    const tex: Tex = raised ? (s, t, c) => (c.face === 'top' ? d(s, t, c) : d(s, t + 3, { ...c, h: c.h + 3 })) : d;
    Q.push(...box(a0, a1, -2, 2, z0, z1, part(lime ? 'chaux' : 'torchis', 1, lime ? ';' : 'e', 'full'), tex));
  }
}

/** Le remplissage plein. */
const plainPanel = (stage: Stage, seed: number) => (): Quad[] => {
  const Q: Quad[] = [];
  fill(Q, stage, seed, 0, BAY_W, 0, BAY_H);
  return Q;
};

/**
 * La fenêtre : le dessus de l'appui à 30 cm du bas de la travée, soit 1 m du sol (la travée sur la traverse basse, à 70 cm), baie de
 * 50 × 40 cm entre deux montants (1,00 à 1,40 m), linteau.
 */
const SILL = 6;
const WIN_H = 8;
const windowPanel = (stage: Stage, seed: number) => (view: number): Quad[] => {
  const Q: Quad[] = [], m = BAY_W / 2, T = timberPart('fenêtre');
  Q.push(...box(0, BAY_W, -2, 2, SILL - 2, SILL, T, timber(seed + 51)));
  Q.push(...box(0, BAY_W, -2, 2, SILL + WIN_H, SILL + WIN_H + 2, T, timber(seed + 52)));
  Q.push(...box(m - 7, m - 5, -2, 2, SILL, SILL + WIN_H, part('montant', 6, 'K', 'thin'), timber(seed + 53)));
  Q.push(...box(m + 5, m + 7, -2, 2, SILL, SILL + WIN_H, part('montant', 6, 'K', 'thin'), timber(seed + 54)));
  fill(Q, stage, seed, 0, BAY_W, 0, SILL - 2);
  fill(Q, stage, seed + 1, 0, BAY_W, SILL + WIN_H + 2, BAY_H);
  fill(Q, stage, seed + 2, 0, m - 7, SILL, SILL + WIN_H);
  fill(Q, stage, seed + 3, m + 7, BAY_W, SILL, SILL + WIN_H);
  // vue du dehors : le dedans dans la pénombre derrière la baie (du dedans, la baie s'ouvre sur le jour : rien)
  if (view === 0) Q.push(...box(m - 5, m + 5, -2.4, -2, SILL, SILL + WIN_H, part('baie', 0, 'o', 'none'), voidTex));
  return Q;
};

/**
 * L'ancien jambage d'une porte intérieure (`-inner-jamb`, 30 cm : l'huisserie de 15 du côté de la baie, le remplissage à côté),
 * gardé au catalogue ; la maison prend désormais la baie de porte ci-dessous (décision de Grégoire, « la baie de porte »).
 */
const innerJamb = (stage: Stage, seed: number, w: number) => (): Quad[] => {
  const Q: Quad[] = [];
  Q.push(...box(0, 3, -2, 2, 0, BAY_H, timberPart('huisserie'), timber(seed + 41, [[1, 33], [1, 2]])));
  fill(Q, stage, seed, 3, w, 0, BAY_H);
  return Q;
};

// =====================================================================================================================
// La baie de porte (proposition validée par Grégoire : art/proposals/baie-porte.ts, planche .art-preview/baie-porte.png)
// =====================================================================================================================

/**
 * Les mesures de la baie, en px (5 cm). La travée fait 28 px entre les faces des poteaux (1,40 m) = 2 (bande) + 3 (huisserie)
 * + 18 (porte) + 3 (huisserie) + 2 (bande) ; le seuil et la tête de baie couvrent les 24 px du milieu. Hauteurs de la maison :
 * solin 0-40, traverse basse 40-70, poteaux 70-250, sablière 250-280 ; le seuil 0-20, les huisseries et la porte 20-200, la tête
 * de baie 200-250.
 */
export const DOOR_BAY = {
  band: 2, // la bande de remplissage entre poteau et huisserie, 10 cm
  frame: 3, // l'huisserie, 15 cm
  door: 18, // la porte, 90 cm
  opening: 24, // huisseries et porte : 120 cm, la largeur du seuil et de la tête de baie
  frameH: 36, // l'huisserie, 180 cm
  headH: 10, // la tête de baie, 50 cm
  lintel: 3, // le linteau, 15 cm
} as const;
const M = DOOR_BAY;

/** L'huisserie : le bois équarri de la porte, un peu devant le linteau à profondeur égale (le linteau vient entre les deux montants). */
export const framePart = () => part('huisserie', 6.5, 'K', 'full');
/** La demi-épaisseur de l'huisserie et du linteau : 15 cm. */
export const FT = 1.5;

/**
 * Le bois d'une huisserie, sur toute sa hauteur apparente (180 cm sous le linteau, 50 de plus dans la tête de baie) : `from` décale
 * la face (la tête de baie la reprend à 36 px du pied), si bien que le fil se suit de l'une à l'autre. La cheville du linteau, au
 * tiers haut du tenon (z ≈ 2,05 m).
 */
export function frameTex(seed: number, from: number): Tex {
  const full = M.frameH + M.headH;
  const t0 = timber(seed, [[1, M.frameH + 1]]);
  return (s, t, c) => (c.face === 'top' ? t0(s, t, c) : t0(s, t + from, { ...c, h: full }));
}

/** `door-frame` : l'huisserie, 15 × 15 × 180, posée sur le seuil. */
export const doorFrame = (seed = 41) => (): Quad[] => box(0, M.frame, -FT, FT, 0, M.frameH, framePart(), frameTex(seed, 0));

/**
 * `<étape>-door-head` : la tête de baie, 120 × 15 × 50 : les deux huisseries prolongées jusqu'à la sablière, le linteau de 15 cm
 * entre elles (son dessous à 2 m, le haut de la porte), le remplissage au-dessus, à son étape. Les huisseries et le linteau sont là
 * dès la première étape (on les pose avant de garnir).
 */
export const doorHead = (stage: Stage, seed: number) => (): Quad[] => {
  const Q: Quad[] = [];
  const W = M.opening, F = M.frame;
  Q.push(...box(0, F, -FT, FT, 0, M.headH, framePart(), frameTex(41, M.frameH)));
  Q.push(...box(W - F, W, -FT, FT, 0, M.headH, framePart(), frameTex(41, M.frameH)));
  Q.push(...box(F, W - F, -FT, FT, 0, M.lintel, part('linteau', 6, 'K', 'full'), timber(seed + 45)));
  fill(Q, stage, seed, F, W - F, M.lintel, M.headH, true);
  return Q;
};

/** `<étape>-jamb` : la bande de remplissage de 10 cm entre le poteau et l'huisserie, 10 × 15 × 180, sans bois. */
export const jamb = (stage: Stage, seed: number) => (): Quad[] => {
  const Q: Quad[] = [];
  fill(Q, stage, seed, 0, M.band, 0, M.frameH);
  return Q;
};

// =====================================================================================================================
// Les portes
// =====================================================================================================================

/** Le dos d'une porte en planches : les planches (doorTex), deux traverses et l'écharpe, du bas côté gond au haut côté loquet. */
export function doorBack(seed: number, w: number): Tex {
  const face = doorTex(seed, w);
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), h = Math.floor(c.h);
    const base = face(s, t, c);
    if (c.face === 'top') return base;
    for (const r of [6, h - 9]) {
      if (j === r + 2) return '^';
      if (j === r + 1) return '*';
      if (j === r) return '%';
      if (j === r - 1) return '@';
    }
    // l'écharpe, entre les traverses : 3 px, son ombre dessous
    const y0 = 9, y1 = h - 10, f = (j - y0) / (y1 - y0);
    if (j >= y0 && j < y1) {
      const x = Math.round(2 + f * (w - 6));
      if (i === x || i === x + 1) return i === x ? '^' : '*';
      if (i === x + 2) return '%';
    }
    return base;
  };
}

const door = (w: number, seed: number) => (view: number): Quad[] => {
  // la face du dehors au sud ; vue du dedans (r2), le dos de la porte
  const tex = view === 2 ? doorBack(seed, w) : doorTex(seed, w);
  return box(0, w, -1, 1, 0, BAY_H, part('porte', 3, 'K', 'full'), tex);
};

// =====================================================================================================================
// Les pignons
// =====================================================================================================================

/** Le pignon : 6,40 m de base (128 px), 3,20 m de haut (64 px) au-dessus de la sablière, à 45°. */
const GABLE_W = 128;
const GABLE_H = 64;
/** L'entrait retroussé, à 1,40 m au-dessus de la sablière ; le trou de fumée (50 × 40 cm) sous le faîte, sa traverse dessous. */
const TIE_Z = 26;
const HOLE_Z = 51;
const HOLE_H = 8;
const HOLE_W = 5;

const gable = (smoke: boolean) => (): Quad[] => {
  const m = GABLE_W / 2, t = 1.5;
  const apex = (s: number) => GABLE_H - Math.abs(s - m);
  const hole = smoke ? (s: number, z: number) => z >= HOLE_Z && Math.abs(s - m) < (HOLE_Z + HOLE_H - z) * (HOLE_W / HOLE_H) : undefined;
  const inner = daub(90, true);
  const p = part('pignon', 1, ';', 'full');
  const Q: Quad[] = [
    { o: [0, t, 0], u: [GABLE_W, 0, 0], v: [0, 0, GABLE_H], n: [0, 1, 0], part: p, tex: gableTex(inner, apex, hole), face: 'S' },
    { o: [GABLE_W, -t, 0], u: [-GABLE_W, 0, 0], v: [0, 0, GABLE_H], n: [0, -1, 0], part: p, tex: gableTex(daub(91, true), (s) => apex(GABLE_W - s), hole ? (s, z) => hole(GABLE_W - s, z) : undefined), face: 'N' },
    // les rampants : la tranche du mur sous la rive
    { o: [0, -t, 0], u: [m, 0, GABLE_H], v: [0, 2 * t, 0], n: unit([-1, 0, 1]), part: p, tex: inner, face: 'top' },
    { o: [m, -t, GABLE_H], u: [m, 0, -GABLE_H], v: [0, 2 * t, 0], n: unit([1, 0, 1]), part: p, tex: inner, face: 'top' },
  ];
  const dC = GABLE_H - TIE_Z - 3;
  Q.push(...box(m - dC, m + dC, -2, 2, TIE_Z, TIE_Z + 3, timberPart('entrait'), timber(59)));
  if (smoke) {
    Q.push(...box(m - HOLE_W - 2, m + HOLE_W + 2, -2, 2, HOLE_Z - 2, HOLE_Z, timberPart('chevêtre'), timber(71)));
    // le noir du comble, derrière le trou, dans le triangle seul
    const dark = part('comble', 0, 'o', 'none');
    const inside = (x: number, z: number) => z < apex(x) - 1;
    const back = (x0: number, dir: 1 | -1): Tex => (s, t, c) => (inside(x0 + dir * s, HOLE_Z - 2 + t) ? voidTex(s, t, c) : null);
    Q.push({ o: [m - 12, 0, HOLE_Z - 2], u: [24, 0, 0], v: [0, 0, 14], n: [0, 1, 0], part: dark, tex: back(m - 12, 1), face: 'S' });
    Q.push({ o: [m + 12, 0, HOLE_Z - 2], u: [-24, 0, 0], v: [0, 0, 14], n: [0, -1, 0], part: dark, tex: back(m + 12, -1), face: 'N' });
  }
  return Q;
};

// =====================================================================================================================
// Le toit : un pan (le pan sud ; le pan nord est sa vue r2)
// =====================================================================================================================

/**
 * La géométrie de l'essai (la maison agrandie : 6,40 m entre les axes des murs gouttereaux, 45°) : le dessous des chevrons à
 * z = 52 sur l'axe du mur (la sablière), le faîte à 3,20 m de l'axe ; le chaume de 3 px (chevron et latte) à 11 px (40 cm de
 * paille) au-dessus du dessous des chevrons, l'égout coupé d'aplomb à 70 cm au-delà de l'axe du mur.
 */
const H2 = 64;
const PITCH = 45;
const RAD = (PITCH * Math.PI) / 180, TAN = Math.tan(RAD), SIN = Math.sin(RAD), COS = Math.cos(RAD);
const zU = (d: number) => 52 + (H2 - d) * TAN;
const slopePt = (x: number, d: number, k: number): V3 => [x, H2 + (d + k * SIN), zU(d) + k * COS];
const TH_LO = 3, TH_HI = 11;
const TIP = H2 + 12, EAVE = H2 + 14;
/** Le pan sur 13,80 m : 12,80 m entre les axes des pignons, 50 cm de débord de chaque côté ; les chevrons tous les 40 cm. */
const ROOF_X0 = 0, ROOF_X1 = 276, RAFTER_X0 = 10, RAFTER_X1 = 266;

export type RoofStage = 'frame' | 'half' | 'full';

const roof = (stage: RoofStage) => (): Quad[] => {
  const Q: Quad[] = [];
  const X: V3 = [1, 0, 0], nrm: V3 = [0, SIN, COS];
  const roofP = (name: string, prio: number, dark: string, outline: 'full' | 'thin' = 'full') => part(name, prio, dark, outline, { roof: true });
  // les chevrons, croisés au faîte (sous le chaume plein, on ne les voit plus : ils s'arrêtent au faîte)
  const over = stage === 'full' ? 0 : -3;
  for (let x = RAFTER_X0; x <= RAFTER_X1; x += 8) Q.push(...prism(slopePt(x, TIP, 1), slopePt(x, over, 1), X, nrm, 2, 2, roofP('chevron', 8, 'K', 'thin'), pole(x * 3 + 1)));
  for (let q = 2; q < TIP / COS - 2; q += 6) {
    const d = TIP - q * COS;
    Q.push(...prism(slopePt(ROOF_X0, d, 2.5), slopePt(ROOF_X1, d, 2.5), unit([0, -COS, SIN]), nrm, 1.3, 1, roofP('latte', 9, '%', 'thin'), lath(Math.round(q) + 50)));
  }
  if (stage === 'frame') return Q;
  const dAt = (y: number, k: number) => y - k * SIN;
  const dHi = dAt(EAVE, TH_HI), dLo = dAt(EAVE, TH_LO);
  const dTop = stage === 'half' ? (H2 * 34) / 48 : -TH_HI * SIN;
  const thatch = roofP('chaume', 10, 'P');
  const W = ROOF_X1 - ROOF_X0;
  const A = slopePt(ROOF_X0, dHi, TH_HI), B = slopePt(ROOF_X0, dTop, TH_HI);
  Q.push({ o: A, u: [W, 0, 0], v: [B[0] - A[0], B[1] - A[1], B[2] - A[2]], n: nrm, part: thatch, tex: thatchSlope(5), face: 'slope' });
  Q.push({ o: [ROOF_X0, H2 + EAVE, zU(dLo) + TH_LO * COS], u: [W, 0, 0], v: [0, 0, (TH_HI - TH_LO) / COS], n: [0, 1, 0], part: thatch, tex: thatchEave(8), face: 'S' });
  if (stage === 'half') {
    const lo = slopePt(ROOF_X0, dTop, TH_LO);
    Q.push({ o: lo, u: [W, 0, 0], v: [nrm[0] * (TH_HI - TH_LO), nrm[1] * (TH_HI - TH_LO), nrm[2] * (TH_HI - TH_LO)], n: [0, -COS, SIN], part: thatch, tex: thatchEave(12), face: 'edge' });
  }
  const TH = TH_HI - TH_LO;
  // le haut du chaume : à mi-pente (une couche), ou coupé d'aplomb au faîte (plein : le pan nord le rejoint là, sous le faîtage)
  const eaveLo: V3 = [ROOF_X0, H2 + EAVE, zU(dLo) + TH_LO * COS];
  const topLo = stage === 'half' ? slopePt(ROOF_X0, dTop, TH_LO) : slopePt(ROOF_X0, -TH_LO * SIN, TH_LO);
  if (stage === 'full') Q.push({ o: [ROOF_X1, H2, topLo[2]], u: [-W, 0, 0], v: [0, 0, TH / COS], n: [0, -1, 0], part: thatch, tex: thatchEave(15), face: 'edge' });
  // les rives : la tranche du chaume aux deux bouts, de l'égout (coupé d'aplomb) au haut du chaume
  for (const [x, nx] of [[ROOF_X0, -1], [ROOF_X1, 1]] as const) {
    Q.push({ o: [x, eaveLo[1], eaveLo[2]], u: [0, topLo[1] - eaveLo[1], topLo[2] - eaveLo[2]], v: [0, 0, TH / COS], n: [nx, 0, 0], part: thatch, tex: thatchEave(14), face: 'edge' });
  }
  return Q;
};

/**
 * Le pan de chaume percé (`thatch-roof-pierced`) : le chaume plein, percé au droit du conduit, bordé d'un solin de mortier de chaux
 * (d au nord et à l'ouest, D au sud et à l'est). Le trou se tire de la souche de la cheminée (`PAN_STACK` d'art/world/chimney.ts :
 * le conduit en x 720–820, y 30–110 cm dans le repère de la maison, le couronnement au-dessus ; le pan nord posé à x = −40,
 * y = −65 cm, tourné d'un demi-tour autour du faîte : le point (x, y) de la maison est (268 − x, 129 − y) dans le pan, en px). Le pan est
 * dessiné d'une pièce par-dessus la souche (le jeu l'ordonne par son bord sud) : tout ce que la souche cache, dans la vue, est vide
 * (le trou, et derrière lui la bande qu'elle couvre jusqu'au faîte), pour que la souche posée derrière se voie au-dessus du chaume.
 * Vu du sud (r2, le pan nord à 45° vu par la tranche), rien ne change.
 */
export const piercedRoof = (view: number): Quad[] => {
  const r = VIEW_ROT[view];
  const boxes = PAN_STACK.map((b) => {
    const [x0, x1, y0, y1] = rotRect([b.x0, b.x1, b.y0, b.y1], r, [0, 0]);
    return { x0, x1, y0, y1, z0: b.z0, z1: b.z1 };
  });
  const E = 0.4;
  // un point est caché par une boîte s'il a, au même pixel de l'écran (x, y − z), un point de la boîte devant lui (plus au sud)
  const hidden = (p: V3) => boxes.some((b) => {
    if (p[0] <= b.x0 - E || p[0] >= b.x1 + E) return false;
    const y = Math.max(b.y0 - E, p[1]);
    return y <= b.y1 + E && y - p[1] + p[2] <= b.z1 && b.y1 + E - p[1] + p[2] >= b.z0;
  });
  const back = ((4 - r) % 4) as Rot;
  const F = PAN_STACK[0];
  return roof('full')().map((q) => {
    const tex: Tex = (s, t, c) => {
      if (hidden(c.p)) return null;
      const k = q.tex(s, t, c);
      if (k === null || q.part.name !== 'chaume' || c.face !== 'slope') return k;
      // le solin de mortier autour du conduit, sur le chaume
      const [x, y] = rotP(c.p, back, [0, 0]);
      if (x > F.x0 - 2.1 && x < F.x1 + 2.1 && y > F.y0 - 2.1 && y < F.y1 + 2.1) return x < F.x0 + 0.5 || y < F.y0 ? 'd' : 'D';
      return k;
    };
    return { ...q, tex };
  });
};

/** Le faîtage de terre : un bourrelet sur le faîte, ses pieds dans le chaume des deux pans, sur toute la longueur du toit. */
const ridge = (): Quad[] => {
  const top = zU(-TH_HI * SIN) + TH_HI * COS;
  const prof: [number, number][] = [[6, -6 * TAN + 0.4], [5, -3.6], [3.8, -1.2], [2.4, 0.7], [0.8, 1.7], [-0.8, 1.7], [-2.4, 0.7], [-3.8, -1.2], [-5, -3.6], [-6, -6 * TAN + 0.4]];
  return polyPrism(ROOF_X0 - 0.5, ROOF_X1 + 0.5, prof.map(([dy, dz]) => [H2 + dy, top + dz]), part('faîtage', 11, 'e', 'full', { roof: true }), earthRidge(31));
};

/** Hauteurs du dessus du chaume, en cm : à l'égout (le bord sud du pan) et au faîte (son bord nord) ; l'ombre du jeu en part. */
export const THATCH_SHADOW = {
  south: Math.round(5 * (zU(EAVE - TH_HI * SIN) + TH_HI * COS)),
  north: Math.round(5 * (zU(-TH_HI * SIN) + TH_HI * COS)),
};

// =====================================================================================================================
// Le solin des cloisons
// =====================================================================================================================

/** Le morceau de solin brut de 30 cm d'épaisseur : la face de 40 cm (8 px), le dessus de 30 cm en raccourci (3 px). */
export const NARROW_SILL_VARIANTS = 4;
function narrowSill(k: number, view: number): Grid {
  const seed = 307 * 1000 + k * 10 + view;
  if (view % 2 === 0) return walls.roughWall(seed, { length: 32, face: 8, top: 3, axis: 'ew' }).grid;
  return walls.roughWall(seed, { length: 11, face: 8, top: 24, axis: 'ns' }).grid;
}

// =====================================================================================================================
// Le foyer
// =====================================================================================================================

/** Le feu du foyer (l'essai) : deux bûches croisées, les flammes (H h i), les braises ; 12 × 11. Trois images : les flammes vacillent. */
const FIRE: Grid = [
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
/** Les flammes d'une image (les 7 rangées du haut) : la première, le reflet, ou un cran plus basses. */
function fireFrame(f: number): Grid {
  if (f === 0) return FIRE;
  const flames = FIRE.slice(0, 7), logs = FIRE.slice(7);
  if (f === 1) return [...mirror(flames).map((r) => r.slice(1) + '.'), ...logs];
  return [...['............'], ...flames.slice(0, 6).map((r, j) => (j === 0 ? r.replace(/H/g, 'h') : r)), ...logs];
}

const HEARTH_W = 22;
const HEARTH_H = 20;
/** Le foyer, Ø 1 m : un cercle de pierres brutes du jeu (vu en raccourci : 20 × 10 px), les cendres, le feu au milieu. */
function hearth(f: number): Grid {
  const c = new Canvas(HEARTH_W, HEARTH_H);
  const cx = 10.5, cy = 14;
  // les cendres au fond du cercle
  for (let y = 0; y < HEARTH_H; y++) for (let x = 0; x < HEARTH_W; x++) {
    const d = Math.hypot((x + 0.5 - cx) / 7, (y + 0.5 - cy) / 3.5);
    if (d <= 1) c.set(x, y, d > 0.85 ? 'Z' : hash(3, x, y) < 0.12 ? 'i' : hash(4, x >> 1, y) < 0.4 ? 'r' : 'z');
  }
  const stones = ['small-rough-stone-ground', 'small-rough-stone-ground-b'];
  const ring = Array.from({ length: 11 }, (_, k) => (k / 11) * Math.PI * 2 + 0.3).map((a, k) => ({ a, k, y: cy + Math.sin(a) * 4.2 }));
  const place = (r: (typeof ring)[number]) => {
    const g = gameImage(stones[r.k % 2]).map((row) => row.replace(/x/g, '.'));
    const gx = Math.round(cx + Math.cos(r.a) * 8.2 - g[0].length / 2), gy = Math.round(r.y - g.length + 2);
    c.stamp(g, gx, gy);
  };
  // les pierres de derrière, le feu, puis celles de devant
  for (const r of ring.filter((r) => r.y < cy).sort((p, q) => p.y - q.y)) place(r);
  c.stamp(fireFrame(f), 5, Math.round(cy) - 9);
  for (const r of ring.filter((r) => r.y >= cy).sort((p, q) => p.y - q.y)) place(r);
  return crop(c.toGrid());
}

// =====================================================================================================================
// Le seuil, le banc
// =====================================================================================================================

/** Le seuil : une dalle de calcaire de 120 × 50 × 20 cm, posée à la place du solin sous la porte d'entrée. */
export const threshold = (): Quad[] => box(0, 24, 0, 10, 0, 4, part('seuil', 3, '~', 'full'), slabTex(3));
/** Le seuil intérieur : 120 × 30 × 20 cm, la même dalle de calcaire, à la largeur du solin des cloisons (30 cm). */
export const innerThreshold = (): Quad[] => box(0, 24, 0, 6, 0, 4, part('seuil', 3, '~', 'full'), slabTex(5));

/**
 * Le banc (200 × 30 × 45 cm, en planches) : le siège d'une planche épaisse (le dessus éclairé, son chant), deux pieds pleins en
 * planche, une entretoise sous le siège. Le dessin de l'essai, dans la rampe du bois travaillé (^ * % &, contour K) : il prend
 * l'âge du bois. Est-ouest : 40 × 12 px.
 */
const BENCH: Grid = (() => {
  const W = 40, rows: string[] = [];
  rows.push('.' + 'K'.repeat(W - 2) + '.');
  rows.push('K' + '^'.repeat(W - 2) + 'o');
  rows.push('K' + Array.from({ length: W - 2 }, (_, i) => (i === 13 || i === 27 || hash(21, i) < 0.06 ? '%' : '*')).join('') + 'o');
  rows.push('K' + '&'.repeat(W - 2) + 'o');
  rows.push('.o' + 'K'.repeat(W - 4) + 'o.');
  const leg = (j: number) => {
    let r = '';
    for (let i = 0; i < W; i++) {
      if (i === 3 || i === 32) r += 'K';
      else if (i === 4 || i === 33) r += '^';
      else if (i === 5 || i === 34) r += '*';
      else if (i === 6 || i === 35) r += '&';
      else if (i === 7 || i === 36) r += 'o';
      else if (j === 1 && i > 7 && i < 32) r += '%'; // l'entretoise, sous le siège
      else if (j === 2 && i > 7 && i < 32) r += 'o';
      else r += '.';
    }
    return r;
  };
  for (let j = 0; j < 6; j++) rows.push(leg(j));
  rows.push('...oooo' + '.'.repeat(25) + 'oooo....');
  rows.push('....xxxx' + 'x'.repeat(25) + 'xxxx...');
  return rows.map((r) => r.padEnd(W + 1, '.').slice(0, W + 1));
})();

/**
 * Le banc vu en long (nord-sud) : 6 × 29 px (30 cm de large, 45 de haut, 2 m de siège en raccourci). Le siège, son fil dans le sens
 * de la longueur, le bord nord éclairé ; au sud, le chant du siège, puis le pied de devant de face (une planche en travers, échancrée
 * en deux pattes).
 */
const BENCH_NS: Grid = (() => {
  const rows: string[] = ['.KKKK.', 'K^^^^o'];
  for (let j = 2; j < 19; j++) rows.push('K' + [1, 2, 3, 4].map((i) => (i === 4 ? '%' : i === 3 && hash(22, j >> 2) < 0.5 ? '%' : '*')).join('') + 'o');
  rows.push('K%%%%o', 'K&&&&o', '.oooo.');
  for (let j = 0; j < 4; j++) rows.push('K^*%&o');
  rows.push('K^oo&o', 'K^..&o', 'K^..&o', 'oo..oo');
  rows.push('.xx..xx'.slice(0, 7));
  return rows.map((r) => r.padEnd(7, '.'));
})();

// =====================================================================================================================
// Les images
// =====================================================================================================================

export const SEEDS: Record<Stage, number> = { staves: 7, wattle: 17, daub: 27, lime: 37 };

const sources: (ImageSource | SpriteSheetSource)[] = [
  ...STAGES.flatMap((s) => [
    ...fourViews(`${s}-panel`, plainPanel(s, SEEDS[s])),
    ...fourViews(`${s}-window-panel`, windowPanel(s, SEEDS[s] + 100)),
    ...fourViews(`${s}-jamb`, jamb(s, SEEDS[s] + 200)),
    ...fourViews(`${s}-inner-jamb`, innerJamb(s, SEEDS[s] + 300, 6)),
    ...fourViews(`${s}-door-head`, doorHead(s, SEEDS[s] + 400)),
  ]),
  ...fourViews('cottage-door', door(18, 7)),
  ...fourViews('inner-door', door(18, 9)),
  ...fourViews('door-frame', doorFrame()),
  ...fourViews('lime-gable', gable(false)),
  ...fourViews('lime-gable-smoke', gable(true)),
  ...fourViews('thatch-roof-frame', roof('frame')),
  ...fourViews('thatch-roof-half', roof('half')),
  ...fourViews('thatch-roof', roof('full')),
  ...fourViews('thatch-roof-pierced', piercedRoof),
  ...fourViews('earth-ridge', ridge).filter((_, v) => v < 2).map((s, v) => ({ ...s, name: v ? 'earth-ridge-ns' : 'earth-ridge' })),
  ...Array.from({ length: NARROW_SILL_VARIANTS }, (_, k) => [0, 1, 2, 3].map((v): ImageSource => ({ kind: 'image', name: `narrow-sill-wall${k ? `-s${k}` : ''}${suffix(v)}`, palette: PAL, grid: narrowSill(k, v) }))).flat(),
  { kind: 'spritesheet', name: 'hearth', frameW: HEARTH_W, frameH: HEARTH_H, palette: PAL, animations: { burn: { frames: [0, 1, 2].map((f) => pad(hearth(f), HEARTH_W, HEARTH_H)), frameRate: 7, repeat: -1 } } },
  ...fourViews('threshold-stone', threshold, 0.5, withGroundShadow).filter((_, v) => v < 2).map((s, v) => ({ ...s, name: v ? 'threshold-stone-ns' : 'threshold-stone' })),
  ...fourViews('inner-threshold-stone', innerThreshold, 0.5, withGroundShadow).filter((_, v) => v < 2).map((s, v) => ({ ...s, name: v ? 'inner-threshold-stone-ns' : 'inner-threshold-stone' })),
  { kind: 'image', name: 'bench', palette: PAL, grid: BENCH },
  { kind: 'image', name: 'bench-ns', palette: PAL, grid: BENCH_NS },
];

/** Une image calée en bas et au milieu d'un cadre de w × h (les images d'une planche ont toutes la même taille). */
function pad(g: Grid, w: number, h: number): Grid {
  const c = new Canvas(w, h);
  c.stamp(g, Math.floor((w - g[0].length) / 2), h - g.length);
  return c.toGrid();
}

export default sources;
