// Essais de dessins du tunnel en gradins (chantier « relief », CADRAGE.md 13.0 ; HORS JEU, rien ne change dans le jeu) :
//   npx tsx tools/essai-relief-gradins.ts  écrit
//   .art-preview/relief-gradins-1-matieres.png  les matières une par une (x4) et les plantes des gradins dans leurs vues, avec Xéros ;
//   .art-preview/relief-gradins-2-scenes.png    ce que voit le joueur (x2, l'écran du zoom de départ, 427 × 240) : côté ferme, au-dessus
//                                               de la rivière, à la bouche est ;
//   .art-preview/relief-gradins-3-ensemble.png  le tunnel entier vu de dehors, depuis le sud, de la ferme au plateau ;
//   .art-preview/relief-gradins-4-bouche.png    la bouche est vue de face, depuis la ferme ;
//   .art-preview/relief-gradins-5-corrections.png  les trois corrections, avant et après (x2, avec Xéros) : la bande sombre sous
//                                               le chemin, les variantes de la terre en coupe, le buisson long vu par le bout.
// Dessins : art/proposals/relief-gradins.ts ; terrain et rendu : art/proposals/relief-gradins-scene.ts. Les grands arbres, le sol
// clair, les faces de terre et Xéros sont ceux du jeu (src/generated/, art/world/relief.ts).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import xeros from '../art/characters/xeros';
import type { Canvas, Grid } from '../art/lib/canvas';
import { sky as skyPal, world } from '../art/palette';
import {
  bushLong, bushLongNs, bushLongNsBefore, cut, cutBefore, cutVariant, CUT_VARIANTS, PLANTS, riser, roots, STEP, tread, type PlantKey,
} from '../art/proposals/relief-gradins';
import {
  applyGloom, drawSprites, EDGE, ground, MASS, MOUTH, plantRows, Raster, renderTerrain, rgbOf, spriteOf, TOP, XF, XR0, XR1, XW,
  type Placed, type Sprite, SLOPE, RAMP, MODE,
} from '../art/proposals/relief-gradins-scene';
import { FLOOR_GLOOM } from '../art/proposals/relief-final';
import { faceEarth, lane } from '../art/world/relief';
import tilesetW from '../art/world/tiles';
import { expectedSize, silhouette, type Dims } from '../src/content/gabarit';
import { Sheet, type Rgb } from './lib/audit-preview';
import { hash as hashOf } from '../art/world/relief';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG: Rgb = [40, 44, 36];
const GOLD: Rgb = [245, 215, 120];
const GREY: Rgb = [215, 215, 200];
const SOFT: Rgb = [170, 175, 155];
const RED: Rgb = [240, 90, 70];
const FADE = 0.2;
const VW = 427;
const VH = 240;
const FEET_ROW = 130;
const XG = xeros.animations['idle-down'].frames[0];

// ---------- les images ----------

const FEET: Record<string, [number, number]> = { 'big-tree': [33, 153], 'normal-tree': [24, 161] };
const sprites = new Map<string, Sprite>();
function sprite(key: string): Sprite {
  const hit = sprites.get(key);
  if (hit) return hit;
  let s: Sprite;
  if (key.startsWith('xeros-')) s = spriteOf(xeros.animations[`idle-${key.slice(6)}`].frames[0], xeros.palette, 16, 45);
  else if (key in PLANTS) {
    const p = PLANTS[key as PlantKey];
    s = spriteOf(p.draw().toGrid(), world, p.foot[0], p.foot[1]);
  } else {
    const file = join(ROOT, 'src', 'generated', `${key}.png`);
    if (!existsSync(file)) throw new Error(`essai-relief-gradins : ${file} manque (lancer npm run art)`);
    const png = PNG.sync.read(readFileSync(file));
    const [fx, fy] = FEET[key] ?? [Math.floor(png.width / 2), png.height - 1];
    s = { w: png.width, h: png.height, rgba: new Uint8Array(png.data), footX: fx, footY: fy };
  }
  sprites.set(key, s);
  return s;
}

const g = (c: Canvas | Grid) => (Array.isArray(c) ? c : c.toGrid());
const say = (s: Sheet, t: string, x: number, y: number, c: Rgb = GREY, k = 2) => s.text(t, x, y, c, k);
/** Des lignes de texte ; renvoie le y sous la dernière. */
function para(s: Sheet, lines: string[], x: number, y: number, c: Rgb = GREY, k = 2): number {
  lines.forEach((l, i) => say(s, l, x, y + i * (k * 7), c, k));
  return y + lines.length * k * 7;
}
function blitRaster(s: Sheet, R: Raster, dx: number, dy: number, k: number, from: [number, number, number, number] = [0, 0, R.w, R.h]) {
  const [x0, y0, w, h] = from;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y0 + y) * R.w + x0 + x;
    const c: Rgb = R.what[i] ? [R.rgb[i * 3], R.rgb[i * 3 + 1], R.rgb[i * 3 + 2]] : BG;
    s.rect(dx + x * k, dy + y * k, k, k, c.map(Math.round) as Rgb);
  }
}
function save(sheet: Sheet, name: string) {
  const out = join(ROOT, '.art-preview', name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`essai-relief-gradins -> ${out} (${sheet.w} x ${sheet.h})`);
}
/** Xéros (rangées 14 à 45), les pieds sur la ligne `foot`. */
const xerosAt = (s: Sheet, x: number, foot: number, k: number, grid: Grid = XG) => s.blit(grid, xeros.palette, x, foot - 46 * k, k, [14, 45]);
/** Un champ de terre en coupe de nx × ny cases, tirées comme dans le jeu (`cutVariant`), ou comme avant (`before`). */
function cutField(nx: number, ny: number, tx0: number, ty0: number, before = false): Grid {
  const tiles = before ? [0, 1, 2].map((k) => g(cutBefore(k))) : Array.from({ length: CUT_VARIANTS }, (_, k) => g(cut(k)));
  const out: string[] = [];
  for (let j = 0; j < ny * 32; j++) {
    let line = '';
    for (let i = 0; i < nx; i++) {
      const tx = tx0 + i;
      const ty = ty0 + Math.floor(j / 32);
      const v = before ? Math.floor(hashOf(tx, ty, 77) * 3) : cutVariant(tx, ty);
      line += tiles[v][j % 32];
    }
    out.push(line);
  }
  return out;
}

// =====================================================================================================================
// 1. les matières
// =====================================================================================================================

function sheet1() {
  const s = new Sheet(1900, 2480, BG);
  const P = 24;
  say(s, 'Le tunnel en gradins - 1. les matieres, une par une (x4), avec Xeros', P, 14, GOLD, 4);
  say(s, 'Essais hors jeu. Xeros mesure 1,60 m. Un gradin a 50 cm de profondeur, une marche 1,25 m de haut.', P, 46, SOFT);
  let y = 76;

  // --- le dessus du gradin
  say(s, 'Le dessus du gradin (50 cm de profondeur) : de l herbe, de la terre, des feuilles. En haut, la terre tombee de la marche', P, y, GOLD);
  say(s, 'du dessus ; en bas, le bord, ou l herbe pousse plus dru avant de pendre sur la marche du dessous. Quatre variantes.', P, y + 16, GOLD);
  y += 40;
  [0, 1, 2, 3].forEach((k) => s.blit(g(tread(k)), world, P + (k % 2) * 290, y + Math.floor(k / 2) * 56, 4));
  xerosAt(s, P + 600, y + 110, 4);
  // la longueur d'un gradin, à x2 : 4 variantes bout à bout
  [0, 1, 2, 3].forEach((k) => s.blit(g(tread(k)), world, P + 760 + k * 128, y + 20, 2));
  say(s, 'bout a bout (x2) : le raccord', P + 760, y + 50, SOFT);
  y += 140;

  // --- la contremarche
  say(s, 'La marche (1,25 m de haut, jusqu a la poitrine de Xeros) : de la terre, des mottes, de la mousse. Du gradin du dessus', P, y, GOLD);
  say(s, 'pendent l herbe, le lierre et des racines fines ; au pied, la terre tombee. A droite : sous un arbre, ses racines la descendent.', P, y + 16, GOLD);
  y += 40;
  [0, 1].forEach((k) => s.blit(g(riser(k)), world, P + k * 290, y, 4));
  // avec les racines d'un arbre posées dessus
  const withRoots = riser(2);
  withRoots.stamp(g(roots(0)), 12, 0);
  withRoots.stamp(g(roots(2)), 42, 0);
  s.blit(g(withRoots), world, P + 580, y, 4);
  xerosAt(s, P + 870, y + 112, 4);
  say(s, 'avec les racines de deux arbres', P + 580, y + 108, SOFT);
  y += 150;

  // --- une marche montée : gradins et marches empilés, comme le jeu les voit
  say(s, 'Comment elles se posent : trois marches et trois gradins, vus comme dans le jeu (x2), le chemin clair en bas et Xeros dessus.', P, y, GOLD);
  y += 24;
  {
    const x0 = XR1 + 40;
    const R = renderTerrain({ x0, w: 220, r0: -165, h: 225, cutSouth: true }, new Map());
    drawSprites(R, [{ key: 'xeros-down', x: x0 + 110, y: 0, h: 0 }], sprite);
    blitRaster(s, R, P, y, 2);
    const rows: [number, string][] = [[-155 + 165, 'dessus (5 m)'], [-142 + 165, 'marche 4'], [-125 + 165, 'gradin 3'], [-107 + 165, 'marche 3'], [-90 + 165, 'gradin 2'], [-72 + 165, 'marche 2'], [-55 + 165, 'gradin 1'], [-37 + 165, 'marche 1'], [-12 + 165, 'le chemin'], [40 + 165, 'la terre en coupe']];
    for (const [r, t] of rows) say(s, t, P + 450, y + r * 2 - 4, SOFT);
    para(s, [
      'Sans les arbres, pour lire la forme : chaque gradin est une bande de 10 px,',
      'chaque marche une bande de 25 px. Les gradins se lisent par leur herbe,',
      'plus claire que la terre des marches.',
    ], P + 700, y + 20, GREY);
    y += 470;
  }

  // --- la terre en coupe
  say(s, 'La terre en coupe : la masse sud, tranchee au ras du chemin, vue de dessus (comme le mur sud d une maison coupe au ras du sol).', P, y, GOLD);
  say(s, 'Une terre pleine et plate, des racines et des cailloux tranches, un trait leger en biais. Huit variantes (x4), puis posees par case (x2).', P, y + 16, GOLD);
  y += 40;
  for (let k = 0; k < CUT_VARIANTS; k++) {
    s.blit(g(cut(k)), world, P + k * 140, y, 4);
    say(s, String(k), P + k * 140, y + 132, SOFT);
  }
  y += 156;
  s.blit(cutField(12, 4, 0, 0), world, P, y, 2);
  xerosAt(s, P + 820, y + 200, 4);
  para(s, [
    'Le tirage, par case de 32 px :',
    'v = partie entiere de hash(tx, ty, 77) x 8 ;',
    'tant que v vaut le tirage brut de la case de',
    'gauche ou de celle du dessus, v = (v + 1) mod 8.',
    'Toutes les variantes ont le meme bord (5 px) :',
    'n importe laquelle se raccorde a n importe laquelle.',
  ], P + 900, y + 10, GREY);
  y += 280;

  // --- le sol clair
  say(s, 'Le sol clair du chemin (2,5 m de large), celui deja valide : le bord nord en haut, le bord sud en bas.', P, y, GOLD);
  y += 24;
  {
    const top = g(lane(14, 0));
    const bot = g(lane(11, 2));
    const strip = [...top.slice(0, 25).map((l) => l + l), ...bot.slice(6, 31).map((l) => l + l)];
    s.blit(strip, world, P, y, 4);
    xerosAt(s, P + 100, y + 120, 4);
  }
  y += 220;

  // --- les plantes
  say(s, 'Les plantes des gradins, droites, dans toutes leurs vues (x4). Une seule rangee par gradin : un tronc et ses racines.', P, y, GOLD);
  y += 24;
  const foot = y + 470;
  s.rect(P, foot, 1840, 1, [90, 98, 80]);
  xerosAt(s, P, foot, 4);
  const list: [PlantKey, string[]][] = [
    ['gradin-hazel', ['noisetier (cepee)', 'rond : 1 vue', '2,2 x 1,5 x 3,8 m']],
    ['gradin-ash', ['jeune frene', 'rond : 1 vue', '1,6 x 1,4 x 4,2 m']],
    ['gradin-bush', ['buisson long', 'symetrique : 2 vues', 'est-ouest', '1,5 m x 50 cm x 90 cm']],
    ['gradin-bush-ns', ['buisson long', 'nord-sud', '(ou vu par le bout)']],
    ['gradin-briar', ['eglantier', 'rond : 1 vue', '90 x 50 x 70 cm']],
  ];
  let x = P + 160;
  const checks: string[] = [];
  for (const [key, lines] of list) {
    const p = PLANTS[key];
    const grid = p.draw().toGrid();
    const sil = silhouette(grid, world);
    const e = expectedSize(p.dims as unknown as Dims);
    s.blit(grid, world, x, foot - (p.foot[1] + 1) * 4, 4);
    const ok = Math.abs(sil.w - e.w) <= 2 && Math.abs(sil.h - e.h) <= 2;
    lines.forEach((l, i) => say(s, l, x, foot + 12 + i * 14, i === 0 ? GREY : SOFT));
    say(s, `dessin ${sil.w} x ${sil.h} px`, x, foot + 12 + lines.length * 14, ok ? SOFT : RED);
    say(s, `gabarit ${Math.round(e.w)} x ${Math.round(e.h)} ${ok ? 'ok' : 'ECART'}`, x, foot + 26 + lines.length * 14, ok ? SOFT : RED);
    checks.push(`${key} : dessine ${sil.w} x ${sil.h}, gabarit ${e.w} x ${e.h} ${ok ? 'ok' : 'ECART'}`);
    x += Math.max(grid[0].length * 4 + 40, 250);
  }
  // à x1 et x2, côte à côte, avec Xéros, comme dans le jeu
  {
    const f1 = foot;
    let xx = P + 1380;
    say(s, 'a x1, comme dans le jeu', xx, f1 - 120, SOFT);
    xerosAt(s, xx, f1, 1);
    xx += 16;
    for (const [key] of list) {
      const p = PLANTS[key];
      const grid = p.draw().toGrid();
      s.blit(grid, world, xx, f1 - p.foot[1] - 1, 1);
      xx += grid[0].length + 4;
    }
    let x2 = P + 1380;
    const f2 = foot - 150;
    say(s, 'a x2', x2, f2 - 210, SOFT);
    xerosAt(s, x2, f2, 2);
    x2 += 30;
    for (const [key] of list) {
      const p = PLANTS[key];
      const grid = p.draw().toGrid();
      s.blit(grid, world, x2, f2 - (p.foot[1] + 1) * 2, 2);
      x2 += grid[0].length * 2 + 6;
    }
  }
  y = foot + 120;
  para(s, [
    'Pourquoi ces vues : le noisetier, le frene et l eglantier sont ronds (on en fait le tour, ils se ressemblent de tous les cotes,',
    'comme les arbres du jeu) : une vue. Le buisson long suit le gradin : il est symetrique, deux vues (est-ouest et nord-sud).',
    'Les grands arbres du dessus sont ceux du jeu (gros arbre, arbre normal), repris tels quels.',
  ], P, y, GREY);
  console.log(checks.join('\n'));
  save(s, 'relief-gradins-1-matieres.png');
}

// =====================================================================================================================
// 2. ce que voit le joueur
// =====================================================================================================================

interface Shot { x: number; dir: string; extraBelow?: number }

/** Ce que voit le joueur, Xéros en (x, 0) au milieu de l'écran, les pieds à la rangée 130. */
function playerView(shot: Shot, seed: number): Raster {
  // la bande sombre sous le chemin (correction 1) : le fantôme ne se peint pas sur la terre en coupe ; voir applyGloom pour sa pénombre
  const extra = shot.extraBelow ?? 0;
  const x0 = Math.round(shot.x - VW / 2);
  const r0 = -FEET_ROW;
  const o = { x0, w: VW, r0, h: VH + extra };
  const plants = plantRows(x0 - 120, x0 + VW + 120, seed);
  const main = renderTerrain({ ...o, cutSouth: true }, plants.roots);
  // côté ferme, dehors : quelques buissons et arbres sur les rampes et la pente
  const outside: Placed[] = [];
  for (let i = 0; i < 8; i++) {
    const x = XF + 30 + i * 28;
    for (const side of [-1, 1]) {
      const y = side * (MOUTH + 20 + ((i * 37) % 60));
      const gr = ground(x, y);
      if (gr.kind === 'slope') outside.push({ key: i % 3 === 0 ? 'gradin-hazel' : i % 3 === 1 ? 'gradin-bush' : 'gradin-briar', x, y, h: gr.h });
    }
  }
  const north = plants.things.filter((p) => !p.ghost);
  drawSprites(main, [...north, ...outside, { key: `xeros-${shot.dir}`, x: shot.x, y: 0, h: 0 }], sprite);
  applyGloom(main, FLOOR_GLOOM);
  // le fantôme : ce qui est au sud du chemin (ses gradins, leurs arbres, le dessus et ses grands arbres), dans le trou seulement
  const ghost = renderTerrain({ ...o, southOnly: STEP.half + 1 }, plants.roots);
  drawSprites(ghost, plants.things.filter((p) => p.ghost), sprite, false);
  for (let k = 0; k < main.w * main.h; k++) {
    if (!ghost.what[k]) continue;
    if (main.x0 + (k % main.w) >= XF) continue;
    if (!MODE.before && main.what[k] === 1 && main.kind[k] === 'cut') continue;
    // seulement là où le sud passe devant ce que l'on voit (pas sur la terre en coupe, qui est déjà lui)
    main.put(k, [ghost.rgb[k * 3], ghost.rgb[k * 3 + 1], ghost.rgb[k * 3 + 2]], FADE);
  }
  return main;
}

function sheet2() {
  const K = 2;
  const W = 1900;
  const s = new Sheet(W, 1950, BG);
  const P = 24;
  say(s, 'Le tunnel en gradins - 2. ce que voit le joueur (x2, l ecran au zoom de depart)', P, 14, GOLD, 4);
  say(s, 'Le cadre est l ecran du jeu. Derriere Xeros, les gradins nord montent etage par etage ; devant lui, la terre en coupe ; le sud en fantome.', P, 46, SOFT);
  let y = 80;
  const notes: [string, Shot, number, string[]][] = [
    ['a. cote ferme', { x: XF - 225, dir: 'left' }, 11, [
      'Xeros sur le chemin clair, au fond du trou.',
      '(Le cote ferme ne fait que 17,6 m, moins qu un',
      'ecran : la gauche du cadre est deja sur la riviere,',
      'ce qui ne change rien dedans.)',
      '',
      'Derriere lui, du bas vers le haut : la marche 1,',
      'le gradin 1 et sa rangee d arbres, la marche 2,',
      'le gradin 2 et sa rangee, la marche 3, le gradin 3',
      'et sa rangee, coupee par le haut de l ecran.',
      'Les arbres sont droits : chaque rangee pousse sur',
      'son gradin et sa couronne monte devant la marche',
      'et le gradin du dessus. Les etages d arbres,',
      'les uns au-dessus des autres, ferment le haut.',
      '',
      'Devant lui : la terre en coupe (la masse sud',
      'tranchee au ras du chemin).',
      '',
      'Par-dessus, en fantome (il en reste 0,2) : les',
      'gradins sud, leurs arbres et les grands arbres',
      'du dessus sud, sur le chemin et ce qui est',
      'derriere ; jamais sur la terre en coupe, qui',
      'garde la penombre du sol du chemin, partout.',
    ]],
    ['b. au-dessus de la riviere', { x: (XR0 + XR1) / 2, dir: 'left', extraBelow: 110 }, 23, [
      'La meme image : la masse passe au-dessus de',
      'l eau, 6 m de dessus de chaque cote du trou.',
      '',
      'L eau reste hors de l ecran : sous le cadre (en',
      'gris), on voit ou elle commence, contre la face',
      'de la masse, bien plus bas que le bas de l ecran.',
      'Rien ne ressemble a un pont : sous Xeros, il n y',
      'a que de la terre.',
    ]],
    ['c. a la bouche est', { x: XF - 40, dir: 'right' }, 37, [
      'Xeros 2 m a l interieur, il sort vers la ferme.',
      '',
      'A droite, la ferme en pleine lumiere : le chemin',
      'de la ferme, l herbe, et les deux rampes plantees',
      'qui montent au dessus, au nord et au sud de la',
      'bouche (on voit le flanc de terre de la rampe',
      'nord, la rampe sud est devant).',
      '',
      'La face de la bouche est vue par la tranche : les',
      'gradins s arretent net. La lumiere du dehors entre',
      'sur les premiers metres (3,5 m), puis la penombre.',
      'Le fantome du sud s arrete a la face.',
    ]],
  ];
  for (const [title, shot, seed, lines] of notes) {
    const R = playerView(shot, seed);
    say(s, title, P, y, GOLD, 3);
    const top = y + 26;
    blitRaster(s, R, P, top, K, [0, 0, R.w, VH]);
    if (shot.extraBelow) {
      // sous le cadre : la suite, assombrie (hors de l'écran)
      const tmp = new Sheet(R.w * K, shot.extraBelow * K, BG);
      blitRaster(tmp, R, 0, 0, K, [0, VH, R.w, shot.extraBelow]);
      for (let j = 0; j < tmp.h; j++) for (let i = 0; i < tmp.w; i++) {
        const o = (j * tmp.w + i) * 4;
        const c: Rgb = [tmp.png.data[o], tmp.png.data[o + 1], tmp.png.data[o + 2]];
        s.dot(P + i, top + VH * K + j, [c[0] * 0.55 + 18, c[1] * 0.55 + 20, c[2] * 0.55 + 16]);
      }
      say(s, 'hors de l ecran (assombri) : la terre en coupe, puis l eau contre la face sud de la masse', P + 10, top + VH * K + 10, GREY);
    }
    s.outline(P - 2, top - 2, VW * K + 4, VH * K + 4, GOLD);
    // la règle des rangées depuis les pieds
    for (const [r, t] of [[-130, '-130'], [-95, '-95'], [-60, '-60'], [-25, '-25'], [0, 'pieds'], [25, '+25']] as [number, string][]) {
      const yy = top + (FEET_ROW + r) * K;
      s.rect(P + VW * K + 6, yy, 8, 2, SOFT);
      say(s, t, P + VW * K + 18, yy - 4, SOFT);
    }
    para(s, lines, P + VW * K + 90, top + 4, GREY);
    y = top + (VH + (shot.extraBelow ?? 0)) * K + 40;
  }
  save(s, 'relief-gradins-2-scenes.png');
}

// =====================================================================================================================
// 3. la vue d'ensemble
// =====================================================================================================================

function sheet3() {
  const x0 = 0;
  const x1 = 64 * 32;
  const r0 = -540;
  const r1 = 330;
  const all = plantRows(XW, XF, 5);
  // le plateau, la ferme : des arbres et des buissons dehors
  const extra: Placed[] = [];
  // le plateau : une forêt claire, des arbres épars (pas en rangs)
  for (let i = 0; i < 70; i++) {
    const x = 10 + Math.floor(hashOf(i, 1, 900) * (XR0 - 40));
    const side = hashOf(i, 2, 900) < 0.5 ? 1 : -1;
    const y = side * (EDGE + 110 + Math.floor(hashOf(i, 3, 900) * 330));
    if (x < XW + 40 && Math.abs(y) < 120) continue;
    extra.push({ key: hashOf(i, 4, 900) < 0.6 ? 'normal-tree' : 'big-tree', x, y, h: TOP });
  }
  for (let x = XR1 + 20; x < XF; x += 46) for (const side of [-1, 1]) {
    const y = side * (MASS + 30 + ((x * 3) % 50));
    const gr = ground(x, y);
    if (gr.kind === 'slope') extra.push({ key: (x / 46) % 3 < 1 ? 'gradin-hazel' : 'gradin-bush', x, y, h: gr.h });
  }
  for (let x = XF + 20; x < XF + RAMP; x += 34) for (const side of [-1, 1]) {
    const y = side * (MOUTH + 25 + ((x * 5) % 50));
    const gr = ground(x, y);
    if (gr.kind === 'slope') extra.push({ key: (x / 34) % 2 < 1 ? 'gradin-briar' : 'gradin-hazel', x, y, h: gr.h });
  }
  const R = renderTerrain({ x0, w: x1 - x0, r0, h: r1 - r0, ymin: -620, ymax: 480 }, all.roots);
  const seen = all.things.filter((p, i) => !(p.ghost && (p.key === 'big-tree' || p.key === 'normal-tree') && i % 3 !== 0));
  drawSprites(R, [...seen, ...extra, { key: 'xeros-left', x: XF + 140, y: 0, h: 0 }, { key: 'xeros-right', x: XW - 70, y: 0, h: TOP }], sprite);
  applyGloom(R, FLOOR_GLOOM);

  const P = 24;
  const half = (x1 - x0) / 2;
  const s = new Sheet(half + 2 * P + 20, 330 + 2 * (r1 - r0) + 300, BG);
  say(s, 'Le tunnel en gradins - 3. vue d ensemble, de dehors, depuis le sud', P, 14, GOLD, 4);
  say(s, 'Dans la projection du jeu (x1), sans fantome : c est le tunnel vu de dehors. En haut le tout reduit de moitie,', P, 46, SOFT);
  say(s, 'puis la moitie ouest (le plateau) et la moitie est (la riviere, la ferme), en vraie taille.', P, 62, SOFT);
  // le tout, réduit de moitié
  let y = 86;
  for (let j = 0; j < (r1 - r0) / 2; j++) for (let i = 0; i < half; i++) {
    const k = j * 2 * R.w + i * 2;
    s.dot(P + i, y + j, R.what[k] ? [R.rgb[k * 3], R.rgb[k * 3 + 1], R.rgb[k * 3 + 2]] : BG);
  }
  const lab = (t: string, x: number, yy: number) => say(s, t, P + x, yy, GOLD);
  lab('plateau (ouest)', 10, y + 4);
  lab('la riviere', XR0 / 2 - 10, y + 4);
  lab('la ferme (est)', XF / 2 + 30, y + 4);
  y += (r1 - r0) / 2 + 30;
  // les deux moitiés en vraie taille
  for (const [i, t] of [[0, 'moitie ouest : le chemin monte de 0 a 5 m vers le plateau, le trou s aplatit, les quatre marches rapetissent ensemble'], [1, 'moitie est : la masse au-dessus de la riviere (l eau s arrete contre ses faces), le cote ferme, la bouche est']] as [number, string][]) {
    say(s, t, P, y, GOLD);
    y += 18;
    blitRaster(s, R, P, y, 1, [i * half, 0, half, r1 - r0]);
    y += r1 - r0 + 16;
  }
  para(s, [
    'Ce qu on voit : au premier plan, le dessus sud (deux grands arbres sur trois retires ici, pour voir dedans) et sa pente plantee ; au fond, les gradins',
    'nord montent etage par etage avec leur rangee d arbres droits, le dessus nord et ses grands arbres. La riviere passe sous',
    'la masse sans y entrer : elle s arrete contre la face sud (devant) et la face nord (derriere). Xeros, a l echelle, sur le',
    'chemin de la ferme et a la sortie ouest, sur le plateau.',
  ], P, y, GREY);
  save(s, 'relief-gradins-3-ensemble.png');
}

// =====================================================================================================================
// 4. la bouche est, vue de face
// =====================================================================================================================

function sheet4() {
  const K = 2;
  const A = 300; // de -A à +A (a : vers le nord, à droite quand on regarde vers l'ouest)
  const HT = 280; // de la hauteur 0 vers le haut
  const BAND = 36; // le devant, la cour de la ferme
  const W = 2 * A;
  const H = HT + BAND;
  const R = new Raster(W, H, 0, 0);
  const put = (u: number, h: number, c: Rgb | [number, number, number, number], a = 1) => {
    const x = Math.round(u + A);
    const y = Math.round(HT - 1 - h);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const k = y * W + x;
    R.put(k, c, a);
    R.what[k] = 1;
  };
  const hexOf = (pal: Record<string, string>, ch: string): Rgb => { const h = pal[ch].replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb; };
  // le ciel, en deux aplats
  for (let h = 0; h < HT; h++) for (let u = -A; u < A; u++) put(u, h, hexOf(skyPal, h > 180 ? '<' : '>'));
  const hmax = (a: number) => (a <= MASS ? TOP : Math.max(0, TOP * (1 - (a - MASS) / SLOPE)));
  const open = (h: number) => (h >= TOP ? EDGE : STEP.half + STEP.tread * Math.floor(h / STEP.rise));
  const face = g(faceEarth(1));
  const grassT = ['grass', 'grass2', 'grass3'].map((k) => (tilesetW.tiles as Record<string, Grid>)[k]);
  // au loin, derrière la face : le dessus et ses grands arbres, plus loin et plus pâles (posés plus bas : avant la face)
  const far: Placed[] = [];
  for (const [a, key] of [[-150, 'big-tree'], [-95, 'normal-tree'], [-68, 'big-tree'], [72, 'normal-tree'], [104, 'big-tree'], [158, 'normal-tree'], [-200, 'normal-tree'], [210, 'big-tree']] as [number, string][]) far.push({ key, x: a, y: 0, h: TOP });
  const drawAt = (p: Placed, dim = 0, alpha = 1) => {
    const img = sprite(p.key);
    for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) {
      const o = (j * img.w + i) * 4;
      const al = img.rgba[o + 3];
      if (!al) continue;
      const c: Rgb = [img.rgba[o], img.rgba[o + 1], img.rgba[o + 2]];
      const d: Rgb = [c[0] * (1 - dim) + 20 * dim, c[1] * (1 - dim) + 30 * dim, c[2] * (1 - dim) + 26 * dim];
      put(p.x - img.footX + i, p.h + img.footY - j, d, (al / 255) * alpha);
    }
  };
  for (const p of far) drawAt(p, 0.12);
  // dans le trou : la profondeur du tunnel, dans la pénombre, le chemin clair qui s'en va, la lumière au bout
  const GL: Rgb = [0x1c, 0x24, 0x1c];
  for (let u = -EDGE; u <= EDGE; u++) for (let h = 0; h < TOP + 6; h++) {
    const a = Math.abs(u);
    if (a >= open(h) && h < TOP) continue;
    if (h >= TOP) { if (a > EDGE) continue; put(u, h, hexOf(skyPal, '>'), 0); continue; }
    const t = h / TOP;
    put(u, h, [GL[0] + 60 * t, GL[1] + 70 * t, GL[2] + 50 * t]);
  }
  // au bout, loin, la lumière du plateau (le chemin remonte à fleur)
  for (let u = -14; u <= 14; u++) for (let h = 30; h < 62; h++) if ((u / 14) ** 2 + ((h - 46) / 16) ** 2 < 1) put(u, h, [150, 160, 120], 0.18);
  // le chemin clair, par la tranche, qui entre
  const ln = g(lane(14, 3));
  for (let u = -STEP.half; u < STEP.half; u++) for (let h = 0; h < 3; h++) put(u, h, rgbOf(ln[10 + h][((u % 32) + 32) % 32]));
  // les rangées d'arbres des gradins, un peu en retrait de la face (elles poussent dans le trou) : au fond, assombries, puis devant ;
  // la face, peinte ensuite, les découpe : on ne les voit que dans le fer à cheval et au-dessus du dessus
  const row = (k: number, sd: number, deep: number): Placed => {
    const keys: PlantKey[] = ['gradin-hazel', 'gradin-ash', 'gradin-hazel'];
    const keyB: PlantKey[] = ['gradin-bush-ns', 'gradin-briar', 'gradin-ash'];
    const key = deep ? keyB[(k + (sd > 0 ? 1 : 0)) % 3] : keys[(k + (sd > 0 ? 1 : 0)) % 3];
    return { key, x: sd * (STEP.half + STEP.tread * (k - 1) + 5), y: 0, h: STEP.rise * k };
  };
  for (let k = 3; k >= 1; k--) for (const sd of [-1, 1]) drawAt(row(k, sd, 1), 0.5);
  for (let k = 3; k >= 1; k--) for (const sd of [-1, 1]) drawAt(row(k, sd, 0), 0.08 * (3 - k));
  // les grands arbres du bord, au-dessus de la face
  for (const [a, key] of [[-78, 'normal-tree'], [86, 'big-tree']] as [number, string][]) drawAt({ key, x: a, y: 0, h: TOP });
  // la masse : la face de la bouche (|a| <= MOUTH) et, de part et d'autre, les rampes plantées vues de face
  for (let u = -A; u < A; u++) {
    const a = Math.abs(u);
    for (let h = 0; h < hmax(a); h++) {
      if (a < open(h) && a <= EDGE) continue; // le trou
      let ch: string;
      if (a <= MOUTH) ch = face[99 - h][((u % 64) + 64) % 64];
      else ch = grassT[Math.floor(Math.abs(Math.floor(u / 32) * 7 + Math.floor(h / 32) * 3)) % 3][((-h % 32) + 32) % 32][((u % 32) + 32) % 32];
      put(u, h, rgbOf(ch));
      // les rampes, plus proches que la face, en herbe ; leur bord contre la face, une arête de terre
      if (a > MOUTH && a < MOUTH + 3) put(u, h, rgbOf(a < MOUTH + 1 ? 'e' : 'n'));
      // le bord du trou sur la face : la terre tranchée, plus claire, d'un pixel (la marche vue par son bout)
      if (a <= EDGE + 1 && a >= open(h) && a < open(h) + 2) put(u, h, rgbOf(a < open(h) + 1 ? 'n' : 'e'));
    }
    // l'herbe du dessus, vue par la tranche
    const top = Math.ceil(hmax(a));
    if (top > 0 && !(a <= EDGE)) { put(u, top, rgbOf('v')); put(u, top - 1, rgbOf(((u >> 1) & 1) ? 'g' : 'v')); }
  }
  // le bout de chaque gradin, sur la face : son herbe au bord (une touffe qui dépasse par endroits)
  for (let k = 1; k <= 3; k++) for (const sd of [-1, 1]) for (let a = STEP.half + STEP.tread * (k - 1); a <= STEP.half + STEP.tread * k; a++) {
    put(sd * a, STEP.rise * k - 1, rgbOf('v'));
    put(sd * a, STEP.rise * k - 2, rgbOf('V'));
    put(sd * a, STEP.rise * k, rgbOf((a * 3 + k) % 4 === 0 ? 'G' : 'g'));
    if ((a + k) % 3 === 0) put(sd * a, STEP.rise * k + 1, rgbOf('g'));
  }
  // sur les rampes : buissons et noisetiers
  for (const [a, h, key] of [[-140, 30, 'gradin-briar'], [-120, 70, 'gradin-hazel'], [-230, 10, 'gradin-bush-ns'], [130, 45, 'gradin-bush-ns'], [160, 85, 'gradin-hazel'], [240, 12, 'gradin-briar']] as [number, number, string][]) drawAt({ key, x: a, y: 0, h: Math.min(h, hmax(Math.abs(a)) - 2) });
  // le devant : la cour de la ferme (herbe), le chemin qui entre
  const tiles = { grass: g(lane(15, 0)) };
  void tiles;
  for (let u = -A; u < A; u++) for (let j = 0; j < BAND; j++) {
    const x = Math.round(u + A);
    const y = HT + j;
    const a = Math.abs(u);
    const ch = a <= STEP.half + j * 0.15 ? g(lane(15, 2))[j % 32][((u % 32) + 32) % 32] : ((u * 7 + j * 13) % 11 === 0 ? 'G' : (u + j) % 5 === 0 ? 'v' : 'g');
    const k = y * W + x;
    R.put(k, rgbOf(ch));
    R.what[k] = 1;
  }
  // Xéros, de dos, qui entre
  drawAt({ key: 'xeros-up', x: 0, y: 0, h: -8 });

  const P = 24;
  const s = new Sheet(1900, H * K + 420, BG);
  say(s, 'Le tunnel en gradins - 4. la bouche est, vue de face depuis la ferme (x2)', P, 14, GOLD, 4);
  say(s, 'Une vue de face, a plat (pas la vue du jeu : le jeu voit cette face par la tranche). Le nord a droite, le sud a gauche.', P, 46, SOFT);
  const top = 80;
  blitRaster(s, R, P, top, K);
  const yb = top + H * K + 20;
  // les cotes, en mots simples
  const mark = (u: number, h: number, t: string, dx = 0) => {
    const x = P + (u + A) * K;
    const yy = top + (HT - 1 - h) * K;
    s.rect(x - 2, yy - 2, 4, 4, GOLD);
    const lx = P + (MOUTH + 12 + A) * K;
    for (let i = x + 4; i < lx - 4; i += 4) s.rect(i, yy, 2, 1, GOLD);
    say(s, t, lx + dx, yy - 6, GOLD);
  };
  mark(EDGE + 2, TOP, 'le dessus, 5 m');
  mark(STEP.half + 22, 3 * STEP.rise, 'gradin 3', 0);
  mark(STEP.half + 12, 2 * STEP.rise, 'gradin 2', 0);
  mark(STEP.half + 2, STEP.rise, 'gradin 1', 0);
  para(s, [
    'Le fer a cheval en gradins : la face de terre (au milieu) ou s ouvre le trou. De chaque cote, quatre marches de 1,25 m et trois',
    'gradins de 50 cm, chacun avec sa rangee d arbres droits (a la bouche, puis d autres derriere, dans la penombre). Les etages d arbres',
    'se serrent les uns au-dessus des autres et referment le haut ; au-dessus, les grands arbres du dessus. Le chemin clair entre au milieu.',
    'De part et d autre de la face, les deux rampes plantees qui montent de la ferme au dessus (vues de face, elles viennent vers nous).',
    'Au fond du trou, loin, la lumiere du plateau. Xeros, de dos, entre dans le tunnel.',
  ], P, yb, GREY);
  save(s, 'relief-gradins-4-bouche.png');
}

// =====================================================================================================================
// 5. les trois corrections, avant et après
// =====================================================================================================================

function sheet5() {
  const K = 2;
  const P = 24;
  const s = new Sheet(1900, 1640, BG);
  say(s, 'Le tunnel en gradins - 5. les trois corrections, avant et apres (x2, avec Xeros)', P, 14, GOLD, 4);
  say(s, 'Essais hors jeu. A gauche avant, a droite apres.', P, 46, SOFT);
  let y = 80;

  // --- 1. la bande sombre
  say(s, '1. La bande sombre sous le chemin, cote ferme', P, y, GOLD, 3);
  y += 30;
  const shot: Shot = { x: XF - 225, dir: 'left' };
  MODE.before = true;
  const A = playerView(shot, 11);
  MODE.before = false;
  const B = playerView(shot, 11);
  const xB = P + VW * K + 40;
  say(s, 'avant', P, y, SOFT);
  say(s, 'apres', xB, y, SOFT);
  y += 16;
  blitRaster(s, A, P, y, K, [0, 0, A.w, VH]);
  blitRaster(s, B, xB, y, K, [0, 0, B.w, VH]);
  s.outline(P - 2, y - 2, VW * K + 4, VH * K + 4, GOLD);
  s.outline(xB - 2, y - 2, VW * K + 4, VH * K + 4, GOLD);
  y += VH * K + 14;
  y = para(s, [
    'D ou venait la bande : la penombre du trou etait donnee a la terre en coupe sur ses seules rangees a moins de 2,85 m de l axe (la ou',
    'etaient les gradins sud), entiere (0,3) ; plus loin, rien. Et le fantome (0,2) peignait le dessus sud, vert sombre, sur toute la coupe.',
    'La regle retenue : (a) la terre en coupe recoit partout la penombre du sol du chemin a la meme colonne (celle du chemin : 0,3 x FLOOR_GLOOM,',
    'x la lumiere de la bouche, x la profondeur), sans limite de rangee ; (b) le fantome du sud (terrain et plantes, 0,2) ne se peint jamais',
    'sur un pixel de terre en coupe : il s arrete au bord sud du chemin ; ailleurs, inchange (chemin, gradins nord, plantes nord, Xeros, arret a la face).',
  ], P, y, GREY);
  y += 26;

  // --- 2. la terre en coupe
  say(s, '2. La terre en coupe : 3 variantes sans bord commun (avant), 8 variantes a bord commun tirees par case (apres)', P, y, GOLD, 3);
  y += 30;
  const fA = cutField(8, 3, 3, 1, true);
  const fB = cutField(8, 3, 3, 1);
  const xC = P + 8 * 32 * K + 140;
  say(s, 'avant', P, y, SOFT);
  say(s, 'apres', xC, y, SOFT);
  y += 16;
  s.blit(fA, world, P, y, K);
  xerosAt(s, P + 8 * 32 * K + 20, y + 3 * 32 * K, K);
  s.blit(fB, world, xC, y, K);
  xerosAt(s, xC + 8 * 32 * K + 20, y + 3 * 32 * K, K);
  y += 3 * 32 * K + 14;
  y = para(s, [
    'Avant : chaque variante avait sa propre terre de fond, d un bord a l autre : les cases se voyaient (coutures), trois motifs se repetaient.',
    'Apres : la terre de fond melange un bruit commun a toutes les variantes et un bruit propre a chacune ; sur les 5 px du bord, le commun',
    'l emporte (fondu lisse) : toutes se raccordent entre elles. Au milieu, chacune a sa terre, ses racines (2 a 4), ses cailloux (1 a 3),',
    'une poche de gravier (paires) ou une racine coupee en long (3 et 7). Le trait en biais suit (x + y) mod 8 du monde.',
    'Tirage par case (tx, ty) : v = ent(hash(tx, ty, 77) x 8) ; tant que v = ent(hash(tx - 1, ty, 77) x 8) ou ent(hash(tx, ty - 1, 77) x 8),',
    'v = (v + 1) mod 8. (hash : art/world/relief.ts.)',
  ], P, y, GREY);
  y += 26;

  // --- 3. le buisson long vu par le bout
  say(s, '3. Le buisson long vu par le bout (nord-sud) : gabarit 10 x 33 (50 cm x 90 cm + 1,5 m / 2)', P, y, GOLD, 3);
  y += 40;
  const foot = y + 46 * 4 + 10;
  s.rect(P, foot, 1840, 1, [90, 98, 80]);
  const before = bushLongNsBefore().toGrid();
  const after = bushLongNs().toGrid();
  const ew = bushLong().toGrid();
  let x = P;
  const put = (grid: Grid, k: number, fy: number, label: string[]) => {
    s.blit(grid, world, x, foot - (fy + 1) * k, k);
    label.forEach((l, i) => say(s, l, x, foot + 12 + i * 14, i === 0 ? GREY : SOFT));
    x += Math.max(grid[0].length * k + 30, 130);
  };
  xerosAt(s, x, foot, 2); x += 76;
  const sb = silhouette(before, world);
  const sa = silhouette(after, world);
  put(before, 2, 33, ['avant x2', `${sb.w} x ${sb.h}`]);
  put(after, 2, 33, ['apres x2', `${sa.w} x ${sa.h}`]);
  put(ew, 2, 24, ['est-ouest x2', '30 x 23']);
  x += 40;
  xerosAt(s, x, foot, 4); x += 150;
  put(before, 4, 33, ['avant x4']);
  put(after, 4, 33, ['apres x4']);
  put(ew, 4, 24, ['est-ouest x4']);
  y = foot + 60;
  para(s, [
    'Apres : en bas, le bout sud, une touffe ronde et bombee, plus sombre (elle tourne le dos au ciel), les tiges et le creux sombre au pied ;',
    'au-dessus, separe par un lisere d ombre, le dos du buisson qui file vers le nord, vu de dessus : un coussin de touffes serrees, clair',
    '(le dessus prend la lumiere), le bout nord arrondi, les flancs bosseles ; l ombre au sol longe le flanc est sur toute la longueur.',
    `Silhouette ${sa.w} x ${sa.h} px (gabarit 10 x 33, a 2 px pres).`,
  ], P, y, GREY);
  save(s, 'relief-gradins-5-corrections.png');
}

sheet1();
sheet2();
sheet3();
sheet4();
sheet5();
