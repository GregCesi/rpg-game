// Formats du contenu du jeu, décrits une seule fois avec Zod : le schéma sert à la fois
// de type TypeScript (z.infer) et de vérification des fichiers JSON (npm run check).
// Le contenu (cartes, tuiles, objets, dialogues) est de la donnée : on en ajoute sans toucher au moteur.

import { z } from 'zod';

const px = z.number();
const id = z.string().min(1);

export const FacingSchema = z.enum(['down', 'up', 'left', 'right']);

/** Détails posés au hasard sur un sol (touffes, paille...) : ils cassent la répétition des tuiles. */
export const DecalSetSchema = z.strictObject({ images: z.array(id).min(1), chance: z.number().min(0).max(1) });

/** Propriétés d'une tuile du tileset (celles qui ne sont pas dans un terrain). */
export const TileInfoSchema = z.strictObject({
  /** Bloque le passage. */
  solid: z.boolean().optional(),
  /** Nom d'un ensemble de `decals` du même jeu de tuiles. */
  decals: id.optional(),
});

/**
 * Famille de 16 tuiles `<terrain>-<masque>` (masque N=1 E=2 S=4 O=8 : un bit à 1 = le voisin est du même terrain).
 * Devient un ensemble de terrains Wang dans le tileset de Tiled.
 */
export const TerrainDefSchema = z.strictObject({
  /** Couleur du terrain dans Tiled (#rrggbb). */
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  solid: z.boolean().optional(),
});

/** Catalogue d'un jeu de tuiles : ce que `build-art` ajoute aux tuiles dessinées dans art/. */
export const TilesetCatalogSchema = z.strictObject({
  decals: z.record(id, DecalSetSchema).default({}),
  tiles: z.record(id, TileInfoSchema).default({}),
  terrains: z.record(id, TerrainDefSchema).default({}),
});

/** Rectangle en pixels, dans le repère de l'image (0,0 = coin haut gauche). */
export const RectSchema = z.strictObject({ x: px, y: px, w: px.positive(), h: px.positive() });

/**
 * Un objet du catalogue (arbre, rocher, maison, meuble...). Sa clé dans props.json est son identifiant :
 * en anglais, en kebab-case (vérifié par validate.ts) ; c'est aussi le type d'un objet de carte dans Tiled.
 */
export const PropDefSchema = z.strictObject({
  /** Nom affiché, en français. */
  name: id,
  image: id,
  /** Boîte de collision simple, centrée en bas de l'image. bottom = marge entre le bas de l'image et le bas de la boîte. */
  body: z.strictObject({ w: px.positive(), h: px.positive(), bottom: px }).optional(),
  /** Boîtes de collision libres, dans le repère de l'image (pour les formes complexes : maison...). */
  bodies: z.array(RectSchema).optional(),
  /** Animation à jouer en boucle (l'image est alors une planche animée), ex. 'burn'. */
  anim: id.optional(),
  /** Points d'où sort de la fumée, dans le repère de l'image. */
  smoke: z.array(z.tuple([px, px])).optional(),
  /** 'floor' : dessiné à plat sur le sol, sous les personnages (tache de lumière, tapis...). */
  layer: z.literal('floor').optional(),
  /** 'add' : l'image éclaire ce qu'elle recouvre (lumière), posée au-dessus de la pénombre. */
  blend: z.literal('add').optional(),
  /** Lueur chaude qui vacille (feu), dans le repère de l'image. */
  light: z.strictObject({ x: px, y: px, radius: px.positive() }).optional(),
  /** Identifiant du dialogue lancé quand le joueur interagit avec l'objet. */
  interact: id.optional(),
});

/** Un personnage qui parle : son nom affiché et son portrait (sans la taille, ajoutée selon la config). */
export const CharacterDefSchema = z.strictObject({ name: id, portrait: id });

export const DialogueLineSchema = z.strictObject({
  /** Clé dans characters.json. */
  speaker: id,
  /** Nom de l'expression du portrait, ex. 'neutral'. */
  expression: id,
  text: z.string().min(1),
});

export const DialogueDefSchema = z.strictObject({ lines: z.array(DialogueLineSchema).min(1) });

// --- Format interne des cartes : ce que produit tools/build-maps.ts à partir des .tmj de Tiled. ---
// Le jeu ne lit jamais Tiled. Positions et tailles en pixels, repère de la carte (0,0 = coin haut gauche).

/** Objet posé : `type` est une clé de props.json ; (x, y) = coin bas gauche de l'image. */
export const MapObjectSchema = z.strictObject({
  type: id,
  x: px,
  y: px,
  /** Remplace le dialogue de props.json pour cet exemplaire. */
  interact: id.optional(),
});

/** Point d'apparition : (x, y) = position des pieds du joueur. */
export const SpawnSchema = z.strictObject({ x: px, y: px, facing: FacingSchema.optional() });

/** Zone qui mène vers une autre carte : on la prend quand les pieds sont dedans (et, si `facing` est donné, en avançant dans cette direction). */
export const ExitSchema = z.strictObject({
  x: px,
  y: px,
  w: px.positive(),
  h: px.positive(),
  to: id,
  spawn: id,
  facing: FacingSchema.optional(),
});

/** Personnage non joueur : (x, y) = position de ses pieds. `character` = clé de characters.json, qui est aussi la clé de son sprite. */
export const NpcSchema = z.strictObject({
  x: px,
  y: px,
  character: id,
  facing: FacingSchema.optional(),
  /** Dialogue lancé quand Xéros lui parle. */
  dialogue: id,
});

export const MapSchema = z.strictObject({
  /** Nom du fichier .tmj. */
  id,
  name: id,
  /** Jeu de tuiles du sol : déduit du .tsj que la carte référence. */
  tileset: id,
  /** Pénombre posée sur toute la carte (0 = aucune, 1 = noir). Les feux restent lumineux. */
  ambient: z.number().min(0).max(1).optional(),
  /** Taille en tuiles. */
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Calques de tuiles par nom, à plat (ligne par ligne) : numéro de tuile du jeu de tuiles, -1 = vide. */
  layers: z.record(id, z.array(z.number().int().min(-1))),
  objects: z.array(MapObjectSchema),
  spawns: z.record(id, SpawnSchema),
  exits: z.array(ExitSchema),
  npcs: z.array(NpcSchema),
});

export type Facing = z.infer<typeof FacingSchema>;
export type DecalSet = z.infer<typeof DecalSetSchema>;
export type TerrainDef = z.infer<typeof TerrainDefSchema>;
export type TilesetCatalog = z.infer<typeof TilesetCatalogSchema>;
export type PropDef = z.infer<typeof PropDefSchema>;
export type CharacterDef = z.infer<typeof CharacterDefSchema>;
export type DialogueLine = z.infer<typeof DialogueLineSchema>;
export type DialogueDef = z.infer<typeof DialogueDefSchema>;
export type MapObject = z.infer<typeof MapObjectSchema>;
export type Spawn = z.infer<typeof SpawnSchema>;
export type Exit = z.infer<typeof ExitSchema>;
export type Npc = z.infer<typeof NpcSchema>;
export type MapData = z.infer<typeof MapSchema>;
