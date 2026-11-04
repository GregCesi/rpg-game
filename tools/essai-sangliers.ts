// Essai du sanglier (chantier « sangliers », hors jeu) : npx tsx tools/essai-sangliers.ts écrit
//   .art-preview/sangliers.png       : ses vues à côté de Xéros (x4, gabarit en liseré jaune, règle de 1 m), puis ses animations
//                                      image par image (numérotées, durée en ms), puis le sanglier mort au sol à côté de Xéros ;
//   .art-preview/sangliers-scene.png : trois vignettes de la même scène, en forêt profonde, à l'échelle du jeu (x2) : il voit
//                                      Xéros, il charge, l'arbre l'arrête et il reste sonné.
// Dessins : art/proposals/sanglier.ts. Ne touche ni au jeu ni à src/generated/ (les arbres sont lus dans leurs PNG construits).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { EMPTY, flipX, rng, type Grid, type Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import tileset from '../art/world/tiles';
import world from '../src/content/world.json';
import * as boar from '../art/proposals/sanglier';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.art-preview');
const K = 4;
const PAD = 16;
const BG: Rgb = [72, 80, 69]; // le sol de la forêt profonde (4)
const WHITE: Rgb = [240, 236, 220];
const GREY: Rgb = [205, 205, 190];
const GOLD: Rgb = [245, 215, 120];
const YELLOW: Rgb = [255, 230, 60];
const RED: Rgb = [230, 80, 60];

// ---------------------------------------------------------------- mesures

/** Boîte de la silhouette : pixels opaques hors ombre `x` et hors poussière (d D y). */
function silhouette(g: Grid): { x: number; y: number; w: number; h: number } {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  g.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === EMPTY || 'xdDy'.includes(ch)) return;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }));
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// ---------------------------------------------------------------- PNG lus (arbres)

type Img = { w: number; h: number; data: Buffer };
const readPng = (name: string): Img => {
  const p = PNG.sync.read(readFileSync(join(ROOT, 'src', 'generated', `${name}.png`)));
  return { w: p.width, h: p.height, data: p.data };
};
/** Pose une image PNG agrandie de k, coupée au rectangle `clip` (en pixels de la planche). */
function blitPng(s: Sheet, img: Img, ox: number, oy: number, k: number, clip?: [number, number, number, number], alpha = 1) {
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const i = (y * img.w + x) * 4;
    const a = (img.data[i + 3] / 255) * alpha;
    if (a <= 0) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) {
      const px = ox + x * k + q, py = oy + y * k + j;
      if (clip && (px < clip[0] || py < clip[1] || px >= clip[0] + clip[2] || py >= clip[1] + clip[3])) continue;
      s.dot(px, py, [img.data[i], img.data[i + 1], img.data[i + 2]], a);
    }
  }
}
/** Une grille agrandie de k, avec une opacité (les fantômes de la scène) et une coupe. */
function blitGrid(s: Sheet, g: Grid, pal: Palette, ox: number, oy: number, k: number, alpha = 1, clip?: [number, number, number, number]) {
  g.forEach((line, y) => [...line].forEach((ch, x) => {
    if (ch === EMPTY) return;
    const hex = pal[ch].replace('#', '');
    const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
    const a = (hex.length === 8 ? n(6) / 255 : 1) * alpha;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
      const px = ox + x * k + i, py = oy + y * k + j;
      if (clip && (px < clip[0] || py < clip[1] || px >= clip[0] + clip[2] || py >= clip[1] + clip[3])) continue;
      s.dot(px, py, [n(0), n(2), n(4)], a);
    }
  }));
}

const bigTree = readPng('big-tree'); // pied (33, 153)
const normalTree = readPng('normal-tree'); // pied (24, 161)
const bush = readPng('bush');

// ---------------------------------------------------------------- planche 1

type Cell = { w: number; h: number; draw: (s: Sheet, x: number, top: number) => void };
type Row = { title: string; cells: Cell[] };

const XR: [number, number] = [12, 47]; // rangées de Xéros montrées (12 à 47)
const xerosFrame = (anim: string, i = 0) => xeros.animations[anim].frames[i];

function xerosCell(anim: string, label: string): Cell {
  const g = xerosFrame(anim).slice(XR[0], XR[1] + 1);
  const sil = silhouette(g);
  return {
    w: Math.max(g[0].length * K, textWidth(label, 2)) + PAD, h: g.length * K + 30,
    draw: (s, x, top) => {
      blitGrid(s, g, xeros.palette, x, top, K);
      s.text(label, x, top + g.length * K + 6, GREY, 2);
      s.text(`${sil.w}X${sil.h}`, x, top + g.length * K + 18, GREY, 2);
    },
  };
}

/** Une vue du sanglier avec son liseré de gabarit (jaune), cadré sur le bas et le centre de la silhouette. */
function viewCell(g: Grid, label: string, want: [number, number], pal = boar.palette): Cell {
  const sil = silhouette(g);
  return {
    w: Math.max(g[0].length * K, textWidth(label, 2), textWidth(`${sil.w}X${sil.h} (GABARIT ${want[0]}X${want[1]}) ECART`, 2)) + PAD, h: g.length * K + 30,
    draw: (s, x, top) => {
      blitGrid(s, g, pal, x, top, K);
      const cx = sil.x + sil.w / 2, bottom = sil.y + sil.h;
      s.outline(x + Math.round((cx - want[0] / 2) * K) - 1, top + (bottom - want[1]) * K - 1, want[0] * K + 2, want[1] * K + 2, YELLOW);
      s.text(label, x, top + g.length * K + 6, GREY, 2);
      const ok = Math.abs(sil.w - want[0]) <= 2 && Math.abs(sil.h - want[1]) <= 2;
      s.text(`${sil.w}X${sil.h} (GABARIT ${want[0]}X${want[1]}) ${ok ? 'OK' : 'ECART'}`, x, top + g.length * K + 18, ok ? GREY : RED, 2);
    },
  };
}

function rulerCell(): Cell {
  return {
    w: 20 * K + PAD + 40, h: 40,
    draw: (s, x, top) => {
      for (let i = 0; i < 20; i++) s.rect(x + i * K, top + 10, K, K, i % 4 < 2 ? WHITE : [40, 40, 40]);
      s.text('1 M = 20 PX', x, top + 22, WHITE, 2);
    },
  };
}

/** Les images d'une animation, numérotées, avec leur durée ; `under` : ce qui est dessiné dessous (le tronc). */
function animCell(frames: Grid[], ms: number[], label: string, opts: { flip?: boolean; trunk?: (s: Sheet, x: number, top: number, w: number, h: number, i: number) => void; front?: boolean } = {}): Cell {
  const fw = frames[0][0].length, fh = frames[0].length;
  const gap = 3;
  const w = frames.length * (fw + gap) * K;
  return {
    w: Math.max(w, textWidth(label, 2)) + PAD, h: fh * K + 30,
    draw: (s, x, top) => {
      frames.forEach((g, i) => {
        const gx = x + i * (fw + gap) * K;
        s.rect(gx, top, fw * K, fh * K, [64, 72, 62]);
        const clip: [number, number, number, number] = [gx, top, fw * K, fh * K];
        if (opts.trunk && !opts.front) opts.trunk(s, gx, top, fw * K, fh * K, i);
        blitGrid(s, opts.flip ? flipX(g) : g, boar.palette, gx, top, K, 1, clip);
        if (opts.trunk && opts.front) opts.trunk(s, gx, top, fw * K, fh * K, i);
        s.text(`${i + 1}`, gx + 2, top + 2, WHITE, 2);
        s.text(`${ms[i]}MS`, gx, top + fh * K + 6, GREY, 2);
      });
      s.text(label, x, top + fh * K + 18, GOLD, 2);
    },
  };
}

/** Le bas d'un gros arbre, son pied posé en (fx, fy) de la frame (pixels du jeu). */
const trunkAt = (fx: number, fy: number) => (s: Sheet, x: number, top: number, w: number, h: number) =>
  blitPng(s, bigTree, x + (fx - 33) * K, top + (fy - 153) * K, K, [x, top, w, h]);

function sheet1() {
  const rows: Row[] = [];
  const st = { right: boar.side({}), down: boar.front({}), up: boar.back({}) };
  rows.push({
    title: 'VUES A L ATTENTE, A COTE DE XEROS (X4) ; LISERE JAUNE : LE GABARIT (PROFIL 28X20, FACE ET DOS 8X30)',
    cells: [
      xerosCell('idle-right', 'XEROS PROFIL'), viewCell(st.right, 'PROFIL', [28, 20]),
      xerosCell('idle-down', 'XEROS FACE'), viewCell(st.down, 'FACE', [8, 30]),
      xerosCell('idle-up', 'XEROS DOS'), viewCell(st.up, 'DOS', [8, 30]),
      rulerCell(),
    ],
  });
  const dirName = { right: 'PROFIL', down: 'FACE', up: 'DOS' } as const;
  for (const [name, set] of [['MARCHE', boar.walk], ['ANNONCE', boar.announce], ['CHARGE', boar.charge]] as const) {
    rows.push({
      title: `${name} : ${set.right.note.toUpperCase()}`,
      cells: (['right', 'down', 'up'] as const).map((d) => animCell(set[d].frames, set[d].ms, `${name} ${dirName[d]} ${set[d].loop ? '(BOUCLE)' : ''}`)),
    });
  }
  const im = boar.impact;
  rows.push({
    title: 'CHOC CONTRE UN ARBRE : 1 ARRIVE LANCE, 2 LA TETE COGNE, 3 LE RECUL, 4 IL RECULE ENCORE, PUIS SONNE',
    cells: [
      animCell(im.right.frames, im.right.ms, 'CHOC PROFIL', { trunk: trunkAt(boar.SIDE.ox + 33, boar.SIDE.gy + 1) }),
      animCell(im.up.frames, im.up.ms, 'CHOC DOS (ARBRE AU NORD)', { trunk: trunkAt(boar.FRONT.ox + 4, boar.FRONT.gy - 28 + 9) }),
      animCell(im.down.frames, im.down.ms, 'CHOC FACE (ARBRE DEVANT, DECALE)', { trunk: trunkAt(boar.FRONT.ox + 14, boar.FRONT.gy + 3), front: true }),
    ],
  });
  rows.push({
    title: 'SONNE (EN BOUCLE) : IL TITUBE, LA TETE BALANCE, LES PATTES ECARTEES',
    cells: [
      animCell(boar.dazed.right.frames, boar.dazed.right.ms, 'SONNE PROFIL (BOUCLE)', { trunk: trunkAt(boar.SIDE.ox + 33, boar.SIDE.gy + 1) }),
      animCell(boar.dazed.down.frames, boar.dazed.down.ms, 'SONNE FACE (BOUCLE)'),
    ],
  });
  rows.push({
    title: 'MORT (IL S EFFONDRE SUR LE FLANC), COUCHE A LA BAUGE, FOUILLE',
    cells: [
      animCell(boar.death.frames, boar.death.ms, 'MORT PROFIL'),
      animCell(boar.bed.frames, boar.bed.ms, 'BAUGE (BOUCLE)'),
      animCell(boar.root.frames, boar.root.ms, 'FOUILLE (BOUCLE)'),
    ],
  });
  const dv = boar.deadViews;
  rows.push({
    title: 'LE SANGLIER MORT AU SOL : EST-OUEST 28X16, NORD-SUD 16X28 (REGLE D), A COTE DE XEROS',
    cells: [
      xerosCell('idle-down', 'XEROS'),
      viewCell(dv[0], 'MORT EST-OUEST', [28, 16]),
      viewCell(dv[1], 'MORT NORD-SUD (R1)', [16, 28]),
      viewCell(dv[2], 'R2', [28, 16]),
      viewCell(dv[3], 'R3', [16, 28]),
      rulerCell(),
    ],
  });

  const width = Math.max(...rows.map((r) => r.cells.reduce((a, c) => a + c.w, 0))) + 2 * PAD;
  const height = rows.reduce((a, r) => a + 24 + Math.max(...r.cells.map((c) => c.h)) + 16, 60);
  const s = new Sheet(width, height, BG);
  s.text('SANGLIER (ESSAI) : 80 KG, 140 X 40 X 80 CM, A LA VRAIE ECHELLE, AGRANDI X4', PAD, 12, GOLD, 3);
  let y = 44;
  for (const r of rows) {
    s.text(r.title, PAD, y, WHITE, 2);
    y += 20;
    const h = Math.max(...r.cells.map((c) => c.h));
    let x = PAD;
    for (const c of r.cells) { c.draw(s, x, y + h - c.h); x += c.w; }
    y += h + 16;
  }
  return s;
}

// ---------------------------------------------------------------- planche 2 : la scène

const SW = 320, SH = 150, SK = 2;

type Thing = { y: number; draw: (s: Sheet, ox: number, oy: number, clip: [number, number, number, number]) => void };

const tree = (img: Img, foot: [number, number], fx: number, fy: number): Thing => ({
  y: fy,
  draw: (s, ox, oy, clip) => blitPng(s, img, ox + (fx - foot[0]) * SK, oy + (fy - foot[1]) * SK, SK, clip),
});
/** Un sprite posé par ses pieds (fx, fy) ; `anchor` : la place des pieds dans l'image. */
const sprite = (g: Grid, pal: Palette, anchor: [number, number], fx: number, fy: number, alpha = 1): Thing => ({
  y: fy,
  draw: (s, ox, oy, clip) => blitGrid(s, g, pal, ox + (fx - anchor[0]) * SK, oy + (fy - anchor[1]) * SK, SK, alpha, clip),
});
const X_ANCHOR: [number, number] = [16, 45];
// le sanglier de profil tourné vers la gauche (miroir) : ses pieds au milieu du corps
const B_ANCHOR: [number, number] = [boar.SIDE.w - 1 - (boar.SIDE.ox + 13), boar.SIDE.gy + 1];

function gloomAlpha(m: number): number {
  const st = world.gloom;
  if (m <= st[0].x) return st[0].alpha;
  for (let i = 1; i < st.length; i++) if (m <= st[i].x) return st[i - 1].alpha + ((st[i].alpha - st[i - 1].alpha) * (m - st[i - 1].x)) / (st[i].x - st[i - 1].x);
  return 0;
}

function panel(s: Sheet, ox: number, oy: number, step: 1 | 2 | 3) {
  const clip: [number, number, number, number] = [ox, oy, SW * SK, SH * SK];
  // le sol : tuiles de la forêt profonde, tirées au hasard (graine fixe)
  const r = rng(11);
  const names = ['deepwoods', 'deepwoods2', 'deepwoods3', 'deepwoods4'];
  for (let ty = 0; ty * 32 < SH; ty++) for (let tx = 0; tx * 32 < SW; tx++) {
    const g = tileset.tiles[names[Math.floor(r() * 4)]];
    blitGrid(s, g, tileset.palette as Palette, ox + tx * 32 * SK, oy + ty * 32 * SK, SK, 1, clip);
  }
  // les arbres : un tronc tous les 5 m environ
  const things: Thing[] = [
    tree(bigTree, [33, 153], 34, 106), // celui qui arrête la charge
    tree(normalTree, [24, 161], 150, 40),
    tree(bigTree, [33, 153], 285, 42),
    tree(normalTree, [24, 161], 200, 148),
    tree(bush, [16, 28], 118, 138),
    tree(bush, [16, 28], 300, 134),
  ];
  const XE = { x: 60, y: 105 }; // Xéros, sur sa marche vers l'est
  const BO = { x: 250, y: 105 }; // le sanglier, quand il le voit (à 9,5 m)
  const stand = flipX(boar.side({ head: -2 }));
  const gallop = flipX(boar.charge.right.frames[0]);
  const dazedF = flipX(boar.dazed.right.frames[2]);
  if (step === 1) {
    things.push(sprite(xerosFrame('walk-right', 1), xeros.palette, X_ANCHOR, XE.x, XE.y));
    things.push(sprite(stand, boar.palette, B_ANCHOR, BO.x, BO.y));
  } else if (step === 2) {
    things.push(sprite(xerosFrame('idle-right'), xeros.palette, X_ANCHOR, XE.x + 10, XE.y, 0.35));
    things.push(sprite(xerosFrame('walk-up', 1), xeros.palette, X_ANCHOR, XE.x + 14, XE.y - 20));
    things.push(sprite(stand, boar.palette, B_ANCHOR, BO.x, BO.y, 0.3));
    things.push(sprite(gallop, boar.palette, B_ANCHOR, 150, BO.y));
  } else {
    things.push(sprite(xerosFrame('idle-down'), xeros.palette, X_ANCHOR, XE.x + 24, XE.y - 40));
    // sonné au pied du tronc : son groin à 4 px de l'écorce (le recul), tourné vers l'ouest
    things.push(sprite(dazedF, boar.palette, B_ANCHOR, 34 + 6 + 14 + 4 - 4, BO.y - 1));
  }
  things.sort((a, b) => a.y - b.y).forEach((t) => t.draw(s, ox, oy, clip));
  // la pénombre de la forêt profonde (world.json, au mètre du monde : ici, au bord ouest, sa valeur la plus forte)
  const a = gloomAlpha(0);
  for (let y = 0; y < SH * SK; y++) for (let x = 0; x < SW * SK; x++) s.dot(ox + x, oy + y, [11, 22, 17], a);

  // les repères (comme ?debug), par-dessus
  const circle = (cx: number, cy: number, rad: number, c: Rgb) => {
    for (let t = 0; t < 4000; t++) {
      const an = (t / 4000) * Math.PI * 2;
      if (Math.floor(t / 20) % 2) continue;
      const px = Math.round(ox + (cx + Math.cos(an) * rad) * SK), py = Math.round(oy + (cy + Math.sin(an) * rad) * SK);
      if (px >= ox && py >= oy && px < ox + SW * SK && py < oy + SH * SK) s.dot(px, py, c, 0.8);
    }
  };
  const xc = step === 1 ? XE : { x: XE.x + 10, y: XE.y };
  if (step < 3) {
    circle(xc.x, xc.y, 240, YELLOW); // aux aguets, 12 m
    circle(xc.x, xc.y, 160, RED); // charge, 8 m
  }
  if (step === 1) {
    // la petite marque d'alerte au-dessus de sa tête
    const mx = BO.x - 12, my = BO.y - 26;
    for (let j = 0; j < 3; j++) s.rect(ox + mx * SK, oy + (my + j) * SK, SK, SK, [235, 220, 170]);
    s.rect(ox + mx * SK, oy + (my + 4) * SK, SK, SK, [235, 220, 170]);
  }
  if (step >= 2) {
    // la ligne de la charge : du sanglier vers l'endroit où était Xéros, jusqu'au tronc
    const x0 = BO.x - 16, x1 = 34 + 6;
    for (let x = x1; x <= x0; x++) if (Math.floor((x0 - x) / 3) % 2 === 0) s.rect(ox + x * SK, oy + (BO.y + 2) * SK, SK, SK, [235, 220, 170]);
    // la flèche
    for (let k = 1; k <= 3; k++) { s.rect(ox + (x1 + k) * SK, oy + (BO.y + 2 - k) * SK, SK, SK, [235, 220, 170]); s.rect(ox + (x1 + k) * SK, oy + (BO.y + 2 + k) * SK, SK, SK, [235, 220, 170]); }
  }
}

function sheet2() {
  const gap = 20;
  const W = 3 * SW * SK + 4 * gap, H = SH * SK + 90;
  const s = new Sheet(W, H, [30, 34, 30]);
  s.text('LA CHARGE EN FORET PROFONDE, A L ECHELLE DU JEU (X2 ; LE ZOOM DE DEPART MONTRE 213 X 120 PX DU MONDE)', gap, 10, GOLD, 2);
  s.text('CERCLES AUTOUR DE XEROS : JAUNE AUX AGUETS 12 M (240 PX), ROUGE CHARGE 8 M (160 PX) ; FANTOMES : LA PLACE D AVANT', gap, 26, GREY, 2);
  const titles = ['1 IL VOIT XEROS (A 9,5 M) ET SE DRESSE', '2 IL CHARGE ; XEROS S ECARTE', '3 LE TRONC L ARRETE : SONNE'];
  for (let i = 0; i < 3; i++) {
    const ox = gap + i * (SW * SK + gap), oy = 46;
    panel(s, ox, oy, (i + 1) as 1 | 2 | 3);
    s.text(titles[i], ox, oy + SH * SK + 10, WHITE, 2);
  }
  return s;
}

// ---------------------------------------------------------------- sortie

function report() {
  const show = (name: string, g: Grid) => { const b = silhouette(g); return `${name} ${b.w}x${b.h}`; };
  console.log([
    show('profil', boar.side({})), show('face', boar.front({})), show('dos', boar.back({})),
    show('mort est-ouest', boar.deadViews[0]), show('mort nord-sud', boar.deadViews[1]),
  ].join(' ; '));
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'sangliers.png'), PNG.sync.write(sheet1().png));
writeFileSync(join(OUT, 'sangliers-scene.png'), PNG.sync.write(sheet2().png));
report();
console.log(`essai-sangliers -> ${join(OUT, 'sangliers.png')}, ${join(OUT, 'sangliers-scene.png')}`);
