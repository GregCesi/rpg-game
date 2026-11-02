// Le tableau des capacités (docs/AUDIT.md, « Normalisation ») : tous les objets du contenu (props.json, items.json, et la pièce de bois
// dans chacun de ses diamètres) × ce qu'ils savent faire, tiré des données seules. Une case dit la capacité et d'où elle vient ; « — »
// : l'objet ne l'a pas ; « ? » : une case vide suspecte (une capacité qu'on attendrait d'après les autres données de l'objet). Les cases
// suspectes sont listées sous le tableau, chacune avec sa correction proposée.
// Usage : npm run capacites (après npm run art) ; --md <fichier> écrit aussi le tableau en Markdown.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { items, piles, props, transforms, wood } from '../src/content';
import { viewImages } from '../src/content/views';
import { WOOD_PIECE } from '../src/world/woodPiece';

type Row = Record<string, string>;
const COLUMNS = ['objet', 'genre', 'portable', 'tas', 'outil', 'arme', 'cible', 'travail', 'bois', 'transformé', 'vues', 'fiche', 'masse', 'dims', 'âge', 'métier'] as const;

const manifest = JSON.parse(readFileSync('src/generated/manifest.json', 'utf8')) as { spritesheets: { key: string }[]; tilesets: { key: string }[]; images: { key: string }[] };
const drawn = new Set([...manifest.spritesheets, ...manifest.tilesets, ...manifest.images].map((a) => a.key));
const has = (k: string) => drawn.has(k);

// les listes de validate.ts, lues dans son texte (elles n'en sortent pas) : RAW_WOOD (bois brut, sans âges), VIEWS_TODO (vues à dessiner)
const validate = readFileSync('src/content/validate.ts', 'utf8');
const keysOf = (name: string): Set<string> => {
  const m = new RegExp(`const ${name}[^=]*= \\{([\\s\\S]*?)\\n\\};`).exec(validate);
  return new Set([...(m?.[1] ?? '').matchAll(/^\s*'?([a-z0-9-]+)'?\s*:/gm)].map((x) => x[1]));
};
const RAW_WOOD = keysOf('RAW_WOOD');
const VIEWS_TODO = keysOf('VIEWS_TODO');

// les fiches : docs/objets/<clé>.md, ou une fiche de groupe qui nomme la clé sur sa ligne « Clé »
const named = new Map<string, string>();
for (const f of readdirSync('docs/objets').filter((f) => f.endsWith('.md') && f !== 'README.md')) {
  const text = readFileSync(`docs/objets/${f}`, 'utf8');
  for (const line of text.split('\n').filter((l) => /^- Cl[ée]s?\s*:/.test(l))) for (const m of line.matchAll(/`([a-z0-9-]+)`/g)) if (!named.has(m[1])) named.set(m[1], f);
}
const ficheOf = (k: string): string => (existsSync(`docs/objets/${k}.md`) ? `${k}.md` : (named.get(k) ?? ''));

// les outils : où chaque outil travaille (récoltes, bois, transformations)
const jobsOf = new Map<string, string[]>();
const addJob = (tool: string, job: string) => jobsOf.set(tool, [...(jobsOf.get(tool) ?? []), job]);
for (const [k, p] of Object.entries(props)) {
  const h = p.harvest;
  if (!h) continue;
  const kind = h.work ? Object.keys(h.work)[0] : `${h.hits} coup${h.hits > 1 ? 's' : ''}`;
  if (h.tool) addJob(h.tool, `${kind} ${k}`);
  for (const t of Object.keys(h.also)) addJob(t, `${h.also[t]} ${k}`);
}
addJob(wood.cut.tool, 'couper le bois');
addJob(wood.split.maul, 'fendre (masse)');
addJob(wood.split.wedge, 'fendre (coin)');
addJob(wood.hew.tool, 'équarrir');
for (const [k, t] of Object.entries(transforms)) for (const tool of t.tools) addJob(tool, `${k}${t.gesture === 'soon' ? ' (à venir)' : ''}`);

// les tas : la pièce de chaque genre écrit (piles.json) et son compteur ; la pièce de bois va en tas calculés
const pileOf = new Map<string, { genre: string; count: boolean }>();
for (const [g, d] of Object.entries(piles)) {
  const piece = d.piece as { item?: string; prop?: string };
  const key = piece.item ?? piece.prop;
  if (key) pileOf.set(key, { genre: g, count: !!d.count });
}

// ce qui entre dans une transformation
const transformedIn = new Map<string, string[]>();
for (const [k, t] of Object.entries(transforms))
  for (const i of t.inputs as { item?: string; prop?: string }[]) {
    const key = i.item ?? i.prop ?? '';
    transformedIn.set(key, [...(transformedIn.get(key) ?? []), k]);
  }

const massOf = (m: unknown): string =>
  m === undefined
    ? ''
    : typeof m === 'number'
      ? `${m} kg`
      : m === 'wood'
        ? 'bois (calculée)'
        : m === 'stone'
          ? 'pierre (calculée)'
          : typeof m === 'object' && m && 'matter' in m
            ? `${(m as { matter: string }).matter} (matière)`
            : String(m);
const isWoodMass = (m: unknown) => m === 'wood' || (typeof m === 'object' && !!m && (m as { matter?: string }).matter === 'wood');
const handsLabel = (n: number) => `${n} main${n > 1 ? 's' : ''}`;
const pileLabel = (k: string) => {
  const p = pileOf.get(k);
  return p ? `${p.genre}${p.count ? ' (compté)' : ''}` : '—';
};

const rows: Row[] = [];
const suspicious: { key: string; column: string; why: string; fix: string }[] = [];
const flag = (row: Row, key: string, column: string, why: string, fix: string) => {
  row[column] = '?';
  suspicious.push({ key, column, why, fix });
};
/**
 * Les règles qui ne voient pas la matière : un objet du menuisier ou du charpentier est de bois travaillé (ses trois âges) ; un objet sans
 * métier ni masse de matière n'a pas de chaîne (d'où il vient, qui le fait : CONCEPTION « Les matières »).
 */
function woodWork(row: Row, k: string, d: { trade?: string; aged?: boolean; mass?: unknown }): void {
  if ((d.trade === 'joiner' || d.trade === 'carpenter') && !d.aged && !RAW_WOOD.has(k))
    flag(row, k, 'âge', `objet de bois travaillé (métier ${d.trade}) sans \`aged\` : la règle de l'âge ne voit que la masse`, 'une matière déclarée pour tout objet de bois, et la règle de l’âge sur la matière');
  if (!d.trade) flag(row, k, 'métier', 'sans métier (`trade`) : sa chaîne n’est pas dite', 'son `trade` (CONCEPTION « Les matières »), ou le noter naturel');
}
const missingViews = (base: string, views: Parameters<typeof viewImages>[1]) => viewImages(base, views, has).filter((v) => !has(v));
const viewsLabel = (k: string, views: string, miss: string[]) => `${views}${miss.length ? ` (${miss.length} à dessiner${VIEWS_TODO.has(k) ? ', VIEWS_TODO' : ''})` : ''}`;

for (const [k, p] of Object.entries(props)) {
  if (k === WOOD_PIECE) continue;
  const h = p.harvest;
  const row: Row = {
    objet: k,
    genre: 'monde',
    portable: p.take ? handsLabel(p.take.hands) : '—',
    tas: pileLabel(k),
    outil: '—',
    arme: '—',
    cible: p.target ? p.target.matter : '—',
    travail: h
      ? h.work
        ? `${Object.keys(h.work)[0]} (${h.tool})${h.stages ? `, ${h.stages.length} étapes` : ''}`
        : `${h.hits} coup${h.hits > 1 ? 's' : ''}${h.tool ? ` (${h.tool})` : ' (à la main)'}`
      : '—',
    bois: '—',
    transformé: transformedIn.get(k)?.join(', ') ?? '—',
    vues: viewsLabel(k, p.views, missingViews(p.image, p.views)),
    fiche: ficheOf(k) || '—',
    masse: massOf(p.mass) || '—',
    dims: `${p.dims.w}×${p.dims.d}×${p.dims.h}`,
    âge: p.aged ? 'trois âges' : RAW_WOOD.has(k) ? 'bois brut' : '—',
    métier: p.trade ?? '—',
  };
  woodWork(row, k, p);
  if (!p.aged && !RAW_WOOD.has(k) && isWoodMass(p.mass)) flag(row, k, 'âge', 'masse de bois sans `aged`', '`"aged": true` (ses âges tirés par le build) ou RAW_WOOD avec sa raison');
  if (p.take && p.mass === undefined) flag(row, k, 'masse', 'se prend sans masse', 'une `mass`');
  if (h && !h.work && h.tool) flag(row, k, 'travail', `récolte à l'outil (${h.tool}) en coups simples à prix fixe, sans matière`, 'une matière (`harvest.work`) : le travail au coup, comme le reste');
  if (row.fiche === '—') flag(row, k, 'fiche', 'pas de fiche', `docs/objets/${k}.md, ou une fiche de groupe qui nomme sa clé`);
  rows.push(row);
}

for (const [k, it] of Object.entries(items)) {
  const jobs = jobsOf.get(k);
  const row: Row = {
    objet: k,
    genre: `possédable (${it.kind})`,
    portable: handsLabel(it.hands),
    tas: pileLabel(k),
    outil: it.work ? (jobs?.join(' ; ') ?? 'données de coup, sans travail') : jobs ? `${jobs.join(' ; ')} (sans données de coup)` : '—',
    arme: it.weapon ? it.weapon.family : '—',
    cible: '—',
    travail: '—',
    bois: '—',
    transformé: transformedIn.get(k)?.join(', ') ?? '—',
    vues: it.ground ? viewsLabel(k, it.views, missingViews(it.ground, it.views)) : `${it.views} (pas d’image au sol)`,
    fiche: ficheOf(k) || '—',
    masse: massOf(it.mass) || '—',
    dims: it.dims ? `${it.dims.w}×${it.dims.d}×${it.dims.h}` : '—',
    âge: it.aged ? 'trois âges' : RAW_WOOD.has(k) ? 'bois brut' : '—',
    métier: it.trade ?? '—',
  };
  woodWork(row, k, it);
  if (!it.aged && !RAW_WOOD.has(k) && isWoodMass(it.mass)) flag(row, k, 'âge', 'masse de bois sans `aged`', '`"aged": true` ou RAW_WOOD avec sa raison');
  if (it.ground && !it.dims) flag(row, k, 'dims', 'une image au sol sans dimensions : le gabarit ne la contrôle pas', 'reporter les `dims` de sa fiche dans items.json');
  if (!it.ground) flag(row, k, 'vues', 'pas d’image au sol : posé, il s’affiche par son icône de 16 px (80 cm)', 'son image au sol et ses vues (pixel-artist), ou ne pas le proposer au sol');
  if (it.kind === 'tool' && !it.work && !jobs) flag(row, k, 'outil', 'un outil qui ne travaille nulle part', 'son travail (une récolte, une transformation), ou le retirer');
  else if (jobs && !it.work && jobs.some((j) => !j.includes('à venir'))) flag(row, k, 'outil', 'travaille sans données de coup', '`work` dans items.json (le travail au coup)');
  if (it.work && !has(`tool-${k}`)) flag(row, k, 'outil', `données de coup, mais pas de planche en main \`tool-${k}\` : invisible pendant le geste`, 'ses cinq dessins en main (pixel-artist, art/items/held.ts)');
  if (it.weapon && !has(it.weapon.image ?? `weapon-${k}`)) flag(row, k, 'arme', `arme sans sa planche \`${it.weapon.image}\``, 'son dessin couché vers l’est (pixel-artist)');
  if (it.pile && !pileOf.has(k)) flag(row, k, 'tas', `\`pile\` nomme '${it.pile}', qui ne prend pas cet objet`, 'le genre dans piles.json, ou retirer `pile`');
  if (pileOf.has(k) && !it.pile) flag(row, k, 'tas', 'un genre de tas le prend, mais l’objet ne le nomme pas (`pile`)', '`pile` dans items.json');
  if (row.fiche === '—') flag(row, k, 'fiche', 'pas de fiche', `docs/objets/${k}.md, ou une fiche de groupe`);
  rows.push(row);
}

// la pièce de bois, un diamètre à la fois (ses aspects : ce qu'elle devient)
for (const [size, d] of Object.entries(wood.sizes)) {
  const looks = Object.keys(d.looks);
  rows.push({
    objet: `${WOOD_PIECE} ${size}`,
    genre: `pièce de bois (Ø ${d.diameter} cm)`,
    portable: 'selon sa masse (`carry`), sinon roulée',
    tas: 'calculé (woodPile.ts)',
    outil: '—',
    arme: '—',
    cible: '—',
    travail: '—',
    bois: [`se coupe (${wood.cut.tool})`, Object.keys(d.split).length ? `se fend (${Object.keys(d.split).join(', ')})` : '', looks.includes('beam') ? `s'équarrit (${wood.hew.tool})` : ''].filter(Boolean).join(', '),
    transformé: transformedIn.get(WOOD_PIECE)?.join(', ') ?? '—',
    vues: `calculées (${looks.join(', ')})`,
    fiche: ficheOf(WOOD_PIECE) || '—',
    masse: 'bois (calculée)',
    dims: `Ø ${d.diameter}, longueur sur la grille`,
    âge: 'trois âges',
    métier: 'le bois (woodcutter, splitter, carpenter)',
  });
}

const md = [
  `| ${COLUMNS.join(' | ')} |`,
  `| ${COLUMNS.map(() => '---').join(' | ')} |`,
  ...rows.map((r) => `| ${COLUMNS.map((c) => (r[c] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
].join('\n');
const byColumn = Object.entries(suspicious.reduce<Record<string, number>>((a, s) => ({ ...a, [s.column]: (a[s.column] ?? 0) + 1 }), {}))
  .map(([c, n]) => `${c} ${n}`)
  .join(', ');
const list = suspicious.map((s) => `- \`${s.key}\` (${s.column}) : ${s.why} → ${s.fix}`).join('\n');
const summary = `${rows.length} objets ; ${suspicious.length} cases suspectes (${byColumn}) :\n\n${list}`;

console.log(`${md}\n\n${summary}`);
const at = process.argv.indexOf('--md');
if (at > 0 && process.argv[at + 1]) writeFileSync(process.argv[at + 1], `${md}\n\n${summary}\n`);
