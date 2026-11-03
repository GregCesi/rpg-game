// Vérifie tout le contenu d'un coup, sans lancer le jeu : formats JSON (Zod) et références croisées.
// Usage : npm run check   (lance d'abord npm run art, qui produit le catalogue des images, puis npm run maps, qui traduit les cartes Tiled)

import { readdirSync, readFileSync } from 'node:fs';

async function main() {
  let content;
  try {
    content = await import('../src/content/index');
  } catch (e) {
    console.error(`\n✗ ${(e as Error).message}\n`);
    process.exit(1);
  }
  const { catalogFrom, validateBuildPlans, validateContent, viewsTodo, workDurations } = await import('../src/content/validate');
  const manifest = JSON.parse(readFileSync('src/generated/manifest.json', 'utf8'));
  const cat = catalogFrom(manifest);
  // les poses des gestes de combat, écrites par npm run art juste avant (validate.ts ne les importe pas lui-même)
  const { combatPoses } = await import('../src/generated/combatPoses');
  // le catalogue du mode construction, passé à validate.ts (le contenu ne dépend pas du jeu)
  const { catalog, looksOf } = await import('../src/build/catalog');
  const errors = validateContent({ ...content, combatPoses, buildCatalog: { entries: catalog(), looksOf } }, cat);
  // les plans du bac à sable (src/content/plans/*.json) : le jeu les charge par Vite, ici on les lit sur le disque
  const { parseBuildPlans } = await import('../src/content/buildPlanFiles');
  const dir = 'src/content/plans';
  const files = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [`./plans/${f}`, JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))]));
  let buildPlans = {};
  try {
    buildPlans = parseBuildPlans(files);
  } catch (e) {
    errors.push((e as Error).message);
  }
  errors.push(...validateBuildPlans(buildPlans));
  // la rampe de chaque roche (rocks.json) est faite de couleurs de la palette commune (le jeu ne lit pas art/ : on le vérifie ici)
  const { world } = await import('../art/palette');
  for (const [k, r] of Object.entries(content.rocks)) {
    for (const ch of r.ramp) if (!(ch in world)) errors.push(`rocks.json '${k}' : couleur '${ch}' de sa rampe absente de la palette commune (art/palette.ts)`);
  }
  // les tests d'accord entre eux : chaque scénario de la suite (SCENARIOS de tools/run-scenarios.ts) a son script test:<nom>, et chaque
  // script de test rapide nommé dans test:fast existe ; un scénario (tools/test-*.ts qui passe par playtest) est dans la suite
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
  const suite = /export const SCENARIOS = \[([^\]]*)\]/.exec(readFileSync('tools/run-scenarios.ts', 'utf8'))?.[1].match(/'([^']+)'/g)?.map((q) => q.slice(1, -1)) ?? [];
  for (const n of suite) if (!pkg.scripts[`test:${n}`]) errors.push(`scénario '${n}' (SCENARIOS) sans script test:${n} dans package.json`);
  for (const f of readdirSync('tools').filter((f) => /^test-.*\.ts$/.test(f))) {
    const name = f.slice(5, -3);
    if (readFileSync(`tools/${f}`, 'utf8').includes("from './lib/playtest'") && !suite.includes(name)) errors.push(`tools/${f} est un scénario absent de SCENARIOS (tools/run-scenarios.ts)`);
  }
  for (const m of pkg.scripts['test:fast'].matchAll(/tsx (tools\/[\w-]+\.ts)/g)) {
    try {
      readFileSync(m[1]);
    } catch {
      errors.push(`test:fast nomme ${m[1]}, absent`);
    }
  }
  // chaque objet a sa fiche (docs/objets/<clé>.md, ou une fiche de groupe qui nomme sa clé sur sa ligne « Clé ») ; celles qui restent à
  // écrire (FICHE_TODO, docs/AUDIT.md « Normalisation » : des fiches de groupe pour les meubles, les lumières, la végétation)
  const FICHE_TODO = new Set(
    'big-tree big-tree-stump normal-felled-tree rock bush bush-berries rock-rubble cottage chopping-block chopping-block-rope fireplace worktable workbench stove bed pallet sack jar sunpatch lantern wall-torch candle barrel crate hay-bale chest table stool shed-plate-side well cart-door-open stone iron-ore wheat seeds berries mushroom egg apple wool pickaxe hoe sickle watering-can fishing-rod sword'.split(' '),
  );
  const ficheFiles = readdirSync('docs/objets').filter((f) => f.endsWith('.md') && f !== 'README.md');
  const named = new Set<string>(ficheFiles.map((f) => f.slice(0, -3)));
  for (const f of ficheFiles)
    for (const line of readFileSync(`docs/objets/${f}`, 'utf8').split('\n').filter((l) => /^- Cl[ée]s?\s*:/.test(l))) for (const m of line.matchAll(/`([a-z0-9-]+)`/g)) named.add(m[1]);
  for (const k of [...Object.keys(content.props), ...Object.keys(content.items)]) {
    if (!named.has(k) && !FICHE_TODO.has(k)) errors.push(`'${k}' : sa fiche (docs/objets/${k}.md, ou une fiche de groupe qui le nomme), ou FICHE_TODO de tools/check.ts`);
    if (named.has(k) && FICHE_TODO.has(k)) errors.push(`tools/check.ts FICHE_TODO : '${k}' a sa fiche, à retirer de la liste`);
  }
  if (errors.length) {
    console.error(`\n✗ ${errors.length} problème(s) dans le contenu :`);
    for (const e of errors) console.error(`  - ${e}`);
    console.error('');
    process.exit(1);
  }
  const n = (o: object) => Object.keys(o).length;
  console.log(
    `✓ contenu valide : ${n(content.maps)} cartes, ${n(content.props)} objets, ${n(content.items)} objets possédables, ${n(content.dialogues)} dialogues, ${n(content.characters)} personnages, ${n(buildPlans)} plans du bac à sable`,
  );
  // le travail : la durée de chaque travail pour Xéros d'aujourd'hui, calculée de ses coups (docs/CONCEPTION.md, « Le travail »)
  const mm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')}` : m >= 1 ? `${Math.round(m)} min` : `${Math.round(m * 60)} s`);
  console.log('… le travail, pour Xéros d’aujourd’hui (calculé, pas imposé) :');
  for (const w of workDurations()) console.log(`    ${w.name} : ${w.strokes} coups, ${w.pauses} pauses, ${mm(w.minutes)}, ${w.ceiling.toFixed(1)} points`);
  // toutes les faces : ce qui reste à dessiner (VIEWS_TODO, validate.ts), redit à chaque vérification
  const todo = viewsTodo(content, cat);
  if (todo.objects.length) {
    console.log(`… vues à dessiner (VIEWS_TODO) : ${todo.objects.length} objets, ${todo.drawings} dessins`);
    for (const o of todo.objects) console.log(`    ${o.key} : ${o.missing.length} (${o.reason})`);
  }
}

main();
