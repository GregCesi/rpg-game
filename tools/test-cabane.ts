// La cabane de bûcheron en rondins, bâtie dans le mode construction (règle de Grégoire : un bâtiment est validé quand on réussit à le
// bâtir dans le mode construction, par un scénario, uniquement avec les pièces du catalogue, puis à l'enregistrer comme plan).
// Dans le vrai jeu (tools/lib/playtest.ts), à la vraie souris et au vrai clavier, comme Grégoire : chaque pièce est prise au catalogue
// (BuildCommand), visée à la souris là où elle doit aller, posée d'un clic ; chaque assemblage posé d'un clic sur sa jonction.
//   - quatre dalles aux angles, la première assise de rondins est-ouest posée dessus ; deux dalles en seuil, dans l'ouverture de la
//     porte ;
//   - le bois patiné (l'âge réglé au catalogue, fixé par le plan) ;
//   - cinq assises de rondins écorcés du normal (30 cm de bois, 40 cm contour compris), est-ouest puis nord-sud, croisés aux angles par une
//     encoche (le rondin du dessus s'enfonce de 20 cm), 20 cm de dépassement ;
//   - la porte : au sud, les rondins des cinq premières assises recoupés de part et d'autre d'une ouverture d'un mètre ; la fenêtre : à
//     l'est, le rondin de la troisième assise recoupé (60 cm), et son volet en planches ; une dernière assise est-ouest (le linteau de
//     la porte) ;
//   - les pignons en planches fendues (un sur chaque mur de bout), la faîtière (un rondin nord-sud posé sur leurs sommets) ;
//   - la porte en planches dans son ouverture, sur le seuil ; les deux pans de toit en planches ;
//   - en jeu (hors du mode construction), E devant le volet : il s'ouvre à l'équerre du mur, puis se referme ;
//   - la zone enregistrée comme plan : src/content/plans/cabane.json (gardé) ; .art-preview/cabane.png : la cabane finie à côté de
//     Xéros, et les couches de montage ;
//   - la cabane entière neuve, patinée, vieille : .art-preview/bois-ages-court.png (l'aperçu court des âges, tools/lib/ages-preview.ts).
// Usage : npm run test:cabane.

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { playtest } from './lib/playtest';
import { sources } from '../art/index';
import { agesShortPreview, SHORT_MAX_H } from './lib/ages-preview';

/** Le plan commité (le contenu du jeu) ; le scénario écrit le sien dans un dossier temporaire et le compare, sauf avec PLANS_WRITE=1
 * (pour mettre à jour le plan commité quand le bâtiment change exprès). */
const COMMITTED = 'src/content/plans/cabane.json';
// le dossier des plans écrits : celui du banc partagé (tools/run-scenarios.ts, son serveur l'écrit), sinon un dossier temporaire à soi
const OUT_DIR = process.env.PLANS_WRITE ? 'src/content/plans' : (process.env.XEROS_PLANS_OUT ?? mkdtempSync(join(tmpdir(), 'xeros-plans-')));
process.env.XEROS_PLANS_OUT = OUT_DIR;
const PLAN_FILE = `${OUT_DIR}/cabane.json`;
/** Date du plan au départ (0 s'il n'existe pas) : le test attend qu'il soit réécrit. */
const mtimeOf = (f: string) => (existsSync(f) ? statSync(f).mtimeMs : 0);
const PLAN_BEFORE = mtimeOf(PLAN_FILE);

/** Un rondin écorcé du normal, de cette longueur, dans ce sens (son âge vient du catalogue). */
const log = (axis: 'ew' | 'ns', length: number) => ({ wood: { size: 'normal', length, shape: 'round', peeled: true, axis } });

await playtest('cabane', async ({ page, errors, load }) => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await load('?construire&dieu&reset');
  // sur la ferme, en mode construction
  await page.keyboard.press('KeyB');
  await sleep(150);
  await page.evaluate(() => (window as any).__restart({ kind: 'map', map: 'ferme' }));
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
  // les pièces déjà posées sur la ferme à l'arrivée (la cabane du chasseur, posée depuis son plan : chantier « monde ») ne comptent pas
    let existing: Set<number> | undefined;
    const pieces = async () => {
      const all = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').map.builds.map((b: any) => b.piece))));
      existing ??= new Set(all.map((p: any) => p.id));
      return all.filter((p: any) => !existing!.has(p.id));
    };
    await pieces();
  // les assemblages des pièces déjà là (la cabane du chasseur) ne comptent pas non plus
  const joints = async () =>
    (await page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').map.changes.joints)))).filter((j: any) => !existing?.has(j.a));

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

  // l'âge du bois, réglé au catalogue : une cabane patinée (toutes ses pièces de bois le prennent)
  await send({ kind: 'age', age: 'worn' });

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
    // et le volet dans l'ouverture (au milieu du mur, sur le rondin de la deuxième assise, sa face du dehors à l'est : R trois fois),
    // posé entre les deux : la visée prend le plus haut dessus qu'elle trouve, et elle tomberait sur le rondin sud déjà posé
    if (k === 2) {
      const northOf = await putLog('rondin est 2 (nord de la fenêtre)', 'ns', 180, 320, 0, EW(k) + 40);
      await send({ kind: 'pick', piece: { prop: 'plank-shutter' } });
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('KeyR');
        await sleep(80);
      }
      const shutter = await put('volet', 340, 180, 4, 60, NS(1) + 40);
      assert.equal(shutter.view, 3, "le volet tourné vers l'est");
      east = [northOf, await putLog('rondin est 2 (sud de la fenêtre)', 'ns', 200, 320, 240, EW(k) + 40)];
    } else east = [await putLog(`rondin est ${k}`, 'ns', 440, 320, 0, EW(k) + 40)];
    await joint('notch', west, north);
    await joint('notch', west, southL);
    await joint('notch', east[0], north);
    await joint('notch', east.at(-1), southR);
    assert.equal(await zOf(west), NS(k), `assise ${k} nord-sud : enfoncée à ${NS(k)} cm`);
    if (k === 0) await frame('la première assise');
    if (k === 2) await frame('trois assises, la fenêtre');
  }
  // le seuil : deux dalles dans l'ouverture, chacune contre un rondin de la porte (l'aimant des bords), un joint de 10 cm entre elles ;
  // posées une fois les murs montés (posées avant, elles aimanteraient les rondins de la porte), et pas bord à bord (la faîtière
  // s'aimanterait au joint, l'aimant ne regarde pas la hauteur)
  for (const x of [195, 140]) {
    await send({ kind: 'pick', piece: { prop: 'slab' }, natural: { form: 0, size: 100 } });
    await put(`seuil ${x}`, x, 380, 45, 40, 0);
  }
  // la porte en planches dans son ouverture, sur le seuil (12 cm : son haut touche le dessous du linteau), avant le linteau qui passe
  // au-dessus (la visée prendrait le dessus du linteau)
  await send({ kind: 'pick', piece: { prop: 'plank-door' } });
  await put('porte', 140, 400, 100, 6, 12);
  // la dernière assise est-ouest, pleine : le linteau de la porte
  const topN = await putLog('rondin nord 5', 'ew', 380, 0, 20, NS(4) + 40);
  const topS = await putLog('rondin sud 5 (linteau)', 'ew', 380, 0, 380, NS(4) + 40);
  for (const p of [topN, topS]) {
    await joint('notch', p, west);
    await joint('notch', p, east[0]);
    assert.equal(await zOf(p), EW(5), 'la dernière assise enfoncée');
  }
  await frame('les murs, la porte, la fenêtre');

  // 3. les pignons en planches fendues, sur le dernier rondin de chaque mur de bout, entre les murs nord-sud (au nord : la face du
  // dehors au nord, R deux fois), et la faîtière posée sur leurs sommets (60 cm : son dessus au faîte des pans)
  await send({ kind: 'pick', piece: { prop: 'plank-gable' } });
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('KeyR');
    await sleep(80);
  }
  const gableN = await put('pignon nord', 60, 40, 260, 6, EW(5) + 40);
  await send({ kind: 'pick', piece: { prop: 'plank-gable' } });
  const gableS = await put('pignon sud', 60, 400, 260, 6, EW(5) + 40);
  assert.deepEqual([gableN.view, gableS.view], [2, 0]);
  // visée à 1,80 m du bord ouest (sur la grille ; le milieu exact, 1,70 m, n'y est pas), elle s'aimante à 1,85 m : au bord de la dalle
  // ouest du seuil, loin dessous (l'aimant des bords ne regarde pas la hauteur) ; 5 cm, un pixel, sous les pans
  await putLog('faîtière', 'ns', 440, 185, 0, EW(5) + 100);
  await frame('les pignons en planches et la faîtière');

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
  const built = await pieces();

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
  // le plan est réécrit (plus récent qu'au départ) : on ne l'efface pas avant, car les scénarios qui tournent en même temps le lisent
  for (let i = 0; i < 50 && mtimeOf(PLAN_FILE) <= PLAN_BEFORE; i++) await sleep(100);
  assert.ok(mtimeOf(PLAN_FILE) > PLAN_BEFORE, 'la cabane est enregistrée dans src/content/plans/cabane.json');
  const plan = JSON.parse(readFileSync(PLAN_FILE, 'utf8'));
  // le plan bâti par le scénario est celui du contenu (sinon : le bâtiment a changé ; PLANS_WRITE=1 pour le mettre à jour exprès)
  if (!process.env.PLANS_WRITE) assert.deepEqual(plan, JSON.parse(readFileSync(COMMITTED, 'utf8')), `le plan bâti est celui de ${COMMITTED} (PLANS_WRITE=1 pour le mettre à jour)`);
  const all = await pieces();
  assert.equal(plan.pieces.length, all.length, 'toutes les pièces sont dans le plan');
  assert.equal(plan.joints.length, (await joints()).length, 'et tous les assemblages');
  // seulement des pièces du catalogue : des rondins du normal, des dalles, la porte, les pans
  for (const p of plan.pieces) assert.ok(('wood' in p.piece && p.piece.wood.size === 'normal') || ['slab', 'plank-door', 'plank-roof', 'plank-gable', 'plank-shutter'].includes(p.piece.prop), JSON.stringify(p.piece));
  // un seul âge, patiné, fixé par le plan ; des rondins écorcés
  assert.equal(plan.age, 'worn', 'le plan fixe l’âge de toutes ses pièces : patiné');
  for (const p of plan.pieces) assert.ok(!p.age && !('wood' in p.piece && p.piece.wood.age), `l'âge est celui du plan, pas de la pièce : ${JSON.stringify(p)}`);
  for (const p of plan.pieces) if ('wood' in p.piece) assert.equal(p.piece.wood.peeled, true, `un rondin écorcé : ${JSON.stringify(p.piece)}`);
  assert.ok(all.every((p: any) => ('wood' in p.piece ? p.piece.wood.age === 'worn' : p.piece.prop === 'slab' || p.age === 'worn')), 'toutes les pièces de bois posées sont patinées');

  // 6. en jeu : hors du mode construction, Xéros devant le volet, à l'est du mur, tourné vers lui ; E l'ouvre (il tourne d'un quart sur
  // son gond, au bout sud de sa face du dehors : ouvert, il sort du mur vers l'est, sa face du dehors au sud), E le referme
  await page.keyboard.press('KeyB');
  await page.waitForFunction(() => (window as any).game.scene.getScene('world').mode === 'play', null, { timeout: 5000 });
  const shutterOf = async () => (await pieces()).find((q: any) => 'prop' in q.piece && /^plank-shutter/.test(q.piece.prop));
  const before = await shutterOf();
  await page.evaluate(([x, y]) => {
    const w = (window as any).game.scene.getScene('world');
    w.player.actor.body.reset(x, y);
    w.player.actor.face('left');
  }, [(O!.x + 422) / 5, (O!.y + 240) / 5] as const);
  await sleep(250);
  await page.keyboard.press('KeyE');
  await sleep(250);
  const open = await shutterOf();
  assert.equal(open.piece.prop, 'plank-shutter-open', `E ouvre le volet (${notices.at(-1) ?? ''})`);
  assert.deepEqual([open.x - O!.x, open.y - O!.y, open.z, open.view], [344, 236, before.z, 0], 'ouvert à l\'équerre du mur, vers l\'est');
  // la capture : de près, sur la cabane, Xéros revenu à côté (assez loin pour que le toit ne s'efface pas)
  await page.evaluate(([ox, oy]) => {
    const w = (window as any).game.scene.getScene('world');
    w.player.actor.body.reset(Math.round((ox + 470) / 5), Math.round((oy + 300) / 5));
    w.player.actor.face('down');
    const cam = w.cameras.main;
    cam.stopFollow();
    cam.setZoom(3);
    cam.centerOn((ox + 260) / 5, (oy + 20) / 5);
  }, [O!.x, O!.y] as const);
  await sleep(900);
  const shot = await page.evaluate(([ox, oy]) => {
    const g = (window as any).game;
    const cam = g.scene.getScene('world').cameras.main;
    cam.preRender();
    const rect = g.canvas.getBoundingClientRect();
    const k = cam.zoom * (rect.width / g.scale.width);
    const at = (x: number, y: number) => ({ x: rect.left + (x - cam.worldView.x) * k, y: rect.top + (y - cam.worldView.y) * k });
    const a = at((ox - 40) / 5, (oy - 460) / 5);
    const b = at((ox + 560) / 5, (oy + 520) / 5);
    return { x: Math.max(0, Math.round(a.x)), y: Math.max(0, Math.round(a.y)), w: Math.round(b.x - a.x), h: Math.round(b.y - a.y) };
  }, [O!.x, O!.y] as const);
  shots.push({ name: 'le volet ouvert (en jeu)', png: PNG.sync.read(await page.screenshot({ clip: { x: shot.x, y: shot.y, width: shot.w, height: Math.min(shot.h, 720 - shot.y) } })) });
  await page.evaluate(([x, y]) => {
    const w = (window as any).game.scene.getScene('world');
    w.player.actor.body.reset(x, y);
    w.player.actor.face('left');
  }, [(O!.x + 422) / 5, (O!.y + 240) / 5] as const);
  await sleep(250);
  await page.keyboard.press('KeyE');
  await sleep(250);
  const closed = await shutterOf();
  assert.deepEqual([closed.piece.prop, closed.x, closed.y, closed.view], ['plank-shutter', before.x, before.y, 3], 'E le referme, à sa place');

  // 7. la cabane entière dans les trois âges, pour .art-preview/bois-ages-court.png : toutes ses pièces de bois retintées (le même
  // réglage que le catalogue), redessinées, capturées comme les couches
  await page.keyboard.press('KeyB');
  await page.waitForFunction(() => (window as any).game.scene.getScene('world').mode === 'build', null, { timeout: 5000 });
  const cabins: PNG[] = [];
  // tirée du canevas du jeu (pas de l'écran, que le navigateur réduit) : 3 pixels du canevas par pixel du jeu, sans la zone choisie
  const cabinShot = async (): Promise<PNG> => {
    await send({ kind: 'none' });
    await page.mouse.move(5, 5);
    const url: string = await page.evaluate(([ox, oy]) => {
      const g = (window as any).game;
      const w = g.scene.getScene('world');
      w.builder.selection = undefined;
      w.player.actor.body.reset(Math.round((ox + 470) / 5), Math.round((oy + 300) / 5));
      w.player.actor.face('down');
      const cam = w.cameras.main;
      cam.setZoom(3);
      cam.centerOn((ox + 245) / 5, (oy + 50) / 5);
      cam.preRender();
      const k = cam.zoom * (g.canvas.width / g.scale.width) * (g.scale.width / cam.width);
      const x = Math.round(((ox - 30) / 5 - cam.worldView.x) * k);
      const y = Math.round(((oy - 400) / 5 - cam.worldView.y) * k);
      return new Promise((done) => g.renderer.snapshotArea(x, y, Math.round((550 / 5) * k), Math.round((900 / 5) * k), (img: HTMLImageElement) => done(img.src)));
    }, [O!.x, O!.y] as const);
    return PNG.sync.read(Buffer.from(url.split(',')[1], 'base64'));
  };
  for (const age of ['new', 'worn', 'old'] as const) {
    await page.evaluate((age) => {
      const m = (window as any).game.scene.getScene('world').map;
      for (const b of m.changes.builds) {
        m.removeBuild(b.id);
        if ('wood' in b.piece) {
          if (age === 'new') delete b.piece.wood.age;
          else b.piece.wood.age = age;
        } else if (b.piece.prop !== 'slab') {
          if (age === 'new') delete b.age;
          else b.age = age;
        }
        m.placeBuild(b);
      }
      m.sortBuilds();
    }, age);
    cabins.push(await cabinShot());
  }
  const short = agesShortPreview(sources, cabins);
  assert.ok(short, 'l’aperçu court des âges');
  assert.ok(short.height <= SHORT_MAX_H, `bois-ages-court.png : ${short.height} px de haut, ${SHORT_MAX_H} au plus`);
  writeFileSync('.art-preview/bois-ages-court.png', PNG.sync.write(short));

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
  assert.equal(built.length, all.length);
  console.log(`  ✓ cabane : ${all.length} pièces, ${(await joints()).length} assemblages, enregistrée dans ${PLAN_FILE} ; .art-preview/cabane.png`);
});
