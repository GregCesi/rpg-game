// Le relief dans le vrai jeu (chantier « relief », CONCEPTION « Le relief »), au vrai clavier, depuis une partie neuve :
//   - Xéros va de la ferme au plateau par le chemin creux (de la case 63 à la case 6), puis revient ; à aucun moment il n'a d'eau sous les
//     pieds ;
//   - dans le chemin creux, il ne monte pas sur les gradins, ni au nord ni au sud : « Trop haute pour lui (1,25 m). » (la marche de
//     1,25 m, CADRAGE 13.0) ;
//   - il est refusé sur le flanc de la masse de terre et au bord du plateau, avec « Trop haute pour lui (5 m). » ;
//   - il est refusé au bord de la rivière et au bord de l'étang, avec « Il ne sait pas nager. » ;
//   - sur des marches d'essai (posées pour le test dans le relief de la carte, sur un pré libre) : il monte 50 cm, ne monte pas 1 m,
//     saute 1 m pour descendre et refuse 1,2 m, avec la hauteur dans le refus.
// Mise en place : Xéros est posé au départ de chaque essai (la scène, comme un point d'arrivée) ; ensuite il ne fait que marcher.
// Usage : npm run test:relief.

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

const T = 32;

await playtest('relief', async ({ page, load }) => {
  await load('?dieu&reset');
  await page.evaluate(() => (window as any).game.events.emit('dieu', { kind: 'stamina-infinite', on: true }));
  await page.evaluate(() => (window as any).__restart({ kind: 'map', map: 'ferme' }));
  await page.evaluate(() => {
    const list: string[] = [];
    (window as any).notices = list;
    (window as any).game.events.on('notice', (t: string) => list.push(t));
  });

  /** Pose Xéros en (x, y) de la carte (mise en place d'un essai). */
  const place = (x: number, y: number) =>
    page.evaluate(
      async ({ x, y }) => {
        const w = (window as any).game.scene.getScene('world');
        w.player.actor.body.reset(x, y);
        w.footing.last = undefined;
        (window as any).notices.length = 0;
        await (window as any).__frames(3);
      },
      { x, y },
    );

  /**
   * Marche en tenant la touche `code` jusqu'à ce que `stop` (une condition sur ses pieds) soit vraie, ou qu'il ne bouge plus pendant
   * 20 pas de la physique (il est arrêté) ; rend ses pieds, le dernier refus dit, et s'il a eu de l'eau sous les pieds en route.
   */
  const walk = (code: string, stop: string) =>
    page.evaluate(
      async ({ code, stop }) => {
        const g = (window as any).game;
        // les modules du jeu servis par Vite (dans la page)
        const relief = await import(/* @vite-ignore */ String('/src/world/relief.ts'));
        const w = g.scene.getScene('world');
        const a = w.player.actor;
        const done = new Function('x', 'y', `return ${stop};`) as (x: number, y: number) => boolean;
        const pw = w.physics.world;
        let still = 0;
        let last = { x: a.x, y: a.y };
        let wet = false;
        let steps = 0;
        await new Promise<void>((resolve) => {
          const tick = () => {
            steps++;
            if (relief.deepAt(w.map.def, a.x, a.y - 3)) wet = true;
            if (a.x === last.x && a.y === last.y) still++;
            else still = 0;
            last = { x: a.x, y: a.y };
            if (done(a.x, a.y) || still > 20 || steps > 60000) {
              pw.off('worldstep', tick);
              resolve();
            }
          };
          pw.on('worldstep', tick);
          window.dispatchEvent(new KeyboardEvent('keydown', { code }));
        });
        window.dispatchEvent(new KeyboardEvent('keyup', { code }));
        await (window as any).__frames(2);
        const said = [...(window as any).notices] as string[];
        return { x: a.x, y: a.y, said, notice: said.find((t) => /pour lui|nager/.test(t)), wet, lift: w.lifts.liftAt(a.x, a.y - 3) as number };
      },
      { code, stop },
    );

  // 1. de la ferme au plateau par le chemin creux, puis retour
  await place(63 * T, 66 * T);
  let r = await walk('KeyA', `x < ${6 * T}`);
  assert.ok(r.x < 6.5 * T, `il traverse le chemin creux jusqu'au plateau (arrêté en ${Math.round(r.x)}, ${Math.round(r.y)} : ${r.notice})`);
  assert.ok(Math.abs(r.lift - 100) <= 3, `en haut, sur le plateau, à 5 m (soulevé de ${r.lift} px)`);
  assert.ok(!r.wet, "jamais d'eau sous ses pieds dans le couloir");
  r = await walk('KeyD', `x > ${61 * T}`);
  assert.ok(r.x > 61 * T, `il revient à la ferme (arrêté en ${Math.round(r.x)}, ${Math.round(r.y)} : ${r.notice})`);
  assert.ok(!r.wet, "jamais d'eau sous ses pieds au retour");

  // 2. les gradins : du chemin, il ne monte ni au nord ni au sud (la marche de 1,25 m), le chemin creux reste le seul passage
  for (const [code, far] of [
    ['KeyW', `y < ${60 * T}`],
    ['KeyS', `y > ${72 * T}`],
  ] as const) {
    await place(52 * T, 65.9 * T);
    r = await walk(code, far);
    assert.ok(r.y > 64.5 * T && r.y < 67.5 * T, `les gradins l'arrêtent (${code} : ${Math.round(r.x)}, ${Math.round(r.y)})`);
    assert.ok(Math.abs(r.lift) <= 1, `il reste sur le chemin (soulevé de ${r.lift} px ; ${code} : ${JSON.stringify(r)})`);
    assert.equal(r.notice, 'Trop haute pour lui (1,25 m).', `le refus aux gradins dit la hauteur de la marche (${code} : ${JSON.stringify(r)})`);
  }

  // 3. le flanc de la masse, le bord du plateau
  await place(47.4 * T, 57 * T);
  r = await walk('KeyS', `y > ${66 * T}`);
  assert.ok(r.y < 61 * T, `le flanc nord de la masse l'arrête (${Math.round(r.y)})`);
  assert.equal(r.notice, 'Trop haute pour lui (5 m).', `le refus au flanc dit la hauteur (${JSON.stringify(r)})`);
  await place(39 * T, 30 * T);
  r = await walk('KeyD', `x > ${44 * T}`);
  assert.ok(r.x < 42.5 * T, `le bord du plateau l'arrête (${Math.round(r.x)})`);
  assert.equal(r.notice, 'Trop haute pour lui (5 m).', 'le refus au bord du plateau dit la hauteur');

  // 4. la rivière, l'étang
  await place(52 * T, 40 * T);
  r = await walk('KeyA', `x < ${40 * T}`);
  assert.ok(r.x > 46 * T, `la rivière l'arrête (${Math.round(r.x)})`);
  assert.equal(r.notice, 'Il ne sait pas nager.');
  await place(89 * T, 47 * T);
  r = await walk('KeyA', `x < ${78 * T}`);
  assert.ok(r.x > 85 * T, `l'étang l'arrête (${Math.round(r.x)})`);
  assert.equal(r.notice, 'Il ne sait pas nager.');

  // 5. les marches d'essai : 50 cm, 1 m, 1,2 m, posées dans le relief de la carte sur un pré libre, puis la carte rechargée
  const site = await page.evaluate(async () => {
    const content = await import(/* @vite-ignore */ String('/src/content/index.ts'));
    const w = (window as any).game.scene.getScene('world');
    const m = w.map;
    // un pré libre de 14 × 4 m, sans eau ni objet, à l'est de la rivière
    for (let y = 30 * 32; y < 110 * 32; y += 32)
      for (let x = 60 * 32; x < 110 * 32; x += 32) {
        if (m.areaFree({ left: x, top: y - 48, right: x + 420, bottom: y + 48 })) {
          const rect = (x0: number, x1: number) => [{ x: x0, y: y - 48 }, { x: x1, y: y - 48 }, { x: x1, y: y + 48 }, { x: x0, y: y + 48 }];
          const def = content.maps.ferme;
          const relief = def.relief!;
          (content.maps as any).ferme = {
            ...def,
            relief: { ...relief, levels: [...relief.levels, { id: 9001, height: 50, points: rect(x + 64, x + 128) }, { id: 9002, height: 100, points: rect(x + 192, x + 256) }, { id: 9003, height: 120, points: rect(x + 320, x + 384) }] },
          };
          return { x, y };
        }
      }
    return undefined;
  });
  assert.ok(site, 'un pré libre pour les marches d’essai');
  await page.evaluate(() => (window as any).__restart({ kind: 'map', map: 'ferme' }));
  await page.evaluate(() => {
    const list: string[] = [];
    (window as any).notices = list;
    (window as any).game.events.on('notice', (t: string) => list.push(t));
  });
  const { x: X, y: Y } = site!;
  await place(X + 32, Y);
  r = await walk('KeyD', `x > ${X + 300}`);
  assert.ok(r.x > X + 140 && r.x < X + 192, `il monte 50 cm, redescend, et la marche de 1 m l'arrête (${Math.round(r.x - X)})`);
  assert.equal(r.notice, 'Trop haute pour lui (1 m).');
  await place(X + 224, Y);
  r = await walk('KeyD', `x > ${X + 400}`);
  assert.ok(r.x > X + 260 && r.x < X + 320, `il saute 1 m pour descendre, la marche de 1,2 m l'arrête (${Math.round(r.x - X)})`);
  assert.equal(r.notice, 'Trop haute pour lui (1,2 m).');
  await place(X + 352, Y);
  r = await walk('KeyA', `x < ${X + 280}`);
  assert.ok(r.x > X + 316, `il ne saute pas de 1,2 m (${Math.round(r.x - X)})`);
  assert.equal(r.notice, 'Trop haute pour lui (1,2 m).');
  console.log('  ✓ relief : le chemin creux aller et retour sans eau, les gradins (1,25 m), la falaise et la masse (5 m), la rivière et l’étang, les marches de 50 cm, 1 m, 1,2 m');
});
