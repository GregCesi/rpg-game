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
  /** Va directement dans les mains au lieu de tomber au sol (si elles ne sont pas libres, tombe au sol quand même). */
  give: z.boolean().default(false),
});

/** Prix d'un coup en endurance : une clé de `costs` de stamina.json. */
const EffortSchema = z.enum(['chop', 'cutTie', 'whittle']);

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
   * Tailler : le coup change l'objet possédable tenu dans l'AUTRE main en un autre (`from` : ce qu'on taille -> ce qu'il devient) :
   * la branche tenue debout sur le billot devient un piquet, le piquet une cheville, dans la même main. `refuse` : ce qu'on dit si l'autre main ne tient rien de `from`. Un seul coup, avec
   * l'outil `tool` dans la première main ; ni `becomes` ni `drops` n'y servent.
   */
  convert: z.strictObject({ from: z.record(id, id), refuse: id }).optional(),
  /** Prix du coup en endurance : une clé de `costs` de stamina.json. Absent : `chop` (`cutTie` pour le billot qui porte une corde). */
  effort: EffortSchema.optional(),
  /**
   * D'autres outils (clés de items.json) qui font le même travail que `tool`, chacun avec le prix de son coup : la hachette coupe un
   * lien du rouleau posé sur le billot comme la cognée, pour moins cher (`whittle`).
   */
  also: z.record(id, EffortSchema).default({}),
  /**
   * Ce qu'on dit quand on frappe avec cet outil (clé de items.json) alors qu'il ne convient pas. Le geste ne se joue pas, rien
   * n'est dépensé.
   */
  refuse: z.record(id, id).default({}),
  /**
   * Animation de fin, jouée à la place de l'objet avant qu'il devienne `becomes`. `image`, `x`, `y` : la chute vers la droite,
   * avec le décalage du coin bas gauche d'une de ses images par rapport à celui de l'objet (le pied de l'arbre est en x = 33
   * dans `big-tree`, en x = 47 dans `big-tree-fall` : x = -14). `left` : la chute vers la gauche, une planche à part (pas de miroir),
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
  /**
   * S'il devient une pièce de bois (`becomes` : `wood-piece`) : son diamètre et sa longueur (le tronc ébranché devient une seule
   * pièce ronde, est-ouest, de sa longueur utile).
   */
  wood: z.strictObject({ size: id, length: z.number().int().positive() }).optional(),
  /** Décalage du coin bas gauche de `becomes` par rapport à celui de l'objet récolté. */
  at: z.tuple([px, px]).optional(),
  /** Objets lâchés au sol, autour de lui. */
  drops: z.array(DropSchema).default([]),
  /**
   * Objets de props.json qui naissent à la fin (l'arbre couché : houppier et sections). (x, y) : coin bas gauche
   * de chacun par rapport à celui de l'objet récolté, pour une chute vers la droite ; vers la gauche, ils sont
   * posés en miroir autour du pied (`fall.foot`) avec leurs images `-left` (dessinées, pas retournées). Ils sont notés dans GameState
   * comme objets nés, et forment une chaîne dans cet ordre.
   */
  spawns: z.array(z.strictObject({ type: id, x: px, y: px })).default([]),
});

/**
 * Masse d'un objet, en kilogrammes. Un nombre : masse saisie. `"wood"` : la pièce de bois, masse calculée par ses réglages
 * (volume × densité du bois vert de wood.json, `mass.ts`). `"stone"` : une pierre, la boîte de ses `dims` × la densité de la pierre.
 * `{ "pile": genre }` : la somme d'un tas plein de ce genre de `piles.json` plus son lien (le fagot : ses dix branches et son lien).
 * Un objet qu'on prend, pose ou roule en a une (validate.ts).
 */
export const MassSchema = z.union([
  z.number().positive(),
  z.literal('wood'),
  // une pierre : le volume de sa boîte (`dims`) × la densité de la pierre (mass.ts)
  z.literal('stone'),
  z.strictObject({ pile: id }),
  z.lazy(() => MatterMassSchema),
]);

/**
 * Masse calculée par la matière (`matters.json` : pierre selon sa roche, calcaire 2 400, terre crue 1 800, torchis 1 750, paille tassée 100 kg/m³...) :
 * le volume de ses `dims` (une boîte : w × d × h ; un cylindre : π r² × sa longueur) × `fill` (la part de la boîte qu'occupe la
 * matière : 0,56 pour une pierre brute de carrière, anguleuse ; 1 pour ce qui est taillé ou moulé) × la densité. Une matière
 * naturelle (`natural`) pèse ensuite au cube de sa taille tirée.
 */
export const MatterMassSchema = z.strictObject({
  matter: id,
  fill: z.number().positive().max(1).default(1),
  /** La roche (clé de rocks.json) d'une pierre qui n'est pas de la roche commune de sa matière (`rock` de matters.json). */
  rock: id.optional(),
});

/**
 * Une matière (`matters.json`) : son nom en français et sa densité, en kg/m³ ; ou, pour la pierre, sa roche commune (`rock`,
 * clé de rocks.json), qui donne la densité : une pierre pèse selon sa roche (chantier « pierre », 31 octobre 2026).
 */
export const MatterSchema = z
  .strictObject({ name: id, density: z.number().positive().optional(), rock: id.optional() })
  .refine((m) => (m.density === undefined) !== (m.rock === undefined), { message: 'une matière a soit sa densité (`density`), soit sa roche (`rock`)' });

/**
 * Une roche (`rocks.json`, chantier « pierre ») : un réglage de la pierre, pas un objet. Une nouvelle couleur de pierre = une
 * nouvelle roche, jamais une nouvelle clé d'objet. `name` : nom affiché ; `color` : sa couleur en mots ; `ramp` : sa rampe de
 * couleurs, clés de la palette commune (`art/palette.ts`), de la plus claire à la plus sombre ; `density` : kg/m³ ; `hardness` :
 * multiplie le nombre de coups d'outil pour la tailler (1 : la référence, le calcaire) ; `price` : prix relatif (1 : la référence,
 * la moins chère).
 */
export const RockSchema = z.strictObject({
  name: id,
  color: id,
  ramp: z.array(z.string().length(1)).min(4).max(5),
  density: z.number().positive(),
  hardness: z.number().positive(),
  price: z.number().positive(),
});

/**
 * Une matière naturelle (docs/CONCEPTION.md, « Les matières ») : une pierre ramassée, une motte creusée n'ont ni deux fois la même
 * forme ni la même taille. `forms` : 1 ou 2 formes dessinées (la seconde est l'image `<image>-b`, et de même pour ses vues) ;
 * `vary` : la taille varie de ± `vary` % autour de la taille type de ses `dims` (tirée à l'apparition, gardée par GameState :
 * `natural` de ce qu'on tient, d'un objet né, changé ou posé au sol). Sa masse suit le cube de sa taille ; son image ne change pas
 * (± 7 % de 45 cm, c'est moins d'un pixel : dans la tolérance du gabarit).
 */
export const NaturalDefSchema = z.strictObject({ forms: z.union([z.literal(1), z.literal(2)]), vary: z.number().int().min(1).max(15) });

/** Ce que GameState garde d'un exemplaire naturel : sa forme (0 : `<image>`, 1 : `<image>-b`) et sa taille, en % de la taille type. */
export const NaturalSchema = z.strictObject({ form: z.union([z.literal(0), z.literal(1)]), size: z.number().int().min(85).max(115) });

/**
 * Les métiers (docs/CONCEPTION.md, « Les matières ») : tout s'achète au village, mais tout peut se faire. Chaque objet dit qui le
 * fait et le vendrait (`trade` de props.json, items.json, et des transformations de transforms.json) : le carrier (la pierre
 * tirée, le moellon), le maçon (la pierre de taille, le mortier), le terrassier (la terre, le torchis), le chaumier (la paille, le
 * chaume), le bûcheron (le bois abattu, les baguettes), le charpentier (la poutre, la cheville), le fendeur (le bois fendu, la
 * planche, le bardeau), le menuisier (le bois travaillé fin, le maillet), le forgeron (les outils de fer), le paysan (ce que tout
 * le monde fait : puiser, ramasser).
 */
export const TradeSchema = z.enum(['quarryman', 'mason', 'digger', 'thatcher', 'woodcutter', 'carpenter', 'splitter', 'joiner', 'smith', 'peasant']);

/**
 * Ce qui roule quand Xéros le pousse (la pièce de bois ronde : `roll` de sa définition tirée de ses réglages, world/woodPiece.ts) :
 * `axis` de la pièce couchée (est-ouest : elle roule vers le nord ou le sud ; nord-sud : vers l'est ou l'ouest) ; `sheet` : la planche
 * de ses parties (son image s'assemble à sa longueur, 4 images = un tour). Son diamètre et sa masse viennent de ses réglages.
 */
export const RollSchema = z.strictObject({ axis: z.enum(['ew', 'ns']), sheet: id });

/**
 * Ce qui pivote d'un quart de tour quand Xéros, mains vides, maintient R à son contact (la pièce de bois couchée) : `into`, l'objet
 * qu'elle devient, couché dans l'autre sens (est-ouest <-> nord-sud), centré au même endroit (la pièce de bois reste une pièce de
 * bois : seul son sens change). Le coût en endurance est
 * proportionnel à sa masse (`turnPerKg` de stamina.json).
 */
export const TurnSchema = z.strictObject({ into: id });

/** Un bout d'une pièce couchée : l'ouest, l'est (est-ouest), le nord, le sud (nord-sud). */
export const EndSchema = z.enum(['west', 'east', 'north', 'south']);

/**
 * Aspect d'une pièce de bois, ce que montre son dessin : ronde (`round`), demi (`half`), quart (`quarter`), une à trois faces
 * dressées à la doloire (`f1`, `f2`, `f3`), équarrie (`beam`, la poutre). L'aspect se déduit des réglages (forme, coups de doloire).
 */
export const WoodLookSchema = z.enum(['round', 'half', 'quarter', 'f1', 'f2', 'f3', 'beam', 'plank']);

/**
 * Une pièce de bois (la seule sorte d'objet de bois du monde, `wood-piece` de props.json), décrite par ses réglages et non par
 * une clé : `size`, son diamètre (clé de `sizes` de wood.json : celui de l'arbre d'où elle vient, `big` 55 cm, `normal` 30 cm) ;
 * `length` en cm ; `shape` : ronde, demi ou quart (le fendage) ; `hewn` : coups de doloire reçus (une face tous les `perFace`
 * coups, la poutre à 4 faces) ; `axis` : couchée est-ouest ou nord-sud, ou debout (`up` : un poteau, sur son dé) ; `notch` : la coupe commencée (`at` cm du bout ouest ou
 * nord, `hits` coups) ; `face` : le côté de la face debout d'un quartier ; `wedge` : le coin planté (`end`, le bout d'où il est planté et d'où se donnent les coups, `hits` coups de
 * masse reçus). GameState garde ces réglages pour chaque pièce posée ou tenue ; Tiled peut les donner en propriétés.
 */
/**
 * Forme d'une pièce de bois : ronde, demi (fendue en deux), quart (le quartier), planche (fendue au coutre dans un quartier ou une
 * demi-bille : `plank` de wood.json, son épaisseur et sa largeur).
 */
export const WoodShapeSchema = z.enum(['round', 'half', 'quarter', 'plank']);

export const WoodPieceSchema = z.strictObject({
  size: id,
  length: z.number().int().positive(),
  shape: WoodShapeSchema,
  hewn: z.number().int().positive().optional(),
  axis: z.enum(['ew', 'ns', 'up']),
  notch: z.strictObject({ at: z.number().int().positive(), hits: z.number().int().positive() }).optional(),
  wedge: z.strictObject({ end: EndSchema, hits: z.number().int().nonnegative() }).optional(),
  /**
   * Le quartier seulement : le côté de sa face fendue debout (il repose sur l'autre, l'écorce descend en arrondi du côté opposé) ;
   * `north` ou `south` couché est-ouest, `east` ou `west` nord-sud. R le tourne d'un quart de tour dans le sens des aiguilles d'une
   * montre (nord, est, sud, ouest). Absent : `south` est-ouest, `east` nord-sud (`faceOf`, world/woodShape.ts).
   */
  face: EndSchema.optional(),
});

/**
 * La pièce de bois d'un tas, ce qui la rend identique à une autre : diamètre, forme, longueur, coups de doloire (le sens est celui
 * du tas ; ni coupe ni coin). Un tas de bois n'accepte que des pièces identiques à sa première.
 */
export const PileWoodSchema = z.strictObject({
  size: id,
  shape: z.lazy(() => WoodShapeSchema),
  length: z.number().int().positive(),
  hewn: z.number().int().positive().optional(),
});

/** Géométrie des parties d'un aspect, dans le sens est-ouest : voir WoodSizeSchema. */
const WoodEwSchema = z.strictObject({
  h: z.number().int().positive(),
  start: z.number().int().positive(),
  end: z.number().int().positive(),
  /** Collision au sol : toute la longueur moins un pixel, `h` de profondeur, `bottom` px au-dessus du bas de l'image. */
  body: z.strictObject({ h: z.number().int().positive(), bottom: z.number().int().nonnegative() }),
});
/**
 * Géométrie des parties d'un aspect, dans le sens nord-sud (règle D, docs/STYLE.md section 8 : l'image est-ouest tournée d'un quart
 * de tour, une vraie face dessinée) : `w` colonnes (la silhouette, aussi large que l'est-ouest est haute, et l'ombre), la longueur
 * en pixels plus `extra` rangées (l'ombre au sud), le bout nord à la rangée `back` ; `start`, `end` : les rangées du bout nord et du
 * bout sud (la bande du bout coupé et l'ombre) ; `bottom` : le bas de la collision, en px au-dessus du bas de l'image. La collision
 * est celle de l'est-ouest, inversée (world/woodShape.ts).
 */
const WoodNsSchema = z.strictObject({
  w: z.number().int().positive(),
  extra: z.number().int().nonnegative(),
  back: z.number().int().nonnegative(),
  start: z.number().int().positive(),
  end: z.number().int().positive(),
  bottom: z.number().int().nonnegative(),
});

/**
 * Géométrie d'un aspect dressé (`axis: 'up'`, un poteau sur son dé), dans la planche `<sheet>-up` : l'image fait `w` colonnes sur
 * la longueur en pixels plus `extra` rangées (la tête, le bois de bout vu de dessus : la moitié de la profondeur, gabarit), plus
 * `lift` rangées vides dessous (la hauteur du dé, 15 cm : le bas de l'image est au sol, le pied sur le dé). `start` : les rangées de
 * la tête, `end` : celles du pied (avant `lift`). `body` : la collision au sol, au pied. `name` : ce qu'est la pièce debout.
 */
const WoodUpSchema = z.strictObject({
  name: id,
  w: z.number().int().positive(),
  extra: z.number().int().positive(),
  start: z.number().int().positive(),
  end: z.number().int().positive(),
  lift: z.number().int().nonnegative(),
  body: z.strictObject({ w: z.number().int().positive(), h: z.number().int().positive() }),
});

/**
 * Un aspect d'un diamètre : son nom et son genre (les messages), son icône 16×16 (`item-…`), sa planche portée (`held-…` :
 * vues `down` et `up` par le bout, ne dépendant pas de la longueur ; `right`, la pièce de 1 m de profil, que le jeu remplace par la
 * pièce assemblée à sa longueur), et la géométrie de ses parties (contrat entre le dessin et le jeu, `world/woodShape.ts`).
 */
export const WoodLookDefSchema = z.strictObject({
  name: id,
  gender: z.enum(['m', 'f']),
  icon: id,
  held: id,
  ew: WoodEwSchema,
  ns: WoodNsSchema,
  /** Debout (poteau) : absent, cet aspect ne se dresse pas. */
  up: WoodUpSchema.optional(),
});

/** Fendre un aspect : ce qu'il devient (`into`, deux pièces), et le coin bas gauche de chacune par rapport à la pièce fendue, par sens. */
const WoodSplitSchema = z.strictObject({
  into: z.enum(['half', 'quarter']),
  ew: z.tuple([z.tuple([px, px]), z.tuple([px, px])]),
  ns: z.tuple([z.tuple([px, px]), z.tuple([px, px])]),
});

/**
 * Un diamètre de bois (wood.json, `sizes`) : `diameter` du bois en cm (sans le contour), `sheet` la planche des parties (`<sheet>`
 * est-ouest, `<sheet>-ns` nord-sud), `tile` la longueur d'un milieu répété (px), `notch` la bande d'encoche de la coupe, `hew` :
 * présent, la doloire est refusée avec ce message (le gros bois ne fait pas de poutre) ; `split` : les aspects qui se fendent et ce
 * qu'ils deviennent (vide : ce diamètre ne se fend pas) ; `looks` : ses aspects dessinés. Un nouveau bois = un diamètre ou un aspect
 * ici, avec ses dessins, pas une nouvelle clé d'objet.
 */
export const WoodSizeSchema = z.strictObject({
  name: id,
  diameter: z.number().positive(),
  sheet: id,
  tile: z.number().int().positive(),
  /** La bande d'encoche est-ouest (`w` colonnes, la coupe à la colonne `at` de la bande) ; nord-sud, la même en rangées (règle D). */
  notch: z.strictObject({ ew: z.strictObject({ w: z.number().int().positive(), at: z.number().int().nonnegative() }) }),
  hew: id.optional(),
  split: z.partialRecord(z.enum(['round', 'half']), WoodSplitSchema),
  looks: z.partialRecord(WoodLookSchema, WoodLookDefSchema),
});

/**
 * Le bois (wood.json) : `density` du bois vert (kg/m³) ; `grid` (cm) : la coupe s'aimante tous les `grid` cm depuis le bout le plus
 * proche de Xéros ; `min` (cm) : aucune pièce plus courte ; `cut` : l'outil qui coupe et ses coups ; `hew` : l'outil qui équarrit,
 * `perFace` coups par face, `faces` faces, `beam` le côté de la poutre (cm de bois) ; `split` : le coin, la masse, les coups de masse
 * par mètre commencé (`hits` : 3 pour 1 m, 6 pour 2 m ; un seul coin, planté dans le bout, quelle que soit la longueur) ; `sizes` : les diamètres.
 */
export const WoodSchema = z.strictObject({
  density: z.number().positive(),
  grid: z.number().int().positive(),
  min: z.number().int().positive(),
  cut: z.strictObject({ tool: id, hits: z.number().int().positive() }),
  hew: z.strictObject({ tool: id, perFace: z.number().int().positive(), faces: z.literal(4), beam: z.number().positive() }),
  /** La planche fendue : son épaisseur et sa largeur de bois (cm), quel que soit le diamètre d'où elle vient. */
  plank: z.strictObject({ thick: z.number().positive(), wide: z.number().positive() }),
  split: z.strictObject({ wedge: id, maul: id, hits: z.number().int().positive() }),
  sizes: z.record(id, WoodSizeSchema),
});

/** Nombre de mains que demande un objet qu'on prend : une, ou les deux (lourd ou long). */
export const HandsSchema = z.union([z.literal(1), z.literal(2)]);

/**
 * Objet du monde qu'on prend dans les mains avec E (la bille) : il quitte la carte, et Xéros le porte devant lui
 * (voir `hold`). Reposé, il retrouve la carte à sa nouvelle place.
 */
export const TakeSchema = z.strictObject({
  hands: HandsSchema,
  /** Icône 16×16 affichée dans les cases des mains (`item-<…>`). */
  icon: id,
  /** Comment il se voit sur Xéros quand il le tient (le fagot : `carry`, `held-faggot`). */
  hold: z.lazy(() => HoldSchema),
  /** Genre de tas où il s'entrepose (clé de piles.json) : posé sur un tas du même genre, il s'y ajoute. */
  pile: id.optional(),
});

/**
 * La symétrie d'un objet, qui dit ses vues au sol (toutes dessinées dès sa création, docs/objets/README.md, STYLE.md section 8) :
 * `round` une vue (pareil de tous côtés : seau, billot) ; `symmetric` deux (est-ouest `<image>`, nord-sud `<image>-ns` : table,
 * caisse, fagot) ; `four` quatre (`<image>`, puis `<image>-r1`, `-r2`, `-r3`, un quart de tour de plus dans le sens des
 * aiguilles d'une montre à chaque fois : coffre, lit, outil, branche ; ce qui tombe a son demi-tour en `<image>-left`).
 */
export const ViewsSchema = z.enum(['round', 'symmetric', 'four']);

/** Un objet possédable (dans les mains, au sol) : sa clé dans items.json est son identifiant. Une main en tient un seul. */
export const ItemDefSchema = z.strictObject({
  /** Nom affiché, en français. */
  name: id,
  /** Image 16×16, `item-<clé>` : dans les cases des mains, et au sol faute de `ground`. */
  icon: id,
  /** Image de l'objet couché au sol, à l'échelle (la branche : le même dessin que dans le tas). Absente : l'icône. */
  ground: id.optional(),
  /** Sa symétrie : ses vues au sol (`ground`, sinon l'icône), voir ViewsSchema. */
  views: ViewsSchema,
  /** Couché au sol (outil, branche, piquet) : ses vues nord-sud ont les dimensions de l'est-ouest inversées (règle D). */
  lying: z.boolean().optional(),
  kind: z.enum(['tool', 'weapon', 'resource']),
  /** Mains qu'il faut pour le tenir : 2 pour ce qui est lourd ou long (la hache de bûcheron). */
  hands: HandsSchema.default(1),
  /** Comment il se voit sur Xéros quand il le tient : voir HoldSchema. */
  hold: z.lazy(() => HoldSchema).optional(),
  /** Genre de tas où il s'entrepose (clé de piles.json) : posé sur un tas du même genre, il s'y ajoute. */
  pile: id.optional(),
  /** Masse en kg (obligatoire : validate.ts) : saisie, ou calculée par sa matière (`MatterMassSchema`, il lui faut ses `dims`). */
  mass: z.union([z.number().positive(), z.lazy(() => MatterMassSchema)]).optional(),
  /** Dimensions réelles, en centimètres (voir DimsSchema) : son image au sol (`ground`, vue 0) en suit le gabarit (validate.ts). */
  dims: z.lazy(() => DimsSchema).optional(),
  /** Matière naturelle : ses formes dessinées et sa taille qui varie, voir NaturalDefSchema. */
  natural: z.lazy(() => NaturalDefSchema).optional(),
  /** Le métier qui le fait et le vendrait au village, voir TradeSchema. */
  trade: z.lazy(() => TradeSchema).optional(),
});

/**
 * Dimensions réelles d'un objet, en centimètres (gabarit, docs/STYLE.md section 8) : `w` largeur (est-ouest), `d`
 * profondeur (nord-sud), `h` hauteur ; `shape` : `box`, `cylinder` (avec `axis` : `ew` couché est-ouest, `ns` couché
 * nord-sud, `up` debout) ou `flat` (à plat sur le sol). validate.ts en tire la taille attendue de l'image.
 */
export const DimsSchema = z
  .strictObject({
    w: z.number().positive(),
    d: z.number().positive(),
    h: z.number().nonnegative(),
    shape: z.enum(['box', 'cylinder', 'flat']),
    axis: z.enum(['ew', 'ns', 'up']).optional(),
    /**
     * Pièce de bâtiment qui relie des appuis posés au sol (sablière nord-sud, chevron, couverture) : sa profondeur se voit
     * à l'échelle du sol, sans raccourci (hauteur à l'écran H + D au lieu de H + D/2), pour qu'elle rejoigne ses poteaux.
     * `h` est alors la hauteur de sa boîte englobante : épaisseur plus pente.
     */
    ground: z.literal(true).optional(),
  })
  .refine((d) => (d.shape === 'cylinder') === (d.axis !== undefined), { message: "'axis' pour un cylindre, et pour lui seul" });

/**
 * Un objet du catalogue (arbre, rocher, maison, meuble...). Sa clé dans props.json est son identifiant :
 * en anglais, en kebab-case (vérifié par validate.ts) ; c'est aussi le type d'un objet de carte dans Tiled.
 */
export const PropDefSchema = z.strictObject({
  /** Nom affiché, en français. */
  name: id,
  image: id,
  /** Dimensions réelles, en centimètres : voir DimsSchema. */
  dims: DimsSchema,
  /** Sa symétrie : ses vues (`image` et les autres), voir ViewsSchema. */
  views: ViewsSchema,
  /** Couché au sol (la pièce de bois, le fagot, un outil posé) : ses vues nord-sud ont les dimensions de l'est-ouest inversées (règle D). */
  lying: z.boolean().optional(),
  /** Boîte de collision simple, centrée en bas de l'image. bottom = marge entre le bas de l'image et le bas de la boîte. */
  body: z.strictObject({ w: px.positive(), h: px.positive(), bottom: px }).optional(),
  /** Boîtes de collision libres, dans le repère de l'image (pour les formes complexes : maison...). */
  bodies: z.array(RectSchema).optional(),
  /** Animation à jouer en boucle (l'image est alors une planche animée), ex. 'burn'. */
  anim: id.optional(),
  /** Points d'où sort de la fumée, dans le repère de l'image. */
  smoke: z.array(z.tuple([px, px])).optional(),
  /** 'floor' : dessiné à plat sur le sol, sous les personnages (tache de lumière, tapis, dé de pierre...). */
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
  /** Masse (obligatoire pour ce qui se prend ou roule : validate.ts) : voir MassSchema. Celle d'une quantité mesurée (`length`) est celle de sa longueur neuve. */
  mass: MassSchema.optional(),
  /** Ce qui roule quand on le pousse : voir RollSchema. */
  roll: RollSchema.optional(),
  /** Il enseigne un plan (clé de plans.json) : E dessus, et Xéros le connaît (la planchette gravée de la mère). L'objet reste en place. */
  teaches: id.optional(),
  /** Ce qui pivote d'un quart de tour au sol (R maintenu, mains vides) : voir TurnSchema. */
  turn: TurnSchema.optional(),
  /**
   * La pièce de bois (`wood-piece`, le seul objet de bois du monde) : ses réglages par défaut, ceux d'une pièce posée dans Tiled
   * sans propriétés (une pièce née ou changée garde les siens dans GameState). Sa définition complète (dimensions, collision, masse,
   * roulement, prise, tas) se tire de ses réglages : world/woodPiece.ts.
   */
  wood: z.lazy(() => WoodPieceSchema).optional(),
  /** Genre du nom (`name`), pour les messages : `f` (« la pierre », par défaut) ou `m`. */
  gender: z.enum(['m', 'f']).default('f'),
  /** Matière naturelle : ses formes dessinées et sa taille qui varie, voir NaturalDefSchema (un objet de Tiled tire les siennes de son identifiant). */
  natural: z.lazy(() => NaturalDefSchema).optional(),
  /** Le métier qui le fait et le vendrait au village, voir TradeSchema. */
  trade: z.lazy(() => TradeSchema).optional(),
  /**
   * Quantité mesurée (le rouleau de corde) : une longueur, en centimètres, gardée par GameState (`length` de ce qu'on
   * tient, d'un objet né ou changé). `start` : la longueur d'un objet neuf (posé dans Tiled) ; `cut` : ce qu'enlève une
   * coupe ; `piece` : l'objet possédable (items.json) qui tombe au sol à chaque coupe (le lien). Coupé à zéro, il disparaît.
   */
  length: z.strictObject({ start: z.number().int().positive(), cut: z.number().int().positive(), piece: id }).optional(),
  /**
   * Ce qu'on peut poser dessus avec E, en le tenant dans la main active (le rouleau sur le billot) : objet de props.json
   * tenu -> objet de props.json que devient celui-ci, qui le porte (voir `bears`).
   */
  rest: z.record(id, id).optional(),
  /**
   * Il porte un objet posé dessus (le billot et son rouleau) : `prop`, l'objet porté, qui a une longueur (`length`), et
   * `empty`, ce qu'il redevient quand on le reprend (E) ou qu'il est vide. Son `harvest` (outil, geste) coupe l'objet porté :
   * chaque coup réussi en enlève `length.cut` et lâche `length.piece` ; `becomes`, `drops`, `spawns` et `fall` n'y servent pas.
   */
  bears: z.strictObject({ prop: id, empty: id }).optional(),
  /**
   * Pièce d'un toit (chevron, toit de planches) : quand Xéros est dessous ou caché derrière, elle devient en partie transparente,
   * avec les autres pièces de toit qu'elle touche (`systems/roofs.ts`). Son image garde sous elle, vide, la hauteur qui la
   * sépare du sol : le bas de l'image est au sol, au sud de l'avant-toit, et c'est sa profondeur d'affichage.
   */
  roof: z.literal(true).optional(),
  /**
   * Ombre portée d'un toit (la couverture, pièce `roof` et `ground`), calculée par le jeu (`world/roofShadow.ts`) : son
   * emprise au sol (largeur `dims.w`, profondeur `dims.d`, bord sud au bas de l'image) projetée sur le sol, décalée selon
   * la lumière (`SHADOW` de config.ts). `south`, `north` : hauteur du dessus du toit à son bord sud et à son bord nord, en cm.
   */
  shadow: z.strictObject({ south: z.number().positive(), north: z.number().positive() }).optional(),
  /**
   * Élément calculé (le morceau de solin) : nombre de tirages produits par build-art, chacun avec toutes ses vues. Le tirage 0 est
   * `<image>` (et ses vues), le tirage k ≥ 1 est `<image>-s<k>` (et ses vues : `<image>-s<k>-r1`…). Le jeu en tire un au hasard à
   * chaque pose (`variant` d'une pièce posée en mode construction, GameState).
   */
  variants: z.number().int().min(2).max(32).optional(),
  /**
   * Morceau de mur qui se raccorde (le morceau de solin) : sa manière (`rough` brut, `dressed` taillé). Posés en mode construction,
   * des morceaux de même manière, à la même hauteur, alignés et jointifs, forment un tronçon dessiné d'un seul tenant
   * (world/wallRuns.ts, world/walls.ts) ; deux tronçons à angle droit forment un angle ; un tronçon qui s'arrête montre une tête.
   */
  wall: z.enum(['rough', 'dressed']).optional(),
});

/** Les quatre coins d'une emprise : nord-ouest, nord-est, sud-est, sud-ouest. */
export const CornerSchema = z.enum(['nw', 'ne', 'se', 'sw']);

/**
 * Ce qu'une place de chantier accepte : une pièce précise, par sa clé (`prop` : un objet du monde qu'on porte, `item` : un
 * objet possédable), ou une poutre (`wood` : une pièce de bois équarrie sur ses quatre faces, de cette `section` (côté, en cm) et
 * de cette `length` exacte). `refuse` : ce qu'on dit à qui présente autre chose (« Il faut une dalle. », « Ce n'est pas une
 * poutre. ») ; pour une poutre, « Il faut l'équarrir d'abord. » et « Il faut une poutre de 3 m. » sont dits d'après ses réglages.
 * Les places d'un tas, elles, acceptent un genre (`genre` de piles.json).
 */
export const AcceptSchema = z
  .strictObject({
    prop: id.optional(),
    item: id.optional(),
    wood: z.strictObject({ length: z.number().int().positive(), section: z.number().int().positive() }).optional(),
    refuse: id,
  })
  .refine((a) => [a.prop, a.item, a.wood].filter((q) => q !== undefined).length === 1, { message: "'accepts' nomme une pièce : soit 'prop', soit 'item', soit 'wood' (une poutre)" });

/**
 * Une place d'un plan (plans.json) : la pièce qui s'y pose (`piece`, un objet de props.json, qui paraît sur la carte), où
 * (`at`, en centimètres depuis le piquet nord-ouest : le coin bas gauche de l'image de la pièce, comme dans Tiled), comment
 * (`orientation`), sur quelles places elle repose (`on`, des places du plan : elle n'existe que quand elles sont posées) ;
 * `corner` : le piquet de ce coin est arraché quand elle est posée ; `accepts` : la pièce qu'on y apporte (sinon celle de l'étape).
 */
export const PlanPlaceSchema = z.strictObject({
  piece: id,
  at: z.tuple([px, px]),
  orientation: z.enum(['flat', 'upright', 'ew', 'ns', 'slope']),
  on: z.array(id).default([]),
  corner: CornerSchema.optional(),
  accepts: AcceptSchema.optional(),
});

/** Une étape d'un plan : son nom (« les dés »), ses places, et `soon` : déclarée mais pas encore jouable (« à venir »). */
export const PlanStepSchema = z.strictObject({
  name: id,
  soon: z.literal(true).optional(),
  /** Ce que seront les pièces de cette étape quand elle s'ouvrira (une étape `soon` garde ses dessins actuels en fantôme jusqu'alors). */
  note: z.string().optional(),
  /** Ce que toutes les places de l'étape acceptent, sauf celles qui disent autre chose. */
  accepts: AcceptSchema.optional(),
  places: z.record(id, PlanPlaceSchema),
});

/**
 * Un plan (plans.json) : tout ce qu'il faut pour bâtir, en centimètres, sans code. `stake` : le piquet (objet possédable) qui
 * trace l'emprise ; `facing` : le côté haut du toit (l'abri n'est dessiné que dans ce sens : le nord) ; `footprint` : l'emprise
 * entre les axes des coins ; `corners` : les quatre coins depuis le piquet nord-ouest ; `steps` : les étapes dans l'ordre réel
 * du chantier (dés, poteaux, sablières, chevrons, toit), chacune avec ses places.
 */
export const PlanSchema = z.strictObject({
  /** Nom affiché, en français : « abri à bois ». */
  name: id,
  /** Ce que dit Xéros quand il apprend le plan (E sur la planchette) : « Xéros connaît maintenant le plan de l'abri à bois. » */
  learned: id,
  stake: id,
  /** L'objet du monde (props.json) qui montre un piquet planté aux coins du tracé, et en fantôme là où il en reste à planter. */
  planted: id,
  facing: z.literal('north'),
  footprint: z.strictObject({ w: z.number().positive(), d: z.number().positive() }),
  corners: z.strictObject({ nw: z.tuple([px, px]), ne: z.tuple([px, px]), se: z.tuple([px, px]), sw: z.tuple([px, px]) }),
  steps: z.array(PlanStepSchema).min(1),
});

/**
 * Ce qu'est une pièce posée en mode construction (le bac à sable) : un objet du monde (`prop`, clé de props.json), un objet
 * possédable (`item`, clé de items.json) ou une pièce de bois (`wood`, ses réglages ; son sens est son `axis`).
 */
export const BuildRefSchema = z.union([
  z.strictObject({ prop: id }),
  z.strictObject({ item: id }),
  z.strictObject({ wood: z.lazy(() => WoodPieceSchema) }),
]);

/**
 * Une pièce posée en mode construction, comme l'écrivent GameState et les plans du bac à sable : ce qu'elle est (`piece`), le coin
 * nord-ouest de son emprise au sol (`x`, `y`, en cm) et la hauteur de sa base (`z`, en cm, 0 = au sol), tous sur la grille de
 * 20 cm (un plan : relatifs à son coin nord-ouest) ; `view` : son sens, un quart de tour de plus à chaque cran (0 à 3, selon la
 * symétrie de l'objet ; la pièce de bois garde son sens dans `axis`) ; `natural` : la forme et la taille d'une matière naturelle ;
 * `variant` : le tirage d'un élément calculé (`variants` de props.json).
 */
export const BuildPlacedSchema = z.strictObject({
  piece: BuildRefSchema,
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int().nonnegative(),
  view: z.number().int().min(0).max(3).default(0),
  natural: z.lazy(() => NaturalSchema).optional(),
  variant: z.number().int().nonnegative().optional(),
});

/**
 * Un plan du bac à sable (`src/content/plans/<nom>.json`, écrit par « Enregistrer comme plan » du mode construction) : son nom
 * affiché, son emprise (`size`, en cm) et ses pièces, placées depuis son coin nord-ouest. Il se pose d'un coup, comme une pièce.
 * À ne pas confondre avec les plans de chantier guidé de plans.json.
 */
export const BuildPlanSchema = z.strictObject({
  name: id,
  size: z.strictObject({ w: z.number().positive(), d: z.number().positive() }),
  pieces: z.array(BuildPlacedSchema).min(1),
});

/**
 * Une place d'un tas (piles.json) : la pièce qui s'y pose est dessinée pour elle (`image`). Coordonnées dans le repère
 * du tas, dont le point (0, 0) est au sol.
 */
export const PilePlaceSchema = z.strictObject({
  /** Couche : 0 au sol, 1 posée sur des pièces de la couche 0, etc. */
  layer: z.number().int().nonnegative(),
  /** Places qui la portent : elle n'existe que quand elles sont toutes prises (vide au sol). */
  on: z.array(id).default([]),
  /** Image de la pièce à cette place. */
  image: id,
  /** Coin bas gauche de l'image, telle qu'elle s'affiche (hauteur de la couche comprise). */
  x: px,
  y: px,
  /** Collision de la pièce au sol (couche 0 seulement) ; une pièce du dessus repose sur celles qui la portent. */
  body: RectSchema.optional(),
  /**
   * Point visé, au sol : Xéros pose sur la place disponible la plus proche du point qu'il regarde, et reprend la pièce
   * la plus haute. Absent : le centre de `body` au sol, le milieu des points visés des places qui la portent au-dessus.
   */
  aim: z.tuple([px, px]).optional(),
});

/**
 * Un genre de tas (piles.json) : ce qu'on y entrepose et ses places. Le maximum est le nombre de places. L'ordre
 * d'affichage des pièces est donné par `order`.
 */
export const PileDefSchema = z.strictObject({
  /** Nom affiché, en français. */
  name: id,
  /**
   * Ce qui s'y entrepose et ce qu'on en reprend : un objet possédable (`item`), un objet du monde (`prop`), ou une pièce de bois
   * (`wood` : `PileWoodSchema`). Les tas de bois ne s'écrivent pas dans piles.json : leur forme se calcule d'après leur première
   * pièce (world/woodPile.ts) ; piles.json ne garde que ce qui ne se calcule pas (branches, fagots, liens).
   */
  piece: z.union([z.strictObject({ item: id }), z.strictObject({ prop: id }), z.strictObject({ wood: z.lazy(() => PileWoodSchema) })]),
  /** Place de la première pièce d'un nouveau tas (au sol). */
  start: id,
  /** Nombre de pièces à partir duquel le tas bloque le passage. */
  blockFrom: z.number().int().positive().default(1),
  /**
   * Ordre d'affichage des pièces. `layers` : couche par couche, du bas vers le haut, et dans une couche de l'arrière
   * vers l'avant (une pièce du dessus passe devant toutes celles du sol). `depth` : de l'arrière vers l'avant, d'après le
   * point visé au sol de chaque place, et à égalité la couche du bas d'abord. Une pièce du dessus est alors cachée en bas
   * par la pièce posée devant elle, comme une bille dans un creux derrière la bille de devant.
   */
  order: z.enum(['layers', 'depth']).default('layers'),
  /** Les places, par identifiant ; l'ordre est celui d'une construction type (aperçu). */
  places: z.record(id, PilePlaceSchema),
  /**
   * Le tas tourné (les billes nord-sud, vues par le bout) : ses propres places, sa place de départ et son ordre
   * d'affichage. Absent : le genre ne se tourne pas (R ne fait rien). Le reste (pièce, blockFrom) est celui du genre.
   */
  turned: z
    .strictObject({ start: id, order: z.enum(['layers', 'depth']).default('layers'), places: z.record(id, PilePlaceSchema) })
    .optional(),
  /**
   * Le lien qui ceinture le tas par-dessous (les branches) : `item`, l'objet possédable qu'on pose (Q) par terre, où il
   * commence un tas sur lui, ou sur un tas de ce genre qui n'en a pas. Sous des pièces, on n'en voit que les deux bouts
   * courts : `north` dépasse derrière la pièce au sol la plus au nord, `south` devant la plus au sud ; chacun a son
   * `image`, son `x` (repère du tas) et son `dy` : le bas de l'image est à `dy` du bord nord de la collision de la pièce
   * la plus au nord (`north`), du bord sud de celle de la plus au sud (`south`), si bien que les bouts suivent la taille
   * du tas. `alone` : son dessin quand le tas n'a encore aucune pièce (une boucle lâche par terre), coin bas gauche en
   * (`x`, `y`), repère du tas. `into` : l'objet de props.json que devient le tas plein et lié quand on le noue (E
   * maintenu) : le fagot, qui se dénoue en un tas plein de ce genre avec son lien. Un genre qui se tourne (`turned`) a aussi les
   * deux bouts de son lien d'est en ouest sous le tas nord-sud : `west` dépasse à l'ouest de la pièce au sol la plus à l'ouest,
   * `east` à l'est de la plus à l'est ; chacun a son `image`, son `y` (repère du tas) et son `dx` : le bord droit de l'image est à
   * `dx` du bord ouest de la collision de la pièce la plus à l'ouest (`west`), le bord gauche à `dx` du bord est de la plus à l'est
   * (`east`).
   */
  tie: z
    .strictObject({
      item: id,
      north: z.strictObject({ image: id, x: px, dy: px }),
      south: z.strictObject({ image: id, x: px, dy: px }),
      west: z.strictObject({ image: id, y: px, dx: px }).optional(),
      east: z.strictObject({ image: id, y: px, dx: px }).optional(),
      alone: z.strictObject({ image: id, x: px, y: px }),
      into: id,
    })
    .optional(),
  /** Le nombre de pièces s'affiche en tout petit en bas à droite du tas quand Xéros est tout près (les branches). */
  count: z.boolean().default(false),
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

/** Point d'accroche d'un objet tenu, pour une image : (dx, dy) depuis les pieds. `behind` : derrière le corps à cette image. */
export const HoldPointSchema = z.strictObject({ dx: px, dy: px, behind: z.boolean().default(false) });

/** Par direction (la gauche en miroir de la droite), un point par image ; pour l'attente (`idle`) et la marche (`walk`). */
const holdMotions = <T extends z.ZodType>(point: T) => {
  const dirs = z.strictObject({ down: z.array(point), up: z.array(point), right: z.array(point) });
  return z.strictObject({ idle: dirs, walk: dirs });
};

/**
 * Où se voit ce que Xéros tient, à l'attente et à la marche (hold.json), selon la posture :
 * `hand` : bras pendants (`idle-*`, `walk-*`), un point par main de Xéros (`left`, `right`) ;
 * `shoulder` : sur l'épaule (`shoulder-idle-*`, `shoulder-walk-*`), la hache ;
 * `carry` : porté à deux mains devant lui (`carry-idle-*`, `carry-walk-*`), la bille.
 * L'image de l'objet est posée par son centre sur le point, comme l'outil d'un geste. Vers la gauche, tout est le miroir
 * de la droite, et les mains s'échangent : la main de Xéros côté spectateur n'est plus la même.
 */
export const HoldPosesSchema = z.strictObject({
  hand: holdMotions(z.strictObject({ left: HoldPointSchema, right: HoldPointSchema })),
  shoulder: holdMotions(HoldPointSchema),
  carry: holdMotions(HoldPointSchema),
});

export const StanceSchema = z.enum(['hand', 'shoulder', 'carry']);

/**
 * Comment un objet tenu se voit sur Xéros : sa posture (voir HoldPosesSchema) et sa planche `held-<…>` (animations `down`,
 * `up`, `right` d'une image, le point d'accroche au centre ; la gauche = la droite retournée). Sans planche : son icône,
 * à la main. Absent d'un objet possédable : `hand` avec son icône (à deux mains : `carry`).
 */
export const HoldSchema = z.strictObject({ stance: StanceSchema, image: id.optional() });

/**
 * La force de Xéros (strength.json), en kg : `carry` ce qu'il porte au plus (les deux mains ensemble), `walk` jusqu'où il
 * marche normalement (au-delà : pas de course, et une marche qui ralentit), `roll` ce qu'il fait rouler au plus ;
 * `slowest` : sa vitesse de marche, en part de la normale, quand il porte `carry`. Plus tard la force progressera :
 * seuls ces chiffres changeront.
 */
export const StrengthSchema = z
  .strictObject({
    carry: z.number().positive(),
    walk: z.number().positive(),
    roll: z.number().positive(),
    slowest: z.number().gt(0).lte(1),
  })
  .refine((s) => s.walk < s.carry, { message: "'walk' doit être au-dessous de 'carry'" });

/**
 * L'endurance de Xéros (stamina.json), la fatigue de la journée : `max` points ; sous la part `tired` du maximum, il ne
 * court plus et sa marche est ralentie à la part `tiredWalk` de la normale. `costs` : le prix de chaque effort, en points
 * (les « PerSec » se paient chaque seconde de l'effort, les « PerKg » sont proportionnels à la masse en kg) ; marcher ne coûte rien.
 * `chop` un coup d'outil (hache sur un arbre, une section, le houppier), `cutTie` un coup sur le lien du billot, `plant` planter
 * le coin de fendage, `whittle` tailler un piquet à la hachette, `stake` planter un piquet de tracé, `maul` un coup de masse sur le coin, `knot`
 * nouer ou dénouer, `hewPerM` un coup de doloire, par mètre de la pièce qu'on équarrit, `turnPerKg` pivoter une bille, `raisePerKg` dresser une poutre sur son appui (par kg ; avec l'aide de la mère, la moitié), `carryPerKgSec` marcher en portant (par kg au-delà de `walk` de
 * strength.json), `pushPerKgSec` pousser une bille, `runPerSec` courir.
 */
export const StaminaSchema = z.strictObject({
  max: z.number().positive(),
  tired: z.number().gt(0).lt(1),
  tiredWalk: z.number().gt(0).lte(1),
  costs: z.strictObject({
    chop: z.number().nonnegative(),
    cutTie: z.number().nonnegative(),
    plant: z.number().nonnegative(),
    stake: z.number().nonnegative(),
    whittle: z.number().nonnegative(),
    maul: z.number().nonnegative(),
    knot: z.number().nonnegative(),
    hewPerM: z.number().nonnegative(),
    turnPerKg: z.number().nonnegative(),
    raisePerKg: z.number().nonnegative(),
    carryPerKgSec: z.number().nonnegative(),
    pushPerKgSec: z.number().nonnegative(),
    runPerSec: z.number().nonnegative(),
  }),
});

/**
 * Ce qui entre dans une transformation ou en sort (transforms.json) : un objet possédable (`item`), un objet du monde (`prop`), une
 * pièce de bois (`wood` : les réglages qui la distinguent, `size`, `shape`, `hewn`, et sa `length` en cm, ou absente : la longueur
 * de la pièce d'entrée), ou, en entrée seulement, de la matière prise au poste (`raw` : une matière de matters.json, `kg` : l'eau
 * de l'étang, la terre de la berge). `count` : combien.
 */
export const TransformPartSchema = z
  .strictObject({
    item: id.optional(),
    prop: id.optional(),
    wood: z
      .strictObject({ size: id, shape: z.lazy(() => WoodShapeSchema), hewn: z.number().int().positive().optional(), length: z.number().int().positive().optional() })
      .optional(),
    raw: id.optional(),
    kg: z.number().positive().optional(),
    count: z.number().int().positive().default(1),
  })
  .refine((p) => [p.item, p.prop, p.wood, p.raw].filter((q) => q !== undefined).length === 1, { message: "une entrée ou une sortie nomme une chose : 'item', 'prop', 'wood' ou 'raw'" })
  .refine((p) => (p.raw === undefined) === (p.kg === undefined), { message: "'kg' pour une matière prise au poste ('raw'), et pour elle seule" });

/**
 * Le poste d'une transformation : au sol (`ground`), sur le billot (`block`), à l'établi (`bench`), au bord de l'étang (`pond`, où
 * l'on puise l'eau et creuse l'argile), sur un chevalet de fendeur (`brake`).
 */
export const StationSchema = z.enum(['ground', 'block', 'bench', 'pond', 'brake']);

/**
 * Le geste d'une transformation : `soon`, à venir (en attendant, ?dieu l'applique d'un coup : « Transformer ») ; ou le geste réel,
 * déjà jouable : `system`, le fichier qui le joue, et `keys`, ce que fait le joueur.
 */
export const TransformGestureSchema = z.union([z.literal('soon'), z.strictObject({ system: id, keys: id })]);

/**
 * Une transformation (transforms.json, docs/CONCEPTION.md « Les matières ») : tailler retire de la matière. `name` : ce qu'on fait
 * (« dégrossir un moellon ») ; `inputs` et `outputs` (la sortie pèse moins que l'entrée : validate.ts) ; `waste` : ce qu'on retire
 * (`name`, et `prop` : l'objet du monde qui en reste au sol, les éclats de pierre ; absent : il disparaît, avec `fate` qui dit où il
 * va) ; `tools` : les outils (clés de items.json) ; `station` : le poste ; `trade` : le métier ; `gesture` : le geste.
 */
export const TransformSchema = z.strictObject({
  name: id,
  inputs: z.array(TransformPartSchema),
  outputs: z.array(TransformPartSchema).min(1),
  waste: z.strictObject({ name: id, prop: id.optional(), fate: id.optional() }).refine((w) => !w.prop !== !w.fate, { message: "le déchet reste au sol ('prop') ou dit où il va ('fate'), l'un ou l'autre" }).optional(),
  tools: z.array(id).default([]),
  station: StationSchema,
  trade: TradeSchema,
  gesture: TransformGestureSchema,
});

/** Un personnage qui parle : son nom affiché et son portrait (sans la taille, ajoutée selon la config). */
export const CharacterDefSchema = z.strictObject({ name: id, portrait: id });

/** Ce qu'un choix de dialogue peut déclencher quand le dialogue se ferme : `sleep`, passer la nuit, `help`, dresser avec l'aide de la mère la poutre d'un chantier (WorldScene). */
export const DialogueActionSchema = z.enum(['sleep', 'help']);

/** Un choix offert à la fin d'une ligne (« Oui », « Non ») ; sans `action`, il ferme simplement le dialogue. */
export const DialogueChoiceSchema = z.strictObject({ text: id, action: DialogueActionSchema.optional() });

export const DialogueLineSchema = z.strictObject({
  /** Clé dans characters.json. */
  speaker: id,
  /** Nom de l'expression du portrait, ex. 'neutral'. */
  expression: id,
  text: z.string().min(1),
  /** Choix offerts quand la ligne est dite (la dernière du dialogue seulement : validate.ts) ; celui qu'on prend ferme le dialogue. */
  choices: z.array(DialogueChoiceSchema).min(2).max(3).optional(),
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
  /** Réglages d'une pièce de bois (`wood-piece`), tirés de ses propriétés Tiled ; absents : ceux de props.json. */
  wood: z.lazy(() => WoodPieceSchema).optional(),
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
export type Views = z.infer<typeof ViewsSchema>;
export type Harvest = z.infer<typeof HarvestSchema>;
export type Drop = z.infer<typeof DropSchema>;
export type ItemDef = z.infer<typeof ItemDefSchema>;
export type Take = z.infer<typeof TakeSchema>;
export type Mass = z.infer<typeof MassSchema>;
export type Turn = z.infer<typeof TurnSchema>;
export type Roll = z.infer<typeof RollSchema>;
export type Strength = z.infer<typeof StrengthSchema>;
export type DialogueAction = z.infer<typeof DialogueActionSchema>;
export type StaminaDef = z.infer<typeof StaminaSchema>;
export type PilePlace = z.infer<typeof PilePlaceSchema>;
export type PileDef = z.infer<typeof PileDefSchema>;
export type Corner = z.infer<typeof CornerSchema>;
export type Accept = z.infer<typeof AcceptSchema>;
export type PlanPlace = z.infer<typeof PlanPlaceSchema>;
export type PlanStep = z.infer<typeof PlanStepSchema>;
export type PlanDef = z.infer<typeof PlanSchema>;
export type Pose = z.infer<typeof PoseSchema>;
export type Gesture = z.infer<typeof GestureSchema>;
export type HoldPoint = z.infer<typeof HoldPointSchema>;
export type HoldPoses = z.infer<typeof HoldPosesSchema>;
export type Hold = z.infer<typeof HoldSchema>;
export type Stance = z.infer<typeof StanceSchema>;
export type CharacterDef = z.infer<typeof CharacterDefSchema>;
export type DialogueLine = z.infer<typeof DialogueLineSchema>;
export type DialogueDef = z.infer<typeof DialogueDefSchema>;
export type MapObject = z.infer<typeof MapObjectSchema>;
export type Spawn = z.infer<typeof SpawnSchema>;
export type Exit = z.infer<typeof ExitSchema>;
export type Npc = z.infer<typeof NpcSchema>;
export type MapData = z.infer<typeof MapSchema>;
export type End = z.infer<typeof EndSchema>;
export type WoodLook = z.infer<typeof WoodLookSchema>;
export type WoodPiece = z.infer<typeof WoodPieceSchema>;
export type PileWood = z.infer<typeof PileWoodSchema>;
export type WoodLookDef = z.infer<typeof WoodLookDefSchema>;
export type WoodSize = z.infer<typeof WoodSizeSchema>;
export type WoodDef = z.infer<typeof WoodSchema>;
export type MatterMass = z.infer<typeof MatterMassSchema>;
export type Matter = z.infer<typeof MatterSchema>;
export type Rock = z.infer<typeof RockSchema>;
export type NaturalDef = z.infer<typeof NaturalDefSchema>;
export type Natural = z.infer<typeof NaturalSchema>;
export type Trade = z.infer<typeof TradeSchema>;
export type TransformPart = z.infer<typeof TransformPartSchema>;
export type Station = z.infer<typeof StationSchema>;
export type TransformDef = z.infer<typeof TransformSchema>;
export type BuildRef = z.infer<typeof BuildRefSchema>;
export type BuildPlaced = z.infer<typeof BuildPlacedSchema>;
export type BuildPlan = z.infer<typeof BuildPlanSchema>;
