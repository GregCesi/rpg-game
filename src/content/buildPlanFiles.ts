// Lecture des fichiers de plans du bac à sable (src/content/plans/<nom>.json), sans Vite : commune au jeu (buildPlans.ts, qui les
// charge par import.meta.glob) et à `npm run check` (tools/check.ts, qui les lit sur le disque).

import { z } from 'zod';
import { BuildPlanSchema, type BuildPlan } from './types';

/** Le nom d'un plan dans son chemin : `./plans/maison.json` -> `maison`. */
export const planKey = (path: string) => path.replace(/^.*\//, '').replace(/\.json$/, '');

/** Lit les plans d'après leur contenu JSON, par nom ; un plan mal formé plante avec son nom et le chemin de l'erreur. */
export function parseBuildPlans(files: Record<string, unknown>): Record<string, BuildPlan> {
  const out: Record<string, BuildPlan> = {};
  for (const [path, data] of Object.entries(files)) {
    const r = BuildPlanSchema.safeParse(data);
    if (!r.success) throw new Error(`plans/${planKey(path)}.json ne respecte pas son format :\n${z.prettifyError(r.error)}`);
    out[planKey(path)] = r.data;
  }
  return out;
}
