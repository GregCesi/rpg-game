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
    icons: ['branch', 'stone', 'iron-ore', 'straw', 'wheat', 'seeds', 'berries', 'mushroom', 'egg', 'apple', 'wool', 'wood-big-round', 'wood-big-quarter'].map((n) => `item-${n}`),
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
    keys: ['big-tree', 'big-tree-stump', 'big-tree-fall', 'big-pollard', 'big-pollard-fall', 'big-felled-tree', 'big-pollard-felled-tree', 'wood-big-round-100', 'rock', 'rock-rubble', 'bush', 'bush-berries'],
    allFrames: ['big-tree-fall', 'big-pollard-fall'],
  },
  {
    title: 'Chute vers la gauche',
    ground: 'grass',
    keys: ['big-tree-fall-left', 'big-pollard-fall-left', 'big-felled-tree-left', 'big-pollard-felled-tree-left'],
    allFrames: ['big-tree-fall-left', 'big-pollard-fall-left'],
  },
  { title: 'Lumière', ground: 'floor', keys: ['lantern', 'wall-torch', 'candle'] },
  { title: 'Personnages', ground: 'floor', keys: ['mother', 'portrait-mother-64'] },
  { title: 'Outil en main', ground: 'grass', keys: ['tool-axe', 'tool-hatchet'], allFrames: ['tool-axe', 'tool-hatchet'] },
  { title: "Éclats d'impact", ground: 'grass', keys: ['fx-wood', 'fx-stone', 'fx-leaves'], allFrames: ['fx-wood', 'fx-stone', 'fx-leaves'] },
  { title: 'Interface', ground: 'floor', keys: ['ui-slot', 'ui-slot-active', 'ui-stamina-frame', 'ui-stamina-back', 'ui-stamina-fill', 'ui-stamina-fill-low', 'ui-box', 'ui-key-e', 'ui-key-space'], icons: ['ui-hand-left', 'ui-hand-right', 'ui-hands-both'] },
  {
    title: 'Corde et fagot',
    ground: 'grass',
    keys: ['rope-coil', 'rope-tie-ground', 'chopping-block', 'chopping-block-rope', 'pile-branch-tie-north', 'pile-branch-tie-south', 'pile-branch-tie-alone', 'faggot', 'faggot-ns', 'wood-big-round-100', 'wood-big-round-100-ns'],
    icons: ['item-rope-coil', 'item-rope-tie', 'item-faggot'],
  },
  { title: 'Jauge et chiffres (herbe)', ground: 'grass', keys: ['ui-gauge', ...Array.from({ length: 10 }, (_, n) => `ui-digit-${n}`)], allFrames: ['ui-gauge'] },
  { title: 'Jauge et chiffres (plancher)', ground: 'floor', keys: ['ui-gauge', ...Array.from({ length: 10 }, (_, n) => `ui-digit-${n}`)], allFrames: ['ui-gauge'] },
  { title: 'Mobilier et ferme', ground: 'grass', keys: ['barrel', 'crate', 'hay-bale', 'chest', 'table', 'stool', 'well', 'woodpile', 'chopping-block', 'chopping-block-axe'] },
  {
    title: 'Implantation',
    ground: 'grass',
    keys: ['stake-ground', 'planted-stake', 'hatchet-ground', 'chopping-block', 'chopping-block-rope', 'flat-stone', 'footing-stone', 'table', 'plan-tablet'],
    icons: ['item-stake', 'item-hatchet', 'item-flat-stone', 'item-branch'],
  },
  { title: 'Intérieur', ground: 'floor', keys: ['bed', 'pallet', 'sack', 'jar', 'worktable', 'workbench'] },
];
