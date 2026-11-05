// L'étal de la place, en bois, bâti dans le mode construction (règle de Grégoire : un bâtiment est validé quand on réussit à le bâtir
// dans le mode construction, par un scénario, uniquement avec les pièces du catalogue, puis à l'enregistrer comme plan). Dans le vrai
// jeu (tools/lib/playtest.ts), à la vraie souris et au vrai clavier, comme la cabane et la grange :
//   - le bois patiné (l'âge réglé au catalogue, fixé par le plan) ;
//   - 2,40 × 1,60 m, la face des clients au sud ; quatre dalles, quatre poteaux (poutres du normal dressées : 2,40 m derrière, 1,80 m
//     devant), une sablière sur chaque rang (tenon et mortaise) ;
//   - le fond, les deux côtés et le devant bas (1 m) en bardage, contre la face du dehors des poteaux ; le volet d'étal fermé, posé
//     sur le rebord du devant ;
//   - l'auvent en planches, en pente vers les clients, sur la sablière de devant ;
//   - la zone enregistrée comme plan (volet fermé) : src/content/plans/etal.json ;
//   - en jeu (hors du mode construction), E devant l'étal : le volet se rabat en comptoir, puis se relève ;
//   - .art-preview/etal.png : les couches de montage, puis l'étal fini, fermé, et ouvert, à côté de Xéros.
// Usage : npm run test:etal.

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { playtest } from './lib/playtest';

/** Le plan commité (le contenu du jeu) ; le scénario écrit le sien dans un dossier temporaire et le compare, sauf avec PLANS_WRITE=1
 * (pour mettre à jour le plan commité quand le bâtiment change exprès). */
const COMMITTED = 'src/content/plans/etal.json';
// le dossier des plans écrits : celui du banc partagé (tools/run-scenarios.ts, son serveur l'écrit), sinon un dossier temporaire à soi
const OUT_DIR = process.env.PLANS_WRITE ? 'src/content/plans' : (process.env.XEROS_PLANS_OUT ?? mkdtempSync(join(tmpdir(), 'xeros-plans-')));
process.env.XEROS_PLANS_OUT = OUT_DIR;
const PLAN_FILE = `${OUT_DIR}/etal.json`;
/** Date du plan au départ (0 s'il n'existe pas) : le test attend qu'il soit réécrit. */
const mtimeOf = (f: string) => (existsSync(f) ? statSync(f).mtimeMs : 0);
const PLAN_BEFORE = mtimeOf(PLAN_FILE);

/** Une poutre du normal (20 × 20 cm équarrie : quatre faces), de cette longueur, dans ce sens (`up` : dressée, un poteau). */
const beam = (axis: 'ew' | 'ns' | 'up', length: number) => ({ wood: { size: 'normal', length, shape: 'round', hewn: 12, axis } });


await playtest('etal', async ({ page, errors, load }) => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await load('?construire&dieu&reset');
  await page.keyboard.press('KeyB');
  await sleep(150);
  await page.evaluate(() => (window as any).__restart({ kind: 'map', map: 'ferme' }));
  await page.keyboard.press('KeyB');
  await sleep(150);
  const notices: string[] = [];
  await page.exposeFunction('noticed', (t: string) => notices.push(t));
  await page.evaluate(() => (window as any).game.events.on('notice', (t: string) => (window as any).noticed(t)));

  // l'origine (coin nord-ouest de l'étal, en cm, sur la grille) : un coin dégagé de 3 × 2 m, de quoi mettre Xéros devant et à l'est
  const O = await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const m = w.map;
    const px = w.player.actor;
    for (const [l, t, r, b] of [[30, 80, 110, 110], [20, 40, 100, 90]]) {
      for (let y = 80; y < m.height - b; y += 8) for (let x = 30; x < m.width - r; x += 8) {
        if (Math.hypot(x + 24 - px.x, y + 16 - px.y) > 120 && m.areaFree({ left: x - l, top: y - t, right: x + r, bottom: y + b })) {
          w.cameras.main.setZoom(3);
          w.cameras.main.centerOn(x + 24, y + 16 - (w.lifts?.liftAt?.(x + 24, y + 16) ?? 0));
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
      return { x: rect.left + (x - cam.worldView.x) * cam.zoom * (rect.width / g.scale.width), y: rect.top + (y - ((window as any).game.scene.getScene('world').lifts?.liftAt?.(x, y) ?? 0) - cam.worldView.y) * cam.zoom * (rect.height / g.scale.height) };
    }, [x, y] as const);
  const click = async (x: number, y: number) => {
    const s = await screen(x, y);
    await page.mouse.move(s.x, s.y);
    await sleep(60);
    await page.mouse.click(s.x, s.y);
    await sleep(110);
    // le clic joué : la file des clics du mode construction (systems/build.ts) vidée par un pas de jeu ; sous la charge, ce pas peut venir
    // après la pause (un clic n'est jamais perdu, il attend son pas)
    await page.evaluate(() => (window as any).__until(() => !(window as any).game.scene.getScene('world').builder?.clicks?.length, 'le clic joué'));
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

  // les couches de montage : une capture par étape, cadrée sur l'étal ; Xéros à l'est (`at` : ailleurs, le point de ses pieds en cm)
  const shots: { name: string; png: PNG }[] = [];
  const capture = async (name: string, at: [number, number] = [380, 200], facing = 'down') => {
    const box = await page.evaluate(([ox, oy, px, py, f]) => {
      const g = (window as any).game;
      const w = g.scene.getScene('world');
      w.player.actor.body.reset(Math.round((ox + px) / 5), Math.round((oy + py) / 5));
      w.player.actor.face(f);
      // pour la capture seulement : les objets de la carte (arbres) dont l'image passe devant l'étal sont cachés
      const L = (ox - 80) / 5, T = (oy - 360) / 5, R = (ox + 420) / 5, B = (oy + 340) / 5;
      for (const p of w.map.props) {
        const b = p.image.getBounds();
        if (b.right > L && b.left < R && b.bottom > T && b.top < B) for (const part of p.parts ?? [p.image]) part.setVisible?.(false);
      }
      const cam = w.cameras.main;
      cam.stopFollow();
      cam.setZoom(3);
      cam.centerOn((ox + 170) / 5, (oy - 10) / 5);
      cam.preRender();
      const rect = g.canvas.getBoundingClientRect();
      const k = cam.zoom * (rect.width / g.scale.width);
      const pt = (x: number, y: number) => ({ x: rect.left + (x - cam.worldView.x) * k, y: rect.top + (y - ((window as any).game.scene.getScene('world').lifts?.liftAt?.(x, y) ?? 0) - cam.worldView.y) * k });
      const a = pt(L, T);
      const b = pt(R, B);
      return { x: Math.max(0, Math.round(a.x)), y: Math.max(0, Math.round(a.y)), w: Math.round(b.x - a.x), h: Math.round(b.y - a.y) };
    }, [O!.x, O!.y, at[0], at[1], facing] as const);
    await sleep(900);
    const buf = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: Math.min(box.h, 720 - box.y) } });
    shots.push({ name, png: PNG.sync.read(buf) });
  };
  const frame = async (name: string) => {
    await send({ kind: 'none' });
    await page.mouse.move(5, 5);
    await sleep(200);
    await capture(name);
    await page.evaluate(([ox, oy]) => (window as any).game.scene.getScene('world').cameras.main.centerOn((ox + 120) / 5, (oy + 80) / 5 - ((window as any).game.scene.getScene('world').lifts?.liftAt?.((ox + 120) / 5, (oy + 80) / 5) ?? 0)), [O!.x, O!.y] as const);
    await sleep(150);
  };
  const panel = async (what: string, prop: string, view: number, x: number, y: number, w: number, d: number, z: number) => {
    await send({ kind: 'pick', piece: { prop } });
    await keys('KeyR', view);
    const [W, D] = view % 2 ? [d, w] : [w, d];
    const p = await put(what, x, y, W, D, z);
    assert.equal(p.view, view, `${what} : sa face du dehors`);
    return p;
  };

  // l'âge du bois, réglé au catalogue (patiné) : toutes ses pièces de bois le prennent, le plan le fixe
  await send({ kind: 'age', age: 'worn' });

  // 1. les dalles, puis les poteaux (des poutres dressées) : 2,40 m derrière, 1,80 m devant (la pente de l'auvent), du nord au sud
  const POSTS: [number, number, number][] = [[0, 0, 240], [200, 0, 240], [0, 120, 180], [200, 120, 180]];
  for (const [x, y] of POSTS) {
    await send({ kind: 'pick', piece: { prop: 'slab' }, natural: { form: 0, size: 100 } });
    await put(`dalle ${x},${y}`, x, y, 45, 40, 0);
  }
  const post: any[] = [];
  for (const [x, y, l] of POSTS) post.push(await putBeam(`poteau ${x},${y}`, 'up', l, x, y, 12));
  // les sablières : une poutre de 2,40 m sur chaque rang, chevillée sur la tête des poteaux (tenon et mortaise)
  const back = await putBeam('sablière de derrière', 'ew', 240, 0, 0, 252);
  const front = await putBeam('sablière de devant', 'ew', 240, 0, 120, 192);
  await joint('mortise', post[0], back);
  await joint('mortise', post[1], back);
  await joint('mortise', post[2], front);
  await joint('mortise', post[3], front);
  await frame("l'ossature : poteaux et sablières");

  // 2. le bardage contre la face du dehors des poteaux : le fond (dehors au nord : R deux fois), les côtés (ouest : une fois, est :
  // trois), le devant bas (1 m)
  await panel('fond', 'stall-back', 2, 40, -20, 160, 20, 0);
  await panel('côté ouest', 'stall-side', 1, -20, 40, 80, 20, 0);
  await panel('côté est', 'stall-side', 3, 240, 40, 80, 20, 0);
  await panel('devant', 'stall-front', 0, 40, 160, 160, 20, 0);
  // le volet d'étal, fermé, posé sur le rebord du devant (1 m), contre sa face du dehors
  const shutter = await panel("volet d'étal", 'stall-shutter', 0, 40, 160, 160, 4, 100);
  await frame('le bardage, le volet fermé');

  // 3. l'auvent, sa rive basse sur la sablière de devant (2,12 m), 40 cm au-delà des poteaux
  await send({ kind: 'pick', piece: { prop: 'plank-awning' } });
  const awning = await put('auvent', -20, -20, 280, 220, 212);
  assert.equal(awning.view, 0);
  await frame("l'étal fini, fermé");

  // 4. enregistré comme plan : la zone de tout l'étal (volet fermé)
  await send({ kind: 'select' });
  const a = await screen((O!.x - 60) / 5, (O!.y - 60) / 5);
  const b = await screen((O!.x + 300) / 5, (O!.y + 260) / 5);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await sleep(150);
  await send({ kind: 'save-plan', name: 'Etal' });
  // le plan est réécrit (plus récent qu'au départ) : on ne l'efface pas avant, car les scénarios qui tournent en même temps le lisent
  for (let i = 0; i < 50 && mtimeOf(PLAN_FILE) <= PLAN_BEFORE; i++) await sleep(100);
  assert.ok(mtimeOf(PLAN_FILE) > PLAN_BEFORE, "l'étal est enregistré dans src/content/plans/etal.json");
  const plan = JSON.parse(readFileSync(PLAN_FILE, 'utf8'));
  // le plan bâti par le scénario est celui du contenu (sinon : le bâtiment a changé ; PLANS_WRITE=1 pour le mettre à jour exprès)
  if (!process.env.PLANS_WRITE) assert.deepEqual(plan, JSON.parse(readFileSync(COMMITTED, 'utf8')), `le plan bâti est celui de ${COMMITTED} (PLANS_WRITE=1 pour le mettre à jour)`);
  const all = await pieces();
  assert.equal(plan.pieces.length, all.length, 'toutes les pièces sont dans le plan');
  assert.equal(plan.joints.length, (await joints()).length, 'et tous les assemblages');
  for (const p of plan.pieces) assert.ok(('wood' in p.piece && p.piece.wood.size === 'normal' && p.piece.wood.hewn === 12) || ['slab', 'stall-back', 'stall-side', 'stall-front', 'stall-shutter', 'plank-awning'].includes(p.piece.prop), JSON.stringify(p.piece));
  assert.equal(plan.age, 'worn', "le plan fixe l'âge de toutes ses pièces de bois (patiné)");
  for (const p of plan.pieces) assert.ok(!p.age && !('wood' in p.piece && p.piece.wood.age), `l'âge est celui du plan, pas de la pièce : ${JSON.stringify(p)}`);

  // 5. en jeu : hors du mode construction, Xéros devant l'étal, tourné vers lui ; E rabat le volet en comptoir (contre la face du
  // dehors, son dessus à 1 m), E le relève
  await page.keyboard.press('KeyB');
  await page.waitForFunction(() => (window as any).game.scene.getScene('world').mode === 'play', null, { timeout: 5000 });
  const shutterOf = async () => (await pieces()).find((q: any) => q.id === shutter.id);
  /** Xéros tourné vers le nord, le point qu'il regarde sur ce point (cm) du sol. */
  const faceAt = async (x: number, y: number) => {
    // la souris lâchée (sortie du canevas) : Xéros garde la direction qu'on lui donne, vers le volet
    await page.evaluate(() => (window as any).__leave());
    await page.evaluate(([x, y]) => {
      const w = (window as any).game.scene.getScene('world');
      w.player.actor.body.reset(x, y);
      w.player.actor.face('up');
    }, [(O!.x + x) / 5, (O!.y + y) / 5 + 22] as const);
    await sleep(250);
  };
  await faceAt(120, 162);
  await page.keyboard.press('KeyE');
  await sleep(250);
  const open = await shutterOf();
  assert.equal(open.piece.prop, 'stall-shutter-open', `E rabat le volet (${notices.at(-1) ?? ''})`);
  assert.deepEqual([open.x - O!.x, open.y - O!.y, open.z, open.view], [40, 164, 96, 0], 'rabattu en comptoir, contre le devant, son dessus à 1 m');
  await capture("l'étal ouvert (en jeu)", [300, 290], 'up');
  await faceAt(120, 209);
  await page.keyboard.press('KeyE');
  await sleep(250);
  const closed = await shutterOf();
  assert.deepEqual([closed.piece.prop, closed.x, closed.y, closed.z], ['stall-shutter', shutter.x, shutter.y, 100], 'E le relève, à sa place');

  const H = Math.max(...shots.map((s) => s.png.height)) + 4;
  const W = shots.reduce((s, x) => s + x.png.width + 4, 4);
  const out = new PNG({ width: W, height: H });
  out.data.fill(0x14);
  let x = 4;
  for (const s of shots) {
    PNG.bitblt(s.png, out, 0, 0, s.png.width, s.png.height, x, 2);
    x += s.png.width + 4;
  }
  writeFileSync('.art-preview/etal.png', PNG.sync.write(out));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  console.log(`  ✓ étal : ${all.length} pièces, ${(await joints()).length} assemblages, enregistré dans ${PLAN_FILE} ; .art-preview/etal.png`);
}, { speed: 1 }); // x1 : bâtir dans le mode construction ne demande pas de temps de jeu, et x10 alourdit chaque image
