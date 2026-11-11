// Dessin validé par Grégoire, passé au jeu (chantier « maison du coq ») : le catalogue des pièces DE BOIS, DE FER, DE VERRE,
// DES MEUBLES ET DES TENTURES de la maison du coq (version A), une pièce à la fois, vue de ses quatre côtés selon sa symétrie,
// pour que Grégoire les valide une par une avant qu'on bâtisse. Les pièces de pierre sont dans coq-catalogue-pierre*.ts (l'autre
// dessinateur). La liste des pièces, leurs dimensions, leurs masses : art/proposals/coq-catalogue-data.ts (la seule source).
//
// Refaire la planche : npx tsx tools/essai-coq-catalogue-bois.ts écrit .art-preview/coq-catalogue-bois-<n>.png (x4, Xéros à
// côté de chaque groupe) et .art-preview/coq-catalogue-bois.json (le gabarit de chaque vue : attendu, mesuré, OK).
//
// Les vues (la convention de props.json, `-r1` à `-r3`) : R0 l'objet vu du sud, comme le jeu le pose ; R1, R2, R3 l'objet tourné
// d'un quart de tour de plus à chaque fois, dans le sens des aiguilles d'une montre vu de dessus (sa face sud passe à l'ouest,
// puis au nord, puis à l'est). Dans le modèle en volumes (art/lib/volumes.ts, `rotQuads`, dont la rotation 1 est « vu de
// l'ouest ») : R1 = rotation 3, R2 = rotation 2, R3 = rotation 1 (`ROT`).
//
// Ce qui est ici :
// - les pièces de bois qui EXISTENT (la poutre du normal, la latte de la perche) : leur image du jeu, composée comme le jeu la
//   compose (`composeWood` d'art/world/wood-pieces.ts), à l'âge patiné (`agedPalette`), couchée est-ouest (R0) et nord-sud (R1,
//   règle D), et debout pour le poinçon ;
// - les pièces nouvelles, rendues par le modèle en volumes (boîtes, prismes), le contour de STYLE.md section 3 posé par
//   `renderPiece` : k = 1 pour une pièce de bâtiment (`ground`) et pour le bois couché (la règle D : sa profondeur à l'échelle du
//   sol), k = ½ pour un objet ;
// - les matières des baies sont celles de coq-baies.ts, prises à ses volumes (`crossWindow`, `archDoor` : les faces nommées
//   « vitrail », « volet », « fer », « porte »), jamais recopiées ;
// - les meubles : coq-maison.ts n'exporte que leur vue du sud (`COQ_FURNITURE`, des images). Leurs modèles sont refaits ici à
//   l'identique (mêmes boîtes, mêmes matières), pour les tourner ; l'outil vérifie que la vue du sud refaite est, au pixel près,
//   celle que Grégoire a validée (à reprendre : que coq-maison.ts exporte ses modèles, et ce double disparaît) ;
// - les tentures : la tenture de coq-tentures.ts telle quelle ; la verdure redessinée ici selon les remarques de Grégoire (des
//   feuilles plus découpées, en lobes et en pointes ; le coq mieux détaché, sur une réserve plus claire et cerné plus franc).
//
// Bois : une seule matière, les signes de `woodAges` (^ * % & @), à l'âge patiné (COQ_PAL de coq-pierre.ts porte `woodAges.worn`).

import type { Grid, Palette } from '../lib/canvas';
import { box, polyPrism, prism, part, renderPiece, rotQuads, withGroundShadow, dash, hash, unit, sub, type Quad, type Tex, type V3, type Rot, type Ctx } from '../lib/volumes';
import { COQ_PAL } from './coq-materials';
import { crossWindow, archDoor, inBay, type Bay } from './coq-bays';
import { tenture as tentureGrid } from './coq-hangings';
import { composeWood } from './wood-pieces';
import { agedPalette } from './wood';
import { world } from '../palette';
import { furniture as interiorFurniture } from '../interior/house';
import { woodOfLook } from '../../src/world/woodShape';

/** La palette de la planche : celle de la maison du coq (bois patiné, fer, verre et plomb, laines). */
export const PAL: Palette = { ...COQ_PAL };
/** La palette des images du jeu de la pièce de bois, à l'âge patiné. */
export const WOOD_PAL: Palette = agedPalette(world, 'worn');

/** R0 à R3 (la convention des vues du jeu) en rotations du modèle en volumes. */
export const ROT: Rot[] = [0, 3, 2, 1];

/** Les vues d'une pièce : sa grille par vue, sa palette. */
export interface Drawing {
  /** L'état (`open`, `unmade`, une couleur…), absent pour l'état de base. */
  state?: string;
  /** Ce que montre ce dessin, en une ligne (sous les vues). */
  label?: string;
  views: Partial<Record<0 | 1 | 2 | 3, Grid>>;
  palette: Palette;
  /** D'où vient l'image : `game` (l'image du jeu), `model` (dessinée ici), `validated` (la vue du sud validée, importée). */
  source: Partial<Record<0 | 1 | 2 | 3, 'game' | 'model' | 'validated'>>;
}

/** Les vues d'un modèle : `n` vues (1, 2 ou 4), chacune rendue tournée, avec son ombre portée d'une rangée. */
function views(q: Quad[], k: number, n: 1 | 2 | 4, shadow = true): Drawing['views'] {
  const out: Drawing['views'] = {};
  for (let r = 0; r < n; r++) {
    const g = renderPiece(rotQuads(q, ROT[r], [0, 0]), { k });
    out[r as 0 | 1 | 2 | 3] = shadow ? withGroundShadow(g) : g;
  }
  return out;
}
const model = (n: number): Drawing['source'] => Object.fromEntries([...Array(n).keys()].map((r) => [r, 'model'])) as Drawing['source'];

// =====================================================================================================================
// Matières
// =====================================================================================================================

/**
 * Bois équarri (patiné) d'une pièce de charpente ou de menuiserie, éclairé par la normale de la face dans la vue (la lumière ne
 * tourne pas avec la pièce) : le dessus et la face tournée vers l'ouest au jour, la face sud en bois, la face est à l'ombre ; le
 * fil en tirets le long de la pièce ; le bois de bout (une petite face carrée, un `cap` de prisme) en cernes.
 */
export function beamTex(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    const along = c.w >= c.h ? i : j, across = c.w >= c.h ? j : i;
    if (c.face === 'cap' || (c.face === 'top' && c.w < 5 && c.h < 5)) {
      const e = Math.min(i, j, Math.floor(c.w) - 1 - i, Math.floor(c.h) - 1 - j);
      return e <= 0 ? '*' : '%';
    }
    if (c.n[2] > 0.5) return dash(seed, across, along, 0.35) ? '*' : '^';
    if (c.n[0] > 0.5 || c.n[2] < -0.5) return dash(seed, across, along, 0.45) ? '&' : '%';
    if (c.n[0] < -0.5) return dash(seed, across, along, 0.4) ? '*' : '^';
    return dash(seed, across, along, 0.45) ? '%' : '*';
  };
}

/** Le fer forgé : l'arête au jour (le dessus, la face ouest) claire, le reste sombre. */
const ironTex: Tex = (_s, _t, c) => (c.n[2] > 0.5 || c.n[0] < -0.5 ? '-' : '_');

/** Le chanvre d'une corde : les torons en biais. */
const ropeTex: Tex = (_s, t, c) => ((Math.floor(t * 1.5) + (c.n[0] > 0.5 ? 1 : 0)) % 2 ? 'C' : 'O');

const WOOD = (name: string, prio = 2) => part(name, prio, '&', 'full');
const IRON = (name: string, prio = 3) => part(name, prio, '_', 'none');

// =====================================================================================================================
// La charpente : les pièces de bois du jeu (elles EXISTENT), et les nouvelles
// =====================================================================================================================

/** L'image du jeu d'une pièce de bois couchée (est-ouest, nord-sud) ou debout, à l'âge patiné. */
export function gameWood(size: string, look: 'beam' | 'lath', length: number, axis: 'ew' | 'ns' | 'up'): Grid {
  return composeWood(woodOfLook(size, look, length, axis)).toGrid();
}

/** Une poutre du normal couchée, de `length` cm : ses deux vues du jeu (R0 est-ouest, R1 nord-sud). */
export function gameBeam(length: number): Drawing {
  return { views: { 0: gameWood('normal', 'beam', length, 'ew'), 1: gameWood('normal', 'beam', length, 'ns') }, palette: WOOD_PAL, source: { 0: 'game', 1: 'game' } };
}

/**
 * Une pièce de bois posée à 45° (l'arbalétrier, la poutre du normal ; le chevron, le carrelet) : elle court du sud au nord en
 * montant vers le nord, son pied au sol au sud ; `run` le recul (px), `sec` le côté de sa section carrée (px).
 */
function slanted(run: number, sec: number, seed: number): Quad[] {
  const e1: V3 = [1, 0, 0], e2: V3 = unit([0, 1, 1]);
  const a: V3 = [sec / 2, run + sec * 0.35, sec * 0.35], b: V3 = [sec / 2, sec * 0.35, run + sec * 0.35];
  return prism(a, b, e1, e2, sec, sec, WOOD('bois incliné'), beamTex(seed));
}

/** L'arbalétrier : la poutre du normal (20 × 20) de 4,80 m posée à 45° (recul et hauteur de 3,40 m). */
export function principal(): Drawing {
  return { views: views(slanted(68, 4, 7), 1, 4), palette: PAL, source: model(4) };
}

/** Le chevron : le carrelet (10 × 10, NOUVEL ASPECT) de 4,80 m posé à 45°. */
export function rafter(): Drawing {
  return { views: views(slanted(68, 2, 9), 1, 4), palette: PAL, source: model(4) };
}

/**
 * Le carrelet couché (NOUVEL ASPECT : la poutre du normal fendue en quatre, 10 × 10 cm) de `length` px : vu comme le jeu voit le
 * bois couché (la règle D : la profondeur à l'échelle du sol, k = 1), est-ouest et nord-sud.
 */
export function lyingBatten(length: number, seed: number): Drawing {
  // la règle D : le nord-sud n'est pas la pièce tournée (2 px de large) mais l'est-ouest inversé, comme la poutre du jeu : sa
  // largeur est la hauteur de l'est-ouest (le dessus et le flanc côte à côte), sa hauteur la longueur
  const ew = views(box(0, length, 0, 2, 0, 2, WOOD('carrelet'), beamTex(seed)), 1, 1)[0]!;
  const ns = views(box(0, 4, 0, length - 2, 0, 2, WOOD('carrelet'), beamTex(seed)), 1, 1)[0]!;
  return { views: { 0: ew, 1: ns }, palette: PAL, source: model(2) };
}

/**
 * Le carrelet debout (le poteau de garde-corps, 1 m) : comme le poteau du jeu (la règle D étendue au sens debout), sa largeur est
 * l'épaisseur du même carrelet couché (4 px) ; sa tête, le bois de bout, 4 × 2.
 */
export function battenPost(height: number): Quad[] {
  return box(0, 4, 0, 4, 0, height, WOOD('poteau'), beamTex(13));
}

/** La latte debout (le balustre, 80 cm) : 2 px de large (la latte du jeu couchée a 2 px de bois), 1 de profondeur. */
export function balusterQuads(x: number, y: number, z0: number, h: number): Quad[] {
  return box(x, x + 2, y, y + 1, z0, z0 + h, part('balustre', 2, '&', 'thin'), (_s, _t, c) => (c.n[2] > 0.5 ? '^' : c.n[0] > 0.5 ? '%' : '*'));
}

/**
 * Le garde-corps assemblé sur un côté de la trémie (2,80 m, `L` = 56 px ; le petit côté : 1 m, 20 px) : deux poteaux de carrelet, la main courante et la lisse basse
 * (carrelet couché, à mi-bois sur les poteaux), les balustres (la latte debout, tous les 15 cm, de la lisse à la main courante).
 * Vu comme un meuble (k = ½), à la taille de ses pièces.
 */
export function railing(L = 56): Quad[] {
  const q: Quad[] = [];
  q.push(...battenPost(20).map((x) => x), ...box(L - 4, L, 0, 4, 0, 20, WOOD('poteau'), beamTex(17)));
  q.push(...box(4, L - 4, 1, 3, 18, 20, WOOD('main courante', 3), beamTex(19)));
  q.push(...box(4, L - 4, 1, 3, 2, 4, WOOD('lisse basse', 3), beamTex(23)));
  for (let x = 6; x <= L - 7; x += 3) q.push(...balusterQuads(x, 1.5, 4, 14));
  return q;
}

/**
 * La ferme de la salle, dans son plan (est-ouest ici : elle se montre de face ; dans la maison elle est nord-sud, vue par la
 * tranche) : l'entrait de 6,60 m, deux moitiés de 3,60 m entées au milieu (60 cm d'enture, deux chevilles), les deux arbalétriers
 * à 45° (tenon dans l'entrait et dans le poinçon), le poinçon debout de 3,40 m, une panne sur chaque arbalétrier (5 m, vers le
 * nord, jusqu'au refend ; `purlin` : la longueur montrée, px). Pièce de bâtiment : k = 1.
 */
export function truss(purlin = 100): Quad[] {
  const q: Quad[] = [], S = 4, Y = 100; // la ferme au sud des pannes (y de 100 à 104)
  const half = 66;
  // l'entrait : deux moitiés, le trait de l'enture (le joint en sifflet, en escalier) et ses chevilles
  const tie = (x0: number, x1: number, seed: number) => box(x0, x1, Y, Y + S, 0, S, WOOD('entrait'), (s, t, c) => {
    const X = Math.floor(x0 + s), j = Math.floor(t);
    if (c.face === 'S' && X > half - 7 && X < half + 6) {
      // l'enture à mi-bois : le joint debout à gauche en haut, à droite en bas, le joint couché entre les deux ; deux chevilles
      if ((j >= 2 && X === half - 6) || (j < 2 && X === half + 5) || (j === 2 && X > half - 6 && X <= half + 5)) return '@';
      if ((X === half - 3 || X === half + 2) && j === 1) return '&';
    }
    return beamTex(seed)(s, t, c);
  });
  q.push(...tie(0, half, 31), ...tie(half, 2 * half, 37));
  // le poinçon, au milieu
  q.push(...box(half - 2, half + 2, Y, Y + S, S, S + 68, WOOD('poinçon', 3), beamTex(41)));
  // les arbalétriers : du bout de l'entrait au poinçon, à 45°
  const e1: V3 = [0, 1, 0];
  for (const side of [-1, 1]) {
    const foot: V3 = [half + side * (half - 3), Y + S / 2, S + 2];
    const head: V3 = [half + side * 4, Y + S / 2, S + 2 + (half - 7)];
    const e2 = unit([-side, 0, 1]);
    q.push(...prism(foot, head, e1, e2, S, S, WOOD('arbalétrier', 2.5), beamTex(side > 0 ? 43 : 47)));
    // la panne, à mi-longueur de l'arbalétrier, posée sur son dos (une échantignolle la cale), vers le nord
    const m: V3 = [(foot[0] + head[0]) / 2 + (-side) * 2.4, 0, (foot[2] + head[2]) / 2 + 2.4];
    q.push(...box(m[0] - 2, m[0] + 2, Y - purlin, Y, m[2] - 2, m[2] + 2, WOOD('panne', 1), beamTex(side > 0 ? 53 : 59)));
  }
  return q;
}

/** La potence à poulie (1 m de poutre, 20 × 20) : la poulie de bois dans une mortaise du bout, la corde qui pend. Un objet : k = ½. */
export function hoistBeam(): Drawing {
  const q: Quad[] = [];
  const wood = beamTex(61);
  q.push(...box(0, 4, 0, 20, 0, 4, WOOD('potence'), (s, t, c) => {
    // la mortaise de la poulie, sur le dessus du bout sud : le réa (la roue) qui affleure, sa gorge sombre
    if (c.face === 'top' && s >= 1 && s < 3 && t >= 15 && t < 19) return t < 16 || t >= 18 ? '@' : s < 2 ? '%' : '&';
    // l'axe de la poulie, une cheville de fer sur les flancs
    if ((c.face === 'E' || c.face === 'W') && Math.floor(t) === 2 && Math.floor(c.face === 'W' ? s : c.w - s) === 17) return '_';
    return wood(s, t, c);
  }));
  // la corde passée sur la poulie : ses deux brins qui pendent du bout, au sud et dans la mortaise
  q.push(...box(1, 2, 19.5, 20.5, -1, 3, part('corde', 4, 'X', 'thin'), ropeTex));
  q.push(...box(2, 3, 17, 18, -1, 1, part('corde', 3.5, 'X', 'thin'), ropeTex));
  return { views: views(q, 0.5, 4), palette: PAL, source: model(4) };
}

// =====================================================================================================================
// Les baies : leurs matières prises aux volumes de coq-baies.ts
// =====================================================================================================================

/** La matière d'une face nommée (« vitrail », « volet », « fer », « porte ») des volumes d'une baie, et la taille de cette face. */
function bayTex(quads: Quad[], name: string): Tex {
  const q = quads.find((x) => x.part.name === name && x.face === 'S');
  if (!q) throw new Error(`coq-catalogue-bois : pas de face « ${name} » dans les volumes de la baie`);
  return q.tex;
}

/** Un jour de demi-croisée de 9 px de large (45 cm), son bas fermé de 18 px (90 cm), son haut vitré de 11 px (55 cm). */
const HALF = crossWindow({ x: 0, face: 10, z: 0, w: 9, h: 18 + 3 + 11, kind: 'half', low: 18, open: false });
const GLASS = bayTex(HALF, 'vitrail');
const SHUTTER = bayTex(HALF, 'volet');

/**
 * Un vitrail en losanges de `w` × `h` px, 3 cm d'épais : la face du dehors (R0), celle du dedans (R2, le jour derrière), la tranche
 * de plomb. Le vitrail de croisée (45 × 55 cm : 9 × 11) et l'imposte vitrée de la demi-croisée (105 × 45 cm : 21 × 9), le même
 * dessin : les losanges de `crossWindow` (coq-bays.ts) pour un jour de cette taille.
 */
export function leadedPane(w: number, h: number): Drawing {
  const glass = w === 9 && h === 11 ? GLASS : bayTex(crossWindow({ x: 0, face: 10, z: 0, w, h: 18 + 3 + h, kind: 'half', low: 18, open: false }), 'vitrail');
  const tex: Tex = (s, t, c) => {
    if (c.face === 'S') return glass(s, t, c);
    if (c.face === 'N') { const g = glass(c.w - s, t, c); return g === '>' ? '<' : g === '<' ? '!' : g; }
    return '`';
  };
  return { views: views(box(0, w, 0, 0.6, 0, h, part('vitrail', 2, '`', 'full'), tex), 0.5, 2), palette: PAL, source: model(2) };
}
/** Le vitrail en losanges de la croisée (45 × 3 × 55 cm). */
export const leadedGlass = (): Drawing => leadedPane(9, 11);

/** Le dos d'un volet ou d'une porte de planches : les planches debout, les deux barres clouées en travers. */
function battensBack(w: number, bars: number[]): Tex {
  return (s, t) => {
    const i = Math.floor(s), j = Math.floor(t);
    for (const b of bars) {
      if (j === b) return '^';
      if (j === b - 1) return i % 3 === 1 ? '@' : '%';
      if (j === b - 2) return '&';
    }
    if (i % 3 === 2 && i < w - 1) return '@';
    return i % 3 === 0 ? '^' : j < 2 ? '%' : '*';
  };
}

/** Le volet de croisée (45 × 3 × 90 cm), fermé : ses planches et ses pentures (R0, la face vue du dedans), ses barres au dos. */
function shutterQuads(): Quad[] {
  const tex: Tex = (s, t, c) => (c.face === 'S' ? SHUTTER(s, t, c) : c.face === 'N' ? battensBack(9, [4, 15])(s, t, c) : c.n[2] > 0.5 ? '^' : '%');
  return box(0, 9, 0, 0.6, 0, 18, WOOD('volet'), tex);
}
export function shutter(): Drawing {
  return { views: views(shutterQuads(), 0.5, 4), palette: PAL, source: model(4) };
}
/**
 * Le volet ouvert : la même pièce tournée d'un quart sur ses gonds, à l'ouest (le jeu fait de même : `plank-shutter-open` a
 * l'image du volet fermé, tournée) ; ses vues sont celles du volet fermé, décalées d'un quart : R0 ouvert = R1 fermé.
 */
export function shutterOpen(): Drawing {
  const v = shutter().views;
  return { state: 'open', label: 'OUVERT : TOURNE SUR SES GONDS, R0 = R1 FERME', views: { 0: v[1], 1: v[2], 2: v[3], 3: v[0] }, palette: PAL, source: model(4) };
}

/** Le barreau de fer (3 × 3 × 90 cm, scellé au plomb dans l'appui et la traverse) : 2 px de large (le plancher de lisibilité). */
export function windowBar(): Drawing {
  return { views: views(box(0, 2, 0, 1, 0, 18, IRON('barreau'), ironTex), 0.5, 1), palette: PAL, source: model(1) };
}

/** La face de la porte de chêne, telle que coq-baies.ts la dessine (22 × 44 px, le plein cintre). */
const DOOR_W = 22, DOOR_H = 44;
const DOOR_FACE = bayTex(archDoor({ x: 0, face: 10, w: DOOR_W, h: DOOR_H }), 'porte');
const DOOR_BAY: Bay = { s0: 0, s1: DOOR_W, t0: 0, t1: DOOR_H, arch: true };

/** Le dos de la porte (le dedans) : la seconde épaisseur, des planches en travers, les clous rivés, le loquet et le verrou. */
function doorBack(i: number, j: number): string {
  if (j === 21 && i >= 2 && i <= 5) return i === 2 ? '-' : '_'; // le verrou, du côté qui s'ouvre (l'est, à gauche vu du dedans)
  if (j === 20 && i === 4) return '_';
  if (j % 5 === 4) return '@';
  if (j % 8 === 2 && i % 4 === 2) return '@';
  if (j < 2) return '&';
  return j % 5 === 3 ? '^' : dash(5, j, i, 0.4) ? '%' : '*';
}

/**
 * La porte de chêne en arc (110 × 8 × 220 cm, pièce de bâtiment : k = 1) : une colonne d'un pixel par planche-pixel, de la
 * hauteur de l'arc, pour que son dessus suive le plein cintre ; la face de coq-baies.ts au sud, le dos au nord.
 */
function doorQuads(): Quad[] {
  const q: Quad[] = [], P = WOOD('porte');
  for (let i = 0; i < DOOR_W; i++) {
    let top = 0;
    while (top < DOOR_H && inBay(DOOR_BAY, i + 0.5, top + 0.5)) top++;
    q.push(...box(i, i + 1, 0, 1.6, 0, top, P, (s, t, c) => {
      if (c.face === 'S') return DOOR_FACE(i + Math.min(s, 0.99), t, c);
      if (c.face === 'N') return doorBack(DOOR_W - 1 - i, Math.floor(t));
      if (c.face === 'top') return '^';
      return c.n[0] > 0.5 ? '%' : '*';
    }));
  }
  return q;
}
export function archDoorPiece(): Drawing {
  return { views: views(doorQuads(), 1, 4), palette: PAL, source: model(4) };
}
/** La porte ouverte : tournée d'un quart sur ses gonds (à l'ouest), vers le dedans ; R0 ouverte = R1 fermée. */
export function archDoorOpen(): Drawing {
  const v = archDoorPiece().views;
  return { state: 'open', label: 'OUVERTE : TOURNEE SUR SES GONDS, R0 = R1 FERMEE', views: { 0: v[1], 1: v[2], 2: v[3], 3: v[0] }, palette: PAL, source: model(4) };
}

// =====================================================================================================================
// Les meubles : les modèles de coq-maison.ts, refaits à l'identique pour les tourner (voir l'en-tête)
// =====================================================================================================================

const F = (n: string, prio = 2) => part(n, prio, '&', 'full');
const quad = (o: V3, u: V3, v: V3, n: V3, p: ReturnType<typeof part>, tex: Tex, face: Quad['face'] = 'S'): Quad => ({ o, u, v, n, part: p, tex, face });

/** Le bois des meubles : le dessus clair, la face au jour, l'ombre à l'est (par la normale dans la vue), le fil. */
function furnWood(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') return dash(seed, j, i, 0.35) ? '*' : '^';
    if (c.n[0] > 0.5) return '%';
    return dash(seed, i, j, 0.3) ? '%' : '*';
  };
}
/** Un panneau (porte de dressoir, chevet) : cadre clair, panneau, l'ombre du cadre. */
function panelWood(): Tex {
  return (s, t, c) => {
    if (c.face === 'top') return '^';
    const i = Math.floor(s), j = Math.floor(t), h = Math.floor(c.h);
    if (i === 0 || j === h - 1) return '^';
    if (i === 1 || j === h - 2) return '%';
    return '*';
  };
}
/** Le dos d'un meuble : des planches debout jointives, sans façon. */
const backBoards: Tex = (s, t, c) => {
  const i = Math.floor(s);
  if (c.n[0] > 0.5 || c.n[0] < -0.5) return '%';
  return i % 4 === 3 ? '&' : dash(3, i, Math.floor(t), 0.4) ? '%' : '*';
};
/** Un drap (garance ou guède), plis verticaux, le haut éclairé. */
function cloth(kind: 'red' | 'blue', folds = 3): Tex {
  const R = kind === 'red' ? 'ρρστ' : 'αβγδ';
  return (s, t, c) => {
    if (c.face === 'top') return R[0];
    const f = Math.floor(s) % folds;
    return f === 0 ? R[3] : f === folds - 1 ? R[2] : t > c.h - 1.5 ? R[0] : R[1];
  };
}

/** Le lit à courtines (160 × 210 × 200 cm). */
function fourPosterQuads(): Quad[] {
  const Q: Quad[] = [], w = 32, d = 42, wood = furnWood(31);
  Q.push(...box(0, w, 0, d, 0, 8, F('bois de lit'), wood));
  Q.push(...box(1, w - 1, 2, d - 1, 8, 11, F('couverture', 1), { top: (s, t) => (Math.floor(t) < 6 ? 'a' : Math.floor(s) % 6 === 0 ? 'γ' : 'β'), side: () => 'γ' }));
  Q.push(...box(0, w, 0, 2, 8, 22, F('chevet', 3), panelWood()));
  for (const [x, y] of [[0, 0], [w - 2, 0], [0, d - 2], [w - 2, d - 2]]) Q.push(...box(x, x + 2, y, y + 2, 0, 40, F('colonne', 4), wood));
  Q.push(...box(-0.5, w + 0.5, -0.5, d + 0.5, 37, 40, F('ciel', 5), { top: (s) => (Math.floor(s) % 8 === 0 ? 'σ' : 'ρ'), side: (s, t) => (t < 1 ? 'τ' : Math.floor(s) % 3 === 0 ? 'τ' : 'σ') }));
  for (const x of [2, w - 6]) Q.push(...box(x, x + 4, d - 3, d - 1, 3, 37, F('courtine', 4.5), cloth('red', 2)));
  for (const x of [0.5, w - 2.5]) Q.push(...box(x, x + 2, 2, d - 4, 6, 37, F('courtine', 4.2), cloth('red', 3)));
  return Q;
}
/** Le dressoir (100 × 45 × 180 cm) ; le dos en planches (R2), les étains seulement sur la face. */
function dresserQuads(): Quad[] {
  const Q: Quad[] = [], w = 20, wood = furnWood(41);
  Q.push(...box(0, w, 0, 9, 0, 18, F('bas'), { top: () => '^', side: (s, t, c) => (c.face === 'S' ? (Math.floor(s) === 10 ? '@' : panelWood()(s % 10, t, { ...c, w: 10 })) : c.face === 'N' ? backBoards(s, t, c) : '%') }));
  Q.push(...box(0, w, 0, 2, 18, 36, F('dosseret', 1), {
    top: () => '^',
    side: (s, t, c) => {
      if (c.face === 'N') return backBoards(s, t, c);
      if (c.face !== 'S') return '%';
      for (const [cx, cz] of [[4, 22.5], [10, 22.5], [16, 22.5], [5, 31.5], [12, 31.5]]) {
        const dd = Math.hypot(s - cx, t + 18 - cz);
        if (dd < 3) return dd > 2.2 ? 'z' : s - cx < -0.5 && t + 18 - cz > 0.5 ? '!' : 'R';
      }
      if (Math.abs(s - 17) < 1.5 && t + 18 > 28 && t + 18 < 34) return s < 17 ? '!' : 'r';
      return '%';
    },
  }));
  for (const z of [26, 35]) Q.push(...box(0, w, 0, 5, z, z + 1, F('tablette', 3), wood));
  Q.push(...box(-0.5, w + 0.5, 0, 6, 36, 37.5, F('corniche', 3), wood));
  return Q;
}
/** La chaise à haut dossier, telle que la maison la pose (tournée vers l'est : le dossier à l'ouest). */
function highChairQuads(): Quad[] {
  const Q: Quad[] = [], wood = furnWood(51);
  for (const [x, y] of [[0, 0], [9, 0], [0, 8], [9, 8]]) Q.push(...box(x, x + 2, y, y + 2, 0, 9, F('pied'), wood));
  Q.push(...box(0, 11, 0, 10, 8, 9.5, F('siège', 2), wood));
  Q.push(...box(1, 10, 1, 9, 9.5, 10.5, F('coussin', 3), { top: () => 'ρ', side: () => 'σ' }));
  Q.push(...box(0, 2, 0, 10, 9, 26, F('dossier', 4), { top: () => '^', side: (s, t, c) => (c.face === 'S' ? (t > 15 ? '^' : '*') : c.face === 'W' ? backBoards(s, t, c) : panelWood()(s, t, c)) }));
  for (const y of [0, 8]) Q.push(...box(0, 11, y, y + 2, 14, 15, F('accoudoir', 4), wood));
  return Q;
}
/** Le pétrin (150 × 60 × 80 cm). */
function kneadingTroughQuads(): Quad[] {
  const Q: Quad[] = [], wood = furnWood(61);
  for (const x of [1, 26]) Q.push(...box(x, x + 3, 1, 11, 0, 8, F('pied'), wood));
  Q.push(...box(0, 30, 0, 12, 8, 15, F('huche', 2), { top: () => '^', side: (s, t, c) => (c.face === 'S' || c.face === 'N' ? (Math.floor(s) % 10 === 0 ? '@' : t > 6 ? '^' : '*') : '%') }));
  Q.push(...box(-0.5, 30.5, -0.5, 12.5, 15, 16, F('couvercle', 3), { top: (_s, t) => (Math.floor(t) % 4 === 3 ? '%' : '^'), side: () => '%' }));
  return Q;
}
/** L'écritoire (90 × 60 × 75 cm). */
function writingDeskQuads(): Quad[] {
  const Q: Quad[] = [], wood = furnWood(71);
  for (const x of [0, 16]) Q.push(...box(x, x + 2, 0, 12, 0, 14, F('pied'), wood));
  Q.push(...box(0, 18, 0, 12, 14, 15, F('plateau', 2), wood));
  Q.push(...polyPrism(1, 11, [[2, 15], [2, 18], [11, 15]], F('pupitre', 3), (s, t, c) => (c.n[2] > 0.5 ? (hash(2, Math.floor(s), Math.floor(t)) < 0.15 ? '*' : '^') : '%')));
  Q.push(quad([3, 6, 16.6], [6, 0, 0], [0, -3, 1.5], unit([0, 1, 2]), F('feuille', 4), () => 'a', 'slope'));
  const book = (x: number, y: number, z: number, w: number, d: number, h: number, c: string, sd: string) => Q.push(...box(x, x + w, y, y + d, z, z + h, F('livre', 4), { top: () => 'a', side: (s) => (s < 0.8 ? c : sd) }));
  book(12, 2, 15, 5, 4, 2, 'σ', 'τ'); book(12.5, 2.5, 17, 4, 3, 1.5, 'm', 'N'); book(12, 7, 15, 5, 4, 1.5, 'β', 'γ');
  return Q;
}
/** La table de la tailleuse (140 × 70 × 75 cm). */
function tailorTableQuads(): Quad[] {
  const Q: Quad[] = [], wood = furnWood(81);
  for (const x of [0, 26]) for (const y of [0, 12]) Q.push(...box(x, x + 2, y, y + 2, 0, 14, F('pied'), wood));
  Q.push(...box(0, 28, 0, 14, 14, 15, F('plateau', 2), wood));
  const bolt = (x: number, y: number, w: number, d: number, h: number, R: string) => Q.push(...box(x, x + w, y, y + d, 15, 15 + h, F('coupon', 3), { top: (s) => (Math.floor(s) % 4 === 0 ? R[1] : R[0]), side: (_s, t) => (Math.floor(t * 2) % 2 ? R[1] : R[2]) }));
  bolt(2, 2, 9, 6, 2, 'ρστ'); bolt(13, 1, 8, 5, 1.5, 'αβγ'); bolt(3, 8, 7, 5, 1, 'adD');
  Q.push(...box(22, 26, 9, 12, 15, 15.4, F('ciseaux', 4), () => 'Z'));
  for (let k = 0; k < 10; k++) {
    const a0 = (k / 10) * Math.PI * 2, a1 = ((k + 1) / 10) * Math.PI * 2;
    const p0: V3 = [24 + 2.5 * Math.cos(a0), 4 + 2.5 * Math.sin(a0), 15], p1: V3 = [24 + 2.5 * Math.cos(a1), 4 + 2.5 * Math.sin(a1), 15];
    Q.push(quad(p0, sub(p1, p0), [0, 0, 3], [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0], F('panier', 3), (_s, t) => (Math.floor(t) % 2 ? 'O' : 'C')));
  }
  Q.push(...box(21.5, 26.5, 1.5, 6.5, 17.5, 18, F('ouvrage', 2.9), () => 'J'));
  return Q;
}

/** Les modèles des meubles, dans leur sens du catalogue (R0 : la face au sud). La chaise : tournée pour regarder le sud. */
export const FURNITURE_MODELS: Record<string, () => Quad[]> = {
  'canopy-bed': fourPosterQuads,
  dresser: dresserQuads,
  'high-chair': () => rotQuads(highChairQuads(), 3, [0, 0]),
  'kneading-trough': kneadingTroughQuads,
  'writing-desk': writingDeskQuads,
  'tailor-table': tailorTableQuads,
};
/** La vue du sud validée (coq-maison.ts) de chaque meuble, et la vue du catalogue à laquelle elle répond (la chaise : R3). */
export const FURNITURE_VALIDATED: Record<string, { fn: string; view: 0 | 1 | 2 | 3 }> = {
  'canopy-bed': { fn: 'fourPoster', view: 0 },
  dresser: { fn: 'dresser', view: 0 },
  'high-chair': { fn: 'highChair', view: 3 },
  'kneading-trough': { fn: 'kneadingTrough', view: 0 },
  'writing-desk': { fn: 'writingDesk', view: 0 },
  'tailor-table': { fn: 'tailorTable', view: 0 },
};
export function furniturePiece(key: string): Drawing {
  return { views: views(FURNITURE_MODELS[key](), 0.5, 4), palette: PAL, source: model(4) };
}

/** Le coupon d'étoffe plié (40 × 30 × 10 cm) : les plis du drap sur la face, la lisière dessus ; trois étoffes. */
export function clothBolt(kind: 'red' | 'blue' | 'linen'): Drawing {
  const R = kind === 'red' ? 'ρστ' : kind === 'blue' ? 'αβγ' : 'adD';
  const tex: Tex = (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t * 2);
    if (c.face === 'top') return i % 4 === 3 ? R[1] : R[0];
    if (c.n[0] > 0.5) return R[2];
    return j % 2 ? R[1] : (i === 0 ? R[0] : R[2]);
  };
  const dark = kind === 'red' ? 'τ' : kind === 'blue' ? 'δ' : 'E';
  const names = { red: 'DRAP ROUGE (GARANCE)', blue: 'LAINE BLEUE (GUEDE)', linen: 'LIN ECRU' };
  return { state: kind === 'red' ? undefined : kind, label: names[kind], views: views(box(0, 8, 0, 6, 0, 2, part('coupon', 2, dark, 'full'), tex), 0.5, 2), palette: PAL, source: model(2) };
}

/** Les étains (30 × 30 × 25 cm, une vue : rond) : le pichet couvert, son anse, debout sur le plat. */
export function pewter(): Drawing {
  const g: Grid = [
    '..ZZ..',
    '.Z!Rro',
    '.Z!rz.',
    '.Z!rzZ',
    '.Z!rzo',
    'ZZ!rzo',
    'Z!RRro',
    '.oooo.',
    '.xxxxx',
  ];
  return { views: { 0: g }, palette: PAL, source: { 0: 'model' } };
}

// =====================================================================================================================
// Le lit défait (un état du lit du jeu, `bed`) : ses quatre vues, avec les signes et la palette du lit du jeu
// =====================================================================================================================

const BED = interiorFurniture.find((s) => s.name === 'bed');
if (!BED || BED.kind !== 'image') throw new Error('coq-catalogue-bois : le lit du jeu (bed) est introuvable');
/** Le lit du jeu (la vue du sud, la seule qu'il ait) et sa palette. */
export const GAME_BED = { grid: BED.grid, palette: BED.palette };

/**
 * Le lit défait (150 × 200 × 80 cm), du fainéant : le même bois de lit (montants M m N K, chevet au nord, pied au sud), le drap
 * froissé, l'oreiller de travers, la couverture rejetée en tas vers le pied et qui pend du côté est.
 */
function unmadeBedQuads(): Quad[] {
  const Q: Quad[] = [], w = 30, d = 40;
  const frame: Tex = (_s, t, c) => (c.n[2] > 0.5 ? 'M' : c.n[0] > 0.5 ? 'N' : c.n[0] < -0.5 ? 'M' : Math.floor(t) % 4 === 3 ? 'N' : 'm');
  const P = (n: string, prio = 2) => part(n, prio, 'K', 'full');
  for (const [x, y] of [[0, 0], [w - 3, 0], [0, d - 3], [w - 3, d - 3]]) Q.push(...box(x, x + 3, y, y + 3, 0, y ? 9 : 16, P('montant', 4), frame));
  Q.push(...box(0, w, 0, 2, 4, 15, P('chevet', 3), frame));
  Q.push(...box(0, w, d - 2, d, 4, 8, P('pied', 3), frame));
  for (const x of [0, w - 2]) Q.push(...box(x, x + 2, 2, d - 2, 4, 7, P('pan'), frame));
  // le matelas et le drap froissé : les plis en grappes (D, E)
  Q.push(...box(2, w - 2, 2, d - 2, 7, 9, P('drap', 1), (s, t, c) => {
    if (c.n[2] < 0.5) return 'D';
    const i = Math.floor(s), j = Math.floor(t), r = hash(11, i >> 1, j >> 1);
    return r < 0.12 ? 'E' : r < 0.3 ? 'D' : 'd';
  }));
  // l'oreiller de travers, poussé vers l'ouest
  Q.push(...box(3, 12, 3, 7, 9, 10.5, P('oreiller', 3), (s, _t, c) => (c.n[2] > 0.5 ? (Math.floor(s) === 0 ? 'D' : 'a') : 'D')));
  // la couverture rejetée : un tas en trois bourrelets vers le pied, une pointe qui pend du côté est jusqu'au sol
  const blanket: Tex = (s, t, c) => {
    if (c.n[2] > 0.5) return hash(7, Math.floor(s / 2), Math.floor(t)) < 0.3 ? 'G' : 'B';
    return c.n[0] > 0.5 ? 'G' : Math.floor(s) % 5 === 0 ? 'G' : 'B';
  };
  Q.push(...box(4, w - 1, 24, 30, 9, 11, P('couverture', 4), blanket));
  Q.push(...box(6, w - 4, 29, 35, 9, 12, P('couverture', 4.2), blanket));
  Q.push(...box(10, w - 2, 33, 37, 9, 10.5, P('couverture', 4.4), blanket));
  Q.push(...box(w - 1, w + 0.6, 18, 34, 1, 9.5, P('couverture qui pend', 4.6), blanket));
  return Q;
}
export function unmadeBed(): Drawing {
  return { state: 'unmade', label: 'DEFAIT', views: views(unmadeBedQuads(), 0.5, 4), palette: { ...world, ...BED!.palette }, source: model(4) };
}

// =====================================================================================================================
// Les tentures
// =====================================================================================================================

/** Un cran plus sombre dans les rampes de laine (l'envers, qui n'a pas pris le jour : le dessin passe par ses fils). */
const WOOL_DARKER: Record<string, string> = {
  j: 'L', L: 'l', l: 'k', k: 'k', 'α': 'β', 'β': 'γ', 'γ': 'δ', 'δ': 'δ', D: 'E', E: 'm', m: 'N', N: 'N', 'ρ': 'σ', 'σ': 'τ', 'τ': 'τ', b: 'C', _: '_',
};

/** La verdure au coq, redessinée (48 × 32) : des feuilles en lobes et en pointes, le coq sur une réserve claire. */
export function verdure(seed = 7): Grid {
  const W = 48, H = 32, B = 3;
  const GREEN = ['j', 'L', 'l', 'k'], BLUE = ['α', 'β', 'γ', 'δ'], BROWN = ['D', 'E', 'm', 'N'];
  const out: string[][] = Array.from({ length: H }, () => Array(W).fill('δ'));
  for (let j = B; j < H - B; j++) for (let i = B; i < W - B; i++) out[j][i] = j < 12 ? 'δ' : hash(seed, i >> 2, j >> 2) < 0.5 ? 'k' : 'δ';
  // les feuilles : un ovale allongé, découpé en lobes profonds (la feuille de chêne, d'acanthe), une pointe au bout
  for (let n = 0; n < 46; n++) {
    const r = (k: number) => hash(seed, n, k);
    const x = B + 2 + r(1) * (W - 2 * B - 4), y = B + 2 + r(2) * (H - 2 * B - 4);
    if (Math.abs(x - 24) < 9 && Math.abs(y - 18) < 8) continue;
    const ramp = r(3) < 0.5 ? GREEN : r(3) < 0.8 ? BLUE : BROWN;
    const a = 3.5 + r(4) * 3.5, b = 1.8 + r(5) * 1.4, ang = (r(6) - 0.5) * 2.4 + (x < 24 ? -0.6 : 0.6), lobes = 2 + Math.floor(r(7) * 2);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let j = Math.floor(y - a - 1); j <= y + a + 1; j++) for (let i = Math.floor(x - a - 1); i <= x + a + 1; i++) {
      if (i < B || j < B || i >= W - B || j >= H - B) continue;
      const dx = i + 0.5 - x, dy = j + 0.5 - y;
      const u = dx * ca + dy * sa, v = -dx * sa + dy * ca, al = u / a;
      if (al < -1 || al > 1) continue;
      // le contour : large au milieu, pointu au bout (al = 1), les lobes en creux francs (une onde redressée, pas un cosinus doux)
      const env = Math.sqrt(1 - al * al) * (al > 0 ? 1 - al * 0.55 : 1);
      const lobe = Math.abs(Math.sin((al + 1) * Math.PI * lobes));
      const half = b * env * (0.35 + 0.75 * lobe);
      if (Math.abs(v) > half) continue;
      const lit = (v > 0) === (sa * 0.6 - ca * 0.8 > 0);
      let k = Math.abs(v) < 0.5 && al > -0.9 && al < 0.8 ? 2 : lit ? 0 : 1;
      if (!lit && Math.abs(v) > half - 0.8) k = 2;
      out[j][i] = ramp[k];
    }
  }
  // la réserve du coq : un médaillon de fond plus clair (le vert-bleu au jour), qui le détache des feuilles
  for (let j = 10; j < 29; j++) for (let i = 14; i < 34; i++) {
    const e = ((i + 0.5 - 24) / 10) ** 2 + ((j + 0.5 - 19.5) / 9.5) ** 2;
    if (e < 1) out[j][i] = e > 0.86 ? 'b' : 'l';
  }
  // la motte
  for (let i = 18; i < 30; i++) for (let j = 25; j < 28; j++) {
    const top = 25 + Math.floor(Math.abs(i - 24) / 4);
    if (j >= top) out[j][i] = j === top ? 'j' : 'L';
  }
  // le coq (14 × 13, tourné vers l'ouest), cerné de laine sombre d'un pixel plein
  const COQ: Grid = [
    '...ρρ.........',
    '..ρρρρ........',
    '..DDmD....γβ..',
    '.bD_mD...γββγ.',
    'bbDDmm..γβ.αβ.',
    '..σDmm..βα..β.',
    '..σDDmmmβγ..γ.',
    '...DDDmmmγ....',
    '...EDDDmmm....',
    '....EmmmmN....',
    '......b..b....',
    '......b..b....',
    '.....bb.bb....',
  ];
  const at = (i: number, j: number) => (COQ[j]?.[i] ?? '.') !== '.';
  for (let j = -1; j <= COQ.length; j++) for (let i = -1; i <= COQ[0].length; i++) {
    const X = 17 + i, Y = 12 + j;
    if (at(i, j)) { out[Y][X] = COQ[j][i]; continue; }
    if (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1)) out[Y][X] = 'K';
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const e = Math.min(i, j, W - 1 - i, H - 1 - j);
    if (e >= B) continue;
    out[j][i] = e === B - 1 ? 'E' : 'N';
    if (e === 1 && (i + j) % 6 === 0) out[j][i] = 'b';
  }
  for (let i = 0; i < W; i++) { out[0][i] = 'K'; out[H - 1][i] = 'o'; }
  for (let j = 0; j < H; j++) { out[j][0] = 'K'; out[j][W - 1] = 'o'; }
  return out.map((r) => r.join(''));
}

/**
 * Une tenture pendue, comme pièce (5 cm d'épais, k = ½) : sa face (R0), son envers (R2 : le dessin à l'envers, un cran plus
 * sombre, les fils qui flottent derrière en tirets clairs ; la gaine des anneaux en haut), sa tranche (R1, R3 : un pixel de laine
 * sombre, son dessus raccourci).
 */
function hanging(face: Grid, seed: number): Drawing {
  const w = face[0].length, h = face.length;
  const tex: Tex = (s, t, c: Ctx) => {
    const i = Math.floor(s), j = h - 1 - Math.floor(t);
    if (c.face === 'S') return face[j]?.[i] ?? null;
    if (c.face === 'N') {
      const k = face[j]?.[w - 1 - i];
      if (!k || k === '.') return null;
      if (j <= 1) return j === 0 ? 'E' : 'D'; // la gaine cousue des anneaux
      if (i === 0 || j === h - 1) return 'o';
      if (i === w - 1) return 'K';
      if (j % 3 === 1 && dash(seed, j, i, 0.35)) return 'D'; // les fils qui flottent
      return WOOL_DARKER[k] ?? k;
    }
    return c.n[2] > 0.5 ? 'K' : 'N';
  };
  return { views: views(box(0, w, 0, 1, 0, h, part('tenture', 2, 'K', 'none'), tex), 0.5, 4), palette: PAL, source: model(4) };
}
export const verdurePiece = () => hanging(verdure(), 3);
export const wallHanging = () => hanging(tentureGrid(), 5);

/** La tringle de fer (2,60 m), ses deux pattes scellées dans le mur (6 cm de saillie). */
export function hangingRod(): Drawing {
  const q = [...box(0, 52, 0.4, 1.2, 0.6, 1.6, IRON('tringle'), ironTex)];
  for (const x of [0, 51]) q.push(...box(x, x + 1, 0, 1.2, 0, 1.6, IRON('patte', 3.5), ironTex));
  return { views: views(q, 0.5, 2), palette: PAL, source: model(2) };
}

// =====================================================================================================================
// Le catalogue : les dessins de chaque pièce, par clé (celles de coq-catalogue-data.ts)
// =====================================================================================================================

export const DRAWINGS: Record<string, () => Drawing[]> = {
  'wood-piece:normal:beam-560': () => [gameBeam(560)],
  'wood-piece:normal:beam-wallplate': () => [gameBeam(480)],
  'wood-piece:normal:beam-120': () => [gameBeam(120)],
  'wood-piece:normal:beam-purlin': () => [gameBeam(500)],
  'wood-piece:normal:beam-tie': () => [gameBeam(360)],
  'wood-piece:normal:beam-principal': () => [principal()],
  'wood-piece:normal:beam-kingpost': () => [{ views: { 0: gameWood('normal', 'beam', 340, 'up') }, palette: WOOD_PAL, source: { 0: 'game' }, label: 'DEBOUT : LE POTEAU DU JEU (R1 = R0)' }],
  'wood-piece:normal:beam-plate': () => [gameBeam(560)],
  'wood-piece:normal:rafter': () => [rafter()],
  'wood-piece:pole:lath': () => [{ views: { 0: gameWood('pole', 'lath', 400, 'ew'), 1: gameWood('pole', 'lath', 400, 'ns') }, palette: WOOD_PAL, source: { 0: 'game', 1: 'game' } }],
  'hoist-beam': () => [hoistBeam()],
  'wood-piece:normal:post': () => [{ views: views(battenPost(20), 0.5, 1), palette: PAL, source: { 0: 'model' }, label: 'CARRE : R1 = R0' }],
  'wood-piece:normal:rail': () => [lyingBatten(56, 19)],
  'wood-piece:pole:lath-baluster': () => [{ views: views(balusterQuads(0, 0, 0, 16), 0.5, 2), palette: PAL, source: model(2) }],
  'leaded-glass': () => [leadedGlass()],
  'casement-shutter': () => [shutter(), shutterOpen()],
  'window-bar': () => [windowBar()],
  'oak-arch-door': () => [archDoorPiece(), archDoorOpen()],
  'wood-piece:normal:beam-inner-lintel': () => [gameBeam(130)],
  'wood-piece:normal:beam-mantel': () => [gameBeam(260)],
  'canopy-bed': () => [furniturePiece('canopy-bed')],
  dresser: () => [furniturePiece('dresser')],
  'high-chair': () => [furniturePiece('high-chair')],
  'kneading-trough': () => [furniturePiece('kneading-trough')],
  'writing-desk': () => [furniturePiece('writing-desk')],
  'tailor-table': () => [furniturePiece('tailor-table')],
  'cloth-bolt': () => [clothBolt('red'), clothBolt('blue'), clothBolt('linen')],
  pewter: () => [pewter()],
  'bed:unmade': () => [unmadeBed()],
  'verdure-tapestry': () => [verdurePiece()],
  'wall-hanging': () => [wallHanging()],
  'hanging-rod': () => [hangingRod()],
};
