// npm run test:scenarios:bg : la suite des scénarios sur une copie figée, pour que le dossier de travail puisse changer pendant ce
// temps sans fausser les tests. Crée (ou remet au commit en cours) un worktree git séparé, ../rpg-game-tests, détaché sur le commit
// HEAD du dossier de travail (ce qui n'est pas commité n'y est pas), son node_modules relié par un lien symbolique à celui du dossier
// de travail ; y lance npm run art, npm run maps et la suite parallèle (tools/run-scenarios.ts), et écrit le rapport dans
// ../rpg-game-tests/rapport-scenarios.txt (le commit, la date, le tableau ; la sortie complète dans scenarios.log, à côté).
// À lancer en arrière-plan ; code de sortie : celui de la suite.

import { execFileSync, spawn } from 'node:child_process';
import { cpSync, createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const work = process.cwd();
const dir = resolve(work, '..', 'rpg-game-tests');
const git = (...args: string[]) => execFileSync('git', args, { cwd: work, encoding: 'utf8' }).trim();
const sha = git('rev-parse', 'HEAD');
const subject = git('log', '-1', '--format=%s');
const report = join(dir, 'rapport-scenarios.txt');
const logFile = join(dir, 'scenarios.log');

// le worktree, au commit en cours : créé, ou remis à ce commit (ce qui y traîne d'un passage d'avant est effacé, sauf ce que git
// ignore : les fichiers générés et les aperçus, qui sont refaits)
const known = git('worktree', 'list', '--porcelain').split('\n').some((l) => l === `worktree ${dir}`);
if (!known) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  git('worktree', 'add', '--detach', dir, sha);
} else {
  execFileSync('git', ['checkout', '--detach', '--force', sha], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['clean', '-fdq', '-e', 'node_modules'], { cwd: dir, stdio: 'ignore' });
}
if (!existsSync(join(dir, 'node_modules'))) symlinkSync(join(work, 'node_modules'), join(dir, 'node_modules'), 'dir');
// les fichiers générés amorcent la chaîne (le contenu lit les cartes générées) : copiés une fois, puis refaits par art et maps
if (!existsSync(join(dir, 'src/generated'))) cpSync(join(work, 'src/generated'), join(dir, 'src/generated'), { recursive: true });
mkdirSync(join(dir, '.art-preview'), { recursive: true });

const started = new Date();
writeFileSync(report, `Scénarios en cours sur ${sha.slice(0, 7)} (${subject}), lancés le ${started.toLocaleString('fr-FR')}…\n`);
console.log(`Scénarios sur ${sha.slice(0, 7)} dans ${dir} ; rapport : ${report}`);

const log = createWriteStream(logFile);
/** Lance une commande dans le worktree, sa sortie dans scenarios.log ; rend son code. */
const step = (cmd: string, args: string[], env: NodeJS.ProcessEnv = {}) =>
  new Promise<number>((done) => {
    log.write(`\n$ ${cmd} ${args.join(' ')}\n`);
    const child = spawn(cmd, args, { cwd: dir, env: { ...process.env, ...env } });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    child.on('close', (code) => done(code ?? 1));
  });

const table = join(dir, '.scenarios-table.txt');
let code = (await step('npm', ['run', 'art'])) || (await step('npm', ['run', 'maps']));
if (code === 0) code = await step('npx', ['tsx', 'tools/run-scenarios.ts'], { SCENARIOS_REPORT: table });
const minutes = ((Date.now() - started.getTime()) / 60000).toFixed(1);
const body = existsSync(table) ? readFileSync(table, 'utf8') : `La suite n'a pas tourné : npm run art ou npm run maps a échoué (voir ${logFile}).\n`;
writeFileSync(report, `Scénarios sur ${sha.slice(0, 7)} (${subject}), le ${started.toLocaleString('fr-FR')}, en ${minutes} min\n${body}Sortie complète : ${logFile}\n`);
log.end();
console.log(readFileSync(report, 'utf8'));
process.exit(code);
