// Aperçu des gestes de combat : npx tsx tools/essai-gestes.ts écrit .art-preview/essai-gestes.png et essai-gestes.html.
//
// Pose les gestes de art/characters/xeros-combat.ts, agrandis x6 : une bande par geste (la taille, le coup vertical, le direct
// du droit, le direct du gauche), une rangée par direction (bas, haut, droite, gauche), les images dans l'ordre, chacune sur
// l'herbe ; sous chaque image, son nom et sa durée en ms (chiffres `ui-digit-<n>` de l'interface). Même calcul que le jeu :
// l'image d'angle de `weapon-wooden-sword` posée par son centre sur la main droite, pieds + (dx, dy) ; vers la gauche, l'arme,
// la traînée et l'éclat sont retournés et dx est opposé (les poses `left` sont écrites dans le repère retourné ; le corps de
// l'animation `<geste>-left` est déjà retourné).
// Lit les sources d'art directement (pas src/generated/). Écrit aussi chaque bande à part dans .art-preview/essai-gestes-<n>.png,
// et .art-preview/essai-gestes.html : chaque geste joué en boucle à vitesse réelle (durée `ms` de chaque image), une ligne par
// direction, une colonne par geste, pour juger la largeur des traînées en mouvement.

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
import xeros from '../art/characters/xeros';
import {
  COMBAT_DIRS as DIRS, COMBAT_POSES, COMBAT_TITLES, combatDuration, combatEffects, effectPalette, type CombatDir as Dir,
  type CombatFrame, type CombatGesture,
} from '../art/characters/xeros-combat';
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
  left: ['gauche'],
};
/** Sous « gauche », pour les gestes à l'épée seulement. */
const SWORD_LEFT = ['epee toujours', 'main droite', '(au fond)'];

const GESTURES = Object.keys(COMBAT_POSES) as CombatGesture[];
const effect = (name: string) => (combatEffects.find((e) => e.name === name) as { grid: Grid }).grid;
const body = (key: CombatGesture, dir: Dir, i: number) => xeros.animations[`${key}-${dir}`].frames[i];

/**
 * Pose une image par son centre sur le point (dx, dy) des pieds ; vers la gauche, retournée et dx opposé. (sx, sy) : le coin
 * de la frame du corps sur la planche, en pixels de la planche.
 */
function place(s: Sheet, grid: Grid, pal: Palette, sx: number, sy: number, dx: number, dy: number, left: boolean, K: number) {
  const w = grid[0].length;
  const h = grid.length;
  const g = left ? flipX(grid) : grid;
  const gx = left ? w - 1 - Math.floor(w / 2) : Math.floor(w / 2);
  const gy = Math.floor(h / 2);
  const hx = left ? 31 - (16 + dx) : 16 + dx;
  s.blit(g, pal, sx + (hx - gx) * K, sy + (48 + dy - gy) * K, K);
}

function cell(s: Sheet, x: number, y: number, body: Grid, f: CombatFrame, left: boolean, K: number) {
  // l'herbe de la case
  for (let ty = 0; ty < CH; ty += 32) for (let tx = 0; tx < CW; tx += 32) {
    const sub = grass.grid.slice(0, Math.min(32, CH - ty)).map((r) => r.slice(0, Math.min(32, CW - tx)));
    s.blit(sub, grass.palette, x + tx * K, y + ty * K, K);
  }
  const bx = x + OX * K;
  const by = y + OY * K;
  const put = (grid: Grid, pal: Palette, dx: number, dy: number) => place(s, grid, pal, bx, by, dx, dy, left, K);
  const weapon = f.weapon ? angles[weaponFrame(f.weapon.angle)] : undefined;
  const smear = f.smear ? effect(f.smear.image) : undefined;
  if (smear && f.smear!.behind) put(smear, effectPalette, f.smear!.dx, f.smear!.dy);
  if (weapon && f.weapon!.behind) put(weapon, sword.palette, f.right.dx, f.right.dy);
  s.blit(body, xeros.palette, bx, by, K);
  if (smear && !f.smear!.behind) put(smear, effectPalette, f.smear!.dx, f.smear!.dy);
  if (weapon && !f.weapon!.behind) put(weapon, sword.palette, f.right.dx, f.right.dy);
  if (f.spark) put(effect(f.spark.image), effectPalette, f.spark.dx, f.spark.dy);
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

function band(key: CombatGesture): Sheet {
  const poses = COMBAT_POSES[key];
  const cols = Math.max(...DIRS.map((d) => poses[d].length));
  const rowH = CH * K + BELOW;
  const width = LABEL_W + cols * (CW * K + 12);
  const height = TITLE + DIRS.length * rowH + 10;
  const s = new Sheet(width, height, BG);
  s.text(`${COMBAT_TITLES[key]}  -  ${combatDuration(key)} ms garde comprise`, 16, 20, GOLD, 5);
  DIRS.forEach((dir, r) => {
    const y = TITLE + r * rowH;
    const label = dir === 'left' && poses.left.some((f) => f.weapon) ? [...DIR_LABEL[dir], ...SWORD_LEFT] : DIR_LABEL[dir];
    label.forEach((l, i) => s.text(l, 16, y + 20 + i * 26, i === 0 ? WHITE : GREY, i === 0 ? 4 : 3));
    poses[dir].forEach((f, i) => {
      const x = LABEL_W + i * (CW * K + 12);
      cell(s, x, y, body(key, dir, i), f, dir === 'left', K);
      const tag = f.name + (f.strike ? ' *' : '');
      s.text(tag, x + 4, y + CH * K + 8, f.strike ? GOLD : WHITE, 3);
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

/** Une image du geste, seule, à l'échelle 1, en data URI PNG (la page l'agrandit). */
function frameUri(key: CombatGesture, dir: Dir, i: number): string {
  const s = new Sheet(CW, CH, BG);
  cell(s, 0, 0, body(key, dir, i), COMBAT_POSES[key][dir][i], dir === 'left', 1);
  return `data:image/png;base64,${PNG.sync.write(s.png).toString('base64')}`;
}

/** La page animée : chaque geste en boucle à vitesse réelle, un court temps de garde entre deux boucles. */
function page(): string {
  const PAUSE = 400;
  const anims = GESTURES.map((key) => DIRS.map((dir) => ({
    key, dir, frames: COMBAT_POSES[key][dir].map((f, i) => ({ src: frameUri(key, dir, i), ms: f.ms })),
  })));
  const head = GESTURES.map((k) => `<th>${k}<br><small>${combatDuration(k)} ms</small></th>`).join('');
  const rows = DIRS.map((dir, r) => `<tr><th>${dir}</th>${GESTURES.map((_, c) => `<td><img data-a="${c},${r}" width="${CW * K}" height="${CH * K}"></td>`).join('')}</tr>`).join('\n');
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Gestes de combat</title>
<style>
body { background: #282c1a; color: #f5d778; font: 14px monospace; margin: 16px; }
table { border-collapse: separate; border-spacing: 8px; }
th { color: #fff; font-weight: normal; padding: 4px; }
img { image-rendering: pixelated; display: block; }
</style></head><body>
<p>Gestes de combat de Xéros, x${K}, à vitesse réelle (durée de chaque image), ${PAUSE} ms en garde entre deux boucles.</p>
<table><tr><th></th>${head}</tr>
${rows}
</table>
<script>
const ANIMS = ${JSON.stringify(anims.map((col) => col.map((a) => a.frames)))};
const PAUSE = ${PAUSE};
document.querySelectorAll('img[data-a]').forEach((img) => {
  const [c, r] = img.dataset.a.split(',').map(Number);
  const frames = ANIMS[c][r];
  let i = 0;
  const step = () => {
    img.src = frames[i].src;
    // la garde (image 0) dure en plus le temps de pause, au début de chaque boucle
    const ms = frames[i].ms + (i === 0 ? PAUSE : 0);
    i = (i + 1) % frames.length;
    setTimeout(step, ms);
  };
  step();
});
</script></body></html>
`;
}

const sheets = GESTURES.map(band);
const dir = join(ROOT, '.art-preview');
mkdirSync(dir, { recursive: true });
sheets.forEach((s, i) => writeFileSync(join(dir, `essai-gestes-${i + 1}.png`), PNG.sync.write(s.png)));
writeFileSync(join(dir, 'essai-gestes.png'), PNG.sync.write(stack(sheets)));
writeFileSync(join(dir, 'essai-gestes.html'), page());
console.log(`essai-gestes : ${GESTURES.join(', ')} -> ${join(dir, 'essai-gestes.png')}, essai-gestes.html`);
