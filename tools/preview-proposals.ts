// Aperçu des éléments composés proposés d'un module de art/proposals/ (maquette de la chaumière) : chaque élément dans toutes
// ses vues, à chacune de ses longueurs et dans chacun de ses états, posé sur une ligne de sol à côté de Xéros, sur le quadrillage
// des cases (32 px, 1,60 m), agrandi x4. Ne lance pas le build d'art : plusieurs dessinateurs peuvent s'en servir en même temps.
// Usage : npx tsx tools/preview-proposals.ts <module, ex. art/proposals/murs.ts> <fichier .png> [clé ...]

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import type { ProposedElement } from '../art/proposals/chaumiere-geometry';
import { elementsSheet } from './lib/maison-preview';

const [mod, out, ...only] = process.argv.slice(2);
if (!mod || !out) throw new Error('usage : tsx tools/preview-proposals.ts <module> <fichier .png> [clé ...]');
const elements = ((await import(pathToFileURL(resolve(mod)).href)).ELEMENTS) as ProposedElement[];
const shown = elements.filter((e) => !only.length || only.includes(e.key));
writeFileSync(out, PNG.sync.write(elementsSheet(shown).png));
console.log(`${shown.length} éléments, aperçu dans ${out}`);
