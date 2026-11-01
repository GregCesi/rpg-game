// Essai du modèle « Le travail » (docs/CONCEPTION.md), hors du jeu : la durée d'un travail découle de ses coups. Un travail est une
// quantité de matière à enlever (cm³ de bois tranché en travers, cm³ de bois levé le long d'une face, J pour ouvrir une fente) ; chaque
// coup en enlève une part, selon son énergie (la même physique que le combat : world/strike.ts, inertie de l'outil autour des mains),
// le tranchant, la dureté du bois et la précision ; chaque coup coûte du souffle et du plafond ; à bout de souffle, Xéros s'arrête et
// souffle. La durée totale = les coups + les pauses. Les chiffres de la section viennent d'ici.
// Usage : npx tsx tools/essai-travail.ts (écrit le tableau en Markdown sur la sortie).

import { combat } from '../src/content';
import type { Weapon } from '../src/content/types';
import { inertia, precision } from '../src/world/strike';

// ——— les données proposées (où elles iraient : voir la section) ———

/** Les forces (strength.json, `swing`) : couple du corps sur le manche (N·m), vitesse angulaire au plus (rad/s), adresse, endurance. */
const FORCES = {
  'Xéros (aujourd’hui)': { torque: 50, omegaMax: 25, skill: 0.8, max: 100 },
  'un adulte': { torque: 75, omegaMax: 27, skill: 0.9, max: 140 },
  'un bûcheron fort': { torque: 110, omegaMax: 30, skill: 1, max: 180 },
};
type Force = (typeof FORCES)[keyof typeof FORCES];

/**
 * Les outils (items.json, `work` à côté de `weapon`) : masse (kg, déjà dans items.json), longueur devant les mains et équilibre (comme
 * une arme, pour l'inertie), tranchant, et le poids de la précision dans ce qu'enlève un coup (`aim` : 0, la force seule compte ; 1, la
 * précision seule).
 */
const TOOLS = {
  cognée: { kg: 2.5, length: 80, grip: 5, balance: 1.25, edge: 1, aim: 0.3 },
  hachette: { kg: 1, length: 42, grip: 4, balance: 1.25, edge: 1, aim: 0.5 },
  masse: { kg: 4, length: 85, grip: 5, balance: 1.35, edge: 0.5, aim: 0.2 },
  doloire: { kg: 3, length: 55, grip: 5, balance: 1.3, edge: 1, aim: 0.8 },
};
type ToolName = keyof typeof TOOLS;
const weaponOf = (t: (typeof TOOLS)[ToolName]): Weapon =>
  ({ length: t.length, grip: t.grip, balance: t.balance, efficiency: 1, family: 'blade', image: '' }) as unknown as Weapon;

/**
 * Les gestes (gestures.json, `swing`) : l'angle de la frappe (rad, le couple agit sur cet angle) et les temps hors frappe, en secondes
 * pour un outil de 1 kg·m² tenu par un couple de 50 N·m ; ils s'allongent avec l'inertie et raccourcissent avec la force (I / couple).
 */
const GESTURES = {
  // de côté (abattre), de haut en bas (ébrancher, couper), la masse sur le coin, le coup court de la doloire, la taille à la hachette
  use: { angle: 1.8, arm: 0.3, armK: 3, hold: 0.12, holdK: 1.2, impact: 0.12, free: 0.25, freeK: 3 },
  chop: { angle: 1.9, arm: 0.3, armK: 3, hold: 0.15, holdK: 1.2, impact: 0.12, free: 0.25, freeK: 3 },
  maul: { angle: 2.0, arm: 0.35, armK: 3, hold: 0.15, holdK: 1.2, impact: 0.15, free: 0.3, freeK: 3 },
  hew: { angle: 0.9, arm: 0.2, armK: 3, hold: 0.05, holdK: 1, impact: 0.1, free: 0.15, freeK: 3 },
  whittle: { angle: 1.0, arm: 0.15, armK: 3, hold: 0.05, holdK: 1, impact: 0.08, free: 0.15, freeK: 3 },
};
type GestureName = keyof typeof GESTURES;

/**
 * La matière (wood.json, `work`) : l'énergie qu'il faut, par le tranchant, pour enlever 1 cm³ en travers du fil (`cut`), le long d'une
 * face déjà marquée (`hew`), et pour ouvrir 1 m² de fente au coin (`split`, J/m²) ; `hardness` : 1 pour le bois commun.
 */
const MATTER = { cut: 9, hew: 1.6, split: 2200, hardness: 1 };

/** L'endurance (stamina.json, `work`) : plafond et souffle par joule frappé ; reprise du travail quand le souffle revient à `resume`. */
const STAMINA = { ceilingPerJ: 1.4e-4, breathPerJ: 0.032, regenPerSec: 12, regenDelay: 0.8, resume: 0.9 };

// ——— la physique d'un coup ———

/** Un coup : énergie (J), durées (s) de ses cinq temps, précision. */
function stroke(force: Force, toolName: ToolName, gesture: GestureName) {
  const t = TOOLS[toolName];
  const g = GESTURES[gesture];
  const I = inertia(weaponOf(t), t.kg);
  // le couple travaille sur l'angle de frappe ; au-delà de la vitesse du bras, l'outil léger ne prend plus d'énergie
  const omega = Math.min(Math.sqrt((2 * force.torque * g.angle) / I), force.omegaMax);
  const joules = 0.5 * I * omega * omega;
  const slow = I / (force.torque / 50);
  const times = {
    armer: g.arm + g.armK * 0.1 * slow,
    haut: g.hold + g.holdK * 0.1 * slow,
    abattre: (2 * g.angle) / omega,
    impact: g.impact,
    dégager: g.free + g.freeK * 0.1 * slow,
  };
  const ms = Object.values(times).reduce((s, v) => s + v, 0);
  // la précision de l'outil (la même que l'arme), meilleure avec la force (un outil lourd se tient mieux), × l'adresse
  const rules = { ...combat.rules, controlRef: combat.rules.controlRef * (force.torque / 50) };
  const p = precision(rules, weaponOf(t), t.kg) * force.skill;
  const quality = 1 - t.aim * (1 - p);
  return { I, joules, omega, tip: omega * ((t.length - t.grip) / 100), times, cycle: ms, p, quality, edge: t.edge };
}

// ——— les travaux ———

/** Un travail : sa matière (cm³ en travers, cm³ le long, ou m² de fente), l'outil, le geste, la cible actuelle (minutes). */
interface Job {
  name: string;
  tool: ToolName;
  gesture: GestureName;
  kind: 'cut' | 'hew' | 'split';
  amount: number;
  target?: number;
}

/** Volume de l'entaille de direction et du trait d'abattage à la hache seule (USDA : l'entaille, 1/3 à 1/2 du diamètre). */
const fellVolume = (d: number) => {
  // deux encoches en V : l'entaille (profondeur 0,4 D, ouverture égale) et le trait d'en face (0,5 D) ; largeur moyenne ≈ 0,9 D
  const v = (depth: number) => 0.5 * depth * depth * 0.9 * d;
  return v(0.4 * d) + v(0.5 * d);
};
/** Une coupe en travers d'une pièce couchée : deux V d'une demi-épaisseur, un de chaque côté (on retourne la pièce) : ≈ 0,21 D³. */
const buckVolume = (d: number) => 2 * 0.5 * (0.5 * d) ** 2 * 0.85 * d;
/** Ébrancher : chaque branche tranchée en V (≈ 0,6 d³). */
const limbVolume = (count: number, d: number) => count * 0.6 * d ** 3;
/** Équarrir : ce qui sépare le rond de la poutre (le cercle moins le carré), par mètre, en cm³. */
const hewVolume = (d: number, side: number, m: number) => (Math.PI * (d / 2) ** 2 - side * side) * 100 * m;
/** Tailler une pointe : le cylindre moins le cône, sur sa longueur. */
const pointVolume = (d: number, l: number) => Math.PI * (d / 2) ** 2 * l * (2 / 3);

export const JOBS: Job[] = [
  { name: 'abattre un arbre normal (30 cm)', tool: 'cognée', gesture: 'use', kind: 'cut', amount: fellVolume(30), target: 25 },
  { name: 'abattre un arbre normal (30 cm)', tool: 'hachette', gesture: 'use', kind: 'cut', amount: fellVolume(30), target: 25 },
  { name: 'abattre le gros arbre (55 cm)', tool: 'cognée', gesture: 'use', kind: 'cut', amount: fellVolume(55), target: 60 },
  { name: 'ébrancher l’arbre normal (12 branches de 7 cm)', tool: 'cognée', gesture: 'chop', kind: 'cut', amount: limbVolume(12, 7), target: 20 },
  { name: 'ébrancher l’arbre normal (12 branches de 7 cm)', tool: 'hachette', gesture: 'chop', kind: 'cut', amount: limbVolume(12, 7), target: 20 },
  { name: 'ébrancher le gros arbre (16 branches de 10 cm)', tool: 'cognée', gesture: 'chop', kind: 'cut', amount: limbVolume(16, 10), target: 40 },
  { name: 'couper un rondin de 30 cm', tool: 'cognée', gesture: 'chop', kind: 'cut', amount: buckVolume(30), target: 12 },
  { name: 'couper une bille de 55 cm', tool: 'cognée', gesture: 'chop', kind: 'cut', amount: buckVolume(55), target: 22 },
  { name: 'fendre une bille de 55 cm × 1 m', tool: 'masse', gesture: 'maul', kind: 'split', amount: 0.55 * 1, target: 6 },
  { name: 'fendre une demi-bille de 55 cm × 1 m', tool: 'masse', gesture: 'maul', kind: 'split', amount: 0.39 * 1, target: 6 },
  { name: 'équarrir une poutre de 3 m (rondin de 30 cm → 20 × 20)', tool: 'doloire', gesture: 'hew', kind: 'hew', amount: hewVolume(30, 20, 3), target: 96 },
  { name: 'tailler un piquet (branche de 5 cm, pointe de 12 cm)', tool: 'hachette', gesture: 'whittle', kind: 'cut', amount: pointVolume(5, 12), target: 10 },
  { name: 'tailler un piquet (branche de 5 cm, pointe de 12 cm)', tool: 'cognée', gesture: 'chop', kind: 'cut', amount: pointVolume(5, 12), target: 10 },
];

/** Ce qu'enlève un coup : sa part de la matière (cm³, ou m² de fente). */
function removed(job: Job, s: ReturnType<typeof stroke>): number {
  const useful = (s.joules * s.quality * s.edge) / MATTER.hardness;
  if (job.kind === 'split') return useful / MATTER.split;
  return useful / (job.kind === 'cut' ? MATTER.cut : MATTER.hew);
}

/** Le travail entier : coups, pauses de souffle, durée, endurance. */
function simulate(job: Job, force: Force) {
  const s = stroke(force, job.tool, job.gesture);
  const per = removed(job, s);
  const strokes = Math.ceil(job.amount / per);
  const breathPer = s.joules * STAMINA.breathPerJ;
  const ceilingPer = s.joules * STAMINA.ceilingPerJ;
  // le souffle part plein (le plafond ≈ le maximum) ; pendant le travail il ne revient pas ; vide, une pause jusqu'à `resume`
  const cap = force.max;
  const bout = Math.max(1, Math.floor((STAMINA.resume * cap) / breathPer));
  const firstBout = Math.max(1, Math.floor(cap / breathPer));
  const pauses = strokes <= firstBout ? 0 : Math.ceil((strokes - firstBout) / bout);
  const pause = STAMINA.regenDelay + (STAMINA.resume * cap) / STAMINA.regenPerSec;
  const seconds = strokes * s.cycle + pauses * pause;
  return { s, strokes, bout, pauses, pause, seconds, ceiling: strokes * ceilingPer };
}

// ——— la sortie ———

const fmt = (v: number, d = 0) => v.toFixed(d).replace('.', ',');
const mmss = (seconds: number) => {
  const sec = Math.round(seconds);
  if (sec >= 3600) return `${Math.floor(sec / 3600)} h ${String(Math.round((sec % 3600) / 60)).padStart(2, '0')}`;
  return sec >= 60 ? `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, '0')}` : `${sec} s`;
};

console.log('### Un coup, par outil et par force\n');
console.log('| Outil (geste) | Force | Inertie (kg·m²) | Vitesse du tranchant (m/s) | Énergie (J) | Précision | Armer · haut · abattre · impact · dégager (ms) | Durée du coup (s) |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const [toolName, gesture] of [['cognée', 'use'], ['hachette', 'use'], ['masse', 'maul'], ['doloire', 'hew']] as [ToolName, GestureName][]) {
  for (const [fname, f] of Object.entries(FORCES)) {
    const s = stroke(f, toolName, gesture);
    const t = Object.values(s.times).map((v) => Math.round(v * 1000)).join(' · ');
    console.log(`| ${toolName} (${gesture}) | ${fname} | ${fmt(s.I, 2)} | ${fmt(s.tip, 1)} | ${fmt(s.joules)} | ${fmt(s.p, 2)} | ${t} | ${fmt(s.cycle, 2)} |`);
  }
}
console.log('\n### Chaque travail, pour trois forces\n');
console.log('| Travail | Outil | Force | Coups | Durée d’un coup (s) | Pauses (durée) | Durée totale | Plafond dépensé | Cible (min) |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const job of JOBS) {
  for (const [fname, f] of Object.entries(FORCES)) {
    const r = simulate(job, f);
    console.log(
      `| ${job.name} | ${job.tool} | ${fname} | ${r.strokes} | ${fmt(r.s.cycle, 2)} | ${r.pauses} (${fmt(r.pause)} s) | ${mmss(r.seconds)} | ${fmt(r.ceiling, 1)} | ${job.target ?? '—'} |`,
    );
  }
}
