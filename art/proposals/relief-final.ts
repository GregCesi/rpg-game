// Dessins définitifs du chemin creux (chantier « relief », proposition hors jeu, en attente de l'accord de Grégoire). Repris des
// essais 2 à 4 (relief-creux*.ts), qui restent intacts. Le jeu calculera la géométrie (hauteurs, faces, raccourcis) et les ombres ;
// ces dessins sont les MATIÈRES qu'il pose dessus, et les OBJETS (props) qui referment la voûte. Palette `world` (art/palette.ts),
// lumière en haut à gauche, terrain sans contour (STYLE section 3), objets avec contour.
//
// Contrats de taille (ceux du moteur) :
//   - `bank-0..3`            tuiles 32×32 : le dessus des talus plantés ; raccord libre entre les quatre (bande commune de 4 px) ;
//   - `relief-face-earth-0..2` 64×100 : la face de terre tournée vers le sud (5 m) ; raccord horizontal libre entre les trois ;
//                             coupée par le haut pour une face plus basse (la rangée 99 est toujours le pied) ;
//   - `relief-face-wet-0..1`  64×100 : la même au-dessus de l'eau (lierre jusqu'à l'eau, pied mouillé) ;
//   - `relief-lip-0..1`       64×12  : la lèvre d'une face sud ; sa rangée LIP_CREST (4) se pose sur l'arête du haut ;
//   - `relief-face-raked-0..1` 24×64 : la face est en raccourci (colonnes 0-11 : de la lèvre au pied ; 12-23 : le lierre qui
//                             déborde sur l'eau, fond transparent), raccord vertical libre ; posée à l'écran, en bande ;
//   - `relief-face-raked-west-0..1` 12×64 : la face ouest (la lèvre à droite, colonne 11 ; le pied à gauche), au jour ;
//   - `lane-<mask>` (16) et `lane-<mask>-2..4` (48 : chaque masque en quatre variantes, le couloir n'ayant que deux rangées,
//     14 et 11, qui se répéteraient) : le sol clair du couloir, terrain à bords comme `path` (N=1, E=2, S=4, O=8) ;
//     `path-lane-w-<mask>` et `path-lane-e-<mask>` (16 + 16) : la tuile de chemin qui touche le couloir (le couloir à l'ouest,
//     côté ferme ; à l'est, côté plateau) : le chemin s'y défait en sol clair ; pour les masques, `lane` et `path` se comptent
//     l'un pour l'autre comme voisins ;
//   - objets : `lane-curtain`, `lane-overhang-1..3`, `water-cut` (+ `-r1..-r3`), `shimmer` (+ `-ns`, animation de 4 images).
// Rien de art/proposals/ ne se déclare dans art/index.ts. Scène : relief-final-scene.ts ; planches : tools/essai-relief-final.ts.

import { Canvas, rng, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource, TilesetSource } from '../lib/types';
import { world } from '../palette';
import { hash } from './relief-a';

const T = 32;

// ---------- bruits ----------

const smooth = (t: number) => t * t * (3 - 2 * t);
/** Bruit de valeur lisse, périodique (px × py), sur une maille de `cx` × `cy` px ; de 0 à 1. */
function pnoise(x: number, y: number, px: number, py: number, cx: number, cy: number, seed: number): number {
  const nx = Math.max(1, Math.round(px / cx));
  const ny = Math.max(1, Math.round(py / cy));
  const fx = (((x / px) * nx) % nx + nx) % nx;
  const fy = (((y / py) * ny) % ny + ny) % ny;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = smooth(fx - x0);
  const ty = smooth(fy - y0);
  const v = (i: number, j: number) => hash(((i % nx) + nx) % nx, ((j % ny) + ny) % ny, seed);
  const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * tx;
  const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * tx;
  return a + (b - a) * ty;
}

/**
 * Un champ propre à la variante, qui rejoint près des bords un champ commun à toutes les variantes (même graine) : deux variantes
 * voisines se raccordent sans couture, l'intérieur de chacune reste à elle. `band` : largeur du fondu (px) ; `wrapY` : périodique
 * aussi en hauteur (tuile de sol), sinon seuls les bords gauche et droit se raccordent (face).
 */
function blended(own: (x: number, y: number) => number, shared: (x: number, y: number) => number, w: number, h: number, band: number, wrapY: boolean) {
  return (x: number, y: number) => {
    const dx = Math.min(x + 0.5, w - x - 0.5);
    const dy = wrapY ? Math.min(y + 0.5, h - y - 0.5) : Infinity;
    const t = smooth(Math.max(0, Math.min(1, Math.min(dx, dy) / band)));
    return shared(x, y) + (own(x, y) - shared(x, y)) * t;
  };
}

// ---------- 1. bank : le dessus des talus plantés ----------

/** Graine commune des bords des tuiles `bank` (toutes les variantes la partagent). */
const BANK_SHARED = 4100;

/**
 * Le dessus d'un talus planté, vu de dessus (32×32) : terre très sombre (`3`, creux `5`), litière (`2`, `9`), plaques d'herbe
 * sombre de taille et de forme libres (`v`, éclairées `g` en haut à gauche, `V` en bas à droite, brins `G` par paires), mousse
 * (`8`, `6`, `7`), une ou deux racines qui affleurent (`N`, arête `m`, pointe `K`), des ronces basses en arceau (tige `K`,
 * feuilles `l` `k` `L`). Aucune touffe tamponnée : chaque plaque vient d'un champ de bruit, pas d'un motif répété.
 */
export function bankTile(k: number): Canvas {
  const seed = 4200 + k * 37;
  const r = rng(seed);
  const c = new Canvas(T, T, '3');
  const f = (s: number, cx: number, cy: number) => (x: number, y: number) => pnoise(x, y, T, T, cx, cy, s);
  const mix2 = (a: (x: number, y: number) => number, b: (x: number, y: number) => number) => (x: number, y: number) => a(x, y) * 0.65 + b(x, y) * 0.35;
  const field = (s: number, s2: number) =>
    blended(mix2(f(seed + s, 8, 7), f(seed + s2, 4, 4)), mix2(f(BANK_SHARED + s, 8, 7), f(BANK_SHARED + s2, 4, 4)), T, T, 3, true);
  const soil = field(1, 2);
  // l'herbe : sur la bande commune, un champ surtout sous le seuil (de la terre, quelques bouts d'herbe qui passent d'une tuile à
  // l'autre) ; un bord tout vert ou tout brun ferait un quadrillage
  const grass = blended(mix2(f(seed + 3, 8, 7), f(seed + 4, 4, 4)), (x, y) => 0.3 + 0.38 * pnoise(x, y, T, T, 4, 4, BANK_SHARED + 3), T, T, 4, true);
  const moss = field(5, 6);
  const grain = (x: number, y: number) => hash(Math.floor(x / 2), Math.floor(y / 2), k < 0 ? 0 : 4300 + (x < 3 || x > 28 || y < 3 || y > 28 ? 0 : k));
  // la terre et la litière
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const s = soil(x, y);
    const g = grain(x, y);
    c.set(x, y, s < 0.3 ? (g < 0.7 ? '5' : '3') : s > 0.66 ? (g < 0.55 ? '2' : '9') : g < 0.12 ? '5' : g > 0.9 ? '2' : '3');
  }
  // l'herbe sombre, en plaques
  const GR = 0.6 - k * 0.015;
  const isGrass = (x: number, y: number) => grass(((x % T) + T) % T, ((y % T) + T) % T) > GR;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    if (!isGrass(x, y)) continue;
    const lit = !isGrass(x - 1, y - 1) || !isGrass(x, y - 2);
    const dark = !isGrass(x + 1, y + 1) || !isGrass(x + 2, y);
    const g = grain(x + 7, y + 3);
    c.set(x, y, lit ? (g < 0.35 ? 'g' : 'v') : dark ? 'V' : g < 0.12 ? 'V' : 'v');
  }
  // des brins plus clairs, par paires verticales, au hasard dans l'herbe (pas de touffe tamponnée)
  for (let i = 0; i < 7; i++) {
    const x = 1 + Math.floor(r() * (T - 2));
    const y = 2 + Math.floor(r() * (T - 4));
    if (c.get(x, y) === 'v' && c.get(x, y - 1) === 'v') c.set(x, y - 1, 'G').set(x, y, 'g');
  }
  // la mousse
  const isMoss = (x: number, y: number) => moss(((x % T) + T) % T, ((y % T) + T) % T) > 0.7;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    if (!isMoss(x, y) || isGrass(x, y)) continue;
    const lit = !isMoss(x - 1, y - 1);
    c.set(x, y, lit ? (grain(x, y + 5) < 0.3 ? '6' : '8') : grain(x, y + 9) < 0.3 ? '6' : '8');
  }
  // une ou deux racines qui affleurent (dans l'intérieur, jamais sur la bande commune)
  const roots = 1 + (k % 2);
  for (let i = 0; i < roots; i++) {
    let x = 6 + r() * 20;
    let y = 6 + r() * 20;
    const ang = r() * Math.PI * 2;
    let dx = Math.cos(ang);
    let dy = Math.sin(ang) * 0.6;
    const len = 6 + Math.floor(r() * 7);
    for (let j = 0; j < len; j++) {
      const px = Math.round(x);
      const py = Math.round(y);
      if (px < 4 || py < 4 || px > 27 || py > 27) break;
      c.set(px, py, j >= len - 2 ? 'K' : 'N');
      if (j > 0 && j < len - 3 && dx > -0.3) c.set(px, py - 1, j % 3 === 0 ? 'm' : c.get(px, py - 1));
      x += dx;
      y += dy;
      dx += (r() - 0.5) * 0.5;
      dy += (r() - 0.5) * 0.5;
      const n = Math.hypot(dx, dy);
      dx /= n;
      dy /= n;
    }
  }
  // des ronces basses en arceau
  const brambles = k === 1 ? 2 : 1;
  for (let i = 0; i < brambles; i++) {
    const x0 = 6 + Math.floor(r() * 16);
    const y0 = 9 + Math.floor(r() * 15);
    const span = 6 + Math.floor(r() * 4);
    const dir = r() < 0.5 ? 1 : -1;
    for (let j = 0; j <= span; j++) {
      const x = x0 + dir * j;
      const y = y0 - Math.round(Math.sin((j / span) * Math.PI) * 3);
      if (x < 4 || x > 27) continue;
      c.set(x, y, 'K');
      if (j % 2 === 1) c.set(x, y - 1, 'L').set(x + 1, y - 1, 'l').set(x, y + 1, 'k');
    }
    // le pied de la ronce, une feuille en grappe
    c.set(x0, y0, 'l').set(x0 + 1, y0, 'k').set(x0, y0 - 1, 'L');
  }
  return c;
}

// ---------- 2. relief-face-earth : la face tournée vers le sud ----------

export const FACE_W = 64;
export const FACE_H = 100;
const FACE_SHARED = 5100;

interface FaceOpts { wet: boolean; seed: number }

/**
 * La face de terre tournée vers le sud, en vraie grandeur (64 × 100, 5 m). Terre très sombre (`3`, `5`), mottes éclairées sur
 * leur arête du haut (`e`), coulures verticales (`5`), plaques de mousse (`8`, `6`) et de lierre (`l`, `k`, `L`), broussailles qui
 * pendent sous la lèvre, racines qui pendent de toute la hauteur (`N`, arête `m`, pointe `K`, radicelles), terre tombée en cône
 * au pied (`2`, `9`, `e`) avec deux ou trois cailloux. Le pied (rangée 99) reste quand la face est coupée par le haut.
 * Mouillée (`wet`) : le lierre descend en rideaux jusqu'en bas, le pied est noir de mousse, l'eau luit au ras (`q`, `w`).
 */
function face(o: FaceOpts): Canvas {
  const { wet, seed } = o;
  const r = rng(seed);
  const W = FACE_W;
  const H = FACE_H;
  const c = new Canvas(W, H, '3');
  const f = (s: number, cx: number, cy: number) => (x: number, y: number) => pnoise(x, y, W, H, cx, cy, s);
  const mix2 = (a: (x: number, y: number) => number, b: (x: number, y: number) => number) => (x: number, y: number) => a(x, y) * 0.6 + b(x, y) * 0.4;
  const soil = blended(mix2(f(seed + 1, 9, 14), f(seed + 2, 4, 7)), mix2(f(FACE_SHARED + 1, 9, 14), f(FACE_SHARED + 2, 4, 7)), W, H, 6, false);
  const moss = blended(mix2(f(seed + 3, 10, 8), f(seed + 4, 5, 4)), mix2(f(FACE_SHARED + 3, 10, 8), f(FACE_SHARED + 4, 5, 4)), W, H, 6, false);
  const clod = (x: number, y: number) => pnoise(x, y, W, H, 7, 6, seed + 5);
  const g2 = (x: number, y: number) => hash(Math.floor(x / 2), Math.floor(y / 3), seed + 6);
  // la terre : sombre, en coulures verticales (le bruit est étiré en hauteur), mottes éclairées
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = soil(x, y);
    const g = g2(x, y);
    let ch = s < 0.36 ? '5' : g < 0.14 ? '5' : '3';
    const cl = clod(x, y);
    // une motte : l'arête du haut au jour, le dessous creusé
    if (cl > 0.62 && clod(x, y - 1) <= 0.62 && s > 0.3) ch = 'e';
    else if (cl > 0.62 && clod(x, y - 2) <= 0.62 && g < 0.6) ch = 'e';
    else if (cl <= 0.62 && clod(x, y - 1) > 0.62) ch = '5';
    if (wet && s < 0.45 && g < 0.5) ch = '5';
    c.set(x, y, ch);
  }
  // la mousse et le lierre en plaques, plus fournis en haut et (mouillé) en bas
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const m = moss(x, y) + (y < 30 ? (30 - y) / 120 : 0) + (wet && y > 70 ? (y - 70) / 90 : 0);
    if (m < (wet ? 0.64 : 0.7)) continue;
    const lit = moss(x - 1, y - 1) + (y < 31 ? (31 - y) / 120 : 0) + (wet && y > 71 ? (y - 71) / 90 : 0) < (wet ? 0.64 : 0.7);
    const g = g2(x + 3, y);
    c.set(x, y, m > 0.82 ? (lit ? 'L' : g < 0.5 ? 'l' : 'k') : lit && g < 0.35 ? '6' : '8');
  }
  // les broussailles qui pendent sous la lèvre (la lèvre elle-même est `relief-lip`)
  for (let x = 0; x < W; x++) {
    const len = Math.floor(pnoise(x, 0, W, H, 5, 10, seed + 7) * 9) + (hash(Math.floor(x / 3), 1, seed + 8) < 0.2 ? 6 : 0);
    for (let y = 0; y < len; y++) {
      const g = hash(x, y, seed + 9);
      c.set(x, y, y === len - 1 ? 'k' : g < 0.45 ? 'l' : g < 0.75 ? 'k' : 'L');
    }
  }
  // les rideaux de lierre (mouillé : jusqu'à l'eau ; sec : un ou deux, courts)
  const curtains = wet ? 4 : 1;
  for (let i = 0; i < curtains; i++) {
    const x0 = 5 + Math.floor(r() * (W - 12));
    const wd = 2 + Math.floor(r() * 3);
    const len = wet ? H - 4 - Math.floor(r() * 18) : 18 + Math.floor(r() * 26);
    let drift = 0;
    for (let y = 0; y < len; y++) {
      if (y % 7 === 6) drift = Math.max(-2, Math.min(2, drift + (r() < 0.5 ? -1 : 1)));
      const w = Math.max(1, wd - (y > len - 6 ? 1 : 0) + (hash(i, Math.floor(y / 4), seed + 10) < 0.3 ? 1 : 0));
      for (let j = 0; j < w; j++) {
        const x = x0 + drift + j;
        const g = hash(x, y, seed + 11);
        c.set(x, y, j === 0 && g < 0.6 ? 'L' : y >= len - 2 ? 'k' : g < 0.55 ? 'l' : 'k');
      }
      if (y % 5 === 2 && r() < 0.7) c.set(x0 + drift - 1, y, 'L').set(x0 + drift - 1, y + 1, 'l');
    }
  }
  // les racines qui pendent : de longueurs très inégales, quelques-unes descendent jusqu'au pied
  const roots = wet ? 5 : 8;
  for (let i = 0; i < roots; i++) {
    let x = 5 + r() * (W - 10);
    const y0 = Math.floor(r() * 6);
    const long = r() < 0.35;
    const len = long ? 55 + Math.floor(r() * 35) : 10 + Math.floor(r() * 30);
    let drift = 0;
    const thick = r() < 0.4 && !wet;
    for (let j = 0; j < len; j++) {
      const y = y0 + j;
      if (y >= H - 6) break;
      drift += (r() - 0.5) * 0.7;
      drift = Math.max(-0.9, Math.min(0.9, drift));
      x += drift * 0.35;
      const px = Math.round(x);
      if (px < 4 || px > W - 5) break;
      const tip = j >= len - 2;
      c.set(px, y, tip ? 'K' : 'N');
      if (thick && j < len * 0.6) c.set(px + 1, y, 'K');
      if (!tip && j % 4 === 1 && r() < 0.6) c.set(px - 1, y, 'm');
      // une radicelle qui part de côté
      if (j > 4 && j < len - 4 && r() < 0.07) {
        const s = r() < 0.5 ? -1 : 1;
        c.set(px + s, y + 1, 'N').set(px + 2 * s, y + 2, 'K');
      }
    }
  }
  // des bouts de racine qui sortent de la terre, partout (une face basse, coupée par le haut, en garde)
  for (let i = 0; i < 9; i++) {
    const x = 5 + Math.floor(r() * (W - 10));
    const y = 30 + Math.floor(r() * 55);
    const s = r() < 0.5 ? -1 : 1;
    c.set(x, y, 'N').set(x + s, y, 'N').set(x + 2 * s, y + 1, 'K').set(x, y - 1, 'm');
  }
  // la terre tombée au pied, en cône inégal, et quelques cailloux
  for (let x = 0; x < W; x++) {
    const cone = 3 + Math.floor(pnoise(x, 0, W, H, 13, 10, seed + 12) * 7) + Math.floor(pnoise(x, 0, W, H, 4, 10, seed + 13) * 3);
    for (let d = 0; d < cone; d++) {
      const y = H - 1 - d;
      const g = hash(Math.floor(x / 2), d, seed + 14);
      let ch = d === cone - 1 ? (g < 0.6 ? 'e' : '9') : g < 0.4 ? '2' : g < 0.75 ? '9' : '3';
      if (wet) ch = d < 2 ? (g < 0.55 ? '8' : '5') : d === cone - 1 ? (g < 0.5 ? '6' : '8') : g < 0.5 ? '8' : '5';
      c.set(x, y, ch);
    }
  }
  for (let i = 0; i < (wet ? 1 : 3); i++) {
    const x = 6 + Math.floor(r() * (W - 14));
    const y = H - 3 - Math.floor(r() * 2);
    c.set(x, y, 'r').set(x + 1, y, 'z').set(x, y + 1, 'z').set(x + 1, y + 1, 'Z').set(x - 1, y + 1, 'r');
  }
  if (wet) {
    // l'eau luit au ras du pied, par endroits (le liseré `water-cut` se pose dessous)
    for (let x = 0; x < W; x++) {
      if (pnoise(x, 0, W, H, 8, 10, seed + 15) < 0.55) continue;
      c.set(x, H - 1, hash(Math.floor(x / 2), 0, seed + 16) < 0.6 ? 'q' : 'w');
    }
  }
  return c;
}

export const faceEarth = (k: number) => face({ wet: false, seed: 5200 + k * 41 });
export const faceWet = (k: number) => face({ wet: true, seed: 5400 + k * 43 });

// ---------- 4. relief-lip : la lèvre d'une face sud ----------

export const LIP_W = 64;
export const LIP_H = 12;
/** La rangée de la lèvre qui se pose sur l'arête du haut de la face. */
export const LIP_CREST = 4;

/**
 * La frange du haut d'une face sud (64 × 12) : brins et jeunes pousses qui se dressent au-dessus de l'arête (rangées 0 à 3,
 * `j`, `L`), la masse d'herbe et de mousse qui déborde (`L`, `l`, `6`, dessous `k`), puis ce qui pend de 1 à 7 px (herbe `k` `l`,
 * racines `N` `K`). Fond transparent ; terrain, donc sans contour. Raccord libre entre les deux variantes (bande commune).
 */
export function lip(k: number): Canvas {
  const seed = 6100 + k * 29;
  const c = new Canvas(LIP_W, LIP_H);
  const f = (s: number, cx: number) => (x: number) => pnoise(x, 0, LIP_W, 10, cx, 10, s);
  const bl = (s: number, cx: number) => {
    const own = f(seed + s, cx);
    const shared = f(6000 + s, cx);
    return (x: number) => blended((xx) => own(xx), (xx) => shared(xx), LIP_W, 1, 6, false)(x, 0);
  };
  const up = bl(1, 6);
  const upFine = bl(2, 3);
  const down = bl(3, 7);
  const downFine = bl(4, 3);
  for (let x = 0; x < LIP_W; x++) {
    const top = LIP_CREST - Math.round(up(x) * 2.2 + (upFine(x) > 0.62 ? 2 : 0));
    const bot = LIP_CREST + 2 + Math.round(down(x) * 3 + (downFine(x) > 0.66 ? 3 : 0));
    for (let y = Math.max(0, top); y <= Math.min(LIP_H - 1, bot); y++) {
      const g = hash(x, y, seed + 5);
      let ch: string;
      if (y < LIP_CREST) ch = y === top ? (g < 0.55 ? 'j' : 'L') : g < 0.5 ? 'L' : 'l';
      else if (y === LIP_CREST) ch = g < 0.4 ? 'L' : g < 0.7 ? 'l' : '6';
      else if (y < LIP_CREST + 2) ch = g < 0.45 ? 'l' : g < 0.75 ? '6' : 'k';
      else ch = y === bot ? 'k' : g < 0.5 ? 'k' : 'l';
      c.set(x, y, ch);
    }
    // une racine qui pend sous la frange, par endroits
    if (hash(Math.floor(x / 2), 9, seed + 6) < 0.16 && x % 2 === 0 && x > 3 && x < LIP_W - 4) {
      for (let y = bot + 1; y < LIP_H; y++) c.set(x, y, y === LIP_H - 1 || y > bot + 2 ? 'K' : 'N');
    }
  }
  return c;
}

// ---------- 5. relief-face-raked : la face est (ou ouest) en raccourci ----------

export const RAKE_W = 12;
export const RAKE_H = 64;

/**
 * La face est d'une falaise en raccourci (24 × 64, posée à l'écran en bande qui se répète du nord au sud) : colonnes 0-1, la lèvre
 * (herbe et mousse au jour, `L`, `l`, `6`) ; colonnes 2-11, la face, de la lèvre au pied (terre très sombre `5`, `3`, mousse `8`),
 * mangée de langues de lierre qui partent de la lèvre (`l`, `k`, feuilles `L` en haut) ; colonnes 12-23, le lierre qui déborde
 * et pend sur l'eau, en mèches inégales, fond transparent. Raccord vertical : périodique sur 64.
 */
export function rakedEast(k: number): Canvas {
  const seed = 7100 + k * 31;
  const r = rng(seed);
  const c = new Canvas(RAKE_W * 2, RAKE_H);
  // la face nue : terre très sombre, la lèvre au jour
  for (let y = 0; y < RAKE_H; y++) for (let x = 0; x < RAKE_W; x++) {
    const g = hash(Math.floor(x / 2), y, seed + 3);
    const g1 = hash(x, Math.floor(y / 2), seed + 6);
    let ch: string;
    if (x === 0) ch = g1 < 0.45 ? 'L' : g1 < 0.8 ? 'l' : 'j';
    else if (x === 1) ch = g1 < 0.4 ? 'l' : g1 < 0.7 ? '6' : 'k';
    else {
      const s2 = pnoise(x, y, RAKE_W, RAKE_H, 4, 8, seed + 4);
      ch = s2 < 0.38 ? '5' : g < 0.18 ? '5' : '3';
      if (x > RAKE_W - 4 && (s2 > 0.55 || g < 0.35)) ch = '8';
    }
    c.set(x, y, ch);
  }
  // les rideaux de lierre : partis de la lèvre, de 3 à 7 rangées d'épaisseur (le long de la falaise), de longueur très inégale ;
  // les plus longs passent le pied et pendent sur l'eau en mèches qui s'effilent
  let y0 = Math.floor(r() * 6);
  while (y0 < RAKE_H + 4) {
    const th = 3 + Math.floor(r() * 5);
    const long = r() < 0.55;
    const L = long ? RAKE_W + 2 + Math.floor(r() * 9) : 3 + Math.floor(r() * 8);
    for (let j = 0; j < th; j++) {
      const y = (y0 + j) % RAKE_H;
      const edge = Math.min(j, th - 1 - j);
      const reach = Math.max(2, L - (edge === 0 ? 2 + Math.floor(r() * 3) : 0) - Math.floor(r() * 3));
      for (let x = 2; x < reach && x < RAKE_W * 2; x++) {
        // sur l'eau, ne restent que des mèches d'une rangée sur deux
        if (x >= RAKE_W && (edge === 0 || j % 3 === 2) && x > RAKE_W + 1) break;
        const g = hash(x, y, seed + 7);
        let ch = j === 0 ? (g < 0.6 ? 'L' : 'l') : j === th - 1 ? 'k' : g < 0.55 ? 'l' : g < 0.8 ? 'L' : 'k';
        if (x === reach - 1) ch = 'k';
        // sur l'eau, la mèche retombe : chaque colonne au-delà du pied descend d'un demi-pixel
        const droop = x >= RAKE_W ? Math.floor((x - RAKE_W + 1) / 2) : 0;
        c.set(x, (y + droop) % RAKE_H, ch);
      }
    }
    y0 += th + 1 + Math.floor(r() * 5);
  }
  return c;
}

/** La face ouest en raccourci (12 × 64), au jour : la lèvre à droite (colonnes 10-11), le pied à gauche ; sans lierre sur l'eau. */
export function rakedWest(k: number): Canvas {
  const seed = 7300 + k * 37;
  const c = new Canvas(RAKE_W, RAKE_H);
  const ivy = (y: number) => pnoise(0, y, 10, RAKE_H, 10, 7, seed + 1);
  for (let y = 0; y < RAKE_H; y++) {
    const v = ivy(y);
    const reach = v < 0.5 ? 0 : Math.round((v - 0.5) * 16);
    for (let x = 0; x < RAKE_W; x++) {
      const g = hash(Math.floor(x / 2), y, seed + 3);
      const u = RAKE_W - 1 - x; // 0 à la lèvre
      let ch: string;
      if (u < 2) ch = u === 0 ? (g < 0.6 ? 'j' : 'L') : g < 0.5 ? 'L' : '7';
      else {
        const s = pnoise(x, y, RAKE_W, RAKE_H, 4, 8, seed + 4);
        ch = s < 0.3 ? '3' : s > 0.7 && u < 6 ? '6' : g < 0.45 ? 'e' : g < 0.85 ? '3' : '9';
        if (u > RAKE_W - 3) ch = g < 0.5 ? '9' : '2';
      }
      if (u >= 2 && u < 2 + reach) ch = g < 0.6 ? 'L' : 'l';
      c.set(x, y, ch);
    }
  }
  return c;
}

// ---------- 6. lane : le sol clair du couloir ----------

/** Le sol clair (32×32) : terre tassée presque blanche, plaques lissées, cailloux de calcaire éclairés en haut à gauche. */
function laneBase(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, '+');
  const f = (x: number, y: number) => pnoise(x, y, T, T, 8, 6, 8800) * 0.6 + pnoise(x, y, T, T, 4, 4, seed) * 0.4;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const v = f(x, y);
    if (v > 0.66) c.set(x, y, '#');
    else if (v < 0.3) c.set(x, y, hash(Math.floor(x / 2), y, seed) < 0.5 ? '=' : '+');
  }
  for (let i = 0; i < 2; i++) c.ellipse(4 + r() * 24, 4 + r() * 24, 1.5 + r() * 2, 1 + r() * 0.8, '!');
  for (let i = 0; i < 8; i++) {
    const x = 1 + Math.floor(r() * (T - 3));
    const y = 1 + Math.floor(r() * (T - 2));
    c.set(x, y, '=').set(x + 1, y, ';');
  }
  for (let i = 0; i < 4; i++) {
    const x = 1 + Math.floor(r() * (T - 5));
    const y = 1 + Math.floor(r() * (T - 4));
    if (r() < 0.5) {
      c.set(x + 1, y, '!').set(x + 2, y, '!');
      c.set(x, y + 1, '!').set(x + 1, y + 1, '=').set(x + 2, y + 1, '=').set(x + 3, y + 1, ';');
      c.set(x + 1, y + 2, ';').set(x + 2, y + 2, ';').set(x + 3, y + 2, '$');
    } else {
      c.set(x, y, '!').set(x + 1, y, '=').set(x, y + 1, '=').set(x + 1, y + 1, ';').set(x + 2, y + 1, '$');
    }
  }
  return c;
}

/** Profondeur d'un bord qui ondule, périodique sur 32 (deux tuiles voisines se raccordent). */
function edgeDepth(i: number, phase: number, base: number): number {
  const a = (i / T) * Math.PI * 2;
  return base + Math.round(Math.sin(a * 2 + phase) * 1.2 + Math.sin(a * 5 + phase * 3) * 0.8);
}

/**
 * Le bord du sol clair là où il n'a pas de voisin (mask : N=1, E=2, S=4, O=8) : la terre brune tombée du pied du talus (`e`, `n`,
 * `9`, en grappes ; plus claire que la face, elle s'accorde aussi à l'herbe de la bouche), puis une frange de terre tassée plus
 * sombre (`$`, `I`) qui mord le clair. Sans contour.
 */
function laneBorder(c: Canvas, mask: number) {
  const sides: [number, (i: number, d: number) => [number, number]][] = [
    [1, (i, d) => [i, d]], [2, (i, d) => [T - 1 - d, i]], [4, (i, d) => [i, T - 1 - d]], [8, (i, d) => [d, i]],
  ];
  for (const [bit, at] of sides) {
    if (mask & bit) continue;
    for (let i = 0; i < T; i++) {
      const depth = edgeDepth(i, bit, 3);
      const fringe = depth + 1 + (hash(Math.floor(i / 2), bit, 8900) < 0.5 ? 1 : 0);
      for (let d = 0; d <= fringe; d++) {
        const [x, y] = at(i, d);
        const g = hash(Math.floor(x / 2), Math.floor(y / 2), 8901 + bit);
        if (d < depth) c.set(x, y, d === 0 ? (g < 0.6 ? 'e' : '9') : g < 0.4 ? 'e' : g < 0.75 ? 'n' : '9');
        else if (d === depth) c.set(x, y, g < 0.5 ? 'n' : '$');
        else if (c.get(x, y) !== '3' && c.get(x, y) !== '2' && c.get(x, y) !== '9') c.set(x, y, g < 0.6 ? '$' : 'I');
      }
    }
  }
}

export function lane(mask: number, variant = 0): Canvas {
  const c = laneBase(8000 + mask * 7 + variant * 101);
  laneBorder(c, mask);
  return c;
}

/**
 * La tuile de chemin (`path`, art/world/tiles.ts : terre `u`, `n`, `U`, cailloux, bord d'herbe) qui touche le couloir : du côté du
 * couloir (`side` : 'w', il est à l'ouest ; 'e', à l'est), le sol clair entre en langues irrégulières et se défait en cailloux
 * clairs dans la terre brune, sur toute la tuile. `mask` : celui du chemin (le couloir compte comme voisin du côté `side`).
 */
export function pathLane(mask: number, side: 'w' | 'e', pathGrid: Grid): Canvas {
  const c = Canvas.from(pathGrid);
  const pale = laneBase(8600 + mask + (side === 'w' ? 0 : 50));
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const ch = c.get(x, y);
    if (ch !== 'u' && ch !== 'n' && ch !== 'U' && ch !== 'R' && ch !== 'r' && ch !== 'z' && ch !== 'e') continue;
    // la distance au bord du couloir, de 0 (contre lui) à 1 (à l'autre bout)
    const d = (side === 'w' ? x : T - 1 - x) / (T - 1);
    const n = pnoise(x, y, T, T, 6, 5, 8700 + (side === 'w' ? 1 : 2)) * 0.6 + pnoise(x, y, T, T, 3, 3, 8710 + mask) * 0.4;
    // la langue claire : pleine contre le couloir, déchirée vers le milieu ; puis des cailloux clairs épars
    if (ch === 'e') { if (d < 0.25 && n > 0.35) c.set(x, y, '$'); continue; }
    if (d < 0.18 + n * 0.45) c.set(x, y, pale.get(x, y));
    else if (d < 0.35 + n * 0.5 && hash(Math.floor(x / 2), Math.floor(y / 2), 8720) < 0.25) c.set(x, y, n > 0.5 ? 'I' : '$');
  }
  // trois cailloux clairs qui s'égarent dans la terre brune
  const r = rng(8730 + mask + (side === 'w' ? 0 : 9));
  for (let i = 0; i < 3; i++) {
    const xx = Math.floor((0.4 + r() * 0.4) * (T - 3));
    const x = side === 'w' ? xx : T - 3 - xx;
    const y = 6 + Math.floor(r() * (T - 12));
    if (c.get(x, y) !== 'u' && c.get(x, y) !== 'n' && c.get(x, y) !== 'U') continue;
    c.set(x, y, '!').set(x + 1, y, '=').set(x, y + 1, '=').set(x + 1, y + 1, ';');
  }
  return c;
}

// ---------- 7. les objets ----------

/** Contour d'un objet de feuillage : `o` en bas et à droite, `k` (la teinte la plus sombre du feuillage) en haut et à gauche. */
function foliageOutline(c: Canvas) {
  c.outline('o');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.get(x, y) !== 'o') continue;
    const open = (a: number, b: number) => c.get(a, b) === '.';
    // le côté lumière : le vide en haut ou à gauche, la matière en bas ou à droite
    if ((open(x - 1, y) || open(x, y - 1)) && (!open(x + 1, y) || !open(x, y + 1))) c.set(x, y, 'k');
  }
}

interface FoliageOpts {
  w: number;
  h: number;
  seed: number;
  /** Où pend la masse : profil du haut (crête) et du bas, de 0 à 1 de la hauteur, en fonction de u (0 à 1, d'ouest en est). */
  crest: (u: number) => number;
  under: (u: number) => number;
  /** Part des lianes qui descendent jusqu'en bas ; densité des lianes. */
  longVines: number;
  vines: number;
  /** Une branche morte qui sort de la masse (forme 2). */
  branch?: [number, number, number];
}

/**
 * Une masse de feuillage qui pend : crête irrégulière (une marche au hasard, des pousses qui dépassent, jamais une étagère), corps
 * fait de petites grappes de feuilles (un éclat `j`/`L` au jour en haut à gauche de chaque grappe, `l`, l'ombre `k` dessous), qui
 * s'assombrit vers le bas, quelques trous ; dessous, des lianes de longueurs très inégales (tige `l`/`k`, feuilles `L` par paires,
 * pointe `k`), quelques-unes jusqu'au bas de l'image. La silhouette remplit exactement w × h.
 */
function foliage(o: FoliageOpts): Canvas {
  // on dessine à l'intérieur ; le contour ajoute un pixel tout autour (la silhouette fait o.w × o.h, contour compris)
  const w = o.w - 2;
  const h = o.h - 2;
  const { seed } = o;
  const r = rng(seed);
  const c = new Canvas(w, h);
  // la crête : une marche au hasard bornée par le profil voulu, avec des pousses
  const top = new Array<number>(w);
  const bot = new Array<number>(w);
  let walk = 0;
  for (let x = 0; x < w; x++) {
    walk += (r() - 0.5) * 2.2;
    walk = Math.max(-5, Math.min(5, walk));
    const u = x / (w - 1);
    let t = Math.round(o.crest(u) * h + walk + (pnoise(x, 0, w, 1, 9, 1, seed + 1) - 0.5) * 8);
    if (hash(Math.floor(x / 3), 0, seed + 2) < 0.12) t -= 3 + Math.floor(hash(x, 1, seed + 2) * 4);
    top[x] = Math.max(0, t);
  }
  walk = 0;
  for (let x = 0; x < w; x++) {
    walk += (r() - 0.5) * 2.6;
    walk = Math.max(-6, Math.min(6, walk));
    const u = x / (w - 1);
    const b = Math.round(o.under(u) * h + walk + (pnoise(x, 0, w, 1, 7, 1, seed + 3) - 0.5) * 10);
    bot[x] = Math.max(top[x] + 4, Math.min(h - 1, b));
  }
  // la masse, et son modelé en grappes
  const lobe = (x: number, y: number) => pnoise(x, y, w, h, 6, 5, seed + 4) * 0.65 + pnoise(x, y, w, h, 3, 3, seed + 5) * 0.35;
  for (let x = 0; x < w; x++) for (let y = top[x]; y <= bot[x]; y++) {
    // des trous dans la masse, surtout vers le bas
    const depth = (y - top[x]) / Math.max(1, bot[x] - top[x]);
    if (depth > 0.35 && pnoise(x, y, w, h, 5, 4, seed + 6) > 0.8 - depth * 0.08) continue;
    const v = lobe(x, y);
    const up = lobe(x - 1, y - 1);
    const lit = v - up > 0.035;
    const shade = up - v > 0.035;
    const g = hash(x, y, seed + 7);
    let ch: string;
    if (y - top[x] < 2 && g < 0.7) ch = depth < 0.2 && x < w * 0.7 ? 'j' : 'L';
    else if (lit) ch = depth < 0.45 ? (g < 0.4 ? 'j' : 'L') : 'L';
    else if (shade) ch = depth > 0.3 ? 'k' : 'l';
    else ch = depth > 0.7 ? (g < 0.6 ? 'k' : 'l') : g < 0.15 ? 'k' : 'l';
    c.set(x, y, ch);
  }
  // une branche morte qui sort de la masse
  if (o.branch) {
    const [bx, by, len] = o.branch;
    for (let j = 0; j < len; j++) {
      const x = bx + j;
      const y = by - Math.floor(j / 3);
      c.set(x, y, j > len - 3 ? 'K' : 'N').set(x, y + 1, 'K');
      if (j === Math.floor(len / 2)) c.set(x, y - 1, 'N').set(x + 1, y - 2, 'K');
    }
  }
  // les lianes
  const vines: number[] = [];
  for (let x = 1; x < w - 1; x += 2 + Math.floor(r() * 3)) if (r() < o.vines) vines.push(x);
  for (const x0 of vines) {
    let y = bot[x0];
    while (y > 0 && c.get(x0, y) === '.') y--;
    if (y <= top[x0]) continue;
    const room = h - 1 - y;
    const long = r() < o.longVines;
    const len = Math.max(2, Math.floor(room * (long ? 0.6 + r() * 0.4 : 0.06 + r() * 0.3)));
    let x = x0;
    for (let k = 1; k <= len; k++) {
      if (k % 6 === 0 && r() < 0.5) x += r() < 0.5 ? -1 : 1;
      const tip = k >= len - 1;
      c.set(x, y + k, tip ? 'k' : k % 4 === 0 ? 'L' : 'l');
      if (!tip && r() < (k < len / 2 ? 0.4 : 0.22)) {
        const sd = r() < 0.5 ? -1 : 1;
        c.set(x + sd, y + k, sd < 0 ? 'L' : 'k').set(x + sd, y + k + 1, 'l');
      }
    }
  }
  // la silhouette remplit le cadre : une pousse au coin haut, une liane jusqu'en bas
  const xs = Array.from({ length: w }, (_, i) => i);
  const tallest = xs.reduce((a, b) => (top[b] < top[a] ? b : a), 0);
  for (let y = 0; y <= top[tallest]; y++) c.set(tallest, y, y === 0 ? 'j' : 'L');
  if (![...Array(w).keys()].some((x) => c.get(x, h - 1) !== '.')) {
    const x = vines.length ? vines[Math.floor(vines.length * 0.62)] : Math.floor(w * 0.6);
    let y = h - 1;
    while (y > 0 && c.get(x, y) === '.') y--;
    for (let k = y + 1; k < h; k++) c.set(x, k, k === h - 1 ? 'k' : k % 4 === 0 ? 'L' : 'l');
  }
  const out = new Canvas(o.w, o.h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.set(x + 1, y + 1, c.get(x, y));
  foliageOutline(out);
  return out;
}

/** Les objets, à leurs dimensions (cm) ; la taille à l'écran en découle par le gabarit (boîte : W × (H + D/2)). */
export const PROPS = {
  'lane-curtain': { dims: { w: 1150, d: 160, h: 340, shape: 'box' }, size: [230, 84], root: 62 },
  'lane-overhang-1': { dims: { w: 800, d: 140, h: 230, shape: 'box' }, size: [160, 60], root: 30 },
  'lane-overhang-2': { dims: { w: 640, d: 120, h: 270, shape: 'box' }, size: [128, 66], root: 30 },
  'lane-overhang-3': { dims: { w: 520, d: 100, h: 190, shape: 'box' }, size: [104, 48], root: 24 },
  'water-cut': { dims: { w: 160, d: 20, h: 0, shape: 'flat' }, size: [32, 4], root: 0 },
  shimmer: { dims: { w: 160, d: 15, h: 0, shape: 'flat' }, size: [32, 3], root: 0 },
} as const;

/**
 * Le rideau de la bouche, côté ferme (230 × 84) : une grande masse basse qui déborde largement sur les deux talus, crête cassée
 * qui monte à l'ouest (le côté du couloir) et s'effiloche à l'est, lianes inégales dont plusieurs descendent jusqu'au bas. La
 * rangée `root` (62) est la crête du talus sud où il s'enracine ; ce qui est dessous pend devant la face.
 */
export const curtain = () => foliage({
  w: 230, h: 84, seed: 9100,
  crest: (u) => 0.12 + 0.18 * Math.abs(u - 0.38) + (u > 0.8 ? (u - 0.8) * 1.4 : 0),
  under: (u) => 0.5 + 0.12 * Math.sin(u * 9.1) - (u > 0.85 ? (u - 0.85) * 1.2 : 0) + (u < 0.1 ? (0.1 - u) * -1.5 : 0),
  longVines: 0.3, vines: 0.75,
});

/**
 * Les avancées de feuillage, accrochées à la crête d'un talus, qui se penchent au-dessus du couloir. Trois formes, trois
 * silhouettes : 1, une langue longue et plate (160 × 60), lourde à l'est ; 2, une masse haute et bombée à crête déchirée, une
 * branche morte qui en sort (128 × 66) ; 3, petite et dissymétrique, un rideau de lianes serré (104 × 48).
 */
export const overhang = (k: 1 | 2 | 3) => {
  if (k === 1) return foliage({
    w: 160, h: 60, seed: 9200,
    crest: (u) => 0.1 + 0.25 * (1 - u) ** 2 + (u > 0.7 ? 0.08 : 0),
    under: (u) => 0.42 + 0.18 * u - 0.1 * Math.sin(u * 7.3),
    longVines: 0.22, vines: 0.7,
  });
  if (k === 2) return foliage({
    w: 128, h: 66, seed: 9300,
    crest: (u) => 0.06 + 0.5 * (u - 0.45) ** 2 + 0.05 * Math.sin(u * 13),
    under: (u) => 0.58 - 0.3 * (u - 0.45) ** 2 * 3,
    longVines: 0.2, vines: 0.6, branch: [96, 22, 18],
  });
  return foliage({
    w: 104, h: 48, seed: 9400,
    crest: (u) => 0.1 + 0.3 * u ** 1.5,
    under: (u) => 0.45 - 0.15 * u + 0.08 * Math.sin(u * 11),
    longVines: 0.35, vines: 0.95,
  });
};

/**
 * Le liseré mouillé de la coupure de l'eau (32 × 4, à plat) : la vue de base a l'eau au sud (le flanc au nord) : la terre noyée
 * au ras du flanc (`5`, `8`), une ligne d'eau sombre (`q`), puis l'eau qui s'éclaircit (`q`, `w`). Les autres vues, un quart de
 * tour à chaque fois dans le sens des aiguilles d'une montre (`four`) : r1, l'eau à l'ouest ; r2, au nord ; r3, à l'est.
 */
export function waterCut(): Canvas {
  const c = new Canvas(32, 4);
  for (let x = 0; x < 32; x++) {
    const g = hash(Math.floor(x / 2), 0, 9500);
    const g2 = hash(Math.floor(x / 3), 1, 9501);
    c.set(x, 0, g < 0.55 ? '5' : '8');
    c.set(x, 1, g2 < 0.25 ? '5' : 'q');
    c.set(x, 2, g < 0.7 ? 'q' : 'w');
    c.set(x, 3, g2 < 0.3 ? 'q' : 'w');
  }
  return c;
}

/** Une vue tournée d'un quart de tour (sens des aiguilles d'une montre) `n` fois. */
export function rotate(c: Canvas, n: number): Canvas {
  let g = c;
  for (let i = 0; i < n; i++) {
    const o = new Canvas(g.h, g.w);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) o.set(g.h - 1 - y, x, g.get(x, y));
    g = o;
  }
  return g;
}

export const SHIMMER_FRAMES = 4;

/**
 * Le miroitement le long d'une coupure (32 × 3, à plat, sur l'eau au ras du liseré), image `f` de 4 : un trait de lumière
 * (`W`, cœur `a`) court et glisse d'ouest en est, naît, s'étire et s'éteint ; deux traits par segment, décalés. Symétrique d'un
 * bord à l'autre (la rangée du milieu porte la lumière) : il sert des deux côtés de l'eau ; `-ns` pour une coupure nord-sud.
 */
export function shimmer(f: number): Canvas {
  const c = new Canvas(32, 3);
  const glints: [number, number][] = [[3, 0], [19, 2]];
  for (const [x0, ph] of glints) {
    const p = (f + ph) % SHIMMER_FRAMES; // 0 naissant, 1 plein, 2 étiré, 3 éteint
    const x = x0 + f * 2;
    if (p === 0) c.set(x + 1, 1, 'W').set(x + 2, 1, 'W');
    if (p === 1) { c.set(x, 1, 'W').set(x + 1, 1, 'a').set(x + 2, 1, 'a').set(x + 3, 1, 'W'); c.set(x + 2, 0, 'W'); }
    if (p === 2) { c.set(x, 1, 'W').set(x + 1, 1, 'W').set(x + 2, 1, 'a').set(x + 3, 1, 'W').set(x + 4, 1, 'W'); c.set(x + 3, 2, 'W'); }
  }
  // un fil discret, toujours là, qui ondule (on devine la coupure même entre deux éclats)
  for (let x = 0; x < 32; x++) if ((x + f * 3) % 11 < 2 && c.get(x, 1) === '.') c.set(x, 1, 'W');
  // le segment se lit d'un bout à l'autre (32 × 3 à chaque image) : un éclat voulu au bord du haut et du bas, le fil aux deux bouts
  c.set(0, 1, 'W').set(31, 1, 'W');
  c.set((7 + f * 5) % 32, 0, 'W').set((24 + f * 5) % 32, 2, 'W');
  return c;
}

// ---------- les sources, prêtes à déclarer (art/index.ts) quand Grégoire aura dit oui ----------

export function reliefTileset(pathTiles: Record<string, Grid>): TilesetSource {
  const tiles: Record<string, Grid> = {};
  for (let k = 0; k < 4; k++) tiles[`bank-${k}`] = bankTile(k).toGrid();
  for (let m = 0; m < 16; m++) {
    tiles[`lane-${m}`] = lane(m).toGrid();
    tiles[`path-lane-w-${m}`] = pathLane(m | 8, 'w', pathTiles[`path-${m | 8}`]).toGrid();
    tiles[`path-lane-e-${m}`] = pathLane(m | 2, 'e', pathTiles[`path-${m | 2}`]).toGrid();
  }
  for (let m = 0; m < 16; m++) for (let v = 2; v <= 4; v++) tiles[`lane-${m}-${v}`] = lane(m, v).toGrid();
  return { kind: 'tileset', name: 'relief', tileSize: T, palette: world, tiles };
}

export function reliefImages(): ImageSource[] {
  const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });
  const out: ImageSource[] = [];
  for (let k = 0; k < 3; k++) out.push(img(`relief-face-earth-${k}`, faceEarth(k)));
  for (let k = 0; k < 2; k++) out.push(img(`relief-face-wet-${k}`, faceWet(k)));
  for (let k = 0; k < 2; k++) out.push(img(`relief-lip-${k}`, lip(k)));
  for (let k = 0; k < 2; k++) out.push(img(`relief-face-raked-${k}`, rakedEast(k)));
  for (let k = 0; k < 2; k++) out.push(img(`relief-face-raked-west-${k}`, rakedWest(k)));
  out.push(img('lane-curtain', curtain()));
  for (const k of [1, 2, 3] as const) out.push(img(`lane-overhang-${k}`, overhang(k)));
  out.push(img('water-cut', waterCut()));
  for (let n = 1; n < 4; n++) out.push(img(`water-cut-r${n}`, rotate(waterCut(), n)));
  return out;
}

export function shimmerSheet(ns = false): SpriteSheetSource {
  const frames = Array.from({ length: SHIMMER_FRAMES }, (_, f) => (ns ? rotate(shimmer(f), 1) : shimmer(f)).toGrid());
  return {
    kind: 'spritesheet', name: ns ? 'shimmer-ns' : 'shimmer', frameW: ns ? 3 : 32, frameH: ns ? 32 : 3, palette: world,
    animations: { shimmer: { frames, frameRate: 5, repeat: -1 } },
  };
}
