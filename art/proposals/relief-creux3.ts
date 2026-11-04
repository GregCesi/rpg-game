// Troisième essai du chemin creux (chantier « relief », hors jeu) : les dessins nouveaux de ce tracé est-ouest. Les matières de
// l'essai 2 (sol clair, talus, paroi, broussailles, racines) restent dans art/proposals/relief-creux.ts.
//   - `hood` : le capuchon de feuillage qui déborde au-dessus du couloir, fait de nombreuses petites touffes (jamais une boule),
//     avec ses lianes qui pendent ; le rideau de l'entrée en est un grand, plus bas ;
//   - `rakedFace` : la face est ou ouest d'une falaise ou d'un talus, montrée en raccourci (une bande étroite) : terre très
//     sombre, lierre qui pend.
// Palette `world` (art/palette.ts). Scène : relief-creux3-scene.ts ; planches : tools/essai-relief-creux3.ts.

import { Canvas, rng } from '../lib/canvas';
import { hash } from './relief-creux';

/**
 * Un capuchon de feuillage de `w` × `h` px : `body` px de feuillage en haut (une crête de touffes de 2 à 5 px, irrégulière, plus
 * épaisse au milieu), puis des lianes qui pendent jusqu'à `h` (tous les 2 à 4 px, de longueurs très inégales ; lierre `l`/`L`
 * sur une tige `k`, une feuille de chaque côté de temps en temps). Lumière en haut à gauche ; contour `o` en bas et à droite,
 * `k` côté lumière. Le bas de l'image est la pointe de la plus longue liane.
 */
export function hood(w: number, h: number, body: number, seed: number, density = 1): Canvas {
  const r = rng(seed);
  const c = new Canvas(w, h);
  // le profil du dessous de la crête : plus bas au milieu, cassé
  const under = (x: number) => {
    const m = 1 - Math.abs(x / w - 0.5) * 2;
    return Math.round(body * (0.35 + 0.65 * Math.sqrt(Math.max(0, m))) + (hash(Math.floor(x / 3), 0, seed) - 0.5) * 6);
  };
  // les touffes : petites ellipses serrées sous la crête
  const n = Math.round((w * body) / 9 * density);
  for (let i = 0; i < n; i++) {
    const x = 2 + r() * (w - 4);
    const yMax = under(Math.floor(x));
    if (yMax < 3) continue;
    // la crête n'est pas droite : des touffes montent plus haut par endroits
    const bump = Math.max(0, hash(Math.floor(x / 14), 3, seed) - 0.45) * 16;
    const y = 2 + Math.max(0, 6 - bump) + r() * Math.max(1, yMax - 3 - Math.max(0, 6 - bump));
    const rx = 2 + r() * 4;
    const ry = 1.8 + r() * 2.8;
    c.ellipse(x, y, rx, ry, 'l');
  }
  // modelé par touffe : un éclat au jour en haut à gauche, l'ombre en bas à droite (en grappes)
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.get(x, y) !== 'l') continue;
    const up = c.get(x, y - 1) === '.' || c.get(x - 1, y) === '.';
    const down = c.get(x, y + 1) === '.' || c.get(x + 1, y) === '.';
    const g = hash(Math.floor(x / 2), Math.floor(y / 2), seed + 1);
    if (up && g < 0.75) c.set(x, y, y < body * 0.45 ? 'j' : 'L');
    else if (down && g < 0.8) c.set(x, y, 'k');
    else if (g > 0.88) c.set(x, y, 'k');
    else if (g < 0.14 && y < body * 0.6) c.set(x, y, 'L');
  }
  // les lianes
  for (let x = 2; x < w - 2; x += 2 + Math.floor(r() * 3)) {
    let y = Math.min(h - 1, under(x) + 2);
    while (y > 0 && c.get(x, y) === '.') y--;
    if (y <= 0 || r() < 0.5) continue;
    const room = h - 1 - y;
    const long = r() < 0.22;
    const len = Math.max(2, Math.floor(room * (long ? 0.55 + r() * 0.45 : 0.08 + r() * 0.3)));
    let lx = x;
    for (let k = 1; k <= len; k++) {
      if (k % 5 === 0 && r() < 0.5) lx += r() < 0.5 ? -1 : 1;
      const tip = k >= len - 1;
      c.set(lx, y + k, tip ? 'k' : 'l');
      // des feuilles en grappes le long de la liane, plus serrées en haut
      if (!tip && r() < (k < len / 2 ? 0.45 : 0.25)) {
        const sd = r() < 0.5 ? -1 : 1;
        c.set(lx + sd, y + k, 'L').set(lx + sd, y + k + 1, 'l');
        if (r() < 0.5) c.set(lx + sd * 2, y + k, 'k');
      }
    }
  }
  c.outline('o');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.get(x, y) !== 'o') continue;
    if (c.get(x + 1, y) !== '.' && c.get(x + 1, y) !== 'o' && c.get(x, y + 1) !== '.' && c.get(x, y + 1) !== 'o') c.set(x, y, 'k');
    else if (c.get(x - 1, y) === '.' || c.get(x, y - 1) === '.') { if (c.get(x + 1, y) !== '.' || c.get(x, y + 1) !== '.') c.set(x, y, 'k'); }
  }
  return c;
}

/**
 * La face est (ou ouest) d'une falaise montrée en raccourci : `u` de 0 (la lèvre, en haut) à 1 (le pied), `along` la position le
 * long de la falaise (px du monde), `lit` vrai si elle regarde l'ouest (au jour). Terre très sombre (`5`, `3`, `e` au jour),
 * rideaux de lierre (`l`, `k`, `L`) qui partent de la lèvre et descendent plus ou moins bas ; broussailles à la lèvre.
 */
export function rakedFace(u: number, along: number, lit: boolean): string {
  const a2 = Math.floor(along / 2);
  if (u < 0.08) return hash(a2, 0, 951) < 0.6 ? 'L' : 'l';
  const ivyLen = hash(Math.floor(along / 5), 1, 952);
  if (ivyLen < 0.55 && u < 0.15 + ivyLen * 1.5) {
    const g = hash(a2, Math.floor(u * 40), 953);
    return g < 0.4 ? 'l' : g < 0.75 ? 'k' : 'L';
  }
  const g = hash(a2, Math.floor(u * 25), 954);
  if (lit) return g < 0.5 ? '3' : g < 0.8 ? 'e' : '9';
  if (u > 0.9) return g < 0.5 ? '8' : '5';
  return g < 0.6 ? '5' : g < 0.88 ? '3' : '8';
}
