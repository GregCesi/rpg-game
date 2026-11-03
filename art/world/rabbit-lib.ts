// Outils des dessins du lapin (art/world/rabbit-shapes.ts) : poser un corps dans la frame de la planche `rabbit`
// avec son ombre, tirer les quatre vues au sol du lapin mort d'un dessin en zones, éclairer un dessin en zones de la robe.

import { Canvas, EMPTY, castShadow, type Grid } from '../lib/canvas';
import { lightUp, type Materials } from '../lib/light';
import { FRAME, type RabbitDir, type RabbitPose } from './rabbit-types';

/** Couleurs de la terre et du trou que toute robe reprend de `world` (art/palette.ts), pour l'entrée de garenne. */
export const EARTH_KEYS = ['u', 'U', 'n', 'e', 'f', 'F', '3', '5', 'g', 'G', 'y', 'V', 'o', 'x'] as const;

/** Matières de la robe, pour `lightUp` : la robe (zone `f`), le blanc du ventre et de la queue (`w`), l'œil (`i`). */
export const ROBE: Materials = {
  f: { light: 'l', base: 'b', shade: 's', dark: 'k' },
  w: { light: 'w', base: 'w', shade: 'v', dark: 'k' },
  i: { light: 'i', base: 'i', shade: 'i', dark: 'k' },
};

/**
 * Un corps (grille recadrée, contour compris, sans ombre) posé dans la frame : son bas sur la rangée FRAME.ground − `lift`,
 * centré (plus `dx`). L'ombre portée `x` est sur la rangée sous les pieds, sous toute la largeur du corps décalée d'un pixel vers
 * la droite ; en l'air, elle raccourcit d'un pixel de chaque côté par pixel de hauteur, sans tomber sous 2 px.
 */
export function frame(body: Grid, lift = 0, dx = 0): Grid {
  const c = new Canvas(FRAME.w, FRAME.h);
  const w = body[0].length, h = body.length;
  const x0 = Math.floor((FRAME.w - w) / 2) + dx;
  const y0 = FRAME.ground - lift - h + 1;
  // l'ombre d'abord, le corps par-dessus
  let a = 0, b = w - 1;
  for (let x = 0; x < w; x++) if (body.some((r) => r[x] !== EMPTY)) { a = x; break; }
  for (let x = w - 1; x >= 0; x--) if (body.some((r) => r[x] !== EMPTY)) { b = x; break; }
  const cut = Math.min(lift, Math.max(0, Math.floor((b - a - 1) / 2)));
  for (let x = a + 1 + cut; x <= b + 1 - cut; x++) c.set(x0 + x, FRAME.ground + 1, 'x');
  if (lift === 0) for (let x = a + 1; x <= b + 1; x++) if (body[h - 1][x - 1] !== EMPTY && body[h - 1][x] === EMPTY) c.set(x0 + x, FRAME.ground, 'x');
  c.stamp(body, x0, y0);
  return c.toGrid();
}

/** Une pose : une liste de [corps, lift, dx]. */
export type Frames = [Grid, number?, number?][];
export const framesOf = (list: Frames): Grid[] => list.map(([g, lift = 0, dx = 0]) => frame(g, lift, dx));

/** Les poses posées dans leurs frames. */
export function posesOf(src: Record<RabbitPose, Record<RabbitDir, Frames>>): Record<RabbitPose, Record<RabbitDir, Grid[]>> {
  const out = {} as Record<RabbitPose, Record<RabbitDir, Grid[]>>;
  for (const [pose, dirs] of Object.entries(src) as [RabbitPose, Record<RabbitDir, Frames>][]) {
    out[pose] = { down: framesOf(dirs.down), up: framesOf(dirs.up), right: framesOf(dirs.right) };
  }
  return out;
}

/** Remplace des pixels : [x, y, couleur]. */
export function edit(g: Grid, px: [number, number, string][]): Grid {
  const c = Canvas.from(g);
  for (const [x, y, k] of px) c.set(x, y, k);
  return c.toGrid();
}

/** Quart de tour dans le sens des aiguilles d'une montre (sur des zones, avant l'éclairage). */
export function rotateCW(g: Grid): Grid {
  const h = g.length, w = g[0].length;
  return Array.from({ length: w }, (_, y) => Array.from({ length: h }, (_, x) => g[h - 1 - x][y]).join(''));
}

/**
 * Les quatre vues au sol du lapin mort, tirées d'un dessin en zones de la vue est-ouest, tête à l'ouest (`ground`) : chaque vue
 * est le même dessin tourné d'un quart de tour de plus (règle D : la nord-sud a les dimensions de l'est-ouest inversées), puis
 * éclairé en haut à gauche et contouré (art/lib/light.ts), puis son ombre portée. Le dessin doit laisser un pixel de marge.
 */
export function deadViews(zones: Grid, materials: Materials = ROBE): [Grid, Grid, Grid, Grid] {
  const r1 = rotateCW(zones), r2 = rotateCW(r1), r3 = rotateCW(r2);
  return [zones, r1, r2, r3].map((z) => castShadow(trim(lightUp(z, materials)))) as [Grid, Grid, Grid, Grid];
}

/** Recadre une grille sur ses pixels pleins. */
export function trim(g: Grid): Grid {
  const filled = (r: string) => /[^.]/.test(r);
  const y0 = g.findIndex(filled);
  const y1 = g.length - 1 - [...g].reverse().findIndex(filled);
  const kept = g.slice(y0, y1 + 1);
  const x0 = Math.min(...kept.filter(filled).map((r) => r.search(/[^.]/)));
  const x1 = Math.max(...kept.filter(filled).map((r) => r.length - 1 - [...r].reverse().join('').search(/[^.]/)));
  return kept.map((r) => r.slice(x0, x1 + 1));
}

/** Une grille posée au centre d'une image carrée `size`, sa rangée `gripRow` et sa colonne `gripCol` sur le centre. */
export function onGrip(g: Grid, size: number, gripCol: number, gripRow: number): Grid {
  const c = Math.floor(size / 2);
  return new Canvas(size, size).stamp(g, c - gripCol, c - gripRow).toGrid();
}

/** Vérifie qu'une grille n'utilise que des couleurs de la palette (sinon le build ou l'essai s'arrête en le disant). */
export function checkColors(name: string, g: Grid, palette: Record<string, string>): void {
  for (const r of g) for (const ch of r) if (ch !== EMPTY && !palette[ch]) throw new Error(`lapins : ${name} utilise « ${ch} », absent de la palette`);
}
