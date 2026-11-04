// Registre de toutes les sources pixel art. Ajouter un sprite = l'importer ici.
import type { ArtSource } from './lib/types';
import xeros from './characters/xeros';
import { combatEffects } from './characters/xeros-combat';
import xerosPortraits from './portraits/xeros';
import mother from './characters/mother';
import motherPortrait from './portraits/mother';
import worldTiles, { worldDecals } from './world/tiles';
import props from './world/props';
import trees from './world/big-tree';
import pollard from './world/big-pollard';
import normalTree from './world/normal-tree';
// les arbres qui s'abattent (ceux de props.json qui ont harvest.fall) : leurs étapes, leurs chutes, leurs arbres couchés et leur
// ébranchage, tirés de leurs données et de leurs dessins (art/world/trees.ts)
import fellable from './world/trees';
import rocksBushes from './world/rocks-bushes';
import ui from './ui/dialog';
import staminaBar from './ui/stamina-bar';
import workBar from './ui/work-bar';
import clock from './ui/clock';
import minimap from './ui/minimap';
import breath from './characters/breath';
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
import splittingTools from './items/splitting-tools';
import stake from './items/stake';
import implantation from './world/implantation';
import hatchet from './items/hatchet';
import weapons from './items/weapons';
import trainingDummy from './world/training-dummy';
import broadaxe from './items/broadaxe';
import woodPieces from './world/wood-pieces';
import stones from './items/stones';
import masonTools from './items/mason-tools';
import earth from './items/earth';
import lime from './items/lime';
import fibres from './items/fibres';
import woodSmall from './items/wood-small';
import sillWalls from './world/sill-walls';
import joints from './world/joints';
import cabin from './world/cabin';
import cabinClosing from './world/cabin-closing';
import barn from './world/barn';
import stall from './world/stall';
import signpost from './world/signpost';
import xerosHouse from './world/xeros-house';
import chimney from './world/chimney';
// la forge du village : les pièces de l'atelier, les trois couvertures et leurs pignons (chantier « forge »)
import forge from './world/forge';
import forgeRoofs from './world/forge-roofs';
// le lapin de garenne (la créature, le lapin mort au sol, l'entrée de garenne, fx-fur) ; le lapin mort en main et son icône
import rabbit from './world/rabbit';
import deadRabbit from './items/dead-rabbit';
// la tempête : le chicot et sa cime couchée, la galette de racines et son trou (art/world/storm.ts)
import storm from './world/storm';
// le relief : les matières des faces (terre, au-dessus de l'eau, lèvre, raccourcis), la voûte du chemin creux (rideau, avancées), le
// liseré et le miroitement de l'eau coupée (art/world/relief.ts ; ses tuiles sont dans le jeu de tuiles `world`)
import { reliefImages, shimmerSheet } from './world/relief';
import { agedSources } from './lib/ages';

export const sources: ArtSource[] = [xeros, ...xerosPortraits, mother, motherPortrait, worldTiles, ...worldDecals, ...props, ...trees, ...pollard, ...normalTree, ...fellable, ...rocksBushes, ...farm, ...house, interiorTiles, ...interiorDecals, ...furniture, ...lights, ...ui, ...staminaBar, ...workBar, ...clock, ...minimap, ...breath, ...resources, ...tools, ...heldTools, ...carried, ...fx, ...piles, ...rope, ...faggot, ...building, ...splittingTools, ...stake, ...implantation, ...hatchet, ...broadaxe, ...woodPieces, ...stones, ...masonTools, ...earth, ...lime, ...fibres, ...woodSmall, ...sillWalls, ...joints, ...cabin, ...cabinClosing, ...barn, ...stall, ...signpost, ...weapons, ...trainingDummy, ...combatEffects, ...xerosHouse, ...chimney, ...forge, ...forgeRoofs, ...rabbit, ...deadRabbit, ...storm, ...reliefImages(), shimmerSheet(), shimmerSheet(true)];
// le bois travaillé à ses autres âges (patiné, vieux), tiré des images neuves
sources.push(...agedSources(sources));
