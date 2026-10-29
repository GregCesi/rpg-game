// Registre de toutes les sources pixel art. Ajouter un sprite = l'importer ici.
import type { ArtSource } from './lib/types';
import xeros from './characters/xeros';
import xerosPortraits from './portraits/xeros';
import mother from './characters/mother';
import motherPortrait from './portraits/mother';
import worldTiles, { worldDecals } from './world/tiles';
import props from './world/props';
import trees from './world/trees';
import rocksBushes from './world/rocks-bushes';
import ui from './ui/dialog';
import resources from './items/resources';
import tools from './items/tools';
import heldTools from './items/held';
import house from './world/house';
import { furniture, interiorDecals, interiorTiles } from './interior/house';
import lights from './interior/light';
import farm from './world/farm';
import fx from './world/fx';

export const sources: ArtSource[] = [xeros, ...xerosPortraits, mother, motherPortrait,worldTiles, ...worldDecals, ...props, ...trees, ...rocksBushes, ...farm, ...house, interiorTiles, ...interiorDecals, ...furniture, ...lights, ...ui, ...resources, ...tools, ...heldTools, ...fx];
