// La documentation qui mènerait à du code faux (docs/AUDIT.md, chantier 2), sans navigateur :
// - chaque chemin de fichier cité entre accents graves dans CLAUDE.md et README.md (`src/…`, `tools/…`, `art/…`, `docs/…`, avec une
//   extension .ts, .json, .md ou .cjs) existe ; les chemins à motif (`<sorte>`, `*`, `{a,b}`, `…`) sont laissés de côté ;
// - chaque `npm run <script>` cité dans CLAUDE.md, README.md et docs/COMMANDES.md existe dans package.json ;
// - les formules périmées (Maj + V, les vitesses `walkSpeed` et `carrySpeed`, x24, le prix fixe d'un coup de cognée, le clic qui faisait
//   tout : `clickAction`, `AIM.reach`, le fantôme qui suivait le curseur) n'y reviennent
//   pas ; docs/CONCEPTION.md est laissé de côté : son historique les garde, sous un bandeau.
// Usage : tsx tools/test-docs.ts.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (file: string): string => readFileSync(join(root, file), 'utf8');

/** Les chemins cités entre accents graves, de la forme `src/…`, `tools/…`, `art/…`, `docs/…` avec une extension connue. */
function citedPaths(text: string): string[] {
  const spans = [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim());
  return spans.filter((s) => /^(src|tools|art|docs)\/\S+\.(ts|json|md|cjs)$/.test(s) && !/[<*{…]/.test(s));
}

let paths = 0;
for (const file of ['CLAUDE.md', 'README.md']) {
  for (const p of citedPaths(read(file))) {
    paths++;
    assert.ok(existsSync(join(root, p)), `${file} cite \`${p}\`, qui n'existe pas`);
  }
}

/** Les scripts cités par `npm run <nom>` (un nom à motif, `test:<nom>`, est laissé de côté). */
function citedScripts(text: string): string[] {
  return [...text.matchAll(/npm run ([A-Za-z0-9:_.-]+)(<?)/g)].filter((m) => !m[2] && !m[1].endsWith(':')).map((m) => m[1].replace(/[.:]+$/, ''));
}

const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts;
let runs = 0;
for (const file of ['CLAUDE.md', 'README.md', 'docs/COMMANDES.md']) {
  for (const s of new Set(citedScripts(read(file)))) {
    runs++;
    assert.ok(s in scripts, `${file} cite \`npm run ${s}\`, absent de package.json`);
  }
}

/** Ce qui a été remplacé (CONCEPTION, « Le temps » et « Le travail ») et ne doit plus être donné comme actuel. */
const STALE = ['Maj + V', 'walkSpeed', 'carrySpeed', 'x24', '0,8 le coup', 'clickAction', 'AIM.reach', 'suit le curseur'];
for (const file of ['CLAUDE.md', 'README.md', 'docs/COMMANDES.md']) {
  const text = read(file);
  for (const s of STALE) assert.ok(!text.includes(s), `${file} dit encore « ${s} » (remplacé : voir docs/CONCEPTION.md)`);
}

console.log(`✓ docs : ${paths} chemins cités existent, ${runs} scripts npm cités existent, aucune formule périmée`);
