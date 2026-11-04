// Planche de la cheminée paysanne (proposition validée par Grégoire, intégrée au jeu avec la hotte à 1,50 m) : npx tsx tools/essai-cheminee.ts écrit
// .art-preview/cheminee-2.png. Les pièces sont les images du jeu (art/world/chimney.ts, le pan percé d'art/world/xeros-house.ts).
//
//   1. chaque pièce dans ses vues, au gabarit (dimensions réelles, taille attendue `ground` : W × (H + D), taille dessinée), Xéros à côté ;
//   2. le pan nord percé, ses quatre vues ; la vérification « comme le jeu » : le pan posé par-dessus la souche (le jeu le dessine
//      après elle, son bord sud est plus au sud) ;
//   3. la cheminée montée à ses vraies hauteurs (projection y − z), vue de face depuis la salle et vue de côté (de l'ouest), Xéros
//      devant l'âtre et sous le manteau ;
//   4. la maison vue de dehors, du sud (le jeu) et du nord : la souche qui sort du pan nord ;
//   5. le bas de la vue de face agrandi x4.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import worldTiles from '../art/world/tiles';
import { interiorTiles } from '../art/interior/house';
import { PLAN_LONG, bounds, hash, houseScene, render, type Board, type Bounds, type Layer, type Quad, type Scene } from '../art/proposals/maison-xeros';
import {
  AT, DIMS, FLUE_COUNT, PAL, PAN_CAP, PAN_FLUE, VIEW_ROT, chimneyQuads, images, mantel, piercedRoof, stackInPan, type Img,
} from '../art/proposals/cheminee-2';
import { rotP, rotQuads, type Tex } from '../art/lib/volumes';
import { expectedSize, silhouette, type Dims } from '../src/content/gabarit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = 2;
const BG: Rgb = [58, 52, 44];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];
const GOLD: Rgb = [245, 215, 120];
const CYAN: Rgb = [140, 220, 235];
const ROSE: Rgb = [240, 140, 140];

// ---------- les images du jeu ----------

function frame(name: string): { grid: Grid; pal: Palette } {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-cheminee : pas de planche « ${name} »`);
  return { grid: s.animations['idle-down'].frames[0], pal: s.palette };
}
function img(name: string): { grid: Grid; pal: Palette } {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'image') throw new Error(`essai-cheminee : pas d'image « ${name} »`);
  return { grid: s.grid, pal: s.palette };
}
const hexOf = (pal: Palette, k: string) => pal[k];
const GRASS = ['grass', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6'];
const FLOOR = ['floor', 'floor2', 'floor3', 'floor4'];
const tiles = {
  grass: (x: number, y: number) => {
    const t = worldTiles.tiles[GRASS[Math.floor(hash(5, Math.floor(x / 32), Math.floor(y / 32)) * GRASS.length)]];
    return hexOf(worldTiles.palette, t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]);
  },
  floor: (x: number, y: number) => {
    const t = interiorTiles.tiles[FLOOR[Math.floor(hash(6, Math.floor(x / 32), Math.floor(y / 32)) * FLOOR.length)]];
    return hexOf(interiorTiles.palette, t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]);
  },
};
/** Un personnage, les pieds au milieu en (x, y). */
function who(name: string, x: number, y: number): Board {
  const f = frame(name), s = silhouette(f.grid, f.pal);
  return { grid: f.grid, pal: f.pal, x: Math.round(x - s.x - s.w / 2), y: Math.round(y - (s.y + s.h)), depth: () => y };
}

// ---------- la planche ----------

interface Block { title: string[]; w: number; h: number; draw: (sh: Sheet, x: number, y: number) => void; notes: string[] }

function blitLayer(sheet: Sheet, l: Layer, ox: number, oy: number, k: number): void {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const q = (y * l.w + x) * 4;
    sheet.rect(ox + x * k, oy + y * k, k, k, [l.rgba[q], l.rgba[q + 1], l.rgba[q + 2]]);
  }
}
/** Un repère horizontal (une ligne de l'écran du jeu, Y) en pointillé sur un rendu, avec son étiquette à droite. */
interface Mark { Y: number; label: string; c: Rgb }
function layerBlock(l: Layer, k: number, title: string[], notes: string[], marks: Mark[] = []): Block {
  const lw = Math.max(0, ...marks.map((m) => textWidth(m.label, T) + 8));
  return {
    title, notes, w: l.w * k + lw, h: l.h * k,
    draw: (sh, x, y) => {
      blitLayer(sh, l, x, y, k);
      for (const m of marks) {
        const yy = y + (m.Y - l.y) * k;
        for (let i = 0; i < l.w * k; i += 6) sh.rect(x + i, yy, 3, 1, m.c);
        sh.text(m.label, x + l.w * k + 4, yy - 5, m.c, T);
      }
    },
  };
}

function sheetOf(rows: Block[][], head: string[]): Sheet {
  const PAD = 16, GAP = 28;
  const bw = (b: Block) => Math.max(b.w, ...[...b.title, ...b.notes].map((l) => textWidth(l, T)));
  const rowH = rows.map((r) => Math.max(...r.map((b) => b.title.length * 12 + 8 + b.h + b.notes.length * 12 + 12)) + GAP);
  const width = PAD * 2 + Math.max(...head.map((h) => textWidth(h, T)), ...rows.map((r) => r.reduce((s, b) => s + bw(b) + GAP, 0)));
  const height = PAD + head.length * 12 + 12 + rowH.reduce((a, b) => a + b, 0);
  const sheet = new Sheet(width, height, BG);
  head.forEach((h, i) => sheet.text(h, PAD, PAD + i * 12, i === 0 ? GOLD : GREY, T));
  let y = PAD + head.length * 12 + 12;
  rows.forEach((r, ri) => {
    let x = PAD;
    const th = Math.max(...r.map((b) => b.title.length * 12 + 8)), ih = Math.max(...r.map((b) => b.h));
    for (const b of r) {
      b.title.forEach((l, i) => sheet.text(l, x, y + i * 12, i === 0 ? GOLD : WHITE, T));
      b.draw(sheet, x, y + th + ih - b.h);
      b.notes.forEach((l, i) => sheet.text(l, x, y + th + ih + 6 + i * 12, i === 0 ? WHITE : GREY, T));
      x += bw(b) + GAP;
    }
    y += rowH[ri];
  });
  return sheet;
}

// ---------- 1. les pièces ----------

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const swap = (d: Dims): Dims => ({ ...d, w: d.d, d: d.w });
const IMGS = images();
const byName = (n: string): Img => {
  const i = IMGS.find((x) => x.name === n);
  if (!i) throw new Error(`essai-cheminee : pas d'image proposée « ${n} »`);
  return i;
};
/** Mesures d'une image : silhouette dessinée, attendue, l'écart. */
const REPORT: string[] = [];
function gauge(name: string, g: Grid, pal: Palette, d: Dims | null): string[] {
  const s = silhouette(g, pal);
  const lines = [`dessine ${s.w}X${s.h} px (image ${g[0].length}X${g.length})`];
  if (d) {
    const e = expectedSize(d), ok = Math.abs(s.w - e.w) <= 2 && Math.abs(s.h - e.h) <= 2;
    lines.unshift(`${d.w}X${d.d}X${d.h} cm : attendu ${fmt(e.w)}X${fmt(e.h)}`);
    lines.push(ok ? 'gabarit : ok (2 px)' : 'gabarit : HORS TOLERANCE');
    REPORT.push(`${name} : ${d.w}x${d.d}x${d.h} cm, attendu ${fmt(e.w)}x${fmt(e.h)}, dessiné ${s.w}x${s.h} (image ${g[0].length}x${g.length}) ${ok ? 'ok' : 'HORS TOLÉRANCE'}`);
  } else REPORT.push(`${name} : dessiné ${s.w}x${s.h} (image ${g[0].length}x${g.length})`);
  return lines;
}
function gridBlock(g: Grid, pal: Palette, k: number, title: string[], notes: string[]): Block {
  return { title, notes, w: g[0].length * k, h: g.length * k, draw: (sh, x, y) => sh.blit(g, pal, x, y, k) };
}
const xg = frame('xeros');
const K1 = 3;
const xerosBlock = (k = K1) => gridBlock(xg.grid, xg.pal, k, ['XEROS', '1,60 M'], gauge('xeros', xg.grid, xg.pal, null));

function piece(name: string, label: string, d: Dims | null, k = K1, grid?: Grid): Block {
  const g = grid ?? byName(name).grid;
  return gridBlock(g, PAL, k, [label, name], gauge(name, g, PAL, d));
}

const hearthFrames = byName('stone-hearth').frames!;
const row1: Block[] = [
  xerosBlock(),
  ...hearthFrames.map((g, f) => piece('stone-hearth', `ATRE, FEU ${f + 1}/3`, DIMS.hearth, K1, g)),
  piece('stone-hearth-r1', 'ATRE R1 (OUEST)', swap(DIMS.hearth)),
  piece('stone-hearth-r2', 'ATRE R2 (DOS)', DIMS.hearth),
  piece('stone-hearth-r3', 'ATRE R3 (EST)', swap(DIMS.hearth)),
];
const mEW = mantel('ew'), mNS = mantel('ns');
const row2: Block[] = [
  xerosBlock(),
  gridBlock(mEW.grid, mEW.pal, K1, ['MANTEAU (DESSIN DU JEU)', 'POUTRE 20X20, 2,20 M EST-OUEST'], gauge('manteau ew', mEW.grid, mEW.pal, null)),
  gridBlock(mNS.grid, mNS.pal, K1, ['MANTEAU NORD-SUD', '(REGLE D)'], gauge('manteau ns', mNS.grid, mNS.pal, null)),
  piece('chimney-hood', 'HOTTE R0 (DEVANT)', DIMS.hood),
  piece('chimney-hood-r1', 'HOTTE R1', swap(DIMS.hood)),
  piece('chimney-hood-r2', 'HOTTE R2 (DOS)', DIMS.hood),
  piece('chimney-hood-r3', 'HOTTE R3', swap(DIMS.hood)),
];
const row3: Block[] = [
  xerosBlock(),
  piece('chimney-flue', 'CONDUIT (TRONCON)', DIMS.flue),
  piece('chimney-flue-ns', 'CONDUIT NS', swap(DIMS.flue)),
  piece('chimney-cap', 'COURONNEMENT', DIMS.cap),
  piece('chimney-cap-ns', 'COURONNEMENT NS', swap(DIMS.cap)),
];

// ---------- 2. le pan percé ----------

const PAN: Dims = { w: 1380, d: 390, h: 445, shape: 'box', ground: true };
const K2 = 2;
const row4: Block[] = [0, 1, 2, 3].map((v) => {
  const n = `thatch-roof-pierced${v ? `-r${v}` : ''}`;
  return piece(n, `PAN PERCE R${v}`, v % 2 ? swap(PAN) : PAN, K2);
});

/** Le pan nord comme le jeu le pose (vue r2) par-dessus la souche : deux rendus au même cadre, le pan peint après. */
function panCheck(v: number, k: number): Block {
  const r = VIEW_ROT[v];
  const stack = rotQuads(stackInPan(), r, [0, 0]);
  const pan = rotQuads(piercedRoof(v), r, [0, 0]);
  const bd = bounds({ quads: [...stack, ...pan], boards: [] }, [4, 4, 4, 4]);
  const A = render({ quads: stack, boards: [] }, bd, tiles), B = render({ quads: pan, boards: [] }, bd, tiles);
  const rgba = A.rgba.slice();
  for (let i = 0; i < B.roof.length; i++) if (B.roof[i]) for (let c = 0; c < 4; c++) rgba[i * 4 + c] = B.rgba[i * 4 + c];
  const l: Layer = { ...A, rgba };
  const where = v === 2 ? 'R2 : LE PAN NORD, COMME LE JEU LE POSE' : `R${v}`;
  return layerBlock(l, k, [`PAN PAR-DESSUS LA SOUCHE, ${where}`, 'LE PAN PEINT APRES LE CONDUIT (BORD SUD PLUS AU SUD)'], [
    `trou du pan (repere du pan) : x ${PAN_FLUE.x0}-${PAN_FLUE.x1}, y ${PAN_FLUE.y0}-${PAN_FLUE.y1}, haut ${PAN_FLUE.z1} ; couronnement x ${PAN_CAP.x0}-${PAN_CAP.x1}, y ${PAN_CAP.y0}-${PAN_CAP.y1}`,
    'maison (x, y) -> pan (268 - x, 129 - y) : le pan nord a y = -65 cm',
  ]);
}
const row5: Block[] = [panCheck(2, 3), panCheck(0, 2)];

// ---------- 3. la cheminée montée ----------

const ew = mantel('ew'), ns = mantel('ns');
/** Le manteau vu du sud : l'image du jeu, son bas au bord sud (y 28) à z 30 ; le dessus (4 rangées) derrière la face. */
function mantelSouth(): Board {
  const g = ew.grid, [x, , z] = AT.mantel, y = AT.mantel[1] + 6;
  return { grid: g, pal: ew.pal, x, y: Math.round(y - z - g.length), depth: (row) => (row < g.length - 4 ? y - 6 + row * 1.5 : y + 0.05) };
}
/** Le manteau vu de l'ouest (vue de côté, rot 1, autour de (0, 0)) : l'image nord-sud du jeu, le bout (4 rangées) au sud de la vue. */
function mantelWest(): Board {
  const g = ns.grid, [wx, wy, z] = AT.mantel;
  const x = wy, ySouth = -wx;
  return { grid: g, pal: ns.pal, x, y: Math.round(ySouth - z - g.length), depth: (row) => (row >= g.length - 4 ? ySouth + 0.05 : ySouth - (g.length - 4 - row)) };
}

/** Le chaume percé au droit du conduit (dans le repère du monde ; `back` : la rotation qui ramène la vue au monde). */
function pierce(quads: Quad[], rot: 0 | 1 | 2 | 3, c: [number, number]): Quad[] {
  const back = ((4 - rot) % 4) as 0 | 1 | 2 | 3;
  const [x0, y0] = [AT.flue(0)[0], AT.flue(0)[1]], x1 = x0 + 20, y1 = y0 + 16;
  return quads.map((q) => {
    if (q.part.name !== 'chaume' && q.part.name !== 'latte' && q.part.name !== 'chevron') return q;
    const tex: Tex = (s, t, cx) => {
      const [x, y] = rotP(cx.p, back, c);
      if (x > x0 - 0.3 && x < x1 + 0.3 && y > y0 - 0.3 && y < y1 + 0.3) return null;
      const k = q.tex(s, t, cx);
      if (k === null || q.part.name !== 'chaume' || cx.face !== 'slope') return k;
      if (x > x0 - 2.1 && x < x1 + 2.1 && y > y0 - 2.1 && y < y1 + 2.1) return x < x0 + 0.5 || y < y0 ? 'd' : 'D';
      return k;
    };
    return { ...q, tex };
  });
}

/** La salle : la maison sans toit, le mur sud et les cloisons est-ouest coupés (l'essai validé) ; la cheminée contre le mur nord. */
function frontScene(frame = 0, xerosAt: [number, number][] = [[166, 38]]): Scene {
  const house = houseScene({ rot: 0, wall: 4, roof: 0, cut: true, plan: PLAN_LONG }, img);
  return {
    quads: [...house.quads, ...chimneyQuads(frame)],
    boards: [...house.boards, mantelSouth(), ...xerosAt.map(([x, y]) => who('xeros', x, y))],
    floor: house.floor,
  };
}
/** Le cadre d'un rendu (x0, y0, x1, y1 exclus) en px de l'écran du jeu. */
const FRONT_BD: Bounds = [116, 5 - 152 - 8, 196, 50];
const RIDGE_Y = 64 - 131.6;
const frontMarks = (): Mark[] => [
  { Y: 28 - 30, label: 'DESSOUS DU MANTEAU 1,50 M', c: CYAN },
  { Y: 28 - 35, label: '1,75 M', c: ROSE },
  { Y: 22 - 50, label: 'HAUT DE LA HOTTE 2,50 M', c: CYAN },
  { Y: Math.round(RIDGE_Y), label: 'FAITE 6,58 M (A 3,20 M AU SUD : Y - Z)', c: GOLD },
];
function frontBlock(k: number): Block {
  const l = render(frontScene(0, [[156, 22], [180, 40]]), FRONT_BD, tiles);
  return layerBlock(l, k, ['VUE DE FACE DEPUIS LA SALLE', `ATRE, MANTEAU, HOTTE, ${FLUE_COUNT} TRONCONS, COURONNEMENT`], [
    'xeros sous le manteau (pieds a 1,10 m du mur) : sa tete passe derriere la poutre',
    'xeros debout dans la salle, a droite, pour l echelle',
    'z : 0-150 atre, 150-170 manteau, 150-250 hotte (sur l atre, derriere le manteau), 250-750 conduit, 750-760 couronnement',
  ], frontMarks());
}

/** La vue de côté, de l'ouest (la vue 1 : le côté ouest passe au sud de la vue), autour de (0, 0) ; le profil du toit à l'axe du conduit. */
function sideBlock(k: number): Block {
  const q = rotQuads(chimneyQuads(0), 1, [0, 0]);
  const fl: [number, number, number, number] = [-20, 80, -200, -120];
  const sc: Scene = { quads: q, boards: [mantelWest(), who('xeros', 40, -AT.hearth[0] + 14)], floor: fl };
  const bd: Bounds = [-6, -AT.hearth[0] - 44 - 152 - 6, 80, -AT.hearth[0] + 24];
  const l = render(sc, bd, tiles);
  // le dessus du chaume, coupé au droit de l'axe du conduit (x = 154) : Y = −156 − z(y), X = y
  const SIN = Math.SQRT1_2, TH = 11, H2 = 64;
  const zTop = (y: number) => {
    const d = Math.abs(y - H2) - TH * SIN;
    return 52 + (H2 - d) + TH * SIN;
  };
  const block = layerBlock(l, k, ['VUE DE COTE (DE L OUEST)', 'TRAIT : LE DESSUS DU CHAUME A L AXE DU CONDUIT'], [
    'a gauche le mur nord (y 0), a droite la salle ; le manteau : l image nord-sud du jeu',
    'le trait or : le chaume (pan nord, faite a y 64) coupe a x = 7,70 m',
  ]);
  const draw = block.draw;
  block.draw = (sh, x, y) => {
    draw(sh, x, y);
    for (let wy = -14; wy <= 80; wy += 0.25) {
      const X = wy, Y = -(AT.flue(0)[0] + 10) - zTop(wy);
      if (X < bd[0] || X >= bd[2]) continue;
      sh.rect(x + Math.round((X - bd[0]) * k), y + Math.round((Y - bd[1]) * k), 2, 2, GOLD);
    }
  };
  return block;
}

// ---------- 4. la maison, de dehors ----------

function houseBlock(rot: 0 | 2, k: number): Block {
  const c: [number, number] = [PLAN_LONG.L / 2, PLAN_LONG.D / 2];
  const house = houseScene({ rot, wall: 4, roof: 5, plan: PLAN_LONG }, img);
  const quads = [...pierce(house.quads, rot, c), ...rotQuads(chimneyQuads(0), rot, c)];
  const boards = [...house.boards];
  if (rot === 0) boards.push(who('xeros', 150, 146));
  else boards.push(who('xeros', 110, 146));
  const sc: Scene = { quads, boards, floor: house.floor };
  const l = render(sc, bounds(sc, [8, 8, 8, 8]), tiles);
  return layerBlock(l, k, [rot === 0 ? 'LA MAISON DU SUD (LE JEU)' : 'LA MAISON DU NORD', 'LA SOUCHE A 1 M AU-DESSUS DU FAITE'], [
    rot === 0 ? 'le pan nord est vu par la tranche : la souche se lit derriere le faite' : 'le pan nord de face : le trou au droit du conduit, le solin de chaux',
    'rendu de l essai de la maison (art/proposals/maison-xeros.ts), pas des images du jeu',
  ]);
}

// ---------- 5. le détail x4 ----------

function zoomBlock(): Block {
  const l = render(frontScene(1, [[156, 22]]), [128, 28 - 64, 184, 34], tiles);
  return layerBlock(l, 4, ['DETAIL X4 : L ATRE, LE MANTEAU, LA HOTTE, LE PREMIER TRONCON', 'XEROS SOUS LE MANTEAU (FEU 2/3)'], [
    'ouverture 1,60 m de large, 1,50 m sous le manteau, 0,90 m de profond',
  ], [{ Y: 28 - 30, label: '1,50 M', c: CYAN }, { Y: 28 - 35, label: '1,75 M', c: ROSE }]);
}

// ---------- la planche ----------

const rows: Block[][] = [row1, row2, row3, row4, row5, [frontBlock(3), sideBlock(3), zoomBlock()], [houseBlock(0, 2), houseBlock(2, 2)]];
const sheet = sheetOf(rows, [
  'LA CHEMINEE PAYSANNE OU L ON CUISINE, INTEGREE AU JEU (LA HOTTE A 1,50 M, SUR L ATRE, DERRIERE LE MANTEAU)',
  'images du jeu : art/world/chimney.ts ; 5 cm par px ; pieces de batiment (ground) : projection (x, y - z), gabarit W X (H + D)',
  'pieces x3 (le pan x2) ; vues montees x3 ; maison x2 ; detail x4',
]);
const out = join(ROOT, '.art-preview', 'cheminee-2.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(sheet.png));
console.log(`essai-cheminee -> ${out}`);
for (const l of REPORT) console.log(`  ${l}`);
