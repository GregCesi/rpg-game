// Outil tenu en main pendant un geste (coup de hache, de pioche, de houe...).
//
// Le geste appartient au corps (art/characters/xeros.ts) : pour chaque image, il dit où sont les mains,
// vers où pointe la tête de l'outil, de quel côté est le tranchant et si l'outil passe derrière le corps.
// L'outil, lui, ne fournit que deux dessins de 16×16, dans une convention commune :
//   - `diag`    : la tête vers le haut à droite (manche du bas à gauche vers le haut à droite, comme l'icône
//                 d'inventaire), tranchant vers le haut à gauche ; la main tient le manche au pixel DIAG_GRIP ;
//   - `upright` : la tête en haut, manche vertical, tranchant à gauche ; main au pixel UPRIGHT_GRIP.
// Toutes les autres orientations s'en déduisent sans perte, par quarts de tour et miroir.
// Un nouvel outil = ces deux dessins, puis `heldToolSheet` : aucune animation du corps à refaire.
// Le jeu pose le centre de chaque image de la planche (la prise du manche) sur la main du geste.

import { Canvas, type Grid, type Palette } from './canvas';
import type { SpriteSheetSource } from './types';

/** Côté d'une image d'outil en main. */
export const TOOL_SIZE = 16;
/** Pixel tenu par la main dans le dessin `diag`. */
export const DIAG_GRIP: Vec = [3, 12];
/** Pixel tenu par la main dans le dessin `upright`. */
export const UPRIGHT_GRIP: Vec = [7, 12];

export type Vec = [number, number];

/** Huit directions de l'écran (n = haut). */
export type Dir8 = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
const DIRS: Dir8[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']; // sens horaire, par huitièmes de tour

/**
 * Côté du tranchant, vu depuis le manche : 'cw' s'il est du côté où tourne une aiguille de montre
 * (le tranchant mène un coup qui tourne dans le sens horaire), 'ccw' sinon.
 */
export type Edge = 'cw' | 'ccw';

/** Les deux dessins qu'un outil fournit. */
export interface ToolArt {
  diag: Grid;
  upright: Grid;
}

/** Angle en degrés d'une direction : 0 = droite, 90 = haut (sens trigonométrique, à l'écran). */
export const angleOf = (d: Dir8): number => (450 - DIRS.indexOf(d) * 45) % 360;

/** Direction vue dans un miroir vertical (gauche <-> droite). */
export const mirrorDir = (d: Dir8): Dir8 => DIRS[(8 - DIRS.indexOf(d)) % 8];

const rotCW = ([x, y]: Vec): Vec => [TOOL_SIZE - 1 - y, x];
const flipPx = ([x, y]: Vec): Vec => [TOOL_SIZE - 1 - x, y];

/**
 * Transformation qui amène un des deux dessins à l'orientation voulue : quarts de tour horaires,
 * puis miroir. Les dessins de base ont le tranchant côté 'ccw' ; un miroir le passe côté 'cw'.
 */
function transformFor(head: Dir8, edge: Edge): { base: keyof ToolArt; turns: number; flip: boolean } {
  const flip = edge === 'cw';
  const target = flip ? mirrorDir(head) : head;
  const i = DIRS.indexOf(target);
  const base = i % 2 === 0 ? 'upright' : 'diag';
  const from = base === 'upright' ? 0 : 1; // n ou ne
  return { base, turns: ((i - from) / 2 + 4) % 4, flip };
}

function mapPx(p: Vec, turns: number, flip: boolean): Vec {
  let q = p;
  for (let k = 0; k < turns; k++) q = rotCW(q);
  return flip ? flipPx(q) : q;
}

/** Pixel tenu par la main, dans l'image orientée. */
export function gripOf(head: Dir8, edge: Edge): Vec {
  const t = transformFor(head, edge);
  return mapPx(t.base === 'upright' ? UPRIGHT_GRIP : DIAG_GRIP, t.turns, t.flip);
}

/** Image de l'outil orientée : tête vers `head`, tranchant du côté `edge`. */
export function orient(art: ToolArt, head: Dir8, edge: Edge): Grid {
  const t = transformFor(head, edge);
  const src = art[t.base];
  const out = new Canvas(TOOL_SIZE, TOOL_SIZE);
  src.forEach((row, y) => [...row].forEach((ch, x) => {
    const [u, v] = mapPx([x, y], t.turns, t.flip);
    out.set(u, v, ch);
  }));
  return out.toGrid();
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
}

/** Côté d'une image de la planche `tool-<objet>`. La prise du manche y est toujours au pixel HELD_GRIP. */
export const HELD_SIZE = 32;
/** Centre de l'image, arrondi vers le bas : le jeu pose ce pixel sur la main. */
export const HELD_GRIP: Vec = [HELD_SIZE / 2, HELD_SIZE / 2];

/** Image de la planche : l'outil orienté, sa prise posée sur HELD_GRIP. */
export function heldImage(art: ToolArt, head: Dir8, edge: Edge): Grid {
  const [gx, gy] = gripOf(head, edge);
  return new Canvas(HELD_SIZE, HELD_SIZE).stamp(orient(art, head, edge), HELD_GRIP[0] - gx, HELD_GRIP[1] - gy).toGrid();
}

/**
 * Planche `tool-<nom>` : 12 images, rangées par direction puis par temps (down 0-3, up 0-3, right 0-3),
 * une animation par direction. La gauche est le miroir de la droite : le jeu retourne l'image.
 */
export function heldToolSheet(
  name: string,
  art: ToolArt,
  palette: Palette,
  poses: Record<'down' | 'up' | 'right', ToolPose[]>,
  frameRate: number,
): SpriteSheetSource {
  const animations: SpriteSheetSource['animations'] = {};
  for (const dir of ['down', 'up', 'right'] as const) {
    animations[`use-${dir}`] = { frames: poses[dir].map((p) => heldImage(art, p.head, p.edge)), frameRate, repeat: 0 };
  }
  return { kind: 'spritesheet', name: `tool-${name}`, frameW: HELD_SIZE, frameH: HELD_SIZE, palette, animations };
}
