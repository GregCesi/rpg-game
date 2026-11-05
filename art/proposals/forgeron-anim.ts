// Proposition : les animations du forgeron (chantier « forgeron », essai hors jeu ; rien ici n'est déclaré dans art/index.ts).
// Planche : npx tsx tools/essai-forgeron-anim.ts écrit .art-preview/forgeron-anim.png et les GIF .art-preview/forgeron-anim-*.gif.
//
// Le dessin de base est le forgeron final (art/proposals/forgeron-final.ts : `matter(facing)`, la matière de chaque vue avant
// le contour). Chaque image déplace des morceaux de cette matière (le haut du corps, une jambe, un avant-bras, les pointes des
// cheveux) ou y dessine un bras dans une autre pose, puis la finit comme la vue fixe (`finishMatter` : contour d'un pixel, ombre
// portée, contour côté lumière). Frame 32 × 48, pieds à y=45 ; la gauche est la droite retournée (`flipX`), comme la mère.
//
// - `idle-*` : deux images de respiration, lentes : à l'inspiration, la tête, les épaules et la poitrine montent d'un pixel
//   (la rangée sous les pectoraux s'allonge), la taille et les jambes ne bougent pas.
// - `walk-*` : quatre images, un pas lourd et lent : au contact (les deux pieds au sol, jambes écartées de profil), tout le
//   haut du corps descend d'un pixel ; au passage, une jambe se lève de deux pixels et le corps remonte. Les bras balancent
//   peu (de face et de dos, la main opposée à la jambe levée remonte d'un pixel ; de profil, l'avant-bras avance ou recule d'un
//   pixel). Les cheveux suivent avec une image de retard : quand le corps descend, leurs pointes restent en haut (une rangée de
//   moins sur les trapèzes) ; quand il remonte, elles restent en bas (une rangée de plus).
// - `work-down` : le travail à l'enclume, de face, derrière elle : la pince et le fer rouge dans la main gauche (à droite de
//   l'image), tenus sur la table de l'enclume ; le marteau dans la droite : levé haut au-dessus de l'épaule, l'abattu, le coup
//   (le corps se tasse d'un pixel, une étincelle jaillit du fer), le rebond, le retour qui prépare le coup suivant. L'enclume
//   n'est pas dans le sprite (c'est l'objet `anvil` du jeu, sur son billot) : le fer est à la hauteur de sa table quand le
//   forgeron se tient juste au nord du billot (planche : `tools/essai-forgeron-anim.ts`).
// - `talk-*` : la pose de dialogue, le marteau posé : de face et de dos, le poing droit sur la hanche, le coude en dehors ; de
//   profil, les mains libres le long du corps. Deux images de respiration, lentes.
//
// Couleurs : celles du forgeron final (`palette` de forgeron-final.ts), plus des teintes déjà dans la palette du jeu
// (art/palette.ts), rien d'inventé :
// - le fer du marteau et de la pince : la rampe `iron` (celle de l'enclume, J I i j = ( ) < >) ;
// - le manche du marteau : le bois travaillé neuf (`woodAges.new`, u c C = * % &) ;
// - le fer rouge et l'étincelle : les couleurs du feu de la forge (`world` : r = i le rouge des braises, e = h l'orangé de la
//   flamme, z = H le jaune de son cœur). L'étincelle n'a pas de contour (posée après lui).

import { Canvas, flipX, type Grid } from '../lib/canvas';
import { iron, woodAges, world } from '../palette';
import type { SpriteSheetSource } from '../lib/types';
import { DARK as BASE_DARK, finishMatter, matter, palette as basePalette, SHADOW_W, type Facing } from './forgeron-final';

export const W = 32;
export const H = 48;

/** La palette des animations : celle du forgeron final, plus le fer, le manche, le fer rouge et l'étincelle (voir l'en-tête). */
export const palette: Record<string, string> = {
  ...basePalette,
  J: iron['('], // fer poli : la face du marteau, l'arête de la pince au jour
  I: iron[')'], // fer au jour
  i: iron['<'], // fer à l'ombre
  j: iron['>'], // fer au plus sombre (contour côté lumière)
  u: woodAges.new['*'], // le manche du marteau, au jour
  c: woodAges.new['%'], // le manche, à l'ombre
  C: woodAges.new['&'], // le manche, au plus sombre
  r: world.i, // le fer rouge (le rouge des braises du feu de la forge)
  e: world.h, // le cœur du fer chaud, orangé (la flamme)
  z: world.H, // l'étincelle (le cœur jaune de la flamme)
};

/** Les couleurs que les animations ajoutent à celles du forgeron final. */
export const NEW_COLORS = ['J', 'I', 'i', 'j', 'u', 'c', 'C', 'r', 'e', 'z'] as const;

const DARK: Record<string, string> = { ...BASE_DARK, J: 'j', I: 'j', i: 'j', j: 'j', u: 'C', c: 'C', C: 'C', r: 'r', e: 'r', z: 'z' };

const HAIR = 'YHhd';
const SKIN = 'wsSD';

const finish = (m: Grid, f: Facing) => finishMatter(m, SHADOW_W[f], DARK);

// ---------- Outils sur la matière ----------

/** Déplace les pixels d'un rectangle (bornes comprises) de (dx, dy) ; ce qui est découvert devient vide, ou `fill(x, y)`. */
function move(c: Canvas, x0: number, y0: number, x1: number, y1: number, dx: number, dy: number, fill?: (x: number, y: number) => string): void {
  const px: [number, number, string][] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    px.push([x, y, c.get(x, y)]);
    c.set(x, y, fill ? fill(x, y) : '.');
  }
  for (const [x, y, ch] of px) if (ch !== '.') c.set(x + dx, y + dy, ch);
}

/** L'inspiration : les rangées y=7 à `to` montent d'un pixel, la rangée `to` reste aussi en place (la poitrine s'allonge). */
function inhale(c: Canvas, to = 25): void {
  for (let y = 6; y < to; y++) for (let x = 0; x < W; x++) c.set(x, y, c.get(x, y + 1));
}

/**
 * Le retard des cheveux sur les trapèzes (rangées y ≥ `from`) : `lag` = 1, le corps vient de descendre, les pointes restent en
 * haut (chaque pointe perd son dernier pixel, la peau dessous reparaît) ; `lag` = -1, le corps vient de remonter, les pointes
 * restent en bas (chaque pointe gagne un pixel sur la peau).
 */
function hairLag(c: Canvas, lag: number, from: number): void {
  if (!lag) return;
  for (let x = 0; x < W; x++) {
    let y = H - 1;
    while (y >= from && !HAIR.includes(c.get(x, y))) y--;
    if (y < from) continue;
    const below = c.get(x, y + 1);
    if (!SKIN.includes(below)) continue;
    if (lag > 0) c.set(x, y, below);
    else c.set(x, y + 1, c.get(x, y) === 'd' ? 'd' : 'h');
  }
}

// ---------- Un bras dans une pose : une couche à part, ombrée, bordée là où elle passe devant le corps ----------

type P = [number, number];

interface Arm {
  shoulder: P;
  elbow: P;
  hand: P;
  /** Épaisseur du bras et de l'avant-bras (diamètre, px). */
  upper?: number;
  fore?: number;
}

/** Trace un segment épais (disques de rayon r le long du segment) dans un masque. */
function thick(m: Canvas, a: P, b: P, r: number, ch: string): void {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    m.ellipse(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r, r, ch);
  }
}

/**
 * Pose une couche (masque : '.' vide ; 'a' bras nu, 'b' brassard, 'f' poing, et toute autre matière telle quelle) sur la matière :
 * chaque pixel nu est ombré selon ses voisins (au jour en haut à gauche, à l'ombre en bas à droite) ; là où la couche passe
 * devant le corps, son bord prend l'ombre profonde (D ; Q pour le cuir) : on lit le bras devant le torse sans contour intérieur.
 */
function layer(c: Canvas, m: Canvas): void {
  const inside = (x: number, y: number) => m.get(x, y) !== '.';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = m.get(x, y);
    if (k === '.') continue;
    if (!'abf'.includes(k)) { c.set(x, y, k); continue; }
    const leather = k === 'b';
    const outL = !inside(x - 1, y), outU = !inside(x, y - 1), outR = !inside(x + 1, y), outD = !inside(x, y + 1);
    const frontOf = (xx: number, yy: number) => !inside(xx, yy) && c.get(xx, yy) !== '.';
    const edge = (outR && frontOf(x + 1, y)) || (outD && frontOf(x, y + 1)) || (outL && frontOf(x - 1, y)) || (outU && frontOf(x, y - 1));
    let ch: string;
    if (edge && (outR || outD)) ch = leather ? 'Q' : 'D';
    else if (outR || outD) ch = leather ? 'q' : 'S';
    else if ((outL || outU) && !edge) ch = leather ? 'A' : 'w';
    else if (edge) ch = leather ? 'Q' : 'D';
    else ch = leather ? 'a' : 's';
    c.set(x, y, ch);
  }
}

/** Le masque d'un bras : le bras, l'avant-bras avec son brassard (le tiers du milieu), le poing (un carré de 4 px). */
function armMask(a: Arm): Canvas {
  const m = new Canvas(W, H);
  const ru = (a.upper ?? 5) / 2, rf = (a.fore ?? 4) / 2;
  thick(m, a.shoulder, a.elbow, ru, 'a');
  thick(m, a.elbow, a.hand, rf, 'a');
  const lerp = (t: number): P => [a.elbow[0] + (a.hand[0] - a.elbow[0]) * t, a.elbow[1] + (a.hand[1] - a.elbow[1]) * t];
  const band = new Canvas(W, H);
  thick(band, lerp(0.3), lerp(0.62), rf, 'b');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (band.get(x, y) === 'b' && m.get(x, y) === 'a') m.set(x, y, 'b');
  m.ellipse(a.hand[0], a.hand[1], 2.2, 2.2, 'f');
  return m;
}

// ---------- Les outils, dessinés dans le corps ----------

/** Un trait d'un pixel (Bresenham) dans un masque. */
function line(m: Canvas, a: P, b: P, ch: string): void {
  m.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), ch);
}

/**
 * Le marteau : le manche (1 px, 35 cm) du poing vers `dir`, la tête (fer, 3 × 2 px) au bout, en travers du manche. `dir` :
 * vecteur unitaire du poing vers la tête.
 */
function hammer(m: Canvas, hand: P, dir: P, len = 5): P {
  const l = Math.hypot(dir[0], dir[1]);
  const d: P = [dir[0] / l, dir[1] / l];
  const end: P = [Math.round(hand[0] + d[0] * len), Math.round(hand[1] + d[1] * len)];
  line(m, hand, end, 'u');
  // la tête : un bloc de fer de 3 × 2 px centré au bout du manche, sa face du haut au jour
  m.stamp(['JJJ', 'IIi'], end[0] - 1, end[1] - (d[1] > 0 ? 0 : 1));
  return end;
}

// ---------- Les vues fixes, en matière ----------

const BASE: Record<Facing, Grid> = { down: matter('down'), up: matter('up'), right: matter('right') };
const canvasOf = (f: Facing) => Canvas.from(BASE[f]);

// ---------- Respirer ----------

function breath(f: Facing, b: number, pose?: (c: Canvas) => void): Grid {
  const c = canvasOf(f);
  if (pose) pose(c);
  if (b) inhale(c);
  return finish(c.toGrid(), f);
}

// ---------- Marcher ----------

/** De face et de dos : les jambes (y=34 à 44), gauche x=8 à 15, droite x=16 à 23. */
const LEG_L: [number, number] = [8, 15];
const LEG_R: [number, number] = [16, 23];
/** Les avant-bras et les poings (y=26 à 33), à gauche x ≤ 8, à droite x ≥ 23 (les bras de 4 px : x=5 à 8 et 23 à 26). */
const HAND_L: [number, number] = [0, 8];
const HAND_R: [number, number] = [23, 31];

/** Une image de face ou de dos : jambe levée (0 aucune, 'L', 'R'), rebond du corps, retard des cheveux. */
function walkFrontal(f: 'down' | 'up', lift: 0 | 'L' | 'R', bob: number, lag: number): Grid {
  const base = canvasOf(f);
  const legs = new Canvas(W, H);
  for (let y = 34; y <= 44; y++) for (let x = LEG_L[0]; x <= LEG_R[1]; x++) {
    legs.set(x, y, base.get(x, y));
    base.set(x, y, '.');
  }
  const LIFT = 2;
  if (lift) {
    const [x0, x1] = lift === 'L' ? LEG_L : LEG_R;
    move(legs, x0, 34, x1, 44, 0, -LIFT);
  }
  // la main opposée à la jambe levée remonte d'un pixel (l'avant-bras avance, raccourci)
  if (lift) {
    const [x0, x1] = lift === 'L' ? HAND_R : HAND_L;
    move(base, x0, 26, x1, 33, 0, -1);
  }
  const body = new Canvas(W, H);
  body.stamp(base.toGrid(), 0, bob);
  hairLag(body, lag, 22 + bob);
  const c = new Canvas(W, H).stamp(legs.toGrid(), 0, 0).stamp(body.toGrid(), 0, 0);
  return finish(c.toGrid(), f);
}

/** De profil : une jambe, de la hanche (y=34) au pied (y=44), 6 px d'épaisseur, la botte pointe vers la droite. */
function sideLeg(c: Canvas, hip: number, foot: number, near: boolean, lift = 0): void {
  const pants = near ? 'ppppPn' : 'PPPPnn';
  for (let y = 34; y <= 40 - lift; y++) {
    const t = (y - 34) / (6 - lift || 1);
    c.stamp([pants], Math.round(hip + (foot - hip) * Math.min(1, t)), y);
  }
  const boot = near ? ['KKKKKk', 'KKKKkkkm', 'kkkkkkkkm', 'mmmmmmmmm'] : ['kkkkkm', 'kkkkkmmm', 'kkkkkmmmm', 'mmmmmmmmm'];
  boot.forEach((row, i) => c.stamp([row], foot, 41 + i - lift));
}

/** Une image de profil : jambes [hanche, pied, levée] de la jambe du fond et de celle de devant, bras, rebond, cheveux. */
function walkSide(far: [number, number, number], near: [number, number, number], arm: number, bob: number, lag: number): Grid {
  const base = canvasOf('right');
  for (let y = 34; y <= 44; y++) for (let x = 0; x < W; x++) base.set(x, y, '.');
  // l'avant-bras et le poing (x=13 à 19, y=27 à 33) avancent ou reculent ; derrière eux, le tablier et le pantalon
  if (arm) move(base, 13, 27, 19, 33, arm, 0, (_x, y) => base.get(arm > 0 ? 12 : 20, y));
  const c = new Canvas(W, H);
  sideLeg(c, far[0], far[1], false, far[2]);
  sideLeg(c, near[0], near[1], true, near[2]);
  const body = new Canvas(W, H).stamp(base.toGrid(), 0, bob);
  hairLag(body, lag, 22 + bob);
  c.stamp(body.toGrid(), 0, 0);
  return finish(c.toGrid(), 'right');
}

// Le cycle : contact (corps en bas), passage (une jambe levée, corps en haut), contact, passage. Le retard des cheveux suit
// le rebond de l'image d'avant : descendu (1) au contact, remonté (-1) au passage.
const WALK_DOWN = (f: 'down' | 'up') => [
  walkFrontal(f, 0, 1, 1),
  walkFrontal(f, 'L', 0, -1),
  walkFrontal(f, 0, 1, 1),
  walkFrontal(f, 'R', 0, -1),
];
const WALK_RIGHT = [
  walkSide([12, 9, 0], [16, 19, 0], -1, 1, 1), // contact : la jambe de devant en avant, le bras recule
  walkSide([12, 13, 2], [16, 16, 0], 0, 0, -1), // passage : la jambe du fond passe, levée
  walkSide([13, 18, 0], [16, 11, 0], 1, 1, 1), // contact : la jambe du fond en avant, le bras avance
  walkSide([13, 13, 0], [16, 16, 2], 0, 0, -1), // passage : la jambe de devant passe, levée
];

// ---------- Travailler à l'enclume (de face) ----------

/** La table de l'enclume, dans la frame du forgeron qui se tient juste au nord du billot : le fer y est posé (y=34). */
export const ANVIL_TABLE_Y = 34;

interface Strike {
  arm: Arm;
  /** Direction du manche, du poing vers la tête. */
  dir: P;
  /** Le corps se tasse d'un pixel (la tête et les épaules descendent). */
  squash?: boolean;
  spark?: boolean;
}

// Le bras droit du forgeron est à gauche de l'image (il nous fait face). Épaule à (6, 24) ; le deltoïde reste dessiné.
const SHOULDER_R: P = [6, 24];
const STRIKES: Strike[] = [
  // 1. levé haut : le coude en dehors, le poing au-dessus de l'épaule, le marteau dressé, sa tête au niveau du front
  { arm: { shoulder: SHOULDER_R, elbow: [3, 19], hand: [6, 14] }, dir: [0.15, -1] },
  // 2. l'abattu : le bras descend devant l'épaule, le marteau encore dressé, sa tête passe à côté de la joue
  { arm: { shoulder: SHOULDER_R, elbow: [3, 26], hand: [7, 23] }, dir: [0.1, -1] },
  // 3. le coup : le poing devant le ventre, la tête du marteau sur le fer ; le corps se tasse, l'étincelle jaillit
  { arm: { shoulder: SHOULDER_R, elbow: [5, 28], hand: [10, 29] }, dir: [0.75, 1], squash: true, spark: true },
  // 4. le rebond : le marteau remonte de lui-même, le poignet souple, la tête au-dessus du fer
  { arm: { shoulder: SHOULDER_R, elbow: [4, 28], hand: [9, 28] }, dir: [0.5, -1] },
  // 5. le retour : le bras remonte, le coude s'ouvre, le marteau repart vers le haut
  { arm: { shoulder: SHOULDER_R, elbow: [3, 22], hand: [6, 19] }, dir: [0, -1] },
];

/** La main gauche (à droite de l'image) tient la pince : le fer rouge posé sur la table, au milieu. */
const TONGS_ARM: Arm = { shoulder: [25, 25], elbow: [25, 29], hand: [21, 31], upper: 4, fore: 4 };
const IRON_AT: P = [13, ANVIL_TABLE_Y];

function work(s: Strike): Grid {
  const c = canvasOf('down');
  // les deux bras d'origine (sous les deltoïdes) s'effacent ; derrière, le flanc du torse
  for (let y = 25; y <= 33; y++) for (let x = 0; x < W; x++) if (x <= 8 || x >= 23) c.set(x, y, '.');
  if (s.squash) {
    // le tassé : tout ce qui est au-dessus de la taille descend d'un pixel, la rangée des pectoraux se perd
    for (let y = 26; y > 6; y--) for (let x = 0; x < W; x++) c.set(x, y, c.get(x, y - 1));
  }
  const dy = s.squash ? 1 : 0;
  const sh = (p: P): P => [p[0], p[1] + dy];
  // la pince et le fer : deux mâchoires de fer du poing jusqu'au fer, le fer rouge sur la table
  const tongs = armMask({ ...TONGS_ARM, shoulder: sh(TONGS_ARM.shoulder) });
  line(tongs, [TONGS_ARM.hand[0] - 2, TONGS_ARM.hand[1] + 1], [IRON_AT[0] + 3, IRON_AT[1]], 'i');
  line(tongs, [TONGS_ARM.hand[0] - 2, TONGS_ARM.hand[1] + 2], [IRON_AT[0] + 3, IRON_AT[1] + 1], 'j');
  tongs.stamp(['rer'], IRON_AT[0], IRON_AT[1]);
  tongs.stamp(['rr'], IRON_AT[0], IRON_AT[1] + 1);
  layer(c, tongs);
  // le bras du marteau, puis le marteau dans le poing
  const a = s.arm;
  const arm = armMask({ ...a, shoulder: sh(a.shoulder) });
  const tool = new Canvas(W, H);
  hammer(tool, a.hand, s.dir);
  layer(c, arm);
  layer(c, tool);
  const g = finish(c.toGrid(), 'down');
  if (!s.spark) return g;
  // l'étincelle : quelques pixels sans contour, jaillis du fer vers le haut et la droite
  const out = Canvas.from(g);
  for (const [x, y, ch] of [[17, 32, 'z'], [18, 31, 'z'], [16, 31, 'e'], [19, 33, 'e'], [12, 32, 'z']] as [number, number, string][]) out.set(x, y, ch);
  return out.toGrid();
}

/** Durées de chaque image du coup (ms) : le marteau tenu en haut, l'abattu rapide, le coup, le rebond, le retour. */
export const WORK_DURATIONS = [420, 90, 160, 150, 260];

// ---------- Parler ----------

/** De face : le poing droit (à gauche de l'image) sur la hanche, le coude en dehors. */
function akimboDown(c: Canvas): void {
  for (let y = 25; y <= 33; y++) for (let x = 0; x <= 8; x++) c.set(x, y, '.');
  layer(c, armMask({ shoulder: [6, 24], elbow: [3, 28], hand: [10, 31], upper: 4, fore: 4 }));
}
/** De dos : le bras droit est à droite de l'image. */
function akimboUp(c: Canvas): void {
  for (let y = 25; y <= 33; y++) for (let x = 23; x < W; x++) c.set(x, y, '.');
  layer(c, armMask({ shoulder: [25, 24], elbow: [28, 28], hand: [21, 31], upper: 4, fore: 4 }));
}

// ---------- La planche ----------

const IDLE = (f: Facing) => [breath(f, 0), breath(f, 1)];
const TALK: Record<Facing, Grid[]> = {
  down: [breath('down', 0, akimboDown), breath('down', 1, akimboDown)],
  up: [breath('up', 0, akimboUp), breath('up', 1, akimboUp)],
  right: [breath('right', 0), breath('right', 1)],
};

/** Cadences proposées : la respiration lente (1 s par image), le pas lourd (5 images/s, Xéros 8). */
export const IDLE_RATE = 1;
export const WALK_RATE = 5;

const walkRight = WALK_RIGHT;
const workDown = STRIKES.map(work);

/** Les animations du forgeron, au format des personnages du jeu (celui de la mère) : prêtes pour art/characters/smith.ts. */
export const animations: SpriteSheetSource['animations'] = {
  'idle-down': { frames: IDLE('down'), frameRate: IDLE_RATE, repeat: -1 },
  'idle-up': { frames: IDLE('up'), frameRate: IDLE_RATE, repeat: -1 },
  'idle-right': { frames: IDLE('right'), frameRate: IDLE_RATE, repeat: -1 },
  'idle-left': { frames: IDLE('right').map(flipX), frameRate: IDLE_RATE, repeat: -1 },
  'walk-down': { frames: WALK_DOWN('down'), frameRate: WALK_RATE, repeat: -1 },
  'walk-up': { frames: WALK_DOWN('up'), frameRate: WALK_RATE, repeat: -1 },
  'walk-right': { frames: walkRight, frameRate: WALK_RATE, repeat: -1 },
  'walk-left': { frames: walkRight.map(flipX), frameRate: WALK_RATE, repeat: -1 },
  'work-down': { frames: workDown, frameRate: 5, repeat: -1, durations: WORK_DURATIONS },
  'talk-down': { frames: TALK.down, frameRate: IDLE_RATE, repeat: -1 },
  'talk-up': { frames: TALK.up, frameRate: IDLE_RATE, repeat: -1 },
  'talk-right': { frames: TALK.right, frameRate: IDLE_RATE, repeat: -1 },
  'talk-left': { frames: TALK.right.map(flipX), frameRate: IDLE_RATE, repeat: -1 },
};

/** La planche du forgeron, telle qu'elle serait déclarée dans art/index.ts (nom `smith`). */
export const smithSheet: SpriteSheetSource = { kind: 'spritesheet', name: 'smith', frameW: W, frameH: H, palette, animations };

/** Les couleurs utilisées par toutes les images (pour la planche et le rendu). */
export function usedColors(): string[] {
  const set = new Set<string>();
  for (const a of Object.values(animations)) for (const g of a.frames) for (const r of g) for (const ch of r) if (ch !== '.') set.add(ch);
  return [...set].sort();
}
