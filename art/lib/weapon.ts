// Arme tenue en main pendant une attaque (docs/CONCEPTION.md, « Le combat »).
//
// Une arme n'a qu'UN dessin : couchée vers l'est (la pointe à droite), la main sur le pixel WEAPON_GRIP, au centre d'une
// image de WEAPON_SIZE de côté, en zones de matière sans ombre ni contour (comme les outils, art/lib/held.ts). La planche
// `weapon-<clé>` en est tirée en huit angles (animation `angles` : l'image k est l'arme tournée de k × 45°, 0 = est, 90 = nord,
// sens trigonométrique à l'écran, comme les angles de gestures.json), puis chaque image est éclairée en haut à gauche après la
// rotation (art/lib/light.ts). Les quarts de tour sont exacts ; les diagonales sont tirées par rotation au plus proche voisin, et
// le dessinateur peut les reprendre à la main (`retouch` : l'angle -> sa grille de zones, à la place de la rotation).
//
// Le jeu ne connaît pas les gestes de l'arme : il pose, à chaque image d'un geste du corps (gestures.json), l'image de l'angle de
// la pose, son centre sur la main (entities/ToolUse.ts, `weaponFrame` de src/world/strike.ts). Une nouvelle arme = ce dessin, et rien à faire au corps.

import { Canvas, EMPTY, type Grid, type Palette } from './canvas';
import { lightUp, type Materials } from './light';
import type { SpriteSheetSource } from './types';
import { WEAPON_ANGLES } from '../../src/world/strike';

/** Côté d'une image d'arme : la main au centre, et jusqu'à 30 px de lame ou de bâton de part et d'autre (1,5 m). */
export const WEAPON_SIZE = 64;
/** Pixel tenu par la main dans le dessin de base et dans chaque image de la planche : le centre. */
export const WEAPON_GRIP: [number, number] = [WEAPON_SIZE / 2, WEAPON_SIZE / 2];

/** Le dessin d'une arme : couchée vers l'est, en zones, avec la table de ses matières et ses diagonales reprises à la main. */
export interface WeaponArt {
  /** WEAPON_SIZE × WEAPON_SIZE, la pointe vers l'est, la main sur WEAPON_GRIP. */
  base: Grid;
  materials: Materials;
  /** Angle (1 à 7) -> sa grille de zones dessinée à la main, à la place de la rotation (même taille, main sur WEAPON_GRIP). */
  retouch?: Partial<Record<number, Grid>>;
}

/**
 * Zones du dessin tournées de `k` × 45° dans le sens trigonométrique à l'écran (y vers le bas), autour de la main. Pour chaque
 * pixel d'arrivée, le pixel de départ au plus proche : pas de trou, une ligne droite reste d'un seul tenant.
 */
export function rotateZones(base: Grid, k: number): Grid {
  const src = Canvas.from(base);
  const out = new Canvas(WEAPON_SIZE, WEAPON_SIZE);
  const [gx, gy] = WEAPON_GRIP;
  const t = ((((k % 8) + 8) % 8) * Math.PI) / 4;
  const c = Math.round(Math.cos(t) * 1e9) / 1e9;
  const s = Math.round(Math.sin(t) * 1e9) / 1e9;
  for (let y = 0; y < WEAPON_SIZE; y++) for (let x = 0; x < WEAPON_SIZE; x++) {
    const u = x - gx;
    const v = y - gy;
    // rotation inverse (de −t) : (u, v) -> (u cos t − v sin t, u sin t + v cos t), y vers le bas
    const z = src.get(Math.round(u * c - v * s) + gx, Math.round(u * s + v * c) + gy);
    if (z !== EMPTY) out.set(x, y, z);
  }
  return out.toGrid();
}

/** Les huit images de l'arme, éclairées : la k-ième est tournée de k × 45° (reprise à la main si `retouch` la donne). */
export function weaponFrames(art: WeaponArt): Grid[] {
  return Array.from({ length: WEAPON_ANGLES }, (_, k) => lightUp(art.retouch?.[k] ?? rotateZones(art.base, k), art.materials));
}

/** Planche `weapon-<nom>` : une seule animation, `angles`, de huit images (voir l'en-tête). */
export function weaponSheet(name: string, art: WeaponArt, palette: Palette): SpriteSheetSource {
  return {
    kind: 'spritesheet',
    name: `weapon-${name}`,
    frameW: WEAPON_SIZE,
    frameH: WEAPON_SIZE,
    palette,
    animations: { angles: { frames: weaponFrames(art), frameRate: 1, repeat: 0 } },
  };
}
