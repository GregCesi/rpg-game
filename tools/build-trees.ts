// Les décalages des arbres (docs/CONCEPTION.md, « Abattre un arbre ») : calculés d'après leur géométrie (`tree` de props.json) et
// leurs dessins (art/world/trees.ts), écrits dans src/generated/trees.json, que le jeu lit avec props.json (src/content/treeLayout.ts).
// Lancé par npm run art avant build-art : build-art et le contenu (src/content/index.ts) le lisent déjà ; il ne lit, lui, que
// art/world/trees.ts et props.json, jamais le contenu complété.
// Usage : npx tsx tools/build-trees.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { treeLayouts } from '../art/world/trees';

mkdirSync('src/generated', { recursive: true });
writeFileSync('src/generated/trees.json', JSON.stringify(treeLayouts(), null, 2) + '\n');
