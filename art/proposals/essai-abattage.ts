// Proposition (chantier « le travail se voit avancer ») : le coup de cognée lent et lourd, et les étapes de l'abattage d'un
// arbre normal. Hors jeu : rien ici ne se déclare dans art/index.ts ; tools/essai-abattage.ts en tire la planche
// .art-preview/essai-abattage.png et l'aperçu animé .art-preview/essai-abattage.html.
//
// 1. LE GESTE. Huit images en cinq temps : armer (2), temps en haut (1), abattre (2 : la cognée part du sommet, puis arrive,
//    avec sa traînée), impact (1), dégager (2 : on retire le fer, on revient en garde). La dernière image (garde) est celle d'où
//    part le coup suivant. Deux gestes :
//    - `use` (de côté, horizontal, à hauteur de taille : l'abattage de l'arbre debout) ; on voit la face de la cognée, de profil ;
//    - `chop` (de haut en bas : ébrancher, couper au sol) ; on la voit par la tranche (convention de art/lib/held.ts).
//    Directions down, up, right ; left est le miroir de right, comme les gestes d'outil de art/characters/xeros.ts.
//    Le corps reprend les pièces de xeros-body.ts (tête, torse, jambes, bras) et la mécanique de la masse (maul) de xeros.ts :
//    `lean` −1 cambré (buste et tête remontent d'un pixel, de profil ils reculent), 0 droit, 1 tassé (buste raccourci d'une
//    rangée, tête baissée, de profil le haut du corps avance). Pieds écartés d'un pixel, plantés. La cognée est celle du jeu
//    (axeArt de art/items/tools.ts), tirée par heldImage (art/lib/held.ts), prise posée sur les mains.
//    Ce qui le rend plus lourd que l'ancien `use` : on arme plus haut et plus loin (la cognée part derrière l'épaule, à
//    hauteur de tête, le corps cambré), on la tient en haut, elle tombe en deux images avec une traînée, et l'impact tasse
//    le corps ; le retour est lent.
//
// 2. L'ABATTAGE. L'arbre normal debout (treeBody de normal-tree.ts, matière et facture inchangées) et ce que la cognée lui
//    enlève, au pied, à la hauteur de la coupe de la chute (CUT_Y = 148 de normal-fall.ts, 65 cm) : l'arbre tombe vers la
//    droite (la chute `normal-tree-fall`), donc
//    - l'entaille de direction se creuse côté droit, en trois étapes : un V à fond plat (le plancher horizontal, éclairé, au
//      bois neuf `^` ; la face haute, en pente, dans l'ombre `%`), de 1, 2 puis 2 px de profondeur et 2, 3 puis 5 rangées
//      d'ouverture (un tronc de 30 cm : 2 px = 10 cm, le tiers du diamètre) ;
//    - le trait d'abattage, côté gauche, une rangée plus haut que le plancher : une petite morsure et la saignée `@` ;
//    - le craquement : la saignée rejoint presque l'entaille (il reste la charnière, 1 px), une fente monte dans le tronc,
//      des éclats sautent côté gauche ;
//    - l'arbre penche : le haut pivote autour de la charnière (2° puis 5°) ; le trait d'abattage s'ouvre à gauche, l'entaille
//      se ferme à droite ; puis vient la chute existante (10°, 45°, couché).
//    Les copeaux au sol (bois neuf `^ * %`, petits éclats de 1 à 2 px) s'accumulent d'étape en étape : du côté de l'entaille
//    d'abord, puis du côté du trait d'abattage.
//
// Couleurs : la palette du monde (world) pour l'arbre et les copeaux (écorce M m N K, bois neuf ^ * % & @, feuillage), celle de
// Xéros (xeros-body.ts), celle des outils (toolPalette) et la traînée des gestes de combat (effectPalette de xeros-combat.ts).

import { Canvas, EMPTY, rng, selOut, type Grid, type Palette } from '../lib/canvas';
import { angleOf, heldImage, type Dir8, type Edge, type Vec, type View } from '../lib/held';
import {
  W, H, HEAD_Y, BODY_Y, FRONT_X, SIDE_X, palette as xerosPalette, DARK, headFront, headBack, torsoFront, torsoBack, legLeft,
  legRight, LEG_L, LEG_R, headSide, bodySide, legSide, LEG_SIDE, backLeg, shadow, rim, arm, bareTorso,
} from '../characters/xeros-body';
import { effectPalette } from '../characters/xeros-combat';
import { axeArt, toolPalette } from '../items/tools';
import { world } from '../palette';
import { treeBody } from '../world/normal-tree';
import { shadedOutline, groundShadow, despeckle } from '../world/big-tree';
import { FALL_W, FALL_H, FOOT, OFF, TRUNK_X0 } from '../world/normal-geometry';

export { xerosPalette, toolPalette, effectPalette, world as worldPalette };

// =====================================================================================================================
// 1. Le geste
// =====================================================================================================================

export type Dir = 'down' | 'up' | 'right';
export type GestureKey = 'use' | 'chop';
/** Les cinq temps du coup. */
export type Beat = 'armer' | 'haut' | 'abattre' | 'impact' | 'degager';
export const BEATS: Beat[] = ['armer', 'haut', 'abattre', 'impact', 'degager'];
export const BEAT_LABEL: Record<Beat, string> = {
  armer: 'armer', haut: 'temps en haut', abattre: 'abattre', impact: 'impact', degager: 'degager',
};

type ArmLayer = 'front' | 'head' | 'body';

export interface AxeFrame {
  /** Nom de l'image (sous la case de la planche). */
  name: string;
  beat: Beat;
  /** Mains jointes, dans la frame de 32 × 48. */
  hands: Vec;
  /** Prise de l'outil (la main la plus proche du fer) : sur les mains, ou décalée le long du manche. */
  grip: Vec;
  head: Dir8;
  edge: Edge;
  view: View;
  /** L'outil passe derrière le corps. */
  behind: boolean;
  /** Coudes : face et dos, gauche puis droit ; profil, le bras côté spectateur. */
  elbows: Vec[];
  arms: ArmLayer;
  /** −1 cambré, 0 droit, 1 tassé. */
  lean: number;
  /** Traînée depuis la pose de l'image précédente. */
  trail?: boolean;
}

const F = (
  name: string, beat: Beat, hands: Vec, head: Dir8, edge: Edge, behind: boolean, elbows: Vec[], lean: number,
  o: { arms?: ArmLayer; grip?: Vec; trail?: boolean; view?: View } = {},
): AxeFrame => ({
  name, beat, hands, grip: o.grip ?? hands, head, edge, view: o.view ?? 'face', behind, elbows, arms: o.arms ?? 'front', lean, trail: o.trail,
});

// Coup de côté (use), sur l'arbre debout. La cognée tourne à plat autour de Xéros (tranchant 'ccw', comme le use du jeu) :
// en garde, le fer bas devant lui ; il l'arme sur le côté puis derrière l'épaule (à hauteur de tête, corps cambré) ; elle
// part, passe du côté du spectateur, et mord le tronc à hauteur de taille ; on la retire et on revient en garde.
const USE: Record<Dir, AxeFrame[]> = {
  // de profil (l'arbre à l'est)
  right: [
    F('armer 1', 'armer', [15, 32], 'n', 'ccw', false, [[17, 35]], 0),
    F('armer 2', 'armer', [12, 28], 'nw', 'ccw', true, [[16, 31]], -1, { arms: 'head' }),
    F('en haut', 'haut', [11, 27], 'w', 'ccw', true, [[15, 30]], -1, { arms: 'head' }),
    F('abattre 1', 'abattre', [14, 33], 'sw', 'ccw', false, [[15, 35]], 0, { trail: true }),
    F('abattre 2', 'abattre', [18, 36], 'se', 'ccw', false, [[17, 36]], 0, { trail: true }),
    F('impact', 'impact', [21, 35], 'e', 'ccw', false, [[19, 35]], 1),
    F('degager 1', 'degager', [19, 34], 'e', 'ccw', false, [[18, 34]], 0),
    F('garde', 'degager', [16, 37], 'se', 'ccw', false, [[16, 36]], 0),
  ],
  // de face (l'arbre au sud) : armée à sa droite (à gauche de l'image), derrière l'épaule ; le fer revient vers nous et
  // mord le tronc devant lui, en bas à gauche
  down: [
    F('armer 1', 'armer', [11, 34], 'w', 'ccw', false, [[10, 36], [16, 37]], 0),
    F('armer 2', 'armer', [9, 30], 'nw', 'ccw', true, [[9, 33], [14, 34]], -1),
    F('en haut', 'haut', [9, 28], 'n', 'ccw', true, [[9, 32], [14, 33]], -1),
    F('abattre 1', 'abattre', [9, 33], 'w', 'ccw', false, [[9, 35], [15, 36]], 0, { trail: true }),
    F('abattre 2', 'abattre', [12, 37], 'sw', 'ccw', false, [[11, 37], [17, 38]], 0, { trail: true }),
    F('impact', 'impact', [15, 38], 'sw', 'ccw', false, [[12, 38], [19, 38]], 1, { grip: [17, 37] }),
    F('degager 1', 'degager', [14, 37], 'sw', 'ccw', false, [[12, 37], [18, 37]], 0, { grip: [15, 36] }),
    F('garde', 'degager', [13, 38], 's', 'ccw', false, [[12, 37], [18, 38]], 0),
  ],
  // de dos (l'arbre au nord) : armée à sa droite (à droite de l'image), puis rejetée en arrière, vers nous, à hauteur
  // d'épaule ; elle tourne par la droite et mord le tronc devant lui, à droite de la tête
  up: [
    F('armer 1', 'armer', [23, 34], 'e', 'ccw', false, [[13, 37], [22, 34]], 0, { arms: 'body' }),
    F('armer 2', 'armer', [23, 30], 'ne', 'ccw', true, [[13, 35], [22, 33]], -1, { arms: 'body' }),
    F('en haut', 'haut', [22, 27], 'n', 'ccw', true, [[13, 33], [23, 31]], -1, { arms: 'body' }),
    F('abattre 1', 'abattre', [24, 31], 'e', 'ccw', false, [[13, 35], [23, 33]], 0, { arms: 'body', trail: true }),
    F('abattre 2', 'abattre', [23, 35], 'se', 'ccw', false, [[13, 36], [21, 33]], 0, { arms: 'body', trail: true }),
    F('impact', 'impact', [21, 33], 'ne', 'ccw', true, [[13, 36], [21, 35]], 1, { arms: 'body' }),
    F('degager 1', 'degager', [22, 34], 'ne', 'ccw', true, [[13, 36], [22, 35]], 0, { arms: 'body' }),
    F('garde', 'degager', [22, 37], 'ne', 'ccw', true, [[13, 37], [21, 36]], 0, { arms: 'body' }),
  ],
};

// Coup de haut en bas (chop) : ébrancher, couper au sol. Vue par la tranche. Armée au-dessus de la tête, plus haut que
// l'ancien chop, corps cambré ; elle s'abat, frappe devant les pieds, le corps tassé ; on la dégage.
const E = (
  name: string, beat: Beat, hands: Vec, head: Dir8, edge: Edge, behind: boolean, elbows: Vec[], lean: number,
  o: { arms?: ArmLayer; grip?: Vec; trail?: boolean } = {},
) => F(name, beat, hands, head, edge, behind, elbows, lean, { ...o, view: 'edge' });

const CHOP: Record<Dir, AxeFrame[]> = {
  down: [
    E('armer 1', 'armer', [16, 24], 'n', 'cw', false, [[10, 28], [21, 28]], 0),
    E('armer 2', 'armer', [16, 13], 'n', 'cw', true, [[9, 22], [22, 22]], -1, { arms: 'head' }),
    E('en haut', 'haut', [16, 10], 'n', 'cw', true, [[9, 20], [22, 20]], -1, { arms: 'head' }),
    E('abattre 1', 'abattre', [16, 17], 'n', 'cw', false, [[10, 25], [21, 25]], 0, { trail: true }),
    E('abattre 2', 'abattre', [16, 32], 's', 'ccw', false, [[12, 33], [20, 33]], 0, { trail: true }),
    E('impact', 'impact', [16, 41], 's', 'ccw', false, [[12, 37], [20, 37]], 1, { grip: [16, 36] }),
    E('degager 1', 'degager', [16, 39], 's', 'ccw', false, [[12, 36], [20, 36]], 0, { grip: [16, 34] }),
    E('garde', 'degager', [16, 37], 's', 'ccw', false, [[12, 36], [20, 36]], 0, { grip: [16, 32] }),
  ],
  up: [
    E('armer 1', 'armer', [21, 24], 'n', 'cw', true, [[11, 28], [22, 27]], 0, { arms: 'body' }),
    E('armer 2', 'armer', [18, 12], 's', 'ccw', false, [[9, 21], [22, 21]], -1, { arms: 'head' }),
    E('en haut', 'haut', [18, 9], 's', 'ccw', false, [[9, 19], [22, 19]], -1, { arms: 'head' }),
    E('abattre 1', 'abattre', [21, 10], 'n', 'cw', true, [[9, 20], [23, 19]], 0, { arms: 'head', trail: true }),
    E('abattre 2', 'abattre', [23, 26], 'n', 'cw', true, [[12, 30], [22, 29]], 0, { arms: 'body', trail: true }),
    E('impact', 'impact', [24, 38], 'n', 'cw', true, [[14, 39], [20, 39]], 1, { arms: 'body', grip: [24, 40] }),
    E('degager 1', 'degager', [24, 36], 'n', 'cw', true, [[14, 38], [20, 38]], 0, { arms: 'body', grip: [24, 38] }),
    E('garde', 'degager', [23, 35], 'n', 'cw', true, [[14, 37], [20, 37]], 0, { arms: 'body', grip: [23, 36] }),
  ],
  right: [
    E('armer 1', 'armer', [18, 24], 'n', 'cw', false, [[19, 29]], 0),
    E('armer 2', 'armer', [13, 13], 'nw', 'cw', true, [[10, 22]], -1, { arms: 'head' }),
    E('en haut', 'haut', [12, 11], 'w', 'ccw', true, [[9, 21]], -1, { arms: 'head' }),
    E('abattre 1', 'abattre', [19, 15], 'ne', 'ccw', false, [[19, 23]], 0, { trail: true }),
    E('abattre 2', 'abattre', [23, 24], 'e', 'ccw', false, [[21, 29]], 0, { trail: true }),
    E('impact', 'impact', [24, 30], 'se', 'cw', false, [[21, 32]], 1, { grip: [23, 27] }),
    E('degager 1', 'degager', [23, 28], 'se', 'cw', false, [[20, 31]], 0, { grip: [22, 26] }),
    E('garde', 'degager', [21, 33], 'se', 'cw', false, [[19, 34]], 0, { grip: [20, 31] }),
  ],
};

export const GESTURES: Record<GestureKey, Record<Dir, AxeFrame[]>> = { use: USE, chop: CHOP };
export const GESTURE_TITLE: Record<GestureKey, string> = {
  use: 'coup de cognee de cote (use) : abattre l arbre debout',
  chop: 'coup de cognee de haut en bas (chop) : ebrancher, couper au sol',
};

/** Rythmes proposés (ms par temps), du modèle chiffré tools/essai-travail.ts. */
export const RHYTHMS: Record<string, Record<Beat, number>> = {
  'Xeros aujourd hui': { armer: 650, haut: 260, abattre: 290, impact: 120, degager: 600 },
  adulte: { armer: 530, haut: 210, abattre: 237, impact: 120, degager: 490 },
  'bucheron fort': { armer: 450, haut: 180, abattre: 196, impact: 120, degager: 410 },
};

/** Durée de chaque image : le temps partagé à parts égales entre ses images. */
export function frameDurations(frames: AxeFrame[], rhythm: Record<Beat, number>): number[] {
  return frames.map((f) => {
    const n = frames.filter((g) => g.beat === f.beat).length;
    return Math.round(rhythm[f.beat] / n);
  });
}

const down1 = (v: Vec, dy: number): Vec => [v[0], v[1] + dy];
const SHOULDER_L: Vec = [12, BODY_Y + 2];
const SHOULDER_R: Vec = [19, BODY_Y + 2];
const SHOULDER_SIDE: Vec = [15, BODY_Y + 2];

/** Torse de face ou de dos : cambré, une rangée de plus ; tassé, une de moins (l'ourlet reste en place). */
function leanTorso(torso: Grid, lean: number): Grid {
  if (lean < 0) return [...torso.slice(0, 5), torso[4], ...torso.slice(5)];
  if (lean === 0) return torso;
  return torso.filter((_, i) => i !== 8);
}

/** Corps de face ou de dos (même mécanique que maulFrontal de xeros.ts). */
function bodyFrontal(facing: 'down' | 'up', b: AxeFrame): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = FRONT_X;
  const legY = BODY_Y + 11;
  c.stamp(legLeft, ox + LEG_L - 1, legY);
  c.stamp(legRight, ox + LEG_R + 1, legY);
  const dy = b.lean < 0 ? -1 : b.lean;
  const torso = () => c.stamp(bareTorso(leanTorso(facing === 'down' ? torsoFront : torsoBack, b.lean)), ox, BODY_Y + dy);
  const head = () => c.stamp(facing === 'down' ? headFront : headBack, ox, HEAD_Y + dy);
  const arms = () => {
    rim(c);
    const [el, er] = b.elbows;
    arm(c, [down1(SHOULDER_L, dy), el, b.hands], 't', 'L');
    arm(c, [down1(SHOULDER_R, dy), er, b.hands], 'T', 't');
  };
  if (b.arms === 'body') arms();
  torso();
  if (b.arms === 'head') arms();
  head();
  if (b.arms === 'front') arms();
  rim(c);
  return selOut(c.toGrid(), DARK);
}

/** Corps de profil droit (même mécanique que maulSide de xeros.ts). */
function bodySideView(b: AxeFrame): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = SIDE_X;
  const legY = BODY_Y + 11;
  c.stamp(backLeg(legSide), ox + LEG_SIDE[0] - 1, legY);
  c.stamp(legSide, ox + LEG_SIDE[1] + 1, legY);
  const shift = b.lean < 0 ? [-1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0]
    : b.lean >= 1 ? [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] : Array(12).fill(0);
  const body = bodySide.map((row, y) => (shift[y] >= 0 ? '.'.repeat(shift[y]) + row : row.slice(-shift[y]) + '.'.repeat(-shift[y])));
  const headDx = b.lean < 0 ? -1 : b.lean;
  const headDy = b.lean >= 1 ? 1 : 0;
  const shoulder: Vec = [SHOULDER_SIDE[0] + shift[2], SHOULDER_SIDE[1] + headDy];
  const arms = () => {
    rim(c);
    arm(c, [shoulder, b.elbows[0], b.hands], 't', 'L');
  };
  c.stamp(body, ox, BODY_Y);
  if (b.arms !== 'front') arms();
  c.stamp(headSide, ox + headDx, HEAD_Y + headDy);
  if (b.arms === 'front') arms();
  rim(c);
  return selOut(c.toGrid(), DARK);
}

export const bodyFrame = (dir: Dir, f: AxeFrame): Grid => (dir === 'right' ? bodySideView(f) : bodyFrontal(dir, f));

const AXE = axeArt();
/** L'image de la cognée (48 × 48, prise au centre), dans la pose de l'image. */
export const toolFrame = (f: AxeFrame): Grid => heldImage(AXE, f.head, f.edge, f.view);

/** Distance de la prise au fer, en pixels (la cognée tenue : 18 px de la prise au fer, art/lib/held.ts). */
const REACH = 18;

/**
 * Traînée du fer, de la pose `a` à la pose `b` (tournant dans le sens 'ccw' de l'écran, ou en ligne si l'outil est vu
 * par la tranche), en coordonnées de la frame du corps : une grille de W_T × H_T posée en (-TRAIL_PAD, -TRAIL_PAD).
 * Trois transparences (effectPalette : 1 presque plein, 2, 3 la queue), la plus pleine près de l'image d'arrivée.
 */
export const TRAIL_PAD = 24;
export function trailFrame(a: AxeFrame, b: AxeFrame): Grid {
  const c = new Canvas(W + 2 * TRAIL_PAD, H + 2 * TRAIL_PAD);
  const a0 = angleOf(a.head);
  let a1 = angleOf(b.head);
  const edgeView = b.view === 'edge';
  // sens de rotation : le plus court ; par la tranche, un demi-tour (la cognée passe par-dessus la tête, vue de face ou de
  // dos) est une chute droite : la traînée est une ligne, du fer de départ au fer d'arrivée
  let delta = ((a1 - a0) % 360 + 360) % 360;
  if (delta > 180) delta -= 360;
  a1 = a0 + delta;
  const line = edgeView && (Math.abs(delta) >= 179 || delta === 0);
  if (line) {
    const tip = (f: AxeFrame, r: number): Vec => {
      const g = (angleOf(f.head) * Math.PI) / 180;
      return [f.grip[0] + Math.cos(g) * REACH * r, f.grip[1] - Math.sin(g) * REACH * r];
    };
    const p0 = tip(a, 0.85);
    const p1 = tip(b, 0.85);
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      for (const dx of [-1, 0, 1]) {
        const x = Math.round(p0[0] + (p1[0] - p0[0]) * t) + dx + TRAIL_PAD;
        const y = Math.round(p0[1] + (p1[1] - p0[1]) * t) + TRAIL_PAD;
        const k = dx !== 0 ? (t > 0.5 ? '2' : '3') : t > 0.6 ? '1' : t > 0.3 ? '2' : '3';
        const old = c.get(x, y);
        if (old === EMPTY || old > k) c.set(x, y, k);
      }
    }
    return c.toGrid();
  }
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const hx = a.grip[0] + (b.grip[0] - a.grip[0]) * t;
    const hy = a.grip[1] + (b.grip[1] - a.grip[1]) * t;
    const ang = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
    for (let r = 0.72 - 0.2 * t; r <= 1.0001; r += 0.04) {
      const x = Math.round(hx + Math.cos(ang) * REACH * r) + TRAIL_PAD;
      const y = Math.round(hy - Math.sin(ang) * REACH * r) + TRAIL_PAD;
      const k = t > 0.66 ? '1' : t > 0.33 ? '2' : '3';
      const old = c.get(x, y);
      if (old === EMPTY || old > k) c.set(x, y, k);
    }
  }
  return c.toGrid();
}

// =====================================================================================================================
// 2. L'abattage
// =====================================================================================================================

/** Les étapes de l'arbre, dans l'ordre. */
export type Stage = 'intact' | 'entaille 1/3' | 'entaille 2/3' | 'entaille 3/3' | 'trait d abattage' | 'craquement' | 'penche 1' | 'penche 2';
export const STAGES: Stage[] = ['intact', 'entaille 1/3', 'entaille 2/3', 'entaille 3/3', 'trait d abattage', 'craquement', 'penche 1', 'penche 2'];

/** Plancher de l'entaille (rangée du repère de l'arbre debout) : juste sous la coupe de la chute (CUT_Y = 148). */
const FLOOR = 149;
/** Dernière colonne d'écorce, côté droit (l'entaille), et première, côté gauche (le trait d'abattage). */
const RIGHT = TRUNK_X0 + 5;
const LEFT = TRUNK_X0;

interface Notch { depth: number; open: number }
const NOTCH: Record<number, Notch> = { 1: { depth: 2, open: 3 }, 2: { depth: 3, open: 4 }, 3: { depth: 3, open: 6 } };

/**
 * Creuse l'entaille de direction (côté droit) : V à plancher horizontal. Le bord du tronc perd un pixel (la silhouette
 * s'échancre) ; dans le V, le creux à l'ombre (`@`, `&`) ; la face haute, en pente, tournée vers le bas (`%`) ; le
 * plancher, horizontal, au soleil (`^`), qui dépasse d'un pixel à gauche du V (la face sud de l'entaille, qui s'enroule
 * autour du tronc).
 */
function notch(c: Canvas, n: Notch) {
  const top = FLOOR - n.open;
  for (let y = top; y < FLOOR; y++) {
    const d = Math.max(1, Math.round((n.depth * (y - top + 1)) / n.open));
    for (let k = 0; k < d; k++) {
      const x = RIGHT - k;
      // le bord : vide (échancrure) ; dedans : le creux, plus sombre au fond ; la dernière colonne : la face haute
      c.px[y][x] = d === 1 ? '&' : k === 0 ? EMPTY : k === d - 1 ? '%' : y === FLOOR - 1 ? '&' : '@';
    }
  }
  for (let k = 0; k <= n.depth; k++) c.px[FLOOR][RIGHT - k] = k === n.depth ? '*' : '^';
  c.px[FLOOR - 1][RIGHT - n.depth] = '^';
}

/** Le trait d'abattage (côté gauche, une rangée au-dessus du plancher) : une morsure et la saignée, `reach` px de long. */
function backCut(c: Canvas, reach: number, open: boolean) {
  const y = FLOOR - 1;
  c.px[y][LEFT] = EMPTY;
  c.px[y - 1][LEFT] = EMPTY;
  c.px[y + 1][LEFT] = '^';
  for (let x = LEFT + 1; x < LEFT + reach; x++) c.px[y][x] = '@';
  c.px[y - 1][LEFT + 1] = '%';
  if (open) {
    // la saignée s'ouvre en coin : le haut du tronc a commencé à basculer
    c.px[y - 1][LEFT + 1] = '&';
    c.px[y - 2][LEFT] = EMPTY;
  }
}

/** La fente du craquement : une ligne sombre qui monte dans le tronc depuis la saignée. */
function crack(c: Canvas) {
  const pts: Vec[] = [[LEFT + 3, FLOOR - 2], [LEFT + 3, FLOOR - 3], [LEFT + 2, FLOOR - 4], [LEFT + 2, FLOOR - 5], [LEFT + 2, FLOOR - 6]];
  for (const [x, y] of pts) c.px[y][x] = '&';
}

/** Le haut de l'arbre (au-dessus de la coupe) pivoté de `deg` degrés vers la droite autour de la charnière. */
function lean(body: Canvas, deg: number): Canvas {
  const out = new Canvas(body.w, body.h);
  const hinge: Vec = [RIGHT - 1 + 0.5, FLOOR];
  const t = (deg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  // le pied (sous la coupe) ne bouge pas
  for (let y = FLOOR - 1; y < body.h; y++) for (let x = 0; x < body.w; x++) out.px[y][x] = body.px[y][x];
  // le haut : chaque pixel de l'image prend celui de l'arbre debout, tourné en sens inverse autour de la charnière
  for (let y = 0; y < body.h; y++) for (let x = 0; x < body.w; x++) {
    const u = x + 0.5 - hinge[0];
    const v = y + 0.5 - hinge[1];
    const sx = Math.floor(hinge[0] + u * cos + v * sin);
    const sy = Math.floor(hinge[1] - u * sin + v * cos);
    if (sy >= FLOOR - 1 || sx < 0 || sx >= body.w || sy < 0) continue;
    const p = body.px[sy][sx];
    if (p !== EMPTY) out.px[y][x] = p;
  }
  return out;
}

/** Copeaux au sol : [dx, dy, forme] depuis le pied du tronc ; forme 0 : un point, 1 : deux en long, 2 : deux en travers. */
type Chip = [number, number, number];
function chipsFor(stage: number): Chip[] {
  const out: Chip[] = [];
  // côté de l'entaille (à droite), de plus en plus nombreux
  const right = [0, 4, 8, 12, 13, 13, 13, 13][stage];
  const left = [0, 0, 0, 0, 4, 6, 6, 6][stage];
  const r = rng(77);
  const spot = (side: 1 | -1, i: number): Chip => {
    const d = 4 + Math.floor(i * 0.45 + r() * 3);
    return [side * d, -1 + Math.floor(r() * 3), Math.floor(r() * 3)];
  };
  for (let i = 0; i < 13; i++) {
    const c = spot(1, i);
    if (i < right) out.push(c);
  }
  for (let i = 0; i < 6; i++) {
    const c = spot(-1, i);
    if (i < left) out.push([c[0] - 1, c[1], c[2]]);
  }
  return out;
}

function drawChips(c: Canvas, foot: Vec, stage: number) {
  for (const [dx, dy, form] of chipsFor(stage)) {
    const x = foot[0] + dx;
    const y = foot[1] + dy;
    if (form === 1) { c.set(x, y, '^'); c.set(x + 1, y, '*'); }
    else if (form === 2) { c.set(x, y, '^'); c.set(x, y + 1, '%'); }
    else c.set(x, y, '^');
  }
}

/** Éclats qui sautent au craquement (en l'air, côté gauche). */
function splinters(c: Canvas, ox: number) {
  const pts: [number, number, string][] = [
    [LEFT - 3, FLOOR - 3, '^'], [LEFT - 4, FLOOR - 3, '*'], [LEFT - 6, FLOOR - 6, '^'], [LEFT - 3, FLOOR - 8, '^'], [LEFT - 2, FLOOR - 8, '*'],
  ];
  for (const [x, y, k] of pts) c.set(x + ox, y, k);
}

/**
 * Une étape de l'abattage, dans une image de FALL_W × FALL_H (celle de la chute `normal-tree-fall`, l'arbre debout posé en
 * (OFF, 0)) : on enchaîne sur la chute sans que rien saute.
 */
export function stageFrame(stage: Stage): Canvas {
  const i = STAGES.indexOf(stage);
  let body = treeBody();
  if (i >= 1) notch(body, NOTCH[Math.min(i, 3)]);
  if (i >= 4) backCut(body, i >= 5 ? 4 : 3, i >= 6);
  if (i >= 5) crack(body);
  if (i >= 6) body = lean(body, i === 6 ? 2 : 5);
  despeckle(body, 'K^*%&@');
  const c = new Canvas(FALL_W, FALL_H).stamp(body.toGrid(), OFF, 0);
  shadedOutline(c);
  groundShadow(c, FOOT[0] + OFF + 2, FOOT[1] + 0.5, 9, 2.4);
  if (i >= 6) groundShadow(c, FOOT[0] + OFF + 10, FOOT[1] + 1, 12, 2.4);
  drawChips(c, [FOOT[0] + OFF, FOOT[1] + 1], i);
  if (i === 5) splinters(c, OFF);
  return c;
}

/** Pour la planche : l'étape recadrée, de la colonne `x0` sur `w` colonnes. */
export function crop(c: Canvas, x0: number, w: number, y0 = 0, h = c.h): Grid {
  return c.toGrid().slice(y0, y0 + h).map((row) => row.slice(x0, x0 + w));
}

export const STAGE_PALETTE: Palette = world;
