// Icônes d'objets 16×16 : les ressources que Xéros ramasse (inventaire, objet tombé au sol).
// Pas d'ombre portée : le jeu l'ajoute quand l'objet est posé.
// Contour d'un pixel : teinte la plus sombre de la matière en haut et à gauche, OUTLINE en bas et à droite.

import { Canvas, EMPTY } from '../lib/canvas';
import { ball, capsule, darkest, outline } from './lib';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

const S = 16;

const palette = {
  ...world,
  // minerai de fer : rouille et reflets, dérivés de la pierre (z Z) et des braises (i)
  '1': '#a65a34', // rouille claire (i assombri, tiré vers la terre)
  '2': '#7a4430', // rouille sombre (vers le brun-violet des ombres)
  '3': '#c9c8bc', // reflet métallique (R éclairci, un peu froid)
  '4': '#47423b', // roche du minerai, ombre profonde (Z assombri)
  '5': '#7f8386', // fer à nu (z refroidi)
  // rouge des baies et de la pomme, dérivé des fleurs (c) et des braises (i)
  '6': '#d27a52', // rouge éclairé (c tiré vers le jaune)
  '7': '#a8453a', // rouge franc
  '8': '#74303a', // rouge d'ombre (vers le brun-violet)
};

// ---------- Bûche ----------

/** Bûche couchée en diagonale, bout scié tourné vers le spectateur (en bas à gauche). */
function log(): Canvas {
  const c = new Canvas(S, S);
  // écorce : bande claire en haut, sombre en bas
  capsule(c, 4.8, 10.4, 11.2, 4.9, 3.6, (_, a) => (a < -0.4 ? 'm' : a < 0.4 ? 'N' : 'K'));
  // stries d'écorce le long de l'axe
  c.within('mN', (c) => c.line(8, 5, 10, 3, 'N').line(10, 7, 12, 5, 'K'));
  // bout scié : cerne d'écorce, bois clair, cernes
  c.ellipse(4.8, 10.4, 3.5, 3.6, 'N');
  c.ellipse(4.8, 10.4, 2.7, 2.8, 'U');
  c.within('U', (c) => {
    c.polygon([[7.5, 9], [7.5, 14], [3, 14]], 'u');
    c.set(4, 10, 'n').set(5, 10, 'n').set(5, 11, 'n');
    c.set(3, 9, 'd').set(4, 8, 'd').set(3, 10, 'd');
  });
  return outline(c, 'K');
}

// ---------- Branche ----------

/** Branche sèche : une tige en diagonale, deux rameaux, sans feuille. */
function branch(): Canvas {
  const c = new Canvas(S, S);
  // rameau gauche (vers le haut) et rameau droit (vers le bas), sous la tige
  capsule(c, 6.5, 9.0, 4.2, 3.4, 0.8, (_, a) => (a < 0 ? 'M' : 'm'));
  capsule(c, 4.2, 3.4, 2.6, 1.9, 0.6, () => 'm');
  capsule(c, 9.6, 6.2, 13.2, 10.8, 0.8, (_, a) => (a < 0 ? 'm' : 'N'));
  // tige
  capsule(c, 2.4, 13.4, 13.6, 2.4, 1.3, (_, a) => (a < -0.15 ? 'M' : a < 0.5 ? 'm' : 'N'));
  // bout cassé (bois clair) et nœud
  c.set(13, 2, 'U').set(12, 2, 'M');
  c.within('m', (c) => c.set(7, 8, 'N').set(8, 8, 'N'));
  return outline(c, 'N');
}

// ---------- Pierre ----------

/** Caillou à facettes : dessus clair, flanc gauche moyen, face sud et flanc droit sombres. */
function stone(): Canvas {
  const c = Canvas.from([
    '................',
    '................',
    '.....RRRRRR.....',
    '....RRRRRRRRR...',
    '...rRRRRRRRRRR..',
    '..rrrRRRRRRRRzz.',
    '..rrrrRRRRRRzzz.',
    '.rrrrrrRRRRzzzz.',
    '.rrrrrrrrRzzzzz.',
    '.zzrrrrrrrzzzzZ.',
    '.zzzzzzzzzzzzZZ.',
    '.zzzZZzzzzzzZZZ.',
    '..zzzzZZzzzZZZ..',
    '...ZZZZZZZZZZ...',
    '................',
    '................',
  ]);
  return outline(c, 'Z');
}

// ---------- Minerai de fer ----------

/**
 * Bloc de roche sombre et anguleux, veiné de rouille, avec des éclats de fer.
 * Dessiné avec les lettres de la pierre, puis assombri d'un cran (la roche ferreuse est plus noire).
 */
function ironOre(): Canvas {
  const c = Canvas.from([
    '................',
    '......rr........',
    '.....rRRr...r...',
    '....rRRRrr.rRr..',
    '...rRRR1rrrRRrz.',
    '..rrRR12rrrRrzz.',
    '..rrR12rr35rzzZ.',
    '.zrr12rrr55zzzZ.',
    '.zzr12rrrrzzZ1Z.',
    '.zzz12zzzzzZ12Z.',
    '.ZzzzzzzZZZ12ZZ.',
    '.ZZz35zZZZZ12ZZ.',
    '..ZZ55ZZZZZ12Z..',
    '...ZZZZZZZZZZ...',
    '................',
    '................',
  ]);
  c.recolor({ Z: '4', z: 'Z', r: 'z', R: 'r' });
  return outline(c, '4');
}

// ---------- Paille ----------

/** Poignée de paille couchée en diagonale, serrée au milieu par un lien, brins en éventail aux deux bouts. */
function straw(): Canvas {
  const c = new Canvas(S, S);
  // fuseau pincé au milieu (axe bas-gauche -> haut-droit), bouts déchiquetés
  c.polygon([[0.6, 9.8], [5.8, 7.6], [7.6, 5.8], [9.8, 0.6], [15.4, 6.2], [10.2, 8.8], [8.8, 10.2], [6.2, 15.4]], 't');
  // brins : traits le long de l'axe, clairs côté lumière, sombres côté ombre
  c.within('t', (c) => {
    c.line(1, 10, 10, 1, 'Y').line(3, 10, 6, 7, 'Y').line(10, 4, 12, 2, 'Y');
    c.line(5, 12, 12, 5, 'T').line(4, 14, 7, 11, 'P').line(10, 9, 14, 5, 'P').line(5, 15, 15, 5, 'P');
  });
  // bouts en brosse : un brin sur deux s'arrête un pixel plus tôt
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (Math.abs(x - y) >= 8 && (x + y) % 2 === 0 && Math.abs(x - y) + (x + y) % 4 >= 9) c.px[y][x] = EMPTY;
  }
  // lien de paille tordue
  c.line(5, 9, 9, 5, 'n').line(6, 10, 10, 6, 'e').set(5, 8, 'u').set(6, 7, 'u').set(7, 6, 'u');
  return outline(c, 'P');
}

// ---------- Blé ----------

/** Gerbe de blé debout : couronne d'épis serrés, lien, pied de tiges évasé (sablier). */
function wheat(): Canvas {
  const c = new Canvas(S, S);
  // pied évasé, sous le lien, presque aussi large que la couronne
  c.polygon([[6.2, 8.6], [9.8, 8.6], [13.4, 14.4], [2.6, 14.4]], 'T');
  c.within('T', (c) => {
    c.line(6, 10, 4, 13, 't').line(7, 10, 6, 14, 't').line(8, 10, 9, 14, 't').line(5, 12, 4, 14, 'Y');
    c.line(10, 11, 12, 13, 'P').line(9, 10, 10, 12, 'P');
  });
  // tiges entre la couronne et le lien
  c.polygon([[3, 6], [13, 6], [9.8, 9], [6.2, 9]], 'P');
  // épis serrés : [x, y] de la pointe, direction vers le lien ; ceux du centre en dernier (devant)
  const ears: [number, number][] = [[1.6, 5.4], [14.4, 5.8], [3.8, 2.6], [12.0, 2.6], [6.2, 1.2], [9.4, 1.0]];
  for (const [x0, y0] of ears) {
    const dx = 7.8 - x0, dy = 9.5 - y0, l = Math.hypot(dx, dy);
    capsule(c, x0, y0, x0 + (dx / l) * 4.4, y0 + (dy / l) * 4.4, 1.2, (t, a) => {
      const grain = Math.floor(t * 5) % 2 === 0;
      if (a < 0) return grain ? 'Y' : 'b';
      return grain ? 't' : 'T';
    });
  }
  // lien
  c.rect(6, 8, 4, 2, 'n').rect(6, 8, 4, 1, 'u').set(9, 9, 'e');
  return outline(c, 'P');
}

// ---------- Graines ----------

/** Petit sac de toile ouvert, col rabattu, graines bombées dans l'ouverture ; deux graines tombées devant. */
function seeds(): Canvas {
  const c = new Canvas(S, S);
  // panse
  ball(c, 7.6, 10.2, 6.4, 4.6, ['d', 'D', 'E']);
  // col rabattu
  c.ellipse(7.6, 6.0, 6.6, 2.8, 'E');
  c.ellipse(7.6, 5.5, 6.4, 2.6, 'D');
  c.ellipse(7.2, 5.1, 6.0, 2.2, 'd');
  // graines dans l'ouverture
  c.ellipse(7.8, 5.0, 4.6, 1.9, 'T');
  c.ellipse(7.2, 4.4, 3.6, 1.6, 't');
  // grains : tramage de texture (pas de volume), clair en haut à gauche
  c.within('tT', (c) => {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if ((x + 2 * y) % 4 !== 0) continue;
      c.set(x, y, c.get(x, y) === 't' ? 'Y' : 'P');
    }
  });
  // pli de la toile sous le col
  c.line(4, 9, 5, 12, 'D').line(10, 9, 10, 12, 'E');
  // graines tombées
  c.set(13, 14, 't').set(14, 14, 'T');
  return outline(c, darkest({ t: 'P', T: 'P', Y: 'P' }, 'E'));
}

// ---------- Baies ----------

/** Grappe de baies rouges sous deux feuilles. */
function berries(): Canvas {
  const c = new Canvas(S, S);
  // feuilles
  capsule(c, 7.6, 4.4, 2.4, 2.4, 1.5, (_, a) => (a < -0.2 ? 'j' : 'L'));
  capsule(c, 8.4, 4.4, 13.0, 3.0, 1.3, (_, a) => (a < 0 ? 'L' : 'l'));
  c.line(4, 3, 6, 4, 'l');
  // baies, de l'arrière vers l'avant
  const bs: [number, number][] = [[5.8, 7.0], [10.2, 6.8], [3.6, 10.0], [8.0, 9.4], [12.2, 10.2], [5.8, 12.8], [10.0, 13.0]];
  bs.forEach(([x, y], i) => {
    // chaque baie cernée de sa teinte d'ombre, pour qu'on les compte
    c.ellipse(x, y, 2.5, 2.5, '8');
    c.ellipse(x - 0.4, y - 0.4, 1.8, 1.8, '7');
    c.set(Math.floor(x) - 1, Math.floor(y) - 1, '6').set(Math.floor(x), Math.floor(y) - 1, '6');
    if (i === 3 || i === 5 || i === 1) c.set(Math.floor(x) - 1, Math.floor(y) - 1, 'a');
  });
  return outline(c, darkest({ j: 'k', L: 'k', l: 'k' }, '8'));
}

// ---------- Champignon ----------

/** Cèpe : chapeau brun bombé un peu penché, pied ventru clair. */
function mushroom(): Canvas {
  const c = new Canvas(S, S);
  // pied ventru
  ball(c, 7.8, 11.4, 3.6, 3.6, ['a', 'd', 'D']);
  c.rect(6, 7, 4, 4, 'd').rect(6, 7, 1, 4, 'a').rect(9, 7, 1, 4, 'D');
  // dessous du chapeau (ombre portée sur le pied)
  c.ellipse(8, 7.4, 6, 1.6, 'E');
  // chapeau
  ball(c, 7.6, 5.6, 7.0, 4.4, ['M', 'm', 'N']);
  c.within('M', (c) => c.set(3, 4, 'U').set(4, 3, 'U').set(5, 3, 'U'));
  // bord inférieur du chapeau
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (y >= 9 && 'MmN'.includes(c.get(x, y))) c.set(x, y, EMPTY);
  }
  return outline(c, darkest({ M: 'K', m: 'K', N: 'K', U: 'K' }, 'E'));
}

// ---------- Œuf ----------

/** Œuf brun clair, posé un peu de biais, pointe en haut ; quelques taches. */
function egg(): Canvas {
  const c = new Canvas(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const cx = 7.8, cy = 8.6;
    // ovale plus étroit en haut
    const ry = 6.4, rx = y + 0.5 < cy ? 4.7 + (y + 0.5 - cy) * 0.07 : 5.0;
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy > 1) continue;
    // éclairage radial depuis un point en haut à gauche : plus rond qu'un dégradé en biais
    const l = Math.hypot(x + 0.5 - (cx - 1.8), (y + 0.5 - (cy - 2.6)) * 0.85);
    c.set(x, y, l < 1.6 ? 'd' : l < 4.2 ? 'U' : l < 6.6 ? 'u' : 'n');
  }
  return outline(c, 'e');
}

// ---------- Pomme ----------

/** Pomme rouge, joue verte en haut à gauche, queue et feuille. */
function apple(): Canvas {
  const c = new Canvas(S, S);
  ball(c, 7.8, 9.2, 6.2, 5.6, ['6', '7', '8']);
  // joue verte, cernée d'une rougeur orangée
  c.within('67', (c) => c.ellipse(5.0, 7.6, 3.9, 3.4, '6').ellipse(4.7, 7.2, 3.2, 2.7, 'L').ellipse(4.2, 6.6, 2.0, 1.6, 'j'));
  // creux de la queue
  c.set(7, 4, EMPTY).set(8, 4, EMPTY).set(7, 5, '8').set(8, 5, '8');
  // queue et feuille
  c.line(8, 1, 8, 4, 'N').set(7, 1, 'N');
  capsule(c, 9.2, 3.0, 13.2, 1.6, 1.2, (_, a) => (a < 0 ? 'L' : 'l'));
  return outline(c, darkest({ N: 'K', L: 'k', l: 'k', j: 'k' }, '8'));
}

// ---------- Laine ----------

/** Pelote de laine écrue : boule striée de brins, bout de fil qui pend en bas à droite. */
function wool(): Canvas {
  const c = new Canvas(S, S);
  const cx = 7.4, cy = 7.6, r = 6.3;
  ball(c, cx, cy, r, r * 0.95, ['a', 'd', 'D']);
  // brins enroulés : polylignes un cran plus sombres que la laine qu'elles traversent
  const darker: Record<string, string> = { a: 'D', d: 'E', D: 'E' };
  const mark = new Canvas(S, S);
  const strand = (pts: [number, number][]) => {
    for (let i = 1; i < pts.length; i++) mark.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 'x');
  };
  // nappe principale, bombée avec la boule
  strand([[2, 10], [4, 6], [7, 3], [10, 2]]);
  strand([[4, 13], [6, 9], [9, 6], [13, 4]]);
  strand([[8, 14], [10, 11], [13, 8]]);
  // nappe croisée, en haut à gauche
  strand([[3, 3], [4, 5], [5, 8]]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = c.get(x, y);
    if (mark.get(x, y) === 'x' && darker[k]) c.set(x, y, darker[k]);
  }
  // bout de fil qui part de la boule et traîne au sol
  c.set(12, 13, 'D').set(13, 13, 'D').set(13, 14, 'D').set(14, 14, 'D').set(15, 14, 'd');
  return outline(c, 'E');
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [
  img('item-log', log()),
  img('item-branch', branch()),
  img('item-stone', stone()),
  img('item-iron-ore', ironOre()),
  img('item-straw', straw()),
  img('item-wheat', wheat()),
  img('item-seeds', seeds()),
  img('item-berries', berries()),
  img('item-mushroom', mushroom()),
  img('item-egg', egg()),
  img('item-apple', apple()),
  img('item-wool', wool()),
];
