// Le registre des dessins d'arbres, par clé d'image de l'arbre debout (`image` de props.json). Chaque fichier de dessin d'une
// sorte (art/world/<sorte>-*.ts) y enregistre ses arbres (`registerTree`) ; art/world/trees.ts tire de props.json la liste des
// arbres (ceux qui ont `harvest.fall`), leur géométrie (`tree`) et, d'ici, leur dessin. Aucune liste de noms à tenir à jour.
//
// Ce qu'un arbre dessine, et rien d'autre (tout le reste se tire de ces dessins et de `tree` : les étapes de l'abattage,
// art/world/felling.ts ; les deux chutes, art/world/tree-fall.ts ; l'ébranchage, art/world/work-stages.ts) :
// - l'arbre debout, sans contour ni ombre (`body`, sous une lumière donnée : la chute la ramène au nord-ouest) ;
// - sa souche (`stumpBody`, `stump`) et la place de son pied dans l'image de la souche (`stumpFoot`) ;
// - son arbre couché d'un seul tenant, tronc et houppier couché (`lying`, de la longueur utile de sa pièce de bois) ;
// - pour une chute `bark` (`tree.fall.source`), son tronc nu (`bareTrunk`).

import type { Canvas } from '../lib/canvas';
import type { Wood } from './wood';

export type Vec = [number, number];

/** Un cadre (x, y, largeur, hauteur). */
export interface Frame { x: number; y: number; w: number; h: number }

/** Ce que l'ébranchage (art/world/work-stages.ts) doit savoir d'un arbre couché (repère : son cadre de composition). */
export interface Lying {
  w: number;
  /** Première colonne d'écorce (le bout scié) et axe du tronc couché. */
  buttX: number;
  axisY: number;
  /** Première et dernière rangées d'écorce du tronc. */
  barkTop: number;
  barkBottom: number;
  /** Longueur du tronc depuis le bout scié (px). */
  trunkLen: number;
  /** Cadre de l'image couchée (droite ou gauche). */
  frame: (left: boolean) => Frame;
  /** L'arbre couché (sans la souche), son houppier réduit aux pixels que `keep` garde (h le long du tronc, g en travers). */
  compose: (left: boolean, keep: (h: number, g: number) => boolean) => Canvas;
}

/**
 * Un arbre couché, composé dans son cadre (w × h, bas aligné sur celui de l'arbre debout), l'arbre debout posé en `off` (chute
 * à droite) ou `offLeft` (à gauche, le miroir autour du pied).
 */
export interface LyingArt {
  w: number;
  h: number;
  off: number;
  offLeft: number;
  /** Dernière image de la chute : la souche et l'arbre couché, exactement comme le jeu les pose. */
  scene: (left: boolean) => Canvas;
  /** Les images de l'arbre couché (`<clé>`, `<clé>-left`), recadrées. */
  right: Canvas;
  left: Canvas;
  /** Cadre de l'image de droite dans le cadre de composition (celui de gauche en est le miroir). */
  box: Frame;
  /** Décalage du coin bas gauche de la pièce de bois du tronc par rapport à celui de l'image couchée (droite). */
  woodAt: Vec;
  limbing: Lying;
}

/** Le tronc nu d'un arbre (chute `bark`) : sa rangée de profil, sa première colonne d'écorce, le bas du houppier, sa matière. */
export interface BareTrunk { row: number; x0: number; crownBottom: number; wood: Wood }

export interface TreeArt {
  body: (light?: Vec) => Canvas;
  stumpBody: () => Canvas;
  stump: () => Canvas;
  stumpFoot: Vec;
  /** L'arbre couché `key`, son tronc de `cm` centimètres (`wood.length` de son arbre couché dans props.json). */
  lying: (cm: number, key: string) => LyingArt;
  bareTrunk?: BareTrunk;
}

const ARTS = new Map<string, TreeArt>();

/** Enregistre le dessin de l'arbre debout d'image `image`. */
export function registerTree(image: string, art: TreeArt): void {
  if (ARTS.has(image)) throw new Error(`arbres : '${image}' enregistré deux fois`);
  ARTS.set(image, art);
}

/** Le dessin de l'arbre d'image `image`. */
export function treeArt(image: string): TreeArt {
  const a = ARTS.get(image);
  if (!a) throw new Error(`arbres : aucun dessin enregistré pour l'image '${image}' (registerTree, art/world/<sorte>-*.ts, importé par art/world/trees.ts)`);
  return a;
}
