// La carte du code (npm run carte) : recalcule le graphe des imports de src/ avec dependency-cruiser, le croise avec les textes
// de docs/carte/carte.json (systèmes, parcours, lexique) et régénère docs/carte/index.html, une page autonome (sans serveur ni
// réseau) tirée du modèle docs/carte/modele.html. Le graphe de la fois d'avant est gardé dans docs/carte/graphe.json : la commande
// signale un fichier ou une flèche qui a disparu depuis, un fichier cité par carte.json qui n'existe plus, et un fichier nouveau
// qu'aucun système ne range. Un fichier cité qui manque fait échouer la commande (code 1) : le texte est à corriger.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const TEXTS = 'docs/carte/carte.json';
const MODEL = 'docs/carte/modele.html';
const OUT = 'docs/carte/index.html';
const SNAPSHOT = 'docs/carte/graphe.json';
const GENERATED = 'src/generated';

interface Texts {
  titre: string;
  intro: string;
  niveau1: { blocs: { id: string; glob?: string; fichiers?: string[] }[]; fleches: [string, string, string][] };
  systemes: { id: string; nom: string; fichiers: string[] }[];
  fichiers: Record<string, string>;
  parcours: { id: string; nom: string; etapes: { s: string; f: string; t: string }[] }[];
  lexique: [string, string][];
  travail: [string, string][];
}

interface Dep {
  module: string;
  resolved: string;
  couldNotResolve: boolean;
}
interface Mod {
  source: string;
  dependencies: Dep[];
}

const texts: Texts = JSON.parse(fs.readFileSync(TEXTS, 'utf8'));
const errors: string[] = [];
const notes: string[] = [];

// --- Le graphe, tiré de dependency-cruiser ---
const cruise = spawnSync(
  path.join('node_modules', '.bin', 'depcruise'),
  ['src', '--config', '.dependency-cruiser.cjs', '--output-type', 'json'],
  { encoding: 'utf8', maxBuffer: 1 << 28 },
);
if (!cruise.stdout) {
  console.error('dependency-cruiser n’a rien rendu :', cruise.stderr);
  process.exit(1);
}
const modules: Mod[] = JSON.parse(cruise.stdout).modules;

/** Le nom d'un nœud de la carte : un fichier de src/, un JSON, src/generated, phaser ; rien pour le reste. */
function nodeOf(d: Dep): string | undefined {
  if (d.module.includes('generated/') || d.resolved.startsWith(`${GENERATED}/`)) return GENERATED;
  if (d.resolved.startsWith('node_modules/phaser')) return 'phaser';
  if (d.couldNotResolve) return undefined;
  if (d.resolved.startsWith('src/')) return d.resolved;
  return undefined;
}

const codeFiles = modules
  .map((m) => m.source)
  .filter((s) => s.startsWith('src/') && s.endsWith('.ts') && !s.startsWith(`${GENERATED}/`))
  .sort();
const isCode = new Set(codeFiles);

interface FileInfo {
  sys: string;
  lignes: number;
  role: string;
  utilise: string[];
  utilisePar: string[];
  donnees: string[];
  externes: string[];
}
const files: Record<string, FileInfo> = {};

/** Le rôle d'un fichier : son premier commentaire, en deux phrases au plus. */
function headerOf(file: string): string {
  const all = fs.readFileSync(file, 'utf8').split('\n');
  const first = all.find((l) => l.trim());
  const headed = !!first && /^\s*(\/\/|\/\*)/.test(first);
  // sans commentaire d'en-tête, le rôle est celui de la classe exportée (le commentaire juste au-dessus d'elle)
  const cls = headed ? -1 : all.findIndex((l) => /^export (default )?(abstract )?class /.test(l));
  let lines = all;
  if (cls > 0) {
    let i = cls - 1;
    while (i >= 0 && /^\s*(\/\/|\/\*|\*)/.test(all[i])) i--;
    if (i < cls - 1) lines = all.slice(i + 1, cls);
  }
  const out: string[] = [];
  let inBlock = false;
  for (const raw of lines) {
    const l = raw.trim();
    if (inBlock) {
      if (l.startsWith('*/')) break;
      out.push(l.replace(/^\*\s?/, '').replace(/\*\/$/, ''));
      if (l.endsWith('*/')) break;
      continue;
    }
    if (l.startsWith('//')) {
      const c = l.replace(/^\/\/\s?/, '');
      if (/^(eslint|@ts-|prettier)/.test(c)) continue;
      out.push(c);
      continue;
    }
    if (out.length) break;
    if (l.startsWith('/*')) {
      const c = l.replace(/^\/\*\*?\s?/, '').replace(/\*\/$/, '');
      if (c) out.push(c);
      if (l.endsWith('*/') && l.length > 3) break;
      inBlock = true;
    }
  }
  const text = out.join(' ').replace(/\s+/g, ' ').trim();
  // une phrase finit par un point suivi d'une majuscule (pas le point de « CONCEPTION.md » ni de « work.ts »)
  const sentences = text.split(/(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-Þ«(])/);
  let role = sentences.slice(0, 2).join(' ').trim();
  if (role.length > 420) role = `${role.slice(0, 417).replace(/\s+\S*$/, '')}…`;
  return role || 'Pas de commentaire en tête de fichier.';
}

const sysOf = new Map<string, string>();
const systemIds = new Set(texts.systemes.map((s) => s.id));
for (const s of texts.systemes) {
  for (const f of s.fichiers) {
    if (!fs.existsSync(f)) errors.push(`Le système « ${s.nom} » cite ${f}, qui n'existe plus.`);
    else if (sysOf.has(f)) errors.push(`${f} est rangé dans deux systèmes : ${sysOf.get(f)} et ${s.id}.`);
    else sysOf.set(f, s.id);
  }
}
const unranked = codeFiles.filter((f) => !sysOf.has(f));
for (const f of unranked) notes.push(`Fichier nouveau qu'aucun système ne range (affiché dans « Autres ») : ${f}`);

for (const m of modules) {
  if (!isCode.has(m.source)) continue;
  const uses = new Set<string>();
  const data = new Set<string>();
  const ext = new Set<string>();
  for (const d of m.dependencies) {
    const n = nodeOf(d);
    if (!n || n === m.source) continue;
    if (n === GENERATED || n === 'phaser') ext.add(n);
    else if (n.endsWith('.json')) data.add(n);
    else if (isCode.has(n)) uses.add(n);
  }
  files[m.source] = {
    sys: sysOf.get(m.source) ?? 'autres',
    lignes: fs.readFileSync(m.source, 'utf8').split('\n').length,
    role: texts.fichiers[m.source] ?? headerOf(m.source),
    utilise: [...uses].sort(),
    utilisePar: [],
    donnees: [...data].sort(),
    externes: [...ext].sort(),
  };
}
for (const [f, info] of Object.entries(files)) for (const u of info.utilise) files[u].utilisePar.push(f);
for (const info of Object.values(files)) info.utilisePar.sort();
for (const f of Object.keys(texts.fichiers)) if (!files[f]) errors.push(`Le rôle écrit pour ${f} ne sert plus : le fichier n'existe plus.`);

// --- Les flèches entre systèmes ---
const sysEdges = new Map<string, { de: string; vers: string; n: number; exemples: [string, string][] }>();
const fileEdges: [string, string][] = [];
for (const [f, info] of Object.entries(files)) {
  for (const u of info.utilise) {
    fileEdges.push([f, u]);
    const a = info.sys;
    const b = files[u].sys;
    if (a === b) continue;
    const k = `${a}>${b}`;
    const e = sysEdges.get(k) ?? { de: a, vers: b, n: 0, exemples: [] };
    e.n++;
    e.exemples.push([f, u]);
    sysEdges.set(k, e);
  }
}

// --- Les parcours ---
for (const p of texts.parcours) {
  for (const [i, e] of p.etapes.entries()) {
    if (!systemIds.has(e.s)) errors.push(`Parcours « ${p.nom} », étape ${i + 1} : le système ${e.s} n'existe pas.`);
    if (!files[e.f]) errors.push(`Parcours « ${p.nom} », étape ${i + 1} : ${e.f} n'existe plus.`);
    else if (files[e.f].sys !== e.s) notes.push(`Parcours « ${p.nom} », étape ${i + 1} : ${e.f} est rangé dans ${files[e.f].sys}, pas dans ${e.s}.`);
  }
}

// --- Le niveau 1 : les fichiers de chaque bloc ---
function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      re += '.*';
      i++;
      if (glob[i + 1] === '/') i++;
    } else if (c === '*') re += '[^/]*';
    else if (c === '{') re += '(';
    else if (c === '}') re += ')';
    else if (c === ',') re += '|';
    else re += c.replace(/[.+?^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.posix.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const allRepo = [...walk('src'), ...walk('art'), ...walk('tools'), ...walk('tiled')];
const blocs = texts.niveau1.blocs.map((b) => {
  let liste = b.fichiers ?? [];
  if (b.glob) {
    const re = globToRegExp(b.glob);
    liste = allRepo.filter((f) => re.test(f) && !f.startsWith(`${GENERATED}/`)).sort();
    if (!liste.length) errors.push(`Le bloc ${b.id} ne trouve aucun fichier pour ${b.glob}.`);
  }
  for (const f of b.fichiers ?? []) if (!fs.existsSync(f)) errors.push(`Le bloc ${b.id} cite ${f}, qui n'existe plus.`);
  return { ...b, liste };
});

// --- Ce qui a disparu depuis la dernière fois ---
if (fs.existsSync(SNAPSHOT)) {
  const old: { fichiers: string[]; fleches: [string, string][]; flechesSystemes: [string, string][] } = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  for (const f of old.fichiers) if (!files[f]) notes.push(`Fichier disparu depuis la dernière carte : ${f}`);
  const nowSys = new Set(sysEdges.keys());
  for (const [a, b] of old.flechesSystemes) if (!nowSys.has(`${a}>${b}`)) notes.push(`Flèche disparue entre systèmes : ${a} → ${b}`);
  const nowFiles = new Set(fileEdges.map(([a, b]) => `${a}>${b}`));
  const gone = old.fleches.filter(([a, b]) => !nowFiles.has(`${a}>${b}`));
  for (const [a, b] of gone.slice(0, 30)) notes.push(`Flèche disparue : ${a} → ${b}`);
  if (gone.length > 30) notes.push(`… et ${gone.length - 30} autres flèches disparues.`);
}
fs.writeFileSync(
  SNAPSHOT,
  `${JSON.stringify(
    {
      fichiers: Object.keys(files).sort(),
      flechesSystemes: [...sysEdges.values()].map((e) => [e.de, e.vers]).sort(),
      fleches: fileEdges.sort(),
    },
    null,
    0,
  ).replace(/\],\[/g, '],\n[')}\n`,
);

// --- La page ---
const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const systemes: Record<string, unknown>[] = texts.systemes.map((s) => ({ ...s }));
if (unranked.length)
  systemes.push({
    id: 'autres',
    nom: 'Autres (à ranger)',
    fichiers: unranked,
    x: 0,
    y: 3,
    role: 'Des fichiers nouveaux qu’aucun système de docs/carte/carte.json ne range encore.',
    donnees: [],
    regles: [],
    tests: [],
  });
const data = {
  meta: {
    genere: new Date().toISOString().slice(0, 10),
    commit,
    nbFichiers: Object.keys(files).length,
    nbFleches: fileEdges.length,
  },
  titre: texts.titre,
  intro: texts.intro,
  niveau1: { blocs, fleches: texts.niveau1.fleches },
  systemes,
  fichiers: files,
  fleches: [...sysEdges.values()].sort((a, b) => b.n - a.n),
  parcours: texts.parcours,
  lexique: texts.lexique,
  travail: texts.travail,
  alertes: [...errors, ...notes],
};
const json = JSON.stringify(data).replace(/</g, '\\u003c');
const model = fs.readFileSync(MODEL, 'utf8');
const marker = '/*__DONNEES__*/null';
if (!model.includes(marker)) {
  console.error(`Le modèle ${MODEL} n'a plus la marque ${marker}.`);
  process.exit(1);
}
fs.writeFileSync(OUT, model.replace(marker, () => json).replace('__TITRE__', texts.titre));

console.log(`Carte écrite : ${OUT} (${data.meta.nbFichiers} fichiers, ${data.meta.nbFleches} flèches, ${sysEdges.size} flèches entre systèmes).`);
for (const n of notes) console.log(`  signalé : ${n}`);
for (const e of errors) console.error(`  ERREUR : ${e}`);
if (errors.length) process.exit(1);
