// Aperçus de la maquette de la chaumière (docs/maison-chaumiere.md) : les éléments composés proposés (art/proposals/), seuls
// dans toutes leurs vues (maison-elements.png). Agrandis x4, sur le quadrillage des cases (32 px, 1,60 m), Xéros pour l'échelle.
// Ne change pas le jeu : ces dessins ne sont pas dans art/index.ts.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import type { Grid } from '../../art/lib/canvas';
import { sources } from '../../art/index';
import { composeWood } from '../../art/world/wood-pieces';
import type { WoodPiece } from '../../src/content/types';
import { SHADOW } from '../../src/config';
import { BAYS_X, BAYS_Y, GABLE_PLATES, elementRecipes, plates } from './chaumiere';
import { world } from '../../art/palette';
import { HOUSE, imageSize } from '../../art/proposals/chaumiere-geometry';
import type { ProposedElement, View } from '../../art/proposals/chaumiere-geometry';
import { Sheet, textWidth, type Rgb } from './audit-preview';
import { PLANS, type Bay, type Plan, type Rect } from './chaumiere-plans';

export const K = 4;
const PAD = 12;
const T = 2;
export const GRASS: Rgb = [123, 133, 68];
const LINE: Rgb = [110, 120, 60];
export const WHITE: Rgb = [255, 255, 255];
export const GREY: Rgb = [215, 215, 200];
export const GOLD: Rgb = [245, 215, 120];
export const RED: Rgb = [235, 90, 70];

/** Xéros de face (idle-down, image 0) ; ses rangées utiles vont de 14 à 45 (32 px, 1,60 m). */
export function xeros(): { grid: Grid; palette: Record<string, string> } {
  const body = sources.find((s) => s.kind === 'spritesheet' && s.name === 'xeros');
  if (body?.kind !== 'spritesheet') throw new Error('maquette : Xéros (xeros) n’est pas dessiné');
  return { grid: body.animations['idle-down'].frames[0], palette: body.palette };
}

/** Les vues d'un élément selon sa symétrie. */
export const viewsOf = (e: ProposedElement): View[] => (e.views === 'four' ? ['r0', 'r1', 'r2', 'r3'] : ['r0', 'r1']);

/** Une image dessinée d'un élément, et ce qu'on écrit dessous (vue, longueur, état, taille ; en rouge si la taille est fausse). */
interface Drawn {
  grid: Grid;
  lines: { text: string; color: Rgb }[];
}

/** Toutes les images d'un élément : chaque vue, à chaque longueur, dans chaque état. */
function drawnOf(e: ProposedElement): Drawn[] {
  const out: Drawn[] = [];
  for (const length of e.lengths ?? [0]) {
    for (const state of e.states ?? [undefined]) {
      for (const view of viewsOf(e)) {
        let grid: Grid;
        try {
          grid = e.draw(view, length, state);
        } catch (err) {
          out.push({ grid: [], lines: [{ text: `${view} : ${(err as Error).message}`.slice(0, 40), color: RED }] });
          continue;
        }
        const want = imageSize(e.box(view, length));
        const w = grid[0]?.length ?? 0;
        const h = grid.length;
        const ok = w === want.w && h === want.h;
        out.push({
          grid,
          lines: [
            { text: [view, length ? `${length / 100} m`.replace('.', ',') : '', state ?? ''].filter(Boolean).join(' '), color: WHITE },
            { text: ok ? `${w}X${h} px` : `${w}X${h} (attendu ${want.w}X${want.h})`, color: ok ? GREY : RED },
          ],
        });
      }
    }
  }
  return out;
}

/**
 * La planche des éléments : un titre par élément (et le mot PROPOSITION), puis ses images posées sur une même ligne de sol,
 * Xéros en tête de rangée. `notes` : des lignes à écrire sous le titre (la recette).
 */
export function elementsSheet(elements: ProposedElement[], notes: Record<string, string[]> = {}): Sheet {
  const x = xeros();
  type Row = { title: string; notes: string[]; cells: Drawn[] };
  const rows: Row[] = elements.map((e) => ({ title: `${e.name} (${e.key}) - PROPOSITION`, notes: notes[e.key] ?? [], cells: drawnOf(e) }));
  const cellW = (d: Drawn) => Math.max((d.grid[0]?.length ?? 0) * K, ...d.lines.map((l) => textWidth(l.text, T))) + 2 * PAD;
  const xerosW = 12 * K + 2 * PAD;
  const rowArt = (r: Row) => Math.max(32 * K, ...r.cells.map((d) => d.grid.length * K));
  const rowH = (r: Row) => 24 + r.notes.length * 12 + rowArt(r) + 40;
  const width = Math.max(
    ...rows.map((r) => xerosW + r.cells.reduce((s, d) => s + cellW(d), 0) + 2 * PAD),
    ...rows.flatMap((r) => [r.title, ...r.notes].map((t) => textWidth(t, T) + 2 * PAD)),
  );
  const height = rows.reduce((s, r) => s + rowH(r), 10);
  const sheet = new Sheet(width, height, GRASS);
  for (let gx = 0; gx < width; gx += 32 * K) sheet.rect(gx, 0, 1, height, LINE);
  for (let gy = 0; gy < height; gy += 32 * K) sheet.rect(0, gy, width, 1, LINE);
  let y = 10;
  for (const r of rows) {
    sheet.text(r.title, PAD, y, GOLD, T);
    r.notes.forEach((n, i) => sheet.text(n, PAD, y + 14 + i * 12, GREY, T));
    const ground = y + 24 + r.notes.length * 12 + rowArt(r);
    // Xéros, ses pieds (rangée 45) sur la ligne de sol
    sheet.blit(x.grid, x.palette, PAD - 10 * K, ground - 46 * K, K, [14, 45]);
    let cx = xerosW;
    for (const d of r.cells) {
      if (d.grid.length) sheet.blit(d.grid, world, cx + PAD, ground - d.grid.length * K, K);
      d.lines.forEach((l, i) => sheet.text(l.text, cx + PAD, ground + 6 + i * 12, l.color, T));
      cx += cellW(d);
    }
    y += rowH(r);
  }
  return sheet;
}

// ---------------------------------------------------------------- les plans (maison-plans.png)

/** Couleurs du plan (palette du jeu, en RVB). */
const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PLAN_COLORS = {
  solin: hex(world.r),
  solinEdge: hex(world.z),
  floor: hex(world.U),
  wall: hex(world.d),
  post: hex(world.N),
  partition: hex(world.D),
  door: hex(world.M),
  window: hex(world.W),
  chimney: hex(world.z),
  hearth: hex(world.K),
  outline: hex(world.o),
  kinds: {
    bois: hex(world.m),
    lit: hex(world.a),
    pierre: hex(world.R),
    terre: hex(world.n),
    paille: hex(world.t),
    outil: hex(world.Z),
    sauvegarde: hex(world.b),
  } as Record<string, Rgb>,
};

/** Une étiquette lisible sur n'importe quel fond : le texte sur un bandeau sombre translucide. */
function tag(sheet: Sheet, text: string, x: number, y: number, c: Rgb): void {
  const t = text.replace(/’/g, "'");
  for (let j = -2; j < 12; j++) for (let i = -2; i < textWidth(t, 2) + 1; i++) sheet.dot(x + i, y + j, [40, 28, 20], 0.6);
  sheet.text(t, x, y, c, 2);
}

/** Les deux plans, l'un sous l'autre, à la même échelle (x4 : 1 cm = 0,8 px), pièces et meubles étiquetés, puis leurs raisons. */
export function plansSheet(plans: Plan[]): Sheet {
  const s = (cm: number) => Math.round((cm / 5) * K);
  const margin = 40;
  const planW = s(HOUSE.length);
  const planH = s(HOUSE.width);
  const whyH = (p: Plan) => 16 + p.why.length * 12;
  const blockH = (p: Plan) => 30 + planH + 2 * margin + whyH(p);
  const width = planW + 2 * margin + 260;
  const height = plans.reduce((a, p) => a + blockH(p), 20);
  const sheet = new Sheet(width, height, GRASS);
  const x = xeros();
  let top = 10;
  for (const p of plans) {
    sheet.text(`${p.name.replace(/’/g, "'")} - PROPOSITION`, margin, top, GOLD, 2);
    const ox = margin;
    const oy = top + 30 + margin / 2;
    const rect = (r: Rect, c: Rgb) => sheet.rect(ox + s(r.x), oy + s(r.y), s(r.w), s(r.d), c);
    const box = (r: Rect, c: Rgb) => sheet.outline(ox + s(r.x), oy + s(r.y), s(r.w), s(r.d), c);
    // le solin, le sol, les murs à leurs axes, les poteaux
    rect({ x: 0, y: 0, w: HOUSE.length, d: HOUSE.width }, PLAN_COLORS.solin);
    box({ x: 0, y: 0, w: HOUSE.length, d: HOUSE.width }, PLAN_COLORS.solinEdge);
    rect({ x: 40, y: 40, w: 1360, d: 560 }, PLAN_COLORS.floor);
    const { north, south, west, east } = HOUSE.axes;
    for (const y of [north, south]) rect({ x: 20, y: y - 10, w: 1400, d: 20 }, PLAN_COLORS.wall);
    for (const xx of [west, east]) rect({ x: xx - 10, y: 20, w: 20, d: 600 }, PLAN_COLORS.wall);
    for (const px of HOUSE.postsX) for (const y of [north, south]) rect({ x: px - 10, y: y - 10, w: 20, d: 20 }, PLAN_COLORS.post);
    for (const py of HOUSE.postsY) for (const xx of [west, east]) rect({ x: xx - 10, y: py - 10, w: 20, d: 20 }, PLAN_COLORS.post);
    // les ouvertures : une porte laisse un passage au sol, une fenêtre un jour clair dans le mur
    for (const o of p.openings) {
      const y = o.wall === 'north' ? north : south;
      if (o.kind === 'porte') {
        rect({ x: o.x, y: y - 10, w: o.w, d: 20 }, PLAN_COLORS.floor);
        rect({ x: o.x, y: o.wall === 'south' ? y - 10 : y + 6, w: o.w, d: 4 }, PLAN_COLORS.door);
        rect({ x: o.x + o.w, y: y - 10, w: 20, d: 20 }, PLAN_COLORS.post);
      } else rect({ x: o.x, y: y - 4, w: o.w, d: 8 }, PLAN_COLORS.window);
      const label = o.kind === 'porte' ? (o.wall === 'north' ? 'porte du jardin' : 'porte') : 'fenetre';
      sheet.text(label, ox + s(o.x), o.wall === 'north' ? oy - 14 : oy + planH + 6, WHITE, 2);
    }
    for (const r of p.partitions) rect(r, PLAN_COLORS.partition);
    // la cheminée et son âtre, ouvert vers `opens`
    rect(p.chimney, PLAN_COLORS.chimney);
    const hearth = p.chimney.opens === 'west' ? { x: p.chimney.x, y: p.chimney.y + 40, w: 60, d: 120 } : { x: p.chimney.x + 60, y: p.chimney.y + 40, w: 60, d: 120 };
    rect(hearth, PLAN_COLORS.hearth);
    box(p.chimney, PLAN_COLORS.outline);
    sheet.text('atre', ox + s(p.chimney.x) - 36, oy + s(p.chimney.y) - 12, WHITE, 2);
    // les meubles, à leur emprise réelle, et leur nom
    for (const f of p.furniture) {
      rect(f, PLAN_COLORS.kinds[f.kind]);
      box(f, PLAN_COLORS.outline);
    }
    for (const f of p.furniture) {
      const label = f.kind === 'sauvegarde' ? `${f.name} (sauvegarde)` : f.name;
      tag(sheet, label, ox + s(f.x) + 2, oy + s(f.y) + Math.max(2, s(f.d) / 2 - 5), f.kind === 'sauvegarde' ? GOLD : WHITE);
    }
    // les pièces : leur nom et leur surface, au milieu de la pièce, par-dessus le reste
    for (const r of p.rooms) {
      const area = String(Math.round((r.w * r.d) / 1000) / 10).replace('.', ',');
      const text = `${r.name.toUpperCase()} ${area} M2`;
      const [lx, ly] = r.label ?? [r.x + r.w / 2 - (textWidth(text, 2) * 5) / (2 * K), r.y + r.d / 2];
      tag(sheet, text, ox + s(lx), oy + s(ly) - 5, GOLD);
    }
    // le quadrillage des cases du jeu (1,60 m), par-dessus, à peine marqué
    for (let cx = 0; cx <= HOUSE.length; cx += 160) for (let yy = 0; yy < planH; yy += 2) sheet.dot(ox + s(cx), oy + yy, [255, 255, 255], 0.25);
    for (let cy = 0; cy <= HOUSE.width; cy += 160) for (let xx = 0; xx < planW; xx += 2) sheet.dot(ox + xx, oy + s(cy), [255, 255, 255], 0.25);
    // l'échelle : Xéros, et une case
    const lx = ox + planW + 30;
    sheet.blit(x.grid, x.palette, lx - 10 * K, oy + 20 - 14 * K, K, [14, 45]);
    sheet.text('xeros 1,60 m', lx, oy + 20 + 34 * K, WHITE, 2);
    sheet.rect(lx, oy + planH - 30, s(160), 4, WHITE);
    sheet.text('1 case = 1,60 m', lx, oy + planH - 20, WHITE, 2);
    sheet.text('N en haut', lx, oy + planH - 50, WHITE, 2);
    // les raisons
    const wy = oy + planH + margin / 2 + 10;
    p.why.forEach((w, i) => sheet.text(`- ${w.replace(/’/g, "'")}`, margin, wy + i * 12, GREY, 2));
    top += blockH(p);
  }
  return sheet;
}

// ---------------------------------------------------------------- les trois aperçus

/** Les modules de dessin des éléments proposés (chargés à la demande : un module absent est sauté, et dit). */
const MODULES = ['murs', 'toit'];

/** Écrit les aperçus de la maquette dans `dir` ; rend les fichiers écrits. Ce qui n'est pas encore dessiné est sauté. */
export async function writeMaquettePreviews(dir: string): Promise<string[]> {
  mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  const write = (name: string, png: PNG) => {
    writeFileSync(join(dir, name), PNG.sync.write(png));
    written.push(join(dir, name));
  };
  write('maison-plans.png', plansSheet(PLANS).png);
  const elements: ProposedElement[] = [];
  for (const m of MODULES) {
    try {
      elements.push(...((await import(`../../art/proposals/${m}.ts`)) as { ELEMENTS: ProposedElement[] }).ELEMENTS);
    } catch (err) {
      console.warn(`maquette : ATTENTION art/proposals/${m}.ts illisible (${(err as Error).message.split('\n')[0]})`);
    }
  }
  write('maison-couches.png', couchesSheet(elements).png);
  for (const k of MISSING) console.warn(`maquette : ATTENTION élément ${k} pas encore dessiné`);
  const recipes = new Map(elementRecipes().map((r) => [r.key, r]));
  const notes = Object.fromEntries(
    elements.map((e) => {
      const r = recipes.get(e.key);
      return [e.key, r ? [`${r.size} cm, ${Math.round(r.kg ?? 0)} kg - poste : ${r.station} - metier : ${r.trade}`, `recette : ${r.bill.lines().join(', ')}`] : []];
    }),
  );
  write('maison-elements.png', elementsSheet(elements, notes).png);
  return written;
}

// ---------------------------------------------------------------- la maison couche par couche (maison-couches.png)

/** Une image posée dans la scène : sa grille, son coin haut gauche (px du jeu, repère de la maison), sa profondeur, son étape. */
interface Placed {
  grid: Grid;
  sx: number;
  sy: number;
  key: number;
  stage: number;
}

/** Les étapes de la maquette, de gauche à droite (la dernière : la maison finie, son ombre et Xéros). */
const STAGES = [
  '1. SOLIN : MOELLONS AU MORTIER DE TERRE, BLOCAGE D\'ECLATS, 60 X 80 CM',
  '2. OSSATURE : SABLIERES, POTEAUX DE 2 M TOUS LES 2 M, HUISSERIES',
  '3. REMPLISSAGE : PALANCONS, CLAYONNAGE, TORCHIS ; CLOISONS',
  '4. CHARPENTE : ENTRAITS, COUPLES DE PERCHES A 50 DEGRES, LATTES, PIGNONS',
  '5. CHAUME : 40 CM DE BOTTES, FAITAGE DE TERRE',
  '6. OUVERTURES ET CHEMINEE : PORTES, FENETRES, CONDUIT',
  '7. LA MAISON FINIE (PLAN A)',
];

/** Les éléments que la scène demande et qu'aucun module de art/proposals/ ne dessine encore. */
export const MISSING = new Set<string>();

/** Toutes les images de la maquette, chacune avec l'étape où elle paraît. */
function scene(elements: Map<string, ProposedElement>): Placed[] {
  const out: Placed[] = [];
  /** Un élément composé, sa boîte posée au coin (x0, y0, z0) en cm ; un élément pas encore dessiné est sauté (et dit). */
  const put = (stage: number, key: string, view: View, length: number, state: string | undefined, x0: number, y0: number, z0: number, depth?: number) => {
    const e = elements.get(key);
    if (!e) {
      MISSING.add(key);
      return;
    }
    const b = e.box(view, length);
    out.push({ grid: e.draw(view, length, state), sx: x0 / 5, sy: (y0 - z0 - b.h) / 5, key: depth ?? y0 + b.d, stage });
  };
  /** Une image posée par son coin bas gauche : (x, y sud, z bas) en cm. */
  const image = (stage: number, grid: Grid, x: number, ySouth: number, z: number, depth = ySouth) =>
    out.push({ grid, sx: Math.round(x / 5), sy: Math.round((ySouth - z) / 5) - grid.length, key: depth, stage });
  const wood = (piece: WoodPiece) => {
    const g = composeWood(piece).toGrid();
    // la pièce debout garde sous son pied les 3 rangées vides du dé : ici, elle pose sur la sablière
    return piece.axis === 'up' ? g.slice(0, g.length - 3) : g;
  };
  const beam = (axis: 'ew' | 'ns' | 'up', length: number) => wood({ size: 'normal', shape: 'round', hewn: 12, axis, length });
  const pole = (axis: 'ew' | 'ns', length: number) => wood({ size: 'pole', shape: 'round', axis, length });
  const { north: N, south: S, west: W, east: E } = HOUSE.axes;
  const plan = PLANS[0];
  const doorsS = plan.south.flatMap((k, i) => (k === 'porte' ? [HOUSE.postsX[i]] : []));
  const doorsN = plan.north.flatMap((k, i) => (k === 'porte' ? [HOUSE.postsX[i]] : []));

  // 1. le solin, coupé sous les portes (le seuil vient avec la porte)
  const solinRuns = (doors: number[]) => {
    const runs: [number, number][] = [];
    let from = 0;
    for (const d of doors) {
      runs.push([from, d - 10]);
      from = d + 150;
    }
    runs.push([from, HOUSE.length]);
    return runs;
  };
  for (const [a, b] of solinRuns(doorsN)) put(1, 'solin', 'r0', b - a, undefined, a, 0, 0, 60);
  for (const [a, b] of solinRuns(doorsS)) put(1, 'solin', 'r0', b - a, undefined, a, 580, 0, 640);
  put(1, 'solin', 'r1', 520, undefined, 0, 60, 0);
  put(1, 'solin', 'r1', 520, undefined, 1380, 60, 0);

  // 2. l'ossature : sablières (vraies pièces, enturées), poteaux, huisseries, montants, appuis et linteaux des fenêtres
  const longPlate = (pieces: number[], axisY: number, z: number, from = 20, gaps: number[] = []) => {
    let x = from;
    let g = 0;
    for (const l of pieces) {
      image(2, beam('ew', l), x, axisY + 20, z, axisY + 20 - 1);
      x += l - 20;
      if (gaps[g] !== undefined && x + 20 >= gaps[g] + 10) {
        x = gaps[g] + 130;
        g++;
      }
    }
  };
  longPlate(plates(doorsS), S, 40, 20, doorsS);
  longPlate(plates(doorsN), N, 40, 20, doorsN);
  longPlate(plates(), S, 260);
  longPlate(plates(), N, 260);
  for (const x of [W, E]) {
    for (const z of [40, 260]) {
      let y = 20;
      for (const l of GABLE_PLATES) {
        image(2, beam('ns', l), x - 25, y + l, z, y + l);
        y += l - 20;
      }
    }
  }
  for (const px of HOUSE.postsX) for (const y of [N, S]) image(2, beam('up', 200), px - 20, y + 20, 60, y + 21);
  for (const py of HOUSE.postsY.slice(1, -1)) for (const x of [W, E]) image(2, beam('up', 200), x - 20, py + 20, 60, py + 21);
  for (const d of [...doorsS.map((x) => [x, S]), ...doorsN.map((x) => [x, N])]) image(2, beam('up', 240), d[0] + 110, d[1] + 20, 20, d[1] + 21);
  plan.south.forEach((k, i) => {
    if (k !== 'fenetre') return;
    const x = HOUSE.postsX[i];
    image(2, beam('up', 200), x + 90, S + 20, 60, S + 21);
    image(2, beam('ew', 100), x, S + 20, 100, S + 20);
    image(2, beam('ew', 100), x, S + 20, 180, S + 20);
  });

  // 3. le remplissage : les pans pleins et d'angle (quelques-uns encore en clayonnage), les cloisons du plan A
  const panAt = (stage: number, k: Bay, view: View, i: number, wallY: number, clay: boolean) => {
    const x = HOUSE.postsX[i];
    const bay = BAYS_X[i];
    if (k === 'plein') put(stage, 'pan-plein', view, bay, clay ? 'clayonnage' : 'torchis', x - 20, wallY - 20, 40);
    else if (k === 'angle') {
      const westEnd = i === 0;
      const side = view === 'r0' ? (westEnd ? 'gauche' : 'droite') : westEnd ? 'droite' : 'gauche';
      put(stage, 'pan-angle', view, bay, side, x - 20, wallY - 20, 40);
    } else if (k === 'fenetre') put(6, 'pan-fenetre', view, 200, undefined, x - 20, wallY - 20, 40);
    else put(6, 'pan-porte', view, 200, undefined, x - 20, wallY - 20, 0);
  };
  plan.south.forEach((k, i) => panAt(3, k, 'r0', i, S, i === 3));
  plan.north.forEach((k, i) => panAt(3, k, 'r2', i, N, i === 3 || i === 4));
  const gable = (x: number, view: View, middle: boolean) => {
    HOUSE.postsY.slice(0, -1).forEach((y, i) => {
      const bay = BAYS_Y[i];
      if (i === 1) {
        if (middle) put(3, 'pan-plein', view, bay, 'torchis', x - 20, y - 20, 40);
        return;
      }
      put(3, 'pan-angle', view, bay, i === 0 ? 'droite' : 'gauche', x - 20, y - 20, 40);
    });
  };
  gable(W, 'r1', true);
  gable(E, 'r3', !plan.chimneyInGable);
  for (const r of plan.partitions) {
    if (r.w > r.d) put(3, 'cloison', 'r0', r.w, undefined, r.x, r.y - 10, 20);
    else put(3, 'cloison', 'r1', r.d, undefined, r.x - 10, r.y, 20);
  }

  // 4. la charpente : entraits, couples de perches, faîtage, lattes ; les pignons
  for (const px of HOUSE.postsX.slice(1, -1)) image(4, beam('ns', 580), px - 25, S, 280, 615);
  for (let i = 0; i < HOUSE.roof.couples; i++) put(4, 'couple', 'r0', 0, undefined, W + i * HOUSE.roof.spacing - 15, -20, 232, 650);
  let fx = HOUSE.roof.from;
  for (const l of [560, 560, 400]) {
    image(4, pole('ew', l), fx, HOUSE.roof.ridge.y + 6, HOUSE.roof.ridge.z, 656);
    fx += l - 20;
  }
  const rod = sources.find((s) => s.name === 'wattle-rod-ground');
  if (rod?.kind === 'image') {
    const sin = HOUSE.roof.rise / Math.hypot(HOUSE.roof.rise, 300);
    const cos = 300 / Math.hypot(HOUSE.roof.rise, 300);
    for (let s = 20; s < 540; s += 40) {
      const y = HOUSE.roof.foot.y - s * cos;
      const z = HOUSE.roof.foot.z + 12 + s * sin;
      // des baguettes de 2 m tous les 1,80 m, la dernière calée sur la rive est (elles ne dépassent pas le toit)
      const last = HOUSE.roof.to - (rod.grid[0].length * 5);
      for (let x = HOUSE.roof.from; x < last; x += 180) image(4, rod.grid, x, y, z, 655);
      image(4, rod.grid, last, y, z, 655);
    }
  }
  put(4, 'pignon', 'r1', 0, undefined, W - 20, 10, 280, 640);
  put(4, 'pignon', 'r1', 0, undefined, E - 20, 10, 280, 640);

  // 5. le chaume : le versant nord (caché), le versant sud, le faîtage de terre
  const roofLength = HOUSE.roof.to - HOUSE.roof.from;
  put(5, 'pan-de-toit', 'r2', roofLength, 'rives', HOUSE.roof.from, -40, 220, 300);
  put(5, 'pan-de-toit', 'r0', roofLength, 'rives', HOUSE.roof.from, 320, 220, 670);
  put(5, 'faitage', 'r0', roofLength, undefined, HOUSE.roof.from, 300, 700, 675);

  // 6. la cheminée (au pignon est dans le plan A : l'âtre vers l'ouest, r1), ce qui sort du chaume
  if (plan.chimneyInGable) put(6, 'cheminee', 'r1', 0, 'sur le toit', HOUSE.chimney.x, HOUSE.chimney.y, 0, 680);
  return out;
}

/** Remplit un polygone (px de la planche) d'une couleur translucide : l'ombre portée du toit. */
function fillPolygon(sheet: Sheet, pts: [number, number][], c: Rgb, a: number): void {
  const ys = pts.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const xs: number[] = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[j];
      if (y1 > y + 0.5 !== y2 > y + 0.5) xs.push(x1 + ((y + 0.5 - y1) * (x2 - x1)) / (y2 - y1));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) sheet.dot(x, y, c, a);
  }
}

/** La maison montée couche par couche, de gauche à droite, puis finie (4 étapes par rangée), agrandie x4, avec Xéros. */
export function couchesSheet(elements: ProposedElement[]): Sheet {
  const items = scene(new Map(elements.map((e) => [e.key, e])));
  const left = -60;
  const right = 1540;
  const top = -116;
  const bottom = 160;
  const cellW = ((right - left) / 5) * K;
  const cellH = (bottom - top) * K + 40;
  const perRow = 4;
  const sheet = new Sheet(cellW * perRow, cellH * Math.ceil(STAGES.length / perRow) + 20, GRASS);
  const x = xeros();
  const grass = hex(world.g);
  STAGES.forEach((title, n) => {
    const stage = n + 1;
    const ox = (n % perRow) * cellW - (left / 5) * K;
    const oy = Math.floor(n / perRow) * cellH + 40 - top * K;
    const px = (gx: number, gy: number): [number, number] => [ox + gx * K, oy + gy * K];
    // le quadrillage des cases, au sol, depuis le coin du solin
    for (let gx = -320; gx <= 1600; gx += 160) {
      const [sx] = px(gx / 5, 0);
      if (sx > (n % perRow) * cellW && sx < ((n % perRow) + 1) * cellW) for (let yy = oy + top * K; yy < oy + bottom * K; yy += 2) sheet.dot(sx, yy, LINE);
    }
    for (let gy = -160; gy <= 800; gy += 160) {
      const [, sy] = px(0, gy / 5);
      if (sy > oy + top * K) for (let xx = (n % perRow) * cellW; xx < ((n % perRow) + 1) * cellW; xx += 2) sheet.dot(xx, sy, LINE);
    }
    // le sol intérieur : terre remuée pendant le chantier, terre battue (20 cm plus haut) une fois finie
    const floor = stage === STAGES.length ? hex(world.U) : hex(world.n);
    const [fx0, fy0] = px(60 / 5, (60 - (stage === STAGES.length ? 20 : 0)) / 5);
    sheet.rect(fx0, fy0, (1320 / 5) * K, (520 / 5) * K, floor);
    // l'ombre portée de la maison finie : le toit projeté au sol selon la lumière (SHADOW de config.ts)
    if (stage === STAGES.length) {
      const r = HOUSE.roof;
      const ground = (gx: number, gy: number, gz: number): [number, number] => px(gx / 5 + SHADOW.dx * (gz / 5), gy / 5 + SHADOW.dy * (gz / 5));
      fillPolygon(sheet, [ground(r.from, r.eave.y, r.eave.zBottom), ground(r.to, r.eave.y, r.eave.zBottom), ground(r.to, r.top.y, r.top.z), ground(r.from, r.top.y, r.top.z)], [43, 26, 16], SHADOW.alpha);
    }
    for (const it of items.filter((i) => i.stage <= stage).sort((a, b) => a.key - b.key)) {
      const [sx, sy] = px(it.sx, it.sy);
      sheet.blit(it.grid, world, sx, sy, K);
    }
    // Xéros devant la porte d'entrée, pour l'échelle (ses pieds à 1,20 m devant le solin)
    const [xx, xy] = px((880 - 30) / 5, (760 - 46 * 5) / 5);
    sheet.blit(x.grid, x.palette, xx, xy, K, [14, 45]);
    sheet.rect((n % perRow) * cellW, Math.floor(n / perRow) * cellH, cellW, 34, grass);
    sheet.text(`${title} - PROPOSITION`, (n % perRow) * cellW + 12, Math.floor(n / perRow) * cellH + 12, GOLD, 2);
  });
  return sheet;
}
