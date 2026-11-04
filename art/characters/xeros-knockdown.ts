// Xéros renversé par la charge du sanglier (chantier « sangliers », hors jeu ; art/characters/xeros.ts n'est pas touché).
// Planche : npx tsx tools/essai-sangliers-c.ts (.art-preview/sangliers-xeros-renverse.png).
//
// Le geste : il est percuté, part en arrière, tombe sur le dos, glisse au sol (environ 2,5 m, 50 px : le jeu déplace l'image, les
// images glissées gardent leur place), reste à terre, s'assoit, se met à genoux, se relève. Quatre directions : de profil (la
// gauche est le miroir de la droite), de face, de dos. Il est toujours renversé à l'opposé de sa direction : tourné vers l'est
// (droite), la bête vient de l'est, il tombe vers l'ouest, la tête à l'ouest ; de face (tourné vers le sud), il tombe vers le
// nord, la tête au nord ; de dos, vers le sud, la tête au sud.
//
// Les pièces sont celles de Xéros (art/characters/xeros-body.ts : tête, torse, jambes, bras par le coude, contour selOut), ses
// couleurs et ses proportions. Couché sur le dos, vu du ciel, on voit sa face (yeux fermés), comme de face debout mais posée au
// sol : 32 px de long (1,60 m, le sol sans raccourci), les bras un peu écartés, l'ombre tout autour. Couché est-ouest, c'est la
// même image tournée d'un quart de tour (règle D) : la transposée de la vue nord, qui garde la lumière en haut à gauche.
//
// Frame : 64 × 48 ; les pieds de Xéros debout en (32, 45), comme dans sa frame de 32 × 48 posée au milieu. Couché, le corps est
// centré sur ce point (les hanches à peu près dessus).

import { Canvas, EMPTY, selOut, type Grid, type Palette } from '../lib/canvas';
import { world } from '../palette';
import {
  W, H, HEAD_Y, BODY_Y, FRONT_X, SIDE_X, palette as xp, DARK, headFront, headBack, torsoFront, torsoBack, legLeft, legRight, LEG_L, LEG_R,
  headSide, bodySide, legSide, LEG_SIDE, backLeg, rim, arm, bareTorso,
} from './xeros-body';

/** La palette de Xéros, plus la poussière (des signes que sa planche n'emploie pas). */
export const palette: Palette = { ...xp, 1: world.n, 2: world.u, 3: world['9'] };

export const FW = 64, FH = 48;
const OX = (FW - W) / 2; // la frame de 32 × 48 posée au milieu

export interface Anim { frames: Grid[]; ms: number[]; note: string; slide: number[] }
type V = [number, number];
type Dab = [number, number, string];

// ---------------------------------------------------------------- outils

/** Pose une grille de 32 × 48 au milieu de la frame large, décalée de (dx, dy). */
function wide(g: Grid, dx = 0, dy = 0): Canvas {
  return new Canvas(FW, FH).stamp(g, OX + dx, dy);
}
const transpose = (g: Grid): Grid => Array.from({ length: g[0].length }, (_, y) => Array.from({ length: g.length }, (_, x) => g[x][y]).join(''));
const flipY = (g: Grid): Grid => [...g].reverse();

/** L'ombre debout (l'ellipse de Xéros), posée sous les pieds, même s'il décolle. */
function standShadow(c: Canvas) {
  const s = new Canvas(FW, FH);
  s.ellipse(OX + 16.5, 45.5, 5.5, 2, 'x');
  s.toGrid().forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'x' && c.get(x, y) === EMPTY) c.set(x, y, 'x'); }));
}
/** Ombre à plat : un pixel au sud-est de toute la silhouette (couché). */
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
/** Une bouffée de poussière centrée en (x, y) : `n` de 1 à 3. */
const puff = (x: number, y: number, n: number, dir = 1): Dab[] => {
  const o: Dab[] = [[x, y, '2'], [x + dir, y, '1'], [x, y - 1, '1'], [x + dir, y - 1, '2']];
  if (n > 1) o.push([x + 2 * dir, y - 1, '1'], [x + 2 * dir, y - 2, '2'], [x - dir, y, '3'], [x + dir, y - 2, '1']);
  if (n > 2) o.push([x + 3 * dir, y - 2, '1'], [x + 3 * dir, y - 3, '2'], [x + 2 * dir, y - 3, '3'], [x + 4 * dir, y - 1, '2']);
  return o;
};
/** Recontoure une silhouette déformée : le contour d'un pixel là où la matière touche le vide, puis le contour côté lumière. */
function reoutline(c: Canvas): Grid {
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const ch = c.get(x, y);
    if (ch !== EMPTY) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const k = c.get(x + dx, y + dy); return k !== EMPTY && k !== 'x' && k !== 'o'; });
    if (n) c.set(x, y, 'o');
  }
  return selOut(c.toGrid(), DARK);
}

// ---------------------------------------------------------------- les pièces (comme dans xeros.ts, sans l'ombre)

const ARM_SIDE: Grid = ['YLLY', 'YLLY', 'YLLY', 'YLtY', 'YLtY', 'YLtY', 'YLtY', 'DsSD', 'DSSD', '.DD.'];
const SHOULDER_L: V = [12, BODY_Y + 2], SHOULDER_R: V = [19, BODY_Y + 2];

/** La tête de face, les yeux fermés (un trait). */
const headClosed = headFront.map((r, y) => (y === 9 ? r.slice(0, 4) + 's' + r.slice(5, 7) + 's' + r.slice(8) : r));

/** De profil, debout, sans ombre ni contour côté lumière (pour le pencher). */
function sideRaw(): Grid {
  const c = new Canvas(W, H);
  const legY = BODY_Y + 11;
  c.stamp(backLeg(legSide), SIDE_X + LEG_SIDE[0], legY);
  c.stamp(legSide, SIDE_X + LEG_SIDE[1], legY);
  c.stamp(bodySide, SIDE_X, BODY_Y);
  c.stamp(headSide, SIDE_X, HEAD_Y);
  return c.toGrid();
}

/** Couché sur le dos, la tête au nord, vu du ciel (32 × 48, sans ombre). `arms` : 0 le long du corps, 1 écartés. */
function lyingNorthRaw(arms = 1, raw = false): Grid {
  const c = new Canvas(W, H);
  const legY = BODY_Y + 11;
  c.stamp(legLeft, FRONT_X + LEG_L - 1, legY);
  c.stamp(legRight, FRONT_X + LEG_R + 1, legY);
  c.stamp(bareTorso(torsoFront), FRONT_X, BODY_Y);
  c.stamp(headClosed, FRONT_X - 1, HEAD_Y); // la tête roulée d'un pixel sur le côté
  rim(c);
  // arms 0 : les bras le long du corps, un peu écartés ; 1, 2 : de plus en plus ouverts
  arm(c, [SHOULDER_L, [10 - arms, BODY_Y + 5], [9 - 2 * arms, BODY_Y + 9 - 2 * arms]], 't', 'L');
  arm(c, [SHOULDER_R, [21 + arms, BODY_Y + 5], [22 + 2 * arms, BODY_Y + 9 - 2 * arms]], 'T', 't');
  rim(c);
  return raw ? c.toGrid() : selOut(c.toGrid(), DARK);
}

/** Couché, tête au nord, posé dans la frame large ; `lift` : décollé du sol (l'ombre reste en bas), `squash` : rangées ôtées (il bascule). */
function lyingNorth(o: { lift?: number; squash?: number; arms?: number; dabs?: Dab[] } = {}): Grid {
  let g = lyingNorthRaw(o.arms ?? 1);
  if (o.squash) {
    // il bascule encore : le corps vu en raccourci (une rangée sur `squash` ôtée), les pieds restent en bas
    const keep = g.filter((_, y) => y < HEAD_Y || y > 45 || (y - HEAD_Y) % o.squash! !== 1);
    g = [...Array(H - keep.length).fill('.'.repeat(W)), ...keep];
  }
  const c = wide(g, 0, -(o.lift ?? 0));
  let out = c.toGrid();
  if (o.lift) {
    const s = new Canvas(FW, FH).stamp(out, 0, 0);
    s.toGrid();
    standShadow(s);
    out = s.toGrid();
  } else out = flatShadow(out);
  return dab(out, o.dabs ?? []);
}

/** Couché sur le dos, la tête au sud (tombé en arrière, tourné vers le nord) : la vue nord retournée de haut en bas. */
function lyingSouth(o: { lift?: number; dabs?: Dab[] } = {}): Grid {
  const g = lyingNorthRaw(1);
  // le corps occupe les rangées 14 à 45 : on le retourne sur lui-même
  const body = g.slice(HEAD_Y - 1, 47);
  const flipped = [...g.slice(0, HEAD_Y - 1), ...flipY(body), ...g.slice(47)];
  const c = wide(flipped, 0, -(o.lift ?? 0));
  let out = c.toGrid();
  if (o.lift) { const s = Canvas.from(out); standShadow(s); out = s.toGrid(); } else out = flatShadow(out);
  return dab(out, o.dabs ?? []);
}

/** Couché sur le dos, la tête à l'ouest : la transposée de la vue nord (la lumière reste en haut à gauche). */
function lyingWestRaw(): Grid {
  // la transposée d'une frame de 32 × 48 fait 48 × 32 : le corps (rangées 14 à 45 de la vue nord) va en colonnes 14 à 45
  return transpose(lyingNorthRaw(0, true));
}
function lyingWest(o: { lift?: number; tilt?: number; dabs?: Dab[] } = {}): Grid {
  const t = lyingWestRaw();
  const c = new Canvas(FW, FH);
  // le corps couché, centré sur x = 32 (colonnes 14 à 45 → 15 à 46), son flanc sud au sol (rangée 46)
  let maxY = 0;
  t.forEach((r, y) => { if (/[^.x]/.test(r)) maxY = y; });
  const dx = 1, dy = 46 - maxY - (o.lift ?? 0);
  t.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === EMPTY || ch === 'x') return;
    // en l'air, il bascule : les pieds (à l'est) plus hauts que la tête
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

/** Couché, la tête à l'est : le miroir (comme toutes les vues gauches du jeu). */
const lyingEast = (o: { lift?: number; tilt?: number; dabs?: Dab[] } = {}): Grid => {
  const g = lyingWest({ lift: o.lift, tilt: o.tilt }).map((r) => [...r].reverse().join(''));
  return dab(g, o.dabs ?? []);
};

// ---------------------------------------------------------------- de profil (tourné vers l'est : il tombe vers l'ouest)

/** Percuté : le corps part en arrière (penché vers l'ouest, la tête d'abord), les pieds décollent. */
function hitSide(lean: number, lift: number): Grid {
  const g = sideRaw();
  const c = new Canvas(FW, FH);
  g.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === EMPTY) return;
    const s = -Math.round(((45 - y) * lean) / 31);
    c.set(OX + x + s, y - lift, ch);
  }));
  // les bras lancés en avant, vers la bête
  const out = Canvas.from(reoutline(c));
  rim(out);
  const shoulder: V = [OX + 15 - Math.round((14 * lean) / 31), BODY_Y + 2 - lift];
  arm(out, [shoulder, [shoulder[0] + 3, shoulder[1] + 1], [shoulder[0] + 6, shoulder[1] - 1]], 't', 'L');
  rim(out);
  const s = Canvas.from(selOut(out.toGrid(), DARK));
  standShadow(s);
  return s.toGrid();
}

/** Assis, les jambes allongées devant lui (vers l'est), une main en appui derrière. */
function sitSide(): Grid {
  const c = new Canvas(W, H);
  const dy = 6;
  const legs = [
    '.........ooo.',
    'ooooooooookKo',
    'ppppppppppKko',
    'PPPPPPPPPkkko',
    'ooooooooooooo',
  ];
  c.stamp(legs, SIDE_X + 6, 41);
  c.stamp(bodySide.slice(0, 10), SIDE_X, BODY_Y + dy);
  c.stamp(headSide, SIDE_X, HEAD_Y + dy);
  rim(c);
  arm(c, [[SIDE_X + 4, BODY_Y + dy + 2], [SIDE_X + 3, BODY_Y + dy + 6], [SIDE_X + 1, BODY_Y + dy + 9]], 't', 'L');
  rim(c);
  const s = new Canvas(FW, FH).stamp(selOut(c.toGrid(), DARK), OX, 0);
  return flatShadow(s.toGrid());
}

/** Accroupi, un genou à terre (derrière), l'autre pied posé devant : il se relève. */
function kneelSide(): Grid {
  const c = new Canvas(W, H);
  const dy = 3;
  // le genou du fond à terre, le tibia couché derrière
  c.rect(SIDE_X + 1, 42, 6, 2, 'P').rect(SIDE_X, 42, 2, 3, 'k');
  // la jambe de devant : la cuisse vers l'avant, le tibia d'aplomb, la botte
  c.rect(SIDE_X + 5, 40, 5, 2, 'p');
  c.rect(SIDE_X + 8, 40, 2, 3, 'p');
  c.stamp(legSide.slice(3, 5), SIDE_X + 7, 43);
  c.stamp(bodySide.slice(0, 9), SIDE_X, BODY_Y + dy);
  c.stamp(headSide, SIDE_X + 1, HEAD_Y + dy);
  c.stamp(ARM_SIDE.slice(0, 8), SIDE_X + 5, BODY_Y + dy + 1);
  rim(c);
  const s = new Canvas(FW, FH).stamp(selOut(c.toGrid(), DARK), OX, 0);
  standShadow(s);
  return s.toGrid();
}

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

// ---------------------------------------------------------------- de face (tourné vers le sud : il tombe vers le nord)

/** Debout, de face ou de dos, les bras par le coude ; `lift` : décollé ; `lean` : rangées du torse ôtées (il part en arrière). */
function frontPose(facing: 'down' | 'up', o: { lift?: number; drop?: number; arms: [V, V, V, V]; legs?: 'stand' | 'sit' | 'kneel' }): Grid {
  const c = new Canvas(W, H);
  const lift = o.lift ?? 0, drop = o.drop ?? 0;
  const legY = BODY_Y + 11;
  const legs = o.legs ?? 'stand';
  if (legs === 'stand') {
    c.stamp(legLeft, FRONT_X + LEG_L - 1, legY - lift);
    c.stamp(legRight, FRONT_X + LEG_R + 1, legY - lift);
  } else if (legs === 'sit') {
    // assis, les jambes allongées vers nous : les bottes, écartées, pointes en l'air
    c.stamp(legLeft.slice(2), FRONT_X + LEG_L - 2, legY + 2);
    c.stamp(legRight.slice(2), FRONT_X + LEG_R + 2, legY + 2);
  } else {
    // à genoux d'un côté, l'autre pied posé : une jambe raccourcie
    c.stamp(legLeft.slice(2), FRONT_X + LEG_L - 1, legY + 2);
    c.stamp(legRight, FRONT_X + LEG_R + 1, legY);
  }
  const torso = bareTorso(facing === 'down' ? torsoFront : torsoBack);
  c.stamp(torso, FRONT_X, BODY_Y + drop - lift);
  c.stamp(facing === 'down' ? headFront : headBack, FRONT_X, HEAD_Y + drop - lift);
  rim(c);
  const [el, hl, er, hr] = o.arms;
  const sh = (v: V): V => [v[0], v[1] + drop - lift];
  arm(c, [sh(SHOULDER_L), el, hl], facing === 'down' ? 't' : 'T', facing === 'down' ? 'L' : 't');
  arm(c, [sh(SHOULDER_R), er, hr], facing === 'down' ? 'T' : 't', facing === 'down' ? 't' : 'L');
  rim(c);
  const s = new Canvas(FW, FH).stamp(selOut(c.toGrid(), DARK), OX, 0);
  if (legs === 'sit') return flatShadow(s.toGrid());
  standShadow(s);
  return s.toGrid();
}

const idleFront = (facing: 'down' | 'up') => frontPose(facing, {
  arms: [[11, BODY_Y + 5], [11, BODY_Y + 8], [20, BODY_Y + 5], [20, BODY_Y + 8]],
});
/** Percuté de face : les bras levés, rejetés, le corps décolle et part en arrière. */
const hitFront = (facing: 'down' | 'up') => frontPose(facing, {
  lift: 2, drop: 0,
  arms: [[8, BODY_Y - 1], [6, BODY_Y - 5], [23, BODY_Y - 1], [25, BODY_Y - 5]],
});
const sitFront = (facing: 'down' | 'up') => frontPose(facing, {
  drop: 4, legs: 'sit',
  arms: [[9, BODY_Y + 8], [7, BODY_Y + 12], [22, BODY_Y + 8], [24, BODY_Y + 12]],
});
const kneelFront = (facing: 'down' | 'up') => frontPose(facing, {
  drop: 2, legs: 'kneel',
  arms: [[11, BODY_Y + 6], [12, BODY_Y + 10], [20, BODY_Y + 6], [19, BODY_Y + 10]],
});

// ---------------------------------------------------------------- les animations

/**
 * Les durées : percuté 80 ms, en l'air 120 ms, la glissade (deux images, 2,5 m à 5,9 m/s qui freine à 0,7 g : environ 0,85 s, le
 * jeu déplace l'image), à terre (jusqu'à 1,5 s au sol en tout), assis, à genoux, debout. `slide` : où le jeu a poussé Xéros à
 * chaque image (px vers l'arrière), pour la planche.
 */
const MS = [80, 120, 400, 450, 650, 250, 200, 150];
const SLIDE = [0, 14, 30, 50, 50, 50, 50, 50];

export const knockdown: Record<'right' | 'down' | 'up', Anim> = {
  right: {
    note: 'percute, il part en arriere, tombe sur le dos, glisse (2,5 m), reste a terre, s assoit, se met a genoux, se releve',
    ms: MS, slide: SLIDE,
    frames: [
      hitSide(7, 2),
      lyingWest({ lift: 7, tilt: 9 }),
      lyingWest({ dabs: [...puff(14, 45, 2, -1), ...puff(44, 46, 1)] }),
      lyingWest({ dabs: [...puff(46, 45, 3), ...puff(40, 47, 1)] }),
      lyingWest(),
      sitSide(),
      kneelSide(),
      idleSide(),
    ],
  },
  // De face et de dos, il tourne en l'air et retombe en travers (couché est-ouest, comme de profil) : couché nord-sud, vu du
  // ciel, il ressemble trop à Xéros debout (voir la variante plus bas). La glissade l'emporte vers le nord (de face) ou le sud.
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

/** La variante écartée : couché dans l'axe de la chute (nord-sud), vu du ciel. */
export const knockdownNS: Record<'down' | 'up', Anim> = {
  down: {
    note: 'variante : il tombe dans l axe, couche nord-sud, la tete au nord (vu du ciel, on le croit debout)',
    ms: MS, slide: SLIDE,
    frames: [
      hitFront('down'),
      lyingNorth({ lift: 6, squash: 3, arms: 2 }),
      lyingNorth({ dabs: [...puff(28, 47, 2, -1), ...puff(37, 47, 2), ...puff(24, 14, 1, -1)] }),
      lyingNorth({ dabs: [...puff(27, 47, 3, -1), ...puff(38, 47, 3)] }),
      lyingNorth({ arms: 1 }),
      sitFront('down'),
      kneelFront('down'),
      idleFront('down'),
    ],
  },
  up: {
    note: 'variante : couche nord-sud, la tete au sud, le visage vers le ciel',
    ms: MS, slide: SLIDE,
    frames: [
      hitFront('up'),
      lyingSouth({ lift: 6 }),
      lyingSouth({ dabs: [...puff(28, 13, 2, -1), ...puff(37, 13, 2)] }),
      lyingSouth({ dabs: [...puff(27, 13, 3, -1), ...puff(38, 13, 3)] }),
      lyingSouth(),
      sitFront('up'),
      kneelFront('up'),
      idleFront('up'),
    ],
  },
};
