// Les tas de bois, sans Phaser : leur forme se calcule d'après la pièce qu'ils entreposent, pour toute longueur et tout état, au
// lieu d'être écrite à la main dans piles.json. Un tas prend tout de sa première pièce (diamètre, forme, longueur, faces, sens) et
// n'accepte que des pièces identiques. Seul ce que Xéros porte va en tas (`carry` de strength.json, sans le multiplicateur de
// ?dieu) : un tas se construit en portant.
//
// La forme vient de la section de la pièce :
// - section ronde (la bille, le rondin, même entamé à la doloire) : une pyramide, 3 au sol, 2 dans les creux, 1 au sommet ;
// - section plate ou carrée (la demi-bille, la poutre) : des rangées droites, 3 de large sur 3 de haut, chaque pièce sur celle du
//   dessous ; le quartier, en triangles : dans une rangée, pointe en l'air, pointe en bas (`point`), pointe en l'air, à un
//   demi-pas, le quartier pointe en bas emboîté entre ses deux voisins (proposition à faire juger par Grégoire).
// L'affichage va couche par couche, et dans une couche de l'arrière vers l'avant (de l'ouest vers l'est en nord-sud) : ce qui est
// plus haut cache ce qui est dessous, ce qui est devant ce qui est derrière. Les vues calculées des pièces (art/world/wood-section.ts)
// ont le travers à l'échelle du pas : la pièce de devant cache exactement le flanc de celle de derrière.
// Au sol, les pièces sont côte à côte, à la largeur de leur collision (`woodBody`) plus un pixel (pour que le contour de celle de
// derrière se lise) : est-ouest, l'une derrière l'autre ; nord-sud, l'une à côté de l'autre, au même écart (règle D, docs/STYLE.md
// section 8 : l'emprise au sol est la vraie, tournée). Une couche monte de la hauteur de la section rapportée à sa largeur
// (`woodDims`) : dans les creux, √3/2 de plus (des cercles qui se touchent) ; en rangée, toute la hauteur ; comptée depuis la
// pièce porteuse de devant, si bien que toutes les pièces s'emboîtent avec le même pas, dans les deux sens (est-ouest, le demi-pas
// en arrière d'un creux fait partie de la montée : la 4e bille couvre le quart haut de celle du centre). L'image
// de chaque place est la pièce elle-même, assemblée à sa longueur (`woodKey` ; world/woodTexture.ts en jeu, composeWood à l'aperçu).

import { strength } from '../content';
import { woodMass } from '../content/mass';
import type { PileDef, PilePlace, PileWood, WoodPiece } from '../content/types';
import { woodDims } from './woodPiece';
import { ageOfWood, lookDef, lookOf, woodBody, woodKey, woodSize, woodTraits, type WoodAxis } from './woodShape';

/** Une place de tas telle que le jeu la lit : celle de piles.json, ou celle d'un tas de bois, dont la pièce s'assemble (`wood`). */
export type ShapePlace = PilePlace & { wood?: WoodPiece };

/** Un genre de tas tel que le jeu le lit : écrit dans piles.json, ou calculé pour une pièce de bois. */
export type PileShape = Omit<PileDef, 'places' | 'turned'> & {
  places: Record<string, ShapePlace>;
  turned?: { start: string; order: 'layers' | 'depth'; places: Record<string, ShapePlace> };
};

/** Les aspects qui se rangent en rangées droites (section plate ou carrée) ; les autres font une pyramide. */
const ROWS = new Set(['half', 'quarter', 'beam', 'plank']);
/**
 * Les aspects rangés en triangles : dans une rangée, un sur deux pointe en bas (`point`), emboîté entre ses deux voisins pointe en
 * l'air, à un demi-pas (le quartier : ses deux faces fendues à 45° s'appuient sur celles de ses voisins).
 */
const TRIANGLES = new Set(['quarter']);
/** Largeur d'un tas (pièces au sol), et hauteur des rangées. */
const WIDE = 3;

/** La pièce de tas d'une pièce de bois, si elle va en tas : sans coupe, ni coin, ni face entamée, et pas plus lourde que ce que porte Xéros. */
export function pileWoodOf(piece: WoodPiece): PileWood | undefined {
  if (piece.notch || piece.wedge || piece.dressed) return undefined;
  if (woodMass(piece) > strength.carry + 1e-9) return undefined;
  return { size: piece.size, shape: piece.shape, length: piece.length, ...(piece.hewn ? { hewn: piece.hewn } : {}), ...woodTraits(piece) };
}

/** Deux pièces de tas identiques (écorcées ou non, et du même âge). */
export function sameWood(a: PileWood, b: PileWood): boolean {
  return a.size === b.size && a.shape === b.shape && a.length === b.length && (a.hewn ?? 0) === (b.hewn ?? 0) && lookOf(a) === lookOf(b) && ageOfWood(a) === ageOfWood(b);
}

/** Les places d'un tas de bois dans un sens. */
function woodPlaces(w: PileWood, axis: Exclude<WoodAxis, 'up'>): Record<string, ShapePlace> {
  const piece: WoodPiece = { ...w, axis };
  const look = lookOf(piece);
  const img = woodSize(w.size, look, axis, w.length);
  const body = woodBody(w.size, look, axis, w.length);
  // la section vue de l'est-ouest : le nord-sud a la même (règle D)
  const ew = woodBody(w.size, look, 'ew', w.length);
  const dims = woodDims({ ...piece, axis: 'ew' });
  const ratio = dims.h / dims.d;
  const rows = ROWS.has(look);
  const tri = TRIANGLES.has(look);
  // écart entre deux pièces voisines au sol (le pas), et montée d'une couche à l'écran : une pièce est à un pas de sa porteuse de
  // devant (× √3/2 dans un creux, × la hauteur de la section rapportée à sa largeur), dans les deux sens, ronde ou non
  const step = ew.h + 1;
  const lift = step * ratio * (rows ? 1 : Math.sqrt(3) / 2);
  // est-ouest, la place d'un creux est déjà un demi-pas en arrière, donc plus haut à l'écran : ce demi-pas fait partie de la montée
  // (le compter en plus faisait flotter la pièce du creux au-dessus de celle de devant)
  const back = rows ? 0 : step / 2;
  // en triangles, les pièces d'une rangée sont à un demi-pas : pointe en l'air, pointe en bas, pointe en l'air
  const pitch = tri ? step / 2 : step;
  // une place à la position `f` en travers (0 à 2, demi-valeurs dans les creux), à la couche `layer`
  const place = (f: number, layer: number, on: string[], down = false): ShapePlace => {
    const [x, y] =
      axis === 'ew'
        ? [0, Math.round(-(WIDE - 1 - f) * pitch - layer * (lift - back))]
        : [Math.round(f * pitch), Math.round(-layer * lift)];
    const wood: WoodPiece = down ? { ...piece, point: 'down' } : piece;
    const q: ShapePlace = { layer, on, image: woodKey(wood), x, y, wood };
    if (layer === 0) q.body = { x: x + Math.floor((img.w - body.w) / 2), y: y - body.bottom - body.h, w: body.w, h: body.h };
    return q;
  };
  const out: Record<string, ShapePlace> = {};
  // de l'arrière (ou de l'ouest) vers l'avant : à hauteur égale, l'ordre d'affichage suit celui des places
  for (const i of [0, 1, 2]) out[`g${i}`] = place(i, 0, [], tri && i % 2 === 1);
  if (rows) {
    for (let layer = 1; layer < WIDE; layer++) {
      for (let i = 0; i < WIDE; i++) out[`l${layer}-${i}`] = place(i, layer, [layer === 1 ? `g${i}` : `l${layer - 1}-${i}`], tri && i % 2 === 1);
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
 * Le genre de tas d'une pièce de bois, calculé : la pièce reprise (`piece.wood`), le départ au milieu, l'ordre d'affichage couche
 * par couche (ce qui est plus haut cache ce qui est dessous, ce qui est devant ce qui est derrière), la forme est-ouest et la forme
 * nord-sud (`turned`). Toujours le même objet pour la même pièce.
 */
export function woodPileDef(w: PileWood): PileShape {
  const key = woodKey({ ...w, axis: 'ew' });
  let def = cache.get(key);
  if (!def) {
    def = {
      name: `tas de ${lookDef(w.size, lookOf(w)).name.split(' ').map((m) => `${m}s`).join(' ')}`,
      piece: { wood: { ...w } },
      start: 'g1',
      blockFrom: 1,
      // tout tas compte ses pièces (le contrat d'un tas, docs/objets/README.md) : le nombre s'affiche quand Xéros est tout près
      count: true,
      order: 'layers',
      places: woodPlaces(w, 'ew'),
      turned: { start: 'g1', order: 'layers', places: woodPlaces(w, 'ns') },
    };
    cache.set(key, def);
  }
  return def;
}
