// La cabane de bûcheron en rondins, bâtie dans le mode construction (règle de Grégoire : un bâtiment est validé quand on réussit à le
// bâtir dans le mode construction, par un scénario, uniquement avec les pièces du catalogue, puis à l'enregistrer comme plan).
// Dans le vrai jeu (tools/lib/playtest.ts), à la vraie souris et au vrai clavier, comme Grégoire : chaque pièce est prise au catalogue
// (BuildCommand), visée à la souris là où elle doit aller, posée d'un clic ; chaque assemblage posé d'un clic sur sa jonction.
//   - quatre dalles aux angles, la première assise de rondins est-ouest posée dessus ;
//   - cinq assises de rondins du normal (30 cm de bois, 40 cm contour compris), est-ouest puis nord-sud, croisés aux angles par une
//     encoche (le rondin du dessus s'enfonce de 20 cm), 20 cm de dépassement ;
//   - la porte : au sud, les rondins des cinq premières assises recoupés de part et d'autre d'une ouverture d'un mètre ; la fenêtre : à
//     l'est, le rondin de la troisième assise recoupé (60 cm) ; une dernière assise est-ouest (le linteau de la porte) ;
//   - les pignons en rondins (un rondin de 1,80 m sur chaque mur de bout), la faîtière (un rondin nord-sud encoché dans les pignons) ;
//   - la porte en planches dans son ouverture ; les deux pans de toit en planches ;
//   - la zone enregistrée comme plan : src/content/plans/cabane.json (gardé) ; .art-preview/cabane.png : la cabane finie à côté de
//     Xéros, et les couches de montage.
// Usage : npm run test:cabane.

import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { playtest } from './lib/playtest';

const PLAN_FILE = 'src/content/plans/cabane.json';

/** Un rondin du normal, rond, de cette longueur, dans ce sens. */
const log = (axis: 'ew' | 'ns', length: number) => ({ wood: { size: 'normal', length, shape: 'round', axis } });

await playtest('cabane', async ({ page, errors, load }) => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await load('?construire&dieu&reset');
  // sur la ferme, en mode construction
  await page.keyboard.press('KeyB');
  await sleep(150);
  await page.evaluate(() => (window as any).game.events.emit('dieu', { kind: 'map', map: 'ferme' }));
  await page.waitForFunction(() => (window as any).game?.scene?.getScene('world')?.map?.def.id === 'ferme' && (window as any).game.scene.getScene('world').mode === 'play', null, { timeout: 10000 });
  await sleep(400);
  await page.keyboard.press('KeyB');
  await sleep(150);
  const notices: string[] = [];
  await page.exposeFunction('noticed', (t: string) => notices.push(t));
  await page.evaluate(() => (window as any).game.events.on('notice', (t: string) => (window as any).noticed(t)));

  // l'origine (coin nord-ouest de la cabane, en cm, sur la grille) : un coin dégagé de 5 × 6 m, loin de Xéros
  const O = await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const m = w.map;
    const px = w.player.actor;
    for (let y = 100; y < m.height - 140; y += 8) for (let x = 40; x < m.width - 140; x += 8) {
      if (Math.hypot(x + 40 - px.x, y + 40 - px.y) > 140 && m.areaFree({ left: x - 16, top: y - 80, right: x + 112, bottom: y + 120 })) {
        w.cameras.main.setZoom(2);
        w.cameras.main.centerOn(x + 40, y + 20);
        return { x: Math.round((x * 5) / 20) * 20, y: Math.round((y * 5) / 20) * 20 };
      }
    }
    return undefined;
  });
  assert.ok(O, 'un coin dégagé sur la ferme');
  await sleep(300);

  /** Le point de la page d'un point du monde (px). */
  const screen = (x: number, y: number) =>
    page.evaluate(([x, y]) => {
      const g = (window as any).game;
      const cam = g.scene.getScene('world').cameras.main;
      const rect = g.canvas.getBoundingClientRect();
      return { x: rect.left + (x - cam.worldView.x) * cam.zoom * (rect.width / g.scale.width), y: rect.top + (y - cam.worldView.y) * cam.zoom * (rect.height / g.scale.height) };
    }, [x, y] as const);
  const click = async (x: number, y: number) => {
    const s = await screen(x, y);
    await page.mouse.move(s.x, s.y);
    await sleep(60);
    await page.mouse.click(s.x, s.y);
    await sleep(110);
  };
  const send = (cmd: object) => page.evaluate((c) => (window as any).game.events.emit('build', c), cmd);
  const pieces = () => page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').map.builds.map((b: any) => b.piece))));
  const joints = () => page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').map.changes.joints)));

  /**
   * Pose une pièce (déjà prise au catalogue) pour que son emprise ait ce coin nord-ouest (cm, depuis O) : la souris vise le milieu de
   * l'emprise vu à la hauteur où elle se posera (le plus haut dessus sous elle, comme le fantôme), puis clic gauche. Renvoie la pièce.
   */
  const put = async (what: string, x: number, y: number, w: number, d: number, z?: number) => {
    const S = await page.evaluate(async ([x, y, w, d]) => {
      const url = '/src/world/build.ts';
      const b = await import(url);
      const m = (window as any).game.scene.getScene('world').map;
      return b.supportAt(m.builds.map((q: any) => q.piece).filter((q: any) => !('prop' in q.piece && q.piece.prop === 'plank-roof')), { x, y, w, d });
    }, [O!.x + x, O!.y + y, w, d] as const);
    const before = (await pieces()).length;
    await click((O!.x + x + w / 2) / 5, (O!.y + y + d / 2 - S) / 5);
    const list = await pieces();
    assert.equal(list.length, before + 1, `${what} : posée (${notices.at(-1) ?? ''})`);
    const p = list.at(-1);
    assert.deepEqual([p.x - O!.x, p.y - O!.y], [x, y], `${what} : à sa place`);
    if (z !== undefined) assert.equal(p.z, z, `${what} : à ${z} cm`);
    return p;
  };
  /** Pose un rondin (pris au catalogue avec ses réglages). */
  const putLog = async (what: string, axis: 'ew' | 'ns', length: number, x: number, y: number, z: number) => {
    await send({ kind: 'pick', piece: log(axis, length) });
    return put(what, x, y, axis === 'ew' ? length : 40, axis === 'ew' ? 40 : length, z);
  };
  /** L'assemblage `type` posé d'un clic sur la jonction de deux pièces, là où on la voit. */
  const joint = async (type: string, a: any, b: any) => {
    await send({ kind: 'pick-joint', joint: type });
    const pt = await page.evaluate(async ([ia, ib]) => {
      const url = '/src/world/joints.ts';
      const J = await import(url);
      const m = (window as any).game.scene.getScene('world').map;
      const ps = m.builds.map((q: any) => q.piece);
      const j = J.junctions(ps, (q: any) => m.shownOffset(q)).find((q: any) => (q.a.id === ia && q.b.id === ib) || (q.a.id === ib && q.b.id === ia));
      return j && { x: j.x, y: j.y };
    }, [a.id, b.id] as const);
    assert.ok(pt, `${type} : une jonction entre ${a.id} et ${b.id}`);
    const n = (await joints()).length;
    await click(pt!.x, pt!.y);
    assert.equal((await joints()).length, n + 1, `${type} entre ${a.id} et ${b.id} : posé (${notices.at(-1) ?? ''})`);
  };
  const zOf = async (p: any) => (await pieces()).find((q: any) => q.id === p.id).z;

  // les couches de montage : une capture par étape, cadrée sur la cabane, Xéros à côté
  const shots: { name: string; png: PNG }[] = [];
  const frame = async (name: string) => {
    await send({ kind: 'none' });
    await page.mouse.move(5, 5);
    await sleep(200);
    const box = await page.evaluate(([ox, oy]) => {
      const g = (window as any).game;
      const w = g.scene.getScene('world');
      // Xéros à l'est de la cabane, tourné vers le sud
      w.player.actor.body.reset(Math.round((ox + 470) / 5), Math.round((oy + 300) / 5));
      w.player.actor.face('down');
      const cam = w.cameras.main;
      // de près pour la capture (zoom 3), centré sur la cabane ; la visée reprend le zoom 2 après
      cam.setZoom(3);
      cam.centerOn((ox + 260) / 5, (oy + 20) / 5);
      cam.preRender();
      const rect = g.canvas.getBoundingClientRect();
      const k = cam.zoom * (rect.width / g.scale.width);
      const at = (x: number, y: number) => ({ x: rect.left + (x - cam.worldView.x) * k, y: rect.top + (y - cam.worldView.y) * k });
      const a = at((ox - 40) / 5, (oy - 460) / 5);
      const b = at((ox + 560) / 5, (oy + 520) / 5);
      return { x: Math.max(0, Math.round(a.x)), y: Math.max(0, Math.round(a.y)), w: Math.round(b.x - a.x), h: Math.round(b.y - a.y) };
    }, [O!.x, O!.y] as const);
    await sleep(250);
    const buf = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: Math.min(box.h, 720 - box.y) } });
    shots.push({ name, png: PNG.sync.read(buf) });
    await page.evaluate(([ox, oy]) => {
      const cam = (window as any).game.scene.getScene('world').cameras.main;
      cam.setZoom(2);
      cam.centerOn((ox + 200) / 5, (oy + 100) / 5);
    }, [O!.x, O!.y] as const);
    await sleep(150);
  };

  // 1. les dalles aux quatre angles, sous les croisements
  for (const [x, y] of [[20, 20], [320, 20], [20, 380], [320, 380]]) {
    await send({ kind: 'pick', piece: { prop: 'slab' }, natural: { form: 0, size: 100 } });
    await put(`dalle ${x},${y}`, x, y, 45, 40, 0);
  }
  await frame('les dalles');

  // 2. les cinq assises : est-ouest (au nord, au sud : recoupé à la porte), puis nord-sud (à l'ouest, à l'est : recoupé à la fenêtre)
  const EW = (k: number) => 12 + 40 * k;
  const NS = (k: number) => 32 + 40 * k;
  let west: any;
  let east: any[] = [];
  for (let k = 0; k < 5; k++) {
    const pre = k === 0 ? EW(0) : NS(k - 1) + 40;
    const north = await putLog(`rondin nord ${k}`, 'ew', 380, 0, 20, pre);
    const southL = await putLog(`rondin sud ${k} (ouest de la porte)`, 'ew', 140, 0, 380, pre);
    const southR = await putLog(`rondin sud ${k} (est de la porte)`, 'ew', 140, 240, 380, pre);
    if (k > 0) {
      // l'encoche : chaque rondin est-ouest s'enfonce dans les nord-sud de l'assise d'en dessous
      await joint('notch', north, west);
      await joint('notch', north, east[0]);
      await joint('notch', southL, west);
      await joint('notch', southR, east.at(-1));
      for (const p of [north, southL, southR]) assert.equal(await zOf(p), EW(k), `assise ${k} est-ouest : enfoncée à ${EW(k)} cm`);
    }
    west = await putLog(`rondin ouest ${k}`, 'ns', 440, 20, 0, EW(k) + 40);
    // la fenêtre, à l'est, dans la troisième assise : deux rondins de part et d'autre d'une ouverture de 60 cm
    east = k === 2 ? [await putLog('rondin est 2 (nord de la fenêtre)', 'ns', 180, 320, 0, EW(k) + 40), await putLog('rondin est 2 (sud de la fenêtre)', 'ns', 200, 320, 240, EW(k) + 40)] : [await putLog(`rondin est ${k}`, 'ns', 440, 320, 0, EW(k) + 40)];
    await joint('notch', west, north);
    await joint('notch', west, southL);
    await joint('notch', east[0], north);
    await joint('notch', east.at(-1), southR);
    assert.equal(await zOf(west), NS(k), `assise ${k} nord-sud : enfoncée à ${NS(k)} cm`);
    if (k === 0) await frame('la première assise');
    if (k === 2) await frame('trois assises, la fenêtre');
  }
  // la porte en planches dans son ouverture, avant le linteau qui passe au-dessus (la visée prendrait le dessus du linteau)
  await send({ kind: 'pick', piece: { prop: 'plank-door' } });
  await put('porte', 140, 400, 100, 6, 0);
  // la dernière assise est-ouest, pleine : le linteau de la porte
  const topN = await putLog('rondin nord 5', 'ew', 380, 0, 20, NS(4) + 40);
  const topS = await putLog('rondin sud 5 (linteau)', 'ew', 380, 0, 380, NS(4) + 40);
  for (const p of [topN, topS]) {
    await joint('notch', p, west);
    await joint('notch', p, east[0]);
    assert.equal(await zOf(p), EW(5), 'la dernière assise enfoncée');
  }
  await frame('les murs, la porte, la fenêtre');

  // 3. les pignons (un rondin de 1,80 m sur chaque mur de bout) et la faîtière encochée dedans
  const gableN = await putLog('pignon nord', 'ew', 180, 100, 20, EW(5) + 40);
  const gableS = await putLog('pignon sud', 'ew', 180, 100, 380, EW(5) + 40);
  // sur la grille de 20 cm : la faîtière à 1,80 m du bord ouest (le milieu exact, 1,70 m, n'y est pas)
  const ridge = await putLog('faîtière', 'ns', 440, 180, 0, EW(5) + 80);
  await joint('notch', ridge, gableN);
  await joint('notch', ridge, gableS);
  assert.equal(await zOf(ridge), EW(5) + 60, 'la faîtière encochée dans les pignons');
  await frame('les pignons et la faîtière');

  // 4. les deux pans de toit (côté bas à l'ouest : r1 ; à l'est : r3), posés sur le rondin de rive
  await send({ kind: 'pick', piece: { prop: 'plank-roof' } });
  await page.keyboard.press('KeyR');
  await sleep(100);
  const panW = await put('pan ouest', 0, -20, 200, 480);
  await send({ kind: 'pick', piece: { prop: 'plank-roof' } });
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('KeyR');
    await sleep(80);
  }
  const panE = await put('pan est', 180, -20, 200, 480);
  for (const p of [panW, panE]) assert.equal(p.z, EW(5) + 40, 'un pan sur le rondin de rive (2,52 m)');
  assert.deepEqual([panW.view, panE.view], [1, 3]);
  await frame('la cabane finie');

  // 5. enregistrée comme plan : la zone de toute la cabane
  await send({ kind: 'select' });
  const a = await screen((O!.x - 40) / 5, (O!.y - 40) / 5);
  const b = await screen((O!.x + 420) / 5, (O!.y + 480) / 5);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await sleep(150);
  await send({ kind: 'save-plan', name: 'Cabane' });
  for (let i = 0; i < 50 && !existsSync(PLAN_FILE); i++) await sleep(100);
  assert.ok(existsSync(PLAN_FILE), 'la cabane est enregistrée dans src/content/plans/cabane.json');
  const plan = JSON.parse(readFileSync(PLAN_FILE, 'utf8'));
  const all = await pieces();
  assert.equal(plan.pieces.length, all.length, 'toutes les pièces sont dans le plan');
  assert.equal(plan.joints.length, (await joints()).length, 'et tous les assemblages');
  // seulement des pièces du catalogue : des rondins du normal, des dalles, la porte, les pans
  for (const p of plan.pieces) assert.ok(('wood' in p.piece && p.piece.wood.size === 'normal') || ['slab', 'plank-door', 'plank-roof'].includes(p.piece.prop), JSON.stringify(p.piece));

  // .art-preview/cabane.png : les couches de montage côte à côte, la cabane finie (avec Xéros) en dernier
  const H = Math.max(...shots.map((s) => s.png.height)) + 4;
  const W = shots.reduce((s, x) => s + x.png.width + 4, 4);
  const out = new PNG({ width: W, height: H });
  out.data.fill(0x14);
  let x = 4;
  for (const s of shots) {
    PNG.bitblt(s.png, out, 0, 0, s.png.width, s.png.height, x, 2);
    x += s.png.width + 4;
  }
  writeFileSync('.art-preview/cabane.png', PNG.sync.write(out));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  console.log(`  ✓ cabane : ${all.length} pièces, ${(await joints()).length} assemblages, enregistrée dans ${PLAN_FILE} ; .art-preview/cabane.png`);
});
