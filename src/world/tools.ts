// Ce qu'un outil fait, sans Phaser (docs/objets/README.md, « Les contrats » ; docs/AUDIT.md « Normalisation ») : un outil déclare les
// genres de travail qu'il fait (`does` d'items.json), et une cible accepte tout outil qui fait le sien, sans le nommer. Une nouvelle
// hache qui fait `fell`, `limbs`, `cut` abat tous les arbres et coupe tout le bois ; systems/harvest.ts et systems/wood.ts s'en servent.

import { items } from '../content';
import type { Harvest, ItemDef } from '../content/types';

/** Un genre de travail (`does` d'items.json). */
export type Job = NonNullable<ItemDef['does']>[number];

/** Le genre de travail d'une récolte au coup (`work` de son harvest : abattre, ébrancher, tailler, casser), s'il en a un. */
export const harvestKind = (h: Harvest): Job | undefined => (h.work ? (Object.keys(h.work)[0] as Job) : undefined);

/**
 * L'outil `tool` fait ce travail : il fait son genre de travail (`does`), ou c'est l'outil de la récolte (son outil de référence,
 * celui que nomme « il faut… »), ou l'un de ses `also` (la hachette sur le rouleau posé).
 */
export function wields(h: Harvest, tool: string | undefined): boolean {
  if (!tool) return false;
  const kind = harvestKind(h);
  return tool === h.tool || tool in h.also || (!!kind && !!items[tool]?.does?.includes(kind));
}

/** Ce que l'outil fait au bois (`does`) : couper, équarrir, planter le coin, frapper le coin ; jamais d'après son nom. */
export function woodWorkOf(tool: string | undefined): 'cut' | 'hew' | 'plant' | 'maul' | undefined {
  const does = (tool && items[tool]?.does) || [];
  return (['cut', 'hew', 'plant', 'maul'] as const).find((w) => does.includes(w));
}
