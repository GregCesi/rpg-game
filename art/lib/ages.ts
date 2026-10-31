// Les âges du bois, tirés au build (docs/CONCEPTION.md, « L'âge du bois ») : toute image ou planche de bois travaillé dessinée neuve
// a son patiné (`<nom>-worn`) et son vieux (`<nom>-old`), la même grille peinte de la rampe de l'âge (art/world/wood.ts,
// `agedPalette`). Ce qui prend l'âge : les objets de bois (`aged` de props.json et items.json : toutes leurs images au sol), les
// planches de la pièce de bois (chaque diamètre, chaque sens) et ses icônes (les vignettes du catalogue), les marques et croisements
// d'assemblage (le bois qu'elles montrent).

import propsJson from '../../src/content/props.json';
import itemsJson from '../../src/content/items.json';
import { ageableImages } from '../../src/content/views';
import type { Views } from '../../src/content/types';
import { WOOD, woodSheets } from '../../src/world/woodShape';
import { LATER_AGES, agedPalette } from '../world/wood';
import type { ArtSource } from './types';

type Ageable = { aged?: boolean; image?: string; ground?: string; icon?: string; views: Views; variants?: number; natural?: { forms: number } };

/** Les noms des images et planches neuves qui ont leurs âges. */
export function ageableNames(): Set<string> {
  const defs = [...Object.values(propsJson as Record<string, Ageable>), ...Object.values(itemsJson as Record<string, Ageable>)];
  const names = defs.filter((d) => d.aged).flatMap((d) => ageableImages(d));
  // les icônes des aspects de la pièce de bois : les vignettes du catalogue du mode construction montrent l'âge choisi
  const icons = Object.values(WOOD.sizes).flatMap((s) => Object.values(s.looks).map((l) => l!.icon));
  return new Set([...names, ...woodSheets(), ...icons]);
}

/** Les marques et croisements d'assemblage : le bois qu'ils montrent prend l'âge des pièces assemblées. */
const JOINT = /^joint-(scarf|halving|notch|peg)/;

/** Les sources aux âges patiné et vieux, tirées de celles qui prennent l'âge. */
export function agedSources(sources: readonly ArtSource[]): ArtSource[] {
  const names = ageableNames();
  return sources.flatMap((s) => (names.has(s.name) || JOINT.test(s.name) ? LATER_AGES.map((age) => ({ ...s, name: `${s.name}-${age}`, palette: agedPalette(s.palette, age) })) : []));
}
