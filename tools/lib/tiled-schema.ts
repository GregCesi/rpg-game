// Schémas Zod de la partie du format Tiled (JSON) que nous lisons. Le reste est ignoré.
// Référence : https://doc.mapeditor.org/en/stable/reference/json-map-format/
// Tiled 1.10+ écrit `type` pour la classe d'un objet ou d'une tuile ; Tiled 1.9 écrivait `class` : on accepte les deux.

import { z } from 'zod';

export const PropertySchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  value: z.unknown(),
});

const properties = z.array(PropertySchema).optional();

export const ObjectSchema = z.object({
  id: z.number().int(),
  name: z.string().default(''),
  type: z.string().optional(),
  class: z.string().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().default(0),
  height: z.number().default(0),
  rotation: z.number().default(0),
  point: z.boolean().optional(),
  gid: z.number().int().optional(),
  // formes que le jeu ne gère pas : on les détecte pour le dire clairement
  ellipse: z.boolean().optional(),
  polygon: z.unknown().optional(),
  polyline: z.unknown().optional(),
  text: z.unknown().optional(),
  properties,
});

const layerBase = { id: z.number().int(), name: z.string() };

export const LayerSchema = z.discriminatedUnion('type', [
  z.object({
    ...layerBase,
    type: z.literal('tilelayer'),
    width: z.number().int(),
    height: z.number().int(),
    /** Liste de gid (CSV). Une chaîne = base64, non gérée. */
    data: z.union([z.array(z.number().int()), z.string()]),
  }),
  z.object({ ...layerBase, type: z.literal('objectgroup'), objects: z.array(ObjectSchema) }),
  z.object({ ...layerBase, type: z.enum(['imagelayer', 'group']) }),
]);

export const TilesetRefSchema = z.object({ firstgid: z.number().int().positive(), source: z.string().optional() });

export const TmjSchema = z.object({
  orientation: z.string(),
  infinite: z.boolean().default(false),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tilewidth: z.number().int(),
  tileheight: z.number().int(),
  tilesets: z.array(TilesetRefSchema),
  layers: z.array(LayerSchema),
  properties,
});

export const TsjTileSchema = z.object({
  id: z.number().int().nonnegative(),
  type: z.string().optional(),
  class: z.string().optional(),
  image: z.string().optional(),
  imagewidth: z.number().optional(),
  imageheight: z.number().optional(),
});

export const TsjSchema = z.object({
  name: z.string(),
  tilecount: z.number().int(),
  /** Présent pour un tileset en planche d'images ; absent pour une collection d'images. */
  image: z.string().optional(),
  tiles: z.array(TsjTileSchema).default([]),
});

export type TmjObject = z.infer<typeof ObjectSchema>;
export type Tmj = z.infer<typeof TmjSchema>;
export type Tsj = z.infer<typeof TsjSchema>;
