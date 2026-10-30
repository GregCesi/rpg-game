// Objets tenus hors des gestes : à l'attente et à la marche (une main, art/characters/xeros.ts HAND_POINTS), sur
// l'épaule (shoulder-*, SHOULDER_POINTS) ou à deux mains (carry-*, CARRY_HANDS). Une planche `held-<objet>` par objet,
// trois animations d'une image : `down`, `up`, `right` (la gauche est le miroir de la droite, le jeu retourne l'image).
// Le jeu pose le centre de l'image (arrondi vers le bas) sur le point d'accroche : c'est la prise de la main.
// Toutes les images d'une planche ont la même taille, impaire, pour que le centre soit un pixel et que le miroir le
// garde en place. Échelle du jeu (5 cm par pixel), lumière en haut à gauche.

import { Canvas, EMPTY, type Grid, type Palette } from '../lib/canvas';
import { orientedZones, gripOf } from '../lib/held';
import { lightUp, type Materials } from '../lib/light';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import felled from '../world/big-felled';
import { logByTheEnd } from '../world/wood';
import { darkest, outline } from './lib';
import { branchBody, finishBranch, shearDown, transpose, type Branch } from './branch';
import { axeArt, toolPalette } from './tools';
import xeros, { SHOULDER_POINTS } from '../characters/xeros';
import { bundleByTheEnd, faggotBody, outlineBundle } from '../world/faggot';

type View = 'down' | 'up' | 'right';

function sheet(name: string, size: number, palette: Palette, views: Record<View, Grid>): SpriteSheetSource {
  const animations: SpriteSheetSource['animations'] = {};
  for (const v of ['down', 'up', 'right'] as const) {
    const g = views[v];
    if (g.length !== size || g.some((r) => r.length !== size)) throw new Error(`carried : ${name}-${v} n'est pas de ${size}×${size}`);
    animations[v] = { frames: [g], frameRate: 1, repeat: 0 };
  }
  return { kind: 'spritesheet', name, frameW: size, frameH: size, palette, animations };
}

/** Efface le poing (3 × 3 autour du centre) : la main du corps, dessous, se voit à travers et serre le manche. */
function fistGap(g: Grid, c: number, cells: [number, number][]): Grid {
  const out = Canvas.from(g);
  for (const [dx, dy] of cells) out.set(c + dx, c + dy, EMPTY);
  return out.toGrid();
}

// ---------- Hache sur l'épaule ----------
// La hache de bûcheron (art/items/tools.ts) : manche de 18 px de la prise au fer, le fer presque noir à fil clair.
// Le poing droit la tient près du bout du manche, devant la poitrine ; le manche passe sur l'épaule ; le fer est
// derrière l'épaule, au-dessus. De profil, on voit la face du fer (comme au coup horizontal) ; de face et de dos, le
// plan du fer contient le manche et passe dans l'axe du regard : on le voit par la tranche (bloc étroit et sombre).

const AXE_SIZE = 45;
const AXE_C = Math.floor(AXE_SIZE / 2);

/**
 * La hache par la tranche, manche presque debout qui penche vers le dehors (vers la gauche de l'image ; `mirror` :
 * vers la droite), en zones de tools.ts. `from` : première rangée dessinée, en pixels au-dessus de la prise
 * (de dos, ce qui est sous l'épaule est caché par le corps).
 */
function axeEdgeZones(mirror: boolean, from = -3): Canvas {
  const c = new Canvas(AXE_SIZE, AXE_SIZE);
  const lean = 0.45; // pixels vers le dehors par rangée qui monte
  const BLOCK = [15, 19]; // rangées du bloc de fer au-dessus de la prise
  for (let up = Math.max(from, -3); up <= BLOCK[1] + 1; up++) {
    const off = Math.round(up * lean);
    const x0 = mirror ? AXE_C + off : AXE_C - off; // pixel gauche du manche (2 px)
    const y = AXE_C - up;
    if (up >= BLOCK[0] && up <= BLOCK[1]) {
      for (let k = -1; k <= 2; k++) c.set(x0 + k, y, 'f');
      continue;
    }
    const z = up === BLOCK[1] + 1 || up === -3 ? 'N' : up <= 1 ? 'w' : 'M';
    c.set(x0, y, z).set(x0 + 1, y, z);
  }
  return c;
}

/** La hache de profil, tête vers le haut à gauche (derrière son dos), tranchant vers le haut. */
function axeSide(): Canvas {
  const art = axeArt();
  const zones = orientedZones(art, 'nw', 'cw');
  const [gx, gy] = gripOf('nw', 'cw');
  return new Canvas(AXE_SIZE, AXE_SIZE).stamp(zones, AXE_C - gx, AXE_C - gy);
}

const FIST: [number, number][] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

/**
 * Le manche passe derrière la tête : on efface de l'image ce que la tête de Xéros recouvre dans la posture
 * shoulder-idle-<vue> (la tête et le point suivent ensemble le rebond de la marche, si bien que l'effacement vaut pour
 * toutes les images).
 */
function behindHead(g: Grid, view: View): Grid {
  const frame = xeros.animations[`shoulder-idle-${view}`].frames[0];
  const { dx, dy } = SHOULDER_POINTS[view].idle;
  const out = Canvas.from(g);
  for (let y = 0; y < AXE_SIZE; y++) for (let x = 0; x < AXE_SIZE; x++) {
    const fx = 16 + dx + x - AXE_C, fy = 48 + dy + y - AXE_C;
    if (fy >= HEAD_BOTTOM) continue;
    const k = frame[fy]?.[fx];
    if (k && k !== EMPTY) out.set(x, y, EMPTY);
  }
  return out.toGrid();
}
/** Première rangée sous la tête de Xéros, dans sa frame. */
const HEAD_BOTTOM = 30;

const heldAxe = (): SpriteSheetSource => {
  const m: Materials = axeArt().materials;
  return sheet('held-axe', AXE_SIZE, toolPalette, {
    down: behindHead(fistGap(lightUp(axeEdgeZones(false).toGrid(), m), AXE_C, FIST), 'down'),
    up: lightUp(axeEdgeZones(true, 4).toGrid(), m),
    right: behindHead(fistGap(lightUp(axeSide().toGrid(), m), AXE_C, FIST), 'right'),
  });
};

// ---------- Branche ----------
// La branche sèche du tas et du sol (art/items/branch.ts) : mêmes matières, gros bout cassé clair, tige, rameaux, 1,1 à
// 1,4 m. Xéros la tient par le gros bout, le bout cassé dépassant de deux pixels derrière le poing, la pointe qui
// descend en avant vers le sol.
// - De profil : la branche entière (24 px, 1,2 m), penchée d'un pixel tous les quatre, la pointe près du sol devant lui.
// - De face : elle vient vers nous et descend ; vue presque dans l'axe, elle se raccourcit (18 px), dressée, la pointe
//   en bas, posée au sol devant ses pieds ; le bout cassé dépasse au-dessus du poing.
// - De dos : elle s'éloigne et descend devant lui, raccourcie (10 px), cachée par le corps (l'image passe dessous) ; on
//   voit le bout cassé sous le poing, et ce qui déborde de la silhouette.

const BRANCH_SIZE = 47;
const BRANCH_C = Math.floor(BRANCH_SIZE / 2);

const HELD_BRANCH: Record<View, Branch> = {
  right: { len: 24, thickLeft: true, thick: 9, seed: 61, twigs: [{ at: 0.4, up: true, len: 6, fork: true }, { at: 0.7, up: false, len: 3 }] },
  down: { len: 18, thickLeft: true, thick: 7, seed: 62, twigs: [{ at: 0.4, up: true, len: 5, fork: true }, { at: 0.65, up: false, len: 3 }] },
  up: { len: 10, thickLeft: false, thick: 5, seed: 63, twigs: [{ at: 0.5, up: true, len: 4 }, { at: 0.6, up: false, len: 3 }] },
};

/** Le poing (2 × 2 ; le point d'accroche est son pixel du bas côté extérieur) se voit par-dessus la tige. */
const BRANCH_FIST: [number, number][] = [[0, 0], [1, 0], [0, -1], [1, -1]];

function heldBranchView(view: View): Grid {
  const C = BRANCH_C, S = BRANCH_SIZE;
  const b = HELD_BRANCH[view];
  if (view === 'right') {
    // gros bout sur les deux rangées du poing (M en C-1, m en C), le bout cassé deux pixels derrière
    const body = shearDown(branchBody(b, C - 2, S, S, C + 1), C, 4);
    return fistGap(finishBranch(body).toGrid(), C, BRANCH_FIST);
  }
  // dressée : le gros bout sur les deux colonnes du poing (M en C, m en C+1)
  const x0 = view === 'down' ? C - 2 : C + 2 - b.len; // de dos, le gros bout en bas, vers nous
  const body = transpose(branchBody(b, x0, S, S, C + 2));
  const g = finishBranch(body).toGrid();
  return view === 'down' ? fistGap(g, C, BRANCH_FIST) : g;
}

const heldBranch = (): SpriteSheetSource =>
  sheet('held-branch', BRANCH_SIZE, world, { down: heldBranchView('down'), up: heldBranchView('up'), right: heldBranchView('right') });

// ---------- Bille portée ----------
// La bille big-felled-log-1 (art/world/big-felled.ts) portée à deux mains devant lui. De face et de dos, en longueur : la
// bille couchée elle-même, sans son ombre au sol. De profil, on la voit par le bout, comme la bille nord-sud du tas :
// la face de coupe (11 px de diamètre, 55 cm), son cerne et l'écorce autour, le dessus de l'écorce qui fuit derrière.

const LOG_SIZE = 25;
const LOG_C = Math.floor(LOG_SIZE / 2);

function logLengthwise(): Grid {
  const src = (felled as (ImageSource | SpriteSheetSource)[]).find((s) => s.name === 'big-felled-log-1');
  if (!src || src.kind !== 'image') throw new Error('carried : big-felled-log-1 introuvable');
  const body = src.grid.map((r) => r.replace(/x/g, EMPTY)).filter((r) => /[^.]/.test(r));
  const c = new Canvas(LOG_SIZE, LOG_SIZE);
  // le milieu de la bille sur la prise
  c.stamp(body, LOG_C - Math.floor(body[0].length / 2), LOG_C - Math.floor(body.length / 2));
  return c.toGrid();
}

/**
 * Par le bout : la bille nord-sud du tas, raccourcie (la matière commune de art/world/wood.ts) : la face de coupe ovale
 * de 11 × 9 px (55 cm), cerclée d'écorce, son cerne et son cœur ; au-dessus, le dessus de l'écorce qui fuit derrière
 * elle (la bille s'éloigne de nous), éclairé à gauche, et le bord du bout lointain. La face est sous la prise : les
 * mains la tiennent par-dessous.
 */
function logEnd(): Grid {
  const c = logByTheEnd(new Canvas(LOG_SIZE, LOG_SIZE), LOG_C + 0.5, LOG_C - 2.5, LOG_C + 2.5, 5.5, 4.5);
  return outline(c, darkest({ M: 'K', m: 'K', N: 'K', K: 'K', Y: 'N', t: 'N', T: 'N' }, 'o')).toGrid();
}

const heldFelledLog = (): SpriteSheetSource => {
  const lengthwise = logLengthwise();
  return sheet('held-big-felled-log', LOG_SIZE, world, { down: lengthwise, up: lengthwise, right: logEnd() });
};

// ---------- Rouleau de corde ----------
// Le rouleau (art/items/rope.ts, Ø 30 cm, 10 cm d'épaisseur) pend au poing, le long de la jambe : la main le tient par
// le haut de l'anneau. De profil, on le voit à plat : un anneau de 6 px, le creux au milieu, éclairé en haut à gauche.
// De face et de dos, par la tranche : un ovale étroit de 4 × 6 px. Le poing (2 × 2, le point d'accroche est son pixel
// du bas côté extérieur) passe par-dessus le haut de l'anneau.

const COIL_SIZE = 15;
const COIL_C = Math.floor(COIL_SIZE / 2);

const COIL_FLAT: Grid = [
  '.XXXX.',
  'XJJOOo',
  'XJ..Oo',
  'XO..Co',
  'XOCCCo',
  '.oooo.',
];
const COIL_EDGE: Grid = [
  '.XX.',
  'XJOo',
  'XJOo',
  'XJCo',
  'XOCo',
  '.oo.',
];

function heldCoilView(view: View): Grid {
  const C = COIL_C;
  const c = new Canvas(COIL_SIZE, COIL_SIZE);
  // le haut de l'anneau dans le poing (rangées C − 1 et C)
  if (view === 'right') c.stamp(COIL_FLAT, C - 2, C - 1);
  else c.stamp(COIL_EDGE, C - 1, C - 1);
  return view === 'up' ? c.toGrid() : fistGap(c.toGrid(), C, BRANCH_FIST);
}

const heldRopeCoil = (): SpriteSheetSource =>
  sheet('held-rope-coil', COIL_SIZE, world, { down: heldCoilView('down'), up: heldCoilView('up'), right: heldCoilView('right') });

// ---------- Lien ----------
// L'écheveau plié (2 m de corde, art/items/rope.ts) pend du poing : un faisceau de brins de 10 px, serré de quelques
// tours (C) sous la main, ouvert en deux boucles en bas. De profil, les deux boucles s'écartent un peu.

const TIE_FRONT: Grid = [
  '.XX.',
  'XJOo',
  'XJOo',
  'XCCo',
  'XJOo',
  'XJOo',
  'XJOo',
  'XJCo',
  'XJCo',
  '.Oo.',
  '..o.',
];
const TIE_SIDE: Grid = [
  '.XX..',
  'XJOo.',
  'XJOo.',
  'XCCo.',
  'XJOo.',
  'XJoOo',
  'XJ.Oo',
  'XJ.Oo',
  'XJoOo',
  '.OoCo',
  '..oo.',
];

const TIE_SIZE = 19;

function heldTieView(view: View): Grid {
  const C = Math.floor(TIE_SIZE / 2);
  const c = new Canvas(TIE_SIZE, TIE_SIZE);
  c.stamp(view === 'right' ? TIE_SIDE : TIE_FRONT, C - 1, C - 2);
  return view === 'up' ? c.toGrid() : fistGap(c.toGrid(), C, BRANCH_FIST);
}

const heldRopeTie = (): SpriteSheetSource =>
  sheet('held-rope-tie', TIE_SIZE, world, { down: heldTieView('down'), up: heldTieView('up'), right: heldTieView('right') });

// ---------- Fagot porté ----------
// Le fagot (art/world/faggot.ts) porté à deux mains devant lui, comme la bille. De face et de dos, en longueur : le
// fagot est-ouest sans son ombre. De profil, par le bout : la face des gros bouts (10 × 9 px, moins aplatie qu'au sol,
// il est à hauteur de poitrine), le dessus du faisceau qui fuit derrière, le lien en travers.

const FAGGOT_SIZE = 29;
const FAGGOT_C = Math.floor(FAGGOT_SIZE / 2);

function faggotLengthwise(): Grid {
  const body = faggotBody().toGrid().filter((r) => /[^.]/.test(r));
  const c = new Canvas(FAGGOT_SIZE, FAGGOT_SIZE);
  // le milieu du faisceau (sans ses rameaux, deux rangées au-dessus) sur la prise
  c.stamp(body, FAGGOT_C - Math.floor(body[0].length / 2), FAGGOT_C - 1 - Math.floor((body.length - 2) / 2));
  return c.toGrid();
}

function faggotEnd(): Grid {
  const C = FAGGOT_C;
  const c = bundleByTheEnd(new Canvas(FAGGOT_SIZE, FAGGOT_SIZE), C + 1, C - 3, C + 2, 4, 3.5, C - 4, 84);
  return outlineBundle(c).toGrid();
}

const heldFaggot = (): SpriteSheetSource => {
  const lengthwise = faggotLengthwise();
  return sheet('held-faggot', FAGGOT_SIZE, world, { down: lengthwise, up: lengthwise, right: faggotEnd() });
};

export default [heldAxe(), heldBranch(), heldFelledLog(), heldRopeCoil(), heldRopeTie(), heldFaggot()];
