// Le tableau du modèle « Le travail » (docs/CONCEPTION.md), tiré du jeu lui-même (world/swing.ts, world/workPlan.ts, les données de
// work.json, items.json, strength.json, stamina.json) : un coup par outil et par force, puis chaque travail pour trois forces (Xéros
// d'aujourd'hui, un adulte, un bûcheron fort), avec les points de calage. La durée découle des coups.
// Usage : npx tsx tools/essai-travail.ts (écrit le tableau en Markdown sur la sortie).

import { items, props, work } from '../src/content';
import { harvestJob, jobStroke, planOf, pointVolume, swingerOf, woodJob, type WorkJobDef } from '../src/world/workPlan';

const WHO: [string, string][] = [
  ['xeros', 'Xéros (aujourd’hui)'],
  ['adult', 'un adulte'],
  ['strong', 'un bûcheron fort'],
];

const fmt = (v: number, d = 0) => v.toFixed(d).replace('.', ',');
const hm = (seconds: number) => {
  const sec = Math.round(seconds);
  if (sec >= 3600) return `${Math.floor(sec / 3600)} h ${String(Math.round((sec % 3600) / 60)).padStart(2, '0')}`;
  return sec >= 60 ? `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, '0')}` : `${sec} s`;
};

const fellOf = (k: string, tool: string) => harvestJob(props[k].harvest!.work!, tool);
const beam = (): WorkJobDef => {
  const face = woodJob('hew', { size: 'normal', length: 300 });
  return { ...face, amount: face.amount * 4 };
};
const JOBS: { name: string; job: WorkJobDef; target?: string }[] = [
  { name: 'abattre un arbre normal (30 cm)', job: fellOf('normal-tree', 'axe'), target: '25 pour Xéros (calage)' },
  { name: 'abattre un arbre normal (30 cm)', job: { ...fellOf('normal-tree', 'axe'), tool: 'hatchet' } },
  { name: 'abattre le gros arbre (55 cm)', job: fellOf('big-tree', 'axe') },
  { name: 'ébrancher l’arbre normal (12 branches de 7 cm)', job: fellOf('normal-felled-tree', 'axe') },
  { name: 'ébrancher l’arbre normal (12 branches de 7 cm)', job: { ...fellOf('normal-felled-tree', 'axe'), tool: 'hatchet' } },
  { name: 'ébrancher le gros arbre (16 branches de 10 cm)', job: fellOf('big-felled-tree', 'axe') },
  { name: 'couper un rondin de 30 cm', job: woodJob('cut', { size: 'normal', length: 100 }) },
  { name: 'couper une bille de 55 cm', job: woodJob('cut', { size: 'big', length: 100 }) },
  { name: 'fendre une bille de 55 cm × 1 m', job: woodJob('maul', { size: 'big', length: 100 }) },
  { name: 'équarrir une poutre de 3 m (rondin de 30 cm → 20 × 20)', job: beam(), target: '120 pour le bûcheron fort (calage)' },
  { name: 'tailler un piquet (branche de 5 cm, pointe de 12 cm)', job: fellOf('chopping-block', 'hatchet') },
  { name: 'tailler un piquet (branche de 5 cm, pointe de 12 cm)', job: { stroke: 'chop', tool: 'axe', matter: 'cut', amount: pointVolume(5, 12) } },
];

console.log('#### Un coup, par outil et par force\n');
console.log('| Outil (coup) | Force | Inertie (kg·m²) | Vitesse du tranchant (m/s) | Énergie (J) | Précision | Armer · haut · abattre · impact · dégager (ms) | Durée du coup (s) |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const [tool, stroke] of [['axe', 'use'], ['hatchet', 'use'], ['maul', 'maul'], ['broadaxe', 'hew']]) {
  for (const [who, name] of WHO) {
    const s = jobStroke({ stroke, tool, matter: 'cut', amount: 1 }, swingerOf(who).swinger);
    const t = Object.values(s.times).map((v) => Math.round(v * 1000)).join(' · ');
    console.log(`| ${items[tool].name} (${stroke}) | ${name} | ${fmt(s.inertia, 2)} | ${fmt(s.tip, 1)} | ${fmt(s.joules)} | ${fmt(s.precision, 2)} | ${t} | ${fmt(s.cycle, 2)} |`);
  }
}
console.log('\n#### Chaque travail, pour trois forces\n');
console.log('| Travail | Outil | Force | Coups | Durée d’un coup (s) | Pauses (durée) | Durée totale | Plafond dépensé | Cible (min) |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const { name, job, target } of JOBS) {
  for (const [who, wname] of WHO) {
    const { swinger, max } = swingerOf(who);
    const p = planOf(job, swinger, max);
    console.log(
      `| ${name} | ${items[job.tool].name} | ${wname} | ${p.strokes} | ${fmt(p.stroke.cycle, 2)} | ${p.pauses} (${fmt(p.pause)} s) | ${hm(p.seconds)} | ${fmt(p.ceiling, 1)} | ${target ?? '—'} |`,
    );
  }
}
console.log(`\nPoints de calage (work.json) : ${work.calibration.map((c) => `${c.name}, ${c.minutes} min`).join(' ; ')}.`);
