// Le franchissement, sans Phaser : ce qui se déclenche en passant (une sortie de Tiled, la porte d'un bâtiment, plus tard un
// déclencheur) se teste sur le chemin parcouru depuis l'image d'avant, jamais à la position de l'instant. Un jeu qui rame fait plusieurs
// pas de physique de taille normale dans une même image : les pieds peuvent alors passer d'un côté à l'autre d'une zone étroite sans
// jamais s'y trouver au moment où on regarde. Ici, le chemin est suivi pixel par pixel.

export type Point = { x: number; y: number };

/** Au-delà de ce saut d'une image à l'autre (px), ce n'est pas un chemin parcouru : Xéros a été reposé ailleurs, la carte a changé. */
export const MAX_STEP = 32;

/**
 * Les pieds sont-ils passés dans la zone (`inside`, vrai pour un point dedans) en allant de `from` (l'image d'avant) à `to` (cette
 * image) ? Sans `from`, ou après un saut de plus de MAX_STEP px, seule la position de l'instant compte.
 */
export function crossed(from: Point | undefined, to: Point, inside: (x: number, y: number) => boolean): boolean {
  if (!from) return inside(to.x, to.y);
  const n = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y));
  if (n > MAX_STEP) return inside(to.x, to.y);
  for (let i = 0; i <= Math.max(1, n); i++) {
    const t = n === 0 ? 1 : i / n;
    if (inside(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)) return true;
  }
  return false;
}
