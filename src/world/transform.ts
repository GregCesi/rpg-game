// Les transformations, sans Phaser (transforms.json, docs/CONCEPTION.md « Les matières ») : ce que pèse ce qui entre, ce qui sort
// et ce qu'on retire, leurs noms. Utilisé par validate.ts (la sortie pèse moins que l'entrée), le jeu (systems/transform.ts, le
// bouton « Transformer » de ?dieu) et l'aperçu (.art-preview/briques.png).

import type { ItemDef, Matter, PropDef, TransformDef, TransformPart, WoodPiece } from '../content/types';
import { itemMass, propMass, woodMass, type MassCatalog } from '../content/mass';
import { lookDef, lookOf } from './woodShape';

/** Longueur de référence d'une pièce de bois sans longueur (une transformation qui garde la longueur de son entrée) : 1 m. */
export const REFERENCE_CM = 100;

/** Les réglages d'une pièce de bois d'entrée ou de sortie, à la longueur `length` (la sienne, sinon celle de l'entrée, sinon 1 m). */
export function partWood(part: TransformPart, length = REFERENCE_CM): WoodPiece {
  const w = part.wood!;
  return { size: w.size, shape: w.shape, ...(w.hewn ? { hewn: w.hewn } : {}), length: w.length ?? length, axis: 'ew' };
}

/** Masse d'une entrée ou d'une sortie, pour une unité (une pièce de bois à `length`), à la taille type si elle est naturelle. */
export function partMass(part: TransformPart, cat: MassCatalog, length?: number): number {
  if (part.item) return itemMass(part.item, cat);
  if (part.prop) return propMass(part.prop, undefined, cat);
  if (part.wood) return woodMass(partWood(part, length));
  return part.kg!;
}

/** Ce que pèsent l'entrée, la sortie et le déchet d'une transformation (kg, pièces de bois à 1 m, matières naturelles à leur taille type). */
export function balance(t: TransformDef, cat: MassCatalog): { input: number; output: number; waste: number } {
  const sum = (parts: TransformPart[]) => parts.reduce((s, p) => s + partMass(p, cat) * p.count, 0);
  const input = sum(t.inputs);
  const output = sum(t.outputs);
  return { input, output, waste: input - output };
}

/** Le nom d'une entrée ou d'une sortie, en français : « grosse pierre brute », « 2 motte de terre », « demi-bille ». */
export function partName(part: TransformPart, c: { items: Record<string, ItemDef>; props: Record<string, PropDef>; matters: Record<string, Matter> }): string {
  const n = part.item ? c.items[part.item].name : part.prop ? c.props[part.prop].name : part.wood ? lookDef(part.wood.size, lookOf(partWood(part))).name : c.matters[part.raw!].name;
  return part.count > 1 ? `${part.count} × ${n}` : n;
}
