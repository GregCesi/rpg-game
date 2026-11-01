// La grange de ferme en bois, bâtie dans le mode construction (règle de Grégoire : un bâtiment est validé quand on réussit à le bâtir
// dans le mode construction, par un scénario, uniquement avec les pièces du catalogue, puis à l'enregistrer comme plan). Dans le vrai
// jeu (tools/lib/playtest.ts), à la vraie souris et au vrai clavier : chaque pièce prise au catalogue (BuildCommand), visée à la souris,
// posée d'un clic ; chaque assemblage posé d'un clic sur sa jonction.
//   - le bois vieux, gris (l'âge réglé au catalogue, fixé par le plan) ;
//   - 8,80 × 6 m au sol, faîtage est-ouest ; dix dalles, dix poteaux (poutres de 3 m dressées) : quatre au nord, quatre au sud (des
//     travées de 2,40 m entre poteaux, celle du milieu pour la porte), un au milieu de chaque mur de bout ;
//   - les sablières (poutres couchées sur la tête des poteaux, tenon et mortaise), entées en trait de Jupiter (un arbre normal ne donne
//     que 5,80 m), croisées à mi-bois aux angles ; deux entraits (entés) à mi-bois sur les sablières ;
//   - le bardage : dix-huit pans de bardage (deux par travée), contre la face du dehors des poteaux, la porte charretière dans la
//     travée du milieu du mur sud ;
//   - deux poinçons (poutres de 2,20 m dressées) sur les entraits, deux pignons en bardage sur les sablières des murs de bout, le
//     faîtage (enté) sur leurs sommets ;
//   - deux grands pans de toit en planches ;
//   - la zone enregistrée comme plan : src/content/plans/grange.json ; .art-preview/grange.png : les couches de montage, puis la grange
//     finie à côté de Xéros.
// Usage : npm run test:grange.

import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { playtest } from './lib/playtest';

const PLAN_FILE = 'src/content/plans/grange.json';

/** Une poutre du normal (20 × 20 cm équarrie : quatre faces), de cette longueur, dans ce sens (`up` : dressée, un poteau). */
const beam = (axis: 'ew' | 'ns' | 'up', length: number) => ({ wood: { size: 'normal', length, shape: 'round', hewn: 12, axis } });

if (existsSync(PLAN_FILE)) rmSync(PLAN_FILE);

await playtest('grange', async ({ page, errors, load }) => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await load('?construire&dieu&reset');
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

  // l'origine (coin nord-ouest de la grange, en cm, sur la grille) : un coin dégagé de 9 × 6 m (au sol) et de quoi mettre Xéros à l'est
  const O = await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const m = w.map;
    const px = w.player.actor;
    // le plus dégagé d'abord (les arbres au sud cacheraient le mur de la porte), puis de moins en moins
    for (const [l, t, r, b] of [[40, 90, 215, 200], [20, 20, 205, 210], [20, 20, 205, 180], [20, 20, 205, 160], [20, 20, 205, 135]]) {
      for (let y = 90; y < m.height - b; y += 8) for (let x = 30; x < m.width - r; x += 8) {
        if (Math.hypot(x + 90 - px.x, y + 60 - px.y) > 160 && m.areaFree({ left: x - l, top: y - t, right: x + r, bottom: y + b })) {
          w.cameras.main.setZoom(2);
          w.cameras.main.centerOn(x + 90, y + 40);
          return { x: Math.round((x * 5) / 20) * 20, y: Math.round((y * 5) / 20) * 20 };
        }
      }
    }
    return undefined;
  });
  assert.ok(O, 'un coin dégagé sur la ferme');
  await sleep(300);

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
  const keys = async (code: string, n: number) => {
    for (let i = 0; i < n; i++) {
      await page.keyboard.press(code);
      await sleep(30);
    }
  };

  /**
   * Pose une pièce (déjà prise au catalogue) pour que son emprise ait ce coin nord-ouest (cm, depuis O) : la souris vise le milieu de
   * l'emprise (4 cm plus au nord) vu à la hauteur du plus haut dessus sous elle (comme le fantôme), puis clic gauche. `at` : la place attendue quand
   * l'aimant des bords la décale (il ne regarde pas la hauteur). Renvoie la pièce.
   */
  const put = async (what: string, x: number, y: number, w: number, d: number, z?: number, at?: [number, number]) => {
    const S = await page.evaluate(async ([x, y, w, d]) => {
      const url = '/src/world/build.ts';
      const b = await import(url);
      const m = (window as any).game.scene.getScene('world').map;
      return b.supportAt(m.builds.map((q: any) => q.piece).filter((q: any) => !('prop' in q.piece && /plank-roof/.test(q.piece.prop))), { x, y, w, d });
    }, [O!.x + x, O!.y + y, w, d] as const);
    const before = (await pieces()).length;
    // 4 cm au nord du milieu : le même cran pour la place visée, mais pas pile entre deux crans pour une hauteur voisine
    await click((O!.x + x + w / 2) / 5, (O!.y + y + d / 2 - S - 4) / 5);
    const list = await pieces();
    assert.equal(list.length, before + 1, `${what} : posée (${notices.at(-1) ?? ''})`);
    const p = list.at(-1);
    assert.deepEqual([p.x - O!.x, p.y - O!.y], at ?? [x, y], `${what} : à sa place`);
    if (z !== undefined) assert.equal(p.z, z, `${what} : à ${z} cm`);
    return p;
  };
  /** Pose une poutre (prise au catalogue avec ses réglages) ; un poteau a 40 × 40 cm d'emprise (règle D étendue). */
  const putBeam = async (what: string, axis: 'ew' | 'ns' | 'up', length: number, x: number, y: number, z: number, at?: [number, number]) => {
    await send({ kind: 'pick', piece: beam(axis, length) });
    const [w, d] = axis === 'ew' ? [length, 30] : axis === 'ns' ? [30, length] : [40, 40];
    return put(what, x, y, w, d, z, at);
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
      return j && { x: j.x, y: j.y, type: j.type, why: j.why };
    }, [a.id, b.id] as const);
    assert.ok(pt, `${type} : une jonction entre ${a.id} et ${b.id}`);
    const n = (await joints()).length;
    await click(pt!.x, pt!.y);
    assert.equal((await joints()).length, n + 1, `${type} entre ${a.id} et ${b.id} : posé (jonction ${pt!.type ?? '—'} ${pt!.why ?? ''} ; ${notices.at(-1) ?? ''})`);
  };
  const zOf = async (p: any) => (await pieces()).find((q: any) => q.id === p.id).z;

  // les couches de montage : une capture par étape, cadrée sur la grange, Xéros à l'est
  const shots: { name: string; png: PNG }[] = [];
  const frame = async (name: string) => {
    await send({ kind: 'none' });
    await page.mouse.move(5, 5);
    await sleep(200);
    const box = await page.evaluate(([ox, oy]) => {
      const g = (window as any).game;
      const w = g.scene.getScene('world');
      w.player.actor.body.reset(Math.round((ox + 980) / 5), Math.round((oy + 640) / 5));
      w.player.actor.face('down');
      // pour la capture seulement : les objets de la carte (arbres) dont l'image passe devant la grange sont cachés
      const L = (ox - 80) / 5, T = (oy - 420) / 5, R = (ox + 940) / 5, B = (oy + 720) / 5;
      for (const p of w.map.props) {
        const b = p.image.getBounds();
        if (b.right > L && b.left < R && b.bottom > T && b.top < B) for (const part of p.parts ?? [p.image]) part.setVisible?.(false);
      }
      const cam = w.cameras.main;
      cam.setZoom(2);
      cam.centerOn((ox + 500) / 5, (oy + 150) / 5);
      cam.preRender();
      const rect = g.canvas.getBoundingClientRect();
      const k = cam.zoom * (rect.width / g.scale.width);
      const at = (x: number, y: number) => ({ x: rect.left + (x - cam.worldView.x) * k, y: rect.top + (y - cam.worldView.y) * k });
      const a = at((ox - 80) / 5, (oy - 420) / 5);
      const b = at((ox + 1060) / 5, (oy + 720) / 5);
      return { x: Math.max(0, Math.round(a.x)), y: Math.max(0, Math.round(a.y)), w: Math.round(b.x - a.x), h: Math.round(b.y - a.y) };
    }, [O!.x, O!.y] as const);
    await sleep(250);
    const buf = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: Math.min(box.h, 720 - box.y) } });
    shots.push({ name, png: PNG.sync.read(buf) });
    await page.evaluate(([ox, oy]) => (window as any).game.scene.getScene('world').cameras.main.centerOn((ox + 440) / 5, (oy + 200) / 5), [O!.x, O!.y] as const);
    await sleep(150);
  };

  // l'âge du bois, réglé au catalogue (vieux, gris) : toutes ses pièces de bois le prennent, le plan le fixe
  await send({ kind: 'age', age: 'old' });

  // 1. les dalles, puis les poteaux dessus (des poutres de 3 m dressées : 12 + 300 = 3,12 m)
  // du nord au sud : un poteau visé loin au nord d'un poteau déjà dressé serait vu sur sa tête (la visée prend le plus haut dessus)
  const POSTS: [number, number][] = [[0, 0], [280, 0], [560, 0], [840, 0], [0, 280], [840, 280], [0, 560], [280, 560], [560, 560], [840, 560]];
  for (const [x, y] of POSTS) {
    await send({ kind: 'pick', piece: { prop: 'slab' }, natural: { form: 0, size: 100 } });
    await put(`dalle ${x},${y}`, x, y, 45, 40, 0);
  }
  const post = new Map<string, any>();
  for (const [x, y] of POSTS) post.set(`${x},${y}`, await putBeam(`poteau ${x},${y}`, 'up', 300, x, y, 12));
  await frame('les dalles et les poteaux');

  // 2. les sablières des longs murs, sur la tête des poteaux : deux poutres entées (3 m, 5,80 m), la jonction sur le poteau de 2,80 m ;
  // au sud, visées à 5,80 m, elles s'aimantent à 5,70 m (au ras du dehors des poteaux, comme au nord)
  const plate = async (side: 'n' | 's') => {
    const y = side === 'n' ? 0 : 580;
    const at = (x: number): [number, number] => [x, side === 'n' ? 0 : 570];
    const a = await putBeam(`sablière ${side} ouest`, 'ew', 300, 0, y, 312, at(0));
    const b = await putBeam(`sablière ${side} est`, 'ew', 580, 300, y, 312, at(300));
    await joint('scarf', a, b);
    const row = side === 'n' ? 0 : 560;
    await joint('mortise', post.get(`0,${row}`), a);
    await joint('mortise', post.get(`280,${row}`), a);
    await joint('mortise', post.get(`560,${row}`), b);
    await joint('mortise', post.get(`840,${row}`), b);
    return [a, b];
  };
  const [n1, n2] = await plate('n');
  const [s1, s2] = await plate('s');
  // les sablières des murs de bout : deux poutres de 3 m entées, posées sur les longues (3,42 m), puis à mi-bois aux angles : elles
  // descendent à leur niveau ; à l'est, au ras du dedans des poteaux (visée au ras du dehors, elle s'aimanterait au bord des dalles,
  // qui débordent de 5 cm, et passerait sous le bardage)
  const end = async (side: 'w' | 'e') => {
    const x = side === 'w' ? 0 : 840;
    const at = (y: number): [number, number] => [x, y];
    const a = await putBeam(`sablière ${side} nord`, 'ns', 300, x, 0, 342, at(0));
    await joint('halving', a, side === 'w' ? n1 : n2);
    const b = await putBeam(`sablière ${side} sud`, 'ns', 300, x, 300, 342, at(300));
    await joint('halving', b, side === 'w' ? s1 : s2);
    for (const p of [a, b]) assert.equal(await zOf(p), 312, `sablière ${side} : à mi-bois, au niveau des longues`);
    await joint('scarf', a, b);
    await joint('mortise', post.get(`${side === 'w' ? 0 : 840},280`), a);
  };
  await end('w');
  await end('e');
  // les entraits : sur les poteaux de 2,80 et 5,60 m, d'une sablière à l'autre (6 m : deux poutres de 3 m entées), à mi-bois
  const ties: any[] = [];
  for (const x of [280, 560]) {
    const a = await putBeam(`entrait ${x} nord`, 'ns', 300, x, 0, 342);
    await joint('halving', a, x === 280 ? n1 : n2);
    const b = await putBeam(`entrait ${x} sud`, 'ns', 300, x, 300, 342);
    await joint('halving', b, x === 280 ? s1 : s2);
    for (const p of [a, b]) assert.equal(await zOf(p), 312, `entrait ${x} : à mi-bois`);
    await joint('scarf', a, b);
    ties.push(a);
  }
  await frame("l'ossature : poteaux, sablières, entraits");

  // 3. le bardage : deux pans par travée (20 cm : les lisses chevillées aux poteaux, les planches et leurs couvre-joints), au sol contre
  // la face du dehors des poteaux, la face du dehors de chaque côté (nord : R deux fois, ouest : une, est : trois) ; la porte
  // charretière au sud, dans la travée du milieu
  const board = async (what: string, view: number, x: number, y: number, at: [number, number], prop = 'board-wall', w = 120) => {
    await send({ kind: 'pick', piece: { prop } });
    await keys('KeyR', view);
    const [W, D] = view % 2 ? [20, w] : [w, 20];
    const p = await put(what, x, y, W, D, 0, at);
    assert.equal(p.view, view, `${what} : sa face du dehors`);
    return p;
  };
  for (const x of [40, 160, 600, 720]) await board(`bardage sud ${x}`, 0, x, 600, [x, 600]);
  await board('porte charretière', 0, 320, 600, [320, 600], 'cart-door', 240);
  for (const x of [40, 160, 320, 440, 600, 720]) await board(`bardage nord ${x}`, 2, x, -20, [x, -20]);
  for (const y of [40, 160, 320, 440]) await board(`bardage ouest ${y}`, 1, -20, y, [-20, y]);
  for (const y of [40, 160, 320, 440]) await board(`bardage est ${y}`, 3, 880, y, [880, y]);
  await frame('le bardage et la porte charretière');

  // 4. les poinçons (poutres de 2,20 m dressées) sur les entraits, les pignons sur les sablières des murs de bout (au ras de leur
  // face du dehors), le faîtage (deux poutres entées, la jonction sur le poinçon de 2,80 m) sur leurs sommets (3,42 + 2,20 = 5,62 m)
  const kings: any[] = [];
  for (const [i, x] of [280, 560].entries()) {
    const k = await putBeam(`poinçon ${x}`, 'up', 220, x, 280, 342);
    await joint('mortise', k, ties[i]);
    kings.push(k);
  }
  for (const [what, view, x] of [['pignon ouest', 1, 0], ['pignon est', 3, 860]] as const) {
    await send({ kind: 'pick', piece: { prop: 'board-gable' } });
    await keys('KeyR', view);
    const g = await put(what, x, 40, 20, 520, 342);
    assert.equal(g.view, view, `${what} : sa face du dehors`);
  }
  const r1 = await putBeam('faîtage ouest', 'ew', 300, 0, 280, 562);
  const r2 = await putBeam('faîtage est', 'ew', 580, 300, 280, 562);
  await joint('scarf', r1, r2);
  await joint('mortise', kings[0], r1);
  await joint('mortise', kings[1], r2);
  await frame('les poinçons, les pignons, le faîtage');

  // 5. les deux grands pans (rive basse au sud : vue 0 ; au nord : R deux fois), sur les sablières (3,42 m)
  await send({ kind: 'pick', piece: { prop: 'plank-roof-large' } });
  const south = await put('pan sud', -40, 300, 960, 340, 342);
  await send({ kind: 'pick', piece: { prop: 'plank-roof-large' } });
  await keys('KeyR', 2);
  const north = await put('pan nord', -40, -40, 960, 340, 342);
  assert.deepEqual([south.view, north.view], [0, 2]);
  await frame('la grange finie');

  // 6. enregistrée comme plan : la zone de toute la grange
  await send({ kind: 'select' });
  const a = await screen((O!.x - 80) / 5, (O!.y - 80) / 5);
  const b = await screen((O!.x + 960) / 5, (O!.y + 680) / 5);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await sleep(150);
  await send({ kind: 'save-plan', name: 'Grange' });
  for (let i = 0; i < 50 && !existsSync(PLAN_FILE); i++) await sleep(100);
  assert.ok(existsSync(PLAN_FILE), 'la grange est enregistrée dans src/content/plans/grange.json');
  const plan = JSON.parse(readFileSync(PLAN_FILE, 'utf8'));
  const all = await pieces();
  assert.equal(plan.pieces.length, all.length, 'toutes les pièces sont dans le plan');
  assert.equal(plan.joints.length, (await joints()).length, 'et tous les assemblages');
  // seulement des pièces du catalogue : des poutres du normal, des dalles, le bardage, la porte, les pignons, les pans
  for (const p of plan.pieces) assert.ok(('wood' in p.piece && p.piece.wood.size === 'normal' && p.piece.wood.hewn === 12) || ['slab', 'board-wall', 'cart-door', 'board-gable', 'plank-roof-large'].includes(p.piece.prop), JSON.stringify(p.piece));
  // aucune poutre plus longue que ce que donne un arbre normal (5,80 m)
  for (const p of plan.pieces) if ('wood' in p.piece) assert.ok(p.piece.wood.length <= 580, `une poutre de ${p.piece.wood.length} cm`);
  assert.equal(plan.age, 'old', "le plan fixe l'âge de toutes ses pièces de bois (vieux, gris)");
  for (const p of plan.pieces) assert.ok(!p.age && !('wood' in p.piece && p.piece.wood.age), `l'âge est celui du plan, pas de la pièce : ${JSON.stringify(p)}`);

  const H = Math.max(...shots.map((s) => s.png.height)) + 4;
  const W = shots.reduce((s, x) => s + x.png.width + 4, 4);
  const out = new PNG({ width: W, height: H });
  out.data.fill(0x14);
  let x = 4;
  for (const s of shots) {
    PNG.bitblt(s.png, out, 0, 0, s.png.width, s.png.height, x, 2);
    x += s.png.width + 4;
  }
  writeFileSync('.art-preview/grange.png', PNG.sync.write(out));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  console.log(`  ✓ grange : ${all.length} pièces, ${(await joints()).length} assemblages, enregistrée dans ${PLAN_FILE} ; .art-preview/grange.png`);
});
