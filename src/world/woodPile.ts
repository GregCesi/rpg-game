// Les tas de bois, sans Phaser : leur forme se calcule d'après la pièce qu'ils entreposent, pour toute longueur et tout état, au
// lieu d'être écrite à la main dans piles.json. Un tas prend tout de sa première pièce (diamètre, forme, longueur, faces, sens) et
// n'accepte que des pièces identiques. Seul ce que Xéros porte va en tas (`carry` de strength.json, sans le multiplicateur de
// ?dieu) : un tas se construit en portant.
//
// La forme vient de la section de la pièce :
// - section ronde (la bille, le rondin, même entamé à la doloire) : une pyramide, 3 au sol, 2 dans les creux, 1 au sommet ;
// - section plate ou carrée (la demi-bille, le quartier, la poutre) : des rangées droites, 3 de large sur 3 de haut, chaque
//   pièce sur celle du dessous ; les quartiers tête-bêche (un sur deux la face debout de l'autre côté : sud et nord en est-ouest,
//   est et ouest en nord-sud, `face`).
// Au sol, les pièces sont côte à côte, à la largeur de leur collision (`woodBody`) : est-ouest, l'une derrière l'autre (plus
// un pixel, pour que le contour du bas de celle de derrière se lise) ; nord-sud, l'une à côté de l'autre. Une couche monte de la
// hauteur de la section rapportée à sa largeur (`woodDims`) : dans les creux, √3/2 de plus (des cercles qui se touchent) ; en
// rangée, toute la hauteur. Nord-sud, la largeur est vue à plat et la hauteur en raccourci (½, docs/STYLE.md section 8). L'image
// de chaque place est la pièce elle-même, assemblée à sa longueur (`woodKey` ; world/woodTexture.ts en jeu, composeWood à l'aperçu).

import { strength } from '../content';
import { woodMass } from '../content/mass';
import type { PileDef, PilePlace, PileWood, WoodPiece } from '../content/types';
import { woodDims } from './woodPiece';
import { lookDef, lookOf, woodBody, woodKey, woodSize, type WoodAxis } from './woodShape';

/** Une place de tas telle que le jeu la lit : celle de piles.json, ou celle d'un tas de bois, dont la pièce s'assemble (`wood`). */
export type ShapePlace = PilePlace & { wood?: WoodPiece };

/** Un genre de tas tel que le jeu le lit : écrit dans piles.json, ou calculé pour une pièce de bois. */
export type PileShape = Omit<PileDef, 'places' | 'turned'> & {
  places: Record<string, ShapePlace>;
  turned?: { start: string; order: 'layers' | 'depth'; places: Record<string, ShapePlace> };
};

/** Les aspects qui se rangent en rangées droites (section plate ou carrée) ; les autres font une pyramide. */
const ROWS = new Set(['half', 'quarter', 'beam']);
/** Les aspects rangés tête-bêche : un sur deux la face debout de l'autre côté. */
const HEAD_TO_TAIL = new Set(['quarter']);
/** Les deux côtés de la face debout d'un quartier tête-bêche, par sens : le premier, puis l'autre. */
const FACES = { ew: ['south', 'north'], ns: ['east', 'west'] } as const;
/** Largeur d'un tas (pièces au sol), et hauteur des rangées. */
const WIDE = 3;

/** La pièce de tas d'une pièce de bois, si elle va en tas : sans coupe ni coin, et pas plus lourde que ce que porte Xéros. */
export function pileWoodOf(piece: WoodPiece): PileWood | undefined {
  if (piece.notch || piece.wedge) return undefined;
  if (woodMass(piece) > strength.carry + 1e-9) return undefined;
  return { size: piece.size, shape: piece.shape, length: piece.length, ...(piece.hewn ? { hewn: piece.hewn } : {}) };
}

/** Deux pièces de tas identiques. */
export function sameWood(a: PileWood, b: PileWood): boolean {
  return a.size === b.size && a.shape === b.shape && a.length === b.length && (a.hewn ?? 0) === (b.hewn ?? 0);
}

/** Les places d'un tas de bois dans un sens. */
function woodPlaces(w: PileWood, axis: WoodAxis): Record<string, ShapePlace> {
  const piece: WoodPiece = { ...w, axis };
  const look = lookOf(piece);
  const img = woodSize(w.size, look, axis, w.length);
  const body = woodBody(w.size, look, axis, w.length);
  const dims = woodDims(piece);
  const ratio = dims.h / (axis === 'ew' ? dims.d : dims.w);
  const rows = ROWS.has(look);
  const flip = HEAD_TO_TAIL.has(look);
  // écart entre deux pièces voisines au sol, et montée d'une couche à l'écran
  const step = axis === 'ew' ? body.h + 1 : body.w;
  const lift = step * ratio * (rows ? 1 : Math.sqrt(3) / 2) * (axis === 'ew' ? 1 : 0.5);
  // une place à la position `f` en travers (0 à 2, demi-valeurs dans les creux), à la couche `layer`
  const place = (f: number, layer: number, on: string[], other = false): ShapePlace => {
    const [x, y] = axis === 'ew' ? [0, Math.round(-(WIDE - 1 - f) * step - layer * lift)] : [Math.round(f * step), Math.round(-layer * lift)];
    const wood: WoodPiece = flip ? { ...piece, face: FACES[axis][other ? 1 : 0] } : piece;
    const q: ShapePlace = { layer, on, image: woodKey(wood), x, y, wood };
    if (layer === 0) q.body = { x: x + Math.floor((img.w - body.w) / 2), y: y - body.bottom - body.h, w: body.w, h: body.h };
    return q;
  };
  const out: Record<string, ShapePlace> = {};
  // la place du milieu d'abord : l'ordre d'une construction type (aperçu)
  for (const i of [1, 0, 2]) out[`g${i}`] = place(i, 0, [], flip && i % 2 === 1);
  if (rows) {
    for (let layer = 1; layer < WIDE; layer++) {
      for (let i = 0; i < WIDE; i++) out[`l${layer}-${i}`] = place(i, layer, [layer === 1 ? `g${i}` : `l${layer - 1}-${i}`], flip && (i + layer) % 2 === 1);
    }
  } else {
    out.u01 = place(0.5, 1, ['g0', 'g1']);
    out.u12 = place(1.5, 1, ['g1', 'g2']);
    out.top = place(1, 2, ['u01', 'u12']);
  }
  return out;
}

const cache = new Map<string, PileShape>();

/**
 * Le genre de tas d'une pièce de bois, calculé : la pièce reprise (`piece.wood`), le départ au milieu, l'ordre de l'arrière vers
 * l'avant, la forme est-ouest et la forme nord-sud (`turned`). Toujours le même objet pour la même pièce.
 */
export function woodPileDef(w: PileWood): PileShape {
  const key = woodKey({ ...w, axis: 'ew' });
  let def = cache.get(key);
  if (!def) {
    def = {
      name: `tas de ${lookDef(w.size, lookOf(w)).name}s`,
      piece: { wood: { ...w } },
      start: 'g1',
      blockFrom: 1,
      count: false,
      order: 'depth',
      places: woodPlaces(w, 'ew'),
      turned: { start: 'g1', order: 'depth', places: woodPlaces(w, 'ns') },
    };
    cache.set(key, def);
  }
  return def;
}
