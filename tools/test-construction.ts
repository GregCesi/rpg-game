// Test de scénario du mode construction (le bac à sable), dans le vrai jeu (voir tools/lib/playtest.ts), à la vraie souris et au
// vrai clavier : ?construire ouvre le mode ; sur la ferme, on pose une dalle, un poteau debout dessus (sa base sur le dessus de la
// dalle, 12 cm), une sablière sur la tête du poteau (12 + 180 = 192 cm) ; retirer le poteau est refusé (il porte la sablière) ;
// Ctrl+Z ôte la sablière, Ctrl+Y la remet ; la zone choisie à la souris s'enregistre comme plan (écrit par le serveur Vite dans
// src/content/plans/, effacé à la fin) ; le plan se repose ailleurs d'un coup, aux mêmes hauteurs ; la page rechargée retrouve
// les pièces ; ce qui est posé sous 2 m bloque ; un cran (T) monte de 20 cm ; un morceau de solin se pose. Puis le solin en tronçons :
// trois morceaux taillés bout à bout ne font qu'un dessin, sans contour aux jonctions ; un morceau nord-sud aimanté sous le bout
// ouest forme un angle ; retirer le morceau du milieu coupe le tronçon en deux.
// Usage : npm run test:construction (lancé aussi par npm run test). CONSTRUCTION_SHOTS=1 : captures dans .art-preview/.

import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { playtest } from './lib/playtest';

const PLAN_FILE = 'src/content/plans/essai-de-construction.json';

await playtest('construction', async ({ page, errors, load }) => {
  const shots = !!process.env.CONSTRUCTION_SHOTS;
  // la capture se fait de près (zoom 5, centrée sur le coin choisi), puis la caméra revient comme elle était
  let center = { x: 0, y: 0 };
  const shot = async (name: string) => {
    if (!shots) return;
    const before = await page.evaluate(([x, y]) => {
      const cam = (window as any).game.scene.getScene('world').cameras.main;
      const was = { zoom: cam.zoom, sx: cam.scrollX, sy: cam.scrollY };
      cam.setZoom(5);
      cam.centerOn(x, y);
      return was;
    }, [center.x, center.y] as const);
    await sleep(120);
    await page.screenshot({ path: `.art-preview/construction-${name}.png` });
    await page.evaluate((w) => {
      const cam = (window as any).game.scene.getScene('world').cameras.main;
      cam.setZoom(w.zoom);
      cam.setScroll(w.sx, w.sy);
    }, before);
    await sleep(120);
  };
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  rmSync(PLAN_FILE, { force: true });
  try {
    await load('?construire&dieu&reset');
    const mode = () => page.evaluate(() => (window as any).game.scene.getScene('world').mode);
    assert.equal(await mode(), 'build', '?construire ouvre le mode construction');

    // sur la ferme : on sort du mode (B), on change de carte par le panneau ?dieu, on y rentre (B)
    await page.keyboard.press('KeyB');
    await sleep(150);
    assert.equal(await mode(), 'play', 'B sort du mode');
    await page.evaluate(() => (window as any).game.events.emit('dieu', { kind: 'map', map: 'ferme' }));
    await page.waitForFunction(() => (window as any).game?.scene?.getScene('world')?.map?.def.id === 'ferme' && (window as any).game.scene.getScene('world').mode === 'play', null, { timeout: 10000 });
    await sleep(400);
    await page.keyboard.press('KeyB');
    await sleep(150);
    assert.equal(await mode(), 'build', 'B rentre dans le mode');

    // un coin dégagé de la ferme, loin de Xéros, la caméra centrée dessus
    const spot = await page.evaluate(() => {
      const w = (window as any).game.scene.getScene('world');
      const m = w.map;
      const free = (l: number, t: number, r: number, b: number) => m.areaFree({ left: l, top: t, right: r, bottom: b });
      const px = w.player.actor;
      for (let y = 120; y < m.height - 120; y += 8) {
        for (let x = 80; x < m.width - 200; x += 8) {
          if (Math.hypot(x - px.x, y - px.y) > 80 && free(x - 40, y - 80, x + 160, y + 40)) {
            w.cameras.main.centerOn(x + 40, y - 20);
            return { x, y };
          }
        }
      }
      return undefined;
    });
    assert.ok(spot, 'un coin dégagé sur la ferme');
    await sleep(300);

    /** Le point de la page d'un point du monde (px), par la caméra du monde et l'échelle du canevas. */
    const screen = (x: number, y: number) =>
      page.evaluate(([x, y]) => {
        const g = (window as any).game;
        const cam = g.scene.getScene('world').cameras.main;
        const rect = g.canvas.getBoundingClientRect();
        const sx = rect.width / g.scale.width;
        const sy = rect.height / g.scale.height;
        return { x: rect.left + (x - cam.worldView.x) * cam.zoom * sx, y: rect.top + (y - cam.worldView.y) * cam.zoom * sy };
      }, [x, y] as const);
    const click = async (x: number, y: number, button: 'left' | 'right' = 'left') => {
      const s = await screen(x, y);
      await page.mouse.move(s.x, s.y);
      await sleep(80);
      await page.mouse.click(s.x, s.y, { button });
      await sleep(150);
    };
    const send = (cmd: object) => page.evaluate((c) => (window as any).game.events.emit('build', c), cmd);
    const pieces = () => page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').map.builds.map((b: any) => b.piece))));
    const listen = () =>
      page.evaluate(() => {
        const list: string[] = [];
        (window as any).notices = list;
        (window as any).game.events.on('notice', (t: string) => list.push(t));
      });
    const lastNotice = () => page.evaluate(() => (window as any).notices.at(-1));
    await listen();

    const post = { size: 'normal', length: 180, shape: 'round', hewn: 12, axis: 'up' };
    const plate = { size: 'normal', length: 200, shape: 'round', hewn: 12, axis: 'ew' };
    const { x, y } = spot!;
    center = { x: x + 60, y: y - 10 };

    // 1. une dalle au sol
    await send({ kind: 'pick', piece: { prop: 'slab' }, natural: { form: 0, size: 100 } });
    await click(x, y);
    let list = await pieces();
    assert.equal(list.length, 1, 'la dalle est posée');
    assert.equal(list[0].z, 0);
    const slab = list[0];

    // 2. un poteau debout, visé sur la dalle : sa base sur le dessus de la dalle (12 cm)
    await send({ kind: 'pick', piece: { wood: post } });
    await click(x, y - 12 / 5);
    list = await pieces();
    assert.equal(list.length, 2, 'le poteau est posé');
    assert.equal(list[1].z, 12, 'le poteau repose sur la dalle (12 cm)');
    await shot('1-poteau');

    // 3. une sablière, visée sur la tête du poteau : sa base à 12 + 180 = 192 cm
    await send({ kind: 'pick', piece: { wood: plate } });
    await click(x, y - 192 / 5);
    list = await pieces();
    assert.equal(list.length, 3, 'la sablière est posée');
    assert.equal(list[2].z, 192, 'la sablière repose sur la tête du poteau (192 cm)');
    await shot('2-sabliere');

    // 4. retirer le poteau (clic droit sur son fût) : refusé, il porte la sablière
    await send({ kind: 'none' });
    await click(x, y - (12 + 90) / 5, 'right');
    assert.equal((await pieces()).length, 3, 'le poteau est resté');
    assert.match(String(await lastNotice()), /porte quelque chose/);

    // 5. Ctrl+Z ôte la sablière, Ctrl+Y la remet (même identifiant)
    const plateId = list[2].id;
    await page.keyboard.press('Control+KeyZ');
    await sleep(150);
    assert.equal((await pieces()).length, 2, 'Ctrl+Z ôte la sablière');
    await page.keyboard.press('Control+KeyY');
    await sleep(150);
    list = await pieces();
    assert.equal(list.length, 3, 'Ctrl+Y remet la sablière');
    assert.equal(list.find((p: any) => p.z === 192)?.id, plateId);

    // 6. la zone choisie à la souris (glisser), enregistrée comme plan
    await send({ kind: 'select' });
    const a = await screen(x - 30, y - 50);
    const b = await screen(x + 30, y + 20);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 4 });
    await page.mouse.up();
    await sleep(150);
    await send({ kind: 'save-plan', name: 'Essai de construction' });
    for (let i = 0; i < 50 && !existsSync(PLAN_FILE); i++) await sleep(100);
    assert.ok(existsSync(PLAN_FILE), 'le plan est écrit dans src/content/plans/');
    const plan = JSON.parse(readFileSync(PLAN_FILE, 'utf8'));
    assert.equal(plan.name, 'Essai de construction');
    assert.deepEqual(plan.pieces.map((p: any) => p.z), [0, 12, 192]);
    await sleep(800);
    assert.equal(await mode(), 'build', "le plan reçu à chaud ne recharge pas la page");

    // 7. le plan reposé d'un coup, plus à l'est : les mêmes pièces aux mêmes hauteurs et aux mêmes écarts
    await send({ kind: 'pick-plan', plan: 'essai-de-construction' });
    await click(x + 70, y - 10);
    list = await pieces();
    assert.equal(list.length, 6, 'le plan pose ses trois pièces');
    const again = list.slice(3);
    assert.deepEqual(again.map((p: any) => p.z), [0, 12, 192]);
    const rel = (ps: any[]) => {
      const ox = Math.min(...ps.map((p) => p.x));
      const oy = Math.min(...ps.map((p) => p.y));
      return ps.map((p) => [p.x - ox, p.y - oy, p.z]).sort();
    };
    assert.deepEqual(rel(again), rel(list.slice(0, 3)));
    assert.ok(again[0].x > slab.x, 'le plan est posé ailleurs');
    await shot('3-plan');

    // 8. un morceau de solin (élément calculé, tiré au hasard), et un cran plus haut (T : 20 cm), posés plus au sud
    await send({ kind: 'pick', piece: { prop: 'rough-sill-wall' } });
    await click(x + 40, y + 50);
    const sill = (await pieces()).at(-1);
    assert.equal(sill.piece.prop, 'rough-sill-wall');
    assert.ok(sill.variant >= 0 && sill.variant < 8, 'le solin a son tirage');
    await send({ kind: 'pick', piece: { wood: plate } });
    await page.keyboard.press('KeyT');
    await sleep(120);
    await click(x + 160, y + 50);
    const raised = (await pieces()).at(-1);
    assert.equal(raised.z, 20, 'un cran : 20 cm au-dessus du sol');
    await shot('4-solin');

    // 9. la page rechargée : tout est là, sur la ferme, en mode construction
    await sleep(300);
    await load('?construire');
    await page.waitForFunction(() => (window as any).game?.scene?.getScene('world')?.map?.def.id === 'ferme', null, { timeout: 10000 });
    await sleep(300);
    const reloaded = await pieces();
    assert.equal(reloaded.length, 8, 'la page rechargée retrouve les huit pièces');
    assert.deepEqual(reloaded.map((p: any) => p.z), [0, 12, 192, 0, 12, 192, 0, 20]);
    assert.equal(reloaded[6].variant, sill.variant, 'le solin garde son tirage');
    assert.equal(await mode(), 'build');

    // 10. en jeu : ce qui a une collision et est posé sous 2 m bloque (poteaux, sablières à 192 cm, solin, poutre à 20 cm) ; la
    // dalle, sans collision dans props.json, se marche comme en jeu
    const blocking = await page.evaluate(() => (window as any).game.scene.getScene('world').map.builds.filter((b: any) => b.zone).map((b: any) => b.piece.id));
    assert.equal(blocking.length, 6);
    // 11. le solin en tronçons : trois morceaux taillés bout à bout = un tronçon, un seul dessin, sans contour aux jonctions ; un
    // morceau nord-sud sous le bout ouest = un angle ; le morceau du milieu retiré coupe le tronçon en deux
    await listen();
    const spot2 = await page.evaluate(() => {
      const w = (window as any).game.scene.getScene('world');
      const m = w.map;
      const clear = (l: number, t: number, r: number, b: number) =>
        m.areaFree({ left: l, top: t, right: r, bottom: b }) && !m.builds.some((q: any) => q.image.x < r && q.image.x + q.image.width > l && q.image.y - q.image.height < b && q.image.y > t);
      for (let y = 100; y < m.height - 120; y += 8) for (let x = 60; x < m.width - 160; x += 8) if (clear(x - 20, y - 40, x + 120, y + 80)) {
        w.cameras.main.centerOn(x + 48, y + 20);
        return { x, y };
      }
      return undefined;
    });
    assert.ok(spot2, 'un second coin dégagé');
    await sleep(300);
    center = { x: spot2!.x + 48, y: spot2!.y + 20 };
    const before = (await pieces()).length;
    await send({ kind: 'pick', piece: { prop: 'dressed-sill-wall' } });
    for (const dx of [16, 48, 80]) await click(spot2!.x + dx, spot2!.y);
    const sills = (await pieces()).slice(before);
    assert.equal(sills.length, 3, 'trois morceaux posés');
    assert.deepEqual(sills.map((p: any) => p.x - sills[0].x), [0, 160, 320], 'bout à bout');
    assert.ok(sills.every((p: any) => p.y === sills[0].y), 'alignés');
    const runsOf = () =>
      page.evaluate(async () => {
        const url = '/src/world/wallRuns.ts';
        const mod = await import(url);
        const w = (window as any).game.scene.getScene('world');
        return mod.wallRuns(w.map.builds.map((b: any) => b.piece)).filter((r: any) => r.kind === 'dressed').map((r: any) => ({ axis: r.axis, ids: r.pieces.map((p: any) => p.id), start: r.start, end: r.end }));
      });
    let runs = await runsOf();
    assert.equal(runs.length, 1, 'un tronçon');
    assert.deepEqual([runs[0].ids.length, runs[0].start, runs[0].end], [3, 'head', 'head']);
    // un seul dessin : les trois morceaux montrent la même texture, chacun sa part ; aux jonctions, pas de colonne de contour
    const look = await page.evaluate(async (ids) => {
      const url = '/src/generated/wallStones.ts';
      const { wallPalette } = await import(url);
      const w = (window as any).game.scene.getScene('world');
      const bs = ids.map((id: number) => w.map.builds.find((b: any) => b.piece.id === id));
      const key = bs[0].image.texture.key;
      const src = w.textures.get(key).getSourceImage();
      const ctx = src.getContext('2d');
      const hex = (x: number, y: number) => { const d = ctx.getImageData(x, y, 1, 1).data; return d[3] ? '#' + [d[0], d[1], d[2]].map((v: number) => v.toString(16).padStart(2, '0')).join('') : ''; };
      const outline = String(wallPalette.o ?? '').slice(0, 7);
      // la colonne de chaque jonction, sur la face (les 8 rangées au-dessus de l'ombre) : combien de pixels du contour sombre
      const faceRows = Array.from({ length: 8 }, (_, i) => src.height - 2 - i);
      const joints = [32, 64].map((x) => faceRows.filter((y) => hex(x, y) === outline).length);
      const ends = [0, src.width - 2].map((x) => faceRows.filter((y) => hex(x, y) === outline).length);
      return { keys: bs.map((b: any) => b.image.texture.key), crops: bs.map((b: any) => b.crop), joints, ends, outline };
    }, runs[0].ids);
    assert.equal(new Set(look.keys).size, 1, 'un seul dessin pour le tronçon');
    assert.deepEqual(look.crops.map((c: any) => c.x), [0, 32, 64], 'chaque morceau montre sa part');
    for (const j of look.joints) assert.ok(j < 6, `pas de trait de contour à la jonction (${look.joints})`);
    await shot('5-troncon');
    // l'angle : un morceau tourné nord-sud (R), visé sous le carré ouest, s'aimante contre le tronçon
    await page.keyboard.press('KeyR');
    await sleep(100);
    const west = sills[0];
    await click((west.x + 25) / 5, (west.y + 50 + 80) / 5);
    const ns = (await pieces()).at(-1);
    assert.equal(ns.view, 1, 'tourné nord-sud');
    assert.deepEqual([ns.x, ns.y], [west.x, west.y + 50], "aimanté sous le carré d'angle");
    runs = await runsOf();
    const ewRun = runs.find((r: any) => r.axis === 'ew');
    const nsRun = runs.find((r: any) => r.axis === 'ns');
    assert.deepEqual([ewRun?.start, nsRun?.start], ['corner-s', 'abut'], "un angle se forme");
    await shot('6-angle');
    // le morceau du milieu retiré (clic droit sur sa face) : deux tronçons
    await send({ kind: 'none' });
    await click((sills[1].x + 80) / 5, (sills[1].y + 50) / 5 - 3, 'right');
    runs = (await runsOf()).filter((r: any) => r.axis === 'ew');
    assert.equal(runs.length, 2, 'le tronçon est coupé en deux');
    assert.deepEqual(runs.map((r: any) => r.ids.length).sort(), [1, 1]);

    await page.keyboard.press('KeyB');
    await sleep(150);
    assert.equal(await mode(), 'play', 'B rend le jeu');
    assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
    console.log('  ✓ construction : dalle, poteau à 12 cm, sablière à 192 cm, refus, annuler, refaire, plan écrit et reposé, solin, cran, rechargé ; tronçon de trois sans contour intérieur, angle, coupure');
  } finally {
    rmSync(PLAN_FILE, { force: true });
  }
});
