// Point d'entrée unique du contenu. Une nouvelle carte = un fichier JSON + une ligne ici.
import type { CharacterDef, DialogueDef, MapDef, PropDef, TileDef } from './types';
import tilesJson from './tiles.json';
import propsJson from './props.json';
import ferme from './maps/ferme.json';
import charactersJson from './characters.json';
import dialoguesJson from './dialogues.json';

export const tiles = tilesJson as Record<string, TileDef>;
export const props = propsJson as Record<string, PropDef>;
export const maps: Record<string, MapDef> = {
  ferme,
};
export const characters = charactersJson as Record<string, CharacterDef>;
export const dialogues = dialoguesJson as Record<string, DialogueDef>;
