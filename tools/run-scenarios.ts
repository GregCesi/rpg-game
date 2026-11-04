// Lance tous les scénarios dans le vrai jeu (tools/test-<nom>.ts, chacun avec son Chromium et son serveur Vite sur un port libre),
// plusieurs à la fois : SCENARIOS_JOBS (4 par défaut). Ne s'arrête pas au premier échec : tous tournent, puis un tableau dit chaque
// scénario (✓ ou ✗, durée, et pour un échec la première ligne de l'erreur). SCENARIOS_REPORT=<fichier> y écrit aussi le tableau.
// Code de sortie : 1 si un scénario échoue. Usage : npm run test:scenarios (après npm run art et npm run maps).
//
// Ce qui pourrait se gêner quand ils tournent ensemble, et pourquoi ça ne se gêne pas : chaque scénario a son navigateur (sa
// sauvegarde, localStorage, est à lui) et son serveur sur un port libre (tools/lib/playtest.ts) ; chacun écrit ses propres aperçus
// (.art-preview/<son nom>.png) ; les plans réécrits par la cabane, la grange, l'étal et la maison (src/content/plans/) ne sont jamais effacés,
// et le serveur les écrit d'un coup (renommage : vite.config.ts), si bien qu'un autre scénario qui démarre les lit toujours entiers ;
// celui qui efface un plan (construction) tourne seul, après les autres (ALONE).

import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sharedRig } from './lib/playtest';

/** Les scénarios, les plus longs d'abord (pour finir plus tôt quand ils tournent à plusieurs). */
export const SCENARIOS = ['maison', 'monde', 'noeud', 'grange', 'equarrissage', 'fendage', 'cabane', 'etal', 'combat', 'lapins', 'relief', 'temps', 'reset', 'vitesses', 'etapes', 'interieur', 'construction', 'tas', 'poteaux', 'implantation', 'briques', 'perspective', 'portes', 'forge', 'forge-visite'];

/**
 * Ceux qui tournent seuls, après les autres : ils effacent un fichier que tous lisent au démarrage (construction écrit puis efface
 * src/content/plans/essai-de-construction.json ; un autre jeu qui démarre à ce moment ne trouverait plus le plan qu'il importe).
 */
export const ALONE = ['construction'];

/**
 * Les scénarios lourds : ceux qui bâtissent dans le mode construction (les bâtiments du catalogue, le mode lui-même). Ils ne tournent
 * qu'avant une fusion qui touche la construction (src/build/, src/world/build.ts, src/systems/build.ts, les plans, les pièces du
 * catalogue) : `npm run test:scenarios:all` (ou SCENARIOS_ALL=1, `--all`) les lance avec les autres ; sans, ils sont sautés et le
 * tableau le dit.
 */
export const HEAVY = ['maison', 'cabane', 'grange', 'etal', 'construction', 'forge'];
const ALL = process.argv.includes('--all') || !!process.env.SCENARIOS_ALL;
const RUN = SCENARIOS.filter((n) => ALL || !HEAVY.includes(n));

const jobs = Math.max(1, Number(process.env.SCENARIOS_JOBS) || 4);
/**
 * Chaque scénario déclare sa vitesse (`speed` de playtest : x1 pour bâtir dans le mode construction et pour test-temps ; x10 par
 * défaut, la vitesse de simulation de tools/lib/playtest.ts, pour ceux qui marchent ou travaillent). SCENARIOS_X1 (noms séparés par
 * des virgules) fait tourner en plus ceux-là à x1, pour voir le jeu à sa vitesse vraie.
 */
const X1 = (process.env.SCENARIOS_X1 ?? '').split(',').map((n) => n.trim()).filter(Boolean);
/** Au-delà, un scénario est arrêté (SCENARIOS_LIMIT, en secondes ; 15 min par défaut). */
const LIMIT_S = Math.max(60, Number(process.env.SCENARIOS_LIMIT) || 900);

interface Result {
  name: string;
  ok: boolean;
  ms: number;
  /** La première ligne de l'erreur (la ligne ✗, sinon la première ligne d'erreur de la sortie). */
  error?: string;
}

/**
 * Le banc partagé (SCENARIOS_SHARED=0 pour l'ancien : un serveur et un navigateur par scénario) : un serveur Vite et un Chromium pour
 * tous, un contexte de navigateur par scénario ; les plans que les scénarios de construction enregistrent vont dans un dossier
 * temporaire commun (chacun écrit le sien, sous son nom). Ceux de ALONE gardent leur serveur à eux.
 */
const SHARED = process.env.SCENARIOS_SHARED !== '0';
const plansOut = SHARED ? mkdtempSync(join(tmpdir(), 'xeros-plans-')) : undefined;
if (plansOut) process.env.XEROS_PLANS_OUT = plansOut;
const rig = SHARED ? await sharedRig() : undefined;

/** Lance un scénario et rend son résultat ; sa sortie est gardée, montrée seulement s'il échoue. */
function run(name: string): Promise<Result> {
  const t0 = Date.now();
  return new Promise((resolve) => {
    // son propre groupe de processus : l'arrêter arrête aussi son navigateur et son serveur
    const child = spawn('npx', ['tsx', `tools/test-${name}.ts`], { detached: true, env: envOf(name) });
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

/** L'environnement d'un scénario : sa vitesse, et le banc partagé s'il n'est pas de ceux qui tournent seuls. */
function envOf(name: string): NodeJS.ProcessEnv {
  const { XEROS_PLANS_OUT: _p, ...base } = process.env;
  return {
    ...base,
    FENDAGE_REQUIRED: process.env.FENDAGE_REQUIRED ?? '1',
    ...(X1.includes(name) ? { PLAYTEST_SPEED: '1' } : {}),
    ...(rig && !ALONE.includes(name) ? { PLAYTEST_URL: rig.url, PLAYTEST_WS: rig.ws, XEROS_PLANS_OUT: plansOut } : {}),
  };
}

const t0 = Date.now();
const results: Result[] = [];
const queue = RUN.filter((n) => !ALONE.includes(n));
const done = (r: Result) => {
  console.log(`${r.ok ? '✓' : '✗'} ${r.name} (${(r.ms / 1000).toFixed(0)} s)`);
  results.push(r);
};
await Promise.all(
  Array.from({ length: Math.min(jobs, queue.length) }, async () => {
    for (let name = queue.shift(); name; name = queue.shift()) done(await run(name));
  }),
);
await rig?.close();
if (plansOut) rmSync(plansOut, { recursive: true, force: true });
for (const name of ALONE.filter((n) => RUN.includes(n))) done(await run(name));
// un plan d'essai qu'un scénario arrêté de force (SIGKILL : son \`finally\` ne passe pas) aurait laissé dans le contenu
for (const f of readdirSync('src/content/plans')) if (f.startsWith('essai-')) rmSync(join('src/content/plans', f), { force: true });
const total = (Date.now() - t0) / 1000;
const order = (r: Result) => SCENARIOS.indexOf(r.name);
const width = Math.max(...SCENARIOS.map((n) => n.length));
const table = [
  `Scénarios : ${results.filter((r) => r.ok).length} sur ${results.length} passent, en ${total.toFixed(0)} s (${jobs} à la fois${ALL ? ', lourds compris' : `, sans les lourds : ${HEAVY.join(', ')}`})`,
  ...results.sort((a, b) => order(a) - order(b)).map((r) => `${r.ok ? '✓' : '✗'} ${r.name.padEnd(width)} ${String(Math.round(r.ms / 1000)).padStart(4)} s${r.error ? `  ${r.error}` : ''}`),
].join('\n');
console.log(`\n${table}`);
if (process.env.SCENARIOS_REPORT) writeFileSync(process.env.SCENARIOS_REPORT, `${table}\n`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
