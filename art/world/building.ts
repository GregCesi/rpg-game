// Pièces de bâtiment : dés, poteaux, sablières, chevrons, couvertures ; l'abri à bois d'abord.
// Chaque pièce suit le gabarit (docs/STYLE.md, section 8) ; sa silhouette est collée en haut à gauche de l'image
// (x = 0, y = 0), l'ombre portée `x` en dessous et à droite, hors silhouette.
// Lumière nord-ouest ; contour d'un pixel : teinte la plus sombre de la matière en haut et à gauche, OUTLINE (o) en bas
// et à droite.

import { Canvas, EMPTY, rng } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { hewnTone } from './wood';
import { thatch } from './house';

const palette = { ...world };

// ---------- Dé de pierre ----------

/**
 * Dé de pierre (`footing-stone`), boîte de 30 × 30 × 15 cm : silhouette 6 × 6 px, dessus en 3 rangées (contour du
 * haut et deux rangées de pierre claire R r, où se pose le pied du poteau), face sud en 3 rangées (z Z, puis le
 * contour du bas). Coin nord-est émoussé. Ombre portée sous la base, décalée à droite.
 */
function footingStone(): Canvas {
  return Canvas.from([
    'ZZZZZ..',
    'ZRRRro.',
    'ZRRrro.',
    'ZzzzZox',
    'ZzzZZox',
    'oooooox',
    '.xxxxxx',
  ]);
}

// ---------- Poteaux ----------

/** Rangées vides sous un poteau, dans son image : la hauteur du dé (15 cm) sur lequel il se dresse. */
const FOOTING_ROWS = 3;

/**
 * Poteau équarri de 15 × 15 cm (`shed-post-high`, `shed-post-low`), boîte debout : silhouette 3 × `sil` px, à la
 * taille réelle (sans plancher de lisibilité). Rangée 0 : le contour du haut ; rangée 1 : le dessus, bois de bout
 * éclairé (Y) ; puis la face sud, une colonne de bois équarri (fil vertical, plaques d'écorce par endroits, `phase`
 * pour que deux poteaux diffèrent) entre le contour gauche (N, la teinte la plus sombre du bois de coupe) et OUTLINE à
 * droite ; dernière rangée : le contour du bas, le pied, posé sur la rangée du haut du dé. Sous lui, FOOTING_ROWS
 * rangées vides. Pas d'ombre portée : le dé la porte.
 */
function shedPost(sil: number, phase: number): Canvas {
  const c = new Canvas(3, sil + FOOTING_ROWS);
  c.set(0, 0, 'N').set(1, 0, 'N').set(2, 0, 'o');
  c.set(0, 1, 'N').set(1, 1, 'Y').set(2, 1, 'o');
  for (let y = 2; y < sil - 1; y++) c.set(0, y, 'N').set(1, y, hewnTone(y + phase, 0, 1, 'lit')).set(2, y, 'o');
  for (let x = 0; x < 3; x++) c.set(x, sil - 1, 'o');
  return c;
}

// ---------- Sablières ----------

/** Bois équarri d'un dessus, tourné vers la lumière : un cran plus clair que la face (t -> Y, T -> t), écorce gardée. */
const LIGHTER: Record<string, string> = { t: 'Y', T: 't' };
const topTone = (along: number, wane?: 'lit' | 'shade') => {
  const k = hewnTone(along, 0, 1, wane);
  return LIGHTER[k] ?? k;
};

/**
 * Sablière est-ouest (`shed-plate-north`, `shed-plate-south`), boîte de 320 × 15 × 15 cm : silhouette 64 × 5 px collée en
 * haut de l'image, `below` rangées vides dessous (la hauteur qui la sépare du sol, bas de l'image au sol). Rangée 0 : le
 * contour du haut (N) ; rangée 1 : le dessus, bois clair (Y, fil en t) ; rangées 2 et 3 : la face sud (t, fil en T),
 * l'écorce de l'arête du haut par endroits ; rangée 4 : le contour du bas. Contour gauche N, droit OUTLINE ; aux bouts, rien
 * (ils sont sur les poteaux). `phase` : une autre pièce du même bois.
 */
function shedPlateEW(below: number, phase: number): Canvas {
  const W = 64;
  const c = new Canvas(W, 5 + below);
  for (let x = 0; x < W; x++) {
    const a = x + phase;
    const edge = x === 0 ? 'N' : x === W - 1 ? 'o' : null;
    c.set(x, 0, x === W - 1 ? 'o' : 'N');
    c.set(x, 1, edge ?? topTone(a));
    c.set(x, 2, edge ?? hewnTone(a + 17, 0, 1, 'lit'));
    c.set(x, 3, edge ?? hewnTone(a + 41, 0, 1));
    c.set(x, 4, 'o');
  }
  return c;
}

/**
 * Sablière de côté (`shed-plate-side`), nord-sud, en pente de la tête d'un poteau haut à celle d'un poteau bas : pièce
 * `ground`, silhouette 3 × 75 px (3 de large ; 64 de long au sol plus 11 d'épaisseur et de pente), puis 38 rangées
 * vides. Rangée 0 : le contour du haut ; rangées 1 à 70 : le dessus, une bande de bois clair (fil vertical, flache par
 * endroits) entre le contour gauche N et OUTLINE ; rangée 71 : l'arête du bout ; rangées 72 et 73 : la face de coupe
 * au sud (bois de bout, Y sur t, comme le dessus des poteaux) ; rangée 74 : le contour du bas.
 */
function shedPlateSide(): Canvas {
  const sil = 75;
  const c = new Canvas(3, sil + 38);
  c.set(0, 0, 'N').set(1, 0, 'N').set(2, 0, 'o');
  for (let y = 1; y < sil - 4; y++) c.set(0, y, 'N').set(1, y, topTone(y + 5, 'lit')).set(2, y, 'o');
  c.set(0, sil - 4, 'N').set(1, sil - 4, 'T').set(2, sil - 4, 'o');
  c.set(0, sil - 3, 'N').set(1, sil - 3, 'Y').set(2, sil - 3, 'o');
  c.set(0, sil - 2, 'N').set(1, sil - 2, 't').set(2, sil - 2, 'o');
  for (let x = 0; x < 3; x++) c.set(x, sil - 1, 'o');
  return c;
}

// ---------- Chevrons ----------

/**
 * Chevron de l'abri (`shed-rafter`), 10 × 10 cm, nord-sud sur les deux sablières est-ouest, en pente : pièce `ground`,
 * silhouette 2 × 88 px (2 de large ; 76 de long au sol plus 11,5 d'épaisseur et de pente), puis 40 rangées vides (bas
 * de l'image au sol, un pixel au sud de son bout). À 2 px, un contour complet ne laisserait pas de bois : on garde le
 * côté ombre, et la lumière fait le côté gauche. Colonne 0 : le dessus, bois clair au fil vertical (flache par endroits) ;
 * colonne 1 : OUTLINE, l'arête est dans l'ombre. Ainsi le chevron se lit clair-sombre, quand la sablière de côté qu'il
 * recouvre aux bords se lit sombre-clair-sombre (N, bois, OUTLINE). Rangée 0 : le contour du bout nord ; rangée 85 :
 * l'arête du bout sud ; rangées 86 et 87 : la face de coupe (bois de bout Y, t), à l'ombre en bas à droite.
 */
function shedRafter(): Canvas {
  const sil = 88;
  const c = new Canvas(2, sil + 40);
  c.set(0, 0, 'N').set(1, 0, 'o');
  for (let y = 1; y < sil - 3; y++) c.set(0, y, topTone(y + 5, 'lit')).set(1, y, 'o');
  c.set(0, sil - 3, 'T').set(1, sil - 3, 'o');
  c.set(0, sil - 2, 'Y').set(1, sil - 2, 't');
  c.set(0, sil - 1, 't').set(1, sil - 1, 'o');
  return c;
}

// ---------- Couverture de chaume ----------

/** Rangées vides sous la couverture, dans son image : la hauteur qui la sépare du sol au bord sud de l'avant-toit. */
const THATCH_BELOW = 42;

/**
 * Couverture de chaume de l'abri (`shed-thatch`), appentis de 360 × 390 cm, 30 cm d'épaisseur, côté haut au nord :
 * pièce `ground`, silhouette 72 × 94 px collée en haut de l'image, puis THATCH_BELOW rangées vides (bas de l'image au
 * sol, un pixel au sud de l'avant-toit). Rangées 0 à 87 : le dessus, le même chaume que la chaumière (`thatch` de
 * house.ts : rangs de paille est-ouest tous les 9 px, pointes P, brins clairs Y à gauche, tramé T à droite) ; bords
 * nord, est et ouest rognés d'un pixel par endroits (mèches). Rangées 88 à 93 : la tranche de l'avant-toit sud, 30 cm de
 * bouts de paille coupés (T, P, quelques t éclairés en haut), bord bas qui retombe inégal. Contour d'un pixel pris dans
 * la silhouette : P (le plus sombre du chaume) en haut et à gauche, OUTLINE en bas et à droite.
 */
function shedThatch(): Canvas {
  const W = 72;
  const TOP = 88; // rangées du dessus
  const SIL = 94;
  const c = new Canvas(W, SIL + THATCH_BELOW);
  // la forme : bords rognés par endroits, tirés au sort une fois pour toutes (même graine, même dessin)
  const r = rng(23);
  const runs = (n: number, p: number, len: number) => {
    const out: number[] = Array(n).fill(0);
    for (let i = 0; i < n; ) {
      if (r() < p) {
        const l = 1 + Math.floor(r() * len);
        for (let j = i; j < Math.min(n, i + l); j++) out[j] = 1;
        i += l + 2;
      } else i++;
    }
    return out;
  };
  const north = runs(W, 0.18, 3); // mèches du faîte nord
  const west = runs(SIL, 0.08, 3);
  const east = runs(SIL, 0.1, 3);
  const drop = runs(W, 0.22, 2); // bord bas de la tranche : là où la paille retombe moins
  const inside = (x: number, y: number) => {
    if (x < 0 || x >= W || y < 0 || y >= SIL) return false;
    if (y < north[x] || (y === SIL - 1 && drop[x])) return false;
    if (x < west[y] || x > W - 1 - east[y]) return false;
    // coins du nord arrondis d'un pixel
    if (y <= 1 && (x === 0 || x === W - 1)) return false;
    return true;
  };
  for (let y = 0; y < SIL; y++) for (let x = 0; x < W; x++) if (inside(x, y)) c.set(x, y, 't');
  // ombre douce vers l'est, en tramé léger, que le chaume de la chaumière prolonge (passage moins brusque sur 72 px)
  c.within('t', (c) => {
    for (let y = 0; y < TOP; y++) for (let x = 0; x < W; x++) {
      const k = x / (W - 1);
      if (k > 0.3 && r() < (k - 0.3) * 0.55) c.set(x, y, 'T');
    }
  });
  // le dessus : le chaume de la chaumière, à la même échelle de rangs
  thatch(c, 0, W - 1, 0, TOP - 1, 19);
  // la tranche de l'avant-toit sud : bouts de paille coupés, plus sombres ; arête éclairée en haut à gauche
  for (let x = 0; x < W; x++) {
    const strand = r() < 0.3; // brin plus sombre sur toute la tranche
    for (let y = TOP; y < SIL; y++) {
      if (c.get(x, y) === EMPTY) continue;
      let col = strand ? 'P' : 'T';
      if (y === TOP) col = r() < 0.75 - x / W ? 't' : 'T';
      else if (y === TOP + 1 && !strand && r() < 0.4 - x / W) col = 't';
      else if (y >= SIL - 2 && r() < 0.6) col = 'P';
      c.set(x, y, col);
    }
  }
  // contour pris dans la silhouette : P côté lumière (haut, gauche), OUTLINE côté ombre (bas, droite)
  const out: [number, number, string][] = [];
  for (let y = 0; y < SIL; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y)) continue;
    if (!inside(x + 1, y) || !inside(x, y + 1)) out.push([x, y, 'o']);
    else if (!inside(x - 1, y) || !inside(x, y - 1)) out.push([x, y, 'P']);
  }
  for (const [x, y, col] of out) c.px[y][x] = col;
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [
  img('footing-stone', footingStone()),
  img('shed-post-high', shedPost(44, 12)),
  img('shed-post-low', shedPost(36, 30)),
  img('shed-plate-north', shedPlateEW(46, 0)),
  img('shed-plate-south', shedPlateEW(39, 23)),
  img('shed-plate-side', shedPlateSide()),
  img('shed-rafter', shedRafter()),
  img('shed-thatch', shedThatch()),
];
