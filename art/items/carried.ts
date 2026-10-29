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
import felled from '../world/felled';
import { darkest, outline } from './lib';
import { axeArt, toolPalette } from './tools';
import xeros, { SHOULDER_POINTS } from '../characters/xeros';

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
// La branche sèche de l'icône item-branch : une tige de deux pixels (environ 10 cm), un rameau, un bout cassé clair.
// Tenue par le gros bout dans le poing, elle pend un peu en avant : de face elle descend vers nous, de dos elle
// s'éloigne (raccourcie, sous le corps), de profil elle part en avant et vers le bas.

const BRANCH_SIZE = 19;
const BRANCH_C = Math.floor(BRANCH_SIZE / 2);

const wood: Materials = {
  M: { light: 'M', base: 'm', shade: 'N', dark: 'N' },
  U: { light: 'U', base: 'U', shade: 'u', dark: 'N' }, // bout cassé, bois clair
};

/** Une tige en zones : des segments de 2 px de large (le pixel donné et celui de droite), du point a au point b. */
function stick(c: Canvas, pts: [number, number][], width = 2) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / n);
      const y = Math.round(y0 + ((y1 - y0) * k) / n);
      for (let w = 0; w < width; w++) c.set(x + w, y, 'M');
    }
  }
}

function branchZones(view: View): Canvas {
  const c = new Canvas(BRANCH_SIZE, BRANCH_SIZE);
  const C = BRANCH_C;
  if (view === 'down') {
    stick(c, [[C, C - 3], [C, C + 2], [C + 1, C + 6]]);
    stick(c, [[C + 1, C + 3], [C + 3, C + 5]], 1); // rameau vers le dehors
    c.set(C + 1, C + 7, 'U').set(C + 2, C + 7, 'U');
  } else if (view === 'up') {
    stick(c, [[C, C - 2], [C, C + 4]]);
    stick(c, [[C + 1, C + 2], [C + 3, C + 4]], 1);
    c.set(C, C + 5, 'U').set(C + 1, C + 5, 'U');
  } else {
    stick(c, [[C - 1, C - 2], [C, C], [C + 5, C + 5]]);
    stick(c, [[C + 3, C + 3], [C + 6, C + 3], [C + 7, C + 2]], 1); // rameau vers l'avant
    c.set(C + 6, C + 6, 'U').set(C + 5, C + 6, 'U');
  }
  return c;
}

const heldBranch = (): SpriteSheetSource => {
  const views = {} as Record<View, Grid>;
  for (const v of ['down', 'up', 'right'] as const) views[v] = lightUp(branchZones(v).toGrid(), wood);
  // le poing (2 × 2, le point est son pixel du bas côté extérieur) se voit par-dessus la tige
  views.down = fistGap(views.down, BRANCH_C, [[0, 0], [1, 0], [0, -1], [1, -1]]);
  views.right = fistGap(views.right, BRANCH_C, [[0, 0], [1, 0], [0, -1], [1, -1]]);
  return sheet('held-branch', BRANCH_SIZE, world, views);
};

// ---------- Bille portée ----------
// La bille felled-log-1 (art/world/felled.ts) portée à deux mains devant lui. De face et de dos, en longueur : la
// bille couchée elle-même, sans son ombre au sol. De profil, on la voit par le bout : la face de coupe ronde (11 px de
// diamètre, 55 cm), ses cernes et l'écorce autour, avec le dessus de l'écorce qui fuit derrière elle.

const LOG_SIZE = 25;
const LOG_C = Math.floor(LOG_SIZE / 2);

function logLengthwise(): Grid {
  const src = (felled as (ImageSource | SpriteSheetSource)[]).find((s) => s.name === 'felled-log-1');
  if (!src || src.kind !== 'image') throw new Error('carried : felled-log-1 introuvable');
  const body = src.grid.map((r) => r.replace(/x/g, EMPTY)).filter((r) => /[^.]/.test(r));
  const c = new Canvas(LOG_SIZE, LOG_SIZE);
  // le milieu de la bille sur la prise
  c.stamp(body, LOG_C - Math.floor(body[0].length / 2), LOG_C - Math.floor(body.length / 2));
  return c.toGrid();
}

/**
 * Par le bout : la face de coupe, un disque de 11 px (bois de bout clair en haut à gauche, cernes en anneaux, cœur
 * sombre), cerclée d'écorce ; au-dessus, le dessus de l'écorce qui fuit derrière elle (la bille s'éloigne de nous),
 * éclairé à gauche. Le disque est sous la prise : les mains le tiennent par-dessous.
 */
function logEnd(): Grid {
  const c = new Canvas(LOG_SIZE, LOG_SIZE);
  const cx = LOG_C + 0.5, cy = LOG_C + 2.5, r = 5.5, back = 5;
  // dessus de l'écorce, de la face au bout lointain
  for (let y = 0; y < LOG_SIZE; y++) for (let x = 0; x < LOG_SIZE; x++) {
    const u = (x + 0.5 - cx) / r;
    if (Math.abs(u) > 1) continue;
    const top = cy - back - r * Math.sqrt(1 - u * u) * 0.5; // bout lointain, arrondi
    if (y + 0.5 < top || y + 0.5 > cy) continue;
    c.set(x, y, u < 0.2 ? 'M' : u < 0.65 ? 'm' : 'N'); // le dessus fait face à la lumière
  }
  c.within('M', (c) => c.line(LOG_C - 2, LOG_C - 4, LOG_C, LOG_C - 4, 'm')); // fente d'écorce
  // face de coupe
  for (let y = 0; y < LOG_SIZE; y++) for (let x = 0; x < LOG_SIZE; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    const d = Math.hypot(dx, dy);
    if (d > r) continue;
    const lit = dx + dy < -1; // côté lumière, en haut à gauche
    // écorce : son bord du haut, en arc sombre, détache la face du dessus ; à gauche, elle prend la lumière
    if (d > r - 1) c.set(x, y, dx < -2.5 && dy > -2 ? 'm' : 'N');
    else if (d < 0.8) c.set(x, y, 'T'); // cœur, un pixel voulu
    else if (d > 2.6 && d < 3.4) c.set(x, y, lit ? 't' : 'T'); // cerne
    else c.set(x, y, lit ? 'Y' : 't');
  }
  return outline(c, darkest({ M: 'K', m: 'K', N: 'K', Y: 'N', t: 'N', T: 'N' }, 'o')).toGrid();
}

const heldFelledLog = (): SpriteSheetSource => {
  const lengthwise = logLengthwise();
  return sheet('held-felled-log', LOG_SIZE, world, { down: lengthwise, up: lengthwise, right: logEnd() });
};

export default [heldAxe(), heldBranch(), heldFelledLog()];
