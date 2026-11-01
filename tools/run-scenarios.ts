// Lance tous les scénarios dans le vrai jeu (tools/test-<nom>.ts, chacun avec son Chromium et son serveur Vite sur un port libre),
// plusieurs à la fois : SCENARIOS_JOBS (4 par défaut). Ne s'arrête pas au premier échec : tous tournent, puis un tableau dit chaque
// scénario (✓ ou ✗, durée, et pour un échec la première ligne de l'erreur). SCENARIOS_REPORT=<fichier> y écrit aussi le tableau.
// Code de sortie : 1 si un scénario échoue. Usage : npm run test:scenarios (après npm run art et npm run maps).
//
// Ce qui pourrait se gêner quand ils tournent ensemble, et pourquoi ça ne se gêne pas : chaque scénario a son navigateur (sa
// sauvegarde, localStorage, est à lui) et son serveur sur un port libre (tools/lib/playtest.ts) ; chacun écrit ses propres aperçus
// (.art-preview/<son nom>.png) ; les plans réécrits par la cabane, la grange et l'étal (src/content/plans/) ne sont jamais effacés,
// et le serveur les écrit d'un coup (renommage : vite.config.ts), si bien qu'un autre scénario qui démarre les lit toujours entiers.

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

/** Les scénarios, les plus longs d'abord (pour finir plus tôt quand ils tournent à plusieurs). */
export const SCENARIOS = ['monde', 'grange', 'equarrissage', 'fendage', 'cabane', 'etal', 'combat', 'interieur', 'construction', 'tas', 'poteaux', 'implantation', 'briques', 'perspective'];

const jobs = Math.max(1, Number(process.env.SCENARIOS_JOBS) || 4);

interface Result {
  name: string;
  ok: boolean;
  ms: number;
  /** La première ligne de l'erreur (la ligne ✗, sinon la première ligne d'erreur de la sortie). */
  error?: string;
}

/** Lance un scénario et rend son résultat ; sa sortie est gardée, montrée seulement s'il échoue. */
function run(name: string): Promise<Result> {
  const t0 = Date.now();
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', `tools/test-${name}.ts`], { env: { ...process.env, FENDAGE_REQUIRED: process.env.FENDAGE_REQUIRED ?? '1' } });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => {
      const ms = Date.now() - t0;
      if (code === 0) return resolve({ name, ok: true, ms });
      const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
      const error = lines.find((l) => l.startsWith('✗')) ?? lines.find((l) => /error|erreur/i.test(l)) ?? lines[lines.length - 1] ?? `code ${code}`;
      process.stderr.write(`\n--- ${name} : sortie complète ---\n${out}\n`);
      resolve({ name, ok: false, ms, error });
    });
  });
}

const t0 = Date.now();
const results: Result[] = [];
const queue = [...SCENARIOS];
await Promise.all(
  Array.from({ length: Math.min(jobs, queue.length) }, async () => {
    for (let name = queue.shift(); name; name = queue.shift()) {
      const r = await run(name);
      console.log(`${r.ok ? '✓' : '✗'} ${name} (${(r.ms / 1000).toFixed(0)} s)`);
      results.push(r);
    }
  }),
);
const total = (Date.now() - t0) / 1000;
const order = (r: Result) => SCENARIOS.indexOf(r.name);
const width = Math.max(...SCENARIOS.map((n) => n.length));
const table = [
  `Scénarios : ${results.filter((r) => r.ok).length} sur ${results.length} passent, en ${total.toFixed(0)} s (${jobs} à la fois)`,
  ...results.sort((a, b) => order(a) - order(b)).map((r) => `${r.ok ? '✓' : '✗'} ${r.name.padEnd(width)} ${String(Math.round(r.ms / 1000)).padStart(4)} s${r.error ? `  ${r.error}` : ''}`),
].join('\n');
console.log(`\n${table}`);
if (process.env.SCENARIOS_REPORT) writeFileSync(process.env.SCENARIOS_REPORT, `${table}\n`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
