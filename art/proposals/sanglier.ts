// Essai du sanglier (chantier « sangliers », hors jeu : rien n'entre dans le jeu). Planches : npx tsx tools/essai-sangliers.ts
// (.art-preview/sangliers.png, sangliers-scene.png).
//
// Le sanglier adulte, 80 kg ; dims proposées : w 140 (tête-corps, sans la queue), d 40 (largeur), h 80 (garrot), boîte.
// Gabarit (docs/STYLE.md, section 8, 5 cm par pixel) :
//   - de profil : L × (H + D/2) = 28 × (16 + 4) = 28 × 20 px ;
//   - de face et de dos : W × (H + L/2) = 8 × (16 + 14) = 8 × 30 px (le dos se voit du dessus, en raccourci) ;
//   - mort, couché sur le flanc (140 × 80 × 40) : 28 × (8 + 8) = 28 × 16 ; nord-sud (règle D) 16 × 28.
// Silhouette contour compris, ombre exclue ; pas d'agrandissement.
//
// Méthode : chaque image est un dessin en zones (matières), posé par un petit squelette (corps, tête, quatre pattes, queue), puis
// éclairé en haut à gauche et contouré par art/lib/light.ts (contour d'un pixel : le plus sombre de la robe en haut et à gauche,
// OUTLINE en bas et à droite). Ombre portée `x` dessous, comme le lapin. La gauche est le miroir de la droite (comme le lapin).
//
// Zones : B robe (côté vu), F robe du côté caché (pattes du fond), C soies de la crête et oreilles (le plus sombre), G pattes et
// groin clair (côté vu), J pattes du fond, S groin (le boutoir), H sabots, W défenses, E œil.

import { Canvas, EMPTY, type Grid, type Palette } from '../lib/canvas';
import { lightUp, type Materials } from '../lib/light';
import { world } from '../palette';

/**
 * Robe du sanglier : brun-noir à soies, tirée de l'écorce (M m N K) et de la pierre sombre (z Z), poussée vers le brun-violet de
 * l'humus (`5`) dans l'ombre ; la lumière, la pointe grise des soies au soleil. Le groin et les pattes, plus clairs, gris-brun (la
 * pierre z mêlée à la terre n). Les défenses : le blanc des fleurs `a`, leur ombre le torchis `D`.
 */
export const palette: Palette = {
  q: '#7d6a52', // soies au soleil (le dos, le haut de l'écu) : z mêlé à m
  r: '#56463a', // robe : N mêlé à Z
  s: '#3e322e', // robe à l'ombre : K vers l'humus
  t: world['5'], // le plus sombre : soies de la crête, contour côté lumière, sabots
  g: '#8f7f6a', // groin et bas des pattes au soleil : z mêlé à n
  h: '#6e6052', // groin, pattes
  i: '#52463d', // pattes à l'ombre, pattes du fond
  w: world.a, // défenses
  v: world.D, // défense à l'ombre
  e: '#1e1a1d', // l'œil : l'humus 5 assombri
  d: world.n, // poussière, mottes (terre)
  D: world.u, // poussière au soleil
  y: world['9'], // litière soulevée (feuille pourrie)
  o: world.o,
  x: world.x,
};

const MATS: Materials = {
  B: { light: 'q', base: 'r', shade: 's', dark: 't' },
  // le dessus du dos, tourné vers le ciel : toujours plus clair que les flancs (le trois-quarts se lit par là)
  U: { light: 'q', base: 'q', shade: 'r', dark: 't' },
  F: { light: 'r', base: 's', shade: 's', dark: 't' },
  C: { light: 's', base: 't', shade: 't', dark: 't' },
  G: { light: 'g', base: 'h', shade: 'i', dark: 't' },
  J: { light: 'h', base: 'i', shade: 'i', dark: 't' },
  S: { light: 'g', base: 'g', shade: 'h', dark: 't' },
  H: { light: 't', base: 't', shade: 't', dark: 't' },
  W: { light: 'w', base: 'w', shade: 'v', dark: 't' },
  E: { light: 'e', base: 'e', shade: 'e', dark: 't' },
};

// ---------------------------------------------------------------- de profil (tête à droite)

/** Frame de profil : 48 × 32 ; le bas des sabots (zone) sur la rangée GY, le contour dessous, l'ombre sous le contour. */
export const SIDE = { w: 48, h: 34, gy: 27, ox: 10 } as const;

type Leg = { dx?: number; lift?: number; len?: number; bend?: number };
export interface SidePose {
  /** pattes : avant près (fn), avant loin (ff), arrière près (hn), arrière loin (hf) ; dx du sabot, lift le sabot levé. */
  fn?: Leg; ff?: Leg; hn?: Leg; hf?: Leg;
  /** le groin baissé (+) ou levé (−), en px au bout du groin. */
  head?: number;
  /** la tête poussée en avant (+) ou rentrée (−). */
  headX?: number;
  /** le corps levé (+) ou baissé (−). */
  up?: number;
  /** la croupe levée (+), le garrot fixe. */
  rump?: number;
  /** tout l'animal décalé en x. */
  dx?: number;
  tail?: 'down' | 'up' | 'out';
}

type P = [number, number];

function sideZones(p: SidePose): Canvas {
  const c = new Canvas(SIDE.w, SIDE.h);
  const X = SIDE.ox + (p.dx ?? 0);
  const Y = SIDE.gy - 18; // la rangée 18 locale est le bas des sabots
  const up = p.up ?? 0;
  const rump = p.rump ?? 0;
  // le corps : y local -> écran ; la croupe se lève vers l'arrière
  const by = (x: number, y: number) => Y + y - up - (rump * Math.max(0, 14 - x)) / 12;
  const T = (pts: P[]): P[] => pts.map(([x, y]) => [X + x, by(x, y)]);
  const d = p.head ?? 0;
  const hx = p.headX ?? 0;
  // la tête tourne autour de la nuque (19, 6)
  const H = (pts: P[]): P[] => pts.map(([x, y]) => {
    const k = Math.max(0, (x - 19) / 7);
    return [X + x + hx * Math.max(0, (x - 17) / 9), Y + y - up + d * k];
  });
  const hp = (x: number, y: number): P => H([[x, y]])[0];

  const leg = (hip: P, l: Leg, near: boolean) => {
    const fx = hip[0] + (l.dx ?? 0);
    const x0 = X + hip[0], y0 = by(hip[0], hip[1]);
    // le sabot : au sol (rangée 18) moins `lift`, ou, patte repliée, à `len` sous la hanche
    const x1 = X + fx, y1 = l.len !== undefined ? Math.round(y0) + l.len : Y + 18 - (l.lift ?? 0);
    const bend = l.bend ?? 0;
    const draw = (ax: number, ay: number, bx: number, by_: number) => {
      // ligne suivie pixel par pixel pour colorer selon la hauteur
      const pts: P[] = [];
      const n = Math.max(Math.abs(bx - ax), Math.abs(by_ - ay), 1);
      for (let i = 0; i <= n; i++) pts.push([Math.round(ax + ((bx - ax) * i) / n), Math.round(ay + ((by_ - ay) * i) / n)]);
      return pts;
    };
    // genou : à mi-hauteur, poussé de `bend`
    const kx = (x0 + x1) / 2 + bend, ky = (y0 + y1) / 2;
    const pts = [...draw(x0, y0, kx, ky), ...draw(kx, ky, x1, y1)];
    const yFoot = Math.round(y1);
    const belly = Y - up + 11;
    for (const [x, y] of pts) {
      const z = y >= yFoot ? 'H' : y > belly ? (near ? 'G' : 'J') : near ? 'B' : 'F';
      c.set(x, y, z);
      if (near && z !== 'H') c.set(x + 1, y, z);
      if (near && z === 'H') c.set(x + 1, y, 'H');
    }
  };

  // pattes du fond
  leg([15, 9], p.ff ?? {}, false);
  leg([8, 9], p.hf ?? {}, false);
  // le corps : croupe ronde, dos qui monte vers l'écu (le garrot haut), poitrail profond
  c.polygon(T([[1.5, 6], [3, 4.2], [7, 3.4], [11, 2.4], [13, 1.6], [17, 1.6], [19, 2.6], [20.5, 11], [17, 12], [8, 12], [3.5, 11.4], [1.6, 9.5]]), 'B');
  // le dessus du dos, en raccourci : trois rangées sous l'arête, plus claires
  for (let x = 2; x <= 18; x++) {
    let n = 0;
    for (let y = 0; y < SIDE.h && n < 3; y++) if (c.get(X + x, y) === 'B') { c.set(X + x, y, 'U'); n++; }
  }
  // la queue, fine, et son pinceau
  const tail = p.tail ?? 'down';
  const tb = T([[1, 5]])[0];
  if (tail === 'down') { c.line(tb[0], tb[1], tb[0], tb[1] + 4, 'C'); }
  else if (tail === 'up') { c.line(tb[0], tb[1], tb[0] - 1, tb[1] - 3, 'C'); }
  else { c.line(tb[0], tb[1], tb[0] - 2, tb[1] + 2, 'C'); }
  // la tête : lourde, en coin, le tiers de la longueur ; le boutoir au bout
  c.polygon(H([[18, 2.6], [20.5, 3], [23, 5.6], [25.6, 8.4], [27, 9], [27, 13], [24, 13.6], [20.5, 12.6], [18, 11]]), 'B');
  // l'oreille, courte, dressée en arrière du crâne, au-dessus de la nuque (le creux entre l'écu et la tête)
  for (const [x, y] of [[20, 1], [20, 2], [21, 2]] as P[]) { const q = hp(x, y); c.set(Math.round(q[0]), Math.round(q[1]), 'C'); }
  // pattes du côté vu
  leg([5, 9], p.hn ?? {}, true);
  leg([17, 9], p.fn ?? {}, true);
  // la crête de soies sur l'écu (une bande sombre sous l'arête du dos)
  // des soies qui dépassent de l'arête, sur l'écu
  for (const x of [11, 13, 15]) {
    let y = 0;
    while (y < SIDE.h && c.get(X + x, y) === EMPTY) y++;
    if (y > 0 && y < SIDE.h) c.set(X + x, y - 1, 'C');
  }
  // le groin (boutoir), l'œil, la défense
  for (const [x, y] of [[26, 9], [26, 10], [26, 11], [26, 12], [25, 11], [25, 12], [24, 12], [24, 13], [25, 13]] as P[]) {
    const q = hp(x, y);
    if (c.get(Math.round(q[0]), Math.round(q[1])) !== EMPTY) c.set(Math.round(q[0]), Math.round(q[1]), 'S');
  }
  const e = hp(21, 5.5);
  c.set(Math.round(e[0]), Math.round(e[1]), 'E');
  const t1 = hp(23, 11), t2 = hp(23, 10), t3 = hp(24, 9);
  for (const t of [t1, t2, t3]) c.set(Math.round(t[0]), Math.round(t[1]), 'W');
  return c;
}

/** Ombre portée : une rangée sous le contour, sous la largeur du corps décalée d'un pixel ; plus courte en l'air. */
function withShadow(g: Grid, ground: number, air = 0, from?: number, to?: number): Grid {
  const c = Canvas.from(g);
  let a = g[0].length, b = -1;
  for (let x = 0; x < g[0].length; x++) {
    for (let y = 0; y < g.length; y++) if (g[y][x] !== EMPTY) { a = Math.min(a, x); b = Math.max(b, x); break; }
  }
  if (from !== undefined) a = from;
  if (to !== undefined) b = to;
  for (let x = a + 1 + air; x <= b + 1 - air; x++) if (c.get(x, ground) === EMPTY) c.set(x, ground, 'x');
  // sous les sabots posés, l'ombre touche le contour
  return c.toGrid();
}

/** Une image de profil, éclairée, avec son ombre. `air` : en l'air, l'ombre raccourcit. */
export function side(p: SidePose, air = 0): Grid {
  const z = sideZones(p);
  const lit = lightUp(z.toGrid(), MATS);
  const body = bodyRange(lit, SIDE.gy - 6);
  return withShadow(lit, SIDE.gy + 2, air, body[0] + 1, body[1]);
}

/** L'étendue en x du corps (rangée `row`). */
function bodyRange(g: Grid, row: number): [number, number] {
  let a = g[0].length, b = 0;
  for (let y = row - 4; y <= row; y++) for (let x = 0; x < g[0].length; x++) if (g[y]?.[x] && g[y][x] !== EMPTY) { a = Math.min(a, x); b = Math.max(b, x); }
  return [a, b];
}

/** Ajoute des pixels après l'éclairage (poussière, mottes) : [x, y, couleur]. */
export function dab(g: Grid, px: [number, number, string][]): Grid {
  const c = Canvas.from(g);
  for (const [x, y, k] of px) if (c.get(x, y) === EMPTY || c.get(x, y) === 'x') c.set(x, y, k);
  return c.toGrid();
}

// ---------------------------------------------------------------- de face et de dos

/** Frame de face et de dos : 16 × 40 ; le bas des sabots (zone) sur la rangée GY. */
export const FRONT = { w: 18, h: 46, gy: 38, ox: 5 } as const;

export interface FrontPose {
  /** pattes gauche et droite (à l'écran) levées. */
  ll?: number; rl?: number;
  /** pattes écartées (sonné). */
  splay?: number;
  /** la tête balancée en x (de face), baissée (+) en px. */
  hx?: number; hd?: number;
  /** le corps levé (+) ou baissé (−). */
  up?: number;
  /** tout l'animal décalé en y (recul : − vers le nord). */
  dy?: number;
  dx?: number;
}

function frontZones(p: FrontPose): Canvas {
  const c = new Canvas(FRONT.w, FRONT.h);
  const X = FRONT.ox + (p.dx ?? 0);
  const Y = FRONT.gy - 28 + (p.dy ?? 0); // rangée 28 locale : bas des sabots
  const up = p.up ?? 0;
  const s = p.splay ?? 0;
  const hx = p.hx ?? 0, hd = p.hd ?? 0;
  const R = (x: number, y: number, w: number, h: number, z: string) => c.rect(X + x, Y + y - up, w, h, z);
  // pattes de devant, aux bords, sous les épaules
  const legF = (x: number, lift: number, out: number) => {
    const top = 20, foot = 28 - lift + up;
    for (let y = top; y <= foot; y++) {
      const xx = x + Math.round((out * (y - top)) / 8);
      c.set(X + xx, Y + y - up, y === foot ? 'H' : y >= 23 ? 'G' : 'F');
    }
  };
  legF(1, p.ll ?? 0, -s);
  legF(6, p.rl ?? 0, s);
  // le dos, vu du dessus en raccourci : la croupe au loin (en haut), l'écu large au garrot
  c.polygon([[X + 2, Y + 1 - up], [X + 6, Y + 1 - up], [X + 7, Y + 4 - up], [X + 7, Y + 21 - up], [X + 1, Y + 21 - up], [X + 1, Y + 4 - up]], 'B');
  // le dessus du dos, vu du ciel : clair ; la crête de soies au milieu
  c.within('B', () => c.rect(X + 1, Y + 1 - up, 6, 13, 'U'));
  R(3, 3, 2, 1, 'C'); R(4, 4, 1, 8, 'C'); R(3, 9, 1, 3, 'C');
  // épaules dans l'ombre, de part et d'autre de la tête
  R(1, 14, 1, 7, 'F'); R(6, 14, 1, 7, 'F');
  // la tête, plus étroite (4 px), devant l'écu ; elle balance et se baisse
  const hy = 12 + hd;
  c.polygon([[X + 2 + hx, Y + hy - up], [X + 6 + hx, Y + hy - up], [X + 6 + hx, Y + hy + 10 - up], [X + 5 + hx, Y + hy + 12 - up], [X + 3 + hx, Y + hy + 12 - up], [X + 2 + hx, Y + hy + 10 - up]], 'B');
  // oreilles, yeux, boutoir, défenses
  c.set(X + 2 + hx, Y + hy - 1 - up, 'C').set(X + 5 + hx, Y + hy - 1 - up, 'C');
  c.set(X + 2 + hx, Y + hy + 3 - up, 'E').set(X + 5 + hx, Y + hy + 3 - up, 'E');
  c.rect(X + 3 + hx, Y + hy + 8 - up, 2, 4, 'S');
  // les défenses, blanches, qui sortent des babines vers le haut et le côté
  c.set(X + 2 + hx, Y + hy + 9 - up, 'W').set(X + 1 + hx, Y + hy + 8 - up, 'W');
  c.set(X + 5 + hx, Y + hy + 9 - up, 'W').set(X + 6 + hx, Y + hy + 8 - up, 'W');
  return c;
}

function backZones(p: FrontPose): Canvas {
  const c = new Canvas(FRONT.w, FRONT.h);
  const X = FRONT.ox + (p.dx ?? 0);
  const Y = FRONT.gy - 28 + (p.dy ?? 0);
  const up = p.up ?? 0;
  const s = p.splay ?? 0;
  const hx = p.hx ?? 0, hd = p.hd ?? 0;
  // la tête au loin (en haut) : le dessus du crâne et les oreilles ; baissée, elle se cache derrière l'écu
  const hy = 1 + hd;
  c.polygon([[X + 2 + hx, Y + hy + 1 - up], [X + 6 + hx, Y + hy + 1 - up], [X + 6 + hx, Y + hy + 6 - up], [X + 2 + hx, Y + hy + 6 - up]], 'B');
  c.set(X + 2 + hx, Y + hy - up, 'C').set(X + 5 + hx, Y + hy - up, 'C');
  // pattes arrière
  const legH = (x: number, lift: number, out: number) => {
    const top = 21, foot = 28 - lift + up;
    for (let y = top; y <= foot; y++) {
      const xx = x + Math.round((out * (y - top)) / 7);
      c.set(X + xx, Y + y - up, y === foot ? 'H' : y >= 24 ? 'G' : 'B');
    }
  };
  // le dos : l'écu large au loin, puis le dos, la croupe ronde devant (en bas)
  c.polygon([[X + 1, Y + 6 - up], [X + 7, Y + 6 - up], [X + 7, Y + 21 - up], [X + 6, Y + 23 - up], [X + 2, Y + 23 - up], [X + 1, Y + 21 - up]], 'B');
  // le dessus du dos, clair ; la croupe (en bas) reste face au sud ; la crête
  c.within('B', () => c.rect(X + 1, Y + 6 - up, 6, 11, 'U'));
  for (let y = 6; y <= 13; y++) c.set(X + 4, Y + y - up, 'C');
  c.set(X + 3, Y + 7 - up, 'C');
  legH(1, p.ll ?? 0, -s);
  legH(6, p.rl ?? 0, s);
  // entre les jambons, l'ombre ; la queue fine et son pinceau
  for (let y = 21; y <= 22; y++) c.set(X + 4, Y + y - up, 'F');
  const tx = X + 4 + (p.hx ? -Math.sign(p.hx) : 0);
  for (let y = 15; y <= 19; y++) c.set(tx, Y + y - up, 'C');
  return c;
}

function frontish(z: Canvas, air = 0): Grid {
  const lit = lightUp(z.toGrid(), MATS);
  let a = 99, b = 0;
  for (let y = 0; y < lit.length; y++) for (let x = 0; x < lit[0].length; x++) if (lit[y][x] !== EMPTY) { a = Math.min(a, x); b = Math.max(b, x); }
  return withShadow(lit, FRONT.gy + 2, air, a, b);
}
export const front = (p: FrontPose, air = 0) => frontish(frontZones(p), air);
export const back = (p: FrontPose, air = 0) => frontish(backZones(p), air);

// ---------------------------------------------------------------- couché (mort, bauge)

/** Mort, couché sur le flanc droit, tête à droite, le dos au nord, les pattes raides vers le sud ; zones 26 × 14 (+ contour). */
function lyingZones(legs = 1, lift = 0): Canvas {
  const c = new Canvas(30, 18);
  const X = 1, Y = 1 - lift;
  // le flanc vu du dessus (le côté qui est en l'air), le dos en haut
  c.polygon([[X + 1.5, Y + 4], [X + 4, Y + 1.5], [X + 10, Y + 0.6], [X + 17, Y + 0.6], [X + 20, Y + 1.6], [X + 20.5, Y + 10], [X + 16, Y + 10.6], [X + 6, Y + 10.6], [X + 2.5, Y + 9.5], [X + 1.5, Y + 7]], 'B');
  // la crête, sur le dos (au nord)
  for (let x = 6; x <= 17; x++) c.set(X + x, Y + 1, 'C');
  // le ventre clair, au sud
  for (let x = 6; x <= 17; x++) c.set(X + x, Y + 10, 'G');
  // la tête posée, le groin à droite, la défense en l'air
  c.polygon([[X + 18, Y + 1.5], [X + 21, Y + 2.5], [X + 26, Y + 5.5], [X + 27, Y + 6], [X + 27, Y + 9], [X + 24, Y + 9.8], [X + 19, Y + 10]], 'B');
  c.set(X + 26, Y + 6, 'S').set(X + 26, Y + 7, 'S').set(X + 26, Y + 8, 'S').set(X + 25, Y + 7, 'S');
  c.set(X + 24, Y + 5, 'W').set(X + 24, Y + 6, 'W');
  c.set(X + 19, Y + 1, 'C');
  // la queue
  c.line(X + 1, Y + 5, X + 1, Y + 8, 'C');
  // les pattes raides, vers le sud-est ; `legs` : 1 tendues, 0.5 à demi
  // raides : celles de devant tendues vers l'avant, celles de derrière vers l'arrière, à plat sur le sol
  const L = Math.round(5 * legs);
  for (const [hx, near, dir] of [[7, false, -1], [9, true, -1], [15, false, 1], [17, true, 1]] as [number, boolean, number][]) {
    for (let k = 1; k <= L; k++) {
      const x = X + hx + dir * Math.ceil(k * 0.7), y = Y + 10 + k;
      c.set(x, y, k === L ? 'H' : near ? 'G' : 'J');
      if (near && k < L) c.set(x, y + 1, 'G');
    }
  }
  return c;
}

/** Couché à la bauge : sur le ventre, les pattes repliées dessous, le groin posé ; `breath` : le dos qui monte. */
function beddedZones(breath = 0): Canvas {
  const z = sideZones({
    fn: { len: 2, dx: 2 }, ff: { len: 2, dx: 2 }, hn: { len: 2, dx: 2 }, hf: { len: 2, dx: 2 },
    up: -6, head: 2,
  });
  if (breath) {
    // le dos monte d'un pixel au milieu : on ajoute une rangée au-dessus de l'arête
    const g = z.toGrid();
    for (let x = 0; x < SIDE.w; x++) {
      const y = g.findIndex((r) => r[x] !== EMPTY);
      if (y > 0 && x > SIDE.ox + 5 && x < SIDE.ox + 15 && g[y][x] === 'B' || (y > 0 && g[y]?.[x] === 'C' && x > SIDE.ox + 5 && x < SIDE.ox + 15)) z.set(x, y - 1, 'B');
    }
  }
  return z;
}

// ---------------------------------------------------------------- les animations

export interface Anim { frames: Grid[]; ms: number[]; loop: boolean; note: string }
export type Dir = 'right' | 'down' | 'up';

const stand: SidePose = {};

/** Poussière aux sabots (profil) : quelques pixels derrière un sabot. */
const dustAt = (x: number, y: number, n: number): [number, number, string][] => {
  const out: [number, number, string][] = [[x, y, 'D'], [x - 1, y, 'd'], [x - 1, y - 1, 'D']];
  if (n > 1) out.push([x - 2, y - 1, 'd'], [x - 3, y - 2, 'y'], [x - 2, y - 2, 'D']);
  if (n > 2) out.push([x - 4, y - 1, 'd'], [x - 5, y - 3, 'D'], [x - 3, y - 3, 'd']);
  return out;
};

const G = SIDE.gy;
const OX = SIDE.ox;

export const walk: Record<Dir, Anim> = {
  right: {
    note: 'au pas, 1,2 m/s ; pas diagonal',
    ms: [150, 150, 150, 150],
    loop: true,
    frames: [
      side({ fn: { dx: 2 }, hf: { dx: 1 }, ff: { dx: -1 }, hn: { dx: -2 } }),
      side({ fn: { dx: 0 }, hf: { dx: 0 }, ff: { dx: 1, lift: 1 }, hn: { dx: 0, lift: 1 }, head: 1 }),
      side({ fn: { dx: -1 }, hf: { dx: -2 }, ff: { dx: 2 }, hn: { dx: 1 } }),
      side({ fn: { dx: 1, lift: 1 }, hf: { dx: 0, lift: 1 }, ff: { dx: 0 }, hn: { dx: -1 }, head: 1 }),
    ],
  },
  down: {
    note: 'au pas, de face',
    ms: [150, 150, 150, 150],
    loop: true,
    frames: [front({}), front({ ll: 1, hd: 1 }), front({}), front({ rl: 1, hd: 1 })],
  },
  up: {
    note: 'au pas, de dos',
    ms: [150, 150, 150, 150],
    loop: true,
    frames: [back({}), back({ ll: 1, hx: 1 }), back({}), back({ rl: 1, hx: -1 })],
  },
};

export const announce: Record<Dir, Anim> = {
  right: {
    note: 'annonce 0,6 s : tete basse, la patte gratte, la queue levee',
    ms: [150, 150, 150, 150],
    loop: false,
    frames: [
      side({ head: 3, tail: 'up', fn: { dx: -1, lift: 1 } }),
      side({ head: 3, tail: 'up', fn: { dx: 2, lift: 2 } }),
      dab(side({ head: 3, tail: 'up', fn: { dx: -3 } }), dustAt(OX + 14, G + 1, 2)),
      dab(side({ head: 4, tail: 'up', up: -1 }), dustAt(OX + 12, G, 3)),
    ],
  },
  down: {
    note: 'annonce, de face',
    ms: [150, 150, 150, 150],
    loop: false,
    frames: [
      front({ hd: 2, rl: 2 }),
      front({ hd: 2, rl: 0 }),
      dab(front({ hd: 3, rl: 1 }), [[FRONT.ox + 8, FRONT.gy + 1, 'D'], [FRONT.ox + 9, FRONT.gy, 'd'], [FRONT.ox + 9, FRONT.gy + 2, 'D']]),
      dab(front({ hd: 3, up: -1 }), [[FRONT.ox + 8, FRONT.gy + 1, 'd'], [FRONT.ox + 10, FRONT.gy - 1, 'D'], [FRONT.ox - 1, FRONT.gy, 'y']]),
    ],
  },
  up: {
    note: 'annonce, de dos',
    ms: [150, 150, 150, 150],
    loop: false,
    frames: [
      back({ hd: 2, rl: 1 }),
      back({ hd: 3 }),
      dab(back({ hd: 3, rl: 1 }), [[FRONT.ox + 7, FRONT.gy + 2, 'D'], [FRONT.ox + 8, FRONT.gy + 3, 'd']]),
      dab(back({ hd: 3, up: -1 }), [[FRONT.ox + 7, FRONT.gy + 3, 'd'], [FRONT.ox + 9, FRONT.gy + 2, 'D']]),
    ],
  },
};

export const charge: Record<Dir, Anim> = {
  right: {
    note: 'charge, galop 11 m/s : etire, ramasse ; poussiere aux sabots',
    ms: [80, 80, 80, 80],
    loop: true,
    frames: [
      // étiré, en l'air
      dab(side({ head: 2, up: 1, fn: { dx: 4, lift: 2 }, ff: { dx: 3, lift: 1 }, hn: { dx: -4, lift: 1 }, hf: { dx: -3, lift: 2 }, tail: 'out' }, 2), dustAt(OX + 2, G, 3)),
      // l'avant pose
      dab(side({ head: 3, fn: { dx: 2 }, ff: { dx: 4, lift: 1 }, hn: { dx: -3, lift: 2 }, hf: { dx: -1, lift: 2, bend: 1 }, tail: 'out' }), dustAt(OX + 18, G + 1, 1)),
      // ramassé : les pattes sous le corps
      dab(side({ head: 2, up: 1, rump: 1, fn: { dx: -2, lift: 2, bend: -1 }, ff: { dx: -1, lift: 1 }, hn: { dx: 4, lift: 1 }, hf: { dx: 5, lift: 2 }, tail: 'out' }, 2), dustAt(OX + 15, G + 1, 2)),
      // l'arrière pousse
      dab(side({ head: 3, fn: { dx: 1, lift: 2, bend: 1 }, ff: { dx: 0, lift: 2 }, hn: { dx: 1 }, hf: { dx: 3 }, tail: 'out' }), dustAt(OX + 6, G + 1, 3)),
    ],
  },
  down: {
    note: 'charge, de face : la tete basse, les defenses devant',
    ms: [80, 80, 80, 80],
    loop: true,
    frames: [
      dab(front({ hd: 2, up: 1, ll: 2, rl: 1 }, 1), [[FRONT.ox, FRONT.gy + 1, 'D'], [FRONT.ox + 8, FRONT.gy, 'd']]),
      dab(front({ hd: 3, ll: 0, rl: 2 }), [[FRONT.ox - 1, FRONT.gy, 'd'], [FRONT.ox + 9, FRONT.gy + 1, 'D'], [FRONT.ox + 10, FRONT.gy, 'y']]),
      dab(front({ hd: 2, up: 1, ll: 1, rl: 2 }, 1), [[FRONT.ox + 8, FRONT.gy + 2, 'D'], [FRONT.ox - 1, FRONT.gy + 1, 'd']]),
      dab(front({ hd: 3, ll: 2, rl: 0 }), [[FRONT.ox - 1, FRONT.gy + 1, 'D'], [FRONT.ox - 2, FRONT.gy, 'd'], [FRONT.ox + 9, FRONT.gy, 'y']]),
    ],
  },
  up: {
    note: 'charge, de dos : la poussiere jaillit derriere',
    ms: [80, 80, 80, 80],
    loop: true,
    frames: [
      dab(back({ hd: 3, up: 1, ll: 2, rl: 1 }, 1), [[FRONT.ox + 1, FRONT.gy + 3, 'D'], [FRONT.ox + 2, FRONT.gy + 4, 'd'], [FRONT.ox, FRONT.gy + 4, 'y']]),
      dab(back({ hd: 3, ll: 0, rl: 2 }), [[FRONT.ox + 6, FRONT.gy + 3, 'D'], [FRONT.ox + 7, FRONT.gy + 4, 'd'], [FRONT.ox + 5, FRONT.gy + 4, 'D']]),
      dab(back({ hd: 3, up: 1, ll: 1, rl: 2 }, 1), [[FRONT.ox + 1, FRONT.gy + 4, 'd'], [FRONT.ox + 6, FRONT.gy + 3, 'y']]),
      dab(back({ hd: 3, ll: 2, rl: 0 }), [[FRONT.ox + 1, FRONT.gy + 3, 'D'], [FRONT.ox + 2, FRONT.gy + 4, 'D'], [FRONT.ox, FRONT.gy + 3, 'd']]),
    ],
  },
};

/** Le choc : `trunk` dit où est le tronc dans l'image (le dessin le pose). */
export interface Impact extends Anim { trunk: { dir: Dir; x: number; front: boolean } }

export const impact: Record<'right' | 'down' | 'up', Impact> = {
  right: {
    note: 'choc contre un arbre : arret net, la tete cogne, le recul',
    ms: [60, 120, 150, 200],
    loop: false,
    trunk: { dir: 'right', x: OX + 28, front: false },
    frames: [
      side({ head: 3, fn: { dx: 3 }, ff: { dx: 4, lift: 1 }, hn: { dx: -3, lift: 1 }, hf: { dx: -2 }, tail: 'out' }),
      dab(side({ head: -1, headX: -1, rump: 2, fn: { dx: 3, bend: 1 }, ff: { dx: 3 }, hn: { dx: 1, lift: 1 }, hf: { dx: 2, lift: 2 }, tail: 'up' }), [[OX + 27, G - 9, 'D'], [OX + 27, G - 4, 'y'], [OX + 26, G - 11, 'd']]),
      side({ dx: -3, head: -2, up: 0, fn: { dx: 3 }, ff: { dx: 4 }, hn: { dx: -1 }, hf: { dx: 0 }, tail: 'down' }),
      side({ dx: -4, head: 2, fn: { dx: 2 }, ff: { dx: -1 }, hn: { dx: -2 }, hf: { dx: 1 }, tail: 'down' }),
    ],
  },
  up: {
    note: 'choc, de dos : le tronc devant lui (au nord)',
    ms: [60, 120, 150, 200],
    loop: false,
    trunk: { dir: 'up', x: FRONT.ox - 2, front: false },
    frames: [
      back({ hd: 3, dy: 0 }),
      back({ hd: 0, dy: 0, up: 1, ll: 1 }),
      back({ hd: -1, dy: 3 }),
      back({ hd: 1, dy: 4, splay: 1 }),
    ],
  },
  down: {
    note: 'choc, de face : le tronc devant lui le cache, il le frappe de l epaule',
    ms: [60, 120, 150, 200],
    loop: false,
    trunk: { dir: 'down', x: FRONT.ox + 4, front: true },
    frames: [
      front({ hd: 3 }),
      front({ hd: 0, up: 1, rl: 1 }),
      front({ hd: -1, dy: -3 }),
      front({ hd: 1, dy: -4, splay: 1 }),
    ],
  },
};

export const dazed: Record<'right' | 'down', Anim> = {
  right: {
    note: 'sonne, en boucle : il titube, la tete balance, les pattes ecartees',
    ms: [250, 250, 250, 250],
    loop: true,
    frames: [
      side({ dx: -4, head: 3, fn: { dx: 3 }, ff: { dx: -2 }, hn: { dx: -3 }, hf: { dx: 2 } }),
      side({ dx: -4, head: 1, up: -1, fn: { dx: 3, bend: 1 }, ff: { dx: -2 }, hn: { dx: -3, bend: -1 }, hf: { dx: 2 } }),
      side({ dx: -5, head: 4, fn: { dx: 4 }, ff: { dx: -1 }, hn: { dx: -2 }, hf: { dx: 2 } }),
      side({ dx: -4, head: 2, up: -1, fn: { dx: 3 }, ff: { dx: -2, bend: 1 }, hn: { dx: -3 }, hf: { dx: 1 } }),
    ],
  },
  down: {
    note: 'sonne, de face',
    ms: [250, 250, 250, 250],
    loop: true,
    frames: [
      front({ splay: 1, hx: -1, hd: 2 }),
      front({ splay: 1, hx: 0, hd: 3, up: -1 }),
      front({ splay: 1, hx: 1, hd: 2 }),
      front({ splay: 1, hx: 0, hd: 1, up: -1 }),
    ],
  },
};

function fromLying(z: Canvas, lift = 0): Grid {
  const lit = lightUp(z.toGrid(), MATS);
  // posé dans la frame de profil : le bas du dessin (pattes) au sol
  const c = new Canvas(SIDE.w, SIDE.h);
  c.stamp(lit, SIDE.ox - 1, SIDE.gy + 2 - lit.length + lift);
  const g = c.toGrid();
  return castShadowRow(g);
}

/** Ombre d'un corps couché : un pixel au sud-est de toute la silhouette (il est à plat). */
function castShadowRow(g: Grid): Grid {
  const c = Canvas.from(g);
  for (let y = 1; y < g.length; y++) for (let x = 1; x < g[0].length; x++) {
    if (g[y][x] === EMPTY && g[y - 1][x - 1] !== EMPTY && g[y - 1][x - 1] !== 'x') c.set(x, y, 'x');
  }
  return c.toGrid();
}

export const death: Anim = {
  note: 'mort : les pattes plient, il tombe sur le flanc',
  ms: [150, 200, 200, 2000],
  loop: false,
  frames: [
    side({ head: 2, up: -2, fn: { len: 5, dx: 2, bend: 2 }, ff: { len: 5, dx: 2, bend: 2 }, hn: { dx: -1 }, hf: { dx: 0 } }),
    side({ head: 0, up: -5, rump: -1, fn: { len: 3, dx: 3 }, ff: { len: 3, dx: 3 }, hn: { len: 3, dx: 3 }, hf: { len: 3, dx: 3 } }),
    fromLying(lyingZones(0.5, 0)),
    fromLying(lyingZones(1)),
  ],
};

export const bed: Anim = {
  note: 'couche a la bauge : il respire',
  ms: [900, 900],
  loop: true,
  frames: [lightShadow(beddedZones(0)), lightShadow(beddedZones(1))],
};

function lightShadow(z: Canvas): Grid {
  const lit = lightUp(z.toGrid(), MATS);
  return withShadow(lit, SIDE.gy + 2, 0);
}

export const root: Anim = {
  note: 'fouille : le groin au sol, la terre vole',
  ms: [200, 200, 200, 200],
  loop: true,
  frames: [
    side({ head: 4, up: -1, fn: { dx: 1 }, ff: { dx: 0 }, hn: { dx: -1 } }),
    dab(side({ head: 4, headX: 1, up: -1, fn: { dx: 1 }, ff: { dx: 0 }, hn: { dx: -1 } }), [[OX + 29, G - 1, 'd'], [OX + 30, G - 3, 'y'], [OX + 28, G - 4, 'd']]),
    dab(side({ head: 3, up: -1, fn: { dx: 1 }, ff: { dx: 0 }, hn: { dx: -1 } }), [[OX + 30, G - 5, 'd'], [OX + 31, G - 3, 'D']]),
    side({ head: 4, headX: -1, up: -1, fn: { dx: 1 }, ff: { dx: 0 }, hn: { dx: -1 } }),
  ],
};

// ---------------------------------------------------------------- le sanglier mort, au sol

function rotateCW(g: Grid): Grid {
  const h = g.length, w = g[0].length;
  return Array.from({ length: w }, (_, y) => Array.from({ length: h }, (_, x) => g[h - 1 - x][y]).join(''));
}
function trim(g: Grid): Grid {
  const filled = (r: string) => /[^.]/.test(r);
  const y0 = g.findIndex(filled);
  const y1 = g.length - 1 - [...g].reverse().findIndex(filled);
  const kept = g.slice(y0, y1 + 1);
  const x0 = Math.min(...kept.filter(filled).map((r) => r.search(/[^.]/)));
  const x1 = Math.max(...kept.filter(filled).map((r) => r.length - 1 - [...r].reverse().join('').search(/[^.]/)));
  return kept.map((r) => r.slice(x0, x1 + 1));
}

/** Les quatre vues au sol du sanglier mort : est-ouest (tête à l'est), puis un quart de tour de plus à chaque fois (règle D). */
export const deadViews: Grid[] = (() => {
  const z = trimZones(lyingZones(1).toGrid());
  const r1 = rotateCW(z), r2 = rotateCW(r1), r3 = rotateCW(r2);
  return [z, r1, r2, r3].map((v) => castShadowRow(pad(trim(lightUp(pad(v), MATS)))));
})();
function trimZones(g: Grid): Grid { return trim(g); }
function pad(g: Grid): Grid {
  const w = g[0].length + 2;
  return ['.'.repeat(w), ...g.map((r) => `.${r}.`), '.'.repeat(w)];
}

export const anims = { walk, announce, charge, impact, dazed, death, bed, root };
export { stand };
