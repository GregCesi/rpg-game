// Fait naître une carte Tiled à partir d'une esquisse : une grille de lettres.
// Usage : npm run sketch -- <id>
//   lit tiled/sketches/<id>.json (sol et objets en lettres, points d'apparition, sorties)
//   et tiled/sketch-legend.json (lettre -> tuiles, terrain ou objet),
//   écrit tiled/maps/<id>.tmj. Refuse si ce .tmj existe déjà : ensuite, c'est le .tmj qui fait foi.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { existingMapError, loadContext, serializeTmj, SketchLegendSchema, SketchSchema, sketchToTmj } from './lib/sketch';

const SKETCHES = 'tiled/sketches';
const MAPS = 'tiled/maps';
const LEGEND = 'tiled/sketch-legend.json';

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function readJson<T extends z.ZodType>(path: string, schema: T, hint = ''): z.infer<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    const missing = (e as NodeJS.ErrnoException).code === 'ENOENT';
    return fail(missing ? `${path} introuvable${hint}` : `${path} : JSON illisible (${(e as Error).message})`);
  }
  const r = schema.safeParse(raw);
  if (!r.success) return fail(`${path} ne respecte pas son format :\n${z.prettifyError(r.error)}`);
  return r.data;
}

const id = process.argv[2];
if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  fail(`usage : npm run sketch -- <id>   (id en minuscules, chiffres, tirets ; lit ${SKETCHES}/<id>.json et écrit ${MAPS}/<id>.tmj)`);
}
const exists = existingMapError(id);
if (exists) fail(exists);

const sketch = readJson(`${SKETCHES}/${id}.json`, SketchSchema, ` : créer l'esquisse (voir README, « Cartes »)`);
const legend = readJson(LEGEND, SketchLegendSchema);
let context;
try {
  context = loadContext();
} catch (e) {
  fail((e as Error).message);
}

const { tmj, errors } = sketchToTmj(id, sketch, legend, context);
if (!tmj || errors.length) {
  console.error(`\n✗ ${errors.length} problème(s) dans l'esquisse :`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('');
  process.exit(1);
}

mkdirSync(MAPS, { recursive: true });
const out = `${MAPS}/${id}.tmj`;
writeFileSync(out, serializeTmj(tmj as Parameters<typeof serializeTmj>[0]));
console.log(`✓ ${out} écrit. Ouvrir dans Tiled : open -a Tiled tiled/xeros.tiled-project ${out}`);
console.log(`  Ensuite le .tmj fait foi : on retouche la carte dans Tiled, plus dans l'esquisse. Vérifier avec npm run check.`);
