// Formats du contenu du jeu, décrits une seule fois avec Zod : le schéma sert à la fois
// de type TypeScript (z.infer) et de vérification des fichiers JSON (npm run check).
// Le contenu (cartes, tuiles, objets, dialogues) est de la donnée : on en ajoute sans toucher au moteur.

import { z } from 'zod';

const px = z.number();
const tile = z.number().int().nonnegative();
const id = z.string().min(1);

export const FacingSchema = z.enum(['down', 'up', 'left', 'right']);

/** Un caractère de carte -> une ou plusieurs tuiles (variantes tirées au hasard, de façon stable). */
export const TileDefSchema = z.strictObject({
  tiles: z.array(id),
  solid: z.boolean().optional(),
  /** Choisit la tuile selon les voisins identiques : `${autotile}-${masque N=1 E=2 S=4 O=8}`. */
  autotile: id.optional(),
  /** Tuiles prises dans l'ordre selon la colonne (x % nombre) au lieu du hasard : motifs réguliers (poteaux d'un mur). */
  cycle: z.boolean().optional(),
  /** Autres caractères avec lesquels ce raccord automatique se relie (ex. une cloison qui rejoint un mur épais). */
  connects: z.string().optional(),
  /** Détails posés au hasard sur ce sol (touffes, paille...) : ils cassent la répétition des tuiles. */
  decals: z.strictObject({ images: z.array(id).min(1), chance: z.number().min(0).max(1) }).optional(),
});

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

/** Un caractère de la couche objets -> un objet posé (arbre, rocher, maison, meuble...). */
export const PropDefSchema = z.strictObject({
  name: id,
  image: id,
  /** 'center' (défaut) : l'image est centrée sur la case. 'left' : son coin bas gauche est posé sur le coin bas gauche de la case. */
  align: z.enum(['center', 'left']).optional(),
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

/** Point d'apparition, en coordonnées de tuile. */
export const SpawnDefSchema = z.strictObject({ x: tile, y: tile, facing: FacingSchema.optional() });

/** Passage vers une autre carte : on le prend en marchant dans la case (x, y) en regardant vers `facing`. */
export const ExitDefSchema = z.strictObject({ x: tile, y: tile, facing: FacingSchema, to: id, spawn: id });

export const MapDefSchema = z.strictObject({
  id,
  name: id,
  /** Jeu de tuiles utilisé (clé dans tiles.json). Défaut : 'world'. */
  tileset: id.optional(),
  /** Pénombre posée sur toute la carte (0 = aucune, 1 = noir). Les feux restent lumineux. */
  ambient: z.number().min(0).max(1).optional(),
  /** Sol, une ligne par rangée de tuiles. */
  ground: z.array(z.string().min(1)).min(1),
  /** Objets, même taille que le sol. '.' = rien. */
  props: z.array(z.string()),
  spawns: z.record(id, SpawnDefSchema),
  exits: z.array(ExitDefSchema).optional(),
});

export type Facing = z.infer<typeof FacingSchema>;
export type TileDef = z.infer<typeof TileDefSchema>;
export type DecalSet = z.infer<typeof DecalSetSchema>;
export type TerrainDef = z.infer<typeof TerrainDefSchema>;
export type TilesetCatalog = z.infer<typeof TilesetCatalogSchema>;
export type Rect = z.infer<typeof RectSchema>;
export type PropDef = z.infer<typeof PropDefSchema>;
export type CharacterDef = z.infer<typeof CharacterDefSchema>;
export type DialogueLine = z.infer<typeof DialogueLineSchema>;
export type DialogueDef = z.infer<typeof DialogueDefSchema>;
export type SpawnDef = z.infer<typeof SpawnDefSchema>;
export type ExitDef = z.infer<typeof ExitDefSchema>;
export type MapDef = z.infer<typeof MapDefSchema>;
