// Le forgeron dans la forge du jeu (chantier « forgeron », essai hors jeu : rien ne change dans le jeu). Usage :
//   npx tsx tools/essai-forgeron-forge.ts  →  .art-preview/forgeron-forge.png
//
// La scène est le vrai jeu, sans écran (tools/lib/playtest.ts, sur le modèle de tools/test-forge-visite.ts) : une partie neuve,
// Xéros posé directement dans l'atelier de la forge du village (le plan `forge`), au sud de l'enclume, tourné vers le nord, sous le
// toit (on attend que les pans s'effacent). Le forgeron (art/proposals/forgeron-colosse.ts, variante A, cheveux lâchés) n'existe pas
// dans le jeu : sa grille est convertie en texture dans la page (`textures.addCanvas`) et posée comme un acteur (origine au bas de
// la frame, au milieu ; profondeur = y du sol, comme src/entities/Actor.ts). Deux poses, l'une après l'autre :
//   1. de face, juste derrière l'enclume (au nord : l'enclume et son billot entre lui et nous), tourné vers le sud, comme au travail ;
//   2. de profil, à l'ouest de l'enclume, tourné vers l'est.
// Pour chaque pose : la vue entière au zoom de départ (ZOOM_STEPS.start), la vue entière en x2, et un recadrage autour de l'enclume
// pris dans la capture au zoom de départ, agrandi x2 au plus proche voisin.

import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import * as colosse from '../art/proposals/forgeron-colosse';
import { ZOOM_STEPS } from '../src/config';
import { Sheet, type Rgb } from './lib/audit-preview';
import { playtest } from './lib/playtest';

const OUT = '.art-preview/forgeron-forge.png';
const BG: Rgb = [58, 52, 44];
const GOLD: Rgb = [245, 215, 120];
const GREY: Rgb = [205, 200, 185];
const T = 3; // taille du texte
const GAP = 24;
const PAD = 20;
/** Le recadrage autour de l'enclume, en px du monde (autour du milieu de l'enclume), et son agrandissement. */
const CROP = { w: 96, h: 112, up: 64, k: 2 };

interface Shot { png: PNG; label: string }
interface Pose { title: string; shots: Shot[] }

/** Une grille de colonnes opaques (hors ombre `x`) : la première et la dernière. */
function span(grid: string[]): { x0: number; x1: number } {
  let x0 = 99, x1 = -1;
  grid.forEach((row) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === 'x') return;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
  }));
  return { x0, x1 };
}

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

await playtest('essai-forgeron-forge', async ({ page, errors, load }) => {
  await load('?dieu&reset');
  await page.evaluate(`window.__idle('le réveil')`);

  // la forge du village : l'enclume (sur son billot) et les deux pans de l'atelier
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
  console.log(`  enclume : image ${anvil.x},${anvil.y} ${anvil.w}×${anvil.h}, profondeur ${anvil.depth} ; billot : image ${block.x},${block.y} ${block.w}×${block.h}, profondeur ${block.depth}`);
  const cx = Math.round(block.x + block.w / 2); // le milieu du billot (et de l'enclume posée dessus)
  const south = block.depth; // le bord sud du billot : sa profondeur
  const north = Math.round(block.gy); // le bord nord du billot (sa place au sol)

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
  // le plein jour (13 h), et le panneau de ?dieu caché : la capture ne montre que le jeu
  await W(`window.game.events.emit('dieu', { kind: 'clock', hour: 13 })`);
  await page.evaluate(() => {
    const canvas = (window as any).game.canvas as HTMLCanvasElement;
    // le panneau (à côté de #game dans #stage) et la ligne des touches : cachés, le jeu prend toute la page
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
  console.log(`  le canevas : ${JSON.stringify(canvasBox)}`);
  const me = await page.evaluate(() => {
    const a = (window as any).game.scene.getScene('world').player.actor;
    return { x: a.x, y: a.y, depth: a.depth, facing: a.facing };
  });
  console.log(`  Xéros : ${me.x},${me.y}, profondeur ${me.depth}, ${me.facing}`);

  /** Pose (ou remplace) le forgeron dans la scène : sa grille en texture, posé comme un acteur (pieds au sol, profondeur = y). */
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
    }, [key, grid, colosse.palette, x, y] as const);

  /** Les captures d'une pose : la vue entière au zoom de départ, en x2, et le recadrage agrandi (pris au zoom de départ). */
  const shoot = async (): Promise<Shot[]> => {
    const zoom = (z: number) => page.evaluate((z) => (window as any).game.scene.getScene('world').cameras.main.setZoom(z), z);
    const view = () => page.evaluate(() => {
      const g = (window as any).game;
      const cam = g.scene.getScene('world').cameras.main;
      const r = g.canvas.getBoundingClientRect();
      return { x: cam.worldView.x, y: cam.worldView.y, zoom: cam.zoom, left: r.left, top: r.top, sx: r.width / g.scale.width, sy: r.height / g.scale.height };
    });
    await zoom(ZOOM_STEPS.start);
    await W(`window.__frames(10)`);
    const v3 = await view();
    const s3 = PNG.sync.read(await page.screenshot({ clip: canvasBox }));
    await zoom(2);
    await W(`window.__frames(10)`);
    const s2 = PNG.sync.read(await page.screenshot({ clip: canvasBox }));
    await zoom(ZOOM_STEPS.start);
    // le recadrage : autour du milieu de l'enclume, de quoi voir le forgeron entier et les pieds de Xéros
    const k3 = v3.zoom * v3.sx;
    const wx = cx - CROP.w / 2;
    const wy = anvil.y + anvil.h - CROP.up;
    const x = Math.round(v3.left - canvasBox.x + (wx - v3.x) * k3);
    const y = Math.round(v3.top - canvasBox.y + (wy - v3.y) * k3);
    const c = crop(s3, x, y, Math.round(CROP.w * k3), Math.round(CROP.h * k3), CROP.k);
    // le même recadrage sans ce qui passe au-dessus de l'enclume (les pans du toit, même effacés, et les pièces en l'air de la
    // charpente au sud : la sablière cache l'enclume dans la vue du jeu), pour juger la hauteur de l'enclume contre le forgeron
    const hidden = await page.evaluate(([depth]) => {
      const m = (window as any).game.scene.getScene('world').map;
      const over = m.builds.filter((b: any) => b.image && b.image.depth > depth && (b.piece.piece.roof || b.image.y < b.image.depth - 16));
      over.forEach((b: any) => b.image.setVisible(false));
      (window as any).__hidden = over;
      return over.length;
    }, [anvil.depth] as const);
    await W(`window.__frames(4)`);
    const bare = crop(PNG.sync.read(await page.screenshot({ clip: canvasBox })), x, y, Math.round(CROP.w * k3), Math.round(CROP.h * k3), CROP.k);
    await page.evaluate(() => (window as any).__hidden.forEach((b: any) => b.image.setVisible(true)));
    console.log(`  ${hidden} pièces cachées pour le recadrage sans toit`);
    return [
      { png: s3, label: `zoom de départ (x${ZOOM_STEPS.start})` },
      { png: s2, label: 'x2' },
      { png: c, label: `l'enclume, capture x${ZOOM_STEPS.start} agrandie x${CROP.k}` },
      { png: bare, label: 'la même, sans toit ni sablière' },
    ];
  };

  const poses: Pose[] = [];

  // 1. de face, juste derrière l'enclume (au nord du billot : sa profondeur est plus petite que celle du billot et de l'enclume)
  const face = colosse.smith('A', 'down', 'loose');
  const p1 = await place('essai-smith-down', face, cx, north - 1);
  console.log(`  forgeron de face : ${p1.x},${p1.y}, profondeur ${p1.depth}`);
  assert.ok(p1.depth < block.depth && p1.depth < anvil.depth && p1.depth < me.depth, 'de face, derrière l’enclume et son billot, et derrière Xéros');
  poses.push({ title: 'Le forgeron de face, derrière l’enclume, tourné vers le sud (Xéros au sud, tourné vers le nord)', shots: await shoot() });

  // 2. de profil, à l'ouest de l'enclume, tourné vers l'est : son devant à 2 px du bord ouest de l'enclume (la bigorne)
  const side = colosse.smith('A', 'right', 'loose');
  const s = span(side);
  const left = Math.min(anvil.x, block.x);
  const px = left - 2 - (s.x1 - 16) - 1;
  const py = Math.round(block.gy + (south - block.gy) / 2);
  const p2 = await place('essai-smith-right', side, px, py);
  console.log(`  forgeron de profil : ${p2.x},${p2.y}, profondeur ${p2.depth} ; son devant à x=${p2.x - 16 + s.x1}, l'enclume commence à x=${left}`);
  poses.push({ title: 'Le forgeron de profil, à l’ouest de l’enclume, tourné vers l’est', shots: await shoot() });
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);

  // la planche
  const head = [
    'Le forgeron (essai 3, le colosse, variante A, cheveux lâchés) dans la forge du village, dans le vrai jeu',
    `Xéros (1,60 m) au sud de l’enclume (70 × 20 × 30 cm sur son billot de 55 cm : le dessus à 85 cm), le forgeron 1,95 m`,
  ];
  const widths = poses[0].shots.map((s) => s.png.width);
  const rowH = Math.max(...poses[0].shots.map((s) => s.png.height));
  const width = PAD * 2 + widths.reduce((a, b) => a + b, 0) + GAP * (widths.length - 1);
  const lineH = 7 * T;
  const height = PAD * 2 + head.length * lineH + poses.length * (lineH + 8 + rowH + 8 + lineH + GAP);
  const sheet = new Sheet(width, height, BG);
  head.forEach((h, i) => sheet.text(h, PAD, PAD + i * lineH, i === 0 ? GOLD : GREY, T));
  let y = PAD + head.length * lineH + GAP / 2;
  for (const pose of poses) {
    sheet.text(pose.title, PAD, y, GOLD, T);
    y += lineH + 8;
    let x = PAD;
    for (const shot of pose.shots) {
      paste(sheet, shot.png, x, y);
      sheet.text(shot.label, x, y + shot.png.height + 8, GREY, T);
      x += shot.png.width + GAP;
    }
    y += rowH + 8 + lineH + GAP;
  }
  mkdirSync('.art-preview', { recursive: true });
  writeFileSync(OUT, PNG.sync.write(sheet.png));
  // ESSAI_DIR=<dossier> : chaque capture à part, pour la regarder en vraie taille
  if (process.env.ESSAI_DIR) poses.forEach((p, i) => p.shots.forEach((s, j) => writeFileSync(`${process.env.ESSAI_DIR}/pose${i + 1}-${j + 1}.png`, PNG.sync.write(s.png))));
  console.log(`  ✓ ${OUT} (${width} × ${height})`);
});
