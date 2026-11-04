// La cheminée paysanne où l'on cuisine : proposition validée par Grégoire (3 novembre 2026), INTÉGRÉE au jeu avec sa retouche (« la
// hotte descendue à 1,50 m, posée sur le manteau, sans vide derrière »). Les pièces sont désormais celles du jeu (art/world/chimney.ts :
// `stone-hearth`, `chimney-hood`, `chimney-flue`, `chimney-cap` ; le pan percé `thatch-roof-pierced` dans art/world/xeros-house.ts) ;
// ce fichier ne garde que ce qu'il faut à la planche de vérification (tools/essai-cheminee.ts, .art-preview/cheminee-2.png) : les
// images du jeu, le manteau (le dessin du jeu de la pièce de bois), la souche dans le repère du pan.
//
// Géométrie (cm, repère de la maison : l'origine sur l'axe du poteau nord-ouest, y vers le sud) : l'âtre 220 × 110 × 150 (x 660–880,
// y 30–140, z 0–150) ; le manteau, poutre de 20 × 20 sur 2,20 m, posé sur l'âtre au devant (y 110–140, z 150–170) ; la hotte
// 220 × 80 × 100 (y 30–110, z 150–250), sur les jambages et le contrecœur, sa face sud contre le dos du manteau ; le conduit
// 100 × 80 × 100 (x 720–820, y 30–110), cinq tronçons de z 250 à 750 ; le couronnement 140 × 100 × 10 (x 700–840, y 20–120), z 750.
// (Les places de la maison rebâtie en mode construction : 10 cm plus à l'ouest que la proposition ; le pan nord à y = −65.)

import type { Grid } from '../lib/canvas';
import type { WoodPiece } from '../../src/content/types';
import { world } from '../palette';
import { composeWood } from '../world/wood-pieces';
import chimney, { AT, FLUE_COUNT, PAL, PAN_STACK, VIEW_ROT, capModel, chimneyQuads, flueModel, toPan } from '../world/chimney';
import xerosHouse, { piercedRoof } from '../world/xeros-house';
import type { Quad, V3 } from '../lib/volumes';

export { AT, FLUE_COUNT, PAL, VIEW_ROT, chimneyQuads, piercedRoof, toPan };

/** Les dimensions réelles (cm), pour le gabarit. */
export const DIMS = {
  hearth: { w: 220, d: 110, h: 150, shape: 'box' as const, ground: true },
  hood: { w: 220, d: 80, h: 100, shape: 'box' as const, ground: true },
  flue: { w: 100, d: 80, h: 100, shape: 'box' as const, ground: true },
  cap: { w: 140, d: 100, h: 10, shape: 'box' as const, ground: true },
};

/** Le manteau : la poutre équarrie du jeu (comme `beam('ew', 220)` de tools/lib/maison-xeros.ts). */
export const MANTEL: WoodPiece = { size: 'normal', length: 220, shape: 'round', hewn: 12, axis: 'ew' } as WoodPiece;
/** Le dessin du jeu de la pièce de bois, dans un sens ; sa palette (celle du monde). */
export function mantel(axis: 'ew' | 'ns'): { grid: Grid; pal: typeof world } {
  // sans son ombre portée (posé sur les jambages, il n'en a pas au sol)
  return { grid: trim(composeWood({ ...MANTEL, axis }).toGrid().map((r) => r.replace(/x/g, '.'))), pal: world };
}

export interface Img { name: string; grid: Grid; frames?: Grid[] }

/** Les images du jeu de la cheminée et du pan percé. */
export function images(): Img[] {
  const out: Img[] = [];
  for (const s of [...chimney, ...xerosHouse]) {
    if (!/^(stone-hearth|chimney-|thatch-roof-pierced)/.test(s.name)) continue;
    if (s.kind === 'spritesheet') {
      const frames = s.animations.burn.frames;
      out.push({ name: s.name, grid: frames[0], frames });
    } else if (s.kind === 'image') out.push({ name: s.name, grid: s.grid });
  }
  return out;
}

/** Le conduit et le couronnement dans le repère du pan (le trou du pan percé, celui du jeu). */
export const PAN_FLUE = PAN_STACK[0];
export const PAN_CAP = PAN_STACK[1];

const moved = (qs: Quad[], [dx, dy, dz]: V3): Quad[] => qs.map((q) => ({ ...q, o: [q.o[0] + dx, q.o[1] + dy, q.o[2] + dz] as V3 }));

/** Le conduit et le couronnement dans le repère du pan (pour la vérification : le pan posé par-dessus, comme dans le jeu). */
export function stackInPan(): Quad[] {
  const Q: Quad[] = [];
  const half = (qs: Quad[]) => qs.map((q) => {
    const o = q.o, u = q.u, v = q.v;
    const [ox, oy] = toPan(o[0], o[1]);
    return { ...q, o: [ox, oy, o[2]] as V3, u: [-u[0], -u[1], u[2]] as V3, v: [-v[0], -v[1], v[2]] as V3, n: [-q.n[0], -q.n[1], q.n[2]] as V3 };
  });
  for (let k = 0; k < FLUE_COUNT; k++) Q.push(...half(moved(flueModel(), AT.flue(k))).filter((q) => k === FLUE_COUNT - 1 || q.face !== 'top'));
  Q.push(...half(moved(capModel(), AT.cap)));
  return Q;
}

/** Une grille recadrée sur ses pixels dessinés. */
export function trim(g: Grid): Grid {
  const used = (r: string) => /[^.]/.test(r);
  const top = g.findIndex(used), last = g.length - 1 - [...g].reverse().findIndex(used);
  if (top < 0) return ['.'];
  let l = Infinity, r = -1;
  for (const row of g) for (let x = 0; x < row.length; x++) if (row[x] !== '.') { l = Math.min(l, x); r = Math.max(r, x); }
  return g.slice(top, last + 1).map((row) => row.slice(l, r + 1));
}
