// Registre de toutes les sources pixel art. Ajouter un sprite = l'importer ici.
import type { ArtSource } from './lib/types';
import xeros from './characters/xeros';
import worldTiles from './world/tiles';
import props from './world/props';

export const sources: ArtSource[] = [xeros, worldTiles, ...props];
