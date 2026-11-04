// La petite carte (docs/CONCEPTION.md, « La petite carte »), sans Phaser : la grille du monde, une couleur par case de 1,60 m, nord en
// haut, calculée depuis les cartes et la partie, jamais dessinée ; la petite carte du HUD en est une fenêtre ronde centrée sur Xéros
// (systems/minimap.ts), la carte entière (M, plus tard) la montrera toute.
//   1. le sol : la couleur de la famille de chaque tuile (src/generated/minimap.json, tirée des dessins par tools/build-minimap.ts) ;
//   2. les arbres debout (les objets dont la définition a une géométrie d'arbre, `tree` de props.json) : un point d'une case à leur pied,
//      tels que la partie les a laissés (un arbre abattu devient sa souche, qui n'a pas `tree` : son point disparaît) ;
//   3. les bâtiments : chaque pièce posée (`builds` de la partie, les plans de Tiled pas encore posés, les pièces d'un chantier) colore
//      les cases dont le centre tombe dans son emprise au sol, de la plus basse à la plus haute : le toit, posé en dernier, donne au
//      bâtiment sa couleur et sa forme. Sa couleur : celle de son image à son âge ; la pièce de bois, son écorce ou son bois travaillé.
// La grille est celle du monde (chaque zone peinte à sa place, `world` de la carte) : aucune couture entre les zones.
import { TILE } from '../config';
import { maps, props } from '../content';
import { CM_PER_PX } from '../content/gabarit';
import type { BuildPlaced, BuildPlan, MapData } from '../content/types';
import colors from '../generated/minimap.json';
import type { MapState } from '../state/GameState';
import { ageOf, boxOf, planPieces } from './build';

/** Une case de la petite carte, en cm (une tuile). */
export const CM_PER_CELL = TILE * CM_PER_PX;

/** Une couleur '#rrggbb' en entier RGBA tel que le lit un Uint32Array posé sur des pixels de canevas (petit-boutiste : A B G R). */
export function packColor(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

const TILE_COLORS = colors.tiles.map((c) => (c ? packColor(c) : 0));
const IMAGE_COLORS = new Map(Object.entries(colors.images as Record<string, string>).map(([k, c]) => [k, packColor(c)]));
/** La couleur d'un arbre debout. */
export const TREE_COLOR = packColor(colors.tree);
const BARK = packColor(colors.bark);
const WOOD = { new: packColor(colors.wood.new), worn: packColor(colors.wood.worn), old: packColor(colors.wood.old) };

/** La couleur de la tuile numéro `n` du jeu `world` (0 : aucune). */
export const tileColor = (n: number): number => TILE_COLORS[n] ?? 0;

/** Les zones du monde (les cartes qui ont une place dans monde.world). */
export const ZONES: MapData[] = Object.values(maps).filter((m) => m.world);

/** Le coin d'une zone dans le monde, en cases. */
export const zoneCorner = (m: MapData): { x: number; y: number } => ({ x: Math.round(m.world!.x / TILE), y: Math.round(m.world!.y / TILE) });

/** La grille du monde : une couleur par case (0 hors des zones). */
export class WorldGrid {
  readonly cells: Uint32Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.cells = new Uint32Array(w * h);
  }
  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.cells[y * this.w + x];
  }
  set(x: number, y: number, c: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return;
    this.cells[y * this.w + x] = c;
  }
}

/** La grille vide qui tient toutes les zones. */
export function emptyGrid(zones: readonly MapData[] = ZONES): WorldGrid {
  const w = Math.max(...zones.map((m) => zoneCorner(m).x + m.width));
  const h = Math.max(...zones.map((m) => zoneCorner(m).y + m.height));
  return new WorldGrid(w, h);
}

/** La couleur d'une pièce posée : son image à son âge ; la pièce de bois, son écorce (ronde, ni équarrie ni écorcée) ou son bois travaillé. */
export function pieceColor(p: BuildPlaced): number {
  const age = ageOf(p) ?? 'new';
  if ('wood' in p.piece) {
    const w = p.piece.wood;
    return (w.shape ?? 'round') === 'round' && !w.hewn && !w.peeled ? BARK : WOOD[age];
  }
  if (!('prop' in p.piece)) return 0;
  const def = props[p.piece.prop];
  if (!def) return 0;
  return IMAGE_COLORS.get(def.aged && age !== 'new' ? `${def.image}-${age}` : def.image) ?? IMAGE_COLORS.get(def.image) ?? 0;
}

/** Une emprise au sol en cm (dans la zone), son haut (pour l'ordre) et sa couleur. */
interface Footprint {
  x: number;
  y: number;
  w: number;
  d: number;
  top: number;
  color: number;
}

/** Les pièces posées d'une zone telle que la partie la laisse : `builds`, les plans de Tiled pas encore posés, les pièces des chantiers. */
function footprints(m: MapData, s: MapState | undefined, plans: Readonly<Record<string, BuildPlan>>): Footprint[] {
  const out: Footprint[] = [];
  const add = (p: BuildPlaced) => {
    const color = pieceColor(p);
    if (!color) return;
    const b = boxOf(p);
    out.push({ x: b.x, y: b.y, w: b.w, d: b.d, top: b.z + b.h, color });
  };
  for (const p of s?.builds ?? []) add(p);
  // un plan de Tiled jamais posé (zone pas encore vue) se lit de son plan, sans rien écrire dans la partie
  for (const pl of m.plans) {
    if (s?.seeded.includes(pl.id)) continue;
    const plan = plans[pl.plan];
    if (!plan) continue;
    const at = { x: Math.round(pl.x * CM_PER_PX), y: Math.round(pl.y * CM_PER_PX), z: 0 };
    for (const p of planPieces({ ...plan, ...(pl.age ? { age: pl.age } : {}) }, at)) add(p);
  }
  // les pièces d'un chantier guidé (plans.json) : des objets nés, posés par leur coin bas gauche
  for (const site of s?.sites ?? []) {
    for (const id of Object.values(site.placed)) {
      const o = s!.spawned.find((q) => q.id === id);
      const def = o && props[o.type];
      if (!o || !def?.dims) continue;
      const color = IMAGE_COLORS.get(def.image) ?? 0;
      if (!color) continue;
      out.push({ x: o.x * CM_PER_PX, y: o.y * CM_PER_PX - def.dims.d, w: def.dims.w, d: def.dims.d, top: def.dims.h, color });
    }
  }
  return out;
}

/** Les pieds des arbres debout d'une zone, en px de la zone, tels que la partie les a laissés (changés, nés). */
export function treeFeet(m: MapData, s: MapState | undefined): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const add = (type: string | undefined, x: number, y: number) => {
    const def = type ? props[type] : undefined;
    if (!def?.tree) return;
    out.push({ x: x + (def.dims ? def.dims.w / CM_PER_PX / 2 : TILE / 2), y: y - 2 });
  };
  for (const o of m.objects) {
    if (o.inside) continue;
    const c = s?.changes[String(o.id)];
    if (c) add(c.type, c.x, c.y);
    else add(o.type, o.x, o.y);
  }
  for (const o of s?.spawned ?? []) add(o.type, o.x, o.y);
  return out;
}

/**
 * Peint une zone dans la grille du monde, d'après sa carte et ce que la partie y a changé : le sol, les arbres, les pièces. `plans` : les
 * plans du bac à sable (`buildPlans` de content dans le jeu ; les outils les lisent sans Vite, tools/lib/build-plans.ts).
 */
export function paintZone(grid: WorldGrid, m: MapData, s: MapState | undefined, plans: Readonly<Record<string, BuildPlan>>): void {
  const c0 = zoneCorner(m);
  const ground = m.layers.ground;
  for (let j = 0; j < m.height; j++) {
    for (let i = 0; i < m.width; i++) {
      const x = c0.x + i;
      const y = c0.y + j;
      if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) continue;
      const n = ground[j * m.width + i];
      grid.cells[y * grid.w + x] = n >= 0 ? tileColor(n) : 0;
    }
  }
  for (const t of treeFeet(m, s)) {
    // seulement dans la zone : une zone repeinte ne touche jamais à ses voisines
    const i = Math.floor(t.x / TILE);
    const j = Math.floor(t.y / TILE);
    if (i >= 0 && j >= 0 && i < m.width && j < m.height) grid.set(c0.x + i, c0.y + j, TREE_COLOR);
  }
  for (const p of footprints(m, s, plans).sort((a, b) => a.top - b.top)) {
    // les cases dont le centre tombe dans l'emprise
    const i0 = Math.ceil(p.x / CM_PER_CELL - 0.5);
    const i1 = Math.floor((p.x + p.w) / CM_PER_CELL - 0.5);
    const j0 = Math.ceil(p.y / CM_PER_CELL - 0.5);
    const j1 = Math.floor((p.y + p.d) / CM_PER_CELL - 0.5);
    for (let j = Math.max(0, j0); j <= Math.min(m.height - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(m.width - 1, i1); i++) grid.set(c0.x + i, c0.y + j, p.color);
  }
}

/** Les zones dont le rectangle croise un carré de `half` cases autour de la case (x, y) du monde. */
export function zonesAround(x: number, y: number, half: number, zones: readonly MapData[] = ZONES): MapData[] {
  return zones.filter((m) => {
    const c = zoneCorner(m);
    return x + half >= c.x && x - half < c.x + m.width && y + half >= c.y && y - half < c.y + m.height;
  });
}

/** La case du monde d'un point en px d'une zone (ses pieds). */
export function worldCell(m: MapData, px: number, py: number): { x: number; y: number } {
  const c = zoneCorner(m);
  return { x: c.x + Math.floor(px / TILE), y: c.y + Math.floor(py / TILE) };
}

/**
 * La fenêtre ronde de la petite carte, en pixels du canevas : `size` × `size` pixels (pair : inner × ZOOM), `px` pixels par case,
 * centrée sur la case (x, y) du monde, dont les pixels sont ceux du centre (pour `px` pair, exactement les `px` pixels du milieu).
 * Hors du disque : 0 (transparent) ; hors des zones : `outside`. Écrit dans `out` (size × size).
 */
export function drawWindow(grid: WorldGrid, x: number, y: number, size: number, px: number, outside: number, out: Uint32Array): void {
  const c = size / 2;
  const r2 = c * c;
  for (let v = 0; v < size; v++) {
    const dy = v + 0.5 - c;
    const cy = y + Math.floor((v - c + px / 2) / px);
    for (let u = 0; u < size; u++) {
      const dx = u + 0.5 - c;
      if (dx * dx + dy * dy > r2) {
        out[v * size + u] = 0;
        continue;
      }
      const cx = x + Math.floor((u - c + px / 2) / px);
      out[v * size + u] = grid.get(cx, cy) || outside;
    }
  }
}

/** Le cran suivant de la petite carte (un clic sur la carte), dans l'ordre des crans, puis retour au premier. */
export const nextStep = (step: number, count: number): number => (step + 1) % count;
