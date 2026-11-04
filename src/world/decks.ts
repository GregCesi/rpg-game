// Les dessus qui se marchent (chantier « maison du coq », CONCEPTION « L'étage »), sans Phaser : le plancher, la marche, la dalle,
// tout ce qui porte `walk` dans les données (props.json, ou l'aspect d'une pièce de bois dans wood.json). Leur boîte exacte, jamais
// rastérisée : un giron de 26 cm reste une marche de 19 cm, pas une pente. Avec eux, deux sols peuvent être au même point (la salle à
// 0, la chambre à 2,85 m) : Xéros a sa hauteur à lui (`z`, composant Mobility), et le sol sous ses pieds est le plus haut dessus qu'il
// atteint d'un pas, le corps libre au-dessus.
//
// Tout est en cm (le repère des pièces posées) ; les hauteurs aussi.

import { XEROS_HEIGHT } from '../config';
import { props } from '../content';
import type { BuildPlaced, Mobility } from '../content/types';
import { boxOf, type Box3 } from './build';
import { lookDef, lookOf } from './woodShape';

/** Un dessus qui se marche : l'emprise de sa pièce (cm), sa base et son haut. */
export interface Deck {
  x: number;
  y: number;
  w: number;
  d: number;
  base: number;
  top: number;
  /** La pièce posée, si elle en a un identifiant. */
  id?: number;
}

/** Le côté d'une case de l'index (cm) : 1,60 m. */
const CELL = 160;

/** Les dessus d'une carte, rangés par case pour aller vite. */
export interface DeckField {
  readonly decks: readonly Deck[];
  readonly empty: boolean;
  readonly cells: ReadonlyMap<number, readonly Deck[]>;
}

/** Une pièce posée se marche-t-elle (`walk` de son objet, ou de l'aspect couché de sa pièce de bois) ? */
export function walkable(p: BuildPlaced): boolean {
  if ('prop' in p.piece) return !!props[p.piece.prop]?.walk;
  if ('wood' in p.piece) return p.piece.wood.axis !== 'up' && !!lookDef(p.piece.wood.size, lookOf(p.piece.wood)).walk;
  return false;
}

const key = (i: number, j: number) => i * 100003 + j;

/** Le champ vide (une carte sans pièce qui se marche). */
export const NO_DECKS: DeckField = { decks: [], empty: true, cells: new Map() };

/** Les dessus des pièces posées. */
export function deckField(pieces: readonly (BuildPlaced & { id?: number })[]): DeckField {
  const decks: Deck[] = [];
  for (const p of pieces) {
    if (!walkable(p)) continue;
    const b: Box3 = boxOf(p);
    decks.push({ x: b.x, y: b.y, w: b.w, d: b.d, base: b.z, top: b.z + b.h, id: p.id });
  }
  if (!decks.length) return NO_DECKS;
  const cells = new Map<number, Deck[]>();
  for (const k of decks) {
    for (let i = Math.floor(k.x / CELL); i <= Math.floor((k.x + k.w) / CELL); i++)
      for (let j = Math.floor(k.y / CELL); j <= Math.floor((k.y + k.d) / CELL); j++) {
        const list = cells.get(key(i, j)) ?? [];
        list.push(k);
        cells.set(key(i, j), list);
      }
  }
  return { decks, empty: false, cells };
}

/** Les dessus qui couvrent le point (x, y), bords nord et ouest compris, sud et est exclus. */
export function decksAt(f: DeckField, x: number, y: number): Deck[] {
  if (f.empty) return [];
  return (f.cells.get(key(Math.floor(x / CELL), Math.floor(y / CELL))) ?? []).filter((k) => x >= k.x && x < k.x + k.w && y >= k.y && y < k.y + k.d);
}

/** Y a-t-il un dessus près du point (x, y), à `r` cm près ? (Hors des maisons, la règle du relief seule.) */
export function decksNear(f: DeckField, x: number, y: number, r = CELL): boolean {
  if (f.empty) return false;
  for (const [dx, dy] of [
    [0, 0],
    [-r, 0],
    [r, 0],
    [0, -r],
    [0, r],
  ])
    if (f.cells.has(key(Math.floor((x + dx) / CELL), Math.floor((y + dy) / CELL)))) return true;
  return false;
}

/** Le sol posé en `c` est-il libre pour un corps de `head` cm (aucun dessus dont le volume passe entre c et c + head) ? */
function freeAt(over: readonly Deck[], c: number, head: number): boolean {
  return !over.some((k) => k.top > c && k.base < c + head);
}

/** Ce qui empêche un pas sur les dessus : monter plus que `step`, descendre plus que `drop`. Les mêmes que le relief. */
export type DeckRefusal = { why: 'up' | 'down'; height: number };

/**
 * Le sol sous les pieds en (x, y) pour qui était à la hauteur `z` (cm) : le plus haut dessus (ou le terrain, `ground`) qu'il atteint
 * d'un pas (au plus `z + step`, et devant lui : sa base sous sa tête), où son corps tient (rien au-dessus avant `head`). Sous le plancher, il reste en bas ; sur la marche,
 * il monte d'une marche. Rend aussi le refus, s'il y en a un : un dessus plus haut que `step` lui barre le passage (la face d'une
 * marche vue de côté), ou le sol trouvé est plus bas que `drop` (le bord de la trémie).
 */
export function footAt(f: DeckField, ground: number, x: number, y: number, z: number, mob: Mobility, head = XEROS_HEIGHT): { z: number; refused?: DeckRefusal } {
  const here = decksAt(f, x, y);
  // un dessus s'atteint s'il est devant lui (sa base sous sa tête : jamais le plancher au-dessus de lui, même pour qui grimpe tout)
  // et d'un pas (au plus `step` plus haut)
  const tops = [ground, ...here.filter((k) => k.base < z + head && k.top <= z + mob.step).map((k) => k.top)].sort((a, b) => b - a);
  for (const c of tops) {
    if (!freeAt(here, c, head)) continue;
    if (z - c > mob.drop) return { z: c, refused: { why: 'down', height: z - c } };
    return { z: c };
  }
  // rien qu'il atteigne où son corps tienne : le plus bas des dessus qui lui barrent le passage
  const blocking = here.filter((k) => k.top > z + mob.step && k.base < z + head).map((k) => k.top - z);
  return { z, refused: { why: 'up', height: blocking.length ? Math.min(...blocking) : mob.step } };
}

/**
 * Le pas de `from` à `to` (les pieds, cm), parti de la hauteur `z` : la hauteur d'arrivée, ou le refus. Le trajet est suivi tous les
 * `probe` cm : une marche étroite (un giron de 26 cm) n'est jamais sautée par le pas long d'une machine lente.
 */
export function deckStep(
  f: DeckField,
  groundAt: (x: number, y: number) => number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  z: number,
  mob: Mobility,
  probe = 5,
): { z: number; refused?: DeckRefusal } {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  const n = Math.max(1, Math.ceil(len / probe));
  let h = z;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const r = footAt(f, groundAt(x, y), x, y, h, mob);
    if (r.refused) return { z, refused: r.refused };
    h = r.z;
  }
  return { z: h };
}

/** Le sol le plus proche de la hauteur `z` en (x, y) (une pose : le rechargement, une arrivée) ; sans `z`, le plus bas. */
export function settleAt(f: DeckField, ground: number, x: number, y: number, z?: number, head = XEROS_HEIGHT): number {
  const here = decksAt(f, x, y);
  const tops = [ground, ...here.map((k) => k.top)].filter((c) => freeAt(here, c, head));
  if (!tops.length) return ground;
  if (z === undefined) return Math.min(...tops);
  return tops.reduce((best, c) => (Math.abs(c - z) < Math.abs(best - z) ? c : best), tops[0]);
}

/** Le plus haut dessus en (x, y) qui ne dépasse pas `max` (cm) : où se pose un objet lâché par qui est à `max − step`. */
export function topBelow(f: DeckField, ground: number, x: number, y: number, max: number): number {
  return Math.max(ground, ...decksAt(f, x, y).filter((k) => k.top <= max).map((k) => k.top));
}

/**
 * Les niveaux d'un ensemble de dessus (cm) : les hauteurs dont les dessus couvrent au moins `area` cm², deux hauteurs à moins de
 * `merge` cm l'une de l'autre n'en faisant qu'une (la dalle de 8 cm et la terre battue : le rez-de-chaussée, à 0). Le sol (0) est
 * toujours le premier niveau. Les marches, trop petites, n'en sont pas.
 */
export function storeyHeights(decks: readonly Deck[], area: number, merge: number): number[] {
  const byTop = new Map<number, number>();
  for (const k of decks) byTop.set(k.top, (byTop.get(k.top) ?? 0) + k.w * k.d);
  const big = [...byTop].filter(([, a]) => a >= area).map(([t]) => t).sort((a, b) => a - b);
  const out = [0];
  for (const t of big) if (t - out[out.length - 1] >= merge) out.push(t);
  return out;
}

/** Le niveau où sont des pieds à la hauteur `z` : le plus haut dont le plancher est au plus à mi-hauteur au-dessus d'eux. */
export function storeyOf(levels: readonly number[], z: number): number {
  let k = 0;
  for (let i = 1; i < levels.length; i++) if (z >= levels[i] - (levels[i] - levels[i - 1]) / 2) k = i;
  return k;
}
