// La pièce de bois sans Phaser : comment son image s'assemble à sa longueur, où est sa collision, où tombe une coupe. C'est le
// contrat entre le dessin (art/world/wood-pieces.ts, qui tire de ces mêmes opérations les images de 1 m) et le jeu
// (world/woodTexture.ts, qui assemble l'image d'une pièce à la volée). La géométrie de chaque diamètre et de chaque aspect est
// dans src/content/wood.json : un nouveau bois = un diamètre ou un aspect là, et ses dessins.
//
// Une image s'assemble en trois parties prises dans une planche par diamètre et par sens (`<sheet>` est-ouest, `<sheet>-ns`
// nord-sud) : le bout de départ (ouest ou nord), le milieu répété (`tile` px, le dernier exemplaire coupé), le bout d'arrivée (est
// ou sud), posé en dernier, par-dessus le départ quand la pièce est plus courte que ses deux bouts. Animations de la planche :
// - `<aspect>-start`, `<aspect>-mid`, `<aspect>-end` : les trois parties de chaque aspect (4 images pour le rond, qui roule : un
//   tour ; une pour les autres) ;
// - `notch1`, `notch2` : la bande d'encoche d'une coupe (un tiers, deux tiers ; 4 images comme le rond), qui remplace à sa place
//   les colonnes (est-ouest) ou les rangées (nord-sud) de l'image ;
// - pour un aspect qui se fend (`split` du diamètre) : `wedge-<aspect>-start`, `wedge-<aspect>-end`, le bout où le coin est
//   planté (il remplace la partie de ce bout) ; `crack-<aspect>-start|mid|end`, la fente (transparente ailleurs, posée par-dessus,
//   sur la partie de la longueur déjà fendue depuis le bout du coin) ; `open-<aspect>-start|mid|end`, le bois grand ouvert du
//   dernier coup (il remplace les parties de l'aspect).
// Dans la planche, chaque partie est calée en haut à gauche de son image (cadre commun, assez grand pour la plus grande).

import { CM_PER_PX } from '../content/gabarit';
import woodJson from '../content/wood.json';
import { WoodSchema, type End, type WoodLook, type WoodLookDef, type WoodPiece, type WoodSize } from '../content/types';

export type WoodAxis = 'ew' | 'ns';

/** Le bois de wood.json (lu ici sans passer par content/index.ts, pour que le dessin s'en serve sans les cartes générées). */
export const WOOD = WoodSchema.parse(woodJson);

/** Le diamètre `size` de wood.json. */
export function sizeOf(size: string): WoodSize {
  const s = WOOD.sizes[size];
  if (!s) throw new Error(`wood.json : diamètre « ${size} » inconnu`);
  return s;
}

/** L'aspect `look` du diamètre `size`. */
export function lookDef(size: string, look: WoodLook): WoodLookDef {
  const l = sizeOf(size).looks[look];
  if (!l) throw new Error(`wood.json : le diamètre « ${size} » n'a pas d'aspect « ${look} »`);
  return l;
}

/** Images d'un aspect : 4 pour le rond (il roule), 1 pour les autres. */
export const framesOf = (look: WoodLook) => (look === 'round' ? 4 : 1);

/** Longueur en pixels (contour compris) d'une pièce de `cm` centimètres. */
export const lengthPx = (cm: number) => Math.round(cm / CM_PER_PX);

/** Faces dressées d'une pièce (0 à 4). */
export function facesOf(piece: Pick<WoodPiece, 'hewn'>): number {
  return Math.min(WOOD.hew.faces, Math.floor((piece.hewn ?? 0) / WOOD.hew.perFace));
}

/** L'aspect d'une pièce : demi, quart, ou, ronde, selon ses faces dressées (une tous les `perFace` coups de doloire). */
export function lookOf(piece: Pick<WoodPiece, 'shape' | 'hewn'>): WoodLook {
  if (piece.shape !== 'round') return piece.shape;
  return (['round', 'f1', 'f2', 'f3', 'beam'] as const)[facesOf(piece)];
}

/**
 * Taille de l'image d'une pièce. Est-ouest : n + 1 colonnes (n la longueur en pixels ; la colonne de plus porte le bout de
 * l'ombre) sur `ew.h` rangées. Nord-sud : `ns.w` colonnes sur `ns.extra` + la moitié de n (le dessus vu à ½) rangées.
 */
export function woodSize(size: string, look: WoodLook, axis: WoodAxis, cm: number): { w: number; h: number } {
  const n = lengthPx(cm);
  const g = lookDef(size, look);
  return axis === 'ew' ? { w: n + 1, h: g.ew.h } : { w: g.ns.w, h: g.ns.extra + Math.round(n / 2) };
}

/**
 * Collision au sol (format `body` de props.json : centrée en bas de l'image, `bottom` px au-dessus du bas) : est-ouest, la
 * longueur moins un pixel sur la profondeur de l'aspect ; nord-sud, la largeur de l'aspect sur la moitié de la longueur plus `extra`.
 */
export function woodBody(size: string, look: WoodLook, axis: WoodAxis, cm: number): { w: number; h: number; bottom: number } {
  const n = lengthPx(cm);
  const g = lookDef(size, look);
  return axis === 'ew'
    ? { w: Math.max(1, n - 1), h: g.ew.body.h, bottom: g.ew.body.bottom }
    : { w: g.ns.body.w, h: Math.round(n / 2) + g.ns.body.extra, bottom: g.ns.body.bottom };
}

/** Une partie posée dans l'image : laquelle, où (colonne est-ouest, rangée nord-sud), et combien de pixels on en garde. */
export interface Placement {
  part: 'start' | 'mid' | 'end';
  at: number;
  size: number;
}

/** Les parties d'une image de `cm` centimètres, dans l'ordre où on les pose (le bout d'arrivée en dernier). */
export function placements(size: string, look: WoodLook, axis: WoodAxis, cm: number): Placement[] {
  const g = lookDef(size, look);
  const ends = axis === 'ew' ? g.ew : g.ns;
  const tile = sizeOf(size).tile;
  const { w, h } = woodSize(size, look, axis, cm);
  const total = axis === 'ew' ? w : h;
  const out: Placement[] = [{ part: 'start', at: 0, size: Math.min(ends.start, total) }];
  for (let at = ends.start; at < total - ends.end; at += tile) out.push({ part: 'mid', at, size: Math.min(tile, total - ends.end - at) });
  const end = Math.max(0, total - ends.end);
  out.push({ part: 'end', at: end, size: total - end });
  return out;
}

/**
 * Où tombe dans l'image une coupe à `cm` centimètres du bout de départ (ouest, nord) : la colonne (est-ouest) ou la rangée
 * (nord-sud, la rangée `back` est le bout nord ; 1 px = 10 cm en raccourci) qui suit la coupe.
 */
export function cutPixel(size: string, look: WoodLook, axis: WoodAxis, cm: number): number {
  return axis === 'ew' ? lengthPx(cm) : lookDef(size, look).ns.back + Math.round(cm / (2 * CM_PER_PX));
}

/** Première colonne (est-ouest) ou rangée (nord-sud) de la bande d'encoche d'une coupe à `cm` du bout de départ. */
export function notchPixel(size: string, look: WoodLook, axis: WoodAxis, cm: number): number {
  const n = sizeOf(size).notch;
  return cutPixel(size, look, axis, cm) - (axis === 'ew' ? n.ew.at : n.ns.at);
}

/** L'inverse de `cutPixel` : la distance (cm) au bout de départ d'un point de l'image (colonne ou rangée, fractionnaire). */
export function cmAt(size: string, look: WoodLook, axis: WoodAxis, px: number): number {
  return axis === 'ew' ? px * CM_PER_PX : (px - lookDef(size, look).ns.back) * 2 * CM_PER_PX;
}

/** La partie de la planche (départ ou arrivée) où se trouve le bout `end` d'une pièce. */
export const partOfEnd = (end: End): 'start' | 'end' => (end === 'west' || end === 'north' ? 'start' : 'end');

/**
 * Une opération de dessin : poser les pixels [0, size[ (le long de la pièce) de l'image `frame` de l'animation `anim` à `at`
 * (seulement ceux qui tombent dans `clip`, s'il est donné), ou effacer une bande.
 */
export type DrawOp =
  | { kind: 'part'; anim: string; frame: number; at: number; size: number; clip?: [number, number] }
  | { kind: 'clear'; at: number; size: number };

/** Ce qu'on assemble d'une pièce au-delà de ses réglages : l'image du roulement, la fente grande ouverte du dernier coup. */
export interface ComposeOpts {
  frame?: number;
  open?: boolean;
}

/**
 * Les opérations qui dessinent une pièce, dans l'ordre (le jeu et le dessin les suivent à l'identique) : les parties de son aspect
 * (`open-…` au dernier coup de masse ; la partie du bout du coin remplacée par `wedge-…`), puis la fente qui court depuis ce bout
 * sur la part de la longueur déjà fendue (`crack-…`, rognée par `clip`), puis l'encoche de la coupe (on efface sa bande, on la
 * peint). Une pièce coin planté ne roule pas : elle montre l'image 0.
 */
export function composeOps(piece: WoodPiece, opts: ComposeOpts = {}): DrawOp[] {
  const look = lookOf(piece);
  const k = piece.wedge || opts.open ? 0 : (opts.frame ?? 0) % framesOf(look);
  const { size, axis, length } = piece;
  const places = placements(size, look, axis, length);
  const wedgePart = piece.wedge ? partOfEnd(piece.wedge.end) : undefined;
  const ops: DrawOp[] = places.map((p) => ({
    kind: 'part',
    anim: p.part === wedgePart && !opts.open ? `wedge-${look}-${p.part}` : `${opts.open ? 'open-' : ''}${look}-${p.part}`,
    frame: k,
    at: p.at,
    size: p.size,
  }));
  if (piece.wedge && piece.wedge.hits > 0 && !opts.open) {
    const { w, h } = woodSize(size, look, axis, length);
    const total = axis === 'ew' ? w : h;
    const run = Math.round((total * piece.wedge.hits) / WOOD.split.hits);
    const clip: [number, number] = wedgePart === 'start' ? [0, run] : [total - run, total];
    for (const p of places) ops.push({ kind: 'part', anim: `crack-${look}-${p.part}`, frame: 0, at: p.at, size: p.size, clip });
  }
  if (piece.notch) {
    const n = sizeOf(size).notch;
    const at = notchPixel(size, look, axis, piece.notch.at);
    const band = axis === 'ew' ? n.ew.w : n.ns.h;
    ops.push({ kind: 'clear', at, size: band });
    ops.push({ kind: 'part', anim: `notch${Math.min(2, piece.notch.hits)}`, frame: k, at, size: band });
  }
  return ops;
}

/** Une longueur dite en mètres, au décimètre : « 2,6 m », « 3 m ». */
export function metresLabel(cm: number): string {
  return `${String(Math.round(cm / 10) / 10).replace('.', ',')} m`;
}
