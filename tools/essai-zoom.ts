// Essai du zoom par crans d'un quart de palier (chantier « correctifs »), dans le vrai jeu : la même vue de la ferme à chaque cran, de
// ZOOM_STEPS.min à ZOOM_STEPS.max, à l'arrêt puis en marche (deux images de suite, la caméra qui glisse : un pixel qui change de largeur
// d'une image à l'autre scintille). Planche .art-preview/zoom-crans-x<RENDER>.png : chaque capture recadrée au milieu (Xéros), agrandie ×2 sans
// lissage pour juger les pixels (la planche porte la définition du canevas : zoom-crans-x<RENDER>.png). Mesure aussi le temps moyen d'une image à chaque cran.
// Usage : npx tsx tools/essai-zoom.ts

import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { RENDER, ZOOM_STEPS } from '../src/config';
import { playtest } from './lib/playtest';

await playtest(
  'essai-zoom',
  async ({ page, load }) => {
    await load('?dieu&reset');
    await page.evaluate(() => (window as any).__restart({ kind: 'map', map: 'ferme' }));
    await page.evaluate(() => (window as any).__idle());
    const W = 240;
    const H = 160;
    const shots: PNG[][] = [];
    const times: string[] = [];
    for (let z = ZOOM_STEPS.min; z <= ZOOM_STEPS.max + 1e-9; z += ZOOM_STEPS.step) {
      await page.evaluate(([zz, k]) => (window as any).game.scene.getScene('world').cameras.main.setZoom(zz * k), [z, RENDER] as const);
      await page.evaluate(() => (window as any).__frames(4));
      const row: PNG[] = [];
      // le canevas lui-même, à sa pleine définition (une capture de la page le réduirait à la taille de la fenêtre)
      const grab = async () => {
        const url: string = await page.evaluate(
          ([w, h]) => {
            const g = (window as any).game;
            return new Promise((done) => g.renderer.snapshotArea((g.canvas.width - w) / 2, (g.canvas.height - h) / 2, w, h, (img: HTMLImageElement) => done(img.src)));
          },
          [W * RENDER, H * RENDER] as const,
        );
        return PNG.sync.read(Buffer.from(url.split(',')[1], 'base64'));
      };
      row.push(await grab());
      // en marche vers l'est : deux images de suite
      await page.keyboard.down('KeyD');
      await page.evaluate(() => (window as any).__frames(20));
      row.push(await grab());
      await page.evaluate(() => (window as any).__frames(1));
      row.push(await grab());
      const ms = await page.evaluate(async () => {
        const g = (window as any).game;
        const t0 = performance.now();
        const f0 = g.loop.frame;
        await (window as any).__frames(60);
        return (performance.now() - t0) / (g.loop.frame - f0);
      });
      await page.keyboard.up('KeyD');
      // revenir à la même place
      await page.keyboard.down('KeyA');
      await page.evaluate(() => (window as any).__frames(21));
      await page.keyboard.up('KeyA');
      await page.evaluate(() => (window as any).__idle());
      times.push(`${z.toFixed(2)} : ${ms.toFixed(1)} ms/image`);
      shots.push(row);
    }
    // agrandie pour que la planche ait la même taille quelle que soit la définition du canevas
    const S = 2 / RENDER;
    const CW = W * RENDER;
    const CH = H * RENDER;
    const gap = 6;
    const cols = 3;
    const out = new PNG({ width: cols * (CW * S + gap) + gap, height: shots.length * (CH * S + gap) + gap });
    out.data.fill(30);
    shots.forEach((row, r) =>
      row.forEach((png, c) => {
        for (let y = 0; y < CH * S; y++) {
          for (let x = 0; x < CW * S; x++) {
            const si = ((Math.floor(y / S) * CW + Math.floor(x / S)) << 2) >>> 0;
            const di = (((gap + r * (CH * S + gap) + y) * out.width + gap + c * (CW * S + gap) + x) << 2) >>> 0;
            for (let k = 0; k < 4; k++) out.data[di + k] = png.data[si + k];
          }
        }
      }),
    );
    writeFileSync(`.art-preview/zoom-crans-x${RENDER}.png`, PNG.sync.write(out));
    console.log(`  ✓ essai du zoom : ${shots.length} crans, ${`.art-preview/zoom-crans-x${RENDER}.png`} (canevas ×${RENDER} ; à l'arrêt, puis deux images de suite en marche)\n    ${times.join('\n    ')}`);
  },
  { speed: 1 },
);
