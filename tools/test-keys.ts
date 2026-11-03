// Aucune clé de contenu écrite en dur dans le code (docs/AUDIT.md, « Normalisation » : le comportement vient d'une capacité déclarée
// dans les données, jamais du nom de l'objet). Cherche dans src/ (hors src/generated/) toute chaîne entre guillemets qui est une clé
// de props.json, d'items.json, de piles.json ou de creatures.json (une créature est des données : aucune espèce nommée dans le code). Seuls passent : validate.ts (ses listes d'exceptions nomment les objets, chacun avec
// sa raison), la clé unique de la pièce de bois (`WOOD_PIECE`, voulue), et les mots qui sont aussi le nom d'autre chose (ALLOWED).
// Usage : npx tsx tools/test-keys.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { creatures, items, piles, props } from '../src/content';

/** Les mots qui sont une clé de contenu et le nom d'autre chose, avec ce qu'ils nomment dans le code. */
const ALLOWED: Record<string, string> = {
  bench: 'le poste « établi » des transformations (StationSchema de types.ts), pas l’objet banc de la maison',
  maul: 'le genre de travail « fendre à la masse » (WoodWork, woodJob) et son coup de work.json, pas l’objet masse',
  stake: 'l’action « reprendre un piquet » (Action de GameMap), pas l’objet piquet',
  stone: 'la matière pierre (masse calculée, matière de work.json), pas l’objet pierre',
};
/** Les fichiers qui nomment des objets par fonction : les listes d'exceptions de validate.ts. */
const FILES_ALLOWED = new Set(['src/content/validate.ts']);
/** La clé unique de la pièce de bois, voulue (tout le bois du monde est cette pièce, décrite par ses réglages). */
const LINES_ALLOWED = [/^export const WOOD_PIECE = 'wood-piece';$/];

const keys = new Set([...Object.keys(props), ...Object.keys(items), ...Object.keys(piles), ...Object.keys(creatures)]);
const files: string[] = [];
const walk = (dir: string) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f !== 'generated') walk(p);
    } else if (p.endsWith('.ts') && !FILES_ALLOWED.has(p)) files.push(p);
  }
};
walk('src');

const found: string[] = [];
for (const f of files) {
  readFileSync(f, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, '');
      if (/^\s*\*/.test(code) || LINES_ALLOWED.some((r) => r.test(code.trim()))) return;
      for (const m of code.matchAll(/'([a-z0-9-]+)'|"([a-z0-9-]+)"/g)) {
        const k = m[1] ?? m[2];
        if (keys.has(k) && !ALLOWED[k]) found.push(`${f}:${i + 1} : '${k}' — ${code.trim().slice(0, 100)}`);
      }
    });
}
assert.deepEqual(found, [], `clés de contenu écrites en dur dans src/ (le comportement doit venir d'une capacité des données) :\n${found.join('\n')}`);
for (const k of Object.keys(ALLOWED)) assert.ok(keys.has(k), `ALLOWED : '${k}' n'est plus une clé de contenu, à retirer`);
console.log(`✓ clés : aucune clé de contenu écrite en dur dans ${files.length} fichiers de src/ (${Object.keys(ALLOWED).length} mots qui nomment autre chose)`);
