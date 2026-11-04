// La charge, sans Phaser (docs/CONCEPTION.md, « Les créatures » et « La vie de Xéros ») : la physique d'une bête qui charge (le
// sanglier), réglée par ses données (`charge`, `stun`, `mass`, `dims` de creatures.json), sans une ligne pour une espèce. Une seule
// physique pour les chocs : l'énergie d'un corps en mouvement (½ m v²), et ses dégâts par la règle des coups (world/strike.ts).
// - La ligne libre : elle ne charge que si rien de dur n'est entre elle et Xéros (un buisson ne compte pas : elle le traverse).
// - Le choc contre Xéros est mou : la bête emporte Xéros ; l'énergie perdue dans le choc (½ μ v², μ la masse réduite) le blesse pour
//   la part `tusk`, et Xéros repart à la vitesse commune, freiné au sol par son frottement (health.json `knockdown.friction`).
// - Le choc contre un obstacle : toute l'énergie reste dans la bête ; elle est sonnée au prorata de cette énergie (`stun`).

import type { CreatureDef } from '../content/types';
import { CM_PER_PX } from '../content/gabarit';

type Point = { x: number; y: number };

/** Ce qui est en un point pour une bête qui charge : un obstacle dur (tronc, rocher, mur), mou (un buisson), le bord de la zone, ou rien. */
export type Ground = 'solid' | 'soft' | 'edge' | undefined;

/** Énergie d'un corps de `kg` à `v` m/s, en joules. */
export const kineticJ = (kg: number, v: number): number => 0.5 * kg * v * v;

/**
 * Le choc mou d'une bête de `kg` lancée à `v` m/s contre Xéros (`xerosKg`, immobile) : l'énergie perdue dans le choc (J), la vitesse
 * commune après le choc (m/s), et la glissade de Xéros au sol jusqu'à l'arrêt (m), freiné par `friction` sous la pesanteur `gravity`
 * (m/s², `throw.gravity` de combat.json) : v² / 2 μ g.
 */
export function goreXeros(kg: number, v: number, xerosKg: number, friction: number, gravity: number): { lost: number; after: number; slide: number } {
  const mu = (kg * xerosKg) / (kg + xerosKg);
  const after = (kg * v) / (kg + xerosKg);
  return { lost: 0.5 * mu * v * v, after, slide: (after * after) / (2 * friction * gravity) };
}

/** Combien de secondes un choc de `joules` contre un obstacle sonne la bête : rien sous `stun.from`, sinon au prorata de `stun.at`. */
export function stunSeconds(def: CreatureDef, joules: number): number {
  const s = def.stun;
  if (!s || joules < s.from) return 0;
  return (s.seconds * joules) / s.at;
}

/** La moitié de la largeur du corps d'une bête, en px (le couloir que demande sa charge). */
export const halfWidth = (def: CreatureDef): number => def.dims.d / CM_PER_PX / 2;

/** La moitié de sa longueur, en px (du milieu au groin). */
export const halfLength = (def: CreatureDef): number => def.dims.w / CM_PER_PX / 2;

/**
 * La ligne de `a` à `b` est-elle libre pour un corps de `half` px de demi-largeur ? Rien de dur (`solid`, `edge`) sur trois lignes
 * parallèles (le milieu et les deux flancs), pixel par pixel ; un buisson (`soft`) ne barre pas.
 */
export function lineFree(a: Point, b: Point, half: number, ground: (x: number, y: number) => Ground): boolean {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 1e-6) return true;
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const n = Math.ceil(len);
  for (const off of [-half, 0, half]) {
    const ox = -uy * off;
    const oy = ux * off;
    for (let i = 1; i <= n; i++) {
      const g = ground(a.x + ox + ux * i, a.y + oy + uy * i);
      if (g === 'solid' || g === 'edge') return false;
    }
  }
  return true;
}

/**
 * Ce qu'il y a devant le groin d'une bête dont le milieu est en `c`, lancée selon `u` (unitaire) : le pire de trois points (le groin et
 * les deux épaules, à `half` px de part et d'autre), `ahead` px devant le milieu.
 */
export function front(c: Point, u: Point, ahead: number, half: number, ground: (x: number, y: number) => Ground): Ground {
  let worst: Ground;
  for (const off of [0, -half, half]) {
    const g = ground(c.x + u.x * ahead - u.y * off, c.y + u.y * ahead + u.x * off);
    if (g === 'solid' || g === 'edge') return g;
    if (g === 'soft') worst = 'soft';
  }
  return worst;
}
