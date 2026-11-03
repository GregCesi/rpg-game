// Le lapin mort en main et son icône (chantier « lapins », fiche docs/objets/dead-rabbit.md) ; dessins communs du lapin dans
// art/world/rabbit-shapes.ts, robe du jeu dans art/world/rabbit.ts (le lapin mort au sol y est aussi).
// - `held-dead-rabbit` (posture `hand`, comme les planches held-… de art/items/carried.ts) : images de 21 × 21, la prise de la
//   main au centre (10, 10) : le lapin pendu par les pattes arrière, que le poing recouvre, la tête en bas, les oreilles qui
//   pendent ; de profil le flanc, de face le ventre blanc, de dos le dos et la queue.
// - `item-dead-rabbit` : l'icône 16 × 16, le lapin pendu en grand, sans ombre.

import type { ArtSource, ImageSource } from '../lib/types';
import { sheet } from './carried';
import { checkColors } from '../world/rabbit-lib';
import { rabbitArt, rabbitPalette } from '../world/rabbit';
import { HELD_SIZE } from '../world/rabbit-types';

for (const [v, g] of Object.entries(rabbitArt.held)) checkColors(`held-dead-rabbit ${v}`, g, rabbitPalette);
checkColors('item-dead-rabbit', rabbitArt.icon, rabbitPalette);

const icon: ImageSource = { kind: 'image', name: 'item-dead-rabbit', palette: rabbitPalette, grid: rabbitArt.icon };

const sources: ArtSource[] = [sheet('held-dead-rabbit', HELD_SIZE, rabbitPalette, rabbitArt.held), icon];

export default sources;
