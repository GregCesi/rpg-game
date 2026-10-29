// Groupes de la planche .art-preview/collection.png (npm run art:preview), un par lot de la nuit « objets ».
// Chaque groupe est posé sur son sol (herbe dehors, terre battue dedans), avec Xéros à côté pour l'échelle.
// Une clé sans image dessinée est ignorée : la planche se remplit lot après lot.

export interface Family {
  title: string;
  ground: 'grass' | 'floor';
  /** Clés d'images ou de planches animées, dans l'ordre d'affichage. */
  keys: string[];
  /** Icônes 16×16 : montrées à leur taille puis agrandies ×2. */
  icons?: string[];
  /** Planches dont on montre toutes les images de la première animation (les autres : la première image). */
  allFrames?: string[];
}

export const families: Family[] = [
  {
    title: 'Lot 1 : ressources',
    ground: 'grass',
    keys: [],
    icons: ['log', 'branch', 'stone', 'iron-ore', 'straw', 'wheat', 'seeds', 'berries', 'mushroom', 'egg', 'apple', 'wool'].map((n) => `item-${n}`),
  },
  {
    title: 'Lot 2 : outils et armes',
    ground: 'grass',
    keys: [],
    icons: ['axe', 'pickaxe', 'hoe', 'sickle', 'watering-can', 'fishing-rod', 'sword', 'wooden-sword'].map((n) => `item-${n}`),
  },
  {
    title: 'Lot 3 : arbre, rocher, buissons',
    ground: 'grass',
    keys: ['tree', 'tree-stump', 'tree-fall', 'rock', 'rock-rubble', 'bush', 'bush-berries'],
    allFrames: ['tree-fall'],
  },
  { title: 'Lot 4 : lumière', ground: 'floor', keys: ['lantern', 'wall-torch', 'candle'] },
  { title: 'Lot 5 : la mère', ground: 'floor', keys: ['mother', 'portrait-mother-64'] },
  { title: 'Lot 6 : mobilier et ferme', ground: 'grass', keys: ['barrel', 'crate', 'hay-bale', 'chest', 'table', 'stool', 'well'] },
  { title: 'Existants (référence)', ground: 'floor', keys: ['bed', 'pallet', 'sack', 'jar', 'worktable', 'workbench'] },
];
