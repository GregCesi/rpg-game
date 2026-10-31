// Les plans du bac à sable (src/content/plans/<nom>.json), écrits par « Enregistrer comme plan » du mode construction (en
// développement, le serveur Vite les écrit : vite.config.ts, `buildPlanWriter`). Chargés dans le jeu par Vite (import.meta.glob) ;
// un plan qui naît pendant qu'on joue arrive sans recharger la page (remplacement à chaud). `npm run check` les lit sur le disque
// (tools/check.ts) et les vérifie comme le reste du contenu (`validateBuildPlans`, validate.ts).

import { parseBuildPlans } from './buildPlanFiles';
import type { BuildPlan } from './types';

/** Les plans du bac à sable, par nom (le nom du fichier). Le même objet tout au long de la partie : il est mis à jour en place. */
export const buildPlans: Record<string, BuildPlan> = parseBuildPlans(import.meta.glob('./plans/*.json', { eager: true, import: 'default' }));

/** Appelés quand la liste des plans change (un plan enregistré pendant qu'on joue) : le catalogue se redessine. */
const listeners = new Set<() => void>();

/** Écoute les changements de la liste des plans ; renvoie de quoi ne plus écouter. */
export function onBuildPlans(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

/** Ajoute ou remplace un plan dans la liste (celui qu'on vient d'enregistrer, avant même que le fichier revienne du serveur). */
export function putBuildPlan(name: string, plan: BuildPlan): void {
  buildPlans[name] = plan;
  for (const f of listeners) f();
}

// remplacement à chaud : un fichier de plan ajouté, changé ou retiré met la liste à jour en place, sans recharger la page
if (import.meta.hot) {
  import.meta.hot.accept((next) => {
    const fresh = (next as { buildPlans?: Record<string, BuildPlan> } | undefined)?.buildPlans;
    if (!fresh) return;
    for (const k of Object.keys(buildPlans)) if (!fresh[k]) delete buildPlans[k];
    Object.assign(buildPlans, fresh);
    for (const f of listeners) f();
  });
}
