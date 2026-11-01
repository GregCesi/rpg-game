// Test de scénario des vitesses de Xéros réglées dans ?dieu (docs/CONCEPTION.md, « Le travail », § 8), dans le vrai jeu : la marche
// réglée à 1,4 m/s fait 28 px/s (5 cm par pixel), la course à 3 m/s 60 px/s ; retenues après rechargement ; « Par défaut » revient aux
// valeurs de config.ts (les valeurs par défaut ne changent pas).
// Usage : npm run test:vitesses (lancé aussi par npm run test:scenarios).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('vitesses', async ({ page, errors, load }) => {
  // la vitesse mesurée en marchant vers l'est (ou en courant, Maj), dans un coin dégagé de la ferme
  const measure = (run: boolean) =>
    page.evaluate(async (run) => {
      const sleep = (t: number) => new Promise((r) => setTimeout(r, t));
      const g = (window as any).game;
      const w = () => g.scene.getScene('world');
      if (w().map.def.id !== 'ferme') {
        g.events.emit('dieu', { kind: 'map', map: 'ferme' });
        await sleep(2000);
      }
      g.events.emit('dieu', { kind: 'stamina-infinite', on: true });
      const m = w().map;
      let spot: number[] | undefined;
      for (let y = 80; y < m.height - 80 && !spot; y += 16) {
        for (let x = 80; x < m.width - 300 && !spot; x += 16) if (m.areaFree({ left: x - 10, right: x + 260, top: y - 12, bottom: y + 12 })) spot = [x, y];
      }
      const a = w().player.actor;
      a.body.reset(spot![0], spot![1]);
      await sleep(200);
      if (run) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', keyCode: 16 } as KeyboardEventInit));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', keyCode: 68 } as KeyboardEventInit));
      await sleep(300);
      const x0 = a.x;
      const t0 = performance.now();
      await sleep(1000);
      const v = (a.x - x0) / ((performance.now() - t0) / 1000);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', keyCode: 68 } as KeyboardEventInit));
      if (run) window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', keyCode: 16 } as KeyboardEventInit));
      await sleep(200);
      return v;
    }, run);
  const send = (c: unknown) =>
    page.evaluate(async (c) => {
      (window as any).game.events.emit('dieu', c);
      await new Promise((r) => setTimeout(r, 200));
    }, c);

  const before = await measure(false);
  await send({ kind: 'speeds', walk: 1.4, run: 3, carry: 1.1 });
  const walk = await measure(false);
  const run = await measure(true);
  await load('?dieu');
  // le jeu qui vient de démarrer rame un instant : la mesure attend qu'il tourne à son rythme
  await page.waitForTimeout(1500);
  const kept = await measure(false);
  await send({ kind: 'speeds-default' });
  const back = await measure(false);
  console.log(JSON.stringify({ before, walk, run, kept, back }));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  const near = (v: number, want: number, what: string) => assert.ok(Math.abs(v - want) < want * 0.1, `${what} : ${want} px/s attendus, ${v.toFixed(1)}`);
  near(before, 100, 'par défaut, la marche');
  near(walk, 28, 'la marche à 1,4 m/s');
  near(run, 60, 'la course à 3 m/s');
  near(kept, 28, 'retenue après rechargement');
  near(back, 100, '« Par défaut »');
  console.log('  ✓ vitesses : la marche et la course réglées en m/s dans ?dieu, retenues, et « Par défaut »');
});
