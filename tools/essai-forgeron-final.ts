// Planche du forgeron final (chantier « forgeron », essai hors jeu : rien ne change dans le jeu). Usage :
//   npx tsx tools/essai-forgeron-final.ts  →  .art-preview/forgeron-final.png
//
// Le dessin : art/proposals/forgeron-final.ts (`smithFinal(facing)`, `portraitFinal()`). Une seule planche :
//   1. les trois vues (face, profil, dos) en x4, à côté de Xéros et de la mère dans les mêmes vues, pieds alignés sur le sol ;
//   2. les mêmes en x2 ;
//   3. les mêmes en x1 sur l'herbe ;
//   4. le portrait 64 px en x3 et en x1, à côté de ceux de Xéros et de la mère ;
//   5. le forgeron dans la forge du village, dans le vrai jeu sans écran (tools/lib/playtest.ts), au zoom de départ
//      (ZOOM_STEPS.start) : de face derrière l'enclume, puis de profil à l'ouest de l'enclume, Xéros dans l'atelier ; pour chaque
//      pose, la vue entière et un recadrage autour de l'enclume. Méthode de tools/essai-forgeron-forge.ts (copiée : ce fichier
//      lance sa scène dès qu'on l'importe) : la grille convertie en texture dans la page (`textures.addCanvas`), posée comme un
//      acteur (origine au bas de la frame, au milieu ; profondeur = y du sol).

import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import { bounds, palette, portraitFinal, smithFinal, type Facing } from '../art/proposals/forgeron-final';
import { ZOOM_STEPS } from '../src/config';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';
import { playtest } from './lib/playtest';

const OUT = '.art-preview/forgeron-final.png';
const T = 2; // taille du texte
const BG: Rgb = [58, 52, 44];
const GRASS: Rgb = [123, 133, 68]; // l'herbe g
const PANEL: Rgb = [74, 66, 56];
const GOLD: Rgb = [245, 215, 120];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];
const ROSE: Rgb = [240, 140, 140];
const GAP = 20;
const PAD = 16;
const LINE = 12;
/** Le recadrage autour de l'enclume, en px du monde (autour du milieu de l'enclume), et son agrandissement. */
const CROP = { w: 96, h: 112, up: 64, k: 2 };

const FACINGS: Facing[] = ['down', 'right', 'up'];
const FACING_NAME: Record<Facing, string> = { down: 'FACE', right: 'PROFIL', up: 'DOS' };

interface Fig { grid: Grid; pal: Palette; label: string }

function frame(name: string, anim: string): Grid {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-forgeron-final : pas de planche « ${name} »`);
  const a = s.animations[anim];
  if (!a) throw new Error(`essai-forgeron-final : pas d'animation « ${anim} » dans « ${name} »`);
  return a.frames[0];
}
function pal(name: string): Palette {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-forgeron-final : pas de planche « ${name} »`);
  return s.palette;
}

/** Les trois vues du forgeron, puis celles de Xéros et de la mère. */
const figures = (labels: boolean): Fig[] => [
  ...FACINGS.map((f) => ({ grid: smithFinal(f), pal: palette, label: labels ? `FORGERON ${FACING_NAME[f]}` : '' })),
  ...FACINGS.map((f) => ({ grid: frame('xeros', `idle-${f}`), pal: pal('xeros'), label: labels ? `XEROS ${FACING_NAME[f]}` : '' })),
  ...FACINGS.map((f) => ({ grid: frame('mother', `idle-${f}`), pal: pal('mother'), label: labels ? `MERE ${FACING_NAME[f]}` : '' })),
];

/** Une grille hors ombre portée : largeur et hauteur contour compris. */
const size = (g: Grid) => { const b = bounds(g); return { w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1 }; };

interface Row { title: string; figs: Fig[]; k: number; fw: number; fh: number; ground?: boolean; bg: Rgb; gap: number }
const rows: Row[] = [
  { title: 'LES TROIS VUES (X4), A COTE DE XEROS ET DE LA MERE ; POINTILLE ROSE : LE SOL (Y=46)', figs: figures(true), k: 4, fw: 32, fh: 48, ground: true, bg: GRASS, gap: GAP },
  { title: 'LES MEMES EN X2', figs: figures(true), k: 2, fw: 32, fh: 48, ground: true, bg: GRASS, gap: GAP + 40 },
  { title: 'A LA TAILLE DU JEU (X1), SUR L\'HERBE', figs: figures(false), k: 1, fw: 32, fh: 48, bg: GRASS, gap: 4 },
  {
    title: 'LE PORTRAIT 64 PX (X3), A COTE DE XEROS ET DE LA MERE', k: 3, fw: 64, fh: 64, bg: PANEL, gap: GAP,
    figs: [{ ...portraitFinal(), label: 'LE FORGERON' }, { grid: frame('portrait-xeros-64', 'neutral'), pal: pal('portrait-xeros-64'), label: 'XEROS' }, { grid: frame('portrait-mother-64', 'neutral'), pal: pal('portrait-mother-64'), label: 'LA MERE' }],
  },
  {
    title: 'LE PORTRAIT A LA TAILLE DU JEU (X1)', k: 1, fw: 64, fh: 64, bg: PANEL, gap: GAP,
    figs: [{ ...portraitFinal(), label: '' }, { grid: frame('portrait-xeros-64', 'neutral'), pal: pal('portrait-xeros-64'), label: '' }, { grid: frame('portrait-mother-64', 'neutral'), pal: pal('portrait-mother-64'), label: '' }],
  },
];
const rowW = (r: Row) => r.figs.length * (r.fw * r.k + r.gap) - r.gap;
const rowH = (r: Row) => LINE + 8 + r.fh * r.k + (r.figs.some((f) => f.label) ? 18 : 6) + GAP;

const dims = FACINGS.map((f) => { const s = size(smithFinal(f)); return `${FACING_NAME[f]} ${s.w} X ${s.h}`; }).join(' ; ');
const xerosH = size(frame('xeros', 'idle-down')).h;
const head = [
  'LE FORGERON FINAL : CORPS ET CHEVEUX DE C (LE GEANT), TETE T1 (LE RECTANGLE), MENTON M2 (EN AVANT)',
  'ART/PROPOSALS/FORGERON-FINAL.TS : SMITHFINAL(FACING), PORTRAITFINAL() ; PROFIL ET DOS DESSINES A LA CARRURE DE C',
  `SILHOUETTES, CONTOUR COMPRIS (L X H, PX) : ${dims} ; XEROS ${xerosH} DE HAUT (1,60 M), LE FORGERON 1,95 M`,
  'FRAME 32 X 48, PIEDS A Y=45 ; COLLISION VISEE 14 X 8 PX AUX PIEDS ; BRASSARDS AUX DEUX AVANT-BRAS',
];

interface Shot { png: PNG; label: string }
interface Pose { title: string; shots: Shot[] }

/** Un morceau d'une image, agrandi k fois au plus proche voisin. */
function crop(src: PNG, x: number, y: number, w: number, h: number, k: number): PNG {
  const out = new PNG({ width: w * k, height: h * k });
  for (let j = 0; j < h * k; j++) for (let i = 0; i < w * k; i++) {
    const sx = Math.min(src.width - 1, Math.max(0, x + Math.floor(i / k)));
    const sy = Math.min(src.height - 1, Math.max(0, y + Math.floor(j / k)));
    src.data.copy(out.data, (j * w * k + i) * 4, (sy * src.width + sx) * 4, (sy * src.width + sx) * 4 + 4);
  }
  return out;
}

function paste(sheet: Sheet, img: PNG, ox: number, oy: number): void {
  for (let y = 0; y < img.height; y++) {
    const row = (oy + y) * sheet.w + ox;
    img.data.copy(sheet.png.data, row * 4, y * img.width * 4, (y + 1) * img.width * 4);
  }
}

const poses: Pose[] = [];

await playtest('essai-forgeron-final', async ({ page, errors, load }) => {
  await load('?dieu&reset');
  await page.evaluate(`window.__idle('le réveil')`);

  const W = (fn: string) => page.evaluate(fn);
  const go = (x: number, y: number) =>
    page.evaluate(([x, y]) => (window as any).game.scene.getScene('world').scene.restart({ mapId: 'village', at: { x, y, facing: 'up' } }), [x, y]);
  await go(1140, 1960);
  await W(`window.__until(() => { const w = window.game.scene.getScene('world'); return w.map?.def?.id === 'village' && !!w.player; }, 'le village')`);
  await W(`window.__idle('au village')`);
  const forge = await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const box = (b: any) => b && { x: b.image.x, y: b.image.y - b.image.height, w: b.image.width, h: b.image.height, depth: b.image.depth, gx: b.piece.x / 5, gy: b.piece.y / 5 };
    const anvil = w.map.builds.find((b: any) => b.piece.piece.prop === 'anvil');
    const block = w.map.builds.find((b: any) => b.piece.piece.prop === 'anvil-block');
    const roofs = w.map.builds.filter((b: any) => /^shingle-roof-large/.test(b.piece.piece.prop ?? '')).map((b: any) => b.piece.id);
    return { anvil: box(anvil), block: box(block), roofs };
  });
  assert.ok(forge.anvil && forge.block, 'l’enclume et son billot sont dans la forge du village');
  const anvil = forge.anvil!;
  const block = forge.block!;
  const cx = Math.round(block.x + block.w / 2);
  const south = block.depth;
  const north = Math.round(block.gy);

  // Xéros : au sud de l'enclume, à 1,5 m (30 px) du milieu du billot, tourné vers le nord, sous le toit
  const xy = { x: cx, y: Math.round(block.gy + (south - block.gy) / 2 + 30) };
  await go(xy.x, xy.y);
  await W(`window.__until(() => { const w = window.game.scene.getScene('world'); return w.map?.def?.id === 'village' && !!w.player && Math.abs(w.player.actor.y - ${xy.y}) < 2; }, 'Xéros devant l’enclume')`);
  await W(`window.__idle('devant l’enclume')`);
  await W(`window.__face('up')`);
  await page.evaluate(([roofs]) => {
    const m = (window as any).game.scene.getScene('world').map;
    const a = (id: number) => m.builds.find((q: any) => q.piece.id === id).image.alpha as number;
    return (window as any).__until(() => roofs.every((id: number) => a(id) < 0.36), 'les pans effacés (ROOF.alpha), Xéros sous le toit');
  }, [forge.roofs] as const);
  await W(`window.game.events.emit('dieu', { kind: 'clock', hour: 13 })`);
  await page.evaluate(() => {
    const canvas = (window as any).game.canvas as HTMLCanvasElement;
    for (let el: HTMLElement | null = canvas; el && el !== document.body; el = el.parentElement)
      for (const sib of Array.from(el.parentElement?.children ?? []) as HTMLElement[]) if (sib !== el) sib.style.display = 'none';
    window.dispatchEvent(new Event('resize'));
  });
  await W(`window.__frames(5)`);
  await page.evaluate(() => (window as any).game.scale.refresh());
  await W(`window.__frames(20)`);
  const canvasBox = await page.evaluate(() => {
    const r = (window as any).game.canvas.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  });
  const me = await page.evaluate(() => {
    const a = (window as any).game.scene.getScene('world').player.actor;
    return { x: a.x, y: a.y, depth: a.depth };
  });

  const place = (key: string, grid: string[], x: number, y: number) =>
    page.evaluate(([key, grid, palette, x, y]) => {
      const w = (window as any).game.scene.getScene('world');
      const tex = w.textures;
      if (!tex.exists(key)) {
        const c = document.createElement('canvas');
        c.width = grid[0].length;
        c.height = grid.length;
        const g = c.getContext('2d')!;
        grid.forEach((row: string, j: number) => [...row].forEach((ch, i) => {
          if (ch === '.') return;
          g.fillStyle = palette[ch];
          g.fillRect(i, j, 1, 1);
        }));
        tex.addCanvas(key, c);
      }
      (window as any).__smith?.destroy();
      const img = w.add.image(x, y, key).setOrigin(0.5, 1);
      img.setDepth(y);
      (window as any).__smith = img;
      return { x: img.x, y: img.y, depth: img.depth };
    }, [key, grid, palette, x, y] as const);

  const shoot = async (): Promise<Shot[]> => {
    const view = () => page.evaluate(() => {
      const g = (window as any).game;
      const cam = g.scene.getScene('world').cameras.main;
      const r = g.canvas.getBoundingClientRect();
      return { x: cam.worldView.x, y: cam.worldView.y, zoom: cam.zoom, left: r.left, top: r.top, sx: r.width / g.scale.width };
    });
    await page.evaluate((z) => (window as any).game.scene.getScene('world').cameras.main.setZoom(z), ZOOM_STEPS.start);
    await W(`window.__frames(10)`);
    const v = await view();
    const s = PNG.sync.read(await page.screenshot({ clip: canvasBox }));
    const k = v.zoom * v.sx;
    const x = Math.round(v.left - canvasBox.x + (cx - CROP.w / 2 - v.x) * k);
    const y = Math.round(v.top - canvasBox.y + (anvil.y + anvil.h - CROP.up - v.y) * k);
    return [
      { png: s, label: `ZOOM DE DEPART (X${ZOOM_STEPS.start})` },
      { png: crop(s, x, y, Math.round(CROP.w * k), Math.round(CROP.h * k), CROP.k), label: `L'ENCLUME : LA MEME CAPTURE AGRANDIE X${CROP.k}` },
    ];
  };

  // 1. de face, juste derrière l'enclume (au nord du billot)
  const p1 = await place('essai-smith-final-down', smithFinal('down'), cx, north - 1);
  assert.ok(p1.depth < block.depth && p1.depth < anvil.depth && p1.depth < me.depth, 'de face, derrière l’enclume, son billot et Xéros');
  poses.push({ title: 'DANS LA FORGE DU JEU : DE FACE, DERRIERE L\'ENCLUME (XEROS AU SUD, TOURNE VERS LE NORD)', shots: await shoot() });

  // 2. de profil, à l'ouest de l'enclume, tourné vers l'est : son devant à 2 px du bord ouest de l'enclume
  const side = smithFinal('right');
  const b = bounds(side);
  const left = Math.min(anvil.x, block.x);
  await place('essai-smith-final-right', side, left - 2 - (b.x1 - 16) - 1, Math.round(block.gy + (south - block.gy) / 2));
  poses.push({ title: 'DANS LA FORGE DU JEU : DE PROFIL, A L\'OUEST DE L\'ENCLUME, TOURNE VERS L\'EST', shots: await shoot() });
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  writeSheet(); // playtest() termine le processus en rendant la main : la planche s'écrit ici
});

// ---------- la planche ----------
function writeSheet(): void {
  const shotsW = poses.length ? PAD * 2 + poses[0].shots.reduce((a, s) => a + s.png.width, 0) + GAP * (poses[0].shots.length - 1) : 0;
  const poseH = (p: Pose) => LINE + 8 + Math.max(...p.shots.map((s) => s.png.height)) + 8 + LINE + GAP;
  const width = Math.max(PAD * 2 + Math.max(...head.map((h) => textWidth(h, T)), ...rows.map(rowW), ...rows.map((r) => textWidth(r.title, T))), shotsW);
  const height = PAD + head.length * LINE + LINE + rows.reduce((s, r) => s + rowH(r), 0) + poses.reduce((s, p) => s + poseH(p), 0);
  const sheet = new Sheet(width, height, BG);
  head.forEach((h, i) => sheet.text(h, PAD, PAD + i * LINE, i === 0 ? GOLD : GREY, T));
  let y = PAD + head.length * LINE + LINE;
  for (const r of rows) {
    sheet.text(r.title, PAD, y, GOLD, T);
    const oy = y + LINE + 8;
    const fw = r.fw * r.k, fh = r.fh * r.k;
    sheet.rect(PAD - 4, oy - 4, rowW(r) + 8, fh + 8, r.bg);
    r.figs.forEach((f, i) => {
      const ox = PAD + i * (fw + r.gap);
      sheet.blit(f.grid, f.pal, ox, oy, r.k);
      if (f.label) sheet.text(f.label, ox, oy + fh + 6, WHITE, T);
    });
    if (r.ground) for (let i = PAD - 4; i < PAD + rowW(r) + 4; i += 8) sheet.rect(i, oy + 46 * r.k, 4, 1, ROSE);
    y += rowH(r);
  }
  for (const p of poses) {
    sheet.text(p.title, PAD, y, GOLD, T);
    y += LINE + 8;
    let x = PAD;
    for (const s of p.shots) {
      paste(sheet, s.png, x, y);
      sheet.text(s.label, x, y + s.png.height + 8, GREY, T);
      x += s.png.width + GAP;
    }
    y += Math.max(...p.shots.map((s) => s.png.height)) + 8 + LINE + GAP;
  }
  mkdirSync('.art-preview', { recursive: true });
  writeFileSync(OUT, PNG.sync.write(sheet.png));
  console.log(`  ✓ ${OUT} (${width} × ${height}) ; ${dims}`);
}
