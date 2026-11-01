// Les plans du bac à sable (src/content/plans/*.json) lus par les outils, sans Vite (src/content/buildPlans.ts passe par import.meta.glob).
import { readdirSync, readFileSync } from 'node:fs';
import type { BuildPlan } from '../../src/content/types';

export function buildPlans(): Record<string, BuildPlan> {
  const dir = 'src/content/plans';
  return Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as BuildPlan]));
}
