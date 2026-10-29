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

/** Ce qui tombe d'un objet récolté : `min` à `max` exemplaires de l'objet possédable `item` (clé de items.json). */
export const DropSchema = z.strictObject({
  item: id,
  min: z.number().int().min(0),
  max: z.number().int().min(1),
  /** Va directement dans l'inventaire au lieu de tomber au sol (s'il est plein, tombe au sol quand même). */
  give: z.boolean().default(false),
});

/**
 * Ce qui se récolte (arbre, rocher, baies, billot). Le système `systems/harvest.ts` le lit, quel que soit l'objet.
 * Avec `tool`, on frappe avec Espace, l'outil en main ; sans, on récolte à la main avec E.
 */
export const HarvestSchema = z.strictObject({
  /** Objet possédable nécessaire (clé de items.json, de type 'tool') ; absent = à la main. */
  tool: id.optional(),
  /** Nombre de coups. L'objet tremble à chaque coup. */
  hits: z.number().int().positive(),
  /** Matière frappée : à chaque coup, des éclats de la planche `fx-<matière>` jaillissent du point d'impact. */
  impact: z.enum(['wood', 'stone', 'leaves']).optional(),
  /**
   * Geste de Xéros (clé de gestures.json) : `use`, de côté, sur ce qui est debout ;
   * `chop`, de haut en bas, sur ce qui est couché ou posé.
   */
  gesture: z.enum(['use', 'chop']).default('use'),
  /**
   * Pièce de tronc couché : frapper creuse l'encoche de son bout droit, à la jonction avec la pièce suivante de sa chaîne.
   * Un coup = une profondeur (image `<image>-n1`, `-n2`...), le dernier coupe (`<image>-cut-right`). Quand la pièce de gauche
   * est séparée, la pièce montre sa face de coupe à gauche (`<image>-cut-left`, `-cut-left-n1`...). Un morceau séparé aux
   * deux bouts devient `becomes` (sa bille, même image coupée, même place) ; `drops` tombent quand l'encoche est coupée.
   * La première pièce d'une chaîne est déjà séparée à gauche (le bout scié contre la souche).
   */
  notch: z.boolean().default(false),
  /**
   * Animation de fin, jouée à la place de l'objet avant qu'il devienne `becomes`. `image`, `x`, `y` : la chute vers la droite,
   * avec le décalage du coin bas gauche d'une de ses images par rapport à celui de l'objet (le pied de l'arbre est en x = 33
   * dans `tree`, en x = 47 dans `tree-fall` : x = -14). `left` : la chute vers la gauche, une planche à part (pas de miroir),
   * avec la même animation `anim`. `foot` : colonne du pied dans l'image de l'objet ; ce qui naît vers la gauche est posé
   * en miroir de la droite autour de ce pied (x' = 2 × foot − (x + largeur − 1)), avec ses images `-left`.
   * L'objet tombe du côté opposé à celui qui frappe ; frappé d'en haut ou d'en bas, d'un côté au hasard.
   */
  fall: z
    .strictObject({
      image: id,
      anim: id,
      x: px.default(0),
      y: px.default(0),
      foot: px,
      left: z.strictObject({ image: id, x: px, y: px.default(0) }),
    })
    .optional(),
  /** Objet de props.json qui le remplace ; absent = il disparaît. */
  becomes: id.optional(),
  /** Décalage du coin bas gauche de `becomes` par rapport à celui de l'objet récolté. */
  at: z.tuple([px, px]).optional(),
  /** Objets lâchés au sol, autour de lui. */
  drops: z.array(DropSchema).default([]),
  /**
   * Objets de props.json qui naissent à la fin (l'arbre couché : houppier et sections). (x, y) : coin bas gauche
   * de chacun par rapport à celui de l'objet récolté, pour une chute vers la droite ; vers la gauche, ils sont
   * posés en miroir autour du pied (`fall.foot`) avec leurs images `-left` (dessinées, pas retournées). Ils sont notés dans GameState comme objets nés,
   * et forment une chaîne bout à bout dans cet ordre (de gauche à droite dans l'image) : voir `notch`.
   */
  spawns: z.array(z.strictObject({ type: id, x: px, y: px })).default([]),
});

/** Nombre de mains que demande un objet qu'on prend : une, ou les deux (lourd ou long). */
export const HandsSchema = z.union([z.literal(1), z.literal(2)]);

/**
 * Objet du monde qu'on prend dans les mains avec E (la bille) : il quitte la carte, et Xéros le porte devant lui
 * (animations `carry-*`, l'image de l'objet posée sur ses mains d'après carry.json). Reposé, il retrouve la carte à sa nouvelle place.
 */
export const TakeSchema = z.strictObject({
  hands: HandsSchema,
  /** Point de l'image tenu par les mains ; absent : le centre de sa collision (de l'image s'il n'en a pas). */
  grip: z.tuple([px, px]).optional(),
});

/** Un objet possédable (inventaire, sol) : sa clé dans items.json est son identifiant. */
export const ItemDefSchema = z.strictObject({
  /** Nom affiché, en français. */
  name: id,
  /** Image 16×16, `item-<clé>`. */
  icon: id,
  kind: z.enum(['tool', 'weapon', 'resource']),
  /** Nombre maximal d'exemplaires dans une case. */
  stack: z.number().int().positive(),
  /** Mains qu'il faut pour le tenir : 2 pour ce qui est lourd ou long (la hache de bûcheron). */
  hands: HandsSchema.default(1),
});

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
  /**
   * Point visé, dans le repère de l'image (l'encoche d'une section de tronc) : Xéros vise ce point et l'invite s'y affiche.
   * Absent : le centre de la base.
   */
  aim: z.tuple([px, px]).optional(),
  /** Ce qui se récolte : voir HarvestSchema. */
  harvest: HarvestSchema.optional(),
  /** Ce qui se prend dans les mains : voir TakeSchema. */
  take: TakeSchema.optional(),
});

/** Où est la main pendant une image d'un geste. (dx, dy) : par rapport aux pieds du personnage (milieu bas de son image). */
export const PoseSchema = z.strictObject({
  dx: px,
  dy: px,
  /**
   * Angle de l'outil (degrés, 0 = est, 90 = nord) : direction de la tête, à l'écran pour un dessin vu de côté,
   * au sol pour un dessin vu du dessus. Pour qui dessine un nouvel outil.
   */
  angle: z.number(),
  /**
   * Dessin de base dont l'image d'outil est tirée (art/lib/held.ts) : de profil, la face de l'outil, pour un coup horizontal
   * (`diag`, `upright`) ; par la tranche pour un coup vertical (`flat`, `flatDiag`, `flatEnd`). Pour qui dessine un nouvel outil.
   */
  base: z.enum(['diag', 'upright', 'flat', 'flatDiag', 'flatEnd']),
  /** L'outil passe derrière le corps. */
  behind: z.boolean().default(false),
  /** L'outil passe devant ce qui est posé jusqu'à `ahead` px au sud des pieds (le tronc couché que frappe le fer). */
  ahead: z.number().min(0).default(0),
});

/**
 * Un geste du corps (`use-<direction>` dans la planche du personnage) et la place de l'outil à chaque image.
 * La gauche est le miroir de la droite. Un outil = une planche `tool-<objet>` de 4 × 3 images (down, up, right),
 * la prise du manche au centre de chaque image : ajouter un outil ne demande que cette planche.
 */
export const GestureSchema = z.strictObject({
  /** Image (à partir de 0) où le coup porte. */
  impact: z.number().int().min(0),
  /**
   * Décalage horizontal du fer à l'impact par rapport aux pieds, par direction (la gauche en miroir de la droite) :
   * c'est ce point que Xéros aligne sur l'encoche visée. Absent : la main de l'image d'impact.
   */
  strike: z.strictObject({ down: px, up: px, right: px }).optional(),
  poses: z.strictObject({ down: z.array(PoseSchema), up: z.array(PoseSchema), right: z.array(PoseSchema) }),
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
  /** Identifiant de l'objet dans Tiled (unique dans la carte) : GameState y range les changements du monde. */
  id: z.number().int().nonnegative(),
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
export type Harvest = z.infer<typeof HarvestSchema>;
export type Drop = z.infer<typeof DropSchema>;
export type ItemDef = z.infer<typeof ItemDefSchema>;
export type Take = z.infer<typeof TakeSchema>;
export type Pose = z.infer<typeof PoseSchema>;
export type Gesture = z.infer<typeof GestureSchema>;
export type CharacterDef = z.infer<typeof CharacterDefSchema>;
export type DialogueLine = z.infer<typeof DialogueLineSchema>;
export type DialogueDef = z.infer<typeof DialogueDefSchema>;
export type MapObject = z.infer<typeof MapObjectSchema>;
export type Spawn = z.infer<typeof SpawnSchema>;
export type Exit = z.infer<typeof ExitSchema>;
export type Npc = z.infer<typeof NpcSchema>;
export type MapData = z.infer<typeof MapSchema>;
