// Xéros renversé par la charge du sanglier, essai 2 (chantier « sangliers », hors jeu ; art/characters/xeros.ts n'est pas touché).
// Planche : npx tsx tools/essai-sangliers-bc.ts (.art-preview/sangliers-xeros-renverse-2.png). Base : art/proposals/xeros-renverse.ts
// (copié ici, pas importé, pour que l'essai 1 reste intact).
//
// Retours de Grégoire sur l'essai 1, appliqués ici :
//   - la chute en travers est gardée de face et de dos ; les variantes nord-sud sont abandonnées ;
//   - de profil, l'image où il est percuté n'est plus un cisaillement de la vue debout : le buste part en arrière, les bras
//     volent (celui de devant lancé en l'air, celui du fond rejeté derrière), les jambes décollent, balayées vers l'avant ;
//   - couché : les bras le long du corps, un coude plié (la main sur le ventre), les jambes jointes : il ne fait plus étoile ;
//   - assis et à genoux plus vivants : assis, une main au sol pour se pousser, l'autre à la tête qui se secoue (deux traits) ;
//     à genoux, le poids sur la jambe de devant, une main appuyée sur le genou ;
//   - la glissade de 2,5 m (50 px), poussée par le jeu, est gardée.
//
// Le geste : percuté, en l'air, il tombe sur le dos et glisse, reste à terre, s'assoit, se met à genoux, se relève. Toujours
// renversé à l'opposé de sa direction : tourné vers l'est, il tombe vers l'ouest. De face et de dos, il tourne en l'air et
// retombe en travers (est-ouest).
//
// Frame : 64 × 48 ; les pieds de Xéros debout en (32, 45). Couché, le corps est centré sur ce point.

import { Canvas, EMPTY, selOut, type Grid, type Palette } from '../lib/canvas';
import { world } from '../palette';
import {
  W, H, HEAD_Y, BODY_Y, FRONT_X, SIDE_X, palette as xp, DARK, headFront, headBack, torsoFront, torsoBack, legLeft, legRight, LEG_L, LEG_R,
  headSide, bodySide, legSide, LEG_SIDE, backLeg, rim, arm, bareTorso,
} from '../characters/xeros-body';

/** La palette de Xéros, plus la poussière (des signes que sa planche n'emploie pas). */
export const palette: Palette = { ...xp, 1: world.n, 2: world.u, 3: world['9'] };

export const FW = 64, FH = 48;
const OX = (FW - W) / 2;

export interface Anim { frames: Grid[]; ms: number[]; note: string; slide: number[] }
type V = [number, number];
type Dab = [number, number, string];

// ---------------------------------------------------------------- outils

function wide(g: Grid, dx = 0, dy = 0): Canvas {
  return new Canvas(FW, FH).stamp(g, OX + dx, dy);
}
const transpose = (g: Grid): Grid => Array.from({ length: g[0].length }, (_, y) => Array.from({ length: g.length }, (_, x) => g[x][y]).join(''));

function standShadow(c: Canvas, dx = 0) {
  const s = new Canvas(FW, FH);
  s.ellipse(OX + 16.5 + dx, 45.5, 5.5, 2, 'x');
  s.toGrid().forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'x' && c.get(x, y) === EMPTY) c.set(x, y, 'x'); }));
}
function flatShadow(g: Grid): Grid {
  const c = Canvas.from(g);
  for (let y = 1; y < g.length; y++) for (let x = 1; x < g[0].length; x++) {
    if (g[y][x] === EMPTY && g[y - 1][x - 1] !== EMPTY && !'x123'.includes(g[y - 1][x - 1])) c.set(x, y, 'x');
  }
  return c.toGrid();
}
function dab(g: Grid, px: Dab[]): Grid {
  const c = Canvas.from(g);
  for (const [x, y, k] of px) if (c.get(x, y) === EMPTY || c.get(x, y) === 'x') c.set(x, y, k);
  return c.toGrid();
}
const puff = (x: number, y: number, n: number, dir = 1): Dab[] => {
  const o: Dab[] = [[x, y, '2'], [x + dir, y, '1'], [x, y - 1, '1'], [x + dir, y - 1, '2']];
  if (n > 1) o.push([x + 2 * dir, y - 1, '1'], [x + 2 * dir, y - 2, '2'], [x - dir, y, '3'], [x + dir, y - 2, '1']);
  if (n > 2) o.push([x + 3 * dir, y - 2, '1'], [x + 3 * dir, y - 3, '2'], [x + 2 * dir, y - 3, '3'], [x + 4 * dir, y - 1, '2']);
  return o;
};
/** Recontoure une silhouette (de toute taille) : un pixel de contour là où la matière touche le vide, puis le côté lumière. */
function reoutline(c: Canvas): Grid {
  const add: V[] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.get(x, y) !== EMPTY) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const k = c.get(x + dx, y + dy); return k !== EMPTY && k !== 'x' && k !== 'o'; })) add.push([x, y]);
  }
  for (const [x, y] of add) c.set(x, y, 'o');
  return selOut(c.toGrid(), DARK);
}

const SHOULDER_L: V = [12, BODY_Y + 2], SHOULDER_R: V = [19, BODY_Y + 2];
const headClosed = headFront.map((r, y) => (y === 9 ? r.slice(0, 4) + 's' + r.slice(5, 7) + 's' + r.slice(8) : r));

// ---------------------------------------------------------------- couché (vu du ciel)

/** Couché sur le dos, la tête au nord (32 × 48, sans ombre) : les jambes jointes, le bras gauche le long du corps, le droit
 *  plié, la main sur le ventre. */
function lyingNorthRaw(): Grid {
  const c = new Canvas(W, H);
  const legY = BODY_Y + 11;
  c.stamp(legLeft, FRONT_X + LEG_L, legY);
  c.stamp(legRight, FRONT_X + LEG_R, legY);
  c.stamp(bareTorso(torsoFront), FRONT_X, BODY_Y);
  c.stamp(headClosed, FRONT_X - 1, HEAD_Y); // la tête roulée d'un pixel sur le côté
  rim(c);
  arm(c, [SHOULDER_L, [11, BODY_Y + 5], [11, BODY_Y + 9]], 't', 'L');
  arm(c, [SHOULDER_R, [21, BODY_Y + 6], [18, BODY_Y + 7]], 'T', 't');
  rim(c);
  return c.toGrid();
}

/** Couché sur le dos, la tête à l'ouest : la transposée de la vue nord (la lumière reste en haut à gauche). */
function lyingWest(o: { lift?: number; tilt?: number; dabs?: Dab[] } = {}): Grid {
  const t = transpose(lyingNorthRaw());
  const c = new Canvas(FW, FH);
  let maxY = 0;
  t.forEach((r, y) => { if (/[^.x]/.test(r)) maxY = y; });
  const dx = 1, dy = 46 - maxY - (o.lift ?? 0);
  t.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === EMPTY || ch === 'x') return;
    const up = o.tilt ? Math.round(((x - 14) * o.tilt) / 31) : 0;
    c.set(x + dx, y + dy - up, ch);
  }));
  let out: Grid;
  if (o.tilt) {
    const g = reoutline(c);
    const s = Canvas.from(g);
    for (let x = 18; x <= 44; x++) if (s.get(x, 46) === EMPTY) s.set(x, 46, 'x');
    out = s.toGrid();
  } else out = flatShadow(selOut(c.toGrid(), DARK));
  return dab(out, o.dabs ?? []);
}
const lyingEast = (o: { lift?: number; tilt?: number; dabs?: Dab[] } = {}): Grid => {
  const g = lyingWest({ lift: o.lift, tilt: o.tilt }).map((r) => [...r].reverse().join(''));
  return dab(g, o.dabs ?? []);
};

// ---------------------------------------------------------------- de profil (tourné vers l'est : il tombe vers l'ouest)

/** Une jambe de profil en trait épais (2 px), de la hanche au pied, la botte au bout. */
function sideLeg(c: Canvas, pts: V[], cloth: string, boot: [string, string]) {
  const px: V[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
    for (let k = 0; k <= n; k++) px.push([Math.round(ax + ((bx - ax) * k) / n), Math.round(ay + ((by - ay) * k) / n)]);
  }
  px.forEach(([x, y], i) => {
    const z = i >= px.length - 3 ? boot[i === px.length - 1 ? 1 : 0] : cloth;
    c.set(x, y, z).set(x + 1, y, z).set(x, y + 1, z).set(x + 1, y + 1, z);
  });
}

/**
 * Percuté : la bête l'a pris aux jambes. Les jambes décollent, balayées vers l'avant (vers la bête, à l'est), les hanches
 * montent ; le buste part en arrière (penché vers l'ouest, plus à l'épaule qu'à la ceinture), la tête rejetée ; le bras de
 * devant lancé en l'air au-dessus de la tête, celui du fond rejeté en arrière.
 */
function hitSide(): Grid {
  const c = new Canvas(W, H);
  const hipX = SIDE_X + 6, hipY = BODY_Y + 10;
  // le buste penché en arrière depuis les hanches : chaque rangée décalée vers l'ouest, plus en haut
  const L = 7;
  const lean = (y: number) => -Math.round(((BODY_Y + 10 - y) * L) / 10);
  const sx = SIDE_X + 5 + lean(BODY_Y + 2); // l'épaule, déplacée avec le buste
  // la jambe du fond (plus sombre), lancée plus haut que celle de devant : les jambes en ciseaux
  sideLeg(c, [[hipX, hipY], [hipX + 4, hipY - 3], [hipX + 8, hipY - 5]], 'P', ['k', 'k']);
  // le bras du fond rejeté en arrière, sous le buste
  arm(c, [[sx, BODY_Y + 3], [sx - 4, BODY_Y + 6], [sx - 7, BODY_Y + 5]], 't', 't');
  bodySide.slice(0, 11).forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== EMPTY) c.set(SIDE_X + x + lean(BODY_Y + y), BODY_Y + y, ch); }));
  // la tête rejetée en arrière, au bout du buste, un peu plus basse
  c.stamp(headSide, SIDE_X + lean(BODY_Y) - 2, HEAD_Y + 3);
  sideLeg(c, [[hipX, hipY + 1], [hipX + 5, hipY], [hipX + 9, hipY - 2]], 'p', ['K', 'k']);
  rim(c);
  // le bras de devant, lancé en l'air, la main au-dessus de la tête
  arm(c, [[sx + 1, BODY_Y + 2], [sx + 3, BODY_Y - 3], [sx + 2, BODY_Y - 9]], 't', 'L');
  rim(c);
  const g = reoutline(Canvas.from(c.toGrid()));
  const s = wide(g, 0, -4);
  standShadow(s, 1);
  return dab(s.toGrid(), [...puff(OX + 26, 46, 1), [OX + 22, 45, '1']]);
}

/** Assis, les jambes devant lui (vers l'est), un genou relevé ; une main au sol derrière lui pour se pousser, l'autre à la tête
 *  qui se secoue (la tête penchée, deux traits de part et d'autre). */
function sitSide(): Grid {
  const c = new Canvas(W, H);
  const dy = 6;
  // la jambe du fond allongée, celle de devant le genou relevé
  sideLeg(c, [[SIDE_X + 5, 41], [SIDE_X + 14, 42]], 'P', ['k', 'k']);
  sideLeg(c, [[SIDE_X + 5, 40], [SIDE_X + 9, 37], [SIDE_X + 12, 42]], 'p', ['K', 'k']);
  // la main au sol, derrière : le bras du fond, tendu
  arm(c, [[SIDE_X + 4, BODY_Y + dy + 2], [SIDE_X + 2, BODY_Y + dy + 6], [SIDE_X + 0, BODY_Y + dy + 10]], 't', 't');
  c.stamp(bodySide.slice(0, 10), SIDE_X, BODY_Y + dy);
  c.stamp(headSide, SIDE_X + 1, HEAD_Y + dy + 1);
  rim(c);
  // la main à la tête : le bras de devant plié, la main sur la tempe
  arm(c, [[SIDE_X + 6, BODY_Y + dy + 2], [SIDE_X + 10, BODY_Y + dy - 1], [SIDE_X + 8, HEAD_Y + dy + 7]], 't', 'L');
  rim(c);
  const s = new Canvas(FW, FH).stamp(selOut(c.toGrid(), DARK), OX, 0);
  const g = flatShadow(s.toGrid());
  // la tête qui se secoue : deux petits traits de part et d'autre
  const hx = OX + SIDE_X + 1, hy = HEAD_Y + dy + 3;
  return dab(g, [[hx - 2, hy, '2'], [hx - 2, hy + 1, '2'], [hx - 3, hy + 3, '1'], [hx + 13, hy, '2'], [hx + 13, hy + 1, '2'], [hx + 14, hy + 3, '1']]);
}

/** À genoux, le poids sur la jambe de devant : le genou du fond à terre, le pied de devant posé, la main sur ce genou, le buste
 *  penché en avant pour se pousser. */
function kneelSide(): Grid {
  const c = new Canvas(W, H);
  const dy = 4, lean = 3;
  // le genou du fond à terre, le tibia couché derrière
  sideLeg(c, [[SIDE_X + 5, 39], [SIDE_X + 6, 42], [SIDE_X + 1, 43]], 'P', ['k', 'k']);
  // la jambe de devant : la cuisse vers l'avant, le tibia d'aplomb
  sideLeg(c, [[SIDE_X + 6, 39], [SIDE_X + 10, 38], [SIDE_X + 10, 43]], 'p', ['K', 'k']);
  bodySide.slice(0, 9).forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch !== EMPTY) c.set(SIDE_X + x + Math.round((lean * (8 - y)) / 8), BODY_Y + dy + y, ch);
  }));
  c.stamp(headSide, SIDE_X + lean + 1, HEAD_Y + dy + 1);
  rim(c);
  // la main appuyée sur le genou de devant
  arm(c, [[SIDE_X + 6, BODY_Y + dy + 2], [SIDE_X + 8, BODY_Y + dy + 5], [SIDE_X + 10, BODY_Y + dy + 6]], 't', 'L');
  rim(c);
  const s = new Canvas(FW, FH).stamp(reoutline(Canvas.from(c.toGrid())), OX, 0);
  standShadow(s, 1);
  return s.toGrid();
}

const ARM_SIDE: Grid = ['YLLY', 'YLLY', 'YLLY', 'YLtY', 'YLtY', 'YLtY', 'YLtY', 'DsSD', 'DSSD', '.DD.'];
const idleSide = (): Grid => {
  const c = new Canvas(W, H);
  const legY = BODY_Y + 11;
  c.stamp(backLeg(legSide), SIDE_X + LEG_SIDE[0], legY);
  c.stamp(legSide, SIDE_X + LEG_SIDE[1], legY);
  c.stamp(bodySide, SIDE_X, BODY_Y);
  c.stamp(ARM_SIDE, SIDE_X + 4, BODY_Y + 1);
  c.stamp(headSide, SIDE_X, HEAD_Y);
  const s = new Canvas(FW, FH).stamp(selOut(c.toGrid(), DARK), OX, 0);
  standShadow(s);
  return s.toGrid();
};

// ---------------------------------------------------------------- de face et de dos

interface FrontOpts {
  lift?: number; drop?: number; arms: [V, V, V, V];
  legs?: 'stand' | 'sit' | 'kneel';
  /** le buste et la tête décalés de côté (le poids sur une jambe) ; la tête seule, en plus. */
  tx?: number; hx?: number; hy?: number;
  marks?: boolean;
}

function frontPose(facing: 'down' | 'up', o: FrontOpts): Grid {
  const c = new Canvas(W, H);
  const lift = o.lift ?? 0, drop = o.drop ?? 0, tx = o.tx ?? 0;
  const legY = BODY_Y + 11;
  const legs = o.legs ?? 'stand';
  if (legs === 'stand') {
    c.stamp(legLeft, FRONT_X + LEG_L - 1, legY - lift);
    c.stamp(legRight, FRONT_X + LEG_R + 1, legY - lift);
  } else if (legs === 'sit') {
    // assis, les jambes vers nous : une allongée (la botte), l'autre le genou relevé (le genou haut, la botte plus près)
    c.stamp(legLeft.slice(3), FRONT_X + LEG_L - 2, legY + 3);
    c.stamp(['opPo', 'oPPo', 'oKko', 'okko', 'oooo'], FRONT_X + LEG_R + 2, legY);
  } else {
    // à genoux d'un côté (la jambe raccourcie), l'autre pied posé, écarté : le poids dessus
    c.stamp(legLeft.slice(3), FRONT_X + LEG_L - 1, legY + 3);
    c.stamp(legRight, FRONT_X + LEG_R + 2, legY);
  }
  const torso = bareTorso(facing === 'down' ? torsoFront : torsoBack);
  c.stamp(torso, FRONT_X + tx, BODY_Y + drop - lift);
  c.stamp(facing === 'down' ? headFront : headBack, FRONT_X + tx + (o.hx ?? 0), HEAD_Y + drop - lift + (o.hy ?? 0));
  rim(c);
  const [el, hl, er, hr] = o.arms;
  const sh = (v: V): V => [v[0] + tx, v[1] + drop - lift];
  arm(c, [sh(SHOULDER_L), el, hl], facing === 'down' ? 't' : 'T', facing === 'down' ? 'L' : 't');
  arm(c, [sh(SHOULDER_R), er, hr], facing === 'down' ? 'T' : 't', facing === 'down' ? 't' : 'L');
  rim(c);
  const s = new Canvas(FW, FH).stamp(selOut(c.toGrid(), DARK), OX, 0);
  let g: Grid;
  if (legs === 'sit') g = flatShadow(s.toGrid());
  else { standShadow(s); g = s.toGrid(); }
  if (o.marks) {
    const hx = OX + FRONT_X + tx + (o.hx ?? 0), hy = HEAD_Y + drop - lift + (o.hy ?? 0) + 4;
    g = dab(g, [[hx - 2, hy, '2'], [hx - 2, hy + 1, '2'], [hx - 3, hy + 3, '1'], [hx + 13, hy, '2'], [hx + 13, hy + 1, '2'], [hx + 14, hy + 3, '1']]);
  }
  return g;
}

const idleFront = (facing: 'down' | 'up') => frontPose(facing, {
  arms: [[11, BODY_Y + 5], [11, BODY_Y + 8], [20, BODY_Y + 5], [20, BODY_Y + 8]],
});
const hitFront = (facing: 'down' | 'up') => frontPose(facing, {
  lift: 2, drop: 0,
  arms: [[8, BODY_Y - 1], [6, BODY_Y - 5], [23, BODY_Y - 1], [25, BODY_Y - 5]],
});
/** Assis : une main au sol pour se pousser (à gauche de l'image), l'autre à la tête qui se secoue. */
const sitFront = (facing: 'down' | 'up') => frontPose(facing, {
  drop: 4, legs: 'sit', hx: -1, hy: 1, marks: true,
  arms: facing === 'down'
    ? [[8, BODY_Y + 9], [6, BODY_Y + 13], [24, BODY_Y + 3], [21, HEAD_Y + 11]]
    : [[8, BODY_Y + 3], [11, HEAD_Y + 11], [23, BODY_Y + 9], [25, BODY_Y + 13]],
});
/** À genoux : le poids sur la jambe posée, le buste penché vers elle, la main appuyée sur son genou. */
const kneelFront = (facing: 'down' | 'up') => frontPose(facing, {
  drop: 3, legs: 'kneel', tx: 1, hx: 1,
  arms: [[10, BODY_Y + 8], [10, BODY_Y + 11], [23, BODY_Y + 8], [22, BODY_Y + 11]],
});

// ---------------------------------------------------------------- les animations

/**
 * Les durées : percuté 80 ms, en l'air 120 ms, la glissade (deux images, 2,5 m à 5,9 m/s qui freine à 0,7 g : environ 0,85 s, le
 * jeu déplace l'image), à terre, assis, à genoux, debout. `slide` : où le jeu a poussé Xéros à chaque image (px vers l'arrière).
 */
const MS = [80, 120, 400, 450, 650, 250, 200, 150];
const SLIDE = [0, 14, 30, 50, 50, 50, 50, 50];

export const knockdown: Record<'right' | 'down' | 'up', Anim> = {
  right: {
    note: 'percute, le buste part en arriere, les bras volent, les jambes decollent ; il tombe sur le dos, glisse (2,5 m), reste a terre, s assoit, se met a genoux, se releve',
    ms: MS, slide: SLIDE,
    frames: [
      hitSide(),
      lyingWest({ lift: 7, tilt: 9 }),
      lyingWest({ dabs: [...puff(14, 45, 2, -1), ...puff(44, 46, 1)] }),
      lyingWest({ dabs: [...puff(46, 45, 3), ...puff(40, 47, 1)] }),
      lyingWest(),
      sitSide(),
      kneelSide(),
      idleSide(),
    ],
  },
  down: {
    note: 'de face : percute, il tourne en l air et retombe en travers, la tete a l ouest ; glisse vers le nord ; se releve face a nous',
    ms: MS, slide: SLIDE,
    frames: [
      hitFront('down'),
      lyingWest({ lift: 12, tilt: -9 }),
      lyingWest({ dabs: [...puff(20, 47, 2, -1), ...puff(40, 47, 2)] }),
      lyingWest({ dabs: [...puff(18, 47, 3, -1), ...puff(42, 47, 3)] }),
      lyingWest(),
      sitFront('down'),
      kneelFront('down'),
      idleFront('down'),
    ],
  },
  up: {
    note: 'de dos : percute, il tourne en l air et retombe en travers, la tete a l est ; glisse vers le sud ; se releve de dos',
    ms: MS, slide: SLIDE,
    frames: [
      hitFront('up'),
      lyingEast({ lift: 12, tilt: -9 }),
      lyingEast({ dabs: [...puff(20, 47, 2, -1), ...puff(42, 47, 2)] }),
      lyingEast({ dabs: [...puff(18, 47, 3, -1), ...puff(44, 47, 3)] }),
      lyingEast(),
      sitFront('up'),
      kneelFront('up'),
      idleFront('up'),
    ],
  },
};
