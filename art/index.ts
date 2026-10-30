// Registre de toutes les sources pixel art. Ajouter un sprite = l'importer ici.
import type { ArtSource } from './lib/types';
import xeros from './characters/xeros';
import xerosPortraits from './portraits/xeros';
import mother from './characters/mother';
import motherPortrait from './portraits/mother';
import worldTiles, { worldDecals } from './world/tiles';
import props from './world/props';
import trees from './world/big-tree';
import felled from './world/big-felled';
import rocksBushes from './world/rocks-bushes';
import ui from './ui/dialog';
import resources from './items/resources';
import tools from './items/tools';
import heldTools from './items/held';
import carried from './items/carried';
import house from './world/house';
import { furniture, interiorDecals, interiorTiles } from './interior/house';
import lights from './interior/light';
import farm from './world/farm';
import fx from './world/fx';
import piles from './world/piles';
import rope from './items/rope';
import faggot from './world/faggot';
import building from './world/building';

export const sources: ArtSource[] = [xeros, ...xerosPortraits, mother, motherPortrait,worldTiles, ...worldDecals, ...props, ...trees, ...felled, ...rocksBushes, ...farm, ...house, interiorTiles, ...interiorDecals, ...furniture, ...lights, ...ui, ...resources, ...tools, ...heldTools, ...carried, ...fx, ...piles, ...rope, ...faggot, ...building];
