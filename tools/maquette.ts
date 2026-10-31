// Maquette de la chaumière : imprime, en Markdown, les chiffres que reprend docs/maison-chaumiere.md (les couches, les éléments
// composés et leurs recettes, la nomenclature, ce qu'elle demande en arbres, en pierres et en heures, pour les deux plans).
// Ne change pas le jeu. Usage : npm run maquette ; `-- --images` écrit aussi les trois aperçus dans .art-preview/ (que
// npm run art:preview écrit de même).

import { BRICKS, DAY, WOOD_NAMES, WOOD_STATE, elementRecipes, fmt, hours, m, nomenclature, resources, woodKg } from './lib/chaumiere';
import type { Bill, WoodKind } from './lib/chaumiere';
import { PLANS } from './lib/chaumiere-plans';
import { writeMaquettePreviews } from './lib/maison-preview';

const kg = (n: number) => (n >= 1000 ? `${fmt(Math.round(n / 100) / 10)} t` : `${fmt(Math.round(n * 10) / 10)} kg`);
const massOf = (k: string, n: number) => (k === 'stone-chips' ? n : BRICKS[k].kg * n);

/** Les lignes d'une nomenclature : chaque brique, puis chaque pièce de bois par longueur. */
function rows(b: Bill): { name: string; n: number; kg: number; state: string; how: string }[] {
  const out = [...b.bricks].map(([k, n]) => ({ name: BRICKS[k].name, n, kg: massOf(k, n), state: BRICKS[k].state, how: BRICKS[k].how }));
  for (const k of Object.keys(b.wood) as WoodKind[]) {
    const byLength = new Map<number, number>();
    for (const l of b.wood[k]) byLength.set(l, (byLength.get(l) ?? 0) + 1);
    for (const [l, n] of [...byLength].sort((a, c) => c[0] - a[0])) {
      out.push({ name: `${WOOD_NAMES[k]} de ${m(l)}`, n, kg: n * woodKg(k, l), state: WOOD_STATE[k].state, how: WOOD_STATE[k].how });
    }
  }
  return out;
}

const out: string[] = [];
const [A, B] = PLANS;
const a = nomenclature(A);
out.push('## Couches (plan A)');
for (const l of a.layers) out.push(`### ${l.name}`, '', ...l.bill.lines().map((s) => `- ${s}`), '');

out.push('## Éléments composés (pour un élément)');
for (const e of elementRecipes()) {
  out.push(`### ${e.name} (\`${e.key}\`) : ${e.size} cm, ${kg(e.kg ?? 0)}`, `Poste : ${e.station}. Métier : ${e.trade}.`, '', ...e.bill.lines().map((s) => `- ${s}`), '');
}

out.push('## Nomenclature (plan A)', '', '| Brique | Nombre | Masse | État | Origine, geste |', '| --- | --- | --- | --- | --- |');
let total = 0;
for (const r of rows(a.total).sort((p, q) => q.kg - p.kg)) {
  total += r.kg;
  out.push(`| ${r.name} | ${r.name.startsWith('éclats') ? kg(r.n) : fmt(r.n)} | ${kg(r.kg)} | ${r.state} | ${r.how} |`);
}
out.push('', `Masse posée : ${kg(total)}.`, '');

for (const plan of PLANS) {
  const { total: t } = nomenclature(plan);
  const r = resources(t);
  out.push(
    `## Ce que demande le plan ${plan.key}`,
    '',
    `- arbres normaux (troncs de 5,80 m) : ${r.normal.trunks}, chutes ${m(r.normal.waste)}`,
    `- gros arbres (4 m) : ${r.big}, pour ${r.quarters} quartiers de 2 m (${r.planks.trunks} planches de 2 m à recouper, ${t.bricks.get('lath') ?? 0} palançons)`,
    `- perches de taillis (6 m) : ${r.poles.trunks}`,
    `- baguettes : ${r.rods} ; harts : ${r.withies} ; chevilles : ${r.pegs} (autant de piquets, donc de branches)`,
    `- grosses pierres brutes : ${r.roughStones} (${kg(r.roughStones * BRICKS['big-rough-stone'].kg)}) ; pierres plates : ${r.flatStones}`,
    `- éclats : ${kg(r.chipsMade)} faits par la taille, ${kg(r.chipsNeeded)} pour le blocage`,
    `- mottes de terre : ${r.clods} (${kg(r.clods * BRICKS['clay-clod'].kg)}) ; seaux d'eau : ${r.buckets} ; gâchées de mortier : ${r.mortar} ; foulées de torchis : ${r.cobBatches}`,
    `- bottes de chaume : ${r.bundles} ; gerbes de paille en tout : ${r.straw} (${kg(r.straw * BRICKS.straw.kg)})`,
    '',
  );
  const h = hours(t);
  out.push(`### Heures (plan ${plan.key})`, '', '| Travail | Nombre | Heures |', '| --- | --- | --- |');
  for (const l of h) out.push(`| ${l.what} | ${fmt(Math.round(l.count * 10) / 10)} | ${fmt(Math.round(l.hours))} |`);
  const sum = h.reduce((s, l) => s + l.hours, 0);
  // la pose seule : ce qui reste quand toutes les briques sont achetées (moellons, poutres, perches, bottes, mottes...)
  const POSE = ['maçonnerie m3', 'rigole m3', 'assemblages', 'chevilles de charpente', 'clayonnage m2', 'torchis m2', 'lattes', 'chaume m2', 'faîtage m', 'porte', 'volet', 'sol m2', 'torchis', 'gâchée'];
  const pose = h.filter((l) => POSE.includes(l.key)).reduce((s, l) => s + l.hours, 0);
  out.push('', `Total : ${Math.round(sum)} h, soit ${Math.round(sum / DAY)} journées de ${DAY} h ; la pose seule, briques achetées : ${Math.round(pose)} h, ${Math.round(pose / DAY)} journées.`, '');
}

// plan B : ce qui change par rapport au plan A
const b = nomenclature(B);
const diff = new Map<string, number>();
for (const r of rows(b.total)) diff.set(r.name, r.n);
for (const r of rows(a.total)) diff.set(r.name, (diff.get(r.name) ?? 0) - r.n);
out.push('## Plan B : ce qui change', '');
for (const [name, n] of diff) if (Math.abs(n) > 0.05) out.push(`- ${n > 0 ? '+' : ''}${fmt(Math.round(n * 10) / 10)} ${name}`);
console.log(out.join('\n'));
if (process.argv.includes('--images')) for (const f of await writeMaquettePreviews('.art-preview')) console.error(`maquette : ${f}`);
