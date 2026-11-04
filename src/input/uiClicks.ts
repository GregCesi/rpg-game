// Les clics d'interface (chantier « petite carte ») : une zone du HUD qui prend le clic avant le monde. Un clic enfoncé sur elle n'est
// ni une main ni un coup (world/actionPlan.ts ne le voit jamais) : PlayerInput le lui donne à l'instant de l'événement, au lieu de
// l'inscrire comme un appui de souris. Aujourd'hui, la petite carte (un clic change son cran) ; plus tard, son bouton vers la carte
// entière (M).

/** Une zone d'interface : `hit` dit si un point (en px du HUD, avant le zoom de l'interface) est sur elle, `click` agit. */
export interface UiTarget {
  hit: (x: number, y: number) => boolean;
  click: (button: 'left' | 'right') => void;
}

const targets = new Map<string, UiTarget>();

/** Une zone prend les clics enfoncés sur elle (remplace celle de même nom). */
export function claimClicks(id: string, t: UiTarget): void {
  targets.set(id, t);
}

/** La zone rend les clics au monde. */
export function releaseClicks(id: string): void {
  targets.delete(id);
}

/** Un clic enfoncé en (x, y), px du HUD : une zone le prend-elle ? Si oui, elle a agi. */
export function uiClick(x: number, y: number, button: 'left' | 'right'): boolean {
  for (const t of targets.values()) {
    if (!t.hit(x, y)) continue;
    t.click(button);
    return true;
  }
  return false;
}
