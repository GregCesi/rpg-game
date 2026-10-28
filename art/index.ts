// Registre de toutes les sources pixel art. Ajouter un sprite = l'importer ici.
import type { ArtSource } from './lib/types';
import xeros from './characters/xeros';
import xerosPortraits from './portraits/xeros';
import worldTiles from './world/tiles';
import props from './world/props';
import ui from './ui/dialog';

export const sources: ArtSource[] = [xeros, ...xerosPortraits, worldTiles, ...props, ...ui];
