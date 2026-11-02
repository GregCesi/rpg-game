// Objets tenus hors des gestes : à l'attente et à la marche (une main, art/characters/xeros.ts HAND_POINTS), sur
// l'épaule (shoulder-*, SHOULDER_POINTS) ou à deux mains (carry-*, CARRY_HANDS). Une planche `held-<objet>` par objet,
// trois animations d'une image : `down`, `up`, `right` (la gauche est le miroir de la droite, le jeu retourne l'image).
// Le jeu pose le centre de l'image (arrondi vers le bas) sur le point d'accroche : c'est la prise de la main.
// Toutes les images d'une planche ont la même taille, impaire, pour que le centre soit un pixel et que le miroir le
// garde en place. Échelle du jeu (5 cm par pixel), lumière en haut à gauche.

import { Canvas, EMPTY, type Grid, type Palette } from '../lib/canvas';
import { orientedZones, gripOf } from '../lib/held';
import { lightUp, type Materials } from '../lib/light';
import type { SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { DARKER, DIAMETER, NORMAL_WOOD, bark, faceTone, logByTheEnd, logEnd } from '../world/wood';
import { despeckle, shadedOutline } from '../world/big-tree';
import { darkest, outline } from './lib';
import { branchBody, finishBranch, shearDown, transpose, type Branch } from './branch';
import { axeArt, toolPalette } from './tools';
import xeros, { SHOULDER_POINTS } from '../characters/xeros';
import { FAGGOT_BRANCHES, FAGGOT_COUNTS, bundleByTheEnd, faggotBody, faggotDims, outlineBundle } from '../world/faggot';
import { lyingCanvas } from '../world/wood-pieces';
import { lyingView } from '../world/wood-section';

type View = 'down' | 'up' | 'right';

export function sheet(name: string, size: number, palette: Palette, views: Record<View, Grid>): SpriteSheetSource {
  const animations: SpriteSheetSource['animations'] = {};
  for (const v of ['down', 'up', 'right'] as const) {
    const g = views[v];
    if (g.length !== size || g.some((r) => r.length !== size)) throw new Error(`carried : ${name}-${v} n'est pas de ${size}×${size}`);
    animations[v] = { frames: [g], frameRate: 1, repeat: 0 };
  }
  return { kind: 'spritesheet', name, frameW: size, frameH: size, palette, animations };
}

/** Efface le poing (3 × 3 autour du centre) : la main du corps, dessous, se voit à travers et serre le manche. */
export function fistGap(g: Grid, c: number, cells: [number, number][]): Grid {
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

export const FIST: [number, number][] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

/**
 * Le manche passe derrière la tête : on efface de l'image ce que la tête de Xéros recouvre dans la posture
 * shoulder-idle-<vue> (la tête et le point suivent ensemble le rebond de la marche, si bien que l'effacement vaut pour
 * toutes les images).
 */
export function behindHead(g: Grid, view: View): Grid {
  const frame = xeros.animations[`shoulder-idle-${view}`].frames[0];
  const { dx, dy } = SHOULDER_POINTS[view].idle;
  const out = Canvas.from(g);
  const size = g.length, c = Math.floor(size / 2);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = 16 + dx + x - c, fy = 48 + dy + y - c;
    if (fy >= HEAD_BOTTOM) continue;
    const k = frame[fy]?.[fx];
    if (k && k !== EMPTY) out.set(x, y, EMPTY);
  }
  return out.toGrid();
}
/** Première rangée sous la tête de Xéros, dans sa frame. */
const HEAD_BOTTOM = 29;

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
export const BRANCH_FIST: [number, number][] = [[0, 0], [1, 0], [0, -1], [1, -1]];

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

// ---------- Pièce de bois portée ----------
// La pièce de bois (src/content/wood.json : diamètre `big` ou `normal`, aspect) portée à deux mains devant lui (posture
// `carry`), dans le sens de la marche. Une planche `held-wood-<diamètre>-<aspect>` par aspect, image carrée de 25 px.
// - De face (`down`) et de dos (`up`), par le bout : la face de coupe (ou la section dressée) sous les mains, le dessus
//   qui fuit derrière elle en raccourci, comme la pièce nord-sud au sol, plus courte (elle s'éloigne vers le haut de
//   l'écran) ; la même vue quelle que soit la longueur. De dos, le jeu la glisse sous le corps : on n'en voit que ce qui
//   dépasse.
// - De profil (`right`), en long : la pièce couchée est-ouest, sans ombre, ici pour 1 m (20 px contour compris), le
//   milieu sur la prise ; le jeu la remplace par la pièce assemblée à sa vraie longueur. Le bout éclairé (la face de
//   coupe) est à gauche, contre Xéros.
// Matière commune (art/world/wood.ts) : écorce M m N K éclairée en haut à gauche, sillons en long ; le bois mis à nu (bois de
// bout, bois de fente, faces dressées, rondin écorcé) dans la rampe du bois travaillé (^ * % &, art/palette.ts `woodAges`, ici
// neuve), fibres en long. Contour : K côté lumière, o côté ombre.
// Ces dessins ne dépendent pas des planches au sol (art/world/wood-pieces.ts) : ils reprennent la matière de wood.ts et
// les tracés de l'ancienne bille portée, de la demi-bille et du quartier (split.ts), du rondin et de la poutre (timber.ts).

const WOOD_SIZE = 25;
const WC = Math.floor(WOOD_SIZE / 2);
/** Longueur de l'aperçu de profil : 1 m, 20 px contour compris. */
const PREVIEW_LEN = 20;
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Recadre une silhouette (sans ombre) sur ses pixels pleins. */
function trim(g: Grid): Grid {
  const rows = g.map((r) => r.replace(/x/g, EMPTY)).filter((r) => /[^.]/.test(r));
  const x0 = Math.min(...rows.map((r) => r.search(/[^.]/)));
  const x1 = Math.max(...rows.map((r) => r.length - 1 - [...r].reverse().join('').search(/[^.]/)));
  return rows.map((r) => r.slice(x0, x1 + 1));
}

/** `g` dans l'image de la pièce portée, son milieu (ou la rangée `gripRow` de `g`) sur la prise. */
function onGrip(g: Grid, gripRow = Math.floor(g.length / 2)): Grid {
  return new Canvas(WOOD_SIZE, WOOD_SIZE).stamp(g, WC - Math.floor(g[0].length / 2), WC - gripRow).toGrid();
}

/**
 * Bois frais de la fente, sur une face plate : `along` le long de la pièce, `across` en travers (0 côté lumière). Fond t,
 * le bord côté lumière en Y ; fibres : tirets Y un couloir sur deux, de périodes différentes, et çà et là une fibre
 * arrachée (T) ; jamais de cerne. (Le bois de fente de split.ts.)
 */
function splitWood(along: number, across: number): string {
  const a = Math.floor(along);
  if (across === 0) return '^';
  const lanes: [number, number, number][] = [[9, 5, 2], [13, 4, 8], [11, 6, 5], [12, 3, 0], [10, 5, 7]];
  const [p, n, ph] = lanes[across % lanes.length];
  const pos = mod(a + ph, p);
  if (across % 2 === 1 && pos < n) return '^';
  if (across % 2 === 0 && pos === Math.floor(p / 2)) return '%';
  return '*';
}

// ----- Gros bois (55 cm) -----

/** Rond, par le bout : la bille nord-sud raccourcie, face de coupe de 11 × 9 sous les mains (l'ancienne vue de profil). */
function bigRoundEnd(): Grid {
  const c = logByTheEnd(new Canvas(WOOD_SIZE, WOOD_SIZE), WC + 0.5, WC - 2.5, WC + 2.5, 5.5, 4.5);
  return outline(c, darkest({ M: 'K', m: 'K', N: 'K', K: 'K', '^': 'K', '*': 'K', '%': 'K' }, 'o')).toGrid();
}

/** Rond, en long : 18 px d'écorce entre deux contours, 11 de diamètre, la face de coupe à gauche, l'écorce enroulée à droite. */
function bigRoundLong(): Grid {
  const len = PREVIEW_LEN - 2;
  const c = new Canvas(len + 4, 15);
  for (let Y = 1; Y <= DIAMETER; Y++) for (let X = 1; X <= len; X++) c.set(X, Y, bark(X + 30, (Y - 1 + 0.5) / DIAMETER));
  logEnd(c, 1, 'left', 1 + DIAMETER / 2, true);
  logEnd(c, len + 1, 'right', 1 + DIAMETER / 2, false);
  despeckle(c, 'K^%*N');
  return onGrip(trim(shadedOutline(c).toGrid()));
}

/**
 * Demi-bille en long (le tracé de la demi-bille couchée, split.ts, sans ombre) : la face de fente en
 * haut (rangées 1 à `top`, la première est le liseré d'écorce du bord), le dos d'écorce dessous jusqu'à `bottom`, ses
 * bouts arrondis en demi-ovale (`endA` de large) ; le bout gauche montre le bois de bout, le droit l'écorce enroulée.
 */
function bigFlatLong(top: number, bottom: number, endA: number): Grid {
  const x1 = PREVIEW_LEN - 2;
  const c = new Canvas(x1 + 3, bottom + 3);
  const back = bottom - top;
  for (let X = 1; X <= x1; X++) for (let Y = 1; Y <= bottom; Y++) {
    if (Y === 1) c.set(X, Y, 'M');
    else if (Y <= top) c.set(X, Y, splitWood(X + 3, Y - 2));
    else c.set(X, Y, bark(X + 30, 0.42 + (0.58 * (Y - top - 0.5)) / back));
  }
  const ry = back + 0.5, cy = top + 0.5;
  const inside = (X: number, Y: number, ox: number) => ((X + 0.5 - ox) / endA) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let Y = top + 1; Y <= bottom; Y++) for (let X = 1; X <= x1; X++) {
    const left = X + 0.5 - 1 < endA, right = x1 + 1 - (X + 0.5) < endA;
    if ((left && !inside(X, Y, 1 + endA)) || (right && !inside(X, Y, x1 + 1 - endA))) c.px[Y][X] = EMPTY;
  }
  // bout gauche, vers la lumière : le bois de bout en demi-lune, cerclé d'écorce
  const ox = 1 + endA;
  for (let Y = top + 1; Y <= bottom; Y++) for (let X = 1; X < 1 + 2 * endA; X++) {
    if (!inside(X, Y, ox) || c.get(X, Y) === EMPTY) continue;
    const rim = !inside(X - 1, Y, ox) || !inside(X, Y + 1, ox) || !inside(X + 1, Y, ox);
    c.set(X, Y, faceTone((X + 0.5 - ox) / endA, (Y + 0.5 - cy) / ry, rim, false, false));
  }
  // bout droit : l'écorce qui s'enroule, un cran plus sombre
  for (let Y = top + 1; Y <= bottom; Y++) {
    let X = x1;
    while (X > 0 && c.get(X, Y) === EMPTY) X--;
    if (X > 0) c.set(X, Y, DARKER[c.get(X, Y)] ?? c.get(X, Y));
  }
  despeckle(c, 'K^%*NM');
  return onGrip(trim(shadedOutline(c).toGrid()));
}

/**
 * Demi-bille par le bout (la pièce nord-sud de split.ts, raccourcie) : le dessus plat de fente qui fuit derrière
 * (`y1` rangées, fibres en long, liseré d'écorce sur les bords), puis la face de coupe sous les mains : demi-lune de
 * bois de bout.
 */
function bigFlatEnd(x1: number, y1: number, endH: number): Grid {
  const c = new Canvas(x1 + 3, y1 + endH + 4);
  for (let Y = 1; Y <= y1; Y++) for (let X = 1; X <= x1; X++) {
    if (X === 1) c.set(X, Y, 'M');
    else if (X === x1) c.set(X, Y, 'm');
    else c.set(X, Y, splitWood(Y * 1.3 + 4, X - 2));
  }
  {
    // la demi-lune : le bas de l'ovale de la face de coupe, le cœur au bord de la face plate
    const cx = (x1 + 2) / 2, cy = y1 + 1, rx = x1 / 2, ry = endH - 0.1;
    const inside = (X: number, Y: number) => Y >= cy && ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1;
    for (let Y = Math.floor(cy); Y <= Math.ceil(cy + ry); Y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) {
      if (!inside(X, Y)) continue;
      const rim = !inside(X, Y + 1) || !inside(X - 1, Y) || !inside(X + 1, Y);
      let k = faceTone((X + 0.5 - cx) / rx, (Y + 0.5 - cy) / ry, rim, false, true);
      if (Y === Math.floor(cy)) k = ({ '^': '*', '*': '%' } as Record<string, string>)[k] ?? k;
      c.set(X, Y, k);
    }
  }
  despeckle(c, 'K^%*NM');
  const g = trim(shadedOutline(c).toGrid());
  // la prise sur l'arête entre le dessus et la face (rangée y1 + 1 de la pièce, contour du haut compris)
  return onGrip(g, y1 + 1);
}

/**
 * Quartier par le bout : le quartier nord-sud au sol (la vue calculée de sa section, art/world/wood-section.ts), court : le dessus,
 * ses deux faces fendues en toit (l'ouest éclairée, l'est dans l'ombre), puis sous les mains le bout coupé, la section elle-même,
 * écorce en bas, pointe (l'angle du cœur) en l'air. La prise sur l'arête entre le dessus et le bout.
 */
function quarterEnd(): Grid {
  const h = 14;
  const v = lyingView('big', 'quarter', 'ns', h);
  const mid = Math.floor(v.c.w / 2) - 1;
  const grip = v.roles.findIndex((r) => r[mid] === 'e');
  const g = v.c.toGrid();
  const top = g.findIndex((r) => /[^.x]/.test(r));
  return onGrip(trim(g), Math.max(0, grip - top));
}

/** Quartier en long : le quartier est-ouest calculé, écorce en bas, pointe en l'air (la face nord éclairée, la sud dans l'ombre). */
function quarterLong(): Grid {
  return onGrip(trim(lyingCanvas('big', 'quarter', 'ew', PREVIEW_LEN + 1).toGrid()));
}

// ----- Bois normal (30 cm) -----
// Les aspects de la doloire : f1 la face ouest dressée (à gauche, vers la lumière), f2 la face est en plus, f3 le dessus
// en plus, la poutre enfin (20 × 20 cm, la section carrée). C'est l'ordre de la pièce nord-sud au sol (timber.ts), que
// la vue par le bout reprend : la pièce portée est une pièce nord-sud qui s'éloigne de nous.

type NormalLook = 'round' | 'f1' | 'f2' | 'f3' | 'beam';

/** Fil du bois dressé : tirets [début, longueur] d'un cran plus sombres, sur 24 px, par couloir (timber.ts). */
const GRAIN: Record<string, [number, number][]> = { a: [[3, 4], [16, 3]], b: [[10, 4], [21, 3]], c: [[6, 3], [18, 4]] };
function grain(along: number, lane: keyof typeof GRAIN, base: string): string {
  const a = mod(along, 24);
  return GRAIN[lane].some(([s, n]) => mod(a - s, 24) < n) ? ({ '^': '*', '*': '%', '%': '%' } as Record<string, string>)[base] : base;
}

/** Écorce du rondin (6 px), `v` de 0 (côté lumière) à 5. */
const normalBark = (along: number, v: number) => bark(along, (v + 0.5) / NORMAL_WOOD.diameter, NORMAL_WOOD);

/** Par le bout, rond : la bille nord-sud raccourcie, face de coupe de 6 × 5 sous les mains (l'ancienne vue de profil). */
function normalRoundEnd(): Grid {
  const c = logByTheEnd(new Canvas(WOOD_SIZE, WOOD_SIZE), WC, WC - 2.5, WC + 2.5, 3, 2.5, NORMAL_WOOD);
  return outline(c, darkest({ M: 'K', m: 'K', N: 'K', K: 'K', '^': 'K', '*': 'K', '%': 'K' }, 'o')).toGrid();
}

/**
 * Par le bout, dressé (les bouts nord et sud de la pièce nord-sud, timber.ts) : le rond du fond, le dessus qui fuit,
 * la face de bout de 4 rangées et le contour. Colonnes : contour K à gauche ; la face ouest dressée (f1 et après) est
 * la colonne Y côté lumière ; la face est (f2 et après), la colonne T ; le dessus (f3, poutre), bois clair Y Y t.
 */
const NORMAL_BACK: Record<Exclude<NormalLook, 'round'>, Grid> = {
  f1: ['..KKKK..', '.K^NNNo.', '.K^NNNNo'],
  f2: ['..KKKK..', '.K^NN%o.', '.K^NN%o.'],
  f3: ['..KKKK..', '.K^^^*o.', '.K^^^*o.'],
  beam: ['..KKKK..', '.K^^^*o.', '.K^^^*o.'],
};
const NORMAL_FRONT: Record<Exclude<NormalLook, 'round'>, Grid> = {
  f1: ['.K^NNNNo', '.K^^**No', '.K^*%*No', '.o*NNNo.', '..oooo..'],
  f2: ['.K^NN%o.', '.K^^*%o.', '.K^*%%o.', '.o*NN%o.', '..oooo..'],
  f3: ['.K***%o.', '.K^*%%o.', '.K**%%o.', '.o*NN%o.', '..oooo..'],
  beam: ['.K***%o.', '.K^*%%o.', '.K**%%o.', '.K*%%%o.', '..oooo..'],
};
/** Une rangée du dessus, entre le fond et la face (`along` : la rangée). */
function normalTopRow(look: Exclude<NormalLook, 'round'>, along: number): string {
  if (look === 'f1') return `.K^${[2, 3, 4, 5].map((v) => normalBark(along, v)).join('')}o`;
  if (look === 'f2') return `.K^${[2, 3].map((v) => normalBark(along, v)).join('')}%o.`;
  return `.K^${grain(along, 'a', '^')}${grain(along, 'b', '^')}*o.`;
}
/** Rangées du dessus entre le fond et la face : la pièce s'éloigne, raccourcie comme la bille portée. */
const NORMAL_TOP_ROWS = 3;

function normalHewnEnd(look: Exclude<NormalLook, 'round'>): Grid {
  const rows = [...NORMAL_BACK[look]];
  for (let i = 0; i < NORMAL_TOP_ROWS; i++) rows.push(normalTopRow(look, i + 5));
  rows.push(...NORMAL_FRONT[look]);
  // la prise sur l'arête entre le dessus et la face de bout
  return onGrip(trim(rows), NORMAL_BACK[look].length + NORMAL_TOP_ROWS);
}

/**
 * En long (le rondin est-ouest de timber.ts, sans ombre) : rangée 0 contour du haut, 1-6 le corps (écorce M M m m N N ;
 * dressé : dessus 1-2, face sud 3-6), 7 contour du bas. Le bout gauche montre la face de coupe (ou la section), le
 * droit l'écorce enroulée (ou le bois de bout dans l'ombre). Pour la vue de profil, la pièce portée montre son flanc :
 * les faces de côté de la vue par le bout deviennent ici le dessus et la face sud, comme la pièce est-ouest au sol.
 */
const NORMAL_EW_START: Record<NormalLook, Grid> = {
  round: ['..KKK', '.KNNM', 'KN^*N', 'KN^*N', 'KN*%N', 'KN**N', '.oNNN', '..ooo'],
  f1: ['..KKK', '.KNNM', 'KN^*N', 'KN^*%', 'KN*%%', 'KN**%', '.oNN%', '..ooo'],
  f2: ['.KKKK', 'KNNNM', 'K^^*N', 'K^^*%', 'K^*%%', 'K***%', '.oNN%', '..ooo'],
  f3: ['.KKKK', 'K^^^*', 'K^^**', 'K^^*%', 'K^*%%', 'K***%', '.oNN%', '..ooo'],
  beam: ['.KKKK', 'K^^^*', 'K^***', 'K^*%%', 'K**%%', 'K*%%%', 'K*%%%', '.oooo'],
};
const NORMAL_EW_END: Record<NormalLook, Grid> = {
  round: ['K..', 'mo.', 'Mmo', 'mNo', 'mNo', 'NKo', 'Ko.', 'o..'],
  f1: ['K..', 'mo.', 'Mmo', '*%o', '*%o', '*%o', '%%o', 'oo.'],
  f2: ['KK.', 'MNo', 'MNo', '*%o', '*%o', '*%o', '%%o', 'oo.'],
  f3: ['KK.', '^%o', '^%o', '*%o', '*%o', '*%o', '%%o', 'oo.'],
  beam: ['KK.', '^%o', '^%o', '*%o', '*%o', '*%o', '%%o', 'oo.'],
};
function normalColumn(look: NormalLook, along: number): string[] {
  const col = ['K'];
  for (let v = 0; v < NORMAL_WOOD.diameter; v++) {
    const row = v + 1;
    if (look === 'round') col.push(normalBark(along, v));
    else if (row <= 2) col.push(look === 'f1' || look === 'f2' ? normalBark(along, v) : row === 2 ? grain(along, 'c', '^') : '^');
    else col.push(row === 6 ? '%' : row === 5 ? grain(along, 'b', '*') : '*');
  }
  col.push('o');
  return col;
}
function normalLong(look: NormalLook): Grid {
  const start = NORMAL_EW_START[look], end = NORMAL_EW_END[look];
  const mid = PREVIEW_LEN + 1 - start[0].length - 4; // le bout d'arrivée de timber.ts fait 4 colonnes, la dernière vide
  const rows = Array.from({ length: 8 }, () => '');
  for (let r = 0; r < 8; r++) rows[r] += start[r];
  for (let i = 0; i < mid; i++) normalColumn(look, i + 5).forEach((q, r) => (rows[r] += q));
  for (let r = 0; r < 8; r++) rows[r] += end[r];
  return onGrip(trim(rows));
}

// ----- La perche (12 cm), le palançon, la latte et la planche fendue -----
// Mêmes dessins que la pièce au sol (art/world/wood-pieces.ts) : de profil, la pièce est-ouest de 1 m sans son ombre ; par le
// bout, la pièce nord-sud raccourcie : l'écorce (ou le dessus de la planche) qui fuit sur deux rangées, puis le bout coupé sous
// les mains.

/** Perche par le bout : l'écorce S A B qui fuit, la face de coupe de 3 × 2 (^ *, le cœur %, cerclée de B). */
const POLE_END: Grid = ['.KKK.', 'KSABo', 'KSABo', 'K^*Bo', 'K*%Bo', '.ooo.'];

/**
 * Palançon (la perche fendue en deux) par le bout : la face de fente qui fuit sur deux rangées (^ côté lumière, le bois * dans
 * l'ombre), puis sous les mains le bout coupé en demi-lune, son cœur (%) au bord de la face, l'arc d'écorce de la perche (B) dessous.
 */
const POLE_HALF_END: Grid = ['.KKK.', 'K^^*o', 'K^**o', 'K*%*o', 'KBBBo', '.ooo.'];

/** Latte (6 × 3 cm) par le bout : le dessus étroit qui fuit (^ *), puis le bois de bout, une rangée (* %). */
const LATH_END: Grid = ['.KK.', 'K^*o', 'K^*o', 'K*%o', '.oo.'];

/** Planche par le bout : le dessus qui fuit (l'arête ^ à gauche, le bois *, la rive %), le bois de bout (une rangée, ses cernes en travers). */
const PLANK_END: Grid = ['.KKKKK.', 'K^^**%o', 'K^^**%o', 'K^*^*%o', '.ooooo.'];

/**
 * Le rondin écorcé par le bout : le rondin nord-sud au sol (la vue calculée de sa section, art/world/wood-section.ts), court : le
 * dessus de bois mis à nu qui fuit, puis sous les mains le bout coupé, le bois de bout sans anneau d'écorce. La prise sur l'arête
 * entre le dessus et le bout, comme le quartier.
 */
function peeledEnd(): Grid {
  const v = lyingView('normal', 'peeled', 'ns', 13);
  const mid = Math.floor(v.c.w / 2) - 1;
  const grip = v.roles.findIndex((r) => r[mid] === 'e');
  const g = v.c.toGrid();
  const top = g.findIndex((r) => /[^.x]/.test(r));
  return onGrip(trim(g), Math.max(0, grip - top));
}
/** Le rondin écorcé en long : le rondin est-ouest calculé, sans son ombre. */
const peeledLong = (): Grid => onGrip(trim(lyingCanvas('normal', 'peeled', 'ew', PREVIEW_LEN + 1).toGrid()));

const poleLong = (): Grid => onGrip(trim(lyingCanvas('pole', 'round', 'ew', PREVIEW_LEN + 1).toGrid()));
const plankLong = (): Grid => onGrip(trim(lyingCanvas('big', 'plank', 'ew', PREVIEW_LEN + 1).toGrid()));
const poleHalfLong = (): Grid => onGrip(trim(lyingCanvas('pole', 'half', 'ew', PREVIEW_LEN + 1).toGrid()));
const lathLong = (): Grid => onGrip(trim(lyingCanvas('pole', 'lath', 'ew', PREVIEW_LEN + 1).toGrid()));

// ----- Les planches -----

const woodSheet = (name: string, end: Grid, long: Grid): SpriteSheetSource =>
  sheet(name, WOOD_SIZE, world, { down: end, up: end, right: long });

const heldWood = (): SpriteSheetSource[] => [
  woodSheet('held-wood-big-round', bigRoundEnd(), bigRoundLong()),
  woodSheet('held-wood-big-half', bigFlatEnd(11, 4, 6), bigFlatLong(5, 11, 2.5)),
  woodSheet('held-wood-big-quarter', quarterEnd(), quarterLong()),
  woodSheet('held-wood-big-plank', onGrip(PLANK_END, 3), plankLong()),
  woodSheet('held-wood-pole-round', onGrip(POLE_END, 3), poleLong()),
  woodSheet('held-wood-pole-half', onGrip(POLE_HALF_END, 3), poleHalfLong()),
  woodSheet('held-wood-pole-lath', onGrip(LATH_END, 3), lathLong()),
  woodSheet('held-wood-normal-round', normalRoundEnd(), normalLong('round')),
  woodSheet('held-wood-normal-peeled', peeledEnd(), peeledLong()),
  ...(['f1', 'f2', 'f3'] as const).map((l) => woodSheet(`held-wood-normal-${l}`, normalHewnEnd(l), normalLong(l))),
  woodSheet('held-wood-normal-beam', normalHewnEnd('beam'), normalLong('beam')),
];

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
// fagot est-ouest sans son ombre. De profil, par le bout : la face des gros bouts (10 × 9 px pour dix branches, moins
// aplatie qu'au sol, il est à hauteur de poitrine), le dessus du faisceau qui fuit derrière, le lien en travers.
// Une planche par nombre de branches (`held-faggot-n<n>`, de 2 à 12, `FAGGOT_COUNTS`), tirée du fagot au sol du même
// nombre : en longueur `faggotBody(n)`, par le bout la face à la grosseur du faisceau (`faggotDims(n)` : Ø contour compris
// = Ø/5 px, la hauteur aux 7/8 de la largeur). `held-faggot` est le fagot de dix (le catalogue). Le fagot de douze tient
// dans la même planche de 29 px.

const FAGGOT_SIZE = 29;
const FAGGOT_C = Math.floor(FAGGOT_SIZE / 2);

function faggotLengthwise(n: number): Grid {
  const body = faggotBody(n).toGrid().filter((r) => /[^.]/.test(r));
  const c = new Canvas(FAGGOT_SIZE, FAGGOT_SIZE);
  // le milieu du faisceau (sans ses rameaux, deux rangées au-dessus) sur la prise
  c.stamp(body, FAGGOT_C - Math.floor(body[0].length / 2), FAGGOT_C - 1 - Math.floor((body.length - 2) / 2));
  return c.toGrid();
}

function faggotEnd(n: number): Grid {
  const C = FAGGOT_C;
  // demi-largeur du faisceau sans le contour : Ø/5 px contour compris (4 pour dix branches, Ø 50 cm)
  const rx = faggotDims(n).d / 10 - 1;
  const c = bundleByTheEnd(new Canvas(FAGGOT_SIZE, FAGGOT_SIZE), C + 1, C - 3, C + 2, rx, (rx * 7) / 8, C - 4, 84);
  return outlineBundle(c).toGrid();
}

const heldFaggot = (name: string, n: number): SpriteSheetSource => {
  const lengthwise = faggotLengthwise(n);
  return sheet(name, FAGGOT_SIZE, world, { down: lengthwise, up: lengthwise, right: faggotEnd(n) });
};

export default [heldAxe(), heldBranch(), ...heldWood(), heldRopeCoil(), heldRopeTie(), heldFaggot('held-faggot', FAGGOT_BRANCHES),
  ...FAGGOT_COUNTS.map((n) => heldFaggot(`held-faggot-n${n}`, n))];
