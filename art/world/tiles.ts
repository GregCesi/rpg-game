// Tuiles 32x32 du monde, générées par code avec une graine fixe : le rendu est stable d'un build à l'autre.
// Les clôtures existent en 16 variantes (une par combinaison de voisins N/E/S/O) : la carte n'écrit que 'F',
// le chargeur de carte choisit la bonne variante.

import { Canvas, castShadow, rng, selOut } from '../lib/canvas';
import type { ImageSource, TilesetSource } from '../lib/types';
import { world } from '../palette';
import { reliefTileset } from './relief';

const T = 32;

function grass(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 'g');
  for (let i = 0; i < 16; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? 'v' : 'G');
  // touffes : trois brins, pointes claires, ombre au pied
  const tufts = Math.floor(r() * 2);
  for (let i = 0; i < tufts; i++) {
    const x = 2 + Math.floor(r() * (T - 4));
    const y = 3 + Math.floor(r() * (T - 5));
    c.set(x - 1, y + 1, 'V').set(x, y + 1, 'V').set(x + 1, y + 1, 'V');
    c.set(x - 1, y, 'G').set(x - 1, y - 1, 'y');
    c.set(x, y, 'G').set(x, y - 1, 'G').set(x, y - 2, 'y');
    c.set(x + 1, y, 'G').set(x + 1, y - 1, 'y');
  }
  return c;
}

/**
 * Bord irrégulier : profondeur (en px) d'une bordure le long d'un côté, qui ondule.
 * Périodique sur 32 px : deux tuiles voisines se raccordent sans marche.
 */
function edgeDepth(i: number, phase: number, base: number): number {
  const a = (i / T) * Math.PI * 2;
  return base + Math.round(Math.sin(a * 2 + phase) * 1.2 + Math.sin(a * 5 + phase * 3) * 0.8);
}

/**
 * Pose une bordure d'herbe sur les côtés où la tuile n'a pas de voisin identique.
 * mask : N=1, E=2, S=4, O=8 (bit à 1 = voisin identique de ce côté).
 */
function grassBorder(c: Canvas, mask: number, seed: number, rim: string, base = 3) {
  const g = grass(seed + 500);
  const sides: [number, (i: number, d: number) => [number, number]][] = [
    [1, (i, d) => [i, d]],
    [2, (i, d) => [T - 1 - d, i]],
    [4, (i, d) => [i, T - 1 - d]],
    [8, (i, d) => [d, i]],
  ];
  for (const [bit, at] of sides) {
    if (mask & bit) continue;
    for (let i = 0; i < T; i++) {
      const depth = edgeDepth(i, bit, base);
      for (let d = 0; d < depth; d++) {
        const [x, y] = at(i, d);
        c.set(x, y, g.get(x, y));
      }
      const [x, y] = at(i, depth);
      c.set(x, y, rim);
    }
  }
}

function flowers(seed: number): Canvas {
  const r = rng(seed);
  const c = grass(seed + 1);
  for (let i = 0; i < 5; i++) {
    const x = 3 + Math.floor(r() * (T - 6));
    const y = 3 + Math.floor(r() * (T - 6));
    const petal = r() < 0.5 ? 'a' : 'c';
    c.set(x - 1, y, petal).set(x + 1, y, petal).set(x, y - 1, petal).set(x, y + 1, petal);
    c.set(x, y, 'b');
    c.set(x, y + 2, 'v');
  }
  return c;
}

function path(seed: number, mask = 15): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 'u');
  for (let i = 0; i < 45; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? 'n' : 'U');
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(r() * (T - 2));
    const y = Math.floor(r() * (T - 2));
    c.set(x, y, 'R').set(x + 1, y, 'r').set(x, y + 1, 'z').set(x + 1, y + 1, 'e');
  }
  grassBorder(c, mask, seed, 'e');
  return c;
}

function field(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 'f');
  for (let y = 0; y < T; y++) {
    const band = y % 8;
    if (band < 2) c.rect(0, y, T, 1, 'F');
    else if (band === 7) c.rect(0, y, T, 1, 'N');
  }
  for (let i = 0; i < 40; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? 'n' : 'F');
  return c;
}

function water(seed: number, mask = 15): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 'w');
  for (let i = 0; i < 20; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), 'q');
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(r() * (T - 5));
    const y = Math.floor(r() * T);
    c.rect(x, y, 3 + Math.floor(r() * 3), 1, 'W');
  }
  // berge : un liseré de terre, puis l'eau plus sombre au pied de la berge
  const bank = new Canvas(T, T, '.');
  grassBorder(bank, mask, seed, 'n', 3);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const b = bank.get(x, y);
    if (b === '.') continue;
    c.set(x, y, b);
  }
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    if (c.get(x, y) !== 'n') continue;
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      const n = c.get(x + dx, y + dy);
      if (n === 'w' || n === 'W' || n === 'q') c.set(x + dx, y + dy, 'q');
    }
  }
  return c;
}

// Masque de voisinage : N=1, E=2, S=4, O=8.
function fence(mask: number): Canvas {
  const c = grass(900 + mask);
  const cx = 16;
  // rails horizontaux (deux traverses)
  const hRail = (x0: number, x1: number) => {
    for (const y0 of [11, 19]) {
      c.rect(x0, y0, x1 - x0, 1, 'o');
      c.rect(x0, y0 + 1, x1 - x0, 2, 'M');
      c.rect(x0, y0 + 3, x1 - x0, 1, 'm');
      c.rect(x0, y0 + 4, x1 - x0, 1, 'o');
      c.rect(x0, y0 + 5, x1 - x0, 1, 'v');
    }
  };
  // rail vertical
  const vRail = (y0: number, y1: number) => {
    c.rect(cx - 2, y0, 1, y1 - y0, 'o');
    c.rect(cx - 1, y0, 1, y1 - y0, 'M');
    c.rect(cx, y0, 1, y1 - y0, 'm');
    c.rect(cx + 1, y0, 1, y1 - y0, 'o');
    c.rect(cx + 2, y0, 1, y1 - y0, 'v');
  };
  if (mask & 8) hRail(0, cx);
  if (mask & 2) hRail(cx, T);
  if (mask & 1) vRail(0, cx);
  if (mask & 4) vRail(cx, T);
  // poteau
  c.rect(cx - 4, 7, 8, 21, 'o');
  c.rect(cx - 3, 8, 6, 19, 'm');
  c.rect(cx - 3, 8, 2, 19, 'M');
  c.rect(cx + 2, 8, 1, 19, 'N');
  c.rect(cx - 3, 8, 6, 2, 'M');
  c.rect(cx - 4, 28, 8, 1, 'v');
  return c;
}

// ---------- Sols de la forêt : lisière, sous-bois, forêt profonde ----------
// Même grain que l'herbe (un fond, un semis d'un pixel, des grappes posées dedans) : seuls les tons et la part de chaque
// élément changent d'une profondeur à l'autre, pour qu'on puisse les mêler au hasard dans les zones de passage.

interface FloorLook {
  base: string;
  /** Grain d'un pixel, comme le semis de l'herbe (tramage de texture). */
  specks: string[];
  nSpecks: number;
  /** Creux de terre ou d'humus : petites flaques de 3 à 6 px. */
  soil?: string;
  nSoil?: number;
  /** Feuilles mortes : [lumière, teinte, ombre], posées en grappes de 3 ou 4 px, éclairées en haut à gauche. */
  leaves: [string, string, string][];
  nLeaves: [number, number];
  /** Coussins de mousse : [ombre, lumière]. */
  moss: [string, string][];
  nMoss: [number, number];
  /** Touffes d'herbe (pied, brin, pointe), comme celles de l'herbe. */
  tufts?: [string, string, string];
  nTufts?: [number, number];
}

const LEAF_SHAPES: [number, number, number][][] = [
  [[0, 0, 0], [1, 0, 1], [1, 1, 2]],
  [[0, 0, 0], [0, 1, 1], [1, 1, 2]],
  [[1, 0, 0], [0, 1, 1], [1, 1, 2]],
  [[0, 0, 0], [1, 0, 0], [1, 1, 1], [2, 1, 2]],
  [[1, 0, 0], [2, 0, 1], [0, 1, 1], [1, 1, 2]],
];

const between = (r: () => number, [a, b]: [number, number]) => a + Math.floor(r() * (b - a + 1));

function floor(look: FloorLook, seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, look.base);
  for (let i = 0; i < look.nSpecks; i++) {
    c.set(Math.floor(r() * T), Math.floor(r() * T), look.specks[Math.floor(r() * look.specks.length)]);
  }
  for (let i = 0; i < (look.nSoil ?? 0); i++) {
    const x = 3 + r() * (T - 6);
    const y = 3 + r() * (T - 6);
    c.ellipse(x, y, 1.6 + r() * 1.2, 1.1 + r() * 0.5, look.soil!);
  }
  const nMoss = between(r, look.nMoss);
  for (let i = 0; i < nMoss; i++) {
    // coussin : une galette sombre, son bord nord-ouest au jour
    const [dark, light] = look.moss[Math.floor(r() * look.moss.length)];
    const cx = 4 + r() * (T - 8);
    const cy = 4 + r() * (T - 8);
    const cushion = new Canvas(T, T).ellipse(cx, cy, 1.8 + r() * 1.4, 1.2 + r() * 0.6, dark);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      if (cushion.get(x, y) !== dark) continue;
      const rim = cushion.get(x, y - 1) !== dark || cushion.get(x - 1, y) !== dark;
      c.set(x, y, rim && y < cy ? light : dark);
    }
  }
  const nLeaves = between(r, look.nLeaves);
  for (let i = 0; i < nLeaves; i++) {
    const ramp = look.leaves[Math.floor(r() * look.leaves.length)];
    const shape = LEAF_SHAPES[Math.floor(r() * LEAF_SHAPES.length)];
    const x = 1 + Math.floor(r() * (T - 4));
    const y = 1 + Math.floor(r() * (T - 3));
    for (const [dx, dy, k] of shape) c.set(x + dx, y + dy, ramp[k]);
  }
  if (look.tufts) {
    const [foot, blade, tip] = look.tufts;
    const n = between(r, look.nTufts ?? [0, 0]);
    for (let i = 0; i < n; i++) {
      const x = 2 + Math.floor(r() * (T - 4));
      const y = 3 + Math.floor(r() * (T - 5));
      c.set(x - 1, y + 1, foot).set(x, y + 1, foot).set(x + 1, y + 1, foot);
      c.set(x - 1, y, blade).set(x - 1, y - 1, tip);
      c.set(x, y, blade).set(x, y - 1, blade).set(x, y - 2, tip);
      c.set(x + 1, y, blade).set(x + 1, y - 1, tip);
    }
  }
  return c;
}

/** Lisière : l'herbe se fait rare, les feuilles mortes et la mousse la gagnent. */
const FOREST: FloorLook = {
  base: '0',
  specks: ['g', 'v', '2', 'V', 'G'],
  nSpecks: 44,
  leaves: [['M', 'm', 'N'], ['U', 'u', 'n'], ['m', 'N', 'e']],
  nLeaves: [5, 8],
  moss: [['l', 'L']],
  nMoss: [1, 2],
  tufts: ['V', 'G', 'y'],
  nTufts: [1, 2],
};

/** Sous-bois : la litière de feuilles brunes recouvre tout, la terre sombre perce, presque plus d'herbe. */
const WOODS: FloorLook = {
  base: '2',
  specks: ['3', 'e', '0', 'n', '4'],
  nSpecks: 56,
  soil: '3',
  nSoil: 2,
  leaves: [['M', 'm', 'N'], ['u', 'n', 'e'], ['m', 'N', 'K'], ['U', 'm', 'N']],
  nLeaves: [11, 15],
  moss: [['l', 'L'], ['k', 'l'], ['8', '6']],
  nMoss: [1, 3],
};

/** Forêt profonde : humus noir, mousse vert-bleu, feuilles éteintes ; plus froid, un peu étrange. */
const DEEPWOODS: FloorLook = {
  base: '4',
  specks: ['5', '8', '2', '9', '3'],
  nSpecks: 56,
  soil: '5',
  nSoil: 3,
  leaves: [['9', '3', '5'], ['n', '9', '3'], ['m', 'N', 'K']],
  nLeaves: [5, 8],
  moss: [['8', '6'], ['6', '7']],
  nMoss: [2, 4],
};

// ---------- Prairie de fauche : l'herbe haute et blonde des prés ----------

function meadow(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 's');
  for (let i = 0; i < 22; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? 'v' : 'g');
  // brins hauts : trois pixels debout (pied à l'ombre, tige, pointe au soleil), un peu penchés au hasard
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(r() * T);
    const y = 3 + Math.floor(r() * (T - 3));
    const lean = r() < 0.3 ? -1 : r() < 0.5 ? 1 : 0;
    c.set(x, y + 1, 'V');
    c.set(x, y, 'v');
    c.set(x, y - 1, 'G');
    c.set(x + lean, y - 2, 'G');
    c.set(x + lean, y - 3, r() < 0.45 ? 'p' : 'y');
  }
  // épis : deux ou trois grappes de graines blondes
  const heads = 2 + Math.floor(r() * 2);
  for (let i = 0; i < heads; i++) {
    const x = 2 + Math.floor(r() * (T - 4));
    const y = 3 + Math.floor(r() * (T - 5));
    c.set(x, y, 'p').set(x + 1, y, 'p').set(x, y - 1, 'p').set(x + 1, y + 1, 'y').set(x, y + 1, 'G').set(x, y + 2, 'v');
  }
  return c;
}

// ---------- Terre battue : la place du village, les cours de ferme ----------

function yard(seed: number, mask = 15): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 'I');
  // terre tassée : grain fin et égal, sans motif qui se répète d'une tuile à l'autre
  for (let i = 0; i < 40; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), '#');
  for (let i = 0; i < 16; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.6 ? '$' : 'u');
  // graviers
  for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
    const x = 1 + Math.floor(r() * (T - 3));
    const y = 1 + Math.floor(r() * (T - 3));
    if (r() < 0.5) c.set(x, y, 'R').set(x + 1, y, 'r').set(x + 1, y + 1, 'z');
    else c.set(x, y, '+').set(x, y + 1, '=').set(x + 1, y + 1, ';');
  }
  grassBorder(c, mask, seed, 'n');
  return c;
}

// ---------- Route empierrée bordée ----------
// L'empierrement est le même dessin pour les 16 tuiles (même graine, rangées qui se referment sur 32 px) : deux tuiles de
// route voisines se raccordent pierre à pierre. Chaque tuile ne change que la teinte des pierres qui ne touchent pas son bord.

const STONES: [string, string, string][] = [
  ['+', '=', ';'], // calcaire
  ['+', '=', ';'],
  ['R', 'r', 'z'], // pierre grise
  ['U', 'u', 'n'], // pierre ocre
];

/** Une pierre vue de dessus : coins arrondis, lumière au coin nord-ouest, ombre le long du bas et de la droite. */
function stone(c: Canvas, x: number, y: number, w: number, h: number, [hi, mid, lo]: [string, string, string], wrap = false) {
  const put = (i: number, j: number, ch: string) => c.set(wrap ? ((i % T) + T) % T : i, j, ch);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const corner = (i === 0 || i === w - 1) && (j === 0 || j === h - 1);
    if (corner && w > 2 && h > 2) continue;
    const top = (j === 0 && i < 3) || (i === 0 && j === 1 && h > 3);
    const low = (j === h - 1 && i >= Math.floor(w / 2)) || (i === w - 1 && j > 0);
    put(x + i, y + j, top ? hi : low ? lo : mid);
  }
}

function road(mask: number): Canvas {
  const c = new Canvas(T, T, ':');
  const tint = rng(300 + mask);
  // empierrement : huit rangées de 4 px (pierre de 3 px, joint de 1), joints décalés d'une rangée à l'autre ; la dernière
  // rangée garde son joint au bord sud, pour que deux tuiles l'une sous l'autre se raccordent
  for (let row = 0; row < 8; row++) {
    const r = rng(700 + row);
    let x = Math.floor(r() * 6);
    const start = x;
    while (x < start + T) {
      // place restante avant de refermer la rangée sur elle-même : jamais de pierre de moins de 4 px
      const room = start + T - x - 1;
      const w = room <= 8 ? room : Math.min(4 + Math.floor(r() * 4), room - 5);
      const ramp = STONES[Math.floor(r() * STONES.length)];
      const inside = (x % T) + w <= T; // une pierre qui passe le bord est partagée avec la tuile voisine
      const own = inside && tint() < 0.35 ? STONES[Math.floor(tint() * STONES.length)] : ramp;
      // une pierre sur quatre, plus grosse, mord sur le joint du dessous : les rangées ne sont plus droites
      const tall = row < 7 && r() < 0.25;
      stone(c, x, row * 4, w, tall ? 4 : 3, own, true);
      x += w + 1;
    }
  }
  // bordure : une file de grosses pierres posées (30 cm), puis l'herbe ; même découpe sur chaque côté, pour qu'elle se
  // raccorde d'une tuile à l'autre
  const sides: [number, (i: number, d: number) => [number, number]][] = [
    [1, (i, d) => [i, d]],
    [2, (i, d) => [T - 1 - d, i]],
    [4, (i, d) => [i, T - 1 - d]],
    [8, (i, d) => [d, i]],
  ];
  const CURB0 = 2;
  const CURB = 6;
  for (const [bit, at] of sides) {
    if (mask & bit) continue;
    const r = rng(800 + bit);
    // joint profond entre la bordure et l'empierrement
    for (let i = 0; i < T; i++) {
      const [x, y] = at(i, CURB0 + CURB);
      c.set(x, y, ',');
    }
    let i = Math.floor(r() * 4) - 4;
    while (i < T) {
      const len = 6 + Math.floor(r() * 4);
      const ramp: [string, string, string] = r() < 0.75 ? ['+', '=', ';'] : ['R', 'r', 'z'];
      // la pierre dans le repère de l'écran : coins de son rectangle
      const [ax, ay] = at(i, CURB0);
      const [bx, by] = at(i + len - 2, CURB0 + CURB - 1);
      const x0 = Math.min(ax, bx);
      const y0 = Math.min(ay, by);
      stone(c, x0, y0, Math.abs(bx - ax) + 1, Math.abs(by - ay) + 1, ramp);
      // joint entre deux pierres de bordure
      for (let d = CURB0; d < CURB0 + CURB; d++) {
        const [jx, jy] = at(i + len - 1, d);
        c.set(jx, jy, ',');
      }
      i += len;
    }
  }
  const g = grass(1500 + mask);
  for (const [bit, at] of sides) {
    if (mask & bit) continue;
    for (let i = 0; i < T; i++) {
      const depth = Math.max(1, Math.min(3, edgeDepth(i, bit, 2)));
      for (let d = 0; d < depth; d++) {
        const [x, y] = at(i, d);
        c.set(x, y, g.get(x, y));
      }
    }
  }
  return c;
}

// ---------- Champs : variantes des sillons est-ouest, et sillons nord-sud ----------

function fieldNS(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 'f');
  for (let x = 0; x < T; x++) {
    const band = x % 8;
    if (band < 2) c.rect(x, 0, 1, T, 'F');
    else if (band === 7) c.rect(x, 0, 1, T, 'N');
  }
  for (let i = 0; i < 40; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? 'n' : 'F');
  return c;
}

/** Mottes : quelques grappes de terre retournée sur la crête d'un sillon, éclairées en haut à gauche. */
function clods(c: Canvas, seed: number, ns: boolean) {
  const r = rng(seed);
  for (let i = 0; i < 5; i++) {
    const a = Math.floor(r() * (T - 2));
    const b = Math.floor(r() * 4) * 8 + 2 + Math.floor(r() * 3);
    const [x, y] = ns ? [b, a] : [a, b];
    c.set(x, y, 'U').set(x + 1, y, 'F').set(x, y + 1, 'F').set(x + 1, y + 1, 'n');
  }
  return c;
}

// ---------- Le pont de bois ----------
// Le chemin, est-ouest, passe la rivière sur 2 cases (3,20 m). Planches posées en travers (nord-sud), 4 px (20 cm) de large,
// alignées sur la grille de 4 px d'un bout à l'autre du pont ; clous sur les longerons ; usure des roues en deux traces.
// Garde-corps bas (45 cm) : main courante et poteaux tous les 1,60 m, vus en trois quarts, la main courante 8 px au-dessus
// du bord du tablier. Bois vieux (signes { } [ ] | : la rampe woodAges.old).
// bridge-n : tablier de y = 8 à 31, garde-corps sur son bord nord (on voit l'eau sombre dessous, de y = 0 à 7) ;
// bridge-s : tablier de y = 0 à 26, garde-corps sur son bord sud, la rive du tablier (y = 27 à 29), l'eau sombre dessous.

const OLD = { hi: '{', wood: '}', shade: '[', hollow: ']', joint: '|' };
const DECK_N = 8; // bord nord du tablier dans bridge-n
const DECK_S = 26; // bord sud du tablier dans bridge-s
const POST = 13; // poteau du garde-corps, tous les 32 px

/** Eau pleine, assombrie : l'ombre du pont. */
function shadedWater(seed: number): Canvas {
  return water(seed, 15).recolor({ W: 'w', w: 'q', q: '5' });
}

/** Planches du tablier, de x0 à x1 et de y0 à y1 compris. `row0` : rang de la rangée y0 sur tout le tablier (pour l'usure). */
function deck(c: Canvas, x0: number, x1: number, y0: number, y1: number, row0: number, seed: number) {
  const r = rng(seed);
  // fond : la planche, le joint dans l'ombre de la planche voisine
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) c.set(x, y, x % 4 === 0 ? OLD.shade : OLD.wood);
  const run = (x: number, y: number, len: number, ch: string) => {
    for (let j = 0; j < len; j++) if (y + j >= y0 && y + j <= y1 && x >= x0 && x <= x1) c.set(x, y + j, ch);
  };
  for (let x = x0; x <= x1; x++) {
    const k = x % 4;
    const h = y1 - y0 + 1;
    const n = Math.ceil(h / 10);
    for (let i = 0; i < n; i++) {
      const y = y0 + Math.floor(r() * h);
      // joint ouvert entre deux planches ; arête au soleil ; fil du bois
      if (k === 0) { if (r() < 0.5) run(x, y, 2 + Math.floor(r() * 4), OLD.joint); }
      else if (k === 1) run(x, y, 3 + Math.floor(r() * 5), OLD.hi);
      else if (r() < 0.5) run(x, y, 3 + Math.floor(r() * 4), OLD.shade);
    }
  }
  // nœuds
  for (let i = 0; i < 2; i++) {
    const x = x0 + 4 * Math.floor(r() * ((x1 - x0) / 4)) + 2;
    const y = y0 + 2 + Math.floor(r() * (y1 - y0 - 4));
    if (x + 1 > x1) continue;
    c.set(x, y, OLD.hollow).set(x + 1, y, OLD.shade).set(x, y + 1, OLD.shade);
  }
  // usure : les roues polissent deux traces, à 1,40 m l'une de l'autre (rangs 10 et 38 du tablier), par plaques
  for (let y = y0; y <= y1; y++) {
    const rank = row0 + (y - y0);
    if (Math.abs(rank - 10) > 1 && Math.abs(rank - 38) > 1) continue;
    for (let x = x0; x <= x1; x++) if (x % 4 === 2 && r() < 0.5) c.set(x, y, OLD.hi);
  }
  // clous : un par planche sur chaque longeron (rangs 4, 22 et 42)
  for (let y = y0; y <= y1; y++) {
    const rank = row0 + (y - y0);
    if (rank !== 4 && rank !== 22 && rank !== 42) continue;
    for (let x = x0; x <= x1; x++) if (x % 4 === 2) c.set(x, y, OLD.joint);
  }
}

/** Main courante, de x0 à x1, sa face du dessus à la rangée y. */
function handrail(c: Canvas, x0: number, x1: number, y: number) {
  c.rect(x0, y, x1 - x0 + 1, 1, OLD.hi);
  c.rect(x0, y + 1, x1 - x0 + 1, 1, OLD.wood);
  c.rect(x0, y + 2, x1 - x0 + 1, 1, OLD.shade);
}

/** Poteau, de la main courante (rangée y) au tablier (rangée foot) ; `w` 3 px, ou 4 pour le dernier poteau d'un bout. */
function post(c: Canvas, x: number, y: number, foot: number, w = 3) {
  for (let j = y; j <= foot; j++) {
    c.set(x, j, OLD.hi);
    for (let i = 1; i < w - 1; i++) c.set(x + i, j, OLD.wood);
    c.set(x + w - 1, j, OLD.shade);
  }
  // tête du poteau, au-dessus de la main courante, et pied dans l'ombre
  c.rect(x, y - 1, w, 1, OLD.hi);
  c.rect(x, foot, w, 1, OLD.hollow);
}

function bridgeN(seed: number): Canvas {
  const c = shadedWater(seed);
  deck(c, 0, T - 1, DECK_N, T - 1, 0, seed + 1);
  handrail(c, 0, T - 1, 0);
  post(c, POST, 1, DECK_N);
  return c;
}

function bridgeS(seed: number): Canvas {
  const c = shadedWater(seed);
  deck(c, 0, T - 1, 0, DECK_S, T - DECK_N, seed + 1);
  // rive du tablier : la face sud du longeron de rive
  c.rect(0, DECK_S + 1, T, 1, OLD.wood);
  c.rect(0, DECK_S + 2, T, 1, OLD.shade);
  c.rect(0, DECK_S + 3, T, 1, OLD.hollow);
  handrail(c, 0, T - 1, DECK_S - 8);
  post(c, POST, DECK_S - 7, DECK_S);
  return c;
}

/** Culée : blocs de calcaire posés à la rive, sous le bout du tablier, de x0 à x1 et de y0 à y1. */
function abutment(c: Canvas, x0: number, x1: number, y0: number, y1: number, seed: number) {
  const r = rng(seed);
  c.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, '~');
  for (let y = y0; y <= y1; y += 4) {
    let x = x0 - Math.floor(r() * 3);
    while (x <= x1) {
      const w = 4 + Math.floor(r() * 3);
      const left = Math.max(x, x0);
      const right = Math.min(x + w - 1, x1);
      if (right - left >= 1) stone(c, left, y, right - left + 1, Math.min(3, y1 - y + 1), ['+', '=', ';']);
      x += w + 1;
    }
  }
}

/**
 * Bout du pont sur la berge : le chemin arrive, le tablier se pose sur la culée de pierre, le dernier poteau.
 * `west` : bout ouest (le chemin à gauche, le pont part vers l'est). `north` : moitié nord (garde-corps nord).
 */
function bridgeEnd(west: boolean, north: boolean, seed: number): Canvas {
  // le chemin compte le pont comme du chemin : bord d'herbe au nord (moitié nord) ou au sud (moitié sud) seulement
  const c = path(seed, north ? 14 : 11);
  const d0 = west ? 9 : 0; // le tablier, de d0 à d1 (bords de planche sur la grille de 4 px)
  const d1 = west ? T - 1 : 23;
  const s0 = west ? 22 : 0; // la culée, à la rive
  const s1 = west ? T - 1 : 9;
  const newel = west ? d0 : d1 - 3;
  // marche de terre tassée au pied du tablier
  for (let y = north ? DECK_N : 0; y <= (north ? T - 1 : DECK_S + 3); y++) c.set(west ? d0 - 1 : d1 + 1, y, 'e');
  if (north) {
    abutment(c, s0, s1, 2, DECK_N - 1, seed + 2);
    deck(c, d0, d1, DECK_N, T - 1, 0, seed + 1);
    handrail(c, d0, d1, 0);
    post(c, newel, 1, DECK_N, 4);
  } else {
    abutment(c, s0, s1, DECK_S + 1, T - 1, seed + 2);
    deck(c, d0, d1, 0, DECK_S, T - DECK_N, seed + 1);
    c.rect(d0, DECK_S + 1, d1 - d0 + 1, 1, OLD.wood);
    c.rect(d0, DECK_S + 2, d1 - d0 + 1, 1, OLD.shade);
    c.rect(d0, DECK_S + 3, d1 - d0 + 1, 1, OLD.hollow);
    handrail(c, d0, d1, DECK_S - 8);
    post(c, newel, DECK_S - 7, DECK_S, 4);
  }
  return c;
}

const tiles: TilesetSource['tiles'] = {
  grass: grass(1).toGrid(),
  grass2: grass(2).toGrid(),
  grass3: grass(3).toGrid(),
  grass4: grass(4).toGrid(),
  grass5: grass(5).toGrid(),
  grass6: grass(6).toGrid(),
  flowers: flowers(10).toGrid(),
  flowers2: flowers(11).toGrid(),
  field: field(30).toGrid(),
  field2: clods(field(31), 131, false).toGrid(),
  field3: clods(field(32), 132, false).toGrid(),
  'field-ns': fieldNS(33).toGrid(),
  'field-ns2': clods(fieldNS(34), 134, true).toGrid(),
  meadow: meadow(60).toGrid(),
  meadow2: meadow(61).toGrid(),
  meadow3: meadow(62).toGrid(),
  'bridge-n': bridgeN(70).toGrid(),
  'bridge-s': bridgeS(71).toGrid(),
  'bridge-w-n': bridgeEnd(true, true, 72).toGrid(),
  'bridge-w-s': bridgeEnd(true, false, 73).toGrid(),
  'bridge-e-n': bridgeEnd(false, true, 74).toGrid(),
  'bridge-e-s': bridgeEnd(false, false, 75).toGrid(),
};
const FLOORS: [string, FloorLook, number][] = [['forest', FOREST, 100], ['woods', WOODS, 110], ['deepwoods', DEEPWOODS, 120]];
for (const [name, look, seed] of FLOORS) {
  for (let k = 0; k < 4; k++) tiles[k ? `${name}${k + 1}` : name] = floor(look, seed + k).toGrid();
}
for (let m = 0; m < 16; m++) {
  tiles[`fence-${m}`] = fence(m).toGrid();
  tiles[`path-${m}`] = path(20 + m, m).toGrid();
  tiles[`water-${m}`] = water(40 + m, m).toGrid();
  tiles[`yard-${m}`] = yard(200 + m, m).toGrid();
  tiles[`road-${m}`] = road(m).toGrid();
}
// le relief (art/world/relief.ts) : le dessus des talus `bank-*`, le sol clair du chemin creux `lane-*` et ses raccords au chemin
// `path-lane-w-*` (le couloir à l'ouest de la case) et `path-lane-e-*`
const pathGrids: Record<string, string[]> = {};
for (let m = 0; m < 16; m++) pathGrids[`path-${m}`] = tiles[`path-${m}`];
Object.assign(tiles, reliefTileset(pathGrids).tiles);

// ---------- Détails au sol (posés au hasard par la carte, ils cassent la grille) ----------

function tufts(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T);
  for (let i = 0; i < 3; i++) {
    const x = 6 + Math.floor(r() * 20);
    const y = 10 + Math.floor(r() * 14);
    c.set(x - 1, y + 1, 'V').set(x, y + 1, 'V').set(x + 1, y + 1, 'V');
    c.set(x - 1, y, 'G').set(x - 1, y - 1, 'y');
    c.set(x, y, 'G').set(x, y - 1, 'G').set(x, y - 2, 'y');
    c.set(x + 1, y, 'G').set(x + 1, y - 1, 'y');
  }
  return c;
}

function pebbles(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T);
  for (let i = 0; i < 3; i++) {
    const x = 8 + Math.floor(r() * 16);
    const y = 10 + Math.floor(r() * 12);
    c.set(x, y, 'R').set(x + 1, y, 'r').set(x, y + 1, 'z').set(x + 1, y + 1, 'Z');
  }
  return c;
}

function clover(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T);
  for (let i = 0; i < 3; i++) {
    const x = 6 + Math.floor(r() * 20);
    const y = 8 + Math.floor(r() * 16);
    c.set(x, y, r() < 0.6 ? 'a' : 'b').set(x, y + 1, 'v');
  }
  return c;
}

/** Nappe d'herbe plus sombre ou plus claire, bord tramé : plus grande qu'une tuile. */
function patch(seed: number, color: string): Canvas {
  const r = rng(seed);
  const c = new Canvas(64, 40);
  // tramé : dense au centre, clairsemé au bord, jamais plein (sinon on dirait un trou)
  for (let y = 0; y < 40; y++) for (let x = 0; x < 64; x++) {
    const dx = (x - 32) / 28;
    const dy = (y - 20) / 15;
    const d = dx * dx + dy * dy;
    if (d < 1 && r() < 0.42 * (1 - d)) c.set(x, y, color);
  }
  return c;
}

function dirt(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T);
  c.ellipse(16, 18, 6, 3.5, 'n');
  c.within('n', (c) => {
    for (let i = 0; i < 10; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? 'u' : '.');
  });
  return c;
}

// ---------- Détails au sol de la forêt ----------

/** Fougère : cinq frondes qui partent du pied, folioles claires au-dessus, ombre dessous. */
function fern(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T);
  const bx = 15 + Math.floor(r() * 3);
  const by = 20;
  const tips: [number, number][] = [[-7, -3], [-5, -7], [0, -9], [5, -7], [7, -2]];
  for (const [dx, dy] of tips) {
    const tx = bx + dx + Math.round(r() * 2 - 1);
    const ty = by + dy + Math.round(r() * 2 - 1);
    const n = Math.max(Math.abs(tx - bx), Math.abs(ty - by));
    for (let s = 1; s <= n; s++) {
      const x = Math.round(bx + ((tx - bx) * s) / n);
      const y = Math.round(by + ((ty - by) * s) / n);
      c.set(x, y, s < n / 2 ? 'L' : 'j');
      // folioles : une sur deux de chaque côté de la nervure, plus courtes vers la pointe
      if (s % 2 === 0 && s < n) {
        c.set(x, y - 1, 'j');
        if (dx < 0) c.set(x - 1, y, 'j'); else c.set(x + 1, y, 'L');
      }
      if (s % 2 === 1 && s < n - 1) c.set(x, y + 1, 'k');
    }
  }
  c.set(bx - 1, by, 'k').set(bx, by, 'k').set(bx + 1, by, 'k').set(bx, by + 1, 'x').set(bx + 1, by + 1, 'x');
  return c;
}

/** Brindilles : trois ou quatre petits bois tombés, une fourche, ombre au sud. */
function twigs(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T);
  const n = 3 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const x = 7 + Math.floor(r() * 14);
    const y = 9 + Math.floor(r() * 13);
    const len = 4 + Math.floor(r() * 4);
    const dy = r() < 0.5 ? 0 : r() < 0.5 ? 1 : -1;
    const x1 = x + len;
    const y1 = y + Math.round((dy * len) / 3);
    c.line(x, y + 1, x1, y1 + 1, 'K');
    c.line(x, y, x1, y1, 'M');
    c.set(x, y, 'U');
    if (r() < 0.6) {
      const fx = x + Math.floor(len / 2);
      const fy = y + Math.round((dy * len) / 6);
      c.set(fx + 1, fy - 1, 'm').set(fx + 2, fy - 2, 'N');
    }
    c.set(x1, y1, 'N');
  }
  return c;
}

/** Tas de feuilles mortes : sept à dix feuilles qui se chevauchent. */
function leafPile(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T);
  const ramps: [string, string, string][] = [['M', 'm', 'N'], ['U', 'u', 'n'], ['m', 'N', 'K'], ['y', 'M', 'm']];
  const n = 7 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const ramp = ramps[Math.floor(r() * ramps.length)];
    const shape = LEAF_SHAPES[Math.floor(r() * LEAF_SHAPES.length)];
    const x = 11 + Math.floor(r() * 9);
    const y = 12 + Math.floor(r() * 7);
    for (const [dx, dy, k] of shape) c.set(x + dx, y + dy, ramp[k]);
  }
  return c;
}

/** Champignons : deux ou trois chapeaux pâles (parfois un roux), pied clair, ombre portée à droite. */
function mushrooms(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T);
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const x = 11 + i * 4 + Math.floor(r() * 2);
    const y = 13 + Math.floor(r() * 5);
    const [hi, mid, lo] = i === 1 && r() < 0.6 ? ['i', 'c', 'N'] : ['a', 'd', 'E'];
    c.set(x + 2, y + 1, 'x').set(x + 2, y + 2, 'x').set(x + 1, y + 3, 'x');
    c.set(x - 1, y, hi).set(x, y, hi).set(x + 1, y, mid);
    c.set(x - 1, y + 1, mid).set(x, y + 1, mid).set(x + 1, y + 1, lo);
    c.set(x, y + 2, 'd').set(x, y + 3, 'E');
  }
  return c;
}

/**
 * Petite souche moussue, pourrie : Ø 25 cm, 15 cm de haut, cylindre debout du gabarit : 5 × (3 + 2,5) px, plus le contour
 * d'un pixel (7 × 7 en tout). Dessus moussu, flanc d'écorce, ombre portée au sud-est.
 */
function mossStump(): Canvas {
  const c = new Canvas(T, T);
  const x0 = 13;
  const y0 = 13;
  // flanc d'écorce (face sud), éclairé à gauche
  c.rect(x0, y0 + 2, 5, 3, 'N');
  c.rect(x0, y0 + 2, 1, 3, 'm');
  c.rect(x0 + 4, y0 + 2, 1, 3, 'K');
  // dessus : la mousse a recouvert le bois de bout ; un peu de bois pourri au cœur
  c.ellipse(x0 + 2.5, y0 + 1.5, 2.5, 1.5, 'l');
  c.set(x0 + 1, y0 + 0, 'L').set(x0 + 2, y0 + 0, 'j').set(x0 + 1, y0 + 1, 'L').set(x0, y0 + 1, 'L');
  c.set(x0 + 3, y0 + 1, 'm').set(x0 + 3, y0 + 2, 'N');
  // mousse qui coule sur le flanc
  c.set(x0 + 1, y0 + 3, 'l').set(x0, y0 + 3, 'L');
  c.outline('o');
  const dark: Record<string, string> = { l: 'k', L: 'k', j: 'k', m: 'K', N: 'K', K: 'K' };
  const g = Canvas.from(selOut(c.toGrid(), dark));
  // ombre portée, un pixel au sud-est de la silhouette
  const shadow = Canvas.from(castShadow(g.toGrid()));
  // mousse au pied, au sol
  shadow.set(x0 - 2, y0 + 6, 'L').set(x0 - 3, y0 + 6, 'l').set(x0 - 2, y0 + 7, 'l');
  return shadow;
}

const decal = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export const worldDecals = [
  decal('decal-tufts', tufts(1)),
  decal('decal-tufts2', tufts(2)),
  decal('decal-pebbles', pebbles(3)),
  decal('decal-clover', clover(4)),
  decal('decal-patch-dark', patch(5, 'v')),
  decal('decal-patch-light', patch(6, 'G')),
  decal('decal-dirt', dirt(7)),
  decal('decal-fern', fern(8)),
  decal('decal-twigs', twigs(9)),
  decal('decal-leaves', leafPile(10)),
  decal('decal-mushrooms', mushrooms(11)),
  decal('decal-moss', mossStump()),
];

const tileset: TilesetSource = {
  kind: 'tileset',
  name: 'world',
  tileSize: T,
  palette: world,
  tiles,
};

export default tileset;
