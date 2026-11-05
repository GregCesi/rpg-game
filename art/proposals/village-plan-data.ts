// PROPOSITION (hors jeu, jamais chargée par le jeu) : le plan du village à l'échelle, chantier « village » (CADRAGE-village.md).
// Une seule source pour la planche .art-preview/village-plan.png (tools/essai-village-plan.ts) et pour les tableaux du cadrage.
// Rien ici ne touche aux cartes : les .tmj font foi, ceci est un plan à valider.
//
// Unités : le pixel du jeu (5 cm). Chaque forme est donnée dans le repère de SA zone (`zone`, px depuis son coin nord-ouest, comme
// dans Tiled) ; `world()` la ramène au monde (tiled/maps/monde.world : une zone fait 4 000 px, 200 m). Une case = 32 px = 1,60 m.
// Repères du village (village.tmj, lus dans la carte) : la rue est-ouest en y 2080-2176 (cases 65-67), la rue nord-sud en x 3264-3360
// (cases 102-104), la place ronde de 30 m centrée en (3312, 2128).
//
// Une règle du moteur commande le découpage : une pièce posée ne passe pas un bord de zone (CONCEPTION « Le monde »). Aucun bâtiment
// ne chevauche donc deux cartes, et les ruelles qui longent un bord de zone sont posées SUR ce bord (x 3936-4000 du village, y
// 3936-4000 du village).

export type ZoneId = 'village' | 'quartier-sud' | 'route-de-la-ville' | 'ferme-du-riche' | 'ferme' | 'bois-du-sud' | 'bois-du-nord';

/** Le coin nord-ouest de chaque zone dans le monde (px), d'après tiled/maps/monde.world. */
export const ZONE_ORIGIN: Record<ZoneId, [number, number]> = {
  village: [12000, 4000],
  'quartier-sud': [12000, 8000],
  'route-de-la-ville': [16000, 4000],
  'ferme-du-riche': [12000, 0],
  ferme: [4000, 4000],
  'bois-du-sud': [4000, 8000],
  'bois-du-nord': [4000, 0],
};
export const world = (zone: ZoneId, x: number, y: number): [number, number] => [ZONE_ORIGIN[zone][0] + x, ZONE_ORIGIN[zone][1] + y];

export type Rect = [number, number, number, number];
/** Une forme : un rectangle [x0, y0, x1, y1] ou un polygone de points, en px de sa zone. */
export type Shape = { rect: Rect } | { poly: [number, number][] };

/** Ce qu'est une parcelle (la couleur de la planche). */
export type Kind =
  | 'house' // maison d'habitation
  | 'rich' // maison aisée
  | 'shop' // boutique, atelier ouvert sur la place ou la rue
  | 'public' // le sire, la taverne
  | 'farm' // ce qui est aux fermes, hors du village
  | 'smithy' // la forge (existe)
  | 'garden' // jardin, verger, cour sans maison
  | 'free'; // libre, à décider

/** Ce que devient l'existant : gardé tel quel, gardé et changé de destination, nouveau, déplacé. */
export type Fate = 'kept' | 'renamed' | 'new' | 'moved';

export interface Parcel {
  id: string;
  zone: ZoneId;
  shape: Shape;
  kind: Kind;
  /** Le nom court, écrit sur la planche. */
  label: string;
  /** Qui y vit ou ce qu'on y fait (la phrase du cadrage). */
  who: string;
  fate: Fate;
  /** La maison dessinée du travail 2 qui s'y pose (id de art/proposals/village-types.ts), s'il y en a une. */
  house?: string;
  /** Les emprises des bâtiments (hors œuvre, débords de toit non compris), px de la zone. */
  buildings?: Rect[];
  /** Ce qui est en cour, en terre battue (px de la zone). */
  yards?: Rect[];
}

/** Les voies : les rues qui existent, les ruelles nouvelles (terre battue, 3,20 m). */
export interface Way { id: string; zone: ZoneId; rect: Rect; label: string; fate: 'kept' | 'new' }

/** La place ronde (existe) et ce qu'il y a dessus. */
export const PLACE = { zone: 'village' as ZoneId, center: [3312, 2128] as [number, number], radius: 200 }; // 20 m depuis la place resserrée (section 14)
/** Le panneau des nouvelles, au milieu de la place (pièce nouvelle) ; 1,60 × 0,30 m. */
export const NOTICE_BOARD = { zone: 'village' as ZoneId, rect: [3234, 2172, 3266, 2178] as Rect }; // au sud-ouest du tilleul

export const WAYS: Way[] = [
  // les rues qui existent (gardées)
  { id: 'rue-ouest', zone: 'village', rect: [992, 2080, 3008, 2176], label: "rue de l'ouest (vers la ferme de Xéros)", fate: 'kept' },
  { id: 'rue-est', zone: 'village', rect: [3616, 2080, 4000, 2176], label: "rue de l'est", fate: 'kept' },
  { id: 'route', zone: 'route-de-la-ville', rect: [0, 2080, 4000, 2176], label: 'route de la ville', fate: 'kept' },
  { id: 'rue-nord', zone: 'village', rect: [3264, 0, 3360, 1824], label: 'rue du nord', fate: 'kept' },
  { id: 'rue-nord-ferme', zone: 'ferme-du-riche', rect: [3264, 3350, 3360, 4000], label: '', fate: 'kept' },
  { id: 'rue-sud', zone: 'village', rect: [3264, 2432, 3360, 4000], label: 'rue du sud', fate: 'kept' },
  { id: 'rue-sud-qs', zone: 'quartier-sud', rect: [3264, 0, 3360, 2370], label: 'vers la ferme rivale', fate: 'kept' },
  // les ruelles nouvelles (2 cases, 3,20 m)
  { id: 'ruelle-nord', zone: 'village', rect: [2624, 1440, 4000, 1504], label: 'ruelle du nord', fate: 'new' },
  { id: 'ruelle-ouest', zone: 'village', rect: [2624, 1440, 2688, 4000], label: "ruelle de l'ouest", fate: 'new' },
  { id: 'ruelle-ouest-qs', zone: 'quartier-sud', rect: [2624, 0, 2688, 640], label: '', fate: 'new' },
  { id: 'ruelle-est', zone: 'village', rect: [3936, 1440, 4000, 4000], label: "ruelle de l'est (sur le bord de zone)", fate: 'new' },
  { id: 'ruelle-est-qs', zone: 'quartier-sud', rect: [3936, 0, 4000, 640], label: '', fate: 'new' },
  { id: 'ruelle-des-quarts', zone: 'village', rect: [2624, 2752, 4000, 2816], label: 'ruelle des quarts', fate: 'new' },
  { id: 'ruelle-du-milieu', zone: 'village', rect: [2048, 3392, 4000, 3456], label: 'ruelle du milieu', fate: 'new' },
  { id: 'ruelle-du-bord', zone: 'village', rect: [2048, 3936, 4000, 4000], label: 'ruelle du bord (sur le bord de zone)', fate: 'new' },
  { id: 'passage-du-potier', zone: 'village', rect: [2688, 3296, 3264, 3392], label: 'passage des jardins', fate: 'new' },
  { id: 'passage-du-bout', zone: 'quartier-sud', rect: [2688, 480, 3264, 576], label: '', fate: 'new' },
  { id: 'chemin-des-jardins', zone: 'quartier-sud', rect: [2048, 576, 4000, 640], label: 'chemin des jardins', fate: 'new' },
  { id: 'venelle', zone: 'village', rect: [2048, 2720, 2112, 4000], label: 'venelle', fate: 'new' },
  { id: 'venelle-qs', zone: 'quartier-sud', rect: [2048, 0, 2112, 640], label: '', fate: 'new' },
];


export const PARCELS: Parcel[] = [
  // ---------------------------------------------------------------- la place : quatre quarts, huit huitièmes
  {
    id: 'no', zone: 'village', shape: { rect: [2688, 1504, 3264, 2080] }, kind: 'shop', fate: 'new',
    label: 'Ferme du riche : la boutique',
    who: "La ferme du riche prend tout le quart : sa boutique sur la rue de l'ouest, l'étal luxueux sous un auvent tourné vers la place (produits rares : miel, fromages affinés, épices de la ville, cire), la cour et la réserve derrière. Tenue par un commis de la ferme.",
    buildings: [[3040, 1744, 3256, 1928], [2784, 1936, 3072, 2064], [3088, 1984, 3224, 2064]],
    yards: [[2784, 1744, 3040, 1936]],
  },
  {
    id: 'ne-n', zone: 'village', shape: { rect: [3360, 1504, 3600, 2080] }, kind: 'shop', fate: 'new',
    label: 'La boutique du bûcheron',
    who: "La boutique du bûcheron, qui vend son bois (il vit dans sa cabane en lisière : ici, il n'a que sa boutique) : le magasin au fond, dans le large du huitième ; le long de la rue du nord, le chantier de vente, les tas de bois (bûches, quartiers, perches, fagots, planches) sous un appentis.",
    buildings: [[3368, 1744, 3584, 1928]],
    yards: [[3368, 1928, 3584, 2040]],
  },
  {
    id: 'ne-e', zone: 'village', shape: { rect: [3576, 1504, 3936, 2080] }, kind: 'shop', fate: 'new',
    label: "Boutique abandonnée (l'ancien menuisier)",
    who: "Personne. La boutique de l'ancien menuisier, fermée depuis sa mort : volets cloués, l'enseigne tombée, le bois vieux, une herbe haute devant. On pourra la reprendre un jour.",
    buildings: [[3576, 1936, 3864, 2064]],
  },
  {
    id: 'se-s', zone: 'village', shape: { rect: [3360, 2176, 3576, 2752] }, kind: 'farm', fate: 'new',
    label: 'Ferme rivale : dépôt et étal de légumes',
    who: "Personne n'y dort. La ferme rivale y a une maison simple qui sert de dépôt (paniers, cageots, sacs) et, tourné vers la place, un grand étal de légumes en planches qui ne paie pas de mine (deux travées d'étal, des cageots à terre devant).",
    buildings: [[3376, 2408, 3568, 2672], [3376, 2284, 3520, 2298]],
  },
  {
    id: 'se-e', zone: 'village', shape: { rect: [3536, 2176, 3936, 2752] }, kind: 'shop', fate: 'new',
    label: 'La mercière',
    who: "La mercière, sœur du coq, veuve, et sa fille. La boutique au rez-de-chaussée sur la rue de l'est (fils, aiguilles, rubans, boutons, petits pots), son logis à l'étage.",
    buildings: [[3536, 2240, 3872, 2400]],
    yards: [[3576, 2400, 3936, 2560]],
  },
  {
    id: 'so', zone: 'village', shape: { rect: [2688, 2176, 3264, 2752] }, kind: 'shop', fate: 'new',
    label: 'La tailleuse et son mari',
    who: "La tailleuse (vêtements) et son mari, le frère du forgeron, qui travaille le cuir et tient la boutique d'équipement d'aventure (sacs, ceintures, fourreaux, outres, cordes, lanternes, et ce que fait son frère : couteaux, haches, pointes). Un seul grand bâtiment tout en bois, à étage, sans étal : les deux boutiques au rez-de-chaussée, leur logis au-dessus. La fille du coq y est apprentie.",
    buildings: [[2720, 2272, 3040, 2432], [3040, 2320, 3248, 2704]],
    yards: [[2720, 2432, 3040, 2704]],
  },
  // ---------------------------------------------------------------- au sud : la taverne, puis les maisons
  {
    id: 'taverne', zone: 'village', shape: { rect: [3360, 2816, 3936, 3392] }, kind: 'public', fate: 'moved',
    label: 'La taverne',
    who: "Le tavernier, sa femme, leur fils et une servante. Grande, tout en bois, à étage (la salle en bas, deux chambres à louer en haut) ; à l'est, la cour en terrasse sous une treille, les tables dehors ; derrière, l'écurie des voyageurs.",
    buildings: [[3392, 2848, 3680, 3040], [3392, 3200, 3584, 3328]],
    yards: [[3712, 2848, 3904, 3136]],
  },
  { id: 's1-o1', zone: 'village', shape: { rect: [2880, 2816, 3264, 3056] }, kind: 'house', fate: 'new', label: 'Le potier', who: 'Le potier, sa femme et leurs deux enfants ; son tour et son petit four dans la cour, au sud de la maison.', buildings: [[3040, 2840, 3232, 2952]] },
  { id: 's1-o2', zone: 'village', shape: { rect: [2880, 3056, 3264, 3296] }, kind: 'house', fate: 'new', label: 'Le vannier', who: "Le vannier, sa femme et leur fils : paniers, hottes, cageots (ceux de la ferme rivale), claies, ruches de paille ; l'osier qui trempe dans la cour. « Pas à plaindre, sans plus ».", house: 'h6-vannier', buildings: [[3008, 3080, 3224, 3200]] },
  { id: 's1-jardins', zone: 'village', shape: { rect: [2688, 2816, 2880, 3296] }, kind: 'garden', fate: 'new', label: 'jardins', who: "Les potagers des trois maisons de la rue, en lanières jusqu'à la ruelle." },
  // la rue du sud, deuxième tronçon : la planche village-rue.png
  { id: 's2-o1', zone: 'village', shape: { rect: [2880, 3456, 3264, 3696] }, kind: 'house', fate: 'new', label: 'Le tisserand', who: 'Le tisserand et sa femme, sans enfants.', house: 'h2-tisserand', buildings: [[3080, 3480, 3232, 3620]] },
  { id: 's2-o2', zone: 'village', shape: { rect: [2880, 3696, 3264, 3936] }, kind: 'house', fate: 'new', label: 'Les vieux', who: "Un vieux couple : lui ancien bouvier de la ferme du riche, elle fileuse.", house: 'h3-vieux', buildings: [[3104, 3720, 3232, 3826]] },
  { id: 's2-jardins', zone: 'village', shape: { rect: [2688, 3456, 2880, 3936] }, kind: 'garden', fate: 'new', label: 'jardins', who: 'Leurs potagers.' },
  { id: 's2-e1', zone: 'village', shape: { rect: [3360, 3456, 3936, 3696] }, kind: 'house', fate: 'new', label: 'Le couvreur et sa famille', who: 'Le couvreur, sa femme, leurs six enfants et la grand-mère : neuf sous un même toit.', house: 'h1-couvreur', buildings: [[3392, 3472, 3640, 3640]] },
  { id: 's2-e2', zone: 'village', shape: { rect: [3360, 3696, 3936, 3936] }, kind: 'house', fate: 'new', label: 'Le tonnelier', who: "Le tonnelier et sa femme, âgés, et leur fils qui reprend l'atelier.", buildings: [[3392, 3720, 3584, 3840]] },
  // le second rang, à l'ouest de la ruelle de l'ouest
  { id: 'r2-1', zone: 'village', shape: { rect: [2112, 2816, 2624, 3104] }, kind: 'house', fate: 'new', label: 'Les journaliers', who: 'Deux familles de journaliers sous un même toit, un mur entre elles : un journalier, sa femme et leurs trois petits ; une veuve journalière et son grand fils.', house: 'h5-journaliers', buildings: [[2384, 2880, 2586, 2954]] },
  { id: 'r2-2', zone: 'village', shape: { rect: [2112, 3104, 2624, 3392] }, kind: 'house', fate: 'new', label: 'La fileuse', who: 'Une fileuse, veuve, et sa vieille mère.', buildings: [[2432, 3168, 2592, 3264]] },
  { id: 'r2-3', zone: 'village', shape: { rect: [2112, 3456, 2624, 3712] }, kind: 'house', fate: 'new', label: 'Le scieur de long', who: 'Le scieur de long (il travaille avec le bûcheron), sa femme et leurs quatre enfants.', buildings: [[2400, 3488, 2592, 3616]] },
  { id: 'r2-4', zone: 'village', shape: { rect: [2112, 3712, 2624, 3936] }, kind: 'house', fate: 'new', label: 'Le jeune couple', who: 'Le fils du laboureur et sa jeune femme, mariés au printemps.', buildings: [[2432, 3744, 2592, 3840]] },
  // le bout sud, dans le quartier sud (au-delà de la ruelle du bord)
  { id: 's3-o1', zone: 'quartier-sud', shape: { rect: [2880, 0, 3264, 240] }, kind: 'house', fate: 'new', label: 'La lavandière', who: 'Une veuve lavandière et ses trois filles ; les draps du village sèchent dans sa cour.', buildings: [[3072, 40, 3232, 168]] },
  { id: 's3-o2', zone: 'quartier-sud', shape: { rect: [2880, 240, 3264, 480] }, kind: 'house', fate: 'new', label: 'Le vieux soldat', who: 'Un vieux soldat revenu des guerres, qui vit seul et raconte.', buildings: [[3104, 264, 3232, 360]] },
  { id: 's3-jardins', zone: 'quartier-sud', shape: { rect: [2688, 0, 2880, 480] }, kind: 'garden', fate: 'new', label: 'jardins', who: 'Potagers.' },
  { id: 's3-e1', zone: 'quartier-sud', shape: { rect: [3360, 0, 3936, 240] }, kind: 'house', fate: 'new', label: 'La sage-femme et le sabotier', who: 'La sage-femme et son mari le sabotier, leurs deux grands enfants.', buildings: [[3392, 40, 3584, 168]] },
  { id: 's3-e2', zone: 'quartier-sud', shape: { rect: [3360, 240, 3936, 480] }, kind: 'house', fate: 'new', label: 'Le berger', who: 'Le berger du village, qui vit seul avec ses chiens, au bout du village, près des prés.', house: 'h4-berger', buildings: [[3712, 264, 3808, 328]] },
  // ---------------------------------------------------------------- à l'ouest : la rue de la forge
  { id: 'forge', zone: 'village', shape: { rect: [1024, 1536, 1504, 2016] }, kind: 'smithy', fate: 'kept', label: 'La forge (existe)', who: 'La forge du village, déjà posée (plan forge.json), et la place réservée de la fonderie. Rien ne bouge.', buildings: [[1084, 1836, 1384, 1996]] },
  { id: 'o-n2', zone: 'village', shape: { rect: [1568, 1536, 2048, 2016] }, kind: 'house', fate: 'renamed', label: 'Le forgeron', who: "Le forgeron, célibataire : un artisan qui n'est pas pauvre. Sa maison à côté de sa forge.", house: 'h9-forgeron', buildings: [[1696, 1824, 1872, 1968]] },
  { id: 'o-n3', zone: 'village', shape: { rect: [2112, 1536, 2592, 2016] }, kind: 'shop', fate: 'renamed', label: 'Le boucher', who: "Le boucher, sa femme et leur fils (il vend aussi la viande du chasseur) : l'étal et la boutique au rez-de-chaussée, sur la rue ; le logis au-dessus ; l'échaudoir et le saloir dans la cour, derrière.", buildings: [[2240, 1824, 2432, 1984], [2272, 1632, 2432, 1728]] },
  { id: 'o-s1', zone: 'village', shape: { rect: [1024, 2240, 1504, 2720] }, kind: 'house', fate: 'renamed', label: 'Le laboureur', who: "Le laboureur, sa femme, leurs deux filles : il a deux bœufs et une vache, qu'il loue pour les labours ; « pas à plaindre, sans plus ». À l'entrée du village, au plus près des champs.", house: 'h7-laboureur', buildings: [[1088, 2272, 1418, 2410]], yards: [[1088, 2442, 1418, 2650]] },
  { id: 'o-s2', zone: 'village', shape: { rect: [1568, 2240, 2048, 2720] }, kind: 'house', fate: 'renamed', label: 'Le bouvier', who: 'Le bouvier de la ferme du riche (il mène les bœufs du coq), sa femme et leurs trois enfants.', buildings: [[1664, 2272, 1856, 2400]] },
  { id: 'o-s3', zone: 'village', shape: { rect: [2112, 2240, 2592, 2720] }, kind: 'house', fate: 'renamed', label: 'La veuve du menuisier', who: "La veuve de l'ancien menuisier et leurs deux enfants : la boutique de la place est fermée depuis sa mort, elle vit de son jardin et de journées.", buildings: [[2240, 2272, 2432, 2400]] },
  // ---------------------------------------------------------------- au nord : le quartier aisé, la maison du coq
  { id: 'aise-o1', zone: 'village', shape: { rect: [2432, 192, 3232, 800] }, kind: 'rich', fate: 'new', label: 'Le meunier', who: 'Le meunier, sa femme, leurs trois enfants et une servante : le moulin est hors du village, sur la rivière ; ils vivent au quartier aisé.', house: 'h8-meunier', buildings: [[2752, 320, 2992, 472]], yards: [[2752, 504, 3200, 768]] },
  { id: 'aise-o2', zone: 'village', shape: { rect: [2432, 832, 3232, 1408] }, kind: 'rich', fate: 'new', label: 'Le maquignon', who: "Le maquignon (le marchand de chevaux et de bœufs), sa femme et leurs deux fils : de l'argent qui vient des foires.", house: 'h10-maquignon', buildings: [[2912, 992, 3168, 1152]], yards: [[2496, 960, 2912, 1344]] },
  { id: 'aise-e1', zone: 'village', shape: { rect: [3392, 832, 3968, 1408] }, kind: 'rich', fate: 'new', label: 'Maison aisée (à venir)', who: 'Une troisième maison aisée, réservée : la famille sera à choisir (question du cadrage).' },
  {
    id: 'coq-jardin', zone: 'village', shape: { rect: [3392, 0, 3968, 800] }, kind: 'garden', fate: 'new',
    label: 'Le jardin du coq',
    who: 'Le magnifique jardin de la maison du coq : allées, parterres, verger, un bassin ; la clôture de fer forgé le long de la rue du nord.',
  },
  {
    id: 'coq', zone: 'ferme-du-riche', shape: { rect: [3392, 3392, 3968, 4000] }, kind: 'rich', fate: 'moved',
    label: 'La maison du coq',
    who: "Le coq (le maître de la ferme du riche), sa femme, leurs enfants : la maison de pierre taillée du chantier maison-coq, passée à l'est de la rue (le plan de travail de Grégoire), juste avant la cour de sa ferme, son jardin devant elle, vers la place.",
    buildings: [[3440, 3600, 3768, 3736]],
  },
  // ---------------------------------------------------------------- à l'est : le sire, la parcelle à décider
  { id: 'sire', zone: 'route-de-la-ville', shape: { rect: [32, 1568, 608, 2048] }, kind: 'public', fate: 'renamed', label: 'Le sire', who: "Le sire du village : le lieu officiel au rez-de-chaussée (la salle où il rend la justice et reçoit les redevances), son logis à l'étage, les réserves du village (grain, sel, le grenier) dans un bâtiment à côté ; son intendant loge chez lui ; le four banal et le puits du village sur sa parcelle, au bord de la route.", buildings: [[96, 1696, 384, 1888], [416, 1632, 576, 1888]] },
  { id: 'a-decider', zone: 'route-de-la-ville', shape: { rect: [32, 2240, 608, 2688] }, kind: 'free', fate: 'renamed', label: 'À décider', who: 'Parcelle libre, à décider.' },
  // ---------------------------------------------------------------- hors du village
  { id: 'guerisseuse', zone: 'bois-du-sud', shape: { rect: [1664, 448, 2048, 832] }, kind: 'house', fate: 'new', label: 'La guérisseuse', who: 'La guérisseuse, qui vit seule (elle et le chasseur ont une histoire qui n\'est pas officielle). Isolée côté forêt : dans la lisière, sur la rive est de la rivière, à 120 m au sud du chemin (un sentier part du cabanon du chasseur), à 160 m de la maison de Xéros et 480 m de la place.', house: 'h11-guerisseuse', buildings: [[1792, 576, 1936, 688]] },
  { id: 'moulin', zone: 'bois-du-nord', shape: { rect: [1504, 2400, 1888, 2720] }, kind: 'farm', fate: 'new', label: 'Le moulin', who: "Le moulin à eau du meunier, sur la rive est de la rivière, son bief et sa roue ; personne n'y dort (le meunier vit au village).", buildings: [[1536, 2496, 1728, 2656]] },
  { id: 'carriere', zone: 'ferme', shape: { rect: [1000, 1650, 1280, 1950] }, kind: 'farm', fate: 'new', label: 'La carrière', who: "La carrière de calcaire, sur le plateau (5 m plus haut), rive ouest, au nord du chemin creux : la pierre descend par le chemin." },
  { id: 'four-a-chaux', zone: 'ferme', shape: { rect: [1600, 1700, 1800, 1900] }, kind: 'farm', fate: 'new', label: 'Le four à chaux', who: 'Le four à chaux, rive est, au bord du chemin, en face de la carrière : la pierre de l\'autre côté du chemin creux, le bois de la lisière tout autour.' },
  { id: 'cabane-bucheron', zone: 'bois-du-nord', shape: { rect: [2000, 3300, 2240, 3540] }, kind: 'farm', fate: 'new', label: 'Cabane du bûcheron', who: "La cabane où vit le bûcheron, en lisière, près de l'eau (la cabane en rondins du jeu) ; sur la place, il n'a que sa boutique." },
  { id: 'etable-riche', zone: 'ferme-du-riche', shape: { rect: [3104, 2560, 3424, 2720] }, kind: 'farm', fate: 'new', label: 'Étables', who: 'Les étables de la ferme du riche, dans sa cour, à côté de la grange.' },
];

/** Ce qui sort de la carte avec ce plan (pour la planche « ce qui bouge »). */
export const REMOVED: { zone: ZoneId; rect: Rect; what: string }[] = [
  ...[[3473, 2184], [3362, 2295], [3206, 2295], [3095, 2184], [3095, 2028], [3206, 1917], [3362, 1917], [3473, 2028]].map(
    ([x, y]) => ({ zone: 'village' as ZoneId, rect: [x, y, x + 56, y + 44] as Rect, what: 'étal de la place (retiré)' })),
  ...[[2592, 64, 3232, 896], [3392, 64, 3968, 896], [2592, 960, 3232, 1760], [3392, 960, 3968, 1760]].map(
    ([x0, y0, x1, y1]) => ({ zone: 'village' as ZoneId, rect: [x0, y0, x1, y1] as Rect, what: 'parcelle de maison de riche (redécoupée)' })),
  ...[2528, 2816, 3104, 3392, 3680].flatMap((y) => [2848, 3392].map(
    (x) => ({ zone: 'village' as ZoneId, rect: [x, y, x + 384, y + 256] as Rect, what: 'parcelle de maison du quartier (redécoupée)' }))),
  ...[256, 544, 832, 1120, 1408, 1696].flatMap((y) => [2848, 3392].map(
    (x) => ({ zone: 'quartier-sud' as ZoneId, rect: [x, y, x + 384, y + 256] as Rect, what: 'parcelle de maison du quartier (retirée)' }))),
  { zone: 'route-de-la-ville', rect: [672, 1632, 1152, 2048], what: 'parcelle de la taverne (la taverne descend au sud)' },
  { zone: 'route-de-la-ville', rect: [672, 2240, 1152, 2688], what: 'parcelle réservée (retirée)' },
];
