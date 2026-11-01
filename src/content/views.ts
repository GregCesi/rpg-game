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
  const key = views === 'symmetric' ? `${base}-ns` : `${base}-r${v}`;
  if (!has || has(key)) return key;
  // la vue n'est pas encore dessinée (VIEWS_TODO) : la vue -left pour le demi-tour, sinon l'image de départ, jamais une image manquante
  if (v === 2 && has(`${base}-left`)) return `${base}-left`;
  return base;
}

/** La vue `k` est-elle dessinée (la vue de départ l'est toujours ; le demi-tour peut être la vue `-left`) ? */
export function viewDrawn(base: string, views: Views, k: number, has: (key: string) => boolean): boolean {
  const v = ((k % viewCount(views)) + viewCount(views)) % viewCount(views);
  if (v === 0) return true;
  const key = views === 'symmetric' ? `${base}-ns` : `${base}-r${v}`;
  return has(key) || (v === 2 && has(`${base}-left`));
}

/** Les images de toutes les vues d'un objet, dans l'ordre (la vue 0 d'abord). */
export function viewImages(base: string, views: Views, has?: (key: string) => boolean): string[] {
  // les noms attendus, sans repli sur l'image de départ : c'est ce que validate.ts compte (une vue manquante doit s'y voir)
  return Array.from({ length: viewCount(views) }, (_, k) => {
    if (k === 0) return base;
    if (views === 'symmetric') return `${base}-ns`;
    if (k === 2 && has && !has(`${base}-r2`) && has(`${base}-left`)) return `${base}-left`;
    return `${base}-r${k}`;
  });
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

/** L'image de base du tirage `k` d'un élément calculé (`variants` de props.json) : `<image>` pour le premier, `<image>-s<k>` ensuite. */
export function variantImage(base: string, k: number | undefined): string {
  return k ? `${base}-s${k}` : base;
}

/**
 * Les images d'un objet de bois (`aged` de props.json ou items.json) qui prennent l'âge du bois : toutes ses vues, de tous ses
 * tirages (`variants`) et de ses deux formes (`natural.forms` 2) ; pour un objet possédable, ses images au sol (`ground`, sinon
 * l'icône). Chacune a ses trois âges : `<image>`, `<image>-worn`, `<image>-old` (woodShape.ts `agedKey`).
 */
export function ageableImages(def: { image?: string; ground?: string; icon?: string; views: Views; variants?: number; natural?: { forms: number } }): string[] {
  const base = def.image ?? def.ground ?? def.icon!;
  const forms = def.natural?.forms === 2 ? [base, `${base}-b`] : [base];
  const draws = forms.flatMap((f) => Array.from({ length: Math.max(1, def.variants ?? 1) }, (_, k) => variantImage(f, k)));
  return draws.flatMap((d) => viewImages(d, def.views));
}
