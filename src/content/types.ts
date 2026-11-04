// Formats du contenu du jeu, décrits une seule fois avec Zod : le schéma sert à la fois
// de type TypeScript (z.infer) et de vérification des fichiers JSON (npm run check).
// Le contenu (cartes, tuiles, objets, dialogues) est de la donnée : on en ajoute sans toucher au moteur.

import { z } from 'zod';

const px = z.number();
const id = z.string().min(1);

export const FacingSchema = z.enum(['down', 'up', 'left', 'right']);

/** Détails posés au hasard sur un sol (touffes, paille...) : ils cassent la répétition des tuiles. */
const DecalSetSchema = z.strictObject({ images: z.array(id).min(1), chance: z.number().min(0).max(1) });

/** Propriétés d'une tuile du tileset (celles qui ne sont pas dans un terrain). */
const TileInfoSchema = z.strictObject({
  /** Bloque le passage. */
  solid: z.boolean().optional(),
  /** Nom d'un ensemble de `decals` du même jeu de tuiles. */
  decals: id.optional(),
});

/**
 * Famille de 16 tuiles `<terrain>-<masque>` (masque N=1 E=2 S=4 O=8 : un bit à 1 = le voisin est du même terrain).
 * Devient un ensemble de terrains Wang dans le tileset de Tiled.
 */
/** Le poste d'une transformation (transforms.json `station`) : par terre, le billot, l'établi, l'étang, la braie, le four. */
const StationSchema = z.enum(['ground', 'block', 'bench', 'pond', 'brake', 'kiln']);

const TerrainDefSchema = z.strictObject({
  /** Couleur du terrain dans Tiled (#rrggbb). */
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  solid: z.boolean().optional(),
  /**
   * L'eau profonde (chantier « relief ») : elle ne bloque pas par elle-même ; c'est le personnage qui n'y entre pas s'il ne nage pas
   * (`swim` de mobility.json, world/relief.ts). Rien ne s'y pose.
   */
  deep: z.boolean().optional(),
  /** Le poste que ce terrain offre à une transformation, Xéros tourné vers lui (l'eau : l'étang, où l'on puise ; GameMap.stationAt). */
  station: StationSchema.optional(),
});

/** Catalogue d'un jeu de tuiles : ce que `build-art` ajoute aux tuiles dessinées dans art/. */
export const TilesetCatalogSchema = z.strictObject({
  decals: z.record(id, DecalSetSchema).default({}),
  tiles: z.record(id, TileInfoSchema).default({}),
  terrains: z.record(id, TerrainDefSchema).default({}),
});

/** Rectangle en pixels, dans le repère de l'image (0,0 = coin haut gauche). */
const RectSchema = z.strictObject({ x: px, y: px, w: px.positive(), h: px.positive() });

/** Ce qui tombe d'un objet récolté : `min` à `max` exemplaires de l'objet possédable `item` (clé de items.json). */
const DropSchema = z.strictObject({
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
 * Avec `tool`, on travaille par F, l'outil en main ; sans, on récolte par E, une main libre.
 */
/**
 * La matière d'une récolte qui se travaille au coup (docs/CONCEPTION.md, « Le travail » ; world/workPlan.ts) : abattre un arbre
 * (`fell` : le diamètre du tronc, cm), ébrancher (`limbs` : le nombre de branches et leur diamètre, cm), tailler une pointe sur le
 * billot (`whittle` : le diamètre de la branche et la longueur de la pointe, cm), casser un rocher (`break` : le volume de pierre à
 * abattre, cm³). Absent : une récolte de `hits` coups simples.
 */
const HarvestWorkSchema = z.union([
  z.strictObject({ fell: z.strictObject({ diameter: z.number().positive() }) }),
  z.strictObject({ limbs: z.strictObject({ count: z.number().int().positive(), diameter: z.number().positive() }) }),
  z.strictObject({ whittle: z.strictObject({ diameter: z.number().positive(), length: z.number().positive() }) }),
  z.strictObject({ break: z.strictObject({ volume: z.number().positive() }) }),
]);

const HarvestSchema = z.strictObject({
  /** La matière, si la récolte se travaille au coup (voir HarvestWorkSchema). */
  work: HarvestWorkSchema.optional(),
  /**
   * Ce que la récolte retire sans le rendre (la matière se conserve, CLAUDE.md : ce qui part est nommé) : les copeaux de l'entaille d'un
   * abattage, les feuilles et ramilles d'un ébranchage. Le bilan de validate.ts (`harvestBalance`) refuse une récolte dont ce qui naît
   * pèse moins que l'objet sans `waste`, et toute récolte dont ce qui naît pèse plus.
   */
  waste: z.strictObject({ name: id, fate: id }).optional(),
  /**
   * Les étapes visibles du travail (docs/CONCEPTION.md, « Le travail », § 6) : la part de la matière enlevée (de 0 à 1, croissante) à
   * laquelle l'objet prend l'image `<son image>-stage-<n>` (n à partir de 1 ; pour chaque vue qu'il a : `<image de la vue>-stage-<n>`),
   * dessinée par le pixel-artist (art/world/work-stages.ts). L'arbre debout : l'entaille, le trait d'abattage, le craquement, il penche ;
   * l'arbre couché : le houppier qui s'allège.
   */
  stages: z.array(z.number().gt(0).lt(1)).optional(),
  /** Objet possédable nécessaire (clé de items.json, de type 'tool') ; absent = à la main. */
  tool: id.optional(),
  /** Une récolte sans matière (`work` absent) : son nombre de coups simples ; l'objet tremble à chaque coup. Avec `work`, inutilisé (la matière fait les coups). */
  hits: z.number().int().positive(),
  /**
   * Matière frappée : à chaque coup, des éclats de la planche `fx-<matière>` jaillissent du point d'impact. Toute matière qui a sa planche
   * (validate.ts) ; une nouvelle matière ne touche pas au schéma.
   */
  impact: id.optional(),
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
   * L'objet tombe du côté où Xéros frappe (l'entaille, `side` du travail en cours) ; frappé d'en haut ou d'en bas, d'un côté au hasard.
   * Un arbre (un objet qui a `tree`) n'écrit dans props.json que `image`, `anim` et `left.image` : `x`, `foot` et `left.x`, comme
   * son `at` et la place de ce qui naît (`spawns`), sont calculés par `npm run art` d'après sa géométrie et ses dessins
   * (src/generated/trees.json, `withTreeLayout` de src/content/treeLayout.ts).
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
   * comme objets nés, et forment une chaîne dans cet ordre. `wood` : les réglages d'une pièce de bois qui naît (le chicot abattu
   * laisse sa souche et le tronc qui restait debout, couché à son pied).
   */
  spawns: z.array(z.strictObject({ type: id, x: px, y: px, wood: z.lazy(() => WoodPieceSchema).optional() })).default([]),
});

/**
 * Masse d'un objet, en kilogrammes. Un nombre : masse saisie. `"wood"` : la pièce de bois, masse calculée par ses réglages
 * (volume × densité du bois vert de wood.json, `mass.ts`). `"stone"` : une pierre, la boîte de ses `dims` × la densité de la pierre.
 * `{ "pile": genre }` : la somme d'un tas plein de ce genre de `piles.json` plus son lien (le fagot : ses dix branches et son lien).
 * Un objet qu'on prend, pose ou roule en a une (validate.ts).
 */
const MassSchema = z.union([
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
const MatterMassSchema = z.strictObject({
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
const NaturalDefSchema = z.strictObject({ forms: z.union([z.literal(1), z.literal(2)]), vary: z.number().int().min(1).max(15) });

/** Ce que GameState garde d'un exemplaire naturel : sa forme (0 : `<image>`, 1 : `<image>-b`) et sa taille, en % de la taille type. */
export const NaturalSchema = z.strictObject({ form: z.union([z.literal(0), z.literal(1)]), size: z.number().int().min(85).max(115) });

/**
 * Les métiers (docs/CONCEPTION.md, « Les matières ») : tout s'achète au village, mais tout peut se faire. Chaque objet dit qui le
 * fait et le vendrait (`trade` de props.json, items.json, et des transformations de transforms.json) : le carrier (la pierre
 * tirée, le moellon), le maçon (la pierre de taille, le mortier), le terrassier (la terre, le torchis), le chaumier (la paille, le
 * chaume), le bûcheron (le bois abattu, les baguettes), le charpentier (la poutre, la cheville), le fendeur (le bois fendu, la
 * planche, le bardeau), le menuisier (le bois travaillé fin, le maillet), le forgeron (les outils de fer, l'enclume, l'étau), le couvreur (les pans de
 * bardeaux, de tuiles et de lauzes), le paysan (ce que tout
 * le monde fait : puiser, ramasser).
 */
/**
 * La famille d'un objet au catalogue du mode construction (src/build/catalog.ts), dans l'ordre du catalogue : déclarée par chaque
 * objet (`family` de props.json et d'items.json), jamais devinée à sa clé.
 */
export const FAMILIES = ['éléments', 'assemblages', 'bois', 'pierre', 'terre', 'fibres', 'outils', 'mobilier', 'chantier', 'nature', 'divers'] as const;
const FamilySchema = z.enum(FAMILIES);

const TradeSchema = z.enum(['quarryman', 'mason', 'digger', 'thatcher', 'woodcutter', 'carpenter', 'splitter', 'joiner', 'smith', 'roofer', 'peasant']);

/**
 * Ce qui roule quand Xéros le pousse (la pièce de bois ronde : `roll` de sa définition tirée de ses réglages, world/woodPiece.ts) :
 * `axis` de la pièce couchée (est-ouest : elle roule vers le nord ou le sud ; nord-sud : vers l'est ou l'ouest) ; `sheet` : la planche
 * de ses parties (son image s'assemble à sa longueur, 4 images = un tour). Son diamètre et sa masse viennent de ses réglages.
 */
const RollSchema = z.strictObject({ axis: z.enum(['ew', 'ns']), sheet: id });

/**
 * Ce qui pivote d'un quart de tour quand Xéros, mains vides, maintient R à son contact (la pièce de bois couchée) : `into`, l'objet
 * qu'elle devient, couché dans l'autre sens (est-ouest <-> nord-sud), centré au même endroit (la pièce de bois reste une pièce de
 * bois : seul son sens change). Le coût en endurance est
 * proportionnel à sa masse (`turnPerKg` de stamina.json).
 */
const TurnSchema = z.strictObject({ into: id });

/** Un bout d'une pièce couchée : l'ouest, l'est (est-ouest), le nord, le sud (nord-sud). */
const EndSchema = z.enum(['west', 'east', 'north', 'south']);

/**
 * Aspect d'une pièce de bois, ce que montre son dessin : ronde (`round`), ronde écorcée (`peeled`, le rondin de la cabane), demi
 * (`half`), quart (`quarter`), une à trois faces dressées à la doloire (`f1`, `f2`, `f3`), équarrie (`beam`, la poutre), planche
 * (`plank`), latte (`lath`, la demi-perche refendue). L'aspect se déduit des réglages (forme, écorcée, coups de doloire).
 */
const WoodLookSchema = z.enum(['round', 'peeled', 'half', 'quarter', 'f1', 'f2', 'f3', 'beam', 'plank', 'lath']);

/**
 * L'âge du bois travaillé (docs/CONCEPTION.md, « L'âge du bois ») : neuf (`new`, blond chaud), patiné (`worn`, brun doux), vieux
 * (`old`, gris argenté). Un réglage partagé par toutes les pièces de bois (la pièce de bois, `wood.age` ; un objet de bois de
 * props.json ou items.json marqué `aged`, `age` de la pièce posée), jamais une teinte propre à une pièce : une rampe par âge dans
 * art/palette.ts, la même pour toutes. Absent : neuf. Le vieillissement avec le temps viendra avec l'horloge.
 */
export const WoodAgeSchema = z.enum(['new', 'worn', 'old']);

/**
 * Une pièce de bois (la seule sorte d'objet de bois du monde, `wood-piece` de props.json), décrite par ses réglages et non par
 * une clé : `size`, son diamètre (clé de `sizes` de wood.json : celui de l'arbre d'où elle vient, `big` 55 cm, `normal` 30 cm) ;
 * `length` en cm ; `shape` : ronde, demi ou quart (le fendage) ; `hewn` : faces finies à la doloire, comptées `perFace` par face
 * (la poutre à 4 faces) ; `dressed` : la face suivante, dressée sur une partie de la longueur seulement (une passe arrêtée) ; `axis` : couchée est-ouest ou nord-sud, ou debout (`up` : un poteau, sur son dé) ; `notch` : la coupe commencée (`at` cm du bout ouest ou
 * nord, `hits` coups) ; `face` : le côté de la face debout d'un quartier ; `wedge` : le coin planté (`end`, le bout d'où il est planté et d'où se donnent les coups, `hits` coups de
 * masse reçus). GameState garde ces réglages pour chaque pièce posée ou tenue ; Tiled peut les donner en propriétés.
 */
/**
 * Forme d'une pièce de bois : ronde, demi (fendue en deux), quart (le quartier), planche (fendue au coutre dans un quartier ou une
 * demi-bille : `plank` de wood.json, son épaisseur et sa largeur), latte (la demi-perche refendue au coin : sa section dans wood.json,
 * `wide` × `thick`).
 */
const WoodShapeSchema = z.enum(['round', 'half', 'quarter', 'plank', 'lath']);

export const WoodPieceSchema = z.strictObject({
  size: id,
  length: z.number().int().positive(),
  shape: WoodShapeSchema,
  hewn: z.number().int().positive().optional(),
  /**
   * La face en cours (la suivante après les `hewn` finies), dressée depuis le bout `from` (`start` : ouest ou nord, `end` : est ou
   * sud, la partie de la planche, si bien que la pièce tournée la garde) sur `length` cm : une passe de doloire arrêtée par Échap,
   * qu'une nouvelle passe reprend là (docs/CONCEPTION.md, « Bois d'œuvre »). Toujours plus courte que la pièce : finie, la face
   * passe dans `hewn`.
   */
  dressed: z.strictObject({ from: z.enum(['start', 'end']), length: z.number().int().positive() }).optional(),
  axis: z.enum(['ew', 'ns', 'up']),
  notch: z.strictObject({ at: z.number().int().positive(), hits: z.number().int().positive() }).optional(),
  wedge: z.strictObject({ end: EndSchema, hits: z.number().int().nonnegative() }).optional(),
  /**
   * Le quartier seulement : `down`, pointe en bas (l'écorce en l'air), comme un sur deux dans une rangée de tas, où les quartiers
   * s'emboîtent en triangles. Absent : la position d'un quartier posé, écorce en bas, pointe (l'angle du cœur) en l'air.
   */
  point: z.literal('down').optional(),
  /** Ronde et écorcée (le rondin de la cabane) : l'aspect `peeled` de son diamètre ; sans effet sur une pièce fendue ou dressée. */
  peeled: z.literal(true).optional(),
  /** Son âge (WoodAgeSchema) : la teinte de son bois travaillé (faces, bois de bout) ; l'écorce garde son brun. Absent : neuve. */
  age: z.lazy(() => WoodAgeSchema).optional(),
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
  peeled: z.literal(true).optional(),
  age: z.lazy(() => WoodAgeSchema).optional(),
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
 * La section d'un aspect, vue par le bout (docs/CONCEPTION.md, « Les pièces fendues ») : toutes ses vues couchées se calculent
 * d'elle (art/world/wood-section.ts), étirée sur la longueur. `shape` : le rond (bille, rondin, perche ; avec `flats`, les faces
 * dressées à la doloire, jusqu'à la poutre), le demi-rond (demi-bille), le quart de rond (quartier), le rectangle (planche). `bark` :
 * où est l'écorce (`arc` : sur l'arc du rond qui reste ; `none`). `heart` : où est le cœur, centre des cernes du bout (`center` du
 * rond, au milieu de la `face` plate de la demi-bille, à la pointe, `apex`, du quartier ; `none`). `rests` : sur quoi la pièce
 * repose (`bark` : écorce en bas, la demi-bille face plate en l'air, le quartier pointe en l'air ; `face` : sur une face plane).
 * `flats` : les faces dressées, dans l'ordre de la doloire, nommées en est-ouest (le dessus, le sud, le nord, le dessous ; tournée
 * nord-sud, le sud passe à l'ouest). `faces` : la matière des faces planes (`split` fendue, `hewn` dressée). `wide`, `thick` : la
 * largeur et l'épaisseur de bois d'un rectangle (cm ; absentes : la planche, `plank` de wood.json).
 */
const WoodSectionSchema = z
  .strictObject({
    shape: z.enum(['round', 'half', 'quarter', 'rect']),
    bark: z.enum(['arc', 'none']),
    heart: z.enum(['center', 'face', 'apex', 'none']),
    rests: z.enum(['bark', 'face']),
    flats: z.array(z.enum(['top', 'south', 'north', 'bottom'])).optional(),
    faces: z.enum(['split', 'hewn']).optional(),
    wide: z.number().positive().optional(),
    thick: z.number().positive().optional(),
  })
  .refine((s) => s.shape === 'rect' || (s.wide === undefined && s.thick === undefined), { message: "'wide' et 'thick' pour un rectangle seulement" })
  .refine((s) => (s.wide === undefined) === (s.thick === undefined), { message: "'wide' et 'thick' ensemble" });
export type WoodSection = z.infer<typeof WoodSectionSchema>;

/**
 * Un aspect d'un diamètre : son nom et son genre (les messages), son icône 16×16 (`item-…`), sa planche portée (`held-…` :
 * vues `down` et `up` par le bout, ne dépendant pas de la longueur ; `right`, la pièce de 1 m de profil, que le jeu remplace par la
 * pièce assemblée à sa longueur), et la géométrie de ses parties (contrat entre le dessin et le jeu, `world/woodShape.ts`).
 */
const WoodLookDefSchema = z.strictObject({
  name: id,
  gender: z.enum(['m', 'f']),
  icon: id,
  held: id,
  /** Sa section, vue par le bout : toutes ses vues couchées en sont tirées. */
  section: WoodSectionSchema,
  ew: WoodEwSchema,
  ns: WoodNsSchema,
  /** Debout (poteau) : absent, cet aspect ne se dresse pas. */
  up: WoodUpSchema.optional(),
  /**
   * Couché, son dessus se marche (la planche du plancher : chantier « maison du coq », CONCEPTION « L'étage ») : posé, il porte
   * Xéros à sa hauteur, sans corps (world/decks.ts).
   */
  walk: z.literal(true).optional(),
});

/**
 * Fendre un aspect : ce qu'il devient (`into`, deux pièces), et le coin bas gauche de chacune par rapport à la pièce fendue, par sens ;
 * `waste` : ce que le travail retire, si les deux pièces pèsent moins que la pièce (la matière se conserve : ce qui part est nommé,
 * comme le déchet d'une transformation ; validate.ts le vérifie).
 */
const WoodSplitSchema = z.strictObject({
  into: z.enum(['half', 'quarter', 'lath']),
  ew: z.tuple([z.tuple([px, px]), z.tuple([px, px])]),
  ns: z.tuple([z.tuple([px, px]), z.tuple([px, px])]),
  waste: z.strictObject({ name: id, fate: id }).optional(),
});

/**
 * Un diamètre de bois (wood.json, `sizes`) : `diameter` du bois en cm (sans le contour), `sheet` la planche des parties (`<sheet>`
 * est-ouest, `<sheet>-ns` nord-sud), `tile` la longueur d'un milieu répété (px), `notch` la bande d'encoche de la coupe, `hew` :
 * présent, la doloire est refusée avec ce message (le gros bois ne fait pas de poutre) ; `split` : les aspects qui se fendent et ce
 * qu'ils deviennent (vide : ce diamètre ne se fend pas) ; `looks` : ses aspects dessinés. Un nouveau bois = un diamètre ou un aspect
 * ici, avec ses dessins, pas une nouvelle clé d'objet.
 */
const WoodSizeSchema = z.strictObject({
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
 * `perFace` le compte de `hewn` par face finie (3 : l'unité des anciens coups de doloire, que gardent les plans et les parties),
 * `faces` faces, `beam` le côté de la poutre (cm de bois), `stroke` les centimètres dont Xéros avance à chaque coup de sa passe le
 * long de la pièce (la durée d'une passe est proportionnelle à la longueur : un coup, le geste `chop`, tous les `stroke` cm) ; `split` : le coin, la masse, les coups de masse
 * par mètre commencé (`hits` : 3 pour 1 m, 6 pour 2 m ; un seul coin, planté dans le bout, quelle que soit la longueur) ; `sizes` : les diamètres.
 */
export const WoodSchema = z.strictObject({
  density: z.number().positive(),
  grid: z.number().int().positive(),
  min: z.number().int().positive(),
  /** La plus longue pièce de bois (cm : le tronc de l'arbre normal, 7 m) ; ?dieu n'en propose pas de plus longue. */
  max: z.number().int().positive(),
  /** La durée d'une coupe découle de ses coups (docs/CONCEPTION.md, « Le travail ») ; `hits` : ses étapes (l'encoche qui se creuse). */
  cut: z.strictObject({ tool: id, hits: z.number().int().positive() }),
  hew: z.strictObject({ tool: id, perFace: z.number().int().positive(), faces: z.literal(4), beam: z.number().positive() }),
  /** La planche fendue : son épaisseur et sa largeur de bois (cm), quel que soit le diamètre d'où elle vient. */
  plank: z.strictObject({ thick: z.number().positive(), wide: z.number().positive() }),
  split: z.strictObject({ wedge: id, maul: id, hits: z.number().int().positive() }),
  /** Les âges du bois travaillé et leur nom affiché (WoodAgeSchema : tous, dans l'ordre), pour le catalogue et les messages. */
  ages: z.strictObject({ new: id, worn: id, old: id }),
  sizes: z.record(id, WoodSizeSchema),
});

/** Nombre de mains que demande un objet qu'on prend : une, ou les deux (lourd ou long). */
const HandsSchema = z.union([z.literal(1), z.literal(2)]);

/**
 * Objet du monde qu'on prend dans les mains avec E (la bille) : il quitte la carte, et Xéros le porte devant lui
 * (voir `hold`). Reposé, il retrouve la carte à sa nouvelle place.
 */
const TakeSchema = z.strictObject({
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
const ViewsSchema = z.enum(['round', 'symmetric', 'four']);

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
  /** Sa famille au catalogue du mode construction (FAMILIES). */
  family: FamilySchema,
  /** Le métier qui le fait et le vendrait au village, voir TradeSchema. */
  trade: z.lazy(() => TradeSchema).optional(),
  /** Bois travaillé (le bardeau, la cheville) : il prend l'âge du bois, voir `aged` de PropDefSchema (ses images au sol). */
  aged: z.literal(true).optional(),
  /** Ses données d'arme (la branche, l'épée de bois) : le clic de sa main frappe avec (une ressource, contre ce qui encaisse un coup). Voir WeaponSchema. */
  weapon: z.lazy(() => WeaponSchema).optional(),
  /** Un outil au travail (docs/CONCEPTION.md, « Le travail ») : son inertie, son tranchant, ce que la précision y pèse. */
  work: z.lazy(() => ToolWorkSchema).optional(),
  /**
   * Les genres de travail que fait cet outil (sa capacité : une cible accepte tout outil qui fait son genre de travail, sans le nommer) :
   * les récoltes au coup (`fell` abattre, `limbs` ébrancher, `whittle` tailler sur le billot, `break` casser la pierre) et le bois
   * (`cut` couper, `hew` équarrir, `plant` planter le coin, `maul` frapper le coin). Une nouvelle hache qui fait `fell`, `limbs`,
   * `cut` abat tous les arbres et coupe tout le bois.
   */
  does: z.array(z.enum(['fell', 'limbs', 'whittle', 'break', 'cut', 'hew', 'plant', 'maul'])).optional(),
});

/**
 * Dimensions réelles d'un objet, en centimètres (gabarit, docs/STYLE.md section 8) : `w` largeur (est-ouest), `d`
 * profondeur (nord-sud), `h` hauteur ; `shape` : `box`, `cylinder` (avec `axis` : `ew` couché est-ouest, `ns` couché
 * nord-sud, `up` debout) ou `flat` (à plat sur le sol). validate.ts en tire la taille attendue de l'image.
 */
const DimsSchema = z
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

/** Une ombre portée au sol : [cx, cy, rx, ry] (px). */
const ShadeSchema = z.tuple([px, px, px.positive(), px.positive()]);
/** Une entaille : profondeur (colonnes depuis le bord de l'écorce) et ouverture (rangées au-dessus du plancher). */
const NotchSchema = z.strictObject({ depth: px.positive(), open: px.positive() });

/**
 * La géométrie d'un arbre debout qui s'abat (docs/CONCEPTION.md, « Abattre un arbre ») : tout ce que ses dessins ne disent pas.
 * Son dessin (l'arbre debout, sa souche, son arbre couché tiré de son houppier couché) est enregistré par sa clé d'image
 * (`registerTree`, art/world/tree-registry.ts) ; ses étapes d'abattage, ses deux chutes, son arbre couché et ses étapes
 * d'ébranchage en sont tirés par art/world/trees.ts, et les décalages de son `harvest` (`fall.x`, `fall.foot`, `fall.left.x`,
 * `at`, la place de ce qui naît, `at` de l'arbre couché) sont calculés par `npm run art` (src/generated/trees.json).
 * Repère : l'image de l'arbre debout, en pixels, x vers la droite, y vers le bas.
 */
export const TreeSchema = z.strictObject({
  /**
   * L'image d'un arbre dessiné dont celui-ci reprend le dessin (enregistré par `registerTree`) : une variante qui ne change que ses
   * données, l'arbre d'essai des contrats. Absent : son image. Ses dessins tirés (étapes, chutes, arbre couché, ébranchage, son image
   * debout) portent sa propre clé d'image.
   */
  art: z.string().min(1).optional(),
  /** Pied du tronc (centre du bas). */
  foot: z.tuple([px, px]),
  /** Ombre portée de l'arbre debout (celle de son image). */
  shadow: ShadeSchema,
  /** Rangée de la coupe de la chute : tout ce qui est au-dessus tombe. */
  cut: px,
  /** Rangée du plancher de l'entaille, juste sous la coupe ; la charnière de la chute y est. */
  floor: px,
  /** L'entaille à 1/3, 2/3, 3/3 : profondeur (colonnes depuis le bord de l'écorce) et ouverture (rangées au-dessus du plancher). */
  notch: z.tuple([NotchSchema, NotchSchema, NotchSchema]),
  /** Longueur de la saignée du trait d'abattage, puis au craquement. */
  back: z.tuple([px.positive(), px.positive()]),
  /** Fente du craquement : [dx depuis le bord du trait, dy depuis le plancher]. */
  crack: z.array(z.tuple([px, px])),
  /** Angles de la penche aux étapes 6 et 7 (degrés). */
  lean: z.tuple([z.number().positive(), z.number().positive()]),
  /** Ombre du haut qui penche : [dx depuis le pied, rx]. */
  leanShadow: z.tuple([px, px.positive()]),
  /** Copeaux : écart au pied du premier, nombre côté entaille puis côté trait à chaque étape (0 à 7). */
  chips: z.strictObject({ gap: px, right: z.array(z.number().int().nonnegative()).length(8), left: z.array(z.number().int().nonnegative()).length(8) }),
  /** Éclats du craquement : [dx depuis le bord du trait, dy depuis le plancher, couleur de la palette]. */
  splinters: z.array(z.tuple([px, px, z.string().length(1)])),
  /**
   * La chute (art/world/tree-fall.ts), commune à toutes les sortes : le haut de l'arbre pivote autour de la charnière, de 10° puis
   * 45°, et passe de la vue de face (debout) à la vue de dessus (couché) : le houppier se raccourcit le long du tronc, de ses
   * rangées debout (`crownRows`, sinon celles de son dessin) à sa longueur couchée (`crown`, px), et s'aplatit en travers
   * jusqu'à `squash` ; le tronc garde sa demi-largeur `half`.
   */
  fall: z.strictObject({
    /**
     * Ce qui tombe : `body`, le dessin debout tel quel ; `bark`, le houppier rééchantillonné et le tronc nu redessiné dans son
     * écorce (`bareTrunk` de son dessin), allongé de `ext` px couché.
     */
    source: z.enum(['body', 'bark']),
    ext: px.nonnegative().default(0),
    crown: px.positive(),
    crownRows: px.positive().optional(),
    squash: z.number().gt(0).lte(1),
    half: z.number().positive(),
    /** Le bout scié du tronc qui tombe : décalage en travers (px), ouverture selon l'angle, cernes. */
    face: z.strictObject({ dx: z.number(), slant: z.number().positive(), rings: z.boolean() }),
    /**
     * Ombres portées à 10° et 45°, de chaque côté : [dx, dy depuis le pied, rx, ry] ; la première sous la souche, la seconde sous le
     * haut de l'arbre (à 10°, le raccord depuis la dernière étape y mène).
     */
    shadows: z.strictObject({
      right: z.strictObject({ '10': z.array(ShadeSchema).min(2), '45': z.array(ShadeSchema).min(2) }),
      left: z.strictObject({ '10': z.array(ShadeSchema).min(2), '45': z.array(ShadeSchema).min(2) }),
    }),
    /** Largeur des images de la chute, si elles sont recadrées dans le cadre de l'arbre couché (le têtard, court). */
    crop: px.positive().optional(),
  }),
});

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
  /**
   * Un corps mou (le buisson) : il barre le passage à Xéros, mais une bête lancée le traverse en le secouant (docs/CONCEPTION.md,
   * « Les créatures » : la charge) ; tout autre corps l'arrête.
   */
  soft: z.literal(true).optional(),
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
  /**
   * Un élément à couches (le remplissage d'une travée, le pan de chaume ; CONCEPTION « La maison de Xéros ») : `layers`, ses couches de
   * dessous jusqu'à lui (les palançons, le clayonnage, le torchis, la chaux : elles sont dans les données, la dernière se voit) ;
   * `over`, la pièce qu'il recouvre : posé sur elle en mode construction, à la même place et dans le même sens, il la remplace.
   */
  layers: z.array(id).min(1).optional(),
  over: id.optional(),
  /**
   * Un rai de soleil (la tache de lumière d'une fenêtre ou d'une porte) : son éclat suit la force du soleil de l'heure (world.json
   * `daylight`, systems/daylight.ts) ; les intérieurs en posent un à chaque ouverture (world/interiorView.ts).
   */
  sun: z.literal(true).optional(),
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
  /** Un arbre debout qui s'abat (il a `harvest.fall`) : sa géométrie, voir TreeSchema. */
  tree: z.lazy(() => TreeSchema).optional(),
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
  /** Sa famille au catalogue du mode construction (FAMILIES). */
  family: FamilySchema,
  /** Le métier qui le fait et le vendrait au village, voir TradeSchema. */
  trade: z.lazy(() => TradeSchema).optional(),
  /**
   * Bois travaillé (porte, volet, pignon, bardage, pan de toit, étal…) : il prend l'âge du bois (WoodAgeSchema). Chacune de ses
   * images (vues, tirages, formes) a ses trois âges : `<image>` neuf, `<image>-worn` patiné, `<image>-old` vieux, tirées au build de
   * la même grille par la rampe de l'âge (art/world/wood.ts, `WOOD_AGES`) ; validate.ts le vérifie, et refuse un objet de bois
   * qui ne le serait pas.
   */
  aged: z.literal(true).optional(),
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
   * Pièce de la voûte d'un chemin creux (le rideau, les avancées de feuillage ; CONCEPTION « Le relief ») : quand Xéros est sous la
   * voûte, elle s'efface autour de lui avec le bord sud (`systems/laneFade.ts`, RELIEF.lane), quelle que soit sa hauteur.
   */
  vault: z.literal(true).optional(),
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
  /**
   * Son dessus se marche (la dalle de sol, la marche de pierre : chantier « maison du coq », CONCEPTION « L'étage ») : posé, il
   * porte Xéros à la hauteur de son dessus (world/decks.ts : le plus haut dessus qu'il atteint d'un pas). Il n'a pas de corps : on le
   * franchit par la règle du pas (`step`, `drop` de mobility.json), jamais en s'y heurtant (validate.ts).
   */
  walk: z.literal(true).optional(),
  /**
   * Pan de toit (le pan de toit en planches) : le côté de sa rive basse dans la vue 0 (`south`) ; un quart de tour de plus à chaque
   * vue (ouest, nord, est). En mode construction, il se pose sur ce qui porte sa rive basse et ne se heurte pas à ce qui est sous sa
   * pente.
   */
  pitch: z.literal('south').optional(),
  /**
   * Pièce qui franchit un vide, portée par ses deux bouts comme une poutre (la tête de baie : son linteau sur les deux huisseries) :
   * le contrôle du porte-à-faux (world/overhang.ts) demande un appui à chaque bout, pas sur toute sa longueur.
   */
  spans: z.literal(true).optional(),
  /**
   * Ce qu'une pièce déborde de ce qui la porte, à chacun de ses bouts (cm) : le larmier du couronnement de la cheminée, plus large que
   * son conduit. Le contrôle du porte-à-faux (world/overhang.ts) le permet aux bouts, jamais au milieu.
   */
  ledge: z.number().int().positive().optional(),
  /**
   * Ce qui s'ouvre et se ferme en jeu (E, une pièce posée en mode construction) : `into`, l'objet qu'il devient (son autre état, qui
   * nomme celui-ci en retour) ; `hinge`, où il tourne : `side`, le bord gauche de sa face du dehors vu du dehors (un volet, une
   * porte : ouvert, il a tourné d'un quart vers le dehors, dans le sens des aiguilles d'une montre), `bottom`, le bas de sa face du
   * dehors (le volet d'étal, rabattu en comptoir : l'objet ouvert est contre sa face du dehors, son dessus à la hauteur de sa base) ;
   * `double`, deux battants sur des gonds aux deux bords de l'ouverture (la porte charretière : ouverte, chaque battant a tourné d'un
   * quart vers le dehors, l'objet ouvert est la boîte des deux battants, de la largeur du fermé, contre sa face du dehors) ;
   * `open` : cet état est l'ouvert ; `passage` : on passe par là quand il est ouvert (une porte : chantier « intérieurs », entrer dans
   * un bâtiment). La face du dehors est au sud dans la vue 0 (`world/build.ts`, `swung`).
   */
  swing: z
    .strictObject({ into: z.string(), hinge: z.enum(['side', 'bottom', 'double']), open: z.literal(true).optional(), passage: z.literal(true).optional() })
    .optional(),
  /** Ce qu'on frappe avec une arme (le mannequin) : voir TargetSchema. */
  target: z.lazy(() => TargetSchema).optional(),
  /**
   * Une entrée de terrier (l'entrée de garenne) : une créature y entre et en sort (CONCEPTION « Les créatures ») ; les entrées posées
   * dans le rectangle d'une garenne (`Warren` de Tiled) sont les siennes.
   */
  burrow: z.literal(true).optional(),
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
const AcceptSchema = z
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
const PlanPlaceSchema = z.strictObject({
  piece: id,
  at: z.tuple([px, px]),
  orientation: z.enum(['flat', 'upright', 'ew', 'ns', 'slope']),
  on: z.array(id).default([]),
  corner: CornerSchema.optional(),
  accepts: AcceptSchema.optional(),
});

/** Une étape d'un plan : son nom (« les dés »), ses places, et `soon` : déclarée mais pas encore jouable (« à venir »). */
const PlanStepSchema = z.strictObject({
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
const BuildRefSchema = z.union([
  /**
   * Un objet de props.json ; `length` : la longueur d'un morceau de mur (`wall`, le solin), en cm, sur la grille de `piece` de
   * walls.json (10 cm, au moins 40) ; absente : sa longueur de `dims`.
   */
  z.strictObject({ prop: id, length: z.number().int().positive().optional() }),
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
  /** L'âge d'un objet de bois (`aged` de props.json ou items.json) ; la pièce de bois garde le sien dans `wood.age`. Absent : neuf. */
  age: z.lazy(() => WoodAgeSchema).optional(),
});

/**
 * Un assemblage de charpente posé en mode construction (docs/CONCEPTION.md, « Les assemblages ») : `scarf`, l'enture en trait de
 * Jupiter (deux pièces de bois de même section et de même état, bout à bout sur le même axe) ; `mortise`, le tenon et mortaise (un
 * poteau debout sous une pièce couchée, ou posé sur une sablière basse) ; `halving`, le mi-bois (deux pièces couchées de même section qui
 * se croisent à angle droit, à la même hauteur, chacune entaillée de la moitié de son épaisseur : l'angle de deux sablières basses, ou
 * une croix) ; `notch`, l'encoche (deux rondins ronds qui se croisent à angle droit aux angles d'une cabane : celui du dessus, entaillé
 * en creux arrondi par-dessous, s'enfonce de la moitié de son diamètre dans celui du dessous). Bois sur bois, chevillé.
 */
export const JointTypeSchema = z.enum(['scarf', 'mortise', 'halving', 'notch']);

/** Un assemblage d'un plan du bac à sable : son type et ses deux pièces, par leur rang dans `pieces` du plan. */
const PlanJointSchema = z.strictObject({ type: JointTypeSchema, a: z.number().int().nonnegative(), b: z.number().int().nonnegative(), top: z.number().int().nonnegative().optional() });

/**
 * Un plan du bac à sable (`src/content/plans/<nom>.json`, écrit par « Enregistrer comme plan » du mode construction) : son nom
 * affiché, son emprise (`size`, en cm) et ses pièces, placées depuis son coin nord-ouest. Il se pose d'un coup, comme une pièce.
 * À ne pas confondre avec les plans de chantier guidé de plans.json.
 */
export const BuildPlanSchema = z.strictObject({
  name: id,
  size: z.strictObject({ w: z.number().positive(), d: z.number().positive() }),
  pieces: z.array(BuildPlacedSchema).min(1),
  /** Ses assemblages, entre ses pièces. */
  joints: z.array(PlanJointSchema).optional(),
  /**
   * L'âge de toutes ses pièces de bois (pièces de bois et objets `aged`), qui l'emporte sur le leur à la pose : un bâtiment d'un
   * seul âge. Absent : chaque pièce garde le sien.
   */
  age: z.lazy(() => WoodAgeSchema).optional(),
});

/**
 * Une place d'un tas (piles.json) : la pièce qui s'y pose est dessinée pour elle (`image`). Coordonnées dans le repère
 * du tas, dont le point (0, 0) est au sol.
 */
const PilePlaceSchema = z.strictObject({
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
const PoseSchema = z.strictObject({
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
   * Où tombe le fer à l'impact, en x par rapport aux pieds (la gauche en miroir de la droite) : c'est ce point que Xéros aligne sur
   * l'encoche visée (world/workStance.ts, `strikeOffset`). Vers le haut et le bas (`down`, `up`, px) : à côté de la main, quel que soit
   * l'outil ; de côté, la main de l'image d'impact plus la portée de l'outil (de la main au tranchant : `length` − `grip` d'items.json)
   * × `reach`, la part de l'outil vue en long à l'impact (1 : couché à l'horizontale ; moins : il fuit en raccourci, levé ou en biais).
   * Absent : la main de l'image d'impact, plus toute la portée de côté.
   */
  strike: z.strictObject({ down: px, up: px, reach: z.number().min(0).max(1) }).optional(),
  poses: z.strictObject({ down: z.array(PoseSchema), up: z.array(PoseSchema), right: z.array(PoseSchema) }),
  /**
   * Le temps de chaque image d'un geste de travail (docs/CONCEPTION.md, « Le travail ») : `arm` (armer), `hold` (le temps en haut),
   * `down` (abattre), `impact`, `free` (dégager) ; les durées des images en découlent (world/swing.ts : la durée de chaque temps,
   * partagée entre ses images). Absent : les durées de l'animation dessinée.
   */
  phases: z.array(z.enum(['arm', 'hold', 'down', 'impact', 'free'])).optional(),
});

/** Point d'accroche d'un objet tenu, pour une image : (dx, dy) depuis les pieds. `behind` : derrière le corps à cette image. */
const HoldPointSchema = z.strictObject({ dx: px, dy: px, behind: z.boolean().default(false) });

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

const StanceSchema = z.enum(['hand', 'shoulder', 'carry']);

/**
 * Comment un objet tenu se voit sur Xéros : sa posture (voir HoldPosesSchema) et sa planche `held-<…>` (animations `down`,
 * `up`, `right` d'une image, le point d'accroche au centre ; la gauche = la droite retournée). Sans planche : son icône,
 * à la main. Absent d'un objet possédable : `hand` avec son icône (à deux mains : `carry`).
 */
const HoldSchema = z.strictObject({ stance: StanceSchema, image: id.optional() });

/**
 * La force de Xéros (strength.json), en kg : `carry` ce qu'il porte au plus (les deux mains ensemble), `walk` jusqu'où il
 * marche normalement (au-delà : pas de course, et une marche qui ralentit), `roll` ce qu'il fait rouler au plus ;
 * `slowest` : sa vitesse de marche, en part de la normale, quand il porte `carry`. Plus tard la force progressera :
 * seuls ces chiffres changeront.
 */
/**
 * La force d'un coup (docs/CONCEPTION.md, « Le travail ») : le couple du corps sur le manche (`torque`, N·m), la vitesse angulaire au
 * plus du bras (`omegaMax`, rad/s : un outil léger ne prend pas plus d'énergie que ce que le bras lui donne), l'adresse (`skill`, de 0
 * à 1, multiplie la précision de l'outil). `max` : l'endurance d'un être de référence (work.json, `references`).
 */
const SwingerSchema = z.strictObject({
  torque: z.number().positive(),
  omegaMax: z.number().positive(),
  skill: z.number().gt(0).lte(1),
  max: z.number().positive().optional(),
});

/**
 * Un outil au travail (items.json, `work`), comme une arme pour l'inertie (world/strike.ts) : `length` cm du bout du manche au tranchant,
 * `grip` cm de la main au bout, `balance` (l'équilibre : la masse qui frappe = ⅔ × balance × masse) ; `edge`, le tranchant (1 : une lame
 * affûtée ; la masse qui enfonce un coin, moins) ; `aim`, ce que la précision pèse dans ce qu'enlève un coup (0 : la force seule ; 1 :
 * la précision seule) ; `strokes`, son coup propre pour un genre de travail.
 */
const ToolWorkSchema = z
  .strictObject({
    length: z.number().positive(),
    grip: z.number().nonnegative(),
    balance: z.number().positive(),
    edge: z.number().gt(0).lte(1),
    aim: z.number().min(0).max(1),
    /** Sa planche en main (le geste du travail), tirée par art/items/held.ts ; absente : `tool-<clé>`. Un outil peut reprendre celle d'un autre. */
    image: id.optional(),
    /** Le coup de cet outil pour un genre de travail (clé de `jobs` de work.json → clé de `strokes`), à la place du coup commun : la hachette taille au coup court. */
    strokes: z.record(id, id).optional(),
  })
  .refine((t) => t.grip < t.length, { message: "'grip' doit être en deçà de 'length' : la main tient l'outil" });

/**
 * Un coup de travail (work.json, `strokes`) : le geste du corps qui le joue (`gesture`, clé de gestures.json), l'angle de la frappe sur
 * lequel le couple travaille (`angle`, rad), et ses temps hors frappe en secondes (`arm` armer, `hold` le temps en haut, `impact`,
 * `free` dégager) : `arm`, `hold`, `free` s'allongent de `armK`, `holdK`, `freeK` × 0,1 s par kg·m² d'inertie, à 50 N·m (une cognée se
 * lève lourdement ; un homme fort la lève plus vite).
 */
const WorkStrokeSchema = z.strictObject({
  gesture: id,
  angle: z.number().positive(),
  arm: z.number().nonnegative(),
  armK: z.number().nonnegative(),
  hold: z.number().nonnegative(),
  holdK: z.number().nonnegative(),
  impact: z.number().nonnegative(),
  free: z.number().nonnegative(),
  freeK: z.number().nonnegative(),
});

/**
 * Le travail (work.json ; docs/CONCEPTION.md, « Le travail ») : les coups (`strokes` : `use` de côté, `chop` de haut en bas, `maul` la
 * masse, `hew` le coup court de la doloire, `whittle` la hachette sur le billot) ; la résistance de la matière (`matter` : J pour enlever
 * 1 cm³ en travers du fil, `cut`, ou le long d'une face marquée, `hew` ; J pour ouvrir 1 m² de fente au coin, `split` ; J pour casser
 * 1 cm³ de calcaire à la pioche, `stone`) ; des êtres de
 * référence (`references` : l'adulte, le bûcheron fort) ; les points de calage (`calibration` : une durée qu'un travail doit tenir pour
 * un être donné, vérifiée par validate.ts à `tolerance` près).
 */
export const WorkSchema = z.strictObject({
  strokes: z.record(id, WorkStrokeSchema),
  /** Le coup commun de chaque genre de récolte travaillée (`harvest.work` de props.json : abattre, ébrancher, tailler, casser la pierre). */
  jobs: z.strictObject({ fell: id, limbs: id, whittle: id, break: id }),
  matter: z.strictObject({ cut: z.number().positive(), hew: z.number().positive(), split: z.number().positive(), stone: z.number().positive() }),
  references: z.record(id, SwingerSchema.required({ max: true })),
  calibration: z.array(
    z.strictObject({
      name: z.string().min(1),
      /** `xeros` : la force de strength.json ; sinon une clé de `references`. */
      who: id,
      tool: id,
      /** La matière : abattre un arbre (`fell` : la clé de props.json), ou équarrir une poutre (`hew` : diamètre, longueur en cm). */
      job: z.union([z.strictObject({ fell: id }), z.strictObject({ hew: z.strictObject({ size: id, length: z.number().positive() }) })]),
      minutes: z.number().positive(),
    }),
  ),
  tolerance: z.number().gt(0).lt(1),
});

export const StrengthSchema = z
  .strictObject({
    /**
     * La force d'un coup de travail (docs/CONCEPTION.md, « Le travail ») ; ?dieu « force » multiplie le couple, jusqu'au plafond d'un
     * humain (`humanMax`, N·m : un homme très fort ; la force surhumaine viendra avec les superpouvoirs).
     */
    swing: SwingerSchema.extend({ humanMax: z.number().positive() }),
    carry: z.number().positive(),
    walk: z.number().positive(),
    roll: z.number().positive(),
    slowest: z.number().gt(0).lte(1),
    /** La masse de Xéros, en kg (son corps : ce qu'emporte une charge, docs/CONCEPTION.md « La vie de Xéros »). */
    mass: z.number().positive(),
  })
  .refine((s) => s.walk < s.carry, { message: "'walk' doit être au-dessous de 'carry'" });

/**
 * Le temps (time.json, docs/CONCEPTION.md « Le temps ») : `speeds`, les paliers de la vitesse du temps que choisit le joueur (à x1,
 * une journée dure 24 h réelles ; une minute réelle fait `speed` minutes de jeu) ; `default`, le palier de départ, celui où ramène une
 * attaque ; `dieuSpeed`, le palier de plus que propose ?dieu (x50) ; `wakeHour`, l'heure du lever ; `saveEveryMinutes`, tous les combien de minutes de jeu l'horloge seule fait écrire la
 * sauvegarde (elle avance à chaque image : sans ce pas, la partie s'écrirait sans cesse).
 */
export const TimeSchema = z
  .strictObject({
    /**
     * La vitesse du temps du joueur (V seul, en boucle sur les paliers de `speeds`, depuis `default` ; la plaquette du cadran en
     * montre au plus cinq, validate.ts) : c'est la vitesse de simulation, elle
     * accélère tout le jeu, marche comprise (docs/CONCEPTION.md, « Le temps ») ; `false` : V ne fait rien. Le combat ramène à x1 ; x50
     * reste réservé à ?dieu.
     */
    accelerate: z.boolean(),
    speeds: z.array(z.number().positive()).min(1),
    default: z.number().positive(),
    dieuSpeed: z.number().positive(),
    wakeHour: z.number().min(0).max(23),
    saveEveryMinutes: z.number().positive(),
  })
  .refine((t) => t.speeds.includes(t.default), { message: "'default' doit être l'un des paliers de 'speeds'" });

/**
 * L'endurance de Xéros (stamina.json ; docs/CONCEPTION.md, « Le temps ») : le maximum (`max`), le souffle (`breath`), la fatigue (sous
 * la part `tired` du maximum, il ne court plus et marche à la part `tiredWalk`), le travail au joule (`work`), le sommeil (`sleep`) et le
 * prix des gestes sans matière (`costs`).
 */
/**
 * La vie de Xéros (health.json, docs/CONCEPTION.md « La vie de Xéros ») : `max` points ; la nuit en rend la part `sleepHeal` du maximum ;
 * à zéro, il s'évanouit et se réveille au cagibi le lendemain matin, la mère l'a trouvé (`faint.dialogue`, sa ligne). Renversé par une
 * charge, il glisse au sol, freiné par `knockdown.friction` (le frottement de son corps sur la terre : la longueur de la glissade en découle).
 */
export const HealthSchema = z.strictObject({
  max: z.number().positive(),
  sleepHeal: z.number().min(0).max(1),
  faint: z.strictObject({ dialogue: id }),
  knockdown: z.strictObject({ friction: z.number().positive() }),
});

export const StaminaSchema = z.strictObject({
  /**
   * Le maximum (docs/CONCEPTION.md, « Le temps ») : `start` au départ, au plus `cap` ; chaque nuit, si la journée a entamé le plafond
   * d'au moins `trainFrom` du maximum, il monte de `gain` × (1 − maximum / cap).
   */
  max: z.strictObject({ start: z.number().positive(), cap: z.number().positive(), gain: z.number().nonnegative(), trainFrom: z.number().gt(0).lte(1) }),
  /**
   * Le souffle : chaque effort lui coûte `perCost` fois son prix (le plafond, son prix) ; les efforts continus, `perSec` par seconde
   * jouée (`run` courir, `carryPerKg` porter au-delà de la marche normale, `pushPerKg` pousser une bille) ; il revient vers le plafond de
   * `regenPerSec` par seconde, `regenDelayMs` après le dernier effort ; essoufflé (un effort qui attend), Xéros souffle jusqu'à ce qu'il
   * soit revenu à `recovered` du plafond. `climbPerKgM` : monter chargé (l'escalier d'un étage : chantier « maison du coq »), par kilo
   * porté et par mètre de montée ; à vide, rien (on ne compte nulle part l'effort de porter son corps).
   */
  breath: z.strictObject({
    regenPerSec: z.number().positive(),
    regenDelayMs: z.number().nonnegative(),
    perCost: z.number().nonnegative(),
    perSec: z.strictObject({ run: z.number().nonnegative(), carryPerKg: z.number().nonnegative(), pushPerKg: z.number().nonnegative() }),
    climbPerKgM: z.number().nonnegative(),
    recovered: z.number().gt(0).lte(1),
  }),
  tired: z.number().gt(0).lt(1),
  tiredWalk: z.number().gt(0).lte(1),
  /**
   * Le travail au coup (docs/CONCEPTION.md, « Le travail ») : chaque coup coûte au plafond `ceilingPerJ` et au souffle `breathPerJ` par
   * joule frappé ; pendant un travail le souffle ne revient pas ; vide, Xéros s'arrête et souffle jusqu'à `resume` de son plafond.
   */
  work: z.strictObject({ ceilingPerJ: z.number().nonnegative(), breathPerJ: z.number().nonnegative(), resume: z.number().gt(0).lte(1) }),
  /**
   * Le sommeil (world/sleep.ts) : `hours` de sommeil pour une nuit pleine (le lever à `wakeHour` de time.json, ou au bout de ces heures) ;
   * au réveil, le plafond perd `exhaustedPenalty` × ce qui manquait sous le seuil `tired` au coucher, et `missingHourPenalty` par heure
   * de sommeil manquante ; éveillé la nuit (de `nightFrom` h au lever), il perd `nightAwakePerHour` par heure de jeu.
   */
  sleep: z.strictObject({
    hours: z.number().positive(),
    exhaustedPenalty: z.number().nonnegative(),
    missingHourPenalty: z.number().nonnegative(),
    nightFrom: z.number().min(0).lt(24),
    nightAwakePerHour: z.number().nonnegative(),
  }),
  /**
   * Le prix des gestes sans matière, en points (les « PerSec » chaque seconde de l'effort, les « PerKg » par kg ; marcher ne coûte
   * rien) : tout ce qui se travaille au coup se paie au joule (`work` ci-dessus : abattre, couper, fendre, équarrir, tailler, casser la
   * pierre, une attaque). `chop` un coup simple d'outil sur une récolte sans matière (`hits`), `cutTie` un coup sur le lien du billot,
   * `whittle` le même à la hachette (`also` du rouleau), `plant` planter le coin de fendage, `stake` planter un piquet de tracé, `knot`
   * nouer ou dénouer, `turnPerKg` pivoter une bille, `raisePerKg` dresser une poutre sur son appui (avec l'aide de la mère, la part
   * `raiseHelped`), `carryPerKgSec` marcher en portant (au-delà de `walk` de strength.json), `pushPerKgSec` pousser une bille,
   * `runPerSec` courir.
   */
  costs: z.strictObject({
    chop: z.number().nonnegative(),
    cutTie: z.number().nonnegative(),
    plant: z.number().nonnegative(),
    stake: z.number().nonnegative(),
    whittle: z.number().nonnegative(),
    knot: z.number().nonnegative(),
    turnPerKg: z.number().nonnegative(),
    raisePerKg: z.number().nonnegative(),
    raiseHelped: z.number().min(0).max(1),
    carryPerKgSec: z.number().nonnegative(),
    pushPerKgSec: z.number().nonnegative(),
    runPerSec: z.number().nonnegative(),
  }),
});

/**
 * Une arme (`weapon` d'un objet de items.json ; docs/CONCEPTION.md, « Le combat ») : des données et un dessin. `length` : sa longueur
 * en cm, du bout tenu à la pointe ; `grip` : où la main la tient, en cm depuis le bout tenu (la main est au centre de chaque image de
 * sa planche) ; `family` : sa famille de gestes (clé de `families` de combat.json) ; `image` : sa planche `weapon-<…>`, un seul dessin
 * en huit angles (animation `angles`, art/lib/weapon.ts) ; `balance` : où est son centre de masse, en part de sa longueur devant la
 * main (0 : dans la main, 0,5 : au milieu comme un bâton uniforme, 1 : à la pointe) : plus il est loin, plus l'arme est lente et
 * maladroite (la branche, un gourdin : 0,6) ; près de la garde, elle se contrôle (l'épée : 0,25) ; `efficiency` : la part de
 * l'énergie du coup qui fait des dégâts (1 : un fil qui la concentre ; la branche, ses rameaux qui amortissent : 0,4). Sa masse et
 * ses mains sont celles de l'objet. La portée, la durée, la précision, les dégâts et le prix d'un coup s'en calculent
 * (world/strike.ts).
 */
const weaponFields = {
  length: z.number().positive(),
  grip: z.number().nonnegative(),
  balance: z.number().gt(0).lte(1),
  efficiency: z.number().gt(0).lte(1),
  family: id,
  image: id.optional(),
  /** La main nue : sa « lame » est le bras, de l'épaule au poing (`length` : sa longueur), et rien ne se dessine dans la main. */
  fist: z.literal(true).optional(),
};
const gripInside = { message: "'grip' doit être en deçà de 'length' : la main tient l'arme" };
const WeaponSchema = z.strictObject(weaponFields).refine((w) => w.grip < w.length, gripInside);

/**
 * Ce qu'on frappe (`target` d'un objet de props.json) : `hp`, ses points de vie (`infinite` : il encaisse sans jamais casser, le
 * mannequin ; un nombre viendra avec les premières cibles qui meurent, validate.ts le refuse en attendant) ; `matter`, ce qui vole
 * sous le coup (planche `fx-<matter>`) ; `tilt`, de combien de degrés il penche sous un coup (0 : il ne penche pas).
 */
const TargetSchema = z.strictObject({
  hp: z.union([z.literal('infinite'), z.number().positive()]),
  matter: id,
  tilt: z.number().min(0).max(30).default(0),
  /**
   * La peau : les joules qu'elle encaisse à chaque choc sans dégât (docs/CONCEPTION.md « Le combat ») ; un tranchant la coupe d'autant
   * (`edge` de l'outil, de 0 à 1 : `strike.ts` `throughHide`). 0 : rien n'est encaissé. La règle vaut pour toute cible.
   */
  hide: z.number().nonnegative().default(0),
});

/** Un intervalle [min, max] : une valeur est tirée au hasard entre les deux (min ≤ max). */
const SpanSchema = z.tuple([z.number().nonnegative(), z.number().nonnegative()]).refine(([a, b]) => a <= b, { message: 'un intervalle [min, max] : min ≤ max' });

/**
 * Ce qu'une créature perçoit de Xéros à une allure (`senses` d'une créature), en mètres : en deçà d'`alert`, elle passe aux aguets ; en
 * deçà de `near`, elle réagit (sa `reaction` : le lapin fuit, le sanglier charge). Plus Xéros est lent et silencieux, plus il approche.
 */
const GaitSensesSchema = z
  .strictObject({ alert: z.number().positive(), near: z.number().nonnegative() })
  .refine((s) => s.near < s.alert, { message: "'near' doit être en deçà d'alert" });

/**
 * La charge (`charge` d'une créature qui charge, CONCEPTION « Les créatures ») : `tell`, l'annonce avant de partir (s : tête basse, elle
 * gratte le sol) ; la ligne visée à la fin de l'annonce, jamais corrigée ; elle accélère de `accel` m/s² jusqu'à `speed` m/s, court
 * jusqu'à l'endroit où était Xéros plus `past` m (au plus `max` m), puis freine de `brake` m/s² ; elle souffle `breath` s avant de
 * pouvoir recharger. `tusk` : la part du choc contre Xéros qui le blesse (l'efficacité des défenses : le reste le renverse).
 */
const ChargeSchema = z.strictObject({
  tell: z.number().positive(),
  accel: z.number().positive(),
  speed: z.number().positive(),
  past: z.number().nonnegative(),
  max: z.number().positive(),
  brake: z.number().positive(),
  breath: z.number().nonnegative(),
  tusk: z.number().min(0).max(1),
});

/**
 * Sonnée par un choc contre un obstacle (`stun`) : pas sous `from` J ; au-delà, `seconds` s pour un choc de `at` J, au prorata de
 * l'énergie du choc (½ m v²).
 */
const StunSchema = z.strictObject({ from: z.number().nonnegative(), at: z.number().positive(), seconds: z.number().positive() });

/**
 * Une créature (creatures.json, CONCEPTION « Les créatures ») : des données pour le moteur commun (world/creature.ts, world/warren.ts,
 * systems/creatures.ts), jamais du code propre à une bête. `image` : sa planche de dessins (animations `<image>-<pose>-<direction>`).
 * - `mass` (kg), `dims` (cm, son corps au repos) ; `becomes` : l'objet qu'elle devient morte (items.json, de la même masse : la matière
 *   se conserve) ; `target` : ses points de vie (finis, gardés par la partie), ce qui vole sous un coup, sa peau (`hide`).
 * - `senses` : les distances de perception (m) selon l'allure de Xéros : immobile (`still`), discret (`sneak`, Alt), à la marche, à la
 *   course ; `calm` : combien de secondes Xéros doit rester immobile ou s'éloigner pour qu'une bête aux aguets se calme.
 * - `reaction` : ce qu'elle fait quand Xéros entre dans sa distance `near`, ou quand un coup la blesse : `flee` (elle fuit à son gîte :
 *   `flee`, `thump`) ou `charge` (elle charge en ligne droite : `charge`, `stun`).
 * - `den` : son gîte, le rectangle `Warren` de Tiled : `burrow` (le terrier : ses entrées, les objets à `burrow` dans le rectangle ;
 *   au terrier, elle est invisible : `burrow`) ou `wallow` (la bauge, au milieu du rectangle : elle y dort couchée, visible, et perçoit
 *   Xéros à la part `asleep` de ses distances).
 * - `graze` : la vie tranquille autour de son gîte : `range` (m, au plus loin du gîte ; une heure de `schedule` peut le changer), ses
 *   petits déplacements (`hop` : vitesse en m/s, longueur en m), les pauses entre deux (`pause`, s) et le temps passé à brouter ou
 *   fouiller à une place (`stay`, s) avant d'en chercher une autre.
 * - `flee` : sa course (`speed`, m/s) en zigzag (`zigzag` : un écart d'`angle`° de part et d'autre, changé tous les `every` m).
 * - `thump` : à l'entrée, elle tambourine `ms` ms ; les bêtes de son espèce à moins de `radius` m fuient aussi.
 * - `burrow` : `reach` (m), à quelle distance de l'entrée elle y disparaît ; `stay` (minutes de jeu), combien de temps elle reste au
 *   terrier après une fuite ; `emerge` (s), l'écart entre deux sorties.
 * - `schedule` : la part de la population dehors (au terrier : sortie ; à la bauge : debout) à partir de chaque heure (`hour`, de 0 à
 *   24 ; `out`, de 0 à 1 ; `range`, m, la distance de `graze` à cette heure), la journée bouclant.
 * - `births` : `hours`, combien d'heures de jeu entre deux naissances tant qu'il manque des bêtes au gîte.
 * - `heal` : `days`, combien de jours une bête blessée reste au gîte (elle guérit au jour `days` après sa blessure).
 */
export const CreatureSchema = z
  .strictObject({
    name: id,
    image: id,
    mass: z.number().positive(),
    dims: z.lazy(() => DimsSchema),
    becomes: id,
    target: z.strictObject({ hp: z.number().positive(), matter: id, tilt: z.number().min(0).max(30).default(0), hide: z.number().nonnegative().default(0) }),
    senses: z.strictObject({ still: GaitSensesSchema, sneak: GaitSensesSchema, walk: GaitSensesSchema, run: GaitSensesSchema }),
    calm: z.number().positive(),
    reaction: z.enum(['flee', 'charge']).default('flee'),
    den: z.enum(['burrow', 'wallow']).default('burrow'),
    asleep: z.number().gt(0).lte(1).default(1),
    graze: z.strictObject({
      range: z.number().positive(),
      hop: z.strictObject({ speed: z.number().positive(), length: SpanSchema }),
      pause: SpanSchema,
      stay: SpanSchema,
    }),
    flee: z.strictObject({ speed: z.number().positive(), zigzag: z.strictObject({ every: z.number().positive(), angle: z.number().min(0).max(80) }) }).optional(),
    thump: z.strictObject({ ms: z.number().nonnegative(), radius: z.number().nonnegative() }).optional(),
    burrow: z.strictObject({ reach: z.number().positive(), stay: SpanSchema, emerge: z.number().positive() }).optional(),
    charge: ChargeSchema.optional(),
    stun: StunSchema.optional(),
    schedule: z
      .array(z.strictObject({ hour: z.number().min(0).max(24), out: z.number().min(0).max(1), range: z.number().positive().optional() }))
      .min(1)
      .refine((s) => s.every((x, i) => i === 0 || x.hour > s[i - 1].hour), { message: "les heures de 'schedule' vont croissant" }),
    births: z.strictObject({ hours: z.number().positive() }),
    heal: z.strictObject({ days: z.number().int().positive() }),
    /** Ce qu'elle monte, descend, saute et si elle nage (MobilitySchema) : elle ne passe que là où ses capacités la laissent passer. */
    mobility: z.lazy(() => MobilitySchema),
  })
  .refine((d) => d.reaction !== 'flee' || (d.flee && d.thump), { message: "une bête qui fuit a sa course ('flee') et son tambour ('thump')" })
  .refine((d) => d.reaction !== 'charge' || (d.charge && d.stun), { message: "une bête qui charge a sa charge ('charge') et son choc ('stun')" })
  .refine((d) => d.den !== 'burrow' || d.burrow, { message: "une bête au terrier a son terrier ('burrow')" });

/**
 * Une attaque (combat.json, `attacks`) : des données. `gesture` : le geste de combat du corps (COMBAT_POSES de
 * art/characters/xeros-combat.ts, tirées par build-art dans src/generated/combatPoses.ts : ses images, leur durée, la main, l'arme,
 * la traînée, l'éclat, les images de frappe), qui ne sait pas ce que Xéros tient ; la durée du coup et la vitesse de ce qui frappe se
 * tirent de ses poses (une seule source), allongées par l'inertie de l'arme. `hand` : la main qui frappe (le poing : `right` ou
 * `left` ; une arme : `right`, la main de l'épée dans les dessins). `combo` : après la fin du geste, combien de ms un clic enchaîne
 * l'attaque suivante de la posture (pendant le geste, l'appui est gardé). `power` : la part du corps qui s'y met, elle multiplie l'énergie du coup (ses dégâts et son prix au joule, world/strike.ts).
 */
const AttackSchema = z.strictObject({
  name: id,
  gesture: id,
  hand: z.enum(['right', 'left']).default('right'),
  combo: z.number().nonnegative(),
  power: z.number().positive(),
});

/**
 * Où frappe un geste, dans le monde, au sol (combat.json, `sweeps`, un par geste de combat) : la zone de coup ne suit pas le dessin
 * (à l'écran, la hauteur se mêle à la profondeur : une lame levée au-dessus de la tête est dessinée là où serait ce qui est devant
 * Xéros vers le nord). `hand` : la distance des pieds à la main tendue, en cm (la portée du coup = `hand` + l'arme devant la main ;
 * le poing : 0, son bras est son arme) ; `width` : la largeur de ce qui frappe, en cm ; `frames` : pour chaque image du geste (autant
 * que ses poses), `a` l'angle de l'arme par rapport à la direction où regarde Xéros (0 droit devant, + vers sa droite, − vers sa
 * gauche, en degrés), `r` la part de la portée atteinte au sol (de 0 à 1) et `z` la hauteur de la pointe, en part de la portée (elle
 * ne compte que pour la vitesse du coup : un coup d'en haut tombe ; la zone de coup reste au sol) ; `active` : les images où l'arme a de l'élan (la frappe, le
 * début de la suite ; jamais la garde, l'armer ni le retour). La zone d'une image active est ce que balaie l'arme, au sol, depuis
 * l'image d'avant. Les angles suivent les poses dessinées : à l'image où la lame est à droite de Xéros, la zone est à sa droite.
 */
const SweepSchema = z.strictObject({
  hand: z.number().nonnegative(),
  width: z.number().positive(),
  frames: z.array(z.strictObject({ a: z.number().min(-180).max(180), r: z.number().min(0).max(1), z: z.number().min(0).max(1).default(0) })).min(2),
  active: z.array(z.number().int().min(1)).min(1),
});

/**
 * La main nue (combat.json, `unarmed`) : une arme en données comme les autres (WeaponSchema, `fist: true`, sans planche), avec son nom
 * et sa masse (celle qui frappe : le poing et l'avant-bras lancés) ; sa portée est la longueur du bras.
 */
const UnarmedSchema = z.strictObject({ ...weaponFields, name: id, mass: z.number().positive() }).refine((w) => w.grip < w.length, gripInside);

/**
 * Le ressenti d'un coup qui porte (combat.json, `feel`) : `hitStopMs`, l'arrêt sur image à l'impact (le geste et la cible figés) ;
 * `recoilPx`, le recul de la cible ; `reactMs`, la durée de sa réaction (elle penche de son `tilt` et revient) ; `shakeFrom`, à partir
 * de combien de dégâts l'écran tremble, `shakeMs` et `shakeIntensity` (part de l'écran) ; `floatMs`, combien de temps le chiffre
 * des dégâts (ou « raté ») s'envole au-dessus de la cible ; `debugMs`, combien de temps ?debug garde la zone de coup dessinée au sol.
 */
const FeelSchema = z.strictObject({
  hitStopMs: z.number().nonnegative(),
  recoilPx: z.number().nonnegative(),
  reactMs: z.number().positive(),
  shakeFrom: z.number().nonnegative(),
  shakeMs: z.number().nonnegative(),
  shakeIntensity: z.number().nonnegative(),
  debugMs: z.number().positive(),
  floatMs: z.number().positive(),
});

/**
 * Une posture d'une famille d'armes : ce que tiennent les mains (`when`) et la suite des attaques qu'enchaînent les clics (`chain`).
 * `when.other` : ce que tient l'autre main (`empty` rien, `weapon` une arme, `any` n'importe quoi) ; `when.both` : l'arme est tenue
 * à deux mains ; `when.free` : les mains libres (le poing : `both`, les deux ; `right`, `left` : celle-là seule). Absents : tout convient. La première posture qui convient sert. Plus tard : deux mains, bouclier, deux armes
 * (CONCEPTION, « Le combat ») ; aujourd'hui, une seule posture, qui convient à tout.
 */
const StanceDefSchema = z.strictObject({
  name: id,
  when: z.strictObject({
    other: z.enum(['empty', 'weapon', 'any']).optional(),
    both: z.boolean().optional(),
    free: z.enum(['both', 'right', 'left']).optional(),
  }),
  chain: z.array(id).min(1),
});

/**
 * Le combat (combat.json) : les règles du calcul (`rules`), les attaques, les familles d'armes et leurs postures.
 * La portée d'une attaque : `hand` de son geste (`sweeps`) + la longueur de l'arme devant la main ;
 * `rules.inertiaRef` (kg·m²) et `rules.inertiaSlow` : au-delà de `inertiaRef`, chaque kg·m² de moment d'inertie (autour de la main)
 * allonge le geste de `inertiaSlow` ; `rules.damagePerJoule` : les dégâts d'un coup = l'énergie de l'arme au coup (½ I ω²) × ce
 * facteur × `efficiency` de l'arme × `power` de l'attaque ; `rules.controlRef` (kg·m²) : la précision d'une arme, 1 / (1 + I /
 * `controlRef`), de 0 (on ne la tient pas) à 1 (elle va où l'on veut) ; `rules.missPx` : l'écart le plus grand d'un coup, en px, à
 * précision nulle (tiré à chaque coup dans un disque de `missPx` × (1 − précision)² : toute la lame passe à côté d'autant).
 * `feel` : le ressenti (FeelSchema) ; `unarmed` : la main nue, une arme comme les autres (UnarmedSchema).
 */
export const CombatSchema = z.strictObject({
  rules: z.strictObject({
    inertiaRef: z.number().nonnegative(),
    inertiaSlow: z.number().nonnegative(),
    damagePerJoule: z.number().positive(),
    controlRef: z.number().positive(),
    missPx: z.number().nonnegative(),
    /**
     * L'arme improvisée (world/heft.ts) : tout objet tenu sans `weapon` frappe comme une arme de sa plus grande dimension, tenue à
     * `grip` de sa longueur depuis le bout, d'équilibre `balance` (0,5 : une tige uniforme), d'efficacité `efficiency`, dans la famille
     * de gestes `family`.
     */
    improvised: z.strictObject({ grip: z.number().min(0).lt(1), balance: z.number().gt(0).lte(1), efficiency: z.number().gt(0).lte(1), family: id }),
  }),
  /**
   * Le lancer (world/throw.ts ; docs/CONCEPTION.md, « Le lancer ») : le bras de Xéros applique son couple (`swing` de strength.json) sur
   * l'angle `angle` (rad) ; `arm` : la longueur du bras, de l'épaule à la main (m) ; `armInertia` : l'inertie du bras seul autour de
   * l'épaule (kg·m²) ; `height` : la hauteur de la main au lâcher (m) ; `gravity` : la pesanteur (m/s²) ; `efficiency` : la part de
   * l'énergie à l'arrivée qui fait des dégâts (comme `efficiency` d'une arme) ; `step` : le pas de la trajectoire (s), sur lequel se teste
   * le franchissement d'une cible (world/crossing.ts).
   */
  throw: z.strictObject({
    angle: z.number().positive(),
    arm: z.number().positive(),
    armInertia: z.number().positive(),
    height: z.number().positive(),
    gravity: z.number().positive(),
    efficiency: z.number().gt(0).lte(1),
    step: z.number().positive(),
  }),
  feel: FeelSchema,
  sweeps: z.record(id, SweepSchema),
  unarmed: UnarmedSchema,
  attacks: z.record(id, AttackSchema),
  families: z.record(id, z.strictObject({ name: id, stances: z.array(StanceDefSchema).min(1) })),
});

/**
 * Ce qui entre dans une transformation ou en sort (transforms.json) : un objet possédable (`item`), un objet du monde (`prop`), une
 * pièce de bois (`wood` : les réglages qui la distinguent, `size`, `shape`, `hewn`, et sa `length` en cm, ou absente : la longueur
 * de la pièce d'entrée), ou, en entrée seulement, de la matière prise au poste (`raw` : une matière de matters.json, `kg` : l'eau
 * de l'étang, la terre de la berge). `count` : combien.
 */
const TransformPartSchema = z
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
 * l'on puise l'eau et creuse l'argile), sur un chevalet de fendeur (`brake`), au four à chaux (`kiln`, à venir : on y cuit le
 * calcaire).
 */
/**
 * Le geste d'une transformation : `soon`, à venir (en attendant, ?dieu l'applique d'un coup : « Transformer ») ; ou le geste réel,
 * déjà jouable : `system`, le fichier qui le joue, et `keys`, ce que fait le joueur.
 */
const TransformGestureSchema = z.union([z.literal('soon'), z.strictObject({ system: id, keys: id })]);

/**
 * Une transformation (transforms.json, docs/CONCEPTION.md « Les matières ») : tailler retire de la matière. `name` : ce qu'on fait
 * (« dégrossir un moellon ») ; `inputs` et `outputs` (la sortie pèse moins que l'entrée : validate.ts) ; `waste` : ce qu'on retire
 * (`name`, et `prop` : l'objet du monde qui en reste au sol, les éclats de pierre ; absent : il disparaît, avec `fate` qui dit où il
 * va) ; `tools` : les outils (clés de items.json) ; `station` : le poste ; `trade` : le métier ; `gesture` : le geste.
 */
export const TransformSchema = z.strictObject({
  name: id,
  /** Durée réaliste de la transformation, en minutes de jeu (docs/CONCEPTION.md, « Le temps ») : « Transformer » (?dieu) avance l'horloge d'autant. */
  minutes: z.number().nonnegative(),
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
const DialogueActionSchema = z.enum(['sleep', 'help']);

/** Un choix offert à la fin d'une ligne (« Oui », « Non ») ; sans `action`, il ferme simplement le dialogue. */
const DialogueChoiceSchema = z.strictObject({ text: id, action: DialogueActionSchema.optional() });

const DialogueLineSchema = z.strictObject({
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
const MapObjectSchema = z.strictObject({
  /** Identifiant de l'objet dans Tiled (unique dans la carte) : GameState y range les changements du monde. */
  id: z.number().int().nonnegative(),
  type: id,
  x: px,
  y: px,
  /** Remplace le dialogue de props.json pour cet exemplaire. */
  interact: id.optional(),
  /** Réglages d'une pièce de bois (`wood-piece`), tirés de ses propriétés Tiled ; absents : ceux de props.json. */
  wood: z.lazy(() => WoodPieceSchema).optional(),
  /** L'âge d'un objet de bois travaillé (`aged` de props.json : le panneau, vieux au bord de la route), propriété `age` dans Tiled. */
  age: z.lazy(() => WoodAgeSchema).optional(),
  /**
   * Dans un bâtiment posé (un Plan) : il n'est que dans son intérieur calculé, où l'on s'en sert comme de tout objet de la carte
   * (la paillasse où l'on dort, la planchette qui enseigne, les outils du cagibi) ; ce qu'on en fait se garde sous l'intérieur.
   */
  inside: z.literal(true).optional(),
  /**
   * Posé tourné (propriété `view` dans Tiled, comme un `Item`) : sa vue de 1 à 3, selon sa symétrie (`views` de props.json :
   * `symmetric` 1 = `-ns`, `four` 1 à 3 = `-r1` à `-r3` ; content/views.ts `viewImage`). Le liseré de l'eau au nord d'un flanc.
   */
  view: z.number().int().min(1).max(3).optional(),
});

/** Point d'apparition : (x, y) = position des pieds du joueur. */
/** `inside` : le point est dans un bâtiment posé (un Plan) ; il vaut dans son intérieur calculé (le réveil de Xéros dans la maison). */
const SpawnSchema = z.strictObject({ x: px, y: px, facing: FacingSchema.optional(), inside: z.literal(true).optional() });

/** Zone qui mène vers une autre carte : on la prend quand les pieds sont dedans (et, si `facing` est donné, en avançant dans cette direction). */
const ExitSchema = z.strictObject({
  x: px,
  y: px,
  w: px.positive(),
  h: px.positive(),
  to: id,
  spawn: id,
  facing: FacingSchema.optional(),
});

/** Personnage non joueur : (x, y) = position de ses pieds. `character` = clé de characters.json, qui est aussi la clé de son sprite. */
const NpcSchema = z.strictObject({
  x: px,
  y: px,
  character: id,
  facing: FacingSchema.optional(),
  /** Dialogue lancé quand Xéros lui parle. */
  dialogue: id,
  /** Dans un bâtiment posé (un Plan) : il n'est que dans son intérieur calculé (la mère, chez elle), à sa place. */
  inside: z.literal(true).optional(),
  /** Sa pose : `sit`, assis (l'animation `sit-<direction>` de son sprite). */
  pose: z.enum(['sit']).optional(),
});

/**
 * Une place nommée d'une carte (un rectangle de type `Place` dans Tiled), que lira une quête : `name`, son nom ; `accepts`, ce qu'on y
 * pose (une clé de props.json ou d'items.json : le fagot) ; `inside` : dans un bâtiment posé, elle vaut dans son intérieur.
 */
const PlaceSchema = z.strictObject({ x: px, y: px, w: px.positive(), h: px.positive(), name: id, accepts: id, inside: z.literal(true).optional() });

/**
 * Une parcelle réservée du village (chantier « monde ») : un rectangle de type `Parcel` dans Tiled, sa destination (`use`, clé de
 * parcels.json) et son nom facultatif (le nom de l'objet dans Tiled : « Mairie »). Invisible en jeu ; montrée en mode construction et
 * avec ?debug. Les bâtiments s'y poseront quand leurs pièces existeront.
 */
const ParcelSchema = z.strictObject({ x: px, y: px, w: px.positive(), h: px.positive(), use: id, name: id.optional() });

/**
 * Un plan du bac à sable posé depuis Tiled (un rectangle de type `Plan`, propriété `plan` : un fichier de src/content/plans/, `age`
 * facultatif) : (x, y) = son coin nord-ouest au sol. À la première visite de la carte, ses pièces entrent dans `builds` de GameState
 * (`seedPlans`), comme si on l'avait posé en mode construction ; `id` est l'identifiant de l'objet dans Tiled.
 */
const MapPlanSchema = z.strictObject({ id: z.number().int().nonnegative(), x: px, y: px, plan: id, age: z.lazy(() => WoodAgeSchema).optional() });

/**
 * Un tas de bois posé depuis Tiled (un point de type `Pile` : ses propriétés de pièce de bois, `size`, `length`, `shape`, `hewn` ;
 * `count`, le nombre de pièces ; `turned`, nord-sud ; `inside`, dedans) : (x, y) = l'origine du tas, comme un tas de GameState. À la
 * première visite de la carte (ou de l'intérieur qui le reprend), il entre dans `piles` de GameState (`seedPiles`), calculé comme
 * tout tas de bois (`world/woodPile.ts`) : il compte ses pièces, on les reprend une à une. `id` est l'identifiant de l'objet dans Tiled.
 */
const MapPileSchema = z.strictObject({
  id: z.number().int().nonnegative(),
  x: px,
  y: px,
  wood: PileWoodSchema,
  count: z.number().int().positive(),
  turned: z.literal(true).optional(),
  inside: z.literal(true).optional(),
});

/**
 * Un objet possédable posé au sol depuis Tiled (un point de type `Item` : `item`, clé d'items.json qui a une image au sol, `ground` ;
 * `view`, sa vue de 0 à 3 ; chantier « correctifs » : les branches de la tempête) : (x, y) = le milieu du bas de son image, comme un
 * objet posé de GameState. À la première visite de la carte, il entre dans `ground` de GameState (`seedGround`) : c'est alors le même
 * objet qu'une branche lâchée par Xéros. `id` est l'identifiant de l'objet dans Tiled.
 */
const MapItemSchema = z.strictObject({
  id: z.number().int().nonnegative(),
  x: px,
  y: px,
  item: id,
  view: z.number().int().min(1).max(3).optional(),
});

/**
 * Une garenne posée depuis Tiled (un rectangle de type `Warren` : `creature`, l'espèce, clé de creatures.json ; `population`, combien
 * de bêtes elle compte pleine) : ses entrées sont les objets à `burrow` posés dans son rectangle (world/warren.ts). `id` est
 * l'identifiant de l'objet dans Tiled (la partie garde la garenne sous ce numéro).
 */
const MapWarrenSchema = z.strictObject({
  id: z.number().int().nonnegative(),
  x: px,
  y: px,
  w: px.positive(),
  h: px.positive(),
  creature: id,
  population: z.number().int().positive(),
});

/** Un point d'une forme du relief, en px de la carte. */
const ReliefPointSchema = z.strictObject({ x: px, y: px });

/**
 * Le relief d'une carte (docs/CONCEPTION.md, « Le relief »), lu par build-maps dans le calque d'objets `relief` de Tiled ; hauteurs et
 * largeurs en cm. `base` : la hauteur de fond (la propriété de carte `height` : une zone toute sur le plateau). `levels` : des niveaux
 * plats (polygones). `ridges` : des talus en long (polylignes) : la crête suit la ligne à la hauteur interpolée `h`, large de `crest`,
 * et le flanc descend à 0 sur `flank`, chacun donné sommet par sommet. `lanes` : des couloirs creusés (polylignes) : le sol suit la
 * ligne à la hauteur `h` interpolée, sur `width` de large, et un talus intérieur large de `inner` + `innerSlope` × la profondeur le
 * raccorde à ce qui l'entoure. La hauteur d'un point : le plus haut des niveaux et des talus (ou le fond), creusé par les couloirs.
 */
export const ReliefSchema = z.strictObject({
  base: z.number().nonnegative(),
  levels: z.array(z.strictObject({ id: z.number().int(), height: z.number().nonnegative(), points: z.array(ReliefPointSchema).min(3) })),
  ridges: z.array(
    z.strictObject({
      id: z.number().int(),
      points: z.array(ReliefPointSchema.extend({ h: z.number().nonnegative(), crest: z.number().nonnegative(), flank: z.number().positive() })).min(2),
    }),
  ),
  lanes: z.array(
    z.strictObject({
      id: z.number().int(),
      width: z.number().positive(),
      inner: z.number().nonnegative(),
      innerSlope: z.number().nonnegative(),
      points: z.array(ReliefPointSchema.extend({ h: z.number().nonnegative() })).min(2),
    }),
  ),
});

/**
 * Monter, descendre, nager (mobility.json pour Xéros, `mobility` d'une créature) : des capacités du personnage, jamais une règle du
 * monde (« Le monde ne limite pas »). `step` (cm) : ce qu'il monte ou descend d'un pas ; `drop` (cm) : ce dont il saute pour descendre ;
 * `slope` (%) : la pente qu'il marche ; plus raide, elle compte comme une marche de toute sa hauteur ; `swim` : il nage.
 */
export const MobilitySchema = z
  .strictObject({ step: z.number().nonnegative(), drop: z.number().nonnegative(), slope: z.number().positive(), swim: z.boolean() })
  .refine((m) => m.drop >= m.step, { message: "'drop' ne peut pas être au-dessous de 'step'" });

export const MapSchema = z.strictObject({
  /** Nom du fichier .tmj. */
  id,
  name: id,
  /** Jeu de tuiles du sol : déduit du .tsj que la carte référence. */
  tileset: id,
  /**
   * Place de la carte dans le monde (px, coin haut gauche), quand elle est une zone du monde (`tiled/maps/monde.world`) : on passe à la
   * zone voisine en marchant hors du bord (systems/zones.ts). Sans : une carte à part (la chaumière), où l'on n'entre que par une sortie.
   */
  world: z.strictObject({ x: px, y: px }).optional(),
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
  /** Parcelles réservées (le village). */
  parcels: z.array(ParcelSchema),
  /** Plans du bac à sable posés depuis Tiled (la cabane, les étals, les granges). */
  plans: z.array(MapPlanSchema),
  /** Places nommées (la place du fagot près du foyer). */
  places: z.array(PlaceSchema).default([]),
  /** Tas de bois posés depuis Tiled (les quartiers du cagibi). */
  piles: z.array(MapPileSchema).default([]),
  /** Garennes posées depuis Tiled (les lapins de la ferme). */
  warrens: z.array(MapWarrenSchema).default([]),
  /** Objets possédables posés au sol depuis Tiled (les branches de la tempête). */
  items: z.array(MapItemSchema).default([]),
  /** Le relief (calque `relief` de Tiled) ; sans : une carte plate, à 0 partout (les intérieurs). */
  relief: ReliefSchema.optional(),
});

/** Une destination de parcelle (parcels.json) : le nom dit, et une couleur pour la montrer (mode construction, ?debug). */
export const ParcelUseSchema = z.strictObject({ name: id, color: z.string().regex(/^#[0-9a-f]{6}$/) });

/**
 * Le monde entier (world.json, chantier « monde »), ce qui ne dépend d'aucune zone : `gloom`, la pénombre du sous-bois, de l'ouest vers
 * l'est, par paliers (`x` en mètres depuis le bord ouest du monde, `alpha` de 0 à 1, interpolé entre deux paliers ; au-delà du dernier,
 * rien).
 */
export const WorldSchema = z.strictObject({
  gloom: z.array(z.strictObject({ x: z.number().nonnegative(), alpha: z.number().min(0).max(1) })).min(2),
  /**
   * La lumière qui suit l'heure (docs/CONCEPTION.md, « Le temps ») : des repères dans la journée (`hour`, de 0 à 24, croissants), chacun
   * la teinte du voile posé sur le monde (`color`), son opacité (`alpha` : 0 en plein jour) et la force du soleil (`sun`, de 0 à 1 : les
   * rais de soleil des fenêtres et des portes) ; entre deux repères, tout s'interpole, et la journée boucle de minuit à minuit.
   */
  daylight: z
    .array(
      z.strictObject({
        hour: z.number().min(0).max(24),
        color: z.string().regex(/^#[0-9a-f]{6}$/i),
        alpha: z.number().min(0).max(1),
        sun: z.number().min(0).max(1),
        /** Le moment du cadran qui commence à ce repère (aube, jour, crépuscule, nuit) ; il dure jusqu'au repère suivant qui en nomme un. */
        moment: z.enum(['dawn', 'day', 'dusk', 'night']).optional(),
      }),
    )
    .min(2)
    .refine((d) => d.every((p, i) => i === 0 || p.hour > d[i - 1].hour), { message: "les heures de 'daylight' doivent croître" })
    .refine((d) => d.some((p) => p.moment), { message: "un repère de 'daylight' au moins doit nommer son moment" })
    .refine((d) => d.some((p) => p.sun === 0) && d.some((p) => p.sun > 0), { message: "'daylight' : le soleil doit se lever et se coucher (un repère à sun 0, un à sun > 0)" }),
});

export type Facing = z.infer<typeof FacingSchema>;
export type DecalSet = z.infer<typeof DecalSetSchema>;
export type TerrainDef = z.infer<typeof TerrainDefSchema>;
export type Relief = z.infer<typeof ReliefSchema>;
export type Mobility = z.infer<typeof MobilitySchema>;
export type TilesetCatalog = z.infer<typeof TilesetCatalogSchema>;
export type PropDef = z.infer<typeof PropDefSchema>;
export type TreeDef = z.infer<typeof TreeSchema>;
export type Views = z.infer<typeof ViewsSchema>;
export type Harvest = z.infer<typeof HarvestSchema>;
export type Drop = z.infer<typeof DropSchema>;
export type ItemDef = z.infer<typeof ItemDefSchema>;
export type Mass = z.infer<typeof MassSchema>;
export type Turn = z.infer<typeof TurnSchema>;
export type Strength = z.infer<typeof StrengthSchema>;
export type Swinger = z.infer<typeof SwingerSchema>;
export type ToolWork = z.infer<typeof ToolWorkSchema>;
export type WorkStroke = z.infer<typeof WorkStrokeSchema>;
export type WorkDef = z.infer<typeof WorkSchema>;
export type HarvestWork = z.infer<typeof HarvestWorkSchema>;
export type DialogueAction = z.infer<typeof DialogueActionSchema>;
export type StaminaDef = z.infer<typeof StaminaSchema>;
export type HealthDef = z.infer<typeof HealthSchema>;
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
export type Parcel = z.infer<typeof ParcelSchema>;
export type MapPlan = z.infer<typeof MapPlanSchema>;
export type MapPile = z.infer<typeof MapPileSchema>;
export type MapItem = z.infer<typeof MapItemSchema>;
export type MapWarren = z.infer<typeof MapWarrenSchema>;
export type ParcelUse = z.infer<typeof ParcelUseSchema>;
export type End = z.infer<typeof EndSchema>;
export type WoodLook = z.infer<typeof WoodLookSchema>;
export type WoodPiece = z.infer<typeof WoodPieceSchema>;
export type WoodAge = z.infer<typeof WoodAgeSchema>;
export type PileWood = z.infer<typeof PileWoodSchema>;
export type WoodLookDef = z.infer<typeof WoodLookDefSchema>;
export type WoodSize = z.infer<typeof WoodSizeSchema>;
export type WoodDef = z.infer<typeof WoodSchema>;
export type MatterMass = z.infer<typeof MatterMassSchema>;
export type Matter = z.infer<typeof MatterSchema>;
export type Rock = z.infer<typeof RockSchema>;
export type NaturalDef = z.infer<typeof NaturalDefSchema>;
export type Natural = z.infer<typeof NaturalSchema>;
export type TransformPart = z.infer<typeof TransformPartSchema>;
export type TransformDef = z.infer<typeof TransformSchema>;
export type BuildRef = z.infer<typeof BuildRefSchema>;
export type BuildPlaced = z.infer<typeof BuildPlacedSchema>;
export type BuildPlan = z.infer<typeof BuildPlanSchema>;
export type JointType = z.infer<typeof JointTypeSchema>;
export type Weapon = z.infer<typeof WeaponSchema>;
export type Target = z.infer<typeof TargetSchema>;
export type CreatureDef = z.infer<typeof CreatureSchema>;
export type Gait = keyof CreatureDef['senses'];
export type Attack = z.infer<typeof AttackSchema>;
export type StanceDef = z.infer<typeof StanceDefSchema>;
export type CombatDef = z.infer<typeof CombatSchema>;
export type SweepDef = z.infer<typeof SweepSchema>;
