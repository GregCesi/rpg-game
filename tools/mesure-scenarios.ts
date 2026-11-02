// Mesure les scénarios un par un (chacun seul, pour que les temps ne se gênent pas) et dit où passe leur temps : le démarrage
// (Vite, Chromium, le chargement du jeu), le scénario lui-même, et dedans le temps de jeu simulé et les pauses fixes (setTimeout de
// plus de 30 ms, côté Node et dans la page). Les temps viennent de tools/lib/playtest.ts (PLAYTEST_TIMES). Usage :
//   npm run test:mesure [-- noms…]        (tous par défaut ; PLAYTEST_SPEED=<n> pour la vitesse de simulation)
// Écrit le tableau à l'écran et dans MESURE_OUT (par défaut .art-preview/mesure-scenarios.txt).

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sharedRig } from './lib/playtest';

// la liste de tools/run-scenarios.ts, lue dans son texte (l'importer lancerait la suite)
const listed = /export const SCENARIOS = \[([^\]]*)\]/.exec(readFileSync('tools/run-scenarios.ts', 'utf8'))![1];
const SCENARIOS = [...listed.matchAll(/'([^']+)'/g)].map((m) => m[1]);
const names = process.argv.slice(2).length ? process.argv.slice(2) : SCENARIOS;
const out = process.env.MESURE_OUT ?? '.art-preview/mesure-scenarios.txt';
mkdirSync('.art-preview', { recursive: true });
const file = '.art-preview/mesure-scenarios.jsonl';
if (existsSync(file)) rmSync(file);

interface Row {
  name: string;
  ok: boolean;
  wall: number;
  vite?: number;
  chromium?: number;
  load?: number;
  body?: number;
  close?: number;
  game?: number;
  nodeSleeps?: number;
  pageSleeps?: number;
}
const sec = (v?: number, w = 5) => (v === undefined ? '-'.padStart(w) : (v / 1000).toFixed(1).padStart(w));
// MESURE_SHARED=1 : le banc partagé de run-scenarios.ts (un serveur, un navigateur), démarré une fois avant le premier scénario
const plansOut = process.env.MESURE_SHARED ? mkdtempSync(join(tmpdir(), 'xeros-plans-')) : undefined;
if (plansOut) process.env.XEROS_PLANS_OUT = plansOut;
const r0 = Date.now();
const rig = process.env.MESURE_SHARED ? await sharedRig() : undefined;
const rigMs = Date.now() - r0;
const rows: Row[] = [];
for (const name of names) {
  const t0 = Date.now();
  const shared = rig && name !== 'construction' ? { PLAYTEST_URL: rig.url, PLAYTEST_WS: rig.ws, XEROS_PLANS_OUT: plansOut } : { XEROS_PLANS_OUT: undefined };
  const r = spawnSync('npx', ['tsx', `tools/test-${name}.ts`], { env: { ...process.env, ...shared, PLAYTEST_TIMES: file, FENDAGE_REQUIRED: '1' }, encoding: 'utf8' });
  const wall = Date.now() - t0;
  const lines = existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').filter(Boolean) : [];
  const last = lines.map((l) => JSON.parse(l) as Row).at(-1);
  const row: Row = { ...(last?.name ? last : {}), name, ok: r.status === 0, wall };
  rows.push(row);
  console.log(`${row.ok ? '✓' : '✗'} ${name.padEnd(14)} ${sec(wall)} s`);
  if (r.status !== 0) console.log((r.stdout + r.stderr).split('\n').filter((l) => l.includes('✗')).slice(0, 2).join('\n'));
}
await rig?.close();
const table = [
  `Mesure (chacun seul, vitesse x${process.env.PLAYTEST_SPEED ?? '10'}${rig ? `, banc partagé démarré en ${(rigMs / 1000).toFixed(1)} s` : ', un serveur et un navigateur par scénario'}), en secondes ; somme : ${(rows.reduce((a, r) => a + r.wall, 0) / 1000).toFixed(0)} s`,
  `${'scénario'.padEnd(14)} ${'total'.padStart(5)} ${'vite'.padStart(5)} ${'chrom'.padStart(5)} ${'charg'.padStart(5)} ${'scén.'.padStart(5)} ${'jeu'.padStart(5)} ${'p.node'.padStart(6)} ${'p.page'.padStart(6)} ${'ferm.'.padStart(5)}`,
  ...rows.map((r) => `${(r.ok ? '' : '✗ ') + r.name}`.padEnd(14) + ` ${sec(r.wall)} ${sec(r.vite)} ${sec(r.chromium)} ${sec(r.load)} ${sec(r.body)} ${sec(r.game)} ${sec(r.nodeSleeps, 6)} ${sec(r.pageSleeps, 6)} ${sec(r.close)}`),
  "total : du lancement à la sortie (npx, tsx compris) ; vite, chrom. : le serveur et le navigateur ; charg. : le jeu jusqu'au monde prêt ;",
  'scén. : le corps du scénario ; jeu : le temps de jeu simulé pendant ; p.node, p.page : les pauses fixes (somme) ; ferm. : la fermeture.',
].join('\n');
console.log(`\n${table}`);
writeFileSync(out, `${table}\n`);
