// Les intérieurs (chantier « intérieurs », CONCEPTION « Les intérieurs »), dans le vrai jeu (tools/lib/playtest.ts) : pour la cabane,
// puis pour la grange, posées d'un clic par leur plan du mode construction sur la ferme :
//   - hors du mode, Xéros devant la porte fermée : on ne passe pas ; E l'ouvre (elle pivote hors du passage) ;
//   - il marche dans l'ouverture : la scène passe à l'intérieur (carte `interieur:ferme:<x>,<y>`), et la pièce a la taille que donne le
//     plan entre les faces intérieures des murs (cabane 2,60 × 3,20 m, grange 8,80 × 6 m) ;
//   - la cabane : le volet de la fenêtre, fermé, ne fait pas de tache de lumière ; E de dedans l'ouvre, la tache paraît ;
//   - en mode construction dedans, un tabouret posé au milieu de la pièce (GameState, sous l'identifiant de l'intérieur) ;
//   - il ressort par la porte (dehors, devant elle), rentre : le tabouret est là.
// .art-preview/interieurs.png : chaque bâtiment dehors, puis dedans, à côté de Xéros (moins de 1 500 px de haut).
// Usage : npm run test:interieur.

import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { playtest } from './lib/playtest';

/** Hauteur maximale de l'aperçu. */
const MAX_H = 1500;

await playtest('intérieurs', async ({ page, errors, load }) => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await load('?construire&dieu&reset');
  await page.keyboard.press('KeyB');
  await sleep(150);
  await page.evaluate(() => (window as any).game.events.emit('dieu', { kind: 'map', map: 'ferme' }));
  const world = () => page.evaluate(() => {
    const w = (window as any).game?.scene?.getScene('world');
    return { id: w?.map?.def.id as string, mode: w?.mode as string };
  });
  const until = async (ok: (w: { id: string; mode: string }) => boolean, ms = 10000) => {
    const t = Date.now();
    while (Date.now() - t < ms) {
      if (ok(await world())) return;
      await sleep(80);
    }
    throw new Error(`attente trop longue (${JSON.stringify(await world())})`);
  };
  await until((w) => w.id === 'ferme' && w.mode === 'play');
  await sleep(400);
  const notices: string[] = [];
  await page.exposeFunction('noticed', (t: string) => notices.push(t));
  await page.evaluate(() => (window as any).game.events.on('notice', (t: string) => (window as any).noticed(t)));
  const send = (cmd: object) => page.evaluate((c) => (window as any).game.events.emit('build', c), cmd);
  const mapId = async () => (await world()).id;

  // une place dégagée de la ferme, assez grande pour la grange et ses portes ouvertes, loin de Xéros (px, coin nord-ouest)
  const free = await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const m = w.map;
    const px = w.player.actor;
    for (let y = 40; y < m.height - 190; y += 4) for (let x = 20; x < m.width - 220; x += 4) {
      if (Math.hypot(x + 105 - px.x, y + 90 - px.y) > 160 && m.areaFree({ left: x, top: y, right: x + 210, bottom: y + 186 })) return { x, y };
    }
    return undefined;
  });
  assert.ok(free, 'une place dégagée sur la ferme');

  /** Le point de la page d'un point du monde (px). */
  const screen = (x: number, y: number) =>
    page.evaluate(([x, y]) => {
      const g = (window as any).game;
      const cam = g.scene.getScene('world').cameras.main;
      cam.preRender();
      const rect = g.canvas.getBoundingClientRect();
      return { x: rect.left + (x - cam.worldView.x) * cam.zoom * (rect.width / g.scale.width), y: rect.top + (y - cam.worldView.y) * cam.zoom * (rect.height / g.scale.height) };
    }, [x, y] as const);
  const click = async (x: number, y: number) => {
    const s = await screen(x, y);
    await page.mouse.move(s.x, s.y);
    await sleep(80);
    await page.mouse.click(s.x, s.y);
    await sleep(150);
  };
  /** Capture du canevas (`zoom` pixels par pixel du jeu), cadrée sur un rectangle du monde (px), la caméra arrêtée. */
  const capture = async (x0: number, y0: number, x1: number, y1: number, zoom: number): Promise<PNG> => {
    await page.mouse.move(2, 2);
    await page.evaluate(([x0, y0, x1, y1, z]) => {
      // sans l'interface (les mains, les messages) : le monde seul
      (window as any).game.scene.getScene('hud').cameras.main.setVisible(false);
      const cam = (window as any).game.scene.getScene('world').cameras.main;
      cam.stopFollow();
      cam.setZoom(z);
      cam.centerOn((x0 + x1) / 2, (y0 + y1) / 2);
    }, [x0, y0, x1, y1, zoom] as const);
    await sleep(500);
    const url: string = await page.evaluate(([x0, y0, x1, y1]) => {
      const g = (window as any).game;
      const cam = g.scene.getScene('world').cameras.main;
      cam.preRender();
      const k = cam.zoom * (g.canvas.width / g.scale.width) * (g.scale.width / cam.width);
      const sx = Math.max(0, Math.round((x0 - cam.worldView.x) * k));
      const sy = Math.max(0, Math.round((y0 - cam.worldView.y) * k));
      const sw = Math.min(g.canvas.width - sx, Math.round((x1 - x0) * k));
      const sh = Math.min(g.canvas.height - sy, Math.round((y1 - y0) * k));
      return new Promise((done) => g.renderer.snapshotArea(sx, sy, sw, sh, (img: HTMLImageElement) => done(img.src)));
    }, [x0, y0, x1, y1] as const);
    // la caméra reprend Xéros
    await page.evaluate(() => {
      (window as any).game.scene.getScene('hud').cameras.main.setVisible(true);
      const w = (window as any).game.scene.getScene('world');
      w.cameras.main.setZoom(2);
      w.cameras.main.startFollow(w.player.actor, true, 1, 1);
    });
    return PNG.sync.read(Buffer.from(url.split(',')[1], 'base64'));
  };
  /** Xéros posé là (pieds, px), tourné. */
  const stand = async (x: number, y: number, facing: string) => {
    await page.evaluate(([x, y, f]) => {
      const w = (window as any).game.scene.getScene('world');
      w.player.actor.body.reset(x, y);
      w.player.actor.face(f);
    }, [x, y, facing] as const);
    await sleep(120);
  };
  /**
   * Marche dans une direction jusqu'à ce que la carte soit `to` (son nom, ou le début de son nom avec `*` : `interieur:*`), puis
   * attend la fin du fondu. L'attente suit l'état du jeu (`waitForFunction` sur la carte), pas une durée : un jeu ralenti par d'autres
   * scénarios y arrive simplement plus tard.
   */
  const walkTo = async (key: string, to: string) => {
    await page.keyboard.down(key);
    await page.waitForFunction(
      (want) => {
        const id = (window as any).game.scene.getScene('world')?.map?.def?.id ?? '';
        return want.endsWith('*') ? id.startsWith(want.slice(0, -1)) : id === want;
      },
      to,
      { timeout: 0, polling: 'raf' },
    );
    await page.keyboard.up(key);
    await page.waitForFunction(() => (window as any).game.scene.getScene('world')?.mode === 'play', null, { timeout: 0, polling: 'raf' });
    await sleep(300);
  };
  /** Marche `ms` millisecondes dans une direction (la porte fermée : on vérifie ensuite qu'on n'est pas entré), puis s'arrête. */
  const walkFor = async (key: string, ms: number) => {
    await page.keyboard.down(key);
    await sleep(ms);
    await page.keyboard.up(key);
    await until((w) => w.mode === 'play');
    await sleep(300);
  };
  const lights = () => page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').interiorLights)));
  /** Les pièces posées de la carte qui ne sont pas au bâtiment (les meubles d'un intérieur). */
  const furniture = () => page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').map.builds.filter((q: any) => !q.fixed).map((q: any) => q.piece))));

  const rows: PNG[][] = [];

  for (const b of [
    { plan: 'cabane', door: 'plank-door', room: { w: 260, d: 320 }, window: true, zoom: 3, top: 420 },
    { plan: 'grange', door: 'cart-door', room: { w: 880, d: 600 }, window: false, zoom: 2, top: 660 },
  ]) {
    // 1. le plan posé d'un clic, en mode construction, au milieu de la place dégagée (la carte remise à zéro avant la grange)
    if (b.plan !== 'cabane') {
      await page.evaluate(() => (window as any).__restart({ kind: 'reset-map' }));
    }
    await page.keyboard.press('KeyB');
    await sleep(150);
    const before = (await page.evaluate(() => (window as any).game.scene.getScene('world').map.builds.length)) as number;
    await page.evaluate(([x, y]) => {
      const cam = (window as any).game.scene.getScene('world').cameras.main;
      cam.setZoom(2);
      cam.centerOn(x, y);
    }, [free!.x + 105, free!.y + 80] as const);
    await sleep(200);
    await send({ kind: 'pick-plan', plan: b.plan });
    await click(free!.x + 105, free!.y + 80);
    const after = (await page.evaluate(() => (window as any).game.scene.getScene('world').map.builds.length)) as number;
    assert.ok(after > before, `${b.plan} : le plan est posé (${notices.at(-1) ?? ''})`);
    await send({ kind: 'none' });
    await page.keyboard.press('KeyB');
    await until((w) => w.mode === 'play');

    // 2. le bâtiment : une entrée, fermée ; devant la porte, on ne passe pas ; E l'ouvre
    // celui qu'on vient de poser (la ferme a déjà la cabane du chasseur, posée depuis son plan : chantier « monde »)
    const area: { x0: number; x1: number; y0: number; y1: number } = { x0: (free!.x - 20) * 5, x1: (free!.x + 230) * 5, y0: (free!.y - 20) * 5, y1: (free!.y + 210) * 5 };
    const mine = (x: number, y: number): boolean => x >= area.x0 && x <= area.x1 && y >= area.y0 && y <= area.y1;
    const building: any[] = ((await page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').interiors.buildings())))) as any[]).filter((q) => mine(q.room.x, q.room.y));
    assert.equal(building.length, 1, `${b.plan} : un bâtiment où l'on entre`);
    const entrance = building[0].entrances[0];
    assert.equal(entrance.open, false, `${b.plan} : la porte est fermée`);
    const outside = { x: Math.round(entrance.outside.x / 5), y: Math.round(entrance.outside.y / 5) };
    await stand(outside.x, outside.y, 'up');
    await walkFor('KeyW', 900);
    assert.equal(await mapId(), 'ferme', `${b.plan} : porte fermée, on n'entre pas`);
    await stand(outside.x, outside.y, 'up');
    await page.keyboard.press('KeyE');
    await sleep(300);
    const door = ((await page.evaluate((k) => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').map.builds.map((q: any) => q.piece).filter((q: any) => 'prop' in q.piece && q.piece.prop.startsWith(k)))), b.door)) as any[]).find((q) => mine(q.x, q.y));
    assert.equal(door.piece.prop, `${b.door}-open`, `${b.plan} : E ouvre la porte (${notices.at(-1) ?? ''})`);
    // dehors : le bâtiment, la porte ouverte, Xéros à côté
    const room = building[0].room;
    await stand(Math.round((room.x + room.w + 210) / 5), Math.round((room.y + room.d + 60) / 5), 'down');
    await sleep(1200);
    const outShot = await capture((room.x - 100) / 5, (room.y - b.top) / 5, (room.x + room.w + 260) / 5, (room.y + room.d + 200) / 5, b.zoom);

    // 3. on entre : la carte de l'intérieur, la pièce du plan
    await stand(outside.x, outside.y, 'up');
    await walkTo('KeyW', 'interieur:*');
    const inside = await mapId();
    assert.match(inside, /^interieur:ferme:/, `${b.plan} : on entre`);
    const interior = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').interior)));
    assert.deepEqual([interior.room.w, interior.room.d], [b.room.w, b.room.d], `${b.plan} : la pièce a la taille du plan`);
    const view = await page.evaluate(() => {
      const m = (window as any).game.scene.getScene('world').map;
      return { w: m.room.w / 5, d: m.room.d / 5 };
    });
    assert.deepEqual([view.w, view.d], [b.room.w / 5, b.room.d / 5], `${b.plan} : la vue a la taille du plan (px)`);
    assert.ok((await lights()).some((l: any) => l.kind === 'door'), `${b.plan} : la porte ouverte fait entrer le jour`);

    // 4. la fenêtre : fermée, pénombre ; E de dedans, le volet s'ouvre et la lumière entre
    if (b.window) {
      assert.ok(!(await lights()).some((l: any) => l.kind === 'window'), 'volet fermé : pas de tache de lumière');
      const win = interior.windows[0];
      assert.ok(win, 'la cabane a une fenêtre');
      assert.equal(win.side, 'east');
      await stand(Math.round((interior.room.x + interior.room.w - 25) / 5), Math.round((win.span[0] + win.span[1]) / 10), 'right');
      await page.keyboard.press('KeyE');
      await sleep(300);
      assert.ok((await lights()).some((l: any) => l.kind === 'window'), `volet ouvert : la tache de lumière (${notices.at(-1) ?? ''})`);
    }

    // 5. un tabouret posé au milieu de la pièce, en mode construction
    const mid = { x: (interior.room.x + interior.room.w / 2) / 5, y: (interior.room.y + interior.room.d / 2) / 5 };
    await stand(Math.round((interior.room.x + 40) / 5), Math.round((interior.room.y + interior.room.d - 40) / 5), 'up');
    await page.keyboard.press('KeyB');
    await sleep(150);
    await page.evaluate(([x, y]) => (window as any).game.scene.getScene('world').cameras.main.centerOn(x, y), [mid.x, mid.y] as const);
    await sleep(150);
    await send({ kind: 'pick', piece: { prop: 'stool' } });
    await click(mid.x, mid.y);
    const put = await furniture();
    assert.equal(put.length, 1, `${b.plan} : le tabouret est posé (${notices.at(-1) ?? ''})`);
    assert.equal(put[0].piece.prop, 'stool');
    const saved = await page.evaluate(() => (window as any).game.scene.getScene('world').map.changes.builds.length);
    assert.equal(saved, 1, `${b.plan} : le tabouret est rangé dans GameState sous l'intérieur`);
    await send({ kind: 'none' });
    await page.keyboard.press('KeyB');
    await until((w) => w.mode === 'play');
    // dedans : la pièce, Xéros à côté du tabouret
    await stand(Math.round(mid.x + 14), Math.round(mid.y + 6), 'down');
    const r = interior.room;
    const inShot = await capture((r.x - 100) / 5, (r.y - b.top) / 5, (r.x + r.w + 100) / 5, (r.y + r.d + 200) / 5, b.zoom);
    rows.push([outShot, inShot]);

    // 6. on ressort (dehors, devant la porte), on rentre : le tabouret est là
    const exit = interior.exits[0];
    const out = async () => {
      await stand(Math.round((exit.zone.x + exit.zone.w / 2) / 5), Math.round((exit.zone.y - 30) / 5), 'down');
      await walkTo('KeyS', 'ferme');
    };
    await out();
    assert.equal(await mapId(), 'ferme', `${b.plan} : on ressort`);
    const back = await page.evaluate(() => {
      const a = (window as any).game.scene.getScene('world').player.actor;
      return { x: a.x, y: a.y };
    });
    assert.ok(Math.abs(back.x - outside.x) <= 3 && Math.abs(back.y - outside.y) <= 3, `${b.plan} : dehors, devant la porte (${back.x}, ${back.y} ; attendu ${outside.x}, ${outside.y})`);
    await stand(outside.x, outside.y, 'up');
    await walkTo('KeyW', 'interieur:*');
    assert.equal(await mapId(), inside, `${b.plan} : on rentre dans le même intérieur`);
    assert.deepEqual(await furniture(), put, `${b.plan} : le tabouret est retrouvé`);
    await out();
    console.log(`  ✓ ${b.plan} : pièce de ${b.room.w} × ${b.room.d} cm, entrée, sortie, tabouret retrouvé${b.window ? ', le volet éclaire' : ''}`);
  }

  // .art-preview/interieurs.png : une rangée par bâtiment, dehors puis dedans
  const gap = 6;
  const W = Math.max(...rows.map((r) => r.reduce((s, p) => s + p.width + gap, gap)));
  const H = rows.reduce((s, r) => s + Math.max(...r.map((p) => p.height)) + gap, gap);
  assert.ok(H <= MAX_H, `interieurs.png : ${H} px de haut, ${MAX_H} au plus`);
  const png = new PNG({ width: W, height: H });
  png.data.fill(0x14);
  let y = gap;
  for (const r of rows) {
    let x = gap;
    for (const p of r) {
      PNG.bitblt(p, png, 0, 0, p.width, p.height, x, y);
      x += p.width + gap;
    }
    y += Math.max(...r.map((p) => p.height)) + gap;
  }
  writeFileSync('.art-preview/interieurs.png', PNG.sync.write(png));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  console.log(`  ✓ intérieurs : .art-preview/interieurs.png (${W} × ${H})`);
});
