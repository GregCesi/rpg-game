// Maquette de la chaumière (docs/maison-chaumiere.md) : le contrat de géométrie des éléments composés, sans dessin.
// Ces dessins sont des PROPOSITIONS : ils ne sont pas déclarés dans art/index.ts, le jeu ne les charge pas ; seuls les
// aperçus de la maquette les lisent (tools/lib/maison-preview.ts, `npm run maquette`).
//
// Repère de la maison, en cm : x vers l'est, y vers le sud, z vers le haut ; origine au coin nord-ouest du solin, au sol.
// Projection du jeu (docs/STYLE.md section 8, pièces `ground`) : un point (x, y, z) tombe à l'écran en (x / 5, (y − z) / 5).
// Une face tournée vers le sud se voit en vraie grandeur, un dessus à sa profondeur entière (gabarit H + D) : c'est la règle des
// pièces de bâtiment qui relient des appuis au sol (l'abri), pour que tout s'assemble à sa place réelle.
// Le bois se dessine à l'épaisseur de la pièce de bois du jeu (règle D étendue : la poutre de 20 × 20 cm fait 8 px de large
// debout, 10 px couchée), donc un mur de 20 cm se dessine sur 8 px d'épaisseur (`drawnWall`), centré sur son axe.
//
// Ancrage de chaque vue : le coin bas gauche de l'image est le point (x ouest, y sud, z bas) de la boîte dessinée de l'élément
// dans ce sens. Le compositeur pose l'image en (x0 / 5, (y_sud − z_bas) / 5) : le bas de l'image est le bord sud de l'élément,
// à sa hauteur (pas de rangées vides sous un élément en hauteur : c'est la pose qui le monte, comme le ferait le bac à sable).
//
// Vues (docs/objets/README.md) : r0 = l'élément tel qu'on le pose sur le mur sud (sa face extérieure vers le sud, vers nous) ;
// r1, r2, r3 = un quart de tour de plus à chaque fois, dans le sens des aiguilles d'une montre vu de dessus : r1 sa face
// extérieure vers l'ouest (posé sur le pignon ouest), r2 vers le nord (posé sur le mur nord : on voit sa face intérieure),
// r3 vers l'est (posé sur le pignon est). `symmetric` : r0 (est-ouest) et r1 (nord-sud) seulement.

/** Centimètres par pixel. */
export const CM = 5;
/** La grille : toute dimension, toute position. */
export const GRID = 20;
/** Projection d'un point de la maison (cm) à l'écran (px, non arrondis). */
export const project = (x: number, y: number, z: number): [number, number] => [x / CM, (y - z) / CM];

/** La maison, en cm (docs/maison-chaumiere.md, « couche par couche »). */
export const HOUSE = {
  /** Emprise extérieure du solin : 14,40 × 6,40 m (9 × 4 cases). */
  length: 1440,
  width: 640,
  /** Le solin : 60 cm d'épaisseur, 80 de haut dont 40 enterrés (4 assises de 20 cm), dessus à +40. */
  solin: { thick: 60, above: 40, below: 40, course: 20 },
  /** Axes des murs (le milieu du solin et de la sablière) : nord, sud, ouest, est. */
  axes: { north: 30, south: 610, west: 30, east: 1410 },
  /** Épaisseur réelle du mur de bois, et dessinée (règle D étendue). */
  wall: 20,
  drawnWall: 40,
  /** Hauteurs (z, cm) : dessus du solin, dessus de la sablière basse, dessous et dessus de la sablière haute, sol intérieur. */
  z: { solinTop: 40, plateLowTop: 60, plateHighBottom: 260, plateHighTop: 280, floor: 20, ground: 0 },
  /** Axes des poteaux : murs longs (x), pignons (y). Travées de 2 m, la dernière de 1,80 m ; pignons 1,80, 2,20, 1,80. */
  postsX: [30, 230, 430, 630, 830, 1030, 1230, 1410],
  postsY: [30, 210, 430, 610],
  /** Toit : pente de 50° (360 de haut pour 290 de demi-largeur d'axe en axe, 300 depuis la face du mur), couples tous les 60 cm. */
  roof: {
    rise: 360,
    run: 290,
    /** Croisée des chevrons (dessous du faîtage), au milieu : y, z. */
    ridge: { y: 320, z: 640 },
    /** Pied des chevrons au sud, 40 cm au-delà du mur : y, z (et au nord, en miroir autour de y = 320). */
    foot: { y: 660, z: 232 },
    /** Couverture : 40 cm de chaume ; bord bas de l'avant-toit et dessus au faîtage. */
    thatch: 40,
    eave: { y: 680, zBottom: 220, zTop: 285 },
    top: { y: 320, z: 720 },
    /** Le toit dépasse les pignons de 20 cm au-delà du solin : de x = −20 à x = 1460. */
    from: -20,
    to: 1460,
    couples: 24,
    spacing: 60,
  },
  /** Cheminée (plan A) : contre le pignon est, l'âtre ouvert vers l'ouest. Emprise x 1320..1440, y 220..420 ; dessus à +760. */
  chimney: { x: 1320, y: 220, w: 120, d: 200, top: 760, hearth: { w: 120, d: 60, h: 140 }, flue: 80 },
} as const;

/** Boîte dessinée (cm) d'un élément dans une vue : largeur (x), profondeur (y), hauteur (z). */
export interface ViewBox {
  w: number;
  d: number;
  h: number;
}

/** Taille de l'image qui suit de la boîte dessinée (gabarit H + D) : largeur w / 5, hauteur (d + h) / 5. */
export const imageSize = (b: ViewBox): { w: number; h: number } => ({ w: Math.round(b.w / CM), h: Math.round((b.d + b.h) / CM) });

/**
 * Où tombe dans l'image un point de l'élément donné dans sa boîte (cm, depuis le coin ouest, nord, bas de la boîte) : colonne
 * lx / 5, rangée (ly + h − lz) / 5. L'image est la projection de toute la boîte : un élément en pente (toit, chevron) laisse
 * des rangées vides là où sa boîte ne contient rien.
 */
export const pixel = (b: ViewBox, lx: number, ly: number, lz: number): [number, number] => [lx / CM, (ly + b.h - lz) / CM];

/** Une vue de l'élément : r0 à r3. */
export type View = 'r0' | 'r1' | 'r2' | 'r3';
/** Le sens d'une vue : r0, r2 courent d'est en ouest ; r1, r3 du nord au sud. */
export const alongX = (v: View) => v === 'r0' || v === 'r2';

/**
 * Les boîtes dessinées des éléments (cm), par vue. `length` : la longueur de l'élément le long de son mur (la travée, d'axe
 * en axe, pour un pan ; la longueur du morceau pour le solin, le faîtage, le toit, la cloison).
 * Un pan est dessiné avec ses deux poteaux (partagés avec les pans voisins : sa recette en compte un demi de chaque côté),
 * soit sa travée plus un demi-poteau dessiné (20 cm) de chaque côté.
 */
export const BOXES = {
  /** Morceau de solin : 60 d'épaisseur, 40 hors sol. */
  solin: (v: View, length: number): ViewBox => (alongX(v) ? { w: length, d: 60, h: 40 } : { w: 60, d: length, h: 40 }),
  /** Pan de mur (plein, clayonnage, angle, fenêtre) : de la sablière basse (z 40) au-dessus de la sablière haute (z 280). */
  pan: (v: View, length: number): ViewBox =>
    alongX(v) ? { w: length + 40, d: HOUSE.drawnWall, h: 240 } : { w: HOUSE.drawnWall, d: length + 40, h: 240 },
  /** Pan avec porte : il descend jusqu'au sol (z 0), le seuil de pierre de taille compris. */
  door: (v: View, length: number): ViewBox =>
    alongX(v) ? { w: length + 40, d: HOUSE.drawnWall, h: 280 } : { w: HOUSE.drawnWall, d: length + 40, h: 280 },
  /** Cloison intérieure : du sol intérieur (z 20) au-dessus de l'entrait (z 280). */
  partition: (v: View, length: number): ViewBox =>
    alongX(v) ? { w: length, d: HOUSE.drawnWall, h: 260 } : { w: HOUSE.drawnWall, d: length, h: 260 },
  /** Pignon : le triangle au-dessus de la sablière haute (z 280), 580 d'axe en axe + les chevrons de rive, 380 de haut. */
  gable: (v: View): ViewBox => (alongX(v) ? { w: 620, d: HOUSE.drawnWall, h: 380 } : { w: HOUSE.drawnWall, d: 620, h: 380 }),
  /**
   * Couple de chevrons (deux perches croisées, l'entrait retroussé) : de pied en pied 680 (40 au-delà de chaque mur), du pied
   * (z 232) au-dessus de la croisée (z 680). r1 / r3 (le couple dans un plan est-ouest : toit au faîtage nord-sud) le montrent
   * de face ; r0 / r2 (notre maison, faîtage est-ouest) le montrent par la tranche : une perche de 12 cm dessinée sur 6 px,
   * dans une boîte de 30 cm de large, sur toute la profondeur, du pied sud au pied nord.
   */
  couple: (v: View): ViewBox => (alongX(v) ? { w: 30, d: 680, h: 448 } : { w: 680, d: 30, h: 448 }),
  /**
   * Pan de toit (la couverture de chaume d'un versant) : `length` le long du faîtage. r0 : le versant sud, de l'avant-toit
   * (y 680, z 220) au faîtage (y 320, z 720). r2 : le versant nord, vu depuis le sud (caché derrière le faîtage dans la maison).
   * r1, r3 : le versant tourné vers l'ouest ou vers l'est (maison au faîtage nord-sud).
   */
  roof: (v: View, length: number): ViewBox => (alongX(v) ? { w: length, d: 360, h: 500 } : { w: 360, d: length, h: 500 }),
  /** Faîtage : la terre sur un boudin de paille, 40 de large, 30 de haut, posé sur le haut des deux versants. */
  ridge: (v: View, length: number): ViewBox => (alongX(v) ? { w: length, d: 40, h: 30 } : { w: 40, d: length, h: 30 }),
  /** Cheminée : 200 × 120 au sol (r0 : l'âtre ouvert vers le sud), du sol (z 0) à +760. */
  chimney: (v: View): ViewBox => (alongX(v) ? { w: 200, d: 120, h: 760 } : { w: 120, d: 200, h: 760 }),
} as const;

/**
 * Un élément composé proposé, tel que l'exporte un module de art/proposals/ (`ELEMENTS`). Ses images sont dessinées avec la
 * palette `world` (art/palette.ts), à la taille `imageSize(box(view, length))` exactement, ancrées comme dit plus haut.
 */
export interface ProposedElement {
  key: string;
  /** Nom affiché, en français. */
  name: string;
  /** Symétrie : deux vues (r0 est-ouest, r1 nord-sud) ou quatre. */
  views: 'symmetric' | 'four';
  /** Longueurs (cm) à montrer dans l'aperçu ; absent : l'élément n'a qu'une taille (pignon, couple, cheminée). */
  lengths?: number[];
  /** États à montrer (le pan en clayonnage, puis enduit de torchis) ; absent : un seul. */
  states?: string[];
  box: (view: View, length: number) => ViewBox;
  /** L'image d'une vue, à une longueur (sur la grille) et dans un état. */
  draw: (view: View, length: number, state?: string) => string[];
}
