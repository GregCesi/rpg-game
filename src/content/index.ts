// Point d'entrée unique du contenu. Chaque fichier JSON est vérifié par son schéma au chargement :
// une faute de frappe plante tout de suite, avec le chemin exact.
// Les cartes ne sont pas ici : elles viennent de Tiled (tiled/maps/*.tmj) et sont traduites par `npm run maps`.
import { z } from 'zod';
import { CharacterDefSchema, CombatSchema, TimeSchema, HoldPosesSchema, DialogueDefSchema, GestureSchema, ItemDefSchema, MatterSchema, PileDefSchema, RockSchema, PlanSchema, ParcelUseSchema, PropDefSchema, StaminaSchema, StrengthSchema, WorkSchema, TilesetCatalogSchema, TransformSchema, WoodSchema, WorldSchema } from './types';
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
import mattersJson from './matters.json';
import rocksJson from './rocks.json';
import transformsJson from './transforms.json';
import parcelsJson from './parcels.json';
import worldJson from './world.json';
import combatJson from './combat.json';
import timeJson from './time.json';
import workJson from './work.json';
export { maps } from '../generated/maps';
import treesJson from '../generated/trees.json';
import { withTreeLayout, type TreeLayouts } from './treeLayout';

function parse<T extends z.ZodType>(file: string, schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error(`${file} ne respecte pas son format :\n${z.prettifyError(r.error)}`);
  return r.data;
}

/** Propriétés par tuile et par terrain, par jeu de tuiles (lues par build-art, vérifiées ici). */
export const tiles = parse('tiles.json', z.record(z.string(), TilesetCatalogSchema), tilesJson);
/** Catalogue des objets : la clé est le type d'un objet de carte dans Tiled. */
// complété des décalages de ses arbres, calculés par npm run art (src/generated/trees.json, src/content/treeLayout.ts)
export const props = parse('props.json', z.record(z.string().min(1), PropDefSchema), withTreeLayout(propsJson, treesJson as unknown as TreeLayouts));
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
/** Les matières : nom et densité (pierre, terre crue, torchis, mortier, paille, bois vert, eau), d'où se calculent les masses. */
export const matters = parse('matters.json', z.record(z.string(), MatterSchema), mattersJson);
/** Les transformations : ce qui entre, ce qui sort, le déchet, l'outil, le poste, le métier, le geste (docs/CONCEPTION.md, « Les matières »). */
/** Les roches : réglages de la pierre (nom, couleur, densité, dureté, prix) ; la pierre commune est le calcaire (chantier « pierre »). */
export const rocks = parse('rocks.json', z.record(z.string(), RockSchema), rocksJson);
export const transforms = parse('transforms.json', z.record(z.string(), TransformSchema), transformsJson);
/** Les destinations des parcelles réservées du village (maison, mairie, taverne…), objets `Parcel` des cartes (chantier « monde »). */
export const parcelUses = parse('parcels.json', z.record(z.string(), ParcelUseSchema), parcelsJson);
/** Le monde entier : ce qui ne dépend d'aucune zone (la pénombre du sous-bois, de l'ouest vers l'est). */
export const world = parse('world.json', WorldSchema, worldJson);
/** Le combat : les règles du calcul (portée, vitesse, dégâts), les attaques, les familles d'armes et leurs postures (CONCEPTION, « Le combat »). */
export const combat = parse('combat.json', CombatSchema, combatJson);
/** Le temps : les paliers de la vitesse du temps, le palier par défaut, l'heure du lever (CONCEPTION, « Le temps »). */
export const time = parse('time.json', TimeSchema, timeJson);
/** Le travail (docs/CONCEPTION.md, « Le travail ») : les coups, la résistance de la matière, les êtres de référence, les points de calage. */
export const work = parse('work.json', WorkSchema, workJson);

/**
 * L'objet sert-il à un travail (Espace l'y emploie ; tout le reste de ce qu'on tient frappe, world/heft.ts) ? Ce qu'il déclare faire
 * (`does`), ou ce qui le demande : une récolte, une transformation, le tracé d'un chantier. Tiré des données, jamais d'une liste de noms ;
 * calculé à chaque appel (un objet ajouté au contenu, l'outil d'essai des contrats, compte aussitôt).
 */
export function worksWith(item: string): boolean {
  if (items[item]?.does?.length) return true;
  return (
    Object.values(props).some((p) => p.harvest && (p.harvest.tool === item || item in p.harvest.also)) ||
    Object.values(transforms).some((t) => t.tools.includes(item)) ||
    Object.values(plans).some((p) => p.stake === item)
  );
}

/** La planche en main d'un outil (`work.image`, sinon `tool-<clé>`) : son geste de travail. */
export const toolSheet = (item: string): string => items[item]?.work?.image ?? `tool-${item}`;

/** Les images des rais de soleil (`sun` de props.json) : celle que posent les intérieurs est la première (validate.ts : il y en a une). */
export const sunImages: readonly string[] = Object.values(props).filter((p) => p.sun).map((p) => p.image);
