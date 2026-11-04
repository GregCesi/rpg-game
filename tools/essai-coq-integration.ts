// Essai (chantier « maison du coq », hors jeu) : les planches des dessins d'intégration de la maison du coq, que Grégoire valide
// avant que rien n'entre au jeu (CADRAGE-coq.md section 12.11, étape 2). npx tsx tools/essai-coq-integration.ts écrit
// .art-preview/coq-integration-mur.png, -sol.png, -baies.png, -lave.png, -cloison.png et coq-integration.json (le gabarit de chaque
// vue mesurée : attendu, mesuré, OK).
//
// Rien ici n'entre dans le jeu. Les dessins : art/proposals/coq-integration-*.ts (le mur, le sol, la lave, la cloison) et
// coq-catalogue-pierre.ts, coq-catalogue-bois.ts (les pièces du catalogue, mises aux dimensions des réponses 24, 25 et 27) ; les
// dimensions : coq-catalogue-data.ts ; les images du jeu, lues dans src/generated/ (lecture seule).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import { renderPiece, rotQuads, withGroundShadow, type Quad, type Rot } from '../art/lib/volumes';
import { PIECES, massOf, expectedOf, CARRY, type Piece } from '../art/proposals/coq-catalogue-data';
import { PAL as STONE_PAL, pieceView, archAssembly, archAssembly50, lavePan } from '../art/proposals/coq-catalogue-pierre';
import { DRAWINGS, PAL as WOOD_PAL } from '../art/proposals/coq-catalogue-bois';
import {
  PAL, ASHLAR_COURSE, ASHLAR_STONES, Paint, checkStagger, consumption, courseFace, courseImage, courseInner, courseNS, courseTop,
  layWall, courseJointsOf, outline, shadowed, type CourseSpec,
} from '../art/proposals/coq-integration-mur';
import { FLAG, FLAGSTONES, flagColumn, flagFloor, flagRow, layFlags } from '../art/proposals/coq-integration-sol';
import { LAVE_PAL, lavePanImage, KG_PER_M2, EAVE } from '../art/proposals/coq-integration-lave';
import { panImage, LARGE_45, LARGE_55, ROOF_PAL } from '../art/world/forge-roofs';
import { CLOISON, CLOISON_PIECES, cloisonQuads, floorQuads } from '../art/proposals/coq-integration-cloison';
import { TOLERANCE, expectedSize, silhouette, type Dims } from '../src/content/gabarit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.art-preview');
const T = 2, LINE = 12, MAXW = 2300;
const GRASS: Rgb = [123, 133, 68], WHITE: Rgb = [255, 255, 255], GREY: Rgb = [220, 220, 205], GOLD: Rgb = [245, 215, 120];
const RED: Rgb = [255, 140, 120], GREEN: Rgb = [180, 240, 160];
const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const kg = (n: number) => `${Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ')} KG`;

interface View { label: string; grid: Grid; pal: Palette }
interface Line { text: string; color: Rgb }
interface Cell { views: View[]; lines: Line[] }
interface Section { title: string; cells: Cell[] }

// ---------- la mesure ----------

interface Measure { what: string; view: string; expected: [number, number]; drawn: [number, number]; ok: boolean; why?: string }
const measures: Measure[] = [];
/** Mesure une vue contre une taille attendue (`lyingNS` : la règle D, l'est-ouest inversé) ; la ligne de la planche. */
function judge(what: string, view: string, v: View, e: { w: number; h: number; wMax?: number; hMax?: number }, why?: string): Line {
  const s = silhouette(v.grid, v.pal);
  const ok = s.w >= e.w - TOLERANCE && s.w <= (e.wMax ?? e.w) + TOLERANCE && s.h >= e.h - TOLERANCE && s.h <= (e.hMax ?? e.h) + TOLERANCE;
  measures.push({ what, view, expected: [Math.round(e.w * 10) / 10, Math.round(e.h * 10) / 10], drawn: [s.w, s.h], ok, why });
  return { text: `${view} ATTENDU ${fmt(e.w)}X${fmt(e.h)}  MESURE ${s.w}X${s.h}  ${ok ? 'OK' : `HORS TOLERANCE${why ? ' : ' + why : ''}`}`, color: ok ? GREEN : RED };
}
const turnedDims = (d: Dims): Dims => ({ ...d, w: d.d, d: d.w });

// ---------- les cellules ----------

const xg = xeros.animations['idle-down'].frames[0];
const xs = silhouette(xg, xeros.palette);

function pieceCell(key: string, extra: Line[] = [], why: Partial<Record<number, string>> = {}): Cell {
  const p = PIECES.find((x) => x.key === key) as Piece;
  const rs: Rot[] = p.views === 'four' ? [0, 1, 2, 3] : p.views === 'symmetric' ? [0, 1] : [0];
  const views = rs.map((r) => ({ label: `R${r}`, grid: pieceView(key, r), pal: STONE_PAL }));
  const m = massOf(p);
  const lines: Line[] = [
    { text: p.name, color: GOLD }, { text: key, color: WHITE },
    { text: `${p.dims.w} X ${p.dims.d} X ${p.dims.h} CM, CALCAIRE 2 400 KG/M3${p.fill && p.fill < 1 ? `, ${fmt(p.fill)} DE PLEIN` : ''}`, color: GREY },
    { text: `MASSE ${kg(m)}, XEROS SEUL : ${m <= CARRY ? 'OUI' : `NON (IL EN PORTE ${CARRY}, LA MERE L AIDE JUSQU A 140)`}`, color: m <= CARRY ? GREY : RED },
    ...extra,
  ];
  rs.forEach((r, i) => lines.push(judge(key, `R${r}`, views[i], expectedOf(p, r as 0 | 1 | 2 | 3), why[r])));
  if (p.views === 'symmetric') lines.push({ text: 'R2 = R0, R3 = R1', color: GREY });
  return { views, lines };
}

function render(head: string[], sections: Section[], K: number): PNG {
  const PAD = 16, GAP = 28, XW = xs.w * K;
  const silOf = (v: View) => silhouette(v.grid, v.pal);
  const cellSize = (c: Cell) => {
    const vw = c.views.reduce((s, v) => s + Math.max(v.grid[0].length * K, textWidth(v.label, T)) + 12, -12);
    return { w: Math.max(vw, ...c.lines.map((l) => textWidth(l.text, T))) };
  };
  type Row = { section?: string; cells: Cell[] };
  const rows: Row[] = [];
  for (const s of sections) {
    let cur: Row = { section: s.title, cells: [] }, x = PAD + XW + GAP;
    for (const c of s.cells) {
      const { w } = cellSize(c);
      if (cur.cells.length && x + w > MAXW) { rows.push(cur); cur = { cells: [] }; x = PAD + XW + GAP; }
      cur.cells.push(c); x += w + GAP;
    }
    rows.push(cur);
  }
  const geo = rows.map((r) => {
    const views = r.cells.flatMap((c) => c.views);
    const above = Math.max(xs.h * K, ...views.map((v) => silOf(v).h * K)) + 16;
    const below = Math.max(K * 2, ...views.map((v) => { const s = silOf(v); return (v.grid.length - (s.y + s.h)) * K; }));
    const text = Math.max(...r.cells.map((c) => c.lines.length)) * LINE + 8;
    const w = r.cells.reduce((s, c) => s + cellSize(c).w + GAP, PAD + XW + GAP);
    return { above, below, text, title: r.section ? 30 : 0, w };
  });
  const width = Math.max(...geo.map((g) => g.w), ...head.map((l) => textWidth(l, T) + PAD * 2));
  const height = 16 + head.length * LINE + 8 + geo.reduce((s, g) => s + g.title + g.above + g.below + g.text + GAP, 0);
  const sheet = new Sheet(width, height, GRASS);
  head.forEach((l, i) => sheet.text(l, PAD, 12 + i * LINE, i ? WHITE : GOLD, T));
  let y = 16 + head.length * LINE + 8;
  rows.forEach((r, ri) => {
    const g = geo[ri];
    if (r.section) { sheet.text(r.section, PAD, y + 4, GOLD, 3); y += g.title; }
    const ground = y + g.above;
    sheet.blit(xg, xeros.palette, PAD - xs.x * K, ground - (xs.y + xs.h) * K, K);
    let x = PAD + XW + GAP;
    for (const c of r.cells) {
      let vx = x;
      for (const v of c.views) {
        const s = silOf(v), top = ground - (s.y + s.h) * K;
        sheet.text(v.label, vx, ground - s.h * K - 14, WHITE, T);
        sheet.blit(v.grid, v.pal, vx, top, K);
        vx += Math.max(v.grid[0].length * K, textWidth(v.label, T)) + 12;
      }
      c.lines.forEach((l, i) => sheet.text(l.text, x, ground + g.below + 6 + i * LINE, l.color, T));
      x += cellSize(c).w + GAP;
    }
    y += g.above + g.below + g.text + GAP;
  });
  return sheet.png;
}

// =====================================================================================================================
// 1. Le mur
// =====================================================================================================================

const pan = (g: Grid) => shadowed(outline(g));

/** Le joint le plus serré entre deux assises voisines d'un mur (px), sur les faces données. */
function tightest(courses: CourseSpec[][]): number {
  const js = courses.map((runs) => courseJointsOf(runs));
  let m = Infinity;
  for (let k = 0; k + 1 < js.length; k++) for (const a of js[k]) for (const b of js[k + 1]) m = Math.min(m, Math.abs(a - b));
  return m;
}

/**
 * Le mur de neuf assises (0 à 270 cm), 4,80 m, vu du sud comme le jeu montre les pièces posées : à l'ouest l'angle (le pignon qui
 * repart vers le nord sur 2 m, ses pans nord-sud derrière), une demi-croisée au milieu (appui à 90 cm, jour de 1,05 × 1,35 m,
 * linteau à 2,40 m), à l'est une tête de mur.
 */
function wallScene(): { grid: Grid; courses: CourseSpec[][]; tight: number } {
  const W = 96, NS = 40, X = 0, jour: [number, number] = [44, 65];
  const courses: CourseSpec[][] = [];
  for (let k = 0; k < 9; k++) {
    if (k >= 3 && k <= 7) courses.push([{ x0: X, x1: jour[0], k, start: 'corner', end: 'jamb' }, { x0: jour[1], x1: W, k, start: 'jamb', end: 'head' }]);
    else if (k === 8) courses.push([{ x0: X, x1: jour[0] - 4, k, start: 'corner', end: 'lintel' }, { x0: jour[1] + 4, x1: W, k, start: 'lintel', end: 'head' }]);
    else courses.push([{ x0: X, x1: W, k, start: 'corner', end: 'head' }]);
  }
  const laid = layWall(courses);
  courses.splice(0, courses.length, ...laid);
  const H = NS + 12 + 9 * 6 + 2, base = H - 2; // le bas de la face (le sol)
  const p = new Paint(W + 2, H);
  const Y0 = base - 12; // le bord nord du mur est-ouest, au sol
  for (let k = 0; k < 9; k++) {
    // le pignon : un pan nord-sud de 2 m, au nord de l'angle
    p.put(courseNS({ x0: 1000, x1: 1000 + NS, k, start: 'abut', end: 'abut' }), 0, Y0 - 6 * k - NS);
    for (const r of courses[k]) {
      p.put(courseTop(r), r.x0, Y0 - 6 * k);
      // l'arase d'une assise sous une baie reste visible dans le jour : elle est recouverte par l'appui et la fenêtre ci-dessous
      p.put(courseFace(r), r.x0, Y0 - 6 * k + 6);
    }
    if (k === 8) {
      // le linteau (145 cm, 30 de haut, 30 de lit) et l'arrière-linteau de bois derrière lui
      const lx = jour[0] - 4, lw = jour[1] + 4 - lx, y = Y0 - 48;
      for (let j = 0; j < 6; j++) for (let i = 0; i < lw; i++) {
        p.set(lx + i, y + j, j < 3 ? (j === 0 ? '&' : i % 7 === 3 ? '%' : '*') : j === 5 ? '!' : '+');
        p.set(lx + i, y + 6 + j, j === 5 ? ';' : i === 0 ? ';' : j === 0 ? '!' : j === 4 && i >= 4 && i < lw - 4 ? ';' : i % 3 === 1 && j % 2 ? 'θ' : '+');
      }
    }
  }
  // la baie : le jour de 105 × 135 cm (z 105 à 240), la demi-croisée (imposte plombée, traverse, volets fermés, barreaux)
  const [a, b] = jour, zTop = base - 48, zSill = base - 21;
  for (let y = zTop; y < zSill; y++) for (let x = a; x < b; x++) {
    const j = y - zTop, i = x - a;
    let ch: string;
    if (j < 1) ch = '~';
    else if (j < 9) ch = i === 0 || i === b - a - 1 || j === 1 || j === 8 || (i + j) % 4 === 0 || (((i - j) % 4) + 4) % 4 === 0 ? '`' : i + (9 - j) >= 3 && i + (9 - j) <= 6 ? '<' : '>';
    else if (j < 12) ch = j === 9 ? '!' : j === 11 ? ';' : 'θ';
    else ch = i % 4 === 3 ? '_' : j === 15 || j === 23 ? '_' : i % 3 === 2 ? '@' : i % 3 === 0 ? '^' : '*';
    p.set(x, y, ch);
  }
  // l'appui (125 cm, 15 de haut, saillant de 5 cm) : son glacis au soleil, son larmier dessous
  for (let i = a - 2; i < b + 2; i++) { p.set(i, zSill - 1, '!'); p.set(i, zSill, '+'); p.set(i, zSill + 1, '='); p.set(i, zSill + 2, ';'); }
  return { grid: shadowed(outline(p.grid().map((r) => r))), courses, tight: tightest(courses) };
}

function murSheet(): Section[] {
  const st = checkStagger();
  // les pierres une à une : dans le mur (leurs tons), et comme objets qu'on porte (R0, R1)
  const stones: Cell[] = ASHLAR_STONES.map((s) => ({
    views: [...s.faces.map((f, i) => ({ label: s.faces.length === 3 ? ['θ', '=', 'λ'][i].replace('θ', 'CLAIR').replace('=', 'MOYEN').replace('λ', 'SOMBRE') : i ? 'IMPAIRE' : 'PAIRE', grid: f, pal: PAL })), { label: 'LIT', grid: s.bed, pal: PAL }],
    lines: [{ text: s.label, color: GOLD }, { text: `DANS LE MUR : ${s.w} PX DE FACE, 6 DE HAUT (LE LIT DE CHAUX COMPRIS)`, color: GREY }, { text: s.kind === 'closer' ? 'UN CARREAU COUPE A LA LONGUEUR QUI MANQUE' : 'JOINT A GAUCHE ET DESSOUS, CISELURE, LAYAGE', color: GREY }],
  }));
  const objects = ['ashlar-block-50', 'ashlar-block-70', 'ashlar-block-90', 'ashlar-header', 'ashlar-quoin', 'ashlar-jamb', 'ashlar-header-40'].map((k) => pieceCell(k));
  // un pan de 3 m
  const L = 60, ev: CourseSpec = { x0: 0, x1: L, k: 0, start: 'corner', end: 'head' }, od: CourseSpec = { ...ev, k: 1 };
  const dims: Dims = { w: 300, d: 60, h: 30, shape: 'box' };
  const e = expectedSize(dims);
  const v0: View = { label: 'R0 PAIRE', grid: pan(courseImage(ev)), pal: PAL };
  const v0b: View = { label: 'R0 IMPAIRE', grid: pan(courseImage(od)), pal: PAL };
  const v1: View = { label: 'R1', grid: pan(courseNS({ ...ev, x0: 0, x1: L })), pal: PAL };
  const v2: View = { label: 'R2 NUE', grid: pan(courseInner(ev, false)), pal: PAL };
  const v2l: View = { label: 'R2 ENDUITE', grid: pan(courseInner(ev, true)), pal: PAL };
  const plan: View = { label: 'L ARASE EN PLAN (60 CM = 12 PX)', grid: outline(courseTop(ev, 12)), pal: PAL };
  const c = consumption(ev);
  const panCell: Cell = {
    views: [v0, v0b, v1, v2, v2l, plan],
    lines: [
      { text: 'PAN DE MUR, UNE ASSISE : 3 M, MUR DE 60 CM, 30 CM DE HAUT', color: GOLD },
      { text: 'ashlar-wall (wall : ashlar), 300 X 60 X 30 CM, TOUTE LONGUEUR SUR LA GRILLE DE 10 CM', color: WHITE },
      { text: `MASSE ${kg(c.kg)} (BLOCS ET FOURRURE ${kg(c.rubbleKg)} DE MOELLONS ET DE CHAUX), ${kg(c.kg / 3)} AU METRE`, color: GREY },
      { text: `CONSOMME : ${Object.entries(c.stones).map(([k, n]) => `${n} ${k}`).join(', ')}`, color: GREY },
      { text: 'PAN PAIR ET IMPAIR : LES JOINTS SE DECALENT PAR LA PARITE DE L ASSISE', color: WHITE },
      { text: 'R1 : LA REGLE D (L EST-OUEST TOURNE), L ARASE SUR TOUTE LA LONGUEUR, LA TETE AU SUD', color: WHITE },
      { text: 'R2 : LA FACE DU DEDANS, NUE (LES MEMES JOINTS, D AUTRES TONS) OU ENDUITE DE CHAUX : A CHOISIR', color: GOLD },
      { text: 'L ARASE : PAREMENT, FOURRURE DE MOELLONS, PAREMENT ; LES BOUTISSES TRAVERSENT', color: WHITE },
      judge('ashlar-wall', 'R0', v0, e), judge('ashlar-wall', 'R1', v1, { w: e.h, h: e.w }), judge('ashlar-wall', 'R2', v2, e),
    ],
  };
  const rf: CourseSpec = { x0: 0, x1: L, k: 0, start: 'head', end: 'head' };
  const rdims: Dims = { w: 300, d: 40, h: 30, shape: 'box' }, re = expectedSize(rdims);
  const r0: View = { label: 'R0', grid: pan(courseImage(rf, 40)), pal: PAL }, r1: View = { label: 'R1', grid: pan(courseNS(rf, 40)), pal: PAL };
  const rc = consumption(rf, 40);
  const refend: Cell = {
    views: [r0, r1],
    lines: [
      { text: 'PAN DE REFEND : 3 M, 40 CM, SANS FOURRURE', color: GOLD },
      { text: 'ashlar-wall-40 (wall : ashlar), 300 X 40 X 30 CM', color: WHITE },
      { text: `MASSE ${kg(rc.kg)} ; LE MEME TIRAGE, BOUTISSES DE REFEND`, color: GREY },
      { text: 'DEUX CARREAUX DOS A DOS (20 + 20 CM)', color: GREY },
      judge('ashlar-wall-40', 'R0', r0, re), judge('ashlar-wall-40', 'R1', r1, { w: re.h, h: re.w }),
    ],
  };
  const w = wallScene();
  const wall: Cell = {
    views: [{ label: 'NEUF ASSISES, UN ANGLE, UNE BAIE', grid: w.grid, pal: PAL }],
    lines: [
      { text: 'LE MUR MONTE : 9 ASSISES (0 A 270 CM), 4,80 M, VU DU SUD', color: GOLD },
      { text: 'A L OUEST : LA CHAINE D ANGLE EN HARPE (60 ET 40 DE FACE), LE PIGNON REPART AU NORD (2 M)', color: WHITE },
      { text: 'LA DEMI-CROISEE : APPUI A 90 CM, LES TABLEAUX EN HARPE (40 ET 60), LE LINTEAU A 2,40 M', color: WHITE },
      { text: 'A L EST : UNE TETE DE MUR. CHAQUE ASSISE EST UN PAN (OU DEUX, COUPES PAR LA BAIE)', color: WHITE },
      { text: `JOINTS : ${st * 5} CM AU MOINS DANS LE TIRAGE ; ${w.tight * 5} CM AU PLUS SERRE SUR CE MUR`, color: w.tight >= ASHLAR_COURSE.stagger ? GREEN : RED },
      { text: `9 ASSISES X 4,80 M : ${kg(consumption({ x0: 0, x1: 96, k: 0, start: 'corner', end: 'head' }).kg * 9)} ENVIRON (SANS LA BAIE)`, color: GREY },
    ],
  };
  return [
    { title: 'LES PIERRES DU MUR, UNE A UNE (DONNEES : LA FACE ET LE LIT DE CHACUNE, TROIS TONS)', cells: stones },
    { title: 'LES MEMES, COMME OBJETS QU ON PORTE (CARREAUX DE 50, 70, 90, BOUTISSES DE 40)', cells: objects },
    { title: 'LE PAN D UNE ASSISE (LE CODE POSE LES PIERRES), LE REFEND', cells: [panCell, refend] },
    { title: 'LE MUR MONTE', cells: [wall] },
  ];
}

// =====================================================================================================================
// 2. Le sol
// =====================================================================================================================

function solSheet(): Section[] {
  const tiles: Cell = {
    views: FLAGSTONES.map((f) => ({ label: f.label.toUpperCase(), grid: [...f.top, ...f.edge], pal: PAL })),
    lines: [{ text: 'LES DALLES DANS LE PAN (DONNEES)', color: GOLD }, { text: 'LE DESSUS (12 X 8) ET LE CHANT (2), TROIS TONS', color: GREY }, { text: 'JOINT DE CHAUX AU NORD ET A L OUEST, VEINES, USURE', color: GREY }],
  };
  const dalle = pieceCell('floor-flagstone', [{ text: 'LA DALLE SEULE (RETOUCHES), REPRISE DU CATALOGUE', color: WHITE }]);
  const L = 60, dims: Dims = { w: 300, d: 40, h: 8, shape: 'box', ground: true };
  const e = expectedSize(dims), en = expectedSize(turnedDims(dims));
  const a: View = { label: 'R0 RANGEE PAIRE', grid: shadowed(outline(flagRow(0, L, 0), '~')), pal: PAL };
  const b: View = { label: 'R0 RANGEE IMPAIRE', grid: shadowed(outline(flagRow(0, L, 1), '~')), pal: PAL };
  const n: View = { label: 'R1', grid: shadowed(outline(flagColumn(0, L, 0), '~')), pal: PAL };
  const nFlags = layFlags(0, L, 0).length;
  const panCell: Cell = {
    views: [a, b, n],
    lines: [
      { text: 'PAN DE DALLAGE : UNE RANGEE DE 3 M, 40 CM DE PROFONDEUR', color: GOLD },
      { text: 'flagstone-row (ground), 300 X 40 X 8 CM, TOUTE LONGUEUR', color: WHITE },
      { text: `CONSOMME ${nFlags} DALLES (floor-flagstone) ; MASSE ${kg(3 * 0.4 * 0.08 * 2400)}`, color: GREY },
      { text: 'JOINTS DECALES DE 30 CM PAR LA PARITE DE LA RANGEE (ANCRES AU MONDE)', color: WHITE },
      { text: 'PIECE AU SOL : PROFONDEUR A L ECHELLE DU SOL (8 PX), CHANT DE 2', color: GREY },
      judge('flagstone-row', 'R0', a, e), judge('flagstone-row', 'R1', n, en),
    ],
  };
  const W = 152, D = 112;
  const floor: View = { label: 'LA SALLE, 7,60 X 5,60 M', grid: outline(flagFloor(0, 0, W, D), '~'), pal: PAL };
  let count = 0;
  for (let r = 0; r < D / FLAG.depth; r++) count += layFlags(0, W, r).length;
  const floorCell: Cell = {
    views: [floor],
    lines: [
      { text: 'LE DALLAGE DE LA SALLE : 14 RANGEES DE 7,60 M, POSEES DU NORD AU SUD', color: GOLD },
      { text: `${count} DALLES (DONT LES RECOUPES AUX DEUX BOUTS), ${kg(7.6 * 5.6 * 0.08 * 2400)}`, color: GREY },
      { text: 'CHAQUE RANGEE RECOUVRE LE CHANT DE LA PRECEDENTE ; LE CHANT DE LA DERNIERE AU SUD', color: GREY },
    ],
  };
  return [
    { title: 'LA DALLE ET SES TONS', cells: [dalle, tiles] },
    { title: 'LE PAN DE DALLAGE', cells: [panCell] },
    { title: 'LE DALLAGE DE LA SALLE', cells: [floorCell] },
  ];
}

// =====================================================================================================================
// 3. Les baies et les dimensions corrigées
// =====================================================================================================================

function baiesSheet(): Section[] {
  const key = pieceCell('door-keystone', [{ text: 'LA CLEF PASSANTE : FLANCS DROITS, DESSOUS EN ARC, LE COQ VALIDE (8 X 6 PX)', color: WHITE }]);
  const vou = pieceCell('door-voussoir', [{ text: '0,73 DE PLEIN (REPONSE 27) ; TROIS DE CHAQUE COTE DE LA CLEF', color: WHITE }]);
  const asm = (label: string, qs: Quad[]): View => ({ label, grid: withGroundShadow(renderPiece(qs, { k: 0.5 })), pal: STONE_PAL });
  const arch: Cell = {
    views: [asm('AVANT : CLEF DE 30', archAssembly()), asm('L ARC REMONTE : CLEF DE 50', archAssembly50())],
    lines: [
      { text: 'L ARC DE LA PORTE REMONTE AVEC LA CLEF DE 50 X 60 X 50', color: GOLD },
      { text: 'PLEIN CINTRE DE 1,10 M : DEUX SOMMIERS (10 DEG), 3 + 3 CLAVEAUX, LA CLEF', color: WHITE },
      { text: 'LE TROISIEME CLAVEAU TAILLE DROIT CONTRE LA CLEF', color: WHITE },
      { text: 'LA CLEF DEPASSE L EXTRADOS DE 15 CM, COMME LA PLANCHE VALIDEE', color: GREY },
    ],
  };
  const wood = (k: string, why: Partial<Record<number, string>>, note: string): Cell => {
    const p = PIECES.find((x) => x.key === k) as Piece;
    const d = DRAWINGS[k]()[0];
    const rs = Object.keys(d.views).map(Number) as (0 | 1 | 2 | 3)[];
    const views = rs.map((r) => ({ label: `R${r}`, grid: d.views[r]!, pal: d.palette ?? WOOD_PAL }));
    return {
      views,
      lines: [
        { text: p.name, color: GOLD }, { text: k, color: WHITE },
        { text: `${p.dims.w} X ${p.dims.d} X ${p.dims.h} CM (CORRIGE), MASSE ${kg(massOf(p))}`, color: GREY },
        { text: note, color: WHITE },
        ...rs.map((r, i) => judge(k, `R${r}`, views[i], expectedOf(p, r), why[r])),
      ],
    };
  };
  const slant = 'VUE DANS SON AXE (45 DEG) : LE BOUT SEUL';
  const chant = 'VUE DE CHANT : BOUTS COUPES D EQUERRE, COINS DE LA BOITE VIDES';
  return [
    { title: 'LA CLEF AU COQ ET L ARC', cells: [key, vou, arch] },
    {
      title: 'LES DIMENSIONS CORRIGEES (REPONSE 27)',
      cells: [
        wood('wood-piece:normal:beam-principal', { 0: chant, 2: slant }, 'BOITE 355 X 355 : R1, R3 TOMBENT JUSTE (71 X 75)'),
        wood('wood-piece:normal:rafter', { 0: chant, 2: slant }, 'BOITE 347 X 347 : R1, R3 TOMBENT JUSTE (69 X 71)'),
        wood('writing-desk', {}, '90 CM DE HAUT : LE PUPITRE ET LES LIVRES'),
      ],
    },
  ];
}

// =====================================================================================================================
// 4. La lave
// =====================================================================================================================

function laveSheet(): Section[] {
  const oldPan: View = { label: 'AVANT : lauze-roof-large R0', grid: panImage('slates', LARGE_55, 0), pal: ROOF_PAL };
  const newPan: View = { label: 'APRES : LA LAVE, R0', grid: lavePanImage(LARGE_55, 0), pal: LAVE_PAL };
  const d55: Dims = { w: 960, d: 340, h: 486, shape: 'box', ground: true };
  const cmp: Cell = {
    views: [oldPan, newPan],
    lines: [
      { text: 'LE PAN lauze-roof-large (9,60 X 3,40 M, 55 DEG) : LA LAUZE DE LA FORGE, PUIS NOTRE LAVE', color: GOLD },
      { text: `QUATRE SIGNES SOMBRES, DALLES PLUS ETROITES VERS LE FAITE, PUREAU 25 A 15 CM LE LONG DE LA PENTE, MOUSSE DANS LES CREUX`, color: WHITE },
      { text: `${EAVE} PX A L EGOUT (DES LAVES EMPILEES), FAITIERES DE PIERRE EN BATIERE ; ${KG_PER_M2} KG/M2`, color: WHITE },
      { text: `MASSE DU PAN : ${kg(9.6 * Math.hypot(3.4, 4.86) * KG_PER_M2)}`, color: GREY },
      judge('lauze-roof-large', 'R0 (AVANT)', oldPan, expectedSize(d55)), judge('lauze-roof-large', 'R0 (APRES)', newPan, expectedSize(d55)),
    ],
  };
  const views = [1, 2, 3].flatMap((v) => [
    { label: `AVANT R${v}`, grid: panImage('slates', LARGE_55, v), pal: ROOF_PAL },
    { label: `APRES R${v}`, grid: lavePanImage(LARGE_55, v), pal: LAVE_PAL },
  ]);
  const four: Cell = {
    views,
    lines: [
      { text: 'LES AUTRES VUES DU MEME PAN, AVANT ET APRES (LA LAVE SE DESSINE SUR TOUTE PENTE)', color: GOLD },
      { text: 'R2 : VU DU NORD, ON NE VOIT QUE LE DESSOUS (LES LATTES), COMME LA LAUZE DU JEU', color: WHITE },
      ...views.map((v, i) => judge('lauze-roof-large', `R${(i >> 1) + 1} ${i % 2 ? 'APRES' : 'AVANT'}`, v, expectedSize((i >> 1) % 2 === 0 ? turnedDims(d55) : d55), (i >> 1) === 1 ? 'LE DESSOUS SEUL, COMME AU JEU' : undefined)),
    ],
  };
  const d45: Dims = { w: 960, d: 340, h: 340, shape: 'box', ground: true };
  const p45: View = { label: 'NOTRE PAN A 45 DEG', grid: lavePanImage(LARGE_45, 0, 9), pal: LAVE_PAL };
  const ref: View = { label: 'LA LAVE VALIDEE (CATALOGUE)', grid: withGroundShadow(renderPiece(lavePan())), pal: STONE_PAL };
  const ours: Cell = {
    views: [p45, ref],
    lines: [
      { text: 'LE MEME PAN A 45 DEG (LA PENTE DE LA MAISON DU COQ), ET LE MORCEAU VALIDE', color: GOLD },
      { text: 'LES SIGNES DE coq-pierre.ts ( ) ? " SONT PRIS AU JEU (FER, TERRE CUITE) : LETTRES GRECQUES', color: WHITE },
      judge('lave-45', 'R0', p45, expectedSize(d45)),
    ],
  };
  return [{ title: 'LA LAVE, SEULE LAUZE DU JEU', cells: [cmp, four, ours] }];
}

// =====================================================================================================================
// 5. La cloison
// =====================================================================================================================

function cloisonSheet(): Section[] {
  const C = CLOISON;
  const dims: Dims = { w: 25, d: 560, h: 265, shape: 'box', ground: true };
  const elev: View = { label: 'DE FACE (VUE DE L EST, LE SUD A GAUCHE)', grid: withGroundShadow(renderPiece(rotQuads(cloisonQuads(), 3, [0, 0]), { k: 1 })), pal: PAL };
  const asPlaced: View = { label: 'POSEE (NORD-SUD), R0', grid: withGroundShadow(renderPiece(cloisonQuads(), { k: 1 })), pal: PAL };
  const fromSouth: View = { label: 'R1 (EST-OUEST)', grid: elev.grid, pal: PAL };
  // la coupe : ce que voit le joueur à l'étage, la cloison coupée au-dessus de la lisse, le plancher autour ; large et étroite
  const scene = (narrow: boolean) => renderPiece([...floorQuads(-30, 33, -50, C.len + 6), ...cloisonQuads({ cut: true, narrow })], { k: 1 });
  const cutW: View = { label: 'LA COUPE : LISSE CHAULEE DE 25 CM', grid: scene(false), pal: PAL };
  const cutN: View = { label: 'POUR COMPARER : LISSE DE 15 CM, EN BOIS', grid: scene(true), pal: PAL };
  const woodKg = (2 * 5.6 * 0.15 * 0.15 + 7 * 0.15 * 0.15 * 2.35 + 0.9 * 1.8 * 0.05 * 0.6) * 900 + 5.6 * 0.25 * 0.15 * 900 * 0.3;
  const limeKg = (5.6 - 7 * 0.15 - 0.9) * (1.8 + 0.4) * 0.15 * 1750 * 0.92;
  return [{
    title: 'LA CLOISON DE L ETAGE EN PAN DE BOIS CHAULE (X 1300, 5,60 M, DU PLANCHER A 2,65 M)',
    cells: [
      {
        views: [elev, asPlaced],
        lines: [
          { text: 'LA CLOISON ENTIERE : SABLIERE BASSE, POTEAUX, REMPLISSAGES CHAULES, LA PORTE INTERIEURE', color: GOLD },
          { text: `LA LISSE A 1,95-2,10 M, PLUS LARGE QUE LE PAN (25 CM POUR 15), CHAULEE ; LE RANG DU HAUT ; LA SABLIERE HAUTE`, color: WHITE },
          { text: `MASSE ENVIRON ${kg(woodKg + limeKg)} (BOIS ${kg(woodKg)}, TORCHIS CHAULE ${kg(limeKg)}) : SUR LA SOLIVE DOUBLEE`, color: GREY },
          ...CLOISON_PIECES.map(([t, n]) => ({ text: `${n} X ${t}`, color: GREY })),
          judge('cloison', 'POSEE R0', asPlaced, expectedSize(dims)), judge('cloison', 'R1', fromSouth, expectedSize(turnedDims(dims))),
        ],
      },
      {
        views: [cutW, cutN],
        lines: [
          { text: 'CE QUE VOIT LE JOUEUR A L ETAGE : LA CLOISON COUPEE AU-DESSUS DE LA LISSE', color: GOLD },
          { text: 'LA LISSE CHAULEE DONNE UNE BANDE BLANCHE DE 5 PX AU LIEU D UN TRAIT DE 3 PX', color: WHITE },
          { text: 'LA PORTE SE LIT : AU-DESSUS D ELLE, LA LISSE RESTE DE BOIS (SON LINTEAU)', color: WHITE },
          { text: 'SOUS LA BANDE, LE BOUT SUD DE LA CLOISON (SA COUPE CONTRE LE MUR SUD)', color: GREY },
          { text: 'LA COUPE EST A 2,10 M ICI (LE HAUT DE LA LISSE), PAS A 1,90 (INTERIOR.HEADROOM)', color: GOLD },
        ],
      },
    ],
  }];
}

// =====================================================================================================================

function main() {
  mkdirSync(OUT, { recursive: true });
  const head = (what: string, k: number) => [
    `MAISON DU COQ, DESSINS D INTEGRATION : ${what} (X${k}, 5 CM PAR PIXEL)`,
    'XEROS A GAUCHE DE CHAQUE RANGEE (1,60 M). GABARIT : ATTENDU (DIMS, src/content/gabarit.ts) CONTRE MESURE (SILHOUETTE), 2 PX DE TOLERANCE',
  ];
  const sheets: [string, string, () => Section[], number][] = [
    ['coq-integration-mur', 'LE MUR DE PIERRE DE TAILLE', murSheet, 4],
    ['coq-integration-sol', 'LE DALLAGE', solSheet, 3],
    ['coq-integration-baies', 'LA CLEF AU COQ, L ARC, LES DIMENSIONS CORRIGEES', baiesSheet, 4],
    ['coq-integration-lave', 'LA LAVE, SEULE LAUZE DU JEU', laveSheet, 2],
    ['coq-integration-cloison', 'LA CLOISON DE L ETAGE', cloisonSheet, 3],
  ];
  for (const [name, what, fn, k] of sheets) {
    const png = render(head(what, k), fn(), k);
    writeFileSync(join(OUT, `${name}.png`), PNG.sync.write(png));
    console.log(`${name} -> ${png.width} x ${png.height}`);
  }
  writeFileSync(join(OUT, 'coq-integration.json'), JSON.stringify(measures, null, 1));
  const bad = measures.filter((m) => !m.ok);
  console.log(`tirage : ${checkStagger() * 5} cm entre deux joints d'assises voisines au plus serré`);
  console.log(`${measures.length} vues mesurées, ${bad.length} hors tolérance`);
  for (const m of bad) console.log(`  ${m.what} ${m.view} : attendu ${m.expected.join(' x ')}, mesuré ${m.drawn.join(' x ')}${m.why ? ` (${m.why})` : ''}`);
}

main();
