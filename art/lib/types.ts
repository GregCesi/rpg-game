import type { Grid, Palette } from './canvas';

/** Personnage ou objet animé : des animations nommées, toutes à la même taille de frame. */
export interface SpriteSheetSource {
  kind: 'spritesheet';
  name: string;
  frameW: number;
  frameH: number;
  /** Combien de rangées sous les pieds dans chaque image (une créature : le jeu la pose d'autant) ; absent : 2 (le lapin, Xéros). */
  feet?: number;
  palette: Palette;
  /**
   * Les animations ; `durations` (ms, une par image) : la durée de chaque image quand elles ne durent pas toutes autant (le sanglier,
   * Xéros renversé) ; elle remplace alors `frameRate`.
   */
  animations: Record<string, { frames: Grid[]; frameRate: number; repeat: number; durations?: number[] }>;
}

/** Jeu de tuiles carrées, référencées par nom. */
export interface TilesetSource {
  kind: 'tileset';
  name: string;
  tileSize: number;
  palette: Palette;
  tiles: Record<string, Grid>;
}

/** Image fixe (arbre, rocher...). */
export interface ImageSource {
  kind: 'image';
  name: string;
  palette: Palette;
  grid: Grid;
}

export type ArtSource = SpriteSheetSource | TilesetSource | ImageSource;
