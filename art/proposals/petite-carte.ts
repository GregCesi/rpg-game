// Essai de la petite carte du HUD (chantier « petite carte », préparation : hors jeu, rien n'entre dans le jeu). Le calcul pur, sans
// Phaser ni fichiers : ce qui deviendra src/world/minimap.ts à l'implémentation. Les entrées sont lues par tools/essai-petite-carte.ts.
//
// La petite carte, un pixel par case (1,60 m), nord en haut, calculée depuis les cartes et la partie, jamais dessinée :
//   1. le sol : chaque tuile prend la couleur de sa famille (grass, grass2… → grass ; path-0…15 → path), et la couleur d'une famille
//      est la teinte de la palette la plus fréquente dans ses tuiles (une seule source : le dessin des tuiles) ;
//   2. les arbres debout (les objets dont la définition a une géométrie d'arbre, `tree` de props.json) : un point vert sombre (`k`) à
//      la case de leur pied ;
//   3. les bâtiments : chaque pièce posée (plans de Tiled, mode construction) couvre les cases dont le centre tombe dans son emprise
//      au sol, de la plus basse à la plus haute : le toit, posé en dernier, donne au bâtiment sa couleur et sa forme ; la couleur d'une
//      pièce est la teinte la plus fréquente de son image (le chaume, les planches à leur âge).
// Le monde entier tient dans une grille de cases (1 000 × 800 m : 625 × 500 cases) ; la petite carte en est une fenêtre ronde centrée
// sur Xéros, sans couture entre les zones puisque la grille est celle du monde.

export type Rgb = [number, number, number];

/** La famille d'une tuile : son nom sans le numéro de raccord (path-7 → path) ni le numéro de variante (grass3 → grass, field-ns2 → field). */
export function tileFamily(name: string): string {
  const base = name.replace(/-\d+$/, '').replace(/\d+$/, '');
  if (base.startsWith('bridge')) return 'bridge';
  if (base === 'field-ns') return 'field';
  if (base === 'flowers') return 'grass';
  return base;
}

/** '#rrggbb' en Rgb. */
export function hexRgb(hex: string): Rgb {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/** La teinte de la palette la plus proche (distance euclidienne en RGB). */
export function nearest(c: Rgb, palette: readonly Rgb[]): Rgb {
  let best = palette[0];
  let bd = Infinity;
  for (const p of palette) {
    const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

/** Compte des teintes (ramenées à la palette) dans des pixels RGBA ; les pixels à demi transparents ne comptent pas. */
export function countColors(data: Uint8Array, palette: readonly Rgb[], into = new Map<string, { c: Rgb; n: number }>()): Map<string, { c: Rgb; n: number }> {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const c = nearest([data[i], data[i + 1], data[i + 2]], palette);
    const k = c.join(',');
    const e = into.get(k);
    if (e) e.n++;
    else into.set(k, { c, n: 1 });
  }
  return into;
}

/** La teinte la plus fréquente d'un compte. */
export function dominant(counts: Map<string, { c: Rgb; n: number }>): Rgb | undefined {
  let best: { c: Rgb; n: number } | undefined;
  for (const e of counts.values()) if (!best || e.n > best.n) best = e;
  return best?.c;
}

/** La grille du monde : une teinte par case (`undefined` hors des zones). */
export class WorldGrid {
  readonly cells: (Rgb | undefined)[];
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.cells = new Array(w * h);
  }
  get(x: number, y: number): Rgb | undefined {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return undefined;
    return this.cells[y * this.w + x];
  }
  set(x: number, y: number, c: Rgb): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.cells[y * this.w + x] = c;
  }
}

/** Une zone vue par la petite carte : son coin dans le monde (en cases), sa taille, ses tuiles (noms), ses arbres et ses pièces posées. */
export interface ZoneInput {
  cx: number;
  cy: number;
  width: number;
  height: number;
  /** Le nom de la tuile de chaque case (rangée par rangée). */
  ground: (string | undefined)[];
  /** Les pieds des arbres debout, en px de la zone. */
  trees: { x: number; y: number }[];
  /** Les pièces posées, en cm de la zone : emprise au sol, haut (z + h) et teinte. */
  pieces: { x: number; y: number; w: number; d: number; top: number; color: Rgb }[];
  /** D'autres marques d'une case (tas, arbres couchés : options de la planche), en px de la zone. */
  marks?: { x: number; y: number; color: Rgb }[];
}

export const TILE_PX = 32;
export const CM_PER_CELL = 160;

/** Remplit la grille du monde avec une zone : le sol, puis les arbres et les marques, puis les pièces de la plus basse à la plus haute. */
export function paintZone(grid: WorldGrid, z: ZoneInput, families: Record<string, Rgb>, tree: Rgb): void {
  for (let j = 0; j < z.height; j++) {
    for (let i = 0; i < z.width; i++) {
      const name = z.ground[j * z.width + i];
      const c = name ? families[tileFamily(name)] : undefined;
      if (c) grid.set(z.cx + i, z.cy + j, c);
    }
  }
  for (const m of z.marks ?? []) grid.set(z.cx + Math.floor(m.x / TILE_PX), z.cy + Math.floor(m.y / TILE_PX), m.color);
  for (const t of z.trees) grid.set(z.cx + Math.floor(t.x / TILE_PX), z.cy + Math.floor(t.y / TILE_PX), tree);
  for (const p of [...z.pieces].sort((a, b) => a.top - b.top)) {
    // les cases dont le centre tombe dans l'emprise
    const i0 = Math.ceil(p.x / CM_PER_CELL - 0.5);
    const i1 = Math.floor((p.x + p.w) / CM_PER_CELL - 0.5);
    const j0 = Math.ceil(p.y / CM_PER_CELL - 0.5);
    const j1 = Math.floor((p.y + p.d) / CM_PER_CELL - 0.5);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) grid.set(z.cx + i, z.cy + j, p.color);
  }
}

/**
 * La fenêtre ronde de la petite carte : `size` cases de côté (impair), centrée sur la case (x, y) du monde ; hors du disque,
 * `undefined` ; hors du monde, `outside` (le bord du monde se voit).
 */
export function minimapWindow(grid: WorldGrid, x: number, y: number, size: number, outside: Rgb): (Rgb | undefined)[] {
  const r = size / 2;
  const half = Math.floor(size / 2);
  const out: (Rgb | undefined)[] = new Array(size * size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const dx = i + 0.5 - r;
      const dy = j + 0.5 - r;
      if (dx * dx + dy * dy > r * r) continue;
      out[j * size + i] = grid.get(x - half + i, y - half + j) ?? outside;
    }
  }
  return out;
}

/** Ajoute à `into` (r, g, b, nombre) les pixels opaques de `data` (RGBA). */
export function sumColors(data: Uint8Array, into: number[] = [0, 0, 0, 0]): number[] {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    into[0] += data[i];
    into[1] += data[i + 1];
    into[2] += data[i + 2];
    into[3]++;
  }
  return into;
}

/** La teinte moyenne d'une somme, ramenée à la teinte la plus proche de la palette : la couleur « aplatie » d'une tuile ou d'une image. */
export function meanColor(sum: number[], palette: readonly Rgb[]): Rgb | undefined {
  if (!sum[3]) return undefined;
  return nearest([sum[0] / sum[3], sum[1] / sum[3], sum[2] / sum[3]], palette);
}
