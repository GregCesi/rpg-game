// Outil tenu en main pendant un geste (coup de hache, de pioche, de houe...).
//
// Le geste appartient au corps (art/characters/xeros.ts) : pour chaque image, il dit où sont les mains,
// vers où pointe la tête de l'outil, de quel côté est le tranchant et si l'outil passe derrière le corps.
// L'outil, lui, ne fournit que trois dessins de 16×16, dans une convention commune :
//   - `diag`    : la tête vers le haut à droite (manche du bas à gauche vers le haut à droite, comme l'icône
//                 d'inventaire), tranchant vers le haut à gauche ; la main tient le manche au pixel DIAG_GRIP ;
//   - `upright` : la tête en haut, manche vertical, tranchant à gauche ; main au pixel UPRIGHT_GRIP ;
//   - `short`   : le même, manche raccourci : l'outil penche vers le spectateur ou s'en éloigne (coup de haut
//                 en bas vu de face ou de dos, qui ne passe jamais par l'horizontale) ; main au pixel SHORT_GRIP.
// Toutes les autres orientations s'en déduisent sans perte, par quarts de tour et miroir (`short` : seulement
// vers n, e, s, w).
// Les deux dessins ne portent ni ombre ni contour : ils disent seulement de quelle matière est chaque pixel
// (zones, avec leur table `materials`). L'image est éclairée après la rotation (art/lib/light.ts), si bien
// que la lumière vient du haut à gauche dans toutes les orientations, et le contour suit la même règle.
// Un nouvel outil = ces trois dessins, puis `heldToolSheet` : aucune animation du corps à refaire.
// Le jeu pose le centre de chaque image de la planche (la prise du manche) sur la main du geste.

import { Canvas, type Grid, type Palette } from './canvas';
import { lightUp, type Materials } from './light';
import type { SpriteSheetSource } from './types';

/** Côté d'une image d'outil en main. */
export const TOOL_SIZE = 16;
/** Pixel tenu par la main dans le dessin `diag`. */
export const DIAG_GRIP: Vec = [3, 12];
/** Pixel tenu par la main dans le dessin `upright`. */
export const UPRIGHT_GRIP: Vec = [7, 12];
/** Pixel tenu par la main dans le dessin `short`. */
export const SHORT_GRIP: Vec = [7, 12];

export type Vec = [number, number];

/** Huit directions de l'écran (n = haut). */
export type Dir8 = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
const DIRS: Dir8[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']; // sens horaire, par huitièmes de tour

/**
 * Côté du tranchant, vu depuis le manche : 'cw' s'il est du côté où tourne une aiguille de montre
 * (le tranchant mène un coup qui tourne dans le sens horaire), 'ccw' sinon.
 */
export type Edge = 'cw' | 'ccw';

/** Les trois dessins qu'un outil fournit, en zones de matière, sans ombre ni contour, un pixel de marge au bord. */
export interface ToolArt {
  diag: Grid;
  upright: Grid;
  /** `upright` raccourci par la perspective : l'outil penche vers le spectateur ou s'en éloigne. */
  short: Grid;
  /** Zone -> matière (rampe et contour), pour l'éclairage après rotation. */
  materials: Materials;
}

/** Angle en degrés d'une direction : 0 = droite, 90 = haut (sens trigonométrique, à l'écran). */
export const angleOf = (d: Dir8): number => (450 - DIRS.indexOf(d) * 45) % 360;

/** Direction vue dans un miroir vertical (gauche <-> droite). */
export const mirrorDir = (d: Dir8): Dir8 => DIRS[(8 - DIRS.indexOf(d)) % 8];

const rotCW = ([x, y]: Vec): Vec => [TOOL_SIZE - 1 - y, x];
const flipPx = ([x, y]: Vec): Vec => [TOOL_SIZE - 1 - x, y];

type Base = 'diag' | 'upright' | 'short';
const GRIPS: Record<Base, Vec> = { diag: DIAG_GRIP, upright: UPRIGHT_GRIP, short: SHORT_GRIP };

/**
 * Transformation qui amène un des trois dessins à l'orientation voulue : quarts de tour horaires,
 * puis miroir. Les dessins de base ont le tranchant côté 'ccw' ; un miroir le passe côté 'cw'.
 * `short` : le dessin raccourci, qui n'existe que tête vers n, e, s ou w.
 */
function transformFor(head: Dir8, edge: Edge, short = false): { base: Base; turns: number; flip: boolean } {
  const flip = edge === 'cw';
  const target = flip ? mirrorDir(head) : head;
  const i = DIRS.indexOf(target);
  if (short && i % 2 === 1) throw new Error(`held : pas de dessin raccourci tête vers « ${head} » (n, e, s ou w seulement)`);
  const base: Base = short ? 'short' : i % 2 === 0 ? 'upright' : 'diag';
  const from = base === 'diag' ? 1 : 0; // ne ou n
  return { base, turns: ((i - from) / 2 + 4) % 4, flip };
}

function mapPx(p: Vec, turns: number, flip: boolean): Vec {
  let q = p;
  for (let k = 0; k < turns; k++) q = rotCW(q);
  return flip ? flipPx(q) : q;
}

/** Pixel tenu par la main, dans l'image orientée. */
export function gripOf(head: Dir8, edge: Edge, short = false): Vec {
  const t = transformFor(head, edge, short);
  return mapPx(GRIPS[t.base], t.turns, t.flip);
}

/** Zones de l'outil orientées (sans lumière) : tête vers `head`, tranchant du côté `edge`. */
function orientZones(art: ToolArt, head: Dir8, edge: Edge, short = false): Grid {
  const t = transformFor(head, edge, short);
  const src = art[t.base];
  const out = new Canvas(TOOL_SIZE, TOOL_SIZE);
  src.forEach((row, y) => [...row].forEach((ch, x) => {
    const [u, v] = mapPx([x, y], t.turns, t.flip);
    out.set(u, v, ch);
  }));
  return out.toGrid();
}

/**
 * Image 16×16 de l'outil orienté, éclairée en haut à gauche et contournée (pour un objet posé, comme le billot).
 * Éclairée avec une marge d'un pixel, puis recadrée : le contour qui déborde du carré est perdu.
 */
export function orient(art: ToolArt, head: Dir8, edge: Edge): Grid {
  const pad = new Canvas(TOOL_SIZE + 2, TOOL_SIZE + 2).stamp(orientZones(art, head, edge), 1, 1);
  return lightUp(pad.toGrid(), art.materials).slice(1, -1).map((row) => row.slice(1, -1));
}

/** Pose de l'outil pour une image d'un geste, telle que le corps la décrit. */
export interface ToolPose {
  /** Pixel des mains jointes sur le manche, dans la frame du personnage. */
  hand: Vec;
  /** Direction de la main vers la tête de l'outil. */
  head: Dir8;
  edge: Edge;
  /** L'outil se dessine derrière le corps. */
  behind: boolean;
  /** Dessin raccourci (`short`) : l'outil penche vers le spectateur ou s'en éloigne. */
  short?: boolean;
}

/** Côté d'une image de la planche `tool-<objet>`. La prise du manche y est toujours au pixel HELD_GRIP. */
export const HELD_SIZE = 32;
/** Centre de l'image, arrondi vers le bas : le jeu pose ce pixel sur la main. */
export const HELD_GRIP: Vec = [HELD_SIZE / 2, HELD_SIZE / 2];

/** Image de la planche : l'outil orienté, sa prise posée sur HELD_GRIP, éclairé une fois en place. */
export function heldImage(art: ToolArt, head: Dir8, edge: Edge, short = false): Grid {
  const [gx, gy] = gripOf(head, edge, short);
  const zones = new Canvas(HELD_SIZE, HELD_SIZE).stamp(orientZones(art, head, edge, short), HELD_GRIP[0] - gx, HELD_GRIP[1] - gy);
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
      animations[`${gesture}-${dir}`] = { frames: poses[dir].map((p) => heldImage(art, p.head, p.edge, p.short)), frameRate, repeat: 0 };
    }
  }
  return { kind: 'spritesheet', name: `tool-${name}`, frameW: HELD_SIZE, frameH: HELD_SIZE, palette, animations };
}
