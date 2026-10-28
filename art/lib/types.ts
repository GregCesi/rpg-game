import type { Grid, Palette } from './canvas';

/** Personnage ou objet animé : des animations nommées, toutes à la même taille de frame. */
export interface SpriteSheetSource {
  kind: 'spritesheet';
  name: string;
  frameW: number;
  frameH: number;
  palette: Palette;
  animations: Record<string, { frames: Grid[]; frameRate: number; repeat: number }>;
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
