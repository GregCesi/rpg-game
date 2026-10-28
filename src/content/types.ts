// Formats du contenu du jeu. Le contenu (cartes, tuiles, objets) est de la donnée JSON :
// on en ajoute sans toucher au moteur.

/** Un caractère de carte -> une ou plusieurs tuiles (variantes tirées au hasard, de façon stable). */
export interface TileDef {
  tiles: string[];
  solid?: boolean;
  /** Choisit la tuile selon les voisins identiques : `${autotile}-${masque N=1 E=2 S=4 O=8}`. */
  autotile?: string;
}

/** Rectangle en pixels, dans le repère de l'image (0,0 = coin haut gauche). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Un caractère de la couche objets -> un objet posé (arbre, rocher, maison, meuble...). */
export interface PropDef {
  name: string;
  image: string;
  /** 'center' (défaut) : l'image est centrée sur la case. 'left' : son coin bas gauche est posé sur le coin bas gauche de la case. */
  align?: 'center' | 'left';
  /** Boîte de collision simple, centrée en bas de l'image. bottom = marge entre le bas de l'image et le bas de la boîte. */
  body?: { w: number; h: number; bottom: number };
  /** Boîtes de collision libres, dans le repère de l'image (pour les formes complexes : maison...). */
  bodies?: Rect[];
  /** Animation à jouer en boucle (l'image est alors une planche animée), ex. 'burn'. */
  anim?: string;
  /** Points d'où sort de la fumée, dans le repère de l'image. */
  smoke?: [number, number][];
  /** Lueur chaude qui vacille (feu), dans le repère de l'image. */
  light?: { x: number; y: number; radius: number };
  /** Identifiant du dialogue lancé quand le joueur interagit avec l'objet. */
  interact?: string;
}

/** Un personnage qui parle : son nom affiché et son portrait (sans la taille, ajoutée selon la config). */
export interface CharacterDef {
  name: string;
  portrait: string;
}

export interface DialogueLine {
  /** Clé dans characters.json. */
  speaker: string;
  /** Nom de l'expression du portrait, ex. 'neutral'. */
  expression: string;
  text: string;
}

export interface DialogueDef {
  lines: DialogueLine[];
}

export type Facing = 'down' | 'up' | 'left' | 'right';

/** Point d'apparition, en coordonnées de tuile. */
export interface SpawnDef {
  x: number;
  y: number;
  facing?: Facing;
}

/** Passage vers une autre carte : on le prend en marchant dans la case (x, y) en regardant vers `facing`. */
export interface ExitDef {
  x: number;
  y: number;
  facing: Facing;
  to: string;
  spawn: string;
}

export interface MapDef {
  id: string;
  name: string;
  /** Jeu de tuiles utilisé (clé dans tiles.json). Défaut : 'world'. */
  tileset?: string;
  /** Pénombre posée sur toute la carte (0 = aucune, 1 = noir). Les feux restent lumineux. */
  ambient?: number;
  /** Sol, une ligne par rangée de tuiles. */
  ground: string[];
  /** Objets, même taille que le sol. '.' = rien. */
  props: string[];
  spawns: Record<string, SpawnDef>;
  exits?: ExitDef[];
}
