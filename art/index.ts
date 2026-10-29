// Registre de toutes les sources pixel art. Ajouter un sprite = l'importer ici.
import type { ArtSource } from './lib/types';
import xeros from './characters/xeros';
import xerosPortraits from './portraits/xeros';
import worldTiles, { worldDecals } from './world/tiles';
import props from './world/props';
import trees from './world/trees';
import rocksBushes from './world/rocks-bushes';
import ui from './ui/dialog';
import resources from './items/resources';
import tools from './items/tools';
import house from './world/house';
import { furniture, interiorDecals, interiorTiles } from './interior/house';
import lights from './interior/light';

export const sources: ArtSource[] = [xeros, ...xerosPortraits, worldTiles, ...worldDecals, ...props, ...trees, ...rocksBushes, ...house, interiorTiles, ...interiorDecals, ...furniture, ...lights, ...ui, ...resources, ...tools];
