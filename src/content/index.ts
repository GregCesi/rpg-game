// Point d'entrée unique du contenu. Une nouvelle carte = un fichier JSON + une ligne ici.
// Chaque fichier est vérifié par son schéma au chargement : une faute de frappe plante tout de suite, avec le chemin exact.
import { z } from 'zod';
import { CharacterDefSchema, DialogueDefSchema, MapDefSchema, PropDefSchema, TileDefSchema, TilesetCatalogSchema } from './types';
import tilesJson from './tiles.json';
import tilesCatalogJson from './tiles-catalog.json';
import propsJson from './props.json';
import ferme from './maps/ferme.json';
import maison from './maps/maison.json';
import charactersJson from './characters.json';
import dialoguesJson from './dialogues.json';

function parse<T extends z.ZodType>(file: string, schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error(`${file} ne respecte pas son format :\n${z.prettifyError(r.error)}`);
  return r.data;
}

/** Légendes des cartes, par jeu de tuiles. */
export const tiles = parse('tiles.json', z.record(z.string(), z.record(z.string().length(1), TileDefSchema)), tilesJson);
/** Propriétés par tuile et par terrain, par jeu de tuiles (lues par build-art, vérifiées ici). */
export const tilesCatalog = parse('tiles-catalog.json', z.record(z.string(), TilesetCatalogSchema), tilesCatalogJson);
export const props = parse('props.json', z.record(z.string().length(1), PropDefSchema), propsJson);
export const maps = {
  ferme: parse('maps/ferme.json', MapDefSchema, ferme),
  maison: parse('maps/maison.json', MapDefSchema, maison),
} as Record<string, z.infer<typeof MapDefSchema>>;
export const characters = parse('characters.json', z.record(z.string(), CharacterDefSchema), charactersJson);
export const dialogues = parse('dialogues.json', z.record(z.string(), DialogueDefSchema), dialoguesJson);
