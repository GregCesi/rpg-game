// Outil tenu en main pendant un geste (coup de hache, de pioche, de houe...).
//
// Le geste appartient au corps (art/characters/xeros.ts) : pour chaque image, il dit où sont les mains,
// vers où pointe la tête de l'outil, de quel côté est le tranchant, si l'outil passe derrière le corps et dans
// quel plan il frappe. L'outil fournit deux familles de dessins de TOOL_SIZE de côté, dans une convention commune.
// Un outil long (la hache de bûcheron : 18 px de la prise au fer) y tient dans toutes les orientations.
//
// Vu de côté, pour un coup dans un plan vertical (chop-* : de haut en bas sur ce qui est couché) : on voit la
// silhouette complète du manche et du fer.
//   - `diag`    : la tête vers le haut à droite (manche du bas à gauche vers le haut à droite, comme l'icône
//                 d'inventaire), tranchant vers le haut à gauche ; la main tient le manche au pixel DIAG_GRIP ;
//   - `upright` : la tête en haut, manche vertical, tranchant à gauche ; main au pixel UPRIGHT_GRIP.
//   Toutes les orientations s'en déduisent sans perte, par quarts de tour et miroir.
//
// Vu du dessus, pour un coup dans un plan horizontal (use-* : de côté sur ce qui est debout) : la hache se
// présente par la tranche (docs/references/hache-vue-de-dessus.png). On ne voit jamais la lame déployée : le fer
// n'est qu'un bloc étroit et sombre au bout du manche, d'où dépasse le bout du manche. La vue trois quarts
// raccourcit de FLAT_DEPTH ce qui pointe vers le nord ; le manche et le bloc gardent leur largeur à l'écran.
//   - `flat`     : tête vers la droite (est), manche en long ; main au pixel FLAT_GRIP ;
//   - `flatDiag` : tête vers le nord-est, manche en escalier à 45° de l'écran ; main au pixel FLAT_DIAG_GRIP ;
//   - `flatEnd`  : tête vers le haut (nord, loin du spectateur), manche raccourci ; main au pixel FLAT_END_GRIP.
//   Le côté du tranchant ('ccw' dans ces dessins) ne se lit plus qu'au pied du bloc, qui pousse d'un pixel vers
//   la prise de ce côté-là (pas en diagonale).
//   Ces trois-là ne tournent pas (un quart de tour mêlerait la longueur raccourcie et la largeur) : seuls les miroirs
//   gauche-droite et haut-bas, qui gardent la vue trois quarts, en tirent les autres orientations.
//
// Les dessins ne portent ni ombre ni contour : ils disent seulement de quelle matière est chaque pixel
// (zones, avec leur table `materials`). L'image est éclairée après la rotation (art/lib/light.ts), si bien
// que la lumière vient du haut à gauche dans toutes les orientations, et le contour suit la même règle.
// Un nouvel outil = ces cinq dessins, puis `heldToolSheet` : aucune animation du corps à refaire.
// Le jeu pose le centre de chaque image de la planche (la prise du manche) sur la main du geste.

import { Canvas, type Grid, type Palette } from './canvas';
import { lightUp, type Materials } from './light';
import type { SpriteSheetSource } from './types';

/** Côté d'un dessin de base d'outil en main. */
export const TOOL_SIZE = 48;
/**
 * Pixel tenu par la main la plus proche du fer, dans les cinq dessins de base : au centre, pour que l'outil y tienne
 * quelle que soit sa direction. L'autre main tient le bout du manche, juste derrière.
 */
export const GRIP: Vec = [24, 24];
/** Pixel tenu par la main dans le dessin `diag`. */
export const DIAG_GRIP: Vec = GRIP;
/** Pixel tenu par la main dans le dessin `upright`. */
export const UPRIGHT_GRIP: Vec = GRIP;
/** Pixel tenu par la main dans le dessin `flat`. */
export const FLAT_GRIP: Vec = GRIP;
/** Pixel tenu par la main dans le dessin `flatDiag`. */
export const FLAT_DIAG_GRIP: Vec = GRIP;
/** Pixel tenu par la main dans le dessin `flatEnd`. */
export const FLAT_END_GRIP: Vec = GRIP;
/**
 * Écrasement de la profondeur au sol par la vue trois quarts : un segment posé à plat, pointé vers le nord,
 * paraît FLAT_DEPTH fois sa longueur à l'écran.
 */
export const FLAT_DEPTH = 0.7;

export type Vec = [number, number];

/** Huit directions de l'écran (n = haut). Vu du dessus, une diagonale est une diagonale au sol. */
export type Dir8 = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
const DIRS: Dir8[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']; // sens horaire, par huitièmes de tour

/**
 * Côté du tranchant, vu depuis le manche : 'cw' s'il est du côté où tourne une aiguille de montre
 * (le tranchant mène un coup qui tourne dans le sens horaire), 'ccw' sinon.
 */
export type Edge = 'cw' | 'ccw';

/** Plan du coup : vertical, l'outil vu de côté (`side`), ou horizontal, l'outil vu du dessus (`flat`). */
export type View = 'side' | 'flat';

/** Les dessins qu'un outil fournit, en zones de matière, sans ombre ni contour (voir l'en-tête). */
export interface ToolArt {
  diag: Grid;
  upright: Grid;
  flat: Grid;
  flatDiag: Grid;
  flatEnd: Grid;
  /** Zone -> matière (rampe et contour), pour l'éclairage après rotation. */
  materials: Materials;
}

/** Angle en degrés d'une direction : 0 = droite, 90 = haut (sens trigonométrique, à l'écran). */
export const angleOf = (d: Dir8): number => (450 - DIRS.indexOf(d) * 45) % 360;

/** Direction vue dans un miroir vertical (gauche <-> droite). */
export const mirrorDir = (d: Dir8): Dir8 => DIRS[(8 - DIRS.indexOf(d)) % 8];
/** Direction vue dans un miroir horizontal (haut <-> bas). */
const flipDirY = (d: Dir8): Dir8 => DIRS[(12 - DIRS.indexOf(d)) % 8];

const rotCW = ([x, y]: Vec): Vec => [TOOL_SIZE - 1 - y, x];
const flipPx = ([x, y]: Vec): Vec => [TOOL_SIZE - 1 - x, y];
const flipPy = ([x, y]: Vec): Vec => [x, TOOL_SIZE - 1 - y];

type Base = 'diag' | 'upright' | 'flat' | 'flatDiag' | 'flatEnd';
const GRIPS: Record<Base, Vec> = {
  diag: DIAG_GRIP, upright: UPRIGHT_GRIP, flat: FLAT_GRIP, flatDiag: FLAT_DIAG_GRIP, flatEnd: FLAT_END_GRIP,
};
/** Tête de chaque dessin vu du dessus (tranchant côté 'ccw'). */
const FLAT_HEADS: [Base, Dir8][] = [['flat', 'e'], ['flatDiag', 'ne'], ['flatEnd', 'n']];

interface Transform { base: Base; turns: number; flip: boolean; flipY: boolean }

/**
 * Transformation qui amène un des dessins à l'orientation voulue : quarts de tour horaires, puis miroirs.
 * Les dessins de base ont le tranchant côté 'ccw' ; chaque miroir le change de côté.
 * Vu du dessus, pas de quart de tour : `flatDiag` n'existe que tête ne/sw tranchant 'ccw', nw/se tranchant 'cw'.
 */
function transformFor(head: Dir8, edge: Edge, view: View = 'side'): Transform {
  if (view === 'flat') {
    for (const [base, h] of FLAT_HEADS) for (const flip of [false, true]) for (const flipY of [false, true]) {
      let d = h;
      if (flip) d = mirrorDir(d);
      if (flipY) d = flipDirY(d);
      if (d === head && (flip !== flipY ? 'cw' : 'ccw') === edge) return { base, turns: 0, flip, flipY };
    }
    throw new Error(`held : pas de dessin vu du dessus tête vers « ${head} », tranchant « ${edge} »`);
  }
  const flip = edge === 'cw';
  const target = flip ? mirrorDir(head) : head;
  const i = DIRS.indexOf(target);
  const base: Base = i % 2 === 0 ? 'upright' : 'diag';
  const from = base === 'diag' ? 1 : 0; // ne ou n
  return { base, turns: ((i - from) / 2 + 4) % 4, flip, flipY: false };
}

function mapPx(p: Vec, t: Transform): Vec {
  let q = p;
  for (let k = 0; k < t.turns; k++) q = rotCW(q);
  if (t.flip) q = flipPx(q);
  return t.flipY ? flipPy(q) : q;
}

/** Pixel tenu par la main, dans l'image orientée. */
export function gripOf(head: Dir8, edge: Edge, view: View = 'side'): Vec {
  const t = transformFor(head, edge, view);
  return mapPx(GRIPS[t.base], t);
}

/** Zones de l'outil orientées (sans lumière) : tête vers `head`, tranchant du côté `edge`. */
function orientZones(art: ToolArt, head: Dir8, edge: Edge, view: View = 'side'): Grid {
  const t = transformFor(head, edge, view);
  const src = art[t.base];
  const out = new Canvas(TOOL_SIZE, TOOL_SIZE);
  src.forEach((row, y) => [...row].forEach((ch, x) => {
    const [u, v] = mapPx([x, y], t);
    out.set(u, v, ch);
  }));
  return out.toGrid();
}

/**
 * Zones de l'outil orienté, vu de côté, sans lumière ni contour, dans un carré de TOOL_SIZE (prise au pixel `gripOf`) :
 * pour un objet posé qui le montre en partie (la hache plantée dans le billot). L'appelant cache ce qui est enfoui,
 * puis éclaire le reste avec lightUp (art/lib/light.ts), si bien que le contour ne court que là où l'outil est en l'air.
 */
export const orientedZones = (art: ToolArt, head: Dir8, edge: Edge): Grid => orientZones(art, head, edge);

/** Pose de l'outil pour une image d'un geste, telle que le corps la décrit. */
export interface ToolPose {
  /** Pixel des mains jointes sur le manche, dans la frame du personnage. */
  hand: Vec;
  /** Direction de la main vers la tête de l'outil (vu du dessus : direction au sol). */
  head: Dir8;
  edge: Edge;
  /** L'outil se dessine derrière le corps. */
  behind: boolean;
  /** Plan du coup (`side` si absent) : vertical vu de côté, ou horizontal vu du dessus. */
  view?: View;
}

/** Dessin de base employé pour une pose (pour l'aide de gestures.json). */
export const baseOf = (p: ToolPose): Base => transformFor(p.head, p.edge, p.view).base;

/**
 * Côté d'une image de la planche `tool-<objet>` (carré pair). La prise du manche y est toujours au pixel HELD_GRIP ;
 * l'outil s'étend jusqu'à 22 px autour (fer et contour compris).
 */
export const HELD_SIZE = 48;
/** Centre de l'image, arrondi vers le bas : le jeu pose ce pixel sur la main. */
export const HELD_GRIP: Vec = [HELD_SIZE / 2, HELD_SIZE / 2];

/** Image de la planche : l'outil orienté, sa prise posée sur HELD_GRIP, éclairé une fois en place. */
export function heldImage(art: ToolArt, head: Dir8, edge: Edge, view: View = 'side'): Grid {
  const [gx, gy] = gripOf(head, edge, view);
  const zones = new Canvas(HELD_SIZE, HELD_SIZE).stamp(orientZones(art, head, edge, view), HELD_GRIP[0] - gx, HELD_GRIP[1] - gy);
  return lightUp(zones.toGrid(), art.materials);
}

/** Un geste du corps : les poses de l'outil par direction (4 temps chacune) et sa cadence. */
export interface HeldGesture {
  poses: Record<'down' | 'up' | 'right', ToolPose[]>;
  frameRate: number;
}

/**
 * Planche `tool-<nom>` : pour chaque geste, dans l'ordre donné (use d'abord), une animation par direction,
 * `<geste>-down`, `<geste>-up`, `<geste>-right`. La gauche est le miroir de la droite : le jeu retourne l'image.
 * L'ordre des images de use-* ne change pas quand on ajoute un geste : les nouveaux viennent après.
 */
export function heldToolSheet(
  name: string,
  art: ToolArt,
  palette: Palette,
  gestures: Record<string, HeldGesture>,
): SpriteSheetSource {
  const animations: SpriteSheetSource['animations'] = {};
  for (const [gesture, { poses, frameRate }] of Object.entries(gestures)) {
    for (const dir of ['down', 'up', 'right'] as const) {
      animations[`${gesture}-${dir}`] = { frames: poses[dir].map((p) => heldImage(art, p.head, p.edge, p.view)), frameRate, repeat: 0 };
    }
  }
  return { kind: 'spritesheet', name: `tool-${name}`, frameW: HELD_SIZE, frameH: HELD_SIZE, palette, animations };
}
