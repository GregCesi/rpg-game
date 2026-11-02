// La chaux (fiche docs/objets/lime.md) : la chaux vive, des mottes blanches sorties du four à chaux, et la chaux éteinte, une pâte
// blanche dans le seau de bois cerclé (art/world/props.ts). Échelle du jeu (5 cm par pixel), lumière en haut à gauche, contour d'un
// pixel (teinte la plus sombre de la matière en haut et à gauche, OUTLINE en bas et à droite), ombre portée `x` en bas à droite.
//
// Matière : la chaux vient du calcaire (CONCEPTION, « La maison de Xéros ») ; elle prend la rampe du calcaire de la palette
// (`! + = ; ~`), plus blanche que la pierre : le blanc de cassure `!` y domine, le crème `+` aux faces tournées vers le jour, `=` et
// `;` seulement dans les creux entre les mottes et au pied ; `~` (brun-violet) trace le contour côté lumière.
//
// - La chaux vive au sol (`quicklime-ground`) : un petit tas de mottes de 35 × 30 × 20 cm, boîte : 7 × (4 + 3) = 7 × 7 px. Trois
//   mottes cuites, anguleuses (le calcaire cuit garde ses cassures) : deux devant, une derrière, posée sur elles ; les fentes entre
//   elles en `=` et `;`.
// - La chaux éteinte au sol (`slaked-lime-ground`) : le seau (30 × 30 × 30 cm, 6 × 9 px, l'anse en plus : 6 × 11), rempli d'une
//   pâte blanche à ras du bord, luisante à gauche.

import { Canvas, type Grid } from '../lib/canvas';
import type { ArtSource, ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { bucket } from '../world/props';
import { sheet } from './carried';
import { carriedClod, castShadow, heldBucket, iconBucket } from './earth';
import { darkest, outline } from './lib';

/** Teinte la plus sombre de chaque matière, pour le contour côté lumière : la chaux, et le seau (comme art/items/earth.ts). */
const dark = darkest({ '!': '~', '+': '~', '=': '~', ';': '~', '~': '~', M: 'K', m: 'K', N: 'K', K: 'K', z: 'Z', r: 'Z' }, 'o');

/** Une matière dessinée sans contour (`inner`) -> son contour d'un pixel. */
const outlined = (inner: Grid): Canvas => outline(new Canvas(inner[0].length + 2, inner.length + 2).stamp(inner, 1, 1), dark);

// ---------- Chaux vive ----------

/**
 * Le tas de mottes, sans contour (5 × 5, 7 × 7 avec lui) : la motte de derrière en haut (rangées 0-1, son dessus clair), les deux
 * de devant (rangées 2-4) séparées par une fente qui descend ; le dessus de chaque motte en `!`, sa face sud en `+`, l'ombre au pied
 * et dans les fentes en `=` et `;`.
 */
const QUICKLIME: Grid = [
  '.!!+.', // la motte de derrière, posée sur les deux autres
  '!!+=+',
  '!!=!+', // la fente sous elle ; le dessus de la motte de droite
  '++;+=', // la fente entre les deux mottes de devant
  '+=;=;', // les faces sud, le pied dans l'ombre
];

/** Icône 16 × 16, pas à l'échelle : quatre mottes blanches anguleuses, en tas, les fentes entre elles plus sombres. */
const ICON_QUICKLIME: Grid = [
  '................',
  '................',
  '................',
  '................',
  '.......!!+......',
  '......!!!++=....',
  '......!!+++=....',
  '...!!!=+==;;!+..',
  '..!!!++;;!!!++=.',
  '..!!++++;!!+++=.',
  '..!+++=+;++++==.',
  '..++++==;+++==;.',
  '...+===;;;===;..',
  '................',
  '................',
  '................',
];

// ---------- Chaux éteinte ----------

/** La rangée du dedans du seau (art/world/props.ts BUCKET) : la pâte à ras du bord, luisante à gauche, dans l'ombre du bord à droite. */
const PASTE_ROW = 'K!!+=o';
/** Les deux rangées du dedans du seau en icône (10 px) : la pâte, son luisant à gauche, l'ombre du bord arrière. */
const PASTE_ICON: [string, string] = ['!!!!!+++==', '+++++++==;'];

// ---------- Tenus ----------

/** La chaux vive portée à deux mains devant le ventre (posture `carry`, comme la motte de terre) ; pareille des trois côtés. */
const heldQuicklime = (): SpriteSheetSource => {
  const v = carriedClod(castShadow(outlined(QUICKLIME)));
  return sheet('held-quicklime', 15, world, { down: v, up: v, right: v });
};

// ---------- Planche ----------

const img = (name: string, grid: Grid): ImageSource => ({ kind: 'image', name, palette: world, grid });

const sources: ArtSource[] = [
  img('quicklime-ground', castShadow(outlined(QUICKLIME))),
  img('item-quicklime', outline(Canvas.from(ICON_QUICKLIME), dark).toGrid()),
  heldQuicklime(),
  img('slaked-lime-ground', bucket(PASTE_ROW).toGrid()),
  img('item-slaked-lime', outline(Canvas.from(iconBucket(PASTE_ICON)), dark).toGrid()),
  heldBucket('held-slaked-lime', PASTE_ROW),
];

export default sources;
