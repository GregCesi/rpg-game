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
    icons: ['branch', 'stone', 'iron-ore', 'straw', 'wheat', 'seeds', 'berries', 'mushroom', 'egg', 'apple', 'wool', 'felled-log'].map((n) => `item-${n}`),
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
    keys: ['tree', 'tree-stump', 'tree-fall', 'felled-section-1', 'felled-section-2', 'felled-section-3', 'felled-crown', 'felled-head', 'felled-log', 'rock', 'rock-rubble', 'bush', 'bush-berries'],
    allFrames: ['tree-fall'],
  },
  {
    title: 'Arbre couché : entailles et billes',
    ground: 'grass',
    keys: ['felled-section-2', 'felled-section-2-n1', 'felled-section-2-n2', 'felled-section-2-cut-right', 'felled-section-2-cut-left', 'felled-crown-cut-left', 'felled-head-cut-left', 'felled-head-n2', 'felled-log-1', 'felled-log-2', 'felled-log-3', 'felled-log-4'],
  },
  {
    title: 'Chute vers la gauche',
    ground: 'grass',
    keys: ['tree-fall-left', 'felled-section-1-left', 'felled-section-2-left', 'felled-section-3-left', 'felled-crown-left', 'felled-head-left'],
    allFrames: ['tree-fall-left'],
  },
  {
    title: 'Arbre couché à gauche : entailles et billes',
    ground: 'grass',
    keys: ['felled-section-2-left', 'felled-section-2-left-n1', 'felled-section-2-left-n2', 'felled-section-2-left-cut-right', 'felled-section-2-left-cut-left', 'felled-section-2-left-cut-left-n2', 'felled-crown-left-cut-left', 'felled-head-left-cut-left', 'felled-head-left-n2', 'felled-head-left-cut-right', 'felled-log-1-left', 'felled-log-2-left', 'felled-log-3-left', 'felled-log-4-left'],
  },
  { title: 'Lumière', ground: 'floor', keys: ['lantern', 'wall-torch', 'candle'] },
  { title: 'Personnages', ground: 'floor', keys: ['mother', 'portrait-mother-64'] },
  { title: 'Outil en main', ground: 'grass', keys: ['tool-axe'], allFrames: ['tool-axe'] },
  { title: "Éclats d'impact", ground: 'grass', keys: ['fx-wood', 'fx-stone', 'fx-leaves'], allFrames: ['fx-wood', 'fx-stone', 'fx-leaves'] },
  { title: 'Interface', ground: 'floor', keys: ['ui-slot', 'ui-slot-active', 'ui-box', 'ui-key-e', 'ui-key-space'], icons: ['ui-hand-left', 'ui-hand-right', 'ui-hands-both'] },
  { title: 'Mobilier et ferme', ground: 'grass', keys: ['barrel', 'crate', 'hay-bale', 'chest', 'table', 'stool', 'well', 'woodpile', 'chopping-block', 'chopping-block-axe'] },
  { title: 'Intérieur', ground: 'floor', keys: ['bed', 'pallet', 'sack', 'jar', 'worktable', 'workbench'] },
];
