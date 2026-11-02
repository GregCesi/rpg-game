// La matière de chaque travail et le travail entier, sans Phaser (docs/CONCEPTION.md, « Le travail ») : combien de bois enlever (cm³)
// ou de fente ouvrir (m²), ce qu'en enlève chaque coup (world/swing.ts), et ce que cela donne : le nombre de coups, les pauses de
// souffle, la durée totale, l'endurance dépensée. La durée découle des coups ; elle n'est imposée nulle part. Le jeu (systems/work.ts)
// joue les coups un par un ; validate.ts affiche les durées et vérifie les points de calage (work.json) ; tools/essai-travail.ts en
// tire le tableau de la conception.

import { combat, items, props, stamina as staminaDef, strength, wood as W, work } from '../content';
import type { HarvestWork, Swinger, WoodPiece } from '../content/types';
import { removedBy, strokeOf, type Stroke } from './swing';

/** La matière : enlevée en travers du fil, levée le long d'une face marquée, une fente à ouvrir, ou la pierre à casser. */
export type Matter = 'cut' | 'hew' | 'split' | 'stone';

/** Un travail : le coup (clé de work.json, `strokes`), l'outil (clé de items.json), la matière et sa quantité (cm³, ou m² de fente). */
export interface WorkJobDef {
  stroke: string;
  tool: string;
  matter: Matter;
  amount: number;
}

/** Abattre à la hache seule : l'entaille de direction (0,4 D de profondeur, ouverture égale) et le trait d'en face (0,5 D) ; ≈ 0,18 D³. */
export const fellVolume = (d: number): number => {
  const v = (depth: number) => 0.5 * depth * depth * 0.9 * d;
  return v(0.4 * d) + v(0.5 * d);
};
/** Couper une pièce couchée : deux V d'une demi-épaisseur, un de chaque côté ; ≈ 0,21 D³. */
export const buckVolume = (d: number): number => 2 * 0.5 * (0.5 * d) ** 2 * 0.85 * d;
/** Ébrancher : chaque branche tranchée en V, ≈ 0,6 d³. */
export const limbVolume = (count: number, d: number): number => count * 0.6 * d ** 3;
/** Tailler une pointe : le cylindre moins le cône, sur sa longueur. */
export const pointVolume = (d: number, length: number): number => Math.PI * (d / 2) ** 2 * length * (2 / 3);
/** Équarrir une face sur `length` cm : un quart de ce qui sépare le rond de la poutre (le cercle moins le carré de côté `side`). */
export const faceVolume = (d: number, side: number, length: number): number => ((Math.PI * (d / 2) ** 2 - side * side) / 4) * length;
/** Fendre : la surface de la fente, diamètre × longueur (m²). */
export const splitArea = (d: number, length: number): number => (d / 100) * (length / 100);

/** Le coup d'un genre de travail avec `tool` : celui de l'outil (`work.strokes` d'items.json), sinon le coup commun (`jobs` de work.json). */
const strokeFor = (kind: keyof typeof work.jobs, tool: string): string => items[tool]?.work?.strokes?.[kind] ?? work.jobs[kind];

/** La matière d'une récolte (`work` de son harvest) travaillée avec `tool`. */
export function harvestJob(hw: HarvestWork, tool: string): WorkJobDef {
  if ('fell' in hw) return { stroke: strokeFor('fell', tool), tool, matter: 'cut', amount: fellVolume(hw.fell.diameter) };
  if ('limbs' in hw) return { stroke: strokeFor('limbs', tool), tool, matter: 'cut', amount: limbVolume(hw.limbs.count, hw.limbs.diameter) };
  if ('break' in hw) return { stroke: strokeFor('break', tool), tool, matter: 'stone', amount: hw.break.volume };
  return { stroke: strokeFor('whittle', tool), tool, matter: 'cut', amount: pointVolume(hw.whittle.diameter, hw.whittle.length) };
}

/** Le diamètre d'une pièce de bois (cm) : celui de sa taille (wood.json `sizes`) ; une taille inconnue est une erreur, jamais un repli. */
function diameterOf(p: Pick<WoodPiece, 'size'>): number {
  const d = W.sizes[p.size]?.diameter;
  if (d === undefined) throw new Error(`taille de bois inconnue : '${p.size}' (wood.json, sizes)`);
  return d;
}

/**
 * La matière d'un travail sur une pièce de bois : la couper à la cognée, la fendre à la masse, ou dresser une face à la doloire sur
 * `length` cm (une passe).
 */
export function woodJob(kind: 'cut' | 'maul' | 'hew', piece: Pick<WoodPiece, 'size' | 'length'>, length = piece.length): WorkJobDef {
  const d = diameterOf(piece);
  if (kind === 'cut') return { stroke: 'chop', tool: W.cut.tool, matter: 'cut', amount: buckVolume(d) };
  if (kind === 'maul') return { stroke: 'maul', tool: W.split.maul, matter: 'split', amount: splitArea(d, piece.length) };
  return { stroke: 'hew', tool: W.hew.tool, matter: 'hew', amount: faceVolume(d, W.hew.beam, length) };
}

/** Un coup de ce travail donné par `who`. */
export function jobStroke(job: WorkJobDef, who: Swinger): Stroke {
  const t = items[job.tool];
  return strokeOf(who, t.work!, t.mass as number, work.strokes[job.stroke], combat.rules);
}

/** Ce qu'enlève un coup de ce travail (cm³, ou m² de fente). */
export const perStroke = (job: WorkJobDef, s: Stroke): number => removedBy(s, work.matter[job.matter]);

/** Ce que coûte un coup au plafond et au souffle (stamina.json, `work`). */
export const strokeCost = (s: Stroke): { ceiling: number; breath: number } => ({
  ceiling: s.joules * staminaDef.work.ceilingPerJ,
  breath: s.joules * staminaDef.work.breathPerJ,
});

/** Le travail entier : les coups, les pauses de souffle (à partir d'un souffle plein), la durée (s), le plafond dépensé. */
export interface WorkPlan {
  stroke: Stroke;
  per: number;
  strokes: number;
  /** Coups d'une reprise, entre deux pauses. */
  bout: number;
  pauses: number;
  /** Durée d'une pause (s) : le délai, puis le souffle revenu à `resume` du plafond. */
  pause: number;
  seconds: number;
  ceiling: number;
}

/** Le travail `job` mené jusqu'au bout par `who`, de maximum `max` (le souffle part plein ; pendant le travail il ne revient pas). */
export function planOf(job: WorkJobDef, who: Swinger, max: number, done = 0): WorkPlan {
  const s = jobStroke(job, who);
  const per = perStroke(job, s);
  const strokes = Math.max(0, Math.ceil((job.amount * (1 - done)) / per - 1e-9));
  const { ceiling, breath } = strokeCost(s);
  const resume = staminaDef.work.resume;
  const bout = Math.max(1, Math.floor((resume * max) / breath));
  const first = Math.max(1, Math.floor(max / breath));
  const pauses = strokes <= first ? 0 : Math.ceil((strokes - first) / bout);
  const pause = staminaDef.breath.regenDelayMs / 1000 + (resume * max) / staminaDef.breath.regenPerSec;
  return { stroke: s, per, strokes, bout, pauses, pause, seconds: strokes * s.cycle + pauses * pause, ceiling: strokes * ceiling };
}

/** Qui travaille : `xeros` (strength.json) ou un être de référence (work.json, `references`), avec son maximum. */
export function swingerOf(who: string): { swinger: Swinger; max: number } {
  if (who === 'xeros') return { swinger: strength.swing, max: staminaDef.max.start };
  const r = work.references[who];
  return { swinger: r, max: r.max };
}

/** Le travail d'un point de calage (work.json, `calibration`). */
export function calibrationJob(c: (typeof work.calibration)[number]): WorkJobDef {
  if ('fell' in c.job) return harvestJob(props[c.job.fell].harvest!.work!, c.tool);
  const h = c.job.hew;
  // une poutre entière : ses quatre faces
  const face = woodJob('hew', { size: h.size, length: h.length });
  return { ...face, tool: c.tool, amount: face.amount * W.hew.faces };
}

/** Les travaux du jeu, pour le tableau de bord du calibrage (validate.ts) : la récolte de chaque objet, et le bois. */
export function gameJobs(): { name: string; job: WorkJobDef }[] {
  const out: { name: string; job: WorkJobDef }[] = [];
  for (const [k, p] of Object.entries(props)) {
    const h = p.harvest;
    if (!h?.work || !h.tool) continue;
    for (const tool of [h.tool, ...Object.keys(h.also)]) out.push({ name: `${k} (${items[tool].name})`, job: harvestJob(h.work, tool) });
  }
  for (const [size, def] of Object.entries(W.sizes)) {
    out.push({ name: `couper une pièce ${def.name} (${def.diameter} cm)`, job: woodJob('cut', { size, length: 100 }) });
    if (Object.keys(def.split).length) out.push({ name: `fendre une pièce ${def.name} de 1 m`, job: woodJob('maul', { size, length: 100 }) });
  }
  const beam = W.sizes.normal;
  if (beam) {
    const face = woodJob('hew', { size: 'normal', length: 300 });
    out.push({ name: 'équarrir une poutre de 3 m (quatre faces)', job: { ...face, amount: face.amount * W.hew.faces } });
  }
  return out;
}
