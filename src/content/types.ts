// Formats du contenu du jeu. Le contenu (cartes, tuiles, objets) est de la donnée JSON :
// on en ajoute sans toucher au moteur.

/** Un caractère de carte -> une ou plusieurs tuiles (variantes tirées au hasard, de façon stable). */
export interface TileDef {
  tiles: string[];
  solid?: boolean;
  /** Choisit la tuile selon les voisins identiques : `${autotile}-${masque N=1 E=2 S=4 O=8}`. */
  autotile?: string;
}

/** Un caractère de la couche objets -> un objet posé (arbre, rocher...). */
export interface PropDef {
  name: string;
  image: string;
  /** Boîte de collision, posée en bas de l'image. bottom = marge entre le bas de l'image et le bas de la boîte. */
  body?: { w: number; h: number; bottom: number };
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

export interface MapDef {
  id: string;
  name: string;
  /** Sol, une ligne par rangée de tuiles. */
  ground: string[];
  /** Objets, même taille que le sol. '.' = rien. */
  props: string[];
  /** Point d'apparition, en coordonnées de tuile. */
  spawn: { x: number; y: number };
}
