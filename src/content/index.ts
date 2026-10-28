// Point d'entrée unique du contenu. Une nouvelle carte = un fichier JSON + une ligne ici.
import type { CharacterDef, DialogueDef, MapDef, PropDef, TileDef } from './types';
import tilesJson from './tiles.json';
import propsJson from './props.json';
import ferme from './maps/ferme.json';
import maison from './maps/maison.json';
import charactersJson from './characters.json';
import dialoguesJson from './dialogues.json';

/** Légendes des cartes, par jeu de tuiles. */
export const tiles = tilesJson as Record<string, Record<string, TileDef>>;
export const props = propsJson as unknown as Record<string, PropDef>;
export const maps: Record<string, MapDef> = {
  ferme: ferme as unknown as MapDef,
  maison: maison as unknown as MapDef,
};
export const characters = charactersJson as Record<string, CharacterDef>;
export const dialogues = dialoguesJson as Record<string, DialogueDef>;
