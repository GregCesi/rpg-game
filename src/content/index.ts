// Point d'entrée unique du contenu. Chaque fichier JSON est vérifié par son schéma au chargement :
// une faute de frappe plante tout de suite, avec le chemin exact.
// Les cartes ne sont pas ici : elles viennent de Tiled (tiled/maps/*.tmj) et sont traduites par `npm run maps`.
import { z } from 'zod';
import { CharacterDefSchema, HoldPosesSchema, DialogueDefSchema, GestureSchema, ItemDefSchema, PileDefSchema, PlanSchema, PropDefSchema, StaminaSchema, StrengthSchema, TilesetCatalogSchema, WoodSchema } from './types';
import tilesJson from './tiles.json';
import propsJson from './props.json';
import itemsJson from './items.json';
import pilesJson from './piles.json';
import plansJson from './plans.json';
import gesturesJson from './gestures.json';
import holdJson from './hold.json';
import strengthJson from './strength.json';
import staminaJson from './stamina.json';
import charactersJson from './characters.json';
import dialoguesJson from './dialogues.json';
import woodJson from './wood.json';
export { maps } from '../generated/maps';

function parse<T extends z.ZodType>(file: string, schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error(`${file} ne respecte pas son format :\n${z.prettifyError(r.error)}`);
  return r.data;
}

/** Propriétés par tuile et par terrain, par jeu de tuiles (lues par build-art, vérifiées ici). */
export const tiles = parse('tiles.json', z.record(z.string(), TilesetCatalogSchema), tilesJson);
/** Catalogue des objets : la clé est le type d'un objet de carte dans Tiled. */
export const props = parse('props.json', z.record(z.string().min(1), PropDefSchema), propsJson);
/** Objets possédables (dans les mains, au sol) : la clé est l'identifiant de l'objet. */
export const items = parse('items.json', z.record(z.string().min(1), ItemDefSchema), itemsJson);
/** Genres de tas : ce qu'on y entrepose et leur forme pour chaque nombre de pièces. */
export const piles = parse('piles.json', z.record(z.string().min(1), PileDefSchema), pilesJson);
/** Plans de bâtiment : emprise, coins, étapes dans l'ordre du chantier, places de chaque pièce (en cm). Un bâtiment = un plan. */
export const plans = parse('plans.json', z.record(z.string().min(1), PlanSchema), plansJson);
/** Gestes du corps (`use`) et place de l'outil en main à chaque image. */
export const gestures = parse('gestures.json', z.record(z.string(), GestureSchema), gesturesJson);
/** Objets tenus sur Xéros : point d'accroche par posture, image par image. */
export const hold = parse('hold.json', HoldPosesSchema, holdJson);
export const characters = parse('characters.json', z.record(z.string(), CharacterDefSchema), charactersJson);
export const dialogues = parse('dialogues.json', z.record(z.string(), DialogueDefSchema), dialoguesJson);
/** La force de Xéros : ce qu'il porte, ce avec quoi il marche normalement, ce qu'il fait rouler. */
export const strength = parse('strength.json', StrengthSchema, strengthJson);
/** L'endurance de Xéros : son maximum, le seuil de fatigue et le prix de chaque effort. */
export const stamina = parse('stamina.json', StaminaSchema, staminaJson);
/** Le bois : diamètres, géométrie de leurs dessins, règles (grille de coupe, longueur minimale, équarrir, fendre). */
export const wood = parse('wood.json', WoodSchema, woodJson);
