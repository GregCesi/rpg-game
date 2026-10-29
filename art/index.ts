// Registre de toutes les sources pixel art. Ajouter un sprite = l'importer ici.
import type { ArtSource } from './lib/types';
import xeros from './characters/xeros';
import xerosPortraits from './portraits/xeros';
import worldTiles, { worldDecals } from './world/tiles';
import props from './world/props';
import ui from './ui/dialog';
import resources from './items/resources';
import tools from './items/tools';
import house from './world/house';
import { furniture, interiorDecals, interiorTiles } from './interior/house';

export const sources: ArtSource[] = [xeros, ...xerosPortraits, worldTiles, ...worldDecals, ...props, ...house, interiorTiles, ...interiorDecals, ...furniture, ...ui, ...resources, ...tools];
