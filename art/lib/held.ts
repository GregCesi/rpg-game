// Outil tenu en main pendant un geste (coup de hache, de pioche, de houe...).
//
// RÈGLE DE VUE. Coup horizontal (use-* : de côté, sur ce qui est debout) : on voit la face de l'outil, de profil,
// silhouette complète (docs/references/hache-vue-de-cote.png). Coup vertical (chop-* : de haut en bas, sur ce qui est
// couché) : on le voit par la tranche, un bloc étroit et sombre au bout du manche (docs/references/hache-vue-de-dessus.png).
//
// Le geste appartient au corps (art/characters/xeros.ts) : pour chaque image, il dit où sont les mains,
// vers où pointe la tête de l'outil, de quel côté est le tranchant, si l'outil passe derrière le corps et dans
// quel plan il frappe. L'outil fournit deux familles de dessins de TOOL_SIZE de côté, dans une convention commune.
// Un outil long (la hache de bûcheron : 18 px de la prise au fer) y tient dans toutes les orientations.
//
// De face (vue `face`, coup horizontal) : silhouette complète du manche et du fer, de profil.
//   - `diag`    : la tête vers le haut à droite (manche du bas à gauche vers le haut à droite, comme l'icône
//                 d'inventaire), tranchant vers le haut à gauche ; la main tient le manche au pixel DIAG_GRIP ;
//   - `upright` : la tête en haut, manche vertical, tranchant à gauche ; main au pixel UPRIGHT_GRIP.
//   Toutes les orientations s'en déduisent sans perte, par quarts de tour et miroir. La tête pointe vers une
//   direction au sol, dessinée telle quelle à l'écran (la vue trois quarts ne raccourcit pas l'outil).
//
// Par la tranche (vue `edge`, coup vertical) : on ne voit jamais la lame déployée ; le fer n'est qu'un bloc étroit
// et sombre au bout du manche, d'où dépasse le bout du manche. Le coup a lieu dans un plan vertical : la tête pointe
// vers une direction de l'écran et le manche garde toute sa longueur.
//   - `flat`     : tête vers la droite, manche horizontal ; main au pixel FLAT_GRIP ;
//   - `flatDiag` : tête vers le haut à droite, manche en escalier à 45° ; main au pixel FLAT_DIAG_GRIP ;
//   - `flatEnd`  : tête vers le haut, manche vertical ; main au pixel FLAT_END_GRIP.
//   Le côté du tranchant ('ccw' dans ces dessins) ne se lit qu'au pied du bloc, qui pousse d'un pixel vers la prise
//   de ce côté-là (pas en diagonale). Seuls les miroirs gauche-droite et haut-bas en tirent les autres orientations ;
//   en diagonale, le tranchant n'y a donc qu'un côté par direction, sans effet visible.
//
// Les dessins ne portent ni ombre ni contour : ils disent seulement de quelle matière est chaque pixel
// (zones, avec leur table `materials`). L'image est éclairée après la rotation (art/lib/light.ts), si bien
// que la lumière vient du haut à gauche dans toutes les orientations, et le contour suit la même règle.
// Un nouvel outil = ces cinq dessins, puis `heldToolSheet` : aucune animation du corps à refaire.
// Le jeu pose le centre de chaque image de la planche (la prise du manche) sur la main du geste.

import { Canvas, EMPTY, type Grid, type Palette } from './canvas';
import { lightUp, type Materials } from './light';
import { woodAges, world } from '../palette';
import type { SpriteSheetSource } from './types';

/** Côté d'un dessin de base d'outil en main. */
export const TOOL_SIZE = 48;
/**
 * Pixel tenu par la main la plus proche du fer, dans les cinq dessins de base : au centre, pour que l'outil y tienne
 * quelle que soit sa direction. L'autre main tient le bout du manche, juste derrière.
 */
export const GRIP: Vec = [24, 24];
/** Pixel tenu par la main dans le dessin `diag`. */
const DIAG_GRIP: Vec = GRIP;
/** Pixel tenu par la main dans le dessin `upright`. */
const UPRIGHT_GRIP: Vec = GRIP;
/** Pixel tenu par la main dans le dessin `flat`. */
const FLAT_GRIP: Vec = GRIP;
/** Pixel tenu par la main dans le dessin `flatDiag`. */
const FLAT_DIAG_GRIP: Vec = GRIP;
/** Pixel tenu par la main dans le dessin `flatEnd`. */
const FLAT_END_GRIP: Vec = GRIP;

export type Vec = [number, number];

/** Huit directions de l'écran (n = haut). De face, une direction au sol se dessine telle quelle à l'écran. */
export type Dir8 = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
const DIRS: Dir8[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']; // sens horaire, par huitièmes de tour

/**
 * Côté du tranchant, vu depuis le manche : 'cw' s'il est du côté où tourne une aiguille de montre
 * (le tranchant mène un coup qui tourne dans le sens horaire), 'ccw' sinon.
 */
export type Edge = 'cw' | 'ccw';

/** Ce que la caméra voit de l'outil : sa face, de profil (`face`, coup horizontal), ou sa tranche (`edge`, coup vertical). */
export type View = 'face' | 'edge';

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
const mirrorDir = (d: Dir8): Dir8 => DIRS[(8 - DIRS.indexOf(d)) % 8];
/** Direction vue dans un miroir horizontal (haut <-> bas). */
const flipDirY = (d: Dir8): Dir8 => DIRS[(12 - DIRS.indexOf(d)) % 8];

const rotCW = ([x, y]: Vec): Vec => [TOOL_SIZE - 1 - y, x];
const flipPx = ([x, y]: Vec): Vec => [TOOL_SIZE - 1 - x, y];
const flipPy = ([x, y]: Vec): Vec => [x, TOOL_SIZE - 1 - y];

type Base = 'diag' | 'upright' | 'flat' | 'flatDiag' | 'flatEnd';
const GRIPS: Record<Base, Vec> = {
  diag: DIAG_GRIP, upright: UPRIGHT_GRIP, flat: FLAT_GRIP, flatDiag: FLAT_DIAG_GRIP, flatEnd: FLAT_END_GRIP,
};
/** Tête de chaque dessin vu par la tranche (tranchant côté 'ccw'). */
const FLAT_HEADS: [Base, Dir8][] = [['flat', 'e'], ['flatDiag', 'ne'], ['flatEnd', 'n']];

interface Transform { base: Base; turns: number; flip: boolean; flipY: boolean }

/**
 * Transformation qui amène un des dessins à l'orientation voulue : quarts de tour horaires, puis miroirs.
 * Les dessins de base ont le tranchant côté 'ccw' ; chaque miroir le change de côté.
 * Par la tranche, pas de quart de tour : `flatDiag` n'existe que tête ne/sw tranchant 'ccw', nw/se tranchant 'cw'.
 */
function transformFor(head: Dir8, edge: Edge, view: View = 'face'): Transform {
  if (view === 'edge') {
    for (const [base, h] of FLAT_HEADS) for (const flip of [false, true]) for (const flipY of [false, true]) {
      let d = h;
      if (flip) d = mirrorDir(d);
      if (flipY) d = flipDirY(d);
      if (d === head && (flip !== flipY ? 'cw' : 'ccw') === edge) return { base, turns: 0, flip, flipY };
    }
    throw new Error(`held : pas de dessin par la tranche tête vers « ${head} », tranchant « ${edge} »`);
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
export function gripOf(head: Dir8, edge: Edge, view: View = 'face'): Vec {
  const t = transformFor(head, edge, view);
  return mapPx(GRIPS[t.base], t);
}

/** Zones de l'outil orientées (sans lumière) : tête vers `head`, tranchant du côté `edge`. */
function orientZones(art: ToolArt, head: Dir8, edge: Edge, view: View = 'face'): Grid {
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
 * Zones de l'outil orienté, de profil, sans lumière ni contour, dans un carré de TOOL_SIZE (prise au pixel `gripOf`) :
 * pour un objet posé qui le montre en partie (la hache plantée dans le billot). L'appelant cache ce qui est enfoui,
 * puis éclaire le reste avec lightUp (art/lib/light.ts), si bien que le contour ne court que là où l'outil est en l'air.
 */
export const orientedZones = (art: ToolArt, head: Dir8, edge: Edge): Grid => orientZones(art, head, edge);

/** Pose de l'outil pour une image d'un geste, telle que le corps la décrit. */
export interface ToolPose {
  /** Pixel des mains jointes sur le manche, dans la frame du personnage. */
  hand: Vec;
  /** Direction de la main vers la tête de l'outil (de face : direction au sol, dessinée telle quelle à l'écran). */
  head: Dir8;
  edge: Edge;
  /** L'outil se dessine derrière le corps. */
  behind: boolean;
  /** Vue de l'outil (`face` si absent) : de profil pour un coup horizontal, par la tranche pour un coup vertical. */
  view?: View;
  /** Traînée du fer depuis la pose de l'image précédente (le temps « abattre » des gestes de travail), dessinée sous l'outil. */
  trail?: boolean;
}

/** Dessin de base employé pour une pose (pour l'aide de gestures.json). */
export const baseOf = (p: ToolPose): Base => transformFor(p.head, p.edge, p.view).base;

/**
 * Côté d'une image de la planche `tool-<objet>` (carré pair). La prise du manche y est toujours au pixel HELD_GRIP ;
 * l'outil s'étend jusqu'à 22 px autour (fer et contour compris), sa traînée jusqu'à 40 (elle part de la pose précédente :
 * le fer tombé de la tête aux pieds en une image).
 */
export const HELD_SIZE = 80;
/** Centre de l'image, arrondi vers le bas : le jeu pose ce pixel sur la main. */
const HELD_GRIP: Vec = [HELD_SIZE / 2, HELD_SIZE / 2];

/** Image de la planche : l'outil orienté, sa prise posée sur HELD_GRIP, éclairé une fois en place. */
export function heldImage(art: ToolArt, head: Dir8, edge: Edge, view: View = 'face'): Grid {
  const [gx, gy] = gripOf(head, edge, view);
  const zones = new Canvas(HELD_SIZE, HELD_SIZE).stamp(orientZones(art, head, edge, view), HELD_GRIP[0] - gx, HELD_GRIP[1] - gy);
  return lightUp(zones.toGrid(), art.materials);
}

/**
 * Signes de la traînée dans la planche (ceux de la traînée des gestes de combat, effectPalette de xeros-combat.ts) : `(` presque
 * plein (parchemin), `)` à moitié, `<` la queue (lumière du bois neuf, transparente). Des signes que la palette des outils
 * n'emploie pas.
 */
const TRAIL_PALETTE: Palette = {
  '(': `${world.a}e0`,
  ')': `${world.a}99`,
  '<': `${woodAges.new['^']}60`,
};

/** Le bout du fer d'une image d'outil (prise en HELD_GRIP) : sa distance à la prise, le long de la direction de la tête. */
function reachOf(img: Grid, head: Dir8): number {
  const a = (angleOf(head) * Math.PI) / 180;
  let best = 0;
  img.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === EMPTY) return;
    best = Math.max(best, (x - HELD_GRIP[0]) * Math.cos(a) - (y - HELD_GRIP[1]) * Math.sin(a));
  }));
  return best;
}

/**
 * Traînée du fer de la pose `a` (image `ia`) à la pose `b` (image `ib`), dans le repère d'une image de la planche (la prise de `b`
 * en HELD_GRIP) : un arc balayé par le fer (de profil, l'outil tourne à plat), ou une ligne du fer de départ au fer d'arrivée
 * (par la tranche, un demi-tour par-dessus la tête vu de face ou de dos). Plus pleine près de l'arrivée.
 */
function trailOf(a: ToolPose, ia: Grid, b: ToolPose, ib: Grid): Canvas {
  const c = new Canvas(HELD_SIZE, HELD_SIZE);
  const ra = reachOf(ia, a.head);
  const rb = reachOf(ib, b.head);
  const a0 = angleOf(a.head);
  let delta = ((angleOf(b.head) - a0) % 360 + 360) % 360;
  if (delta > 180) delta -= 360;
  // la prise de `a` dans le repère de `b`
  const ga: Vec = [HELD_GRIP[0] + a.hand[0] - b.hand[0], HELD_GRIP[1] + a.hand[1] - b.hand[1]];
  const gb: Vec = HELD_GRIP;
  const put = (x: number, y: number, k: string) => {
    const X = Math.round(x);
    const Y = Math.round(y);
    if (X < 0 || Y < 0 || X >= HELD_SIZE || Y >= HELD_SIZE) return;
    const old = c.get(X, Y);
    const rank = (s: string) => '()<'.indexOf(s);
    if (old === EMPTY || rank(old) > rank(k)) c.set(X, Y, k);
  };
  const tip = (g: Vec, ang: number, r: number): Vec => [g[0] + Math.cos((ang * Math.PI) / 180) * r, g[1] - Math.sin((ang * Math.PI) / 180) * r];
  if (b.view === 'edge' && (Math.abs(delta) >= 179 || delta === 0)) {
    const p0 = tip(ga, a0, ra * 0.85);
    const p1 = tip(gb, angleOf(b.head), rb * 0.85);
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      for (const dx of [-1, 0, 1]) {
        const k = dx !== 0 ? (t > 0.5 ? ')' : '<') : t > 0.6 ? '(' : t > 0.3 ? ')' : '<';
        put(p0[0] + (p1[0] - p0[0]) * t + dx, p0[1] + (p1[1] - p0[1]) * t, k);
      }
    }
    return c;
  }
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const g: Vec = [ga[0] + (gb[0] - ga[0]) * t, ga[1] + (gb[1] - ga[1]) * t];
    const ang = a0 + delta * t;
    const reach = ra + (rb - ra) * t;
    for (let r = 0.72 - 0.2 * t; r <= 1.0001; r += 0.04) {
      const [x, y] = tip(g, ang, reach * r);
      put(x, y, t > 0.66 ? '(' : t > 0.33 ? ')' : '<');
    }
  }
  return c;
}

/** Un geste du corps : les poses de l'outil par direction (8 images chacune pour les gestes de travail) et sa cadence. */
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
      const list = poses[dir];
      const images = list.map((p) => heldImage(art, p.head, p.edge, p.view));
      const frames = images.map((img, i) => {
        const p = list[i];
        if (!p.trail || i === 0) return img;
        // la traînée sous l'outil
        const c = trailOf(list[i - 1], images[i - 1], p, img);
        img.forEach((row, y) => [...row].forEach((ch, x) => ch !== EMPTY && c.set(x, y, ch)));
        return c.toGrid();
      });
      animations[`${gesture}-${dir}`] = { frames, frameRate, repeat: 0 };
    }
  }
  return { kind: 'spritesheet', name: `tool-${name}`, frameW: HELD_SIZE, frameH: HELD_SIZE, palette: { ...palette, ...TRAIL_PALETTE }, animations };
}
