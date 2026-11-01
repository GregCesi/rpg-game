// Lance tous les scénarios dans le vrai jeu (tools/test-<nom>.ts, chacun avec son Chromium et son serveur Vite sur un port libre),
// plusieurs à la fois : SCENARIOS_JOBS (4 par défaut). Ne s'arrête pas au premier échec : tous tournent, puis un tableau dit chaque
// scénario (✓ ou ✗, durée, et pour un échec la première ligne de l'erreur). SCENARIOS_REPORT=<fichier> y écrit aussi le tableau.
// Code de sortie : 1 si un scénario échoue. Usage : npm run test:scenarios (après npm run art et npm run maps).
//
// Ce qui pourrait se gêner quand ils tournent ensemble, et pourquoi ça ne se gêne pas : chaque scénario a son navigateur (sa
// sauvegarde, localStorage, est à lui) et son serveur sur un port libre (tools/lib/playtest.ts) ; chacun écrit ses propres aperçus
// (.art-preview/<son nom>.png) ; les plans réécrits par la cabane, la grange et l'étal (src/content/plans/) ne sont jamais effacés,
// et le serveur les écrit d'un coup (renommage : vite.config.ts), si bien qu'un autre scénario qui démarre les lit toujours entiers ;
// celui qui efface un plan (construction) tourne seul, après les autres (ALONE).

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

/** Les scénarios, les plus longs d'abord (pour finir plus tôt quand ils tournent à plusieurs). */
export const SCENARIOS = ['monde', 'grange', 'equarrissage', 'fendage', 'cabane', 'etal', 'combat', 'temps', 'interieur', 'construction', 'tas', 'poteaux', 'implantation', 'briques', 'perspective'];

/**
 * Ceux qui tournent seuls, après les autres : ils effacent un fichier que tous lisent au démarrage (construction écrit puis efface
 * src/content/plans/essai-de-construction.json ; un autre jeu qui démarre à ce moment ne trouverait plus le plan qu'il importe).
 */
export const ALONE = ['construction'];

const jobs = Math.max(1, Number(process.env.SCENARIOS_JOBS) || 4);
/** Au-delà, un scénario est arrêté (SCENARIOS_LIMIT, en secondes ; 15 min par défaut). */
const LIMIT_S = Math.max(60, Number(process.env.SCENARIOS_LIMIT) || 900);

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
    // son propre groupe de processus : l'arrêter arrête aussi son navigateur et son serveur
    const child = spawn('npx', ['tsx', `tools/test-${name}.ts`], { detached: true, env: { ...process.env, FENDAGE_REQUIRED: process.env.FENDAGE_REQUIRED ?? '1' } });
    let out = '';
    // le seul garde-fou de temps : un scénario qui ne finit pas (une attente d'état qui ne vient jamais) est arrêté
    const guard = setTimeout(() => {
      out += `\n✗ ${name} : arrêté au bout de ${LIMIT_S} s (une attente qui ne se termine pas)\n`;
      try {
        process.kill(-child.pid!, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }, LIMIT_S * 1000);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => {
      clearTimeout(guard);
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
const queue = SCENARIOS.filter((n) => !ALONE.includes(n));
const done = (r: Result) => {
  console.log(`${r.ok ? '✓' : '✗'} ${r.name} (${(r.ms / 1000).toFixed(0)} s)`);
  results.push(r);
};
await Promise.all(
  Array.from({ length: Math.min(jobs, queue.length) }, async () => {
    for (let name = queue.shift(); name; name = queue.shift()) done(await run(name));
  }),
);
for (const name of ALONE) done(await run(name));
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
