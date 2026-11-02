// Aperçu des petites pièces de la maison de Xéros (CONCEPTION, « Les pièces de l'étape 2 ») : .art-preview/maison-petites-pieces.png
// (npm run art:preview). Sur une même ligne de sol, à côté de Xéros, au quadrillage des cases (32 px, 1,60 m), agrandi x3 :
// 1. la perche fendue : la perche, le palançon, la latte (2 m, est-ouest et nord-sud, leur icône), le fendage (le coin planté, la
//    fente, le bois ouvert), leurs tas (est-ouest et nord-sud), et chacune portée par Xéros (de face, de dos, de profil) ;
// 2. la chaux : la chaux vive et la chaux éteinte au sol, leur icône, portées ;
// 3. la mère assise : debout, puis assise de face, de dos, de profil (droite et gauche), sur le tabouret de 45 cm (le banc a la même
//    hauteur ; il est posé sous elle s'il est dessiné), à côté de Xéros ;
// 4. le fagot selon son nombre de branches, de 2 à 12, dans ses deux vues.

import type { PNG } from 'pngjs';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource, SpriteSheetSource } from '../../art/lib/types';
import { world } from '../../art/palette';
import { composeWood } from '../../art/world/wood-pieces';
import { SEAT } from '../../art/characters/mother';
import { FAGGOT_COUNTS, faggotDims } from '../../art/world/faggot';
import holdJson from '../../src/content/hold.json';
import { items } from '../../src/content';
import { silhouette } from '../../src/content/gabarit';
import { itemMass, woodMass } from '../../src/content/mass';
import type { WoodPiece } from '../../src/content/types';
import { drawOrder, shapeOf } from '../../src/world/pileShape';
import { woodPileDef } from '../../src/world/woodPile';
import { lookDef, lookOf, splitHits } from '../../src/world/woodShape';
import { Sheet, textWidth, type Rgb } from './audit-preview';

const K = 3;
const PAD = 10;
const T = 2;
const GRASS: Rgb = [123, 133, 68];
const GRID: Rgb = [110, 120, 60];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [215, 215, 200];
const GOLD: Rgb = [245, 215, 120];

type Art = { grid: Grid; palette: Palette };
/** Une case : une ou plusieurs images posées sur la ligne de sol (leur bas sur elle, sauf `dy`), et des lignes de texte dessous. */
interface Cell { images: (Art & { dx?: number; dy?: number })[]; lines: string[]; w?: number }
interface Row { title: string; cells: Cell[] }

/**
 * Un banc d'essai, pour l'aperçu seulement (le vrai `bench` est dessiné par ailleurs) : 200 × 30 × 45 cm, au gabarit ; est-ouest
 * 40 × (9 + 3) px, nord-sud (`ns`) 6 × (9 + 20) : le dessus de planches, son chant, deux pieds.
 */
function trialBench(ns: boolean): Grid {
  const w = ns ? 6 : 40;
  const top = ns ? 20 : 3;
  const rows: string[] = [];
  rows.push('K'.repeat(w));
  for (let i = 1; i < top; i++) rows.push('K' + (i === 1 ? '^' : '*').repeat(w - 2) + 'o');
  rows.push('K' + '%'.repeat(w - 2) + 'o');
  rows.push('o'.repeat(w));
  const leg = ns ? [1, 4] : [3, w - 6];
  for (let i = 0; i < 9 - 1; i++) rows.push([...Array(w)].map((_, x) => (leg.some((l) => x === l || x === l + 1) ? (x === leg[0] || x === leg[1] ? '%' : 'o') : '.')).join(''));
  return rows;
}

const kg = (n: number) => `${String(Math.round(n * 10) / 10).replace('.', ',')} kg`;

/** La planche des petites pièces ; undefined si Xéros n'est pas dessiné. */
export function maisonPiecesPreview(sources: ArtSource[]): PNG | undefined {
  const find = (name: string) => sources.find((s) => s.name === name);
  const xerosSheet = find('xeros');
  if (xerosSheet?.kind !== 'spritesheet') return undefined;
  const frame = (sheet: SpriteSheetSource, anim: string): Art => ({ grid: sheet.animations[anim].frames[0], palette: sheet.palette });
  const image = (name: string): Art | undefined => {
    const s = find(name);
    if (!s || s.kind === 'tileset') return undefined;
    return s.kind === 'image' ? { grid: s.grid, palette: s.palette } : { grid: Object.values(s.animations)[0].frames[0], palette: s.palette };
  };
  const xeros: Cell = { images: [frame(xerosSheet, 'idle-down')], lines: ['xeros 1,60 m'] };

  /** Xéros qui tient la planche `held` dans la posture `stance`, vu `view` : le centre de l'image sur le point d'accroche (hold.json). */
  const holding = (held: string, stance: 'carry' | 'hand', view: 'down' | 'up' | 'right'): Art => {
    const h = find(held);
    const body = frame(xerosSheet, stance === 'carry' ? `carry-idle-${view}` : `idle-${view}`);
    if (h?.kind !== 'spritesheet') return body;
    const g = h.animations[view].frames[0];
    const pts = holdJson[stance].idle[view][0] as Record<string, { dx: number; dy: number; behind?: boolean }> & { dx?: number; dy?: number; behind?: boolean };
    const p = stance === 'hand' ? pts.right : (pts as { dx: number; dy: number; behind?: boolean });
    const W = body.grid[0].length;
    const H = body.grid.length;
    const out = body.grid.map((r) => [...r]);
    const colors: Palette = { ...body.palette };
    // les deux palettes dans une : la planche tenue garde ses teintes, sous des clés à part
    const remap = new Map<string, string>();
    const spare = [...'ĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽž'];
    for (const q of new Set(g.join(''))) if (q !== '.') { const k = spare.shift()!; remap.set(q, k); colors[k] = h.palette[q]; }
    const c = Math.floor(g.length / 2);
    const ox = 16 + p.dx - c;
    const oy = 48 + p.dy - c;
    const put = (front: boolean) => g.forEach((row, y) => [...row].forEach((q, x) => {
      const X = ox + x, Y = oy + y;
      if (q === '.' || X < 0 || Y < 0 || X >= W || Y >= H) return;
      if (front || out[Y][X] === '.' || out[Y][X] === 'x') out[Y][X] = remap.get(q)!;
    }));
    put(!p.behind);
    return { grid: out.map((r) => r.join('')), palette: colors };
  };

  const rows: Row[] = [];
  // ---------- 1. La perche fendue ----------
  const POLE: { shape: WoodPiece['shape']; length: number }[] = [{ shape: 'round', length: 200 }, { shape: 'half', length: 200 }, { shape: 'lath', length: 200 }];
  {
    const cells: Cell[] = [xeros];
    for (const { shape, length } of POLE) {
      const ew: WoodPiece = { size: 'pole', shape, length, axis: 'ew' };
      const look = lookOf(ew);
      const def = lookDef('pole', look);
      const s = silhouette(composeWood(ew).toGrid(), world);
      cells.push({
        images: [{ grid: composeWood(ew).toGrid(), palette: world }, { grid: composeWood({ ...ew, axis: 'ns' }).toGrid(), palette: world }, ...(image(def.icon) ? [{ ...image(def.icon)!, dy: -24 }] : [])],
        lines: [def.name, `${length / 100} m : ${s.w}X${s.h} px`, kg(woodMass(ew))],
      });
    }
    rows.push({ title: 'La perche fendue : la perche, le palancon (pole half), la latte (pole lath, 6 x 3 cm), 2 m, est-ouest et nord-sud, et leur icone', cells });
  }
  {
    const cells: Cell[] = [xeros];
    for (const shape of ['round', 'half'] as const) {
      for (const axis of ['ew', 'ns'] as const) {
        const p: WoodPiece = { size: 'pole', shape, length: 200, axis };
        const hits = splitHits(p);
        const steps: Art[] = [
          { grid: composeWood({ ...p, wedge: { end: axis === 'ew' ? 'west' : 'north', hits: 0 } }).toGrid(), palette: world },
          { grid: composeWood({ ...p, wedge: { end: axis === 'ew' ? 'west' : 'north', hits: Math.floor(hits / 2) } }).toGrid(), palette: world },
          { grid: composeWood(p, { open: true }).toGrid(), palette: world },
        ];
        cells.push({ images: steps, lines: [`fendre ${lookDef('pole', lookOf(p)).name} ${axis}`, 'coin, fente, ouvert'] });
      }
    }
    rows.push({ title: 'Le fendage de la perche (le coin, la masse) : la perche en palancons, le palancon en lattes', cells });
  }
  {
    const cells: Cell[] = [xeros];
    for (const { shape, length } of POLE) {
      const def = woodPileDef({ size: 'pole', shape, length });
      for (const turned of [false, true]) {
        const s = shapeOf(def, turned);
        const ids = Object.keys(s.places);
        const order = drawOrder(s, ids);
        const placed = order.map((id) => ({ q: s.places[id], g: composeWood(s.places[id].wood!).toGrid() }));
        const left = Math.min(...placed.map((p) => p.q.x));
        const bottom = Math.max(...placed.map((p) => p.q.y));
        cells.push({
          images: placed.map((p) => ({ grid: p.g, palette: world, dx: p.q.x - left, dy: p.q.y - bottom })),
          lines: [`tas de ${lookDef('pole', shape === 'round' ? 'round' : shape).name}s`, `${ids.length} pieces, ${turned ? 'nord-sud' : 'est-ouest'}`],
        });
      }
    }
    rows.push({ title: 'Leurs tas (calcules, rangees de 3 x 3 pour le palancon et la latte)', cells });
  }
  {
    const cells: Cell[] = [xeros];
    for (const { shape } of POLE) {
      const look = lookOf({ shape });
      const def = lookDef('pole', look);
      cells.push({ images: (['down', 'up', 'right'] as const).map((v) => holding(def.held, 'carry', v)), lines: [`${def.name} portee`, def.held] });
    }
    rows.push({ title: 'Portees a deux mains (de face, de dos, de profil : en jeu, de profil, la piece a sa longueur)', cells });
  }
  // ---------- 2. La chaux ----------
  {
    const cells: Cell[] = [xeros];
    for (const [key, stance] of [['quicklime', 'carry'], ['slaked-lime', 'hand']] as const) {
      const it = items[key];
      const ground = image(it.ground!);
      const icon = image(it.icon);
      const s = ground ? silhouette(ground.grid, ground.palette) : { w: 0, h: 0 };
      cells.push({ images: [...(ground ? [ground] : []), ...(icon ? [{ ...icon, dy: -24 }] : [])], lines: [it.name, `${s.w}X${s.h} px`, kg(itemMass(key))] });
      cells.push({ images: (['down', 'up', 'right'] as const).map((v) => holding(it.hold!.image!, stance, v)), lines: [`${it.name} portee`, it.hold!.image!] });
    }
    rows.push({ title: 'La chaux : chaux vive (des mottes, 35 x 30 x 20 cm) et chaux eteinte (la pate dans le seau)', cells });
  }
  // ---------- 3. La mère assise ----------
  {
    const mother = find('mother');
    const real = find('bench');
    const seatName = real ? 'bench' : 'banc d\'essai';
    if (mother?.kind === 'spritesheet') {
      const cells: Cell[] = [xeros, { images: [frame(mother, 'idle-down')], lines: ['la mere debout'] }];
      for (const v of ['down', 'up', 'right', 'left'] as const) {
        const m = frame(mother, `sit-${v}`);
        const pt = SEAT[v === 'left' ? 'right' : v];
        const images: Cell['images'] = [];
        const seat: Art | undefined = real ? image(v === 'down' || v === 'up' ? 'bench' : 'bench-ns') : { grid: trialBench(v !== 'down' && v !== 'up'), palette: world };
        if (seat) {
          // le siège dessous : le milieu du bas de sa silhouette (sans l'ombre) sur le point SEAT de la frame
          const sil = silhouette(seat.grid, seat.palette);
          const x = v === 'left' ? 31 - pt.x : pt.x;
          images.push({ ...seat, dx: x - Math.floor(sil.x + sil.w / 2), dy: pt.y - (sil.y + sil.h - 1) - (48 - 1) + (seat.grid.length - 1) });
        }
        images.push({ ...m, dx: 0, dy: 0 });
        cells.push({ images, lines: [`sit-${v}`, `sur ${seatName}`], w: v === 'down' || v === 'up' ? 46 : 34 });
        cells.push({ images: [m], lines: [`sit-${v}`, 'seule'], w: 34 });
      }
      rows.push({ title: `La mere assise (sit-down, sit-up, sit-right, sit-left), sur le banc de 45 cm (${real ? 'bench' : 'un banc d\'essai au gabarit, 200 x 30 x 45 cm'})`, cells });
    }
  }
  // ---------- 4. Les fagots ----------
  {
    const cells: Cell[] = [xeros];
    for (const n of FAGGOT_COUNTS) {
      const ew = image(`faggot-n${n}`);
      const ns = image(`faggot-n${n}-ns`);
      if (!ew || !ns) continue;
      const d = faggotDims(n);
      const s = silhouette(ew.grid, ew.palette);
      cells.push({ images: [ew, ns], lines: [`faggot-n${n}`, `${n} branches`, `130 x ${d.d} cm`, `${s.w}X${s.h} px`] });
    }
    rows.push({ title: 'Le fagot selon son nombre de branches (faggot-n2 a faggot-n12, est-ouest et -ns)', cells });
  }

  // ---------- Mise en page ----------
  const cellW = (c: Cell) => {
    const art = c.w !== undefined ? c.w * K : c.images.reduce((s, g) => Math.max(s, (g.dx ?? 0) * K + g.grid[0].length * K), 0);
    const sum = c.w !== undefined || c.images.some((g) => g.dx !== undefined) ? art : c.images.reduce((s, g) => s + (g.grid[0].length + 3) * K, 0);
    return Math.max(sum, ...c.lines.map((l) => textWidth(l, T))) + 2 * PAD;
  };
  const artH = (c: Cell) => Math.max(...c.images.map((g) => (g.grid.length - (g.dy ?? 0)) * K));
  const rowH = (r: Row) => 24 + Math.max(...r.cells.map(artH)) + Math.max(...r.cells.map((c) => c.lines.length * 12 + 12)) + 12;
  const width = Math.max(...rows.map((r) => r.cells.reduce((s, c) => s + cellW(c), 0)), ...rows.map((r) => textWidth(r.title, T) + 20)) + 2 * PAD;
  const height = rows.reduce((s, r) => s + rowH(r), 20);
  const sheet = new Sheet(width, height, GRASS);
  for (let x = 0; x < width; x += 32 * K) sheet.rect(x, 0, 1, height, GRID);
  for (let y = 0; y < height; y += 32 * K) sheet.rect(0, y, width, 1, GRID);
  let y = 10;
  for (const r of rows) {
    sheet.text(r.title, PAD, y, GOLD, T);
    const ground = y + 24 + Math.max(...r.cells.map(artH));
    let x = PAD;
    for (const c of r.cells) {
      const placed = c.w !== undefined || c.images.some((g) => g.dx !== undefined);
      let gx = x + PAD;
      for (const g of c.images) {
        const ox = placed ? x + PAD + (g.dx ?? 0) * K : gx;
        sheet.blit(g.grid, g.palette, ox, ground - g.grid.length * K + (g.dy ?? 0) * K, K);
        if (!placed) gx += (g.grid[0].length + 3) * K;
      }
      c.lines.forEach((l, i) => sheet.text(l, x + PAD, ground + 8 + i * 12, i === 0 ? WHITE : GREY, T));
      x += cellW(c);
    }
    y += rowH(r);
  }
  return sheet.png;
}
