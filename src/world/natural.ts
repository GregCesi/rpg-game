// La matière naturelle, sans Phaser (docs/CONCEPTION.md, « Les matières ») : une pierre ramassée, une motte creusée n'ont ni deux
// fois la même forme ni la même taille. Une forme dessinée sur deux (`<image>` ou `<image>-b`) et une taille qui varie de ± `vary` %
// autour de la taille type (`natural` de props.json ou items.json), tirées à l'apparition et gardées par GameState (`natural`).
// Un objet posé dans Tiled n'a rien dans GameState tant qu'il n'a pas bougé : les siennes se tirent de son identifiant, toujours
// les mêmes.

import type { ItemDef, Natural, NaturalDef, Views } from '../content/types';
import { groundImage, viewImage } from '../content/views';

/** Un tirage : la forme (une sur `forms`) et la taille en % (entière, de 100 − vary à 100 + vary). `rand` : de 0 à 1. */
export function drawNatural(def: NaturalDef, rand: () => number = Math.random): Natural {
  const form = (def.forms === 2 && rand() < 0.5 ? 1 : 0) as 0 | 1;
  const size = 100 - def.vary + Math.floor(rand() * (2 * def.vary + 1));
  return { form, size };
}

/** Un tirage stable, d'après un nombre (l'identifiant Tiled d'un objet) : le même à chaque chargement de la carte. */
export function stableNatural(def: NaturalDef, seed: number): Natural {
  let h = (seed * 2654435761) >>> 0;
  const rand = () => {
    h = (h ^ (h >>> 15)) >>> 0;
    h = Math.imul(h, 2246822519) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
    return (h % 10007) / 10007;
  };
  return drawNatural(def, rand);
}

/** Ce que porte un objet de cette définition : son tirage s'il est naturel (celui qu'il a déjà, sinon un nouveau), sinon rien. */
export function naturalFor(def: { natural?: NaturalDef }, had?: Natural): Natural | undefined {
  return def.natural ? (had ?? drawNatural(def.natural)) : undefined;
}

/** L'image de base d'une forme : `<image>` pour la première, `<image>-b` pour la seconde. */
export function formImage(image: string, natural: Natural | undefined): string {
  return natural?.form ? `${image}-b` : image;
}

/** L'image de la vue `view` d'une forme (ses vues suivent sa symétrie : `<image>-b-ns`, `<image>-b-r1`...). */
export function formView(image: string, views: Views, view: number, natural: Natural | undefined, has?: (key: string) => boolean): string {
  return viewImage(formImage(image, natural), views, view, has);
}

/** « 45 kg », « 1,5 kg » : une masse dite au dixième près sous 10 kg, au kilo près au-dessus. */
export function kilos(kg: number): string {
  const r = kg < 10 ? Math.round(kg * 10) / 10 : Math.round(kg);
  return `${String(r).replace('.', ',')} kg`;
}

/** L'image au sol d'un objet possédable dans sa vue et sa forme (views.ts `groundImage`, la forme `-b` de son image au sol). */
export function naturalGround(def: Pick<ItemDef, 'ground' | 'icon' | 'views'>, view: number | undefined, natural: Natural | undefined, has?: (key: string) => boolean): string {
  return groundImage({ ...def, ground: def.ground ? formImage(def.ground, natural) : undefined }, view, has);
}
