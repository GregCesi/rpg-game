// Essai des gestes de combat (chantier « combat ») : npx tsx tools/essai-gestes.ts écrit .art-preview/essai-gestes.png.
//
// Pose les gestes de art/proposals/gestes-combat.ts (jamais chargé par le jeu), agrandis x6, pour que Grégoire choisisse avant
// toute intégration : une bande par geste (la taille, le coup vertical, le direct du droit, le direct du gauche), une rangée
// par direction (bas, haut, droite, gauche), les images dans l'ordre, chacune sur l'herbe ; sous chaque image, son nom et sa
// durée en ms (chiffres `ui-digit-<n>` de l'interface). Même calcul que le jeu (entities/ToolUse.ts, tools/lib/combat-preview.ts) :
// l'image d'angle de `weapon-wooden-sword` posée par son centre sur la main droite, pieds + (dx, dy) ; vers la gauche, l'arme,
// la traînée et l'éclat sont retournés et dx est opposé (les poses `left` sont écrites dans le repère retourné).
// Lit les sources d'art directement (pas src/generated/). Écrit aussi chaque bande à part dans .art-preview/essai-gestes-<n>.png.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { flipX, type Grid, type Palette } from '../art/lib/canvas';
import weapons from '../art/items/weapons';
import tiles from '../art/world/tiles';
import ui from '../art/ui/dialog';
import type { SpriteSheetSource } from '../art/lib/types';
import { weaponFrame } from '../src/world/strike';
import {
  bodyFrames, bodyPalette, COMBAT_GESTURES, DIRS, effectPalette, smearImages, sparkImage, type CombatFrameData, type Dir,
} from '../art/proposals/gestes-combat';
import { Sheet, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = 6;
/** Une case, en pixels du jeu : la frame de 32 × 48 posée en (OX, OY), de l'air autour pour la lame (16 px de la main). */
const CW = 60;
const CH = 74;
const OX = 14;
const OY = 20;
const LABEL_W = 260;
const BELOW = 64;
const TITLE = 70;
const BG: Rgb = [70, 76, 42];
const WHITE: Rgb = [255, 255, 255];
const GOLD: Rgb = [245, 215, 120];
const GREY: Rgb = [220, 220, 205];

const sword = weapons.find((s) => s.name === 'weapon-wooden-sword') as SpriteSheetSource;
const angles = sword.animations.angles.frames;
const grass = { grid: tiles.tiles.grass, palette: tiles.palette };
const digit = (n: number) => ui.find((s) => s.name === `ui-digit-${n}`) as { grid: Grid; palette: Palette };

const DIR_LABEL: Record<Dir, string[]> = {
  down: ['bas'],
  up: ['haut'],
  right: ['droite'],
  left: ['gauche', 'epee toujours', 'main droite', '(au fond)'],
};

/**
 * Pose une image par son centre sur le point (dx, dy) des pieds ; vers la gauche, retournée et dx opposé. (sx, sy) : le coin
 * de la frame du corps sur la planche, en pixels de la planche.
 */
function place(s: Sheet, grid: Grid, pal: Palette, sx: number, sy: number, dx: number, dy: number, left: boolean) {
  const w = grid[0].length;
  const h = grid.length;
  const g = left ? flipX(grid) : grid;
  const gx = left ? w - 1 - Math.floor(w / 2) : Math.floor(w / 2);
  const gy = Math.floor(h / 2);
  const hx = left ? 31 - (16 + dx) : 16 + dx;
  s.blit(g, pal, sx + (hx - gx) * K, sy + (48 + dy - gy) * K, K);
}

function cell(s: Sheet, x: number, y: number, body: Grid, f: CombatFrameData, left: boolean) {
  // l'herbe de la case
  for (let ty = 0; ty < CH; ty += 32) for (let tx = 0; tx < CW; tx += 32) {
    const sub = grass.grid.slice(0, Math.min(32, CH - ty)).map((r) => r.slice(0, Math.min(32, CW - tx)));
    s.blit(sub, grass.palette, x + tx * K, y + ty * K, K);
  }
  const bx = x + OX * K;
  const by = y + OY * K;
  const put = (grid: Grid, pal: Palette, dx: number, dy: number) => place(s, grid, pal, bx, by, dx, dy, left);
  const weapon = f.weapon ? angles[weaponFrame(f.weapon.angle)] : undefined;
  const smear = f.smear ? smearImages[f.smear.image] : undefined;
  if (smear && f.smear!.behind) put(smear, effectPalette, f.smear!.dx, f.smear!.dy);
  if (weapon && f.weapon!.behind) put(weapon, sword.palette, f.right.dx, f.right.dy);
  s.blit(body, bodyPalette, bx, by, K);
  if (smear && !f.smear!.behind) put(smear, effectPalette, f.smear!.dx, f.smear!.dy);
  if (weapon && !f.weapon!.behind) put(weapon, sword.palette, f.right.dx, f.right.dy);
  if (f.spark) put(sparkImage.grid, effectPalette, f.spark.dx, f.spark.dy);
}

function durationAt(s: Sheet, ms: number, x: number, y: number) {
  let cx = x;
  for (const ch of String(ms)) {
    const d = digit(Number(ch));
    s.blit(d.grid, d.palette, cx, y, 3);
    cx += (d.grid[0].length - 1) * 3;
  }
  s.text('ms', cx + 6, y + 6, GREY, 2);
}

function band(key: string): Sheet {
  const gst = COMBAT_GESTURES[key];
  const cols = Math.max(...DIRS.map((d) => gst.poses[d].length));
  const rowH = CH * K + BELOW;
  const width = LABEL_W + cols * (CW * K + 12);
  const height = TITLE + DIRS.length * rowH + 10;
  const s = new Sheet(width, height, BG);
  const total = gst.poses.down.slice(1).reduce((a, f) => a + f.ms, 0);
  s.text(`${gst.title}  -  ${total} ms de l armer au retour`, 16, 20, GOLD, 5);
  DIRS.forEach((dir, r) => {
    const y = TITLE + r * rowH;
    DIR_LABEL[dir].forEach((l, i) => s.text(l, 16, y + 20 + i * 26, i === 0 ? WHITE : GREY, i === 0 ? 4 : 3));
    gst.poses[dir].forEach((f, i) => {
      const x = LABEL_W + i * (CW * K + 12);
      cell(s, x, y, bodyFrames[key][dir][i], f, dir === 'left');
      const tag = f.name + (i === gst.impact ? ' *' : '');
      s.text(tag, x + 4, y + CH * K + 8, i === gst.impact ? GOLD : WHITE, 3);
      durationAt(s, f.ms, x + 4, y + CH * K + 30);
    });
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

const sheets = Object.keys(COMBAT_GESTURES).map(band);
const dir = join(ROOT, '.art-preview');
mkdirSync(dir, { recursive: true });
sheets.forEach((s, i) => writeFileSync(join(dir, `essai-gestes-${i + 1}.png`), PNG.sync.write(s.png)));
writeFileSync(join(dir, 'essai-gestes.png'), PNG.sync.write(stack(sheets)));
console.log(`essai-gestes : ${Object.keys(COMBAT_GESTURES).join(', ')} -> ${join(dir, 'essai-gestes.png')}`);
