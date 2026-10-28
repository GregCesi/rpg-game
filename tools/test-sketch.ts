// Test de non-régression de l'outil d'esquisse (lancé par npm run build).
// Les anciennes cartes à lettres (tools/fixtures/sketch/*.json, reprises du commit d'avant la migration vers Tiled)
// passées dans l'outil doivent redonner exactement les copies figées des .tmj (tools/fixtures/sketch/expected/).
// On ne compare pas aux cartes vivantes de tiled/maps/ : on les retouche dans Tiled.
// Usage : npm run test   (suppose npm run art : manifeste et tileset des objets)

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existingMapError, loadContext, SketchLegendSchema, SketchSchema, sketchToTmj } from './lib/sketch';

const FIXTURES = 'tools/fixtures/sketch';
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}\n${(e as Error).message.replace(/^/gm, '      ')}`);
  }
}

const legend = SketchLegendSchema.parse(json('tiled/sketch-legend.json'));
const context = loadContext();
const sketchOf = (name: string) => SketchSchema.parse(json(`${FIXTURES}/${name}.json`));

console.log('esquisse -> .tmj');
for (const name of ['ferme', 'maison']) {
  test(`${name} : mêmes calques, objets, points et sorties que le .tmj figé`, () => {
    const { tmj, errors } = sketchToTmj(name, sketchOf(name), legend, context);
    assert.deepEqual(errors, []);
    const got = JSON.parse(JSON.stringify(tmj));
    const want = json(`${FIXTURES}/expected/${name}.tmj`);
    const layer = (m: { layers: { name: string }[] }, n: string) => m.layers.find((l) => l.name === n);
    assert.deepStrictEqual(layer(got, 'ground'), layer(want, 'ground'), 'sol');
    assert.deepStrictEqual(layer(got, 'objects'), layer(want, 'objects'), 'objets');
    assert.deepStrictEqual(layer(got, 'zones'), layer(want, 'zones'), 'points d\'apparition et sorties');
    assert.deepStrictEqual(got, want, 'carte entière');
  });
}

console.log('messages d\'erreur');
test('lettre de sol inconnue : dit la lettre et sa position', () => {
  const s = sketchOf('ferme');
  s.ground[2] = s.ground[2].slice(0, 5) + '?' + s.ground[2].slice(6);
  const { tmj, errors } = sketchToTmj('ferme', s, legend, context);
  assert.equal(tmj, undefined);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /lettre de sol '\?' inconnue en \(5, 2\)/);
});
test("lettre d'objet inconnue : dit la lettre et sa position", () => {
  const s = sketchOf('ferme');
  s.props[1] = s.props[1].slice(0, 3) + '@' + s.props[1].slice(4);
  const { errors } = sketchToTmj('ferme', s, legend, context);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /lettre d'objet '@' inconnue en \(3, 1\)/);
});
test('ligne de sol trop courte : signalée', () => {
  const s = sketchOf('ferme');
  s.ground[4] = s.ground[4].slice(1);
  const { errors } = sketchToTmj('ferme', s, legend, context);
  assert.match(errors.join('\n'), /ligne 4 du sol : 31 cases au lieu de 32/);
});

console.log('naissance seulement');
test('refuse si le .tmj existe déjà', () => {
  const dir = mkdtempSync(join(tmpdir(), 'xeros-sketch-'));
  assert.equal(existingMapError('nouvelle', dir), undefined);
  writeFileSync(join(dir, 'nouvelle.tmj'), '{}');
  assert.match(existingMapError('nouvelle', dir) ?? '', /existe déjà/);
});

if (failed) {
  console.error(`\n✗ ${failed} test(s) en échec\n`);
  process.exit(1);
}
console.log('✓ tests de l\'outil d\'esquisse');
