// Les vues d'un objet, sans Phaser : selon sa symétrie (`views` de props.json ou items.json, docs/STYLE.md section 8), combien il
// en a et le nom de l'image de chacune. La vue 0 est son image ; les autres, un quart de tour de plus à chaque fois, dans le sens
// des aiguilles d'une montre (R les fait défiler à la pose).

import type { ItemDef, Views } from './types';

/** Nombre de vues d'une symétrie : rond 1, symétrique 2, quatre 4. */
export function viewCount(views: Views): number {
  return views === 'round' ? 1 : views === 'symmetric' ? 2 : 4;
}

/**
 * Nom de l'image de la vue `k` d'un objet dont l'image est `base` : `base` (k = 0) ; symétrique, `<base>-ns` ; quatre,
 * `<base>-r<k>`. `has` (facultatif) : le demi-tour d'un objet qui tombe se nomme déjà `<base>-left`, accepté pour r2.
 */
export function viewImage(base: string, views: Views, k: number, has?: (key: string) => boolean): string {
  const v = ((k % viewCount(views)) + viewCount(views)) % viewCount(views);
  if (v === 0) return base;
  if (views === 'symmetric') return `${base}-ns`;
  if (v === 2 && has && !has(`${base}-r2`) && has(`${base}-left`)) return `${base}-left`;
  return `${base}-r${v}`;
}

/** Les images de toutes les vues d'un objet, dans l'ordre (la vue 0 d'abord). */
export function viewImages(base: string, views: Views, has?: (key: string) => boolean): string[] {
  return Array.from({ length: viewCount(views) }, (_, k) => viewImage(base, views, k, has));
}

/**
 * L'image au sol d'un objet possédable dans sa vue `view` (0 à 3) : celle de `ground` et de sa symétrie, sinon son icône (un objet
 * rond sans image au sol).
 */
export function groundImage(def: Pick<ItemDef, 'ground' | 'icon' | 'views'>, view = 0, has?: (key: string) => boolean): string {
  return def.ground ? viewImage(def.ground, def.views, view, has) : def.icon;
}

/** Une vue est nord-sud (un quart de tour depuis l'image) : ses dimensions sont celles de l'image, inversées, pour ce qui est couché. */
export const crosswise = (views: Views, k: number) => views !== 'round' && k % 2 === 1;
