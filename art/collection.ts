// Groupes de la planche .art-preview/collection.png (npm run art:preview), un par famille d'images.
// Chaque groupe est posé sur son sol (herbe dehors, terre battue dedans), avec Xéros à côté pour l'échelle.
// Une clé sans image dessinée est ignorée.

interface Family {
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
    title: 'Ressources',
    ground: 'grass',
    keys: [],
    icons: ['log', 'branch', 'stone', 'iron-ore', 'straw', 'wheat', 'seeds', 'berries', 'mushroom', 'egg', 'apple', 'wool'].map((n) => `item-${n}`),
  },
  {
    title: 'Outils et armes',
    ground: 'grass',
    keys: [],
    icons: ['axe', 'pickaxe', 'hoe', 'sickle', 'watering-can', 'fishing-rod', 'sword', 'wooden-sword'].map((n) => `item-${n}`),
  },
  {
    title: 'Nature',
    ground: 'grass',
    keys: ['tree', 'tree-stump', 'tree-fall', 'rock', 'rock-rubble', 'bush', 'bush-berries'],
    allFrames: ['tree-fall'],
  },
  { title: 'Lumière', ground: 'floor', keys: ['lantern', 'wall-torch', 'candle'] },
  { title: 'Personnages', ground: 'floor', keys: ['mother', 'portrait-mother-64'] },
  { title: 'Outil en main', ground: 'grass', keys: ['tool-axe'], allFrames: ['tool-axe'] },
  { title: 'Interface', ground: 'floor', keys: ['ui-slot', 'ui-slot-active', 'ui-box', 'ui-key-e'] },
  { title: 'Mobilier et ferme', ground: 'grass', keys: ['barrel', 'crate', 'hay-bale', 'chest', 'table', 'stool', 'well', 'woodpile', 'chopping-block', 'chopping-block-axe'] },
  { title: 'Intérieur', ground: 'floor', keys: ['bed', 'pallet', 'sack', 'jar', 'worktable', 'workbench'] },
];
