// ESSAI (chantier « maison du coq », hors jeu, jamais chargé par le jeu) : le catalogue des pièces de la version A, une par une,
// tel que Grégoire veut le valider avant tout (retour du 4 novembre 2026). Une seule source : la planche-catalogue
// (tools/essai-coq-catalogue.ts, dessins du pixel-artist dans art/proposals/coq-catalogue-*.ts) et le tableau de CADRAGE-coq.md
// section 9 en sortent tous deux.
//
// Pour chaque pièce : sa clé proposée (anglais, kebab-case, celle qu'elle aurait dans props.json ou wood.json), son nom, ses
// dimensions (cm, la convention de `Dims` de src/content/gabarit.ts : w est-ouest, d nord-sud, h ; `ground` pour une pièce de
// bâtiment qui relie des appuis), sa matière et son remplissage (la masse en découle, comme `mass.ts` : volume × densité × fill),
// ses vues (la convention de props.json : `four`, `symmetric`, `round`), si elle existe déjà dans le jeu (`existing` : sa clé),
// combien la maison en demande (ordre de grandeur), et ce qu'il faut savoir.
//
// Les densités sont celles du contenu (src/content/rocks.json : le calcaire, 2 400 kg/m³ ; matters.json : le bois vert, 900) ; le
// fer (7 870) est celui que la branche forge ajoute à matters.json : il n'est pas encore au jeu.

import { expectedSize, type Dims } from '../../src/content/gabarit';

export const DENSITY = { stone: 2400, wood: 900, iron: 7870 } as const;
export type Matter = keyof typeof DENSITY | 'fixed';

export type Group = 'pierre' | 'sols' | 'charpente' | 'toit' | 'escalier' | 'baies' | 'cloisons' | 'cheminees' | 'meubles';
export const GROUPS: { key: Group; title: string }[] = [
  { key: 'pierre', title: 'La pierre de taille (assises de 30 cm)' },
  { key: 'sols', title: 'Les sols' },
  { key: 'charpente', title: 'La charpente et le plancher' },
  { key: 'toit', title: 'Le toit' },
  { key: 'escalier', title: "L'escalier et la trémie" },
  { key: 'baies', title: 'Les baies (croisée, demi-croisée, porte)' },
  { key: 'cloisons', title: 'Les refends et la cloison' },
  { key: 'cheminees', title: 'Les cheminées' },
  { key: 'meubles', title: 'Les meubles nouveaux et les tentures' },
];

export interface Piece {
  key: string;
  name: string;
  group: Group;
  dims: Dims;
  matter: Matter;
  /** Part pleine de la boîte (1 : un bloc plein). */
  fill?: number;
  /** Masse donnée (kg) quand la matière n'est pas une densité (`fixed` : la laine, le verre et le plomb). */
  kg?: number;
  views: 'four' | 'symmetric' | 'round';
  /** La pièce existe déjà dans le jeu : sa clé (props.json, items.json, ou un aspect de `wood-piece` dans wood.json). */
  existing?: string;
  /** Un nouvel aspect de la pièce de bois (wood.json), pas une nouvelle clé (CLAUDE.md : « un nouveau bois = un état »). */
  woodLook?: boolean;
  /** La seule lauze du jeu (réponse 26 de Grégoire) : elle remplacera celle de la forge quand la maison s'intégrera. */
  forge?: boolean;
  /** Combien la maison en demande (ordre de grandeur). */
  count: string;
  note: string;
}

const stone = (fill = 1) => ({ matter: 'stone' as const, fill });
const wood = (fill = 1) => ({ matter: 'wood' as const, fill });
const B = (w: number, d: number, h: number, ground = false): Dims => ({ w, d, h, shape: 'box', ...(ground ? { ground } : {}) });

export const PIECES: Piece[] = [
  // ---------------- la pierre ----------------
  // les carreaux de 50, 70 et 90 cm et la boutisse de 40 de face (réponse 24 de Grégoire) : les longueurs du parement validé
  // (`ashlarWall`), les joints tiennent à 15 cm d'une assise à l'autre (art/proposals/coq-integration-mur.ts, `ASHLAR_COURSE`)
  { key: 'ashlar-block-50', name: 'carreau de 50', group: 'pierre', dims: B(50, 20, 30), ...stone(), views: 'symmetric', count: 'environ 700',
    note: 'le bloc de parement court : face layée, ciselure aux arêtes ; le lit et le dos bruts (noyés dans le mur)' },
  { key: 'ashlar-block-70', name: 'carreau de 70', group: 'pierre', dims: B(70, 20, 30), ...stone(), views: 'symmetric', count: 'environ 1 000',
    note: 'le bloc courant du moyen appareil' },
  { key: 'ashlar-block-90', name: 'carreau de 90', group: 'pierre', dims: B(90, 20, 30), ...stone(), views: 'symmetric', count: 'environ 600',
    note: 'le grand bloc ; les trois longueurs et la boutisse décalent les joints d’au moins 15 cm d’une assise à l’autre' },
  { key: 'ashlar-header', name: 'boutisse', group: 'pierre', dims: B(40, 60, 30), ...stone(), views: 'symmetric', count: 'environ 450',
    note: 'traverse le mur de 60 cm (une face de 40 cm de chaque côté) : elle lie les deux parements, une tous les 1,20 m environ par assise' },
  { key: 'ashlar-quoin', name: "pierre d'angle", group: 'pierre', dims: B(60, 40, 30), ...stone(), views: 'four', count: '72 (4 angles × 18 assises)',
    note: 'chaîne d’angle en harpe : deux faces vues (60 et 40), posée tournée d’un quart de tour d’une assise à l’autre' },
  { key: 'ashlar-jamb', name: 'pierre de tableau', group: 'pierre', dims: B(40, 60, 30), ...stone(), views: 'four', count: 'environ 90',
    note: 'le bord d’une baie : arête chanfreinée dehors, feuillure du volet dedans ; alternée en harpe avec un carreau' },
  { key: 'ashlar-string-course', name: 'cordon', group: 'pierre', dims: B(60, 30, 20), ...stone(0.95), views: 'four', count: '78 (46 m de façade)',
    note: 'la moulure du niveau de l’étage (z 270-290) : 10 cm de débord, un larmier dessous ; 20 cm portent sur le mur' },
  { key: 'ashlar-corbel', name: 'corbeau', group: 'pierre', dims: B(30, 40, 30), ...stone(0.8), views: 'four', count: '22',
    note: 'console en quart de rond, 20 cm dans le mur, 20 cm dehors : porte la muraillère du plancher et les hottes' },
  { key: 'ashlar-slope-block', name: 'bloc biais', group: 'pierre', dims: B(60, 20, 30), ...stone(0.75), views: 'four', count: 'environ 80',
    note: 'carreau taillé à 45° : le bout des assises sous les rampants des pignons et des refends, la retraite des hottes' },
  { key: 'gable-coping', name: 'dalle de rampant', group: 'pierre', dims: B(60, 70, 15), ...stone(), views: 'four', count: '36 (4 rampants de 4,80 m)',
    note: 'le couronnement du pignon découvert, posé à 45° sur les blocs biais, 5 cm de débord de chaque côté, un larmier' },
  { key: 'threshold-stone', name: 'seuil de pierre', group: 'pierre', dims: B(120, 50, 20), ...stone(0.95), views: 'symmetric', existing: 'threshold-stone', count: '1',
    note: 'le seuil de la porte d’entrée (existe : la maison de Xéros) ; 50 cm pour un mur de 60, il dépasse de 10 cm vers la rue' },
  { key: 'inner-threshold-stone', name: 'seuil intérieur', group: 'pierre', dims: B(120, 30, 20), ...stone(0.95), views: 'symmetric', existing: 'inner-threshold-stone', count: '5',
    note: 'existe ; 30 cm pour un refend de 40 : 10 cm de dalle autour, à juger sur la planche (sinon un seuil de 40, nouveau)' },

  // ---------------- les sols ----------------
  { key: 'floor-flagstone', name: 'dalle de sol', group: 'sols', dims: B(60, 40, 8), ...stone(), views: 'symmetric', count: 'environ 230 (55 m²)',
    note: 'calcaire scié et layé, posé au mortier sur un lit de sable : la salle et le passage ; `walk: true`' },
  { key: 'wood-piece:big:plank', name: 'planche de plancher', group: 'sols', dims: B(400, 25, 3), ...wood(), views: 'symmetric', existing: 'wood-piece (gros, planche)', count: 'environ 85 (8 rangs de 22 planches de 4 m)',
    note: 'la planche du gros (25 × 3), existe ; clouée sur les solives, de 4 m (huit solives) ; `walk: true`' },
  { key: 'packed-earth', name: 'terre battue (rappel)', group: 'sols', dims: { w: 100, d: 100, h: 1, shape: 'flat' }, matter: 'fixed', kg: 0, views: 'round', existing: 'le sol calculé des intérieurs (world/buildingFloor.ts)', count: 'la cuisine (26 m²)',
    note: 'pas une pièce : le sol que le jeu calcule sous un bâtiment ; rappel pour comparer' },

  // ---------------- la charpente et le plancher ----------------
  { key: 'wood-piece:normal:beam-560', name: 'solive', group: 'charpente', dims: { w: 560, d: 20, h: 20, shape: 'box', ground: true }, ...wood(), views: 'symmetric', existing: 'wood-piece (normal, poutre)', count: '30 (tous les 50 cm)',
    note: 'la poutre du normal équarrie (20 × 20), existe ; nord-sud, de muraillère à muraillère, 20 cm d’appui de chaque côté' },
  { key: 'wood-piece:normal:beam-wallplate', name: 'muraillère', group: 'charpente', dims: { w: 480, d: 20, h: 20, shape: 'box', ground: true }, ...wood(), views: 'symmetric', existing: 'wood-piece (normal, poutre)', count: '8 (deux files, les pièces entées)',
    note: 'la poutre posée sur les corbeaux le long des murs nord et sud, qui porte le bout des solives (remplace l’encastrement de 10 cm du premier cadrage)' },
  { key: 'wood-piece:normal:beam-120', name: 'chevêtre', group: 'charpente', dims: { w: 120, d: 20, h: 20, shape: 'box', ground: true }, ...wood(), views: 'symmetric', existing: 'wood-piece (normal, poutre)', count: '2',
    note: 'les deux poutres courtes qui bordent la trémie au nord et au sud, assemblées à tenon et mortaise dans les solives d’enchevêtrure' },
  { key: 'wood-piece:normal:beam-purlin', name: 'panne', group: 'charpente', dims: { w: 500, d: 20, h: 20, shape: 'box', ground: true }, ...wood(), views: 'symmetric', existing: 'wood-piece (normal, poutre)', count: '15 (faîtière et deux pannes par pan, 5 travées)',
    note: 'portée par les pignons, les deux refends et une ferme au-dessus de la salle : travées de 4,60, 2,20, 4,80 et 2,60 m, sous les 5,80 m du normal' },
  { key: 'wood-piece:normal:beam-tie', name: 'entrait (une moitié)', group: 'charpente', dims: { w: 360, d: 20, h: 20, shape: 'box', ground: true }, ...wood(), views: 'symmetric', existing: 'wood-piece (normal, poutre)', count: '2 (entées)',
    note: 'la ferme de la salle (x 1300) : son entrait de 6,60 m est fait de deux poutres de 3,60 m réunies par une enture (l’assemblage existe), posé sur les sablières' },
  { key: 'wood-piece:normal:beam-principal', name: 'arbalétrier', group: 'charpente', dims: { w: 20, d: 355, h: 355, shape: 'box', ground: true }, ...wood(0.0762), views: 'four', existing: 'wood-piece (normal, poutre)', count: '2',
    note: 'les deux bras de la ferme à 45° (4,80 m), à tenon et mortaise dans l’entrait et le poinçon ; ils portent les pannes' },
  { key: 'wood-piece:normal:beam-kingpost', name: 'poinçon', group: 'charpente', dims: { w: 20, d: 20, h: 340, shape: 'box', ground: true }, ...wood(), views: 'symmetric', existing: 'wood-piece (normal, poutre, debout)', count: '1',
    note: 'la pièce debout au milieu de la ferme, de l’entrait au faîte : elle porte la panne faîtière' },
  { key: 'wood-piece:normal:beam-plate', name: 'sablière', group: 'charpente', dims: { w: 560, d: 20, h: 20, shape: 'box', ground: true }, ...wood(), views: 'symmetric', existing: 'wood-piece (normal, poutre)', count: '6',
    note: 'sur l’arase des murs gouttereaux (z 545) : le pied des chevrons s’y appuie' },
  { key: 'wood-piece:normal:rafter', name: 'chevron', group: 'charpente', dims: { w: 10, d: 347, h: 347, shape: 'box', ground: true }, ...wood(0.0399), views: 'four', woodLook: true, count: '82 (tous les 40 cm, deux pans)',
    note: 'NOUVEL ASPECT du bois (wood.json) : le carrelet de 10 × 10, tiré d’une poutre du normal fendue en quatre ; 4,80 m posé à 45°' },
  { key: 'wood-piece:pole:lath', name: 'latte', group: 'charpente', dims: B(400, 6, 3), ...wood(), views: 'symmetric', existing: 'wood-piece (perche, latte)', count: 'environ 120 (un rang par rang de laves)',
    note: 'la latte de la perche fendue, existe ; clouée sur les chevrons, un rang tous les 18 cm environ ; les laves y pendent par une cheville' },

  // ---------------- le toit ----------------
  { key: 'stone-slate', name: 'lave', group: 'toit', dims: B(40, 50, 4), ...stone(0.8), views: 'symmetric', forge: true, count: 'environ 5 000 (170 m², 3 épaisseurs)',
    note: 'À REPRENDRE DE LA FORGE : une seule lauze au jeu ; naturelle (deux formes, taille ± 20 %), percée d’un trou de cheville' },
  { key: 'ridge-stone', name: 'faîtière de pierre', group: 'toit', dims: B(40, 60, 20), ...stone(0.5), views: 'symmetric', count: '41 (16,40 m de faîte)',
    note: 'taillée en bâtière (un V renversé), posée à cheval au mortier sur les dernières laves' },
  { key: 'chimney-cap', name: 'couronnement', group: 'toit', dims: { w: 140, d: 100, h: 10, shape: 'box', ground: true }, ...stone(0.83), views: 'symmetric', existing: 'chimney-cap', count: '2',
    note: 'existe ; la souche elle-même se monte en carreaux (le conduit de moellons de Xéros, `chimney-flue`, ne sert pas ici)' },
  { key: 'dormer-pediment', name: 'fronton de lucarne', group: 'toit', dims: B(120, 30, 70), ...stone(0.5), views: 'four', count: '1',
    note: 'le petit pignon triangulaire monolithe de la lucarne du grenier, sur deux pierres de tableau et un linteau' },
  { key: 'hoist-beam', name: 'potence à poulie', group: 'toit', dims: B(20, 100, 20), ...wood(0.9), views: 'four', count: '1',
    note: 'le bout de poutre qui sort de la lucarne, sa poulie de bois et sa corde (le rouleau de corde existe)' },

  // ---------------- l'escalier ----------------
  { key: 'stone-step', name: 'marche de pierre', group: 'escalier', dims: B(100, 30, 19), ...stone(), views: 'four', count: '14',
    note: 'monolithe : 26 cm de giron, 4 cm de recouvrement sur la marche du dessous, le nez arrondi au sud ; `walk: true`' },
  { key: 'stair-stringer-block', name: "pierre d'échiffre", group: 'escalier', dims: B(60, 20, 30), ...stone(0.8), views: 'four', count: 'environ 20',
    note: 'le carreau du haut du mur d’échiffre, entaillé en crémaillère sous les marches ; le dessous de l’escalier est un massif plein' },
  { key: 'wood-piece:normal:post', name: 'poteau de garde-corps', group: 'escalier', dims: B(10, 10, 100), ...wood(), views: 'symmetric', woodLook: true, count: '4',
    note: 'le carrelet (10 × 10) debout, tenon dans le plancher' },
  { key: 'wood-piece:normal:rail', name: 'main courante', group: 'escalier', dims: B(280, 10, 10), ...wood(), views: 'symmetric', woodLook: true, count: '2 (280 et 100 cm)',
    note: 'le carrelet couché, assemblé à mi-bois sur les poteaux ; une lisse basse pareille à 10 cm du plancher' },
  { key: 'wood-piece:pole:lath-baluster', name: 'balustre', group: 'escalier', dims: B(6, 3, 80), ...wood(), views: 'symmetric', existing: 'wood-piece (perche, latte, debout)', count: '24 (tous les 15 cm)',
    note: 'la latte debout entre la lisse basse et la main courante : un enfant ne passe pas' },

  // ---------------- les baies ----------------
  { key: 'window-sill', name: 'appui de baie', group: 'baies', dims: B(125, 30, 15), ...stone(), views: 'four', count: '11',
    note: 'un seul appui pour la croisée et la demi-croisée (toutes deux de 1,05 m de jour) : larmier dehors, 10 cm encastré de chaque côté' },
  { key: 'window-lintel', name: 'linteau de baie', group: 'baies', dims: B(145, 30, 30), ...stone(), views: 'four', count: '12',
    note: 'monolithe, 20 cm d’appui de chaque côté, chanfrein dehors ; derrière lui, un arrière-linteau de bois (une poutre du normal)' },
  { key: 'mullion-low', name: 'meneau du bas', group: 'baies', dims: B(15, 20, 90), ...stone(), views: 'symmetric', count: '6',
    note: 'la croisée : le meneau en deux pièces, celle du bas de l’appui à la traverse, chanfreinée' },
  { key: 'mullion-high', name: 'meneau du haut', group: 'baies', dims: B(15, 20, 55), ...stone(), views: 'symmetric', count: '6',
    note: 'de la traverse au linteau' },
  { key: 'transom', name: 'traverse', group: 'baies', dims: B(105, 20, 15), ...stone(), views: 'symmetric', count: '11',
    note: 'd’un tableau à l’autre, d’une pièce ; la même pour les deux baies (à 90 cm du bas dans la croisée, 80 dans la demi-croisée)' },
  { key: 'leaded-glass', name: 'vitrail en losanges', group: 'baies', dims: B(45, 3, 55), matter: 'fixed', kg: 4, views: 'symmetric', count: '12 (croisées) + 5 (impostes des demi-croisées, 105 × 45)',
    note: 'losanges de verre vert pâle sertis de plomb, dans la feuillure de la pierre ; 3 kg de verre et 1 kg de plomb (le verrier de la ville)' },
  { key: 'casement-shutter', name: 'volet de croisée', group: 'baies', dims: B(45, 3, 90), ...wood(0.9), views: 'four', count: '22',
    note: 'volet intérieur de planches sur deux barres, ses gonds dans la pierre ; deux états (`swing`), comme le volet de Xéros (`plank-shutter`, 60 × 40)' },
  { key: 'window-bar', name: 'barreau de fer', group: 'baies', dims: B(3, 3, 90), matter: 'iron', fill: 0.7, views: 'round', count: '20 (4 par demi-croisée)',
    note: 'scellé au plomb dans l’appui et la traverse, devant le jour du bas des demi-croisées ; le fer est celui de la forge (matters.json)' },
  { key: 'door-voussoir', name: "claveau de l'arc", group: 'baies', dims: B(30, 60, 30), ...stone(0.73), views: 'four', count: '6',
    note: 'plein cintre de 1,10 m : trois claveaux taillés en coin de chaque côté de la clef de 50 cm, chanfreinés, de toute l’épaisseur du mur ; 0,73 de plein (le sommier porte les dix premiers degrés, réponse 27)' },
  { key: 'door-keystone', name: 'clef au coq', group: 'baies', dims: B(50, 60, 50), ...stone(0.92), views: 'four', count: '1',
    note: 'la clef passante de l’arc (réponse 25) : flancs droits, dessous en arc (0,92 de plein), elle dépasse l’extrados de 15 cm ; le coq validé (8 × 6 px) sculpté en relief sur sa face sud' },
  { key: 'door-springer', name: "sommier de l'arc", group: 'baies', dims: B(40, 60, 30), ...stone(0.95), views: 'four', count: '2',
    note: 'le haut des deux tableaux de la porte, d’où l’arc part (le premier lit taillé en biais)' },
  { key: 'oak-arch-door', name: 'porte de chêne en arc', group: 'baies', dims: B(110, 8, 220, true), ...wood(0.93), views: 'four', count: '1 (et son état ouvert)',
    note: 'deux épaisseurs de planches croisées, cloutées, le haut en plein cintre, le heurtoir ; `swing`, `passage`' },

  // ---------------- les refends et la cloison ----------------
  { key: 'ashlar-header-40', name: 'boutisse de refend', group: 'cloisons', dims: B(40, 40, 30), ...stone(), views: 'symmetric', count: 'environ 200',
    note: 'les refends (40 cm) sont deux carreaux dos à dos liés par ces boutisses (40 de face, comme la boutisse du mur : le même tirage) ; la cloison de l’étage est en pan de bois (réponse 19)' },
  { key: 'wood-piece:normal:beam-inner-lintel', name: 'linteau de porte intérieure', group: 'cloisons', dims: { w: 130, d: 20, h: 20, shape: 'box', ground: true }, ...wood(), views: 'symmetric', existing: 'wood-piece (normal, poutre)', count: '10 (deux par porte)',
    note: 'deux poutres côte à côte au-dessus de la porte de 90 cm dans le refend de 40 cm' },
  { key: 'inner-door', name: 'porte intérieure', group: 'cloisons', dims: B(90, 5, 180, true), ...wood(0.6), views: 'four', existing: 'inner-door', count: '5',
    note: 'existe (la maison de Xéros) ; dans son huisserie' },

  // ---------------- les cheminées ----------------
  { key: 'fireplace-jamb', name: 'jambage de cheminée', group: 'cheminees', dims: B(40, 50, 110), ...stone(), views: 'four', count: '2 (la salle)',
    note: 'monolithe, mouluré en façade, sa base en socle ; 528 kg : un engin de levage (une chèvre) ou plusieurs hommes' },
  { key: 'fireplace-console', name: 'console de hotte', group: 'cheminees', dims: B(40, 60, 30), ...stone(0.7), views: 'four', count: '2 (la salle)',
    note: 'la console moulurée sur le jambage, qui porte le manteau en encorbellement' },
  { key: 'mantel-voussoir', name: 'claveau de manteau', group: 'cheminees', dims: B(30, 40, 40), ...stone(0.9), views: 'four', count: '8 (la salle, 2,40 m)',
    note: 'le manteau en plate-bande : des claveaux à joints rayonnants, droits dessous (pas de pierre de 2,40 m d’une pièce)' },
  { key: 'fireback', name: 'contrecœur', group: 'cheminees', dims: B(120, 10, 100), ...stone(), views: 'symmetric', count: '3',
    note: 'la dalle debout au fond du foyer, qui prend le feu (le mur derrière ne brûle pas)' },
  { key: 'small-fireplace-jamb', name: 'jambage de cheminée de chambre', group: 'cheminees', dims: B(30, 40, 100), ...stone(), views: 'four', count: '2',
    note: 'plus petit, sans console : la chambre du coq' },
  { key: 'small-fireplace-lintel', name: 'linteau de cheminée de chambre', group: 'cheminees', dims: B(160, 30, 30), ...stone(), views: 'four', count: '1',
    note: 'monolithe (1,60 m), chanfreiné, sur les deux jambages' },
  { key: 'wood-piece:normal:beam-mantel', name: 'poutre de manteau', group: 'cheminees', dims: { w: 260, d: 20, h: 20, shape: 'box', ground: true }, ...wood(), views: 'symmetric', existing: 'wood-piece (normal, poutre)', count: '1 (la cuisine)',
    note: 'la cuisine : la hotte de carreaux portée par une poutre de chêne sur deux corbeaux, au-dessus de l’âtre' },
  { key: 'stone-hearth', name: 'âtre', group: 'cheminees', dims: B(220, 110, 150, true), ...stone(0.42), views: 'four', existing: 'stone-hearth', count: '1 (la cuisine)',
    note: 'existe (la maison de Xéros) : l’âtre de la cuisine' },
  { key: 'stone-sink', name: 'évier de pierre', group: 'cheminees', dims: B(80, 50, 15), ...stone(0.7), views: 'four', count: '1 (la cuisine)',
    note: 'la pierre creusée en cuvette, son déversoir qui traverse le mur nord ; sur deux carreaux debout' },
  { key: 'stove-slab', name: 'dalle de potager', group: 'cheminees', dims: B(120, 60, 12), ...stone(0.85), views: 'four', count: '1 (la cuisine)',
    note: 'le potager : une dalle percée de deux réchauds (la braise de l’âtre), sur des carreaux' },

  // ---------------- les meubles et les tentures ----------------
  { key: 'canopy-bed', name: 'lit à courtines', group: 'meubles', dims: B(160, 210, 200), ...wood(0.02), views: 'four', count: '1',
    note: 'colonnes de chêne, le ciel de drap rouge, les courtines, la couverture bleue' },
  { key: 'dresser', name: 'dressoir', group: 'meubles', dims: B(100, 45, 180), ...wood(0.1), views: 'four', count: '1',
    note: 'le bas fermé de deux portes, les tablettes, les étains debout' },
  { key: 'high-chair', name: 'chaise à haut dossier', group: 'meubles', dims: B(55, 50, 130), ...wood(0.08), views: 'four', count: '1',
    note: 'la chaise du coq, son coussin rouge' },
  { key: 'kneading-trough', name: 'pétrin', group: 'meubles', dims: B(150, 60, 80), ...wood(0.12), views: 'four', count: '1',
    note: 'la huche à pâte sur ses pieds, son couvercle de planches' },
  { key: 'writing-desk', name: 'écritoire', group: 'meubles', dims: B(90, 60, 90), ...wood(0.08), views: 'four', count: '1',
    note: 'la table et son pupitre incliné, quelques livres, la chandelle (la bougie existe) ; 90 cm : le haut du pupitre et des livres (réponse 27)' },
  { key: 'tailor-table', name: 'table de tailleuse', group: 'meubles', dims: B(140, 70, 75), ...wood(0.05), views: 'four', count: '1',
    note: 'les coupons pliés, les ciseaux, le panier à ouvrage' },
  { key: 'cloth-bolt', name: "coupon d'étoffe", group: 'meubles', dims: B(40, 30, 10), matter: 'fixed', kg: 2, views: 'symmetric', count: 'quelques-uns',
    note: 'drap rouge, laine bleue, lin : un objet qu’on prend (la fille tailleuse)' },
  { key: 'pewter', name: 'étains (plat, pichet)', group: 'meubles', dims: B(30, 30, 25), matter: 'fixed', kg: 2, views: 'round', count: '6',
    note: 'la vaisselle d’étain du dressoir' },
  { key: 'bed:unmade', name: 'lit défait (état)', group: 'meubles', dims: B(150, 200, 80), ...wood(0.03), views: 'four', existing: 'bed', count: '1 (le fainéant)',
    note: 'le lit existe (le lit de la mère) ; défait est un état de plus, ses quatre vues (règle des objets à plusieurs états)' },
  { key: 'verdure-tapestry', name: 'verdure au coq', group: 'meubles', dims: B(240, 5, 160), matter: 'fixed', kg: 8, views: 'four', count: '1 (la salle)',
    note: 'tapisserie de laine (feuillages, le coq) ; pendue par des anneaux à une tringle de fer' },
  { key: 'wall-hanging', name: 'tenture', group: 'meubles', dims: B(160, 5, 120), matter: 'fixed', kg: 3, views: 'four', count: '1 (la chambre)',
    note: 'drap teint à la garance, une bordure simple' },
  { key: 'hanging-rod', name: 'tringle de fer', group: 'meubles', dims: B(260, 6, 8), matter: 'iron', fill: 0.03, views: 'symmetric', count: '2',
    note: 'la barre et ses deux pattes scellées dans le mur' },
];

/** La masse d'une pièce (kg), comme src/content/mass.ts : le volume de sa boîte × la densité × la part pleine. */
export function massOf(p: Piece): number {
  if (p.matter === 'fixed') return p.kg ?? 0;
  const { w, d, h } = p.dims;
  return (w / 100) * (d / 100) * (h / 100) * DENSITY[p.matter] * (p.fill ?? 1);
}

/** Les dimensions d'une vue tournée d'un quart de tour (R1, R3) : est-ouest et nord-sud échangés. */
export const turned = (d: Dims): Dims => ({ ...d, w: d.d, d: d.w });

/** La taille attendue (px) d'une vue : R0 et R2 selon `dims`, R1 et R3 tournées. */
export const expectedOf = (p: Piece, r: 0 | 1 | 2 | 3) => expectedSize(r % 2 ? turned(p.dims) : p.dims);

/** Ce que Xéros porte seul (src/content/strength.json, `carry`). */
export const CARRY = 70;
