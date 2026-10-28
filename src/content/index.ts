// Point d'entrée unique du contenu. Une nouvelle carte = un fichier JSON + une ligne ici.
import type { MapDef, PropDef, TileDef } from './types';
import tilesJson from './tiles.json';
import propsJson from './props.json';
import ferme from './maps/ferme.json';

export const tiles = tilesJson as Record<string, TileDef>;
export const props = propsJson as Record<string, PropDef>;
export const maps: Record<string, MapDef> = {
  ferme,
};
