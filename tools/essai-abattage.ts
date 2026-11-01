// Essai de l'abattage (hors jeu) : npx tsx tools/essai-abattage.ts écrit .art-preview/essai-abattage.png et
// .art-preview/essai-abattage.html, d'après les dessins de art/proposals/essai-abattage.ts.
//
// La planche (x4) : en haut, le coup de cognée lent et lourd, chaque temps nommé avec sa durée (rythme de Xéros aujourd'hui),
// dans les quatre directions (bas, haut, droite, gauche = miroir de droite), Xéros devant le pied de l'arbre (geste de côté,
// `use`) ou au-dessus d'une bille (geste de haut en bas, `chop`) ; en dessous, les étapes de l'abattage de l'arbre normal,
// nommées, sur l'herbe, chacune avec le pied agrandi x10 ; puis la première image de la chute existante (10°).
// La page : le coup en boucle à vitesse réelle (direction, rythme), l'arbre qui avance d'une étape tous les 8 coups (accéléré),
// une pause de souffle tous les 31 coups (fx-breath), puis la chute existante (normal-tree-fall).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import type { SpriteSheetSource } from '../art/lib/types';
import tiles from '../art/world/tiles';
import normalFall from '../art/world/normal-fall';
import breath, { BREATH_ANCHORS, palette as breathPalette } from '../art/characters/breath';
import { normalFelledLog } from '../art/world/normal-logs';
import {
  GESTURES, GESTURE_TITLE, RHYTHMS, STAGES, TRAIL_PAD, bodyFrame, effectPalette, frameDurations, stageFrame, toolFrame,
  trailFrame, toolPalette, worldPalette, xerosPalette, type AxeFrame, type Dir, type GestureKey,
} from '../art/proposals/essai-abattage';
import { FOOT, OFF } from '../art/world/normal-geometry';
import { Sheet, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------------------------------------------------
// Petit compositeur RGBA, à l'échelle 1 (les images du jeu, découpées au bord)
// ---------------------------------------------------------------------------------------------------------------------

class Buf {
  readonly data: Uint8ClampedArray;
  constructor(readonly w: number, readonly h: number) { this.data = new Uint8ClampedArray(w * h * 4); }
  blit(grid: Grid, pal: Palette, ox: number, oy: number, flip = false): this {
    const gw = grid[0]?.length ?? 0;
    grid.forEach((row, y) => [...row].forEach((ch, x0) => {
      if (ch === '.') return;
      const x = flip ? gw - 1 - x0 : x0;
      const X = ox + x;
      const Y = oy + y;
      if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return;
      const hex = pal[ch]?.replace('#', '');
      if (!hex) throw new Error(`couleur « ${ch} » absente de la palette`);
      const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
      const a = hex.length === 8 ? n(6) / 255 : 1;
      const i = (Y * this.w + X) * 4;
      const ba = this.data[i + 3] / 255;
      const oa = a + ba * (1 - a);
      for (let k = 0; k < 3; k++) this.data[i + k] = oa ? (n(k * 2) * a + this.data[i + k] * ba * (1 - a)) / oa : 0;
      this.data[i + 3] = oa * 255;
    }));
    return this;
  }
  /** Le tampon dans une planche, agrandi de k, posé sur le fond de la planche. */
  into(s: Sheet, sx: number, sy: number, k: number) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = (y * this.w + x) * 4;
      const a = this.data[i + 3] / 255;
      if (!a) continue;
      const c: Rgb = [this.data[i], this.data[i + 1], this.data[i + 2]];
      for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) s.dot(sx + x * k + q, sy + y * k + j, c, a);
    }
  }
  uri(): string {
    const png = new PNG({ width: this.w, height: this.h });
    png.data.set(this.data);
    return `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
  }
}

const grassTile = { grid: tiles.tiles.grass as Grid, palette: tiles.palette as Palette };
function grass(b: Buf) {
  for (let y = 0; y < b.h; y += 32) for (let x = 0; x < b.w; x += 32) b.blit(grassTile.grid, grassTile.palette, x, y);
  return b;
}

// ---------------------------------------------------------------------------------------------------------------------
// Une case du geste : Xéros, la cognée, la traînée et la cible
// ---------------------------------------------------------------------------------------------------------------------

/** Case du geste, en pixels du jeu ; la frame du corps (32 × 48) au milieu. */
const CW = 80;
const CH = 84;
const OX = (CW - 32) / 2;
const OY = 16;
/** Les quatre directions de la planche ; la gauche est le miroir de la droite. */
const DIRS4 = ['down', 'up', 'right', 'left'] as const;
type Dir4 = (typeof DIRS4)[number];
const srcDir = (d: Dir4): Dir => (d === 'left' ? 'right' : d);

/** Pied de l'arbre (geste de côté), dans la frame du corps, par direction (vers la droite ; la gauche en est le miroir). */
const TREE_AT: Record<Dir, [number, number]> = { right: [41, 45], down: [1, 62], up: [33, 36] };
/** Coin de la bille (geste de haut en bas), dans la frame du corps. */
const LOG_AT: Record<Dir, [number, number]> = { right: [24, 37], down: [7, 46], up: [15, 22] };

const STAGE_FOR_GESTURE = 2; // l'arbre de la planche du geste : entaille 2/3
const stageGrids = STAGES.map((s) => stageFrame(s).toGrid());
const logGrid = normalFelledLog().toGrid();

/**
 * Les calques d'une image, posés dans un tampon (cible comprise si `target`). Vers la gauche, tout ce qui est Xéros est
 * retourné autour du milieu de la case ; la cible garde sa lumière (pas de miroir), à la place miroir.
 */
function drawGesture(b: Buf, key: GestureKey, dir: Dir4, i: number, ox: number, oy: number, target: 'tree' | 'log' | 'none', treeGrid?: Grid) {
  const frames = GESTURES[key][srcDir(dir)];
  const f = frames[i];
  const prev = frames[(i + frames.length - 1) % frames.length];
  const left = dir === 'left';
  const mx = (x: number, w: number) => (left ? ox + 31 - (x - ox) - (w - 1) : x); // miroir autour de la frame
  const put = (g: Grid, pal: Palette, x: number, y: number) => b.blit(g, pal, mx(x, g[0].length), y, left);
  const tool = toolFrame(f);
  const toolAt = (): [number, number] => [ox + f.grip[0] - tool[0].length / 2, oy + f.grip[1] - tool.length / 2];
  const trail = f.trail ? trailFrame(prev, f) : undefined;
  const d = srcDir(dir);
  const drawTarget = () => {
    if (target === 'tree') {
      const g = treeGrid ?? stageGrids[STAGE_FOR_GESTURE];
      const [tx, ty] = TREE_AT[d];
      const fx = left ? ox + 31 - tx : ox + tx;
      b.blit(g, worldPalette, fx - (FOOT[0] + OFF), oy + ty - FOOT[1]);
    } else if (target === 'log') {
      const [lx, ly] = LOG_AT[d];
      const w = logGrid[0].length;
      const x = left ? ox + 31 - lx - (w - 1) : ox + lx;
      b.blit(logGrid, worldPalette, x, oy + ly);
    }
  };
  // la cible au sud (vers le bas) passe devant Xéros ; au nord ou à la même hauteur, derrière (le fer la mord)
  const targetFront = target === 'tree' && d === 'down';
  if (target !== 'none' && !targetFront) drawTarget();
  if (f.behind) {
    if (trail) put(trail, effectPalette, ox - TRAIL_PAD, oy - TRAIL_PAD);
    put(tool, toolPalette, ...toolAt());
  }
  put(bodyFrame(d, f), xerosPalette, ox, oy);
  if (!f.behind) {
    if (trail) put(trail, effectPalette, ox - TRAIL_PAD, oy - TRAIL_PAD);
    put(tool, toolPalette, ...toolAt());
  }
  if (targetFront) drawTarget();
}

// ---------------------------------------------------------------------------------------------------------------------
// La planche
// ---------------------------------------------------------------------------------------------------------------------

const K = 4;
const LABEL_W = 200;
const BG: Rgb = [70, 76, 42];
const WHITE: Rgb = [255, 255, 255];
const GOLD: Rgb = [245, 215, 120];
const GREY: Rgb = [220, 220, 205];
const XEROS_RHYTHM = RHYTHMS['Xeros aujourd hui'];

function gestureBand(key: GestureKey): Sheet {
  const n = GESTURES[key].right.length;
  const rowH = CH * K + 56;
  const s = new Sheet(LABEL_W + n * (CW * K + 8) + 8, 90 + DIRS4.length * rowH, BG);
  const ms = frameDurations(GESTURES[key].right, XEROS_RHYTHM);
  const total = ms.reduce((a, b) => a + b, 0);
  s.text(`${GESTURE_TITLE[key]} - ${total} ms le coup (xeros aujourd hui)`, 16, 20, GOLD, 5);
  s.text('armer 650  en haut 260  abattre 290  impact 120  degager 600', 16, 58, GREY, 3);
  DIRS4.forEach((dir, r) => {
    const y = 90 + r * rowH;
    s.text(dir === 'left' ? 'gauche' : dir === 'right' ? 'droite' : dir === 'up' ? 'haut' : 'bas', 16, y + 20, WHITE, 4);
    if (dir === 'left') s.text('(miroir)', 16, y + 50, GREY, 3);
    GESTURES[key][srcDir(dir)].forEach((f: AxeFrame, i) => {
      const x = LABEL_W + i * (CW * K + 8);
      const b = grass(new Buf(CW, CH));
      drawGesture(b, key, dir, i, OX, OY, key === 'use' ? 'tree' : 'log');
      b.into(s, x, y, K);
      s.text(f.name, x + 4, y + CH * K + 8, f.beat === 'impact' ? GOLD : WHITE, 3);
      s.text(`${ms[i]} ms`, x + 4, y + CH * K + 30, GREY, 3);
    });
  });
  return s;
}

/** Colonne de l'arbre recadrée dans l'image de 192 de large : 12 px à gauche du tronc, 52 à droite (la penche). */
const SX0 = OFF + 6;
const SW = 60;
const fallSheet = normalFall[0] as SpriteSheetSource;
const fallFrames = fallSheet.animations.fall.frames;

function stagesBand(): Sheet {
  const n = STAGES.length + 1;
  const colW = SW * K + 16;
  const zoomK = 10;
  const ZX = OFF + FOOT[0] - 12;
  const ZW = 24;
  const ZY = 136;
  const ZH = 30;
  const s = new Sheet(LABEL_W + n * colW + 8, 90 + 168 * K + 60 + ZH * zoomK + 40, BG);
  s.text('abattage de l arbre normal (il tombe vers la droite) - pied agrandi x10 dessous', 16, 20, GOLD, 5);
  s.text('etapes', 16, 110, WHITE, 4);
  s.text('pied x10', 16, 90 + 168 * K + 60, WHITE, 4);
  const cols: [string, Grid][] = [...STAGES.map((st, i) => [st, stageGrids[i]] as [string, Grid]), ['chute 10 (existante)', fallFrames[1]]];
  cols.forEach(([name, g], i) => {
    const x = LABEL_W + i * colW;
    const b = grass(new Buf(SW, 168));
    b.blit(g.map((row) => row.slice(SX0, SX0 + SW)), worldPalette, 0, 0);
    b.into(s, x, 90, K);
    s.text(name, x + 4, 90 + 168 * K + 10, i === STAGES.length ? GREY : WHITE, 3);
    const z = grass(new Buf(ZW, ZH));
    z.blit(g.slice(ZY, ZY + ZH).map((row) => row.slice(ZX, ZX + ZW)), worldPalette, 0, 0);
    z.into(s, x, 90 + 168 * K + 60, zoomK);
  });
  return s;
}

function stack(sheets: Sheet[]): PNG {
  const w = Math.max(...sheets.map((s) => s.w));
  const h = sheets.reduce((a, s) => a + s.h + 8, 0);
  const out = new Sheet(w, h, [40, 44, 26]);
  let y = 0;
  for (const s of sheets) {
    for (let j = 0; j < s.h; j++) s.png.data.copy(out.png.data, ((y + j) * w) * 4, j * s.w * 4, (j + 1) * s.w * 4);
    y += s.h + 8;
  }
  return out.png;
}

// ---------------------------------------------------------------------------------------------------------------------
// La page animée
// ---------------------------------------------------------------------------------------------------------------------

/** Scène de la page : l'image de la chute (192 × 168) et une marge à gauche pour Xéros. */
const MARGIN = 48;
const SCENE_W = 192 + MARGIN;
const SCENE_H = 184;

function page(): string {
  // calques de Xéros seul (sans cible), cases transparentes de CW × CH ; et l'arbre, image par image
  const xeros: Record<string, Record<string, string[]>> = {};
  for (const key of ['use', 'chop'] as GestureKey[]) {
    xeros[key] = {};
    for (const dir of DIRS4) {
      xeros[key][dir] = GESTURES[key][srcDir(dir)].map((_, i) => {
        const b = new Buf(CW, CH);
        drawGesture(b, key, dir, i, OX, OY, 'none');
        return b.uri();
      });
    }
  }
  const beats = Object.fromEntries((['use', 'chop'] as GestureKey[]).map((k) => [k, GESTURES[k].right.map((f) => f.beat)]));
  const tree = [...stageGrids, ...fallFrames.slice(1)].map((g) => new Buf(192, 168).blit(g, worldPalette, 0, 0).uri());
  const treeNames = [...STAGES, 'chute 10', 'chute 45', 'couche'];
  const grassUri = grass(new Buf(32, 32)).uri();
  const breathSheet = breath[0] as SpriteSheetSource;
  const puffs = breathSheet.animations.puff.frames.map((g) => new Buf(10, 8).blit(g, breathPalette, 0, 0).uri());
  const logUri = new Buf(logGrid[0].length, logGrid.length).blit(logGrid, worldPalette, 0, 0).uri();
  // pied de l'arbre dans la scène, et coin de la case de Xéros pour chaque direction (pieds de la frame sur TREE_AT)
  const footX = MARGIN + OFF + FOOT[0];
  const footY = FOOT[1];
  const place = Object.fromEntries(DIRS4.map((d) => {
    const [tx, ty] = TREE_AT[srcDir(d)];
    const fx = d === 'left' ? 31 - tx : tx;
    return [d, { x: footX - fx - OX, y: footY - ty - OY, front: srcDir(d) === 'down' }];
  }));
  const logAt = Object.fromEntries(DIRS4.map((d) => {
    const [lx, ly] = LOG_AT[srcDir(d)];
    const x = d === 'left' ? 31 - lx - (logGrid[0].length - 1) : lx;
    return [d, { x: OX + x, y: OY + ly, front: false }];
  }));
  const data = {
    xeros, beats, tree, treeNames, grassUri, puffs, logUri, place, logAt,
    rhythms: RHYTHMS, breathAt: BREATH_ANCHORS, cell: { w: CW, h: CH, ox: OX, oy: OY }, scene: { w: SCENE_W, h: SCENE_H },
  };
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Essai abattage</title>
<style>
body { background: #282c1a; color: #f5d778; font: 14px monospace; margin: 16px; }
canvas { image-rendering: pixelated; display: block; background: #464c2a; }
.row { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }
label { margin-right: 12px; color: #fff; }
.info { color: #ddd; line-height: 1.6; }
b { color: #f5d778; }
</style></head><body>
<p>Essai : le coup de cognée lent et lourd, et l'abattage d'un arbre normal. Vitesse réelle du geste ; <b>l'arbre est accéléré pour l'aperçu</b> :
une étape tous les 8 coups (en vrai, Xéros abat l'arbre normal en 666 coups environ, soit une étape tous les 95 coups) ; une pause de souffle de 8 s tous les 31 coups.</p>
<p>
<label>direction <select id="dir"><option value="right">droite</option><option value="left">gauche</option><option value="down">bas</option><option value="up">haut</option></select></label>
<label>rythme <select id="rhythm"></select></label>
<button id="restart">recommencer</button>
</p>
<div class="row">
<div><canvas id="scene"></canvas><div class="info" id="stats"></div></div>
<div><p>coup de haut en bas (chop), même rythme</p><canvas id="chop"></canvas></div>
</div>
<script>
const D = ${JSON.stringify(data)};
const K = 3;
const load = (src) => { const i = new Image(); i.src = src; return i; };
const img = { xeros: {}, tree: D.tree.map(load), puffs: D.puffs.map(load), grass: load(D.grassUri), log: load(D.logUri) };
for (const k in D.xeros) { img.xeros[k] = {}; for (const d in D.xeros[k]) img.xeros[k][d] = D.xeros[k][d].map(load); }
const sel = document.getElementById('rhythm');
for (const name in D.rhythms) { const o = document.createElement('option'); o.value = name; o.textContent = name.replace('Xeros aujourd hui', 'Xéros aujourd’hui').replace('bucheron', 'bûcheron'); sel.appendChild(o); }
const scene = document.getElementById('scene');
scene.width = D.scene.w * K; scene.height = D.scene.h * K;
const chopC = document.getElementById('chop');
chopC.width = D.cell.w * K; chopC.height = D.cell.h * K;
const ctx = scene.getContext('2d'); ctx.imageSmoothingEnabled = false;
const ctx2 = chopC.getContext('2d'); ctx2.imageSmoothingEnabled = false;
const STEP = 8, BREATH_EVERY = 31, BREATH_MS = 8000, FALL_MS = 1000 / 6, END_MS = 3000;
const FALL_FROM = 8; // images de l'arbre 0..7 : les étapes ; 8..10 : la chute existante
function durations(key) {
  const r = D.rhythms[sel.value];
  const beats = D.beats[key];
  return beats.map((b) => r[b] / beats.filter((x) => x === b).length);
}
let st;
function reset() { st = { t0: performance.now(), hits: 0, frame: 0, frameT: performance.now(), breathUntil: 0, falling: -1, fallT: 0, chop: 0, chopT: performance.now(), elapsed: 0, last: performance.now() }; }
reset();
document.getElementById('restart').onclick = reset;
function grass(c, w, h) { for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) c.drawImage(img.grass, x * K, y * K, 32 * K, 32 * K); }
function treeIndex() {
  if (st.falling >= 0) return FALL_FROM + Math.min(2, st.falling);
  return Math.min(7, Math.floor(st.hits / STEP));
}
function tick(now) {
  const dt = now - st.last; st.last = now;
  const dir = document.getElementById('dir').value;
  const dur = durations('use');
  const done = st.falling >= 2;
  const breathing = now < st.breathUntil;
  if (!done && !breathing && st.falling < 0) {
    st.elapsed += dt;
    while (now - st.frameT >= dur[st.frame]) {
      st.frameT += dur[st.frame];
      st.frame = (st.frame + 1) % dur.length;
      if (D.beats.use[st.frame] === 'impact') {
        st.hits++;
        if (st.hits >= STEP * 8) { st.falling = 0; st.fallT = now; }
        else if (st.hits % BREATH_EVERY === 0) { st.breathUntil = now + BREATH_MS; st.frame = dur.length - 1; break; }
      }
    }
  } else if (breathing) { st.elapsed += dt; st.frameT = now; }
  else if (st.falling >= 0 && !done) { if (now - st.fallT >= FALL_MS) { st.falling++; st.fallT = now; } }
  else if (done && now - st.fallT > END_MS) reset();
  // la scène
  ctx.clearRect(0, 0, scene.width, scene.height);
  grass(ctx, D.scene.w, D.scene.h);
  const p = D.place[dir];
  const frame = st.falling >= 0 ? dur.length - 1 : st.frame;
  const xi = img.xeros.use[dir][frame];
  const drawTree = () => ctx.drawImage(img.tree[treeIndex()], ${MARGIN} * K, 0, 192 * K, 168 * K);
  const drawX = () => ctx.drawImage(xi, p.x * K, p.y * K, D.cell.w * K, D.cell.h * K);
  if (p.front) { drawX(); drawTree(); } else { drawTree(); drawX(); }
  if (breathing) {
    const a = D.breathAt[dir];
    const k = Math.floor(now / (1000 / 6)) % img.puffs.length;
    const fx = p.x + D.cell.ox + 16 + a.dx, fy = p.y + D.cell.oy + 48 + a.dy;
    ctx.save();
    if (a.flipX) { ctx.translate((fx + 10) * K, 0); ctx.scale(-1, 1); ctx.drawImage(img.puffs[k], 0, fy * K, 10 * K, 8 * K); }
    else ctx.drawImage(img.puffs[k], fx * K, fy * K, 10 * K, 8 * K);
    ctx.restore();
  }
  const total = dur.reduce((a, b) => a + b, 0);
  document.getElementById('stats').innerHTML =
    'coups : <b>' + st.hits + '</b> &nbsp; temps : <b>' + (st.elapsed / 1000).toFixed(1) + ' s</b> &nbsp; arbre : <b>' + D.treeNames[treeIndex()] + '</b>' +
    (breathing ? ' &nbsp; <b>souffle</b> (' + ((st.breathUntil - now) / 1000).toFixed(1) + ' s)' : '') +
    '<br>un coup : ' + Math.round(total) + ' ms (' + Object.entries(D.rhythms[sel.value]).map(([k, v]) => k + ' ' + v).join(', ') + ')';
  // le chop seul, au-dessus d'une bille
  const cd = durations('chop');
  while (now - st.chopT >= cd[st.chop]) { st.chopT += cd[st.chop]; st.chop = (st.chop + 1) % cd.length; }
  ctx2.clearRect(0, 0, chopC.width, chopC.height);
  grass(ctx2, D.cell.w, D.cell.h);
  const la = D.logAt[dir];
  const drawLog = () => ctx2.drawImage(img.log, la.x * K, la.y * K, img.log.width * K, img.log.height * K);
  const cx = () => ctx2.drawImage(img.xeros.chop[dir][st.chop], 0, 0, D.cell.w * K, D.cell.h * K);
  if (la.front) { cx(); drawLog(); } else { drawLog(); cx(); }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
</script></body></html>
`;
}

const out = join(ROOT, '.art-preview');
mkdirSync(out, { recursive: true });
const bands = [gestureBand('use'), gestureBand('chop'), stagesBand()];
bands.forEach((b, i) => writeFileSync(join(out, `essai-abattage-${i + 1}.png`), PNG.sync.write(b.png)));
writeFileSync(join(out, 'essai-abattage.png'), PNG.sync.write(stack(bands)));
writeFileSync(join(out, 'essai-abattage.html'), page());
console.log(`essai-abattage -> ${join(out, 'essai-abattage.png')}, essai-abattage.html`);
