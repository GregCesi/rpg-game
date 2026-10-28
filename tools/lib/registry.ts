// Registre des numéros de tuiles (art/tile-registry.json, committé).
// Le numéro d'une tuile est sa position dans la liste de son jeu de tuiles. Les cartes Tiled (.tmj)
// stockent ces numéros : ils ne doivent donc jamais changer d'une génération à l'autre.
//   - une tuile déjà connue garde sa place ;
//   - une tuile nouvelle est ajoutée en fin de liste ;
//   - une tuile retirée de art/ garde sa place (un « trou » transparent) : on ne renumérote jamais.
// Renommer une tuile : changer son nom ici ET dans art/, à la même position.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';

export const REGISTRY_PATH = 'art/tile-registry.json';

const NOTE =
  "Numéro d'une tuile = sa position dans la liste (à partir de 0). Ne jamais réordonner ni supprimer : npm run art ajoute les nouvelles tuiles en fin de liste. Pour renommer une tuile, changer son nom ici et dans art/, à la même position.";

const RegistrySchema = z.record(z.string(), z.array(z.string().min(1)));

export type Registry = Record<string, string[]>;

export interface Slots {
  /** Une entrée par numéro : le nom de la tuile, ou null si elle n'existe plus dans art/ (trou). */
  slots: (string | null)[];
  added: string[];
  retired: string[];
}

export function loadRegistry(): Registry {
  if (!existsSync(REGISTRY_PATH)) return {};
  const { _lisez_moi: _ignored, ...rest } = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
  const r = RegistrySchema.safeParse(rest);
  if (!r.success) throw new Error(`${REGISTRY_PATH} ne respecte pas son format :\n${z.prettifyError(r.error)}`);
  for (const [set, names] of Object.entries(r.data)) {
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) throw new Error(`${REGISTRY_PATH} [${set}] : le nom '${dup}' apparaît deux fois`);
  }
  return r.data;
}

/** Complète `registry[set]` avec les noms nouveaux (en fin de liste) et renvoie les places occupées. */
export function reconcile(registry: Registry, set: string, current: string[]): Slots {
  const saved = (registry[set] ??= []);
  const now = new Set(current);
  const known = new Set(saved);
  const added = current.filter((n) => !known.has(n));
  saved.push(...added);
  const retired = saved.filter((n) => !now.has(n));
  return { slots: saved.map((n) => (now.has(n) ? n : null)), added, retired };
}

/** Réécrit le registre seulement s'il a changé, pour ne pas salir le dépôt. */
export function saveRegistry(registry: Registry): boolean {
  const next = JSON.stringify({ _lisez_moi: NOTE, ...registry }, null, 2) + '\n';
  const prev = existsSync(REGISTRY_PATH) ? readFileSync(REGISTRY_PATH, 'utf8') : '';
  if (prev === next) return false;
  writeFileSync(REGISTRY_PATH, next);
  return true;
}
