// La forge du village, bâtie dans le mode construction (règle de Grégoire : un bâtiment est validé quand on réussit à le bâtir dans le
// mode construction, par un scénario, uniquement avec les pièces du catalogue, puis à l'enregistrer comme plan ; CADRAGE-forge.md,
// décisions du 4 novembre 2026). Dans le vrai jeu (tools/lib/playtest.ts), à la vraie souris et au vrai clavier : chaque pièce prise au
// catalogue (BuildCommand), visée à la souris, posée d'un clic ; chaque assemblage posé d'un clic sur sa jonction. La liste des pièces,
// dans l'ordre du montage : tools/lib/forge.ts.
//   - le bois vieux, gris (l'âge réglé au catalogue, fixé par le plan) ;
//   - l'atelier : la charpente de la grange relevée à 45°, ouverte au sud, deux grands pans de bardeaux (le pan nord percé pour le
//     conduit de la forge), le mobilier de la forge ; l'abri à charbon (un appentis de bardeaux) et ses sacs ; le puits ;
//   - la zone enregistrée comme plan : src/content/plans/forge.json (le plan s'écrit dans un dossier temporaire et se compare au plan
//     commité ; PLANS_WRITE=1 le réécrit) ;
//   - hors du mode construction : l'atelier n'est pas un bâtiment où l'on entre (un abri ouvert) ; Xéros dessous, ses pans s'effacent
//     et la lueur de la forge se voit ; dehors, elle est cachée sous le toit opaque ;
//   - .art-preview/forge.png : la forge montée étape par étape, puis finie (Xéros devant le feu, en jeu : npm run test:forge-visite).
// Usage : npm run test:forge.

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { playtest } from './lib/playtest';
import { forgeSteps, HEARTH, type ForgePiece } from './lib/forge';

/** Le plan commité (le contenu du jeu) ; le scénario écrit le sien dans un dossier temporaire et le compare, sauf avec PLANS_WRITE=1. */
const COMMITTED = 'src/content/plans/forge.json';
// le dossier des plans écrits : celui du banc partagé (tools/run-scenarios.ts, son serveur l'écrit), sinon un dossier temporaire à soi
const OUT_DIR = process.env.PLANS_WRITE ? 'src/content/plans' : (process.env.XEROS_PLANS_OUT ?? mkdtempSync(join(tmpdir(), 'xeros-plans-')));
process.env.XEROS_PLANS_OUT = OUT_DIR;
const PLAN_FILE = `${OUT_DIR}/forge.json`;
const mtimeOf = (f: string) => (existsSync(f) ? statSync(f).mtimeMs : 0);
const PLAN_BEFORE = mtimeOf(PLAN_FILE);
/** Les pièces du catalogue dont la forge est faite (outre la pièce de bois, une poutre du normal). */
const PROPS = /^(slab|board-wall|board-gable-tall|shingle-roof-large|shingle-roof-large-pierced|shingle-shed-roof|forge-hearth|chimney-hood|chimney-flue|chimney-cap|forge-bellows|quench-trough|anvil-block|anvil|forge-oven|tool-rack|charcoal-bin|workbench|vise|bar-rack|grindstone|scrap-crate|sack|well)$/;
const START = Date.now();

await playtest('forge', async ({ page, errors, load }) => {
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

  // l'origine (le coin nord-ouest de l'emprise du poteau nord-ouest, en cm, sur la grille) : une place dégagée de 17 × 9 m (l'atelier,
  // l'abri, le puits) et de quoi mettre Xéros à l'est
  const O = await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const m = w.map;
    const px = w.player.actor;
    // assez loin du bord nord : la souris visant un dessus haut (le pignon, 6 m) est loin au nord de la pièce, la caméra ne doit pas
    // buter contre le bord (le point visé serait sous le bandeau du haut)
    for (let y = 240; y < m.height - 220; y += 8) for (let x = 200; x < m.width - 480; x += 8) {
      if (Math.hypot(x + 130 - px.x, y + 60 - px.y) > 200 && m.areaFree({ left: x - 24, top: y - 24, right: x + 360, bottom: y + 180 })) {
        w.cameras.main.setZoom(2);
        w.cameras.main.centerOn(x + 130, y + 40);
        return { x: Math.round((x * 5) / 20) * 20, y: Math.round((y * 5) / 20) * 20 };
      }
    }
    return undefined;
  });
  assert.ok(O, 'une place dégagée sur la ferme');
  // Xéros à l'écart, à l'est (la visée refuse une pièce posée sur lui)
  const away = () =>
    page.evaluate(([ox, oy]) => {
      const w = (window as any).game.scene.getScene('world');
      w.player.actor.body.reset(Math.round((ox + 1650) / 5), Math.round((oy + 820) / 5));
      w.player.actor.face('down');
    }, [O!.x, O!.y] as const);
  await away();
  await sleep(300);

  const screen = (x: number, y: number) =>
    page.evaluate(([x, y]) => {
      const g = (window as any).game;
      const cam = g.scene.getScene('world').cameras.main;
      const rect = g.canvas.getBoundingClientRect();
      return { x: rect.left + (x - cam.worldView.x) * cam.zoom * (rect.width / g.scale.width), y: rect.top + (y - cam.worldView.y) * cam.zoom * (rect.height / g.scale.height) };
    }, [x, y] as const);
  /** La caméra centrée sur un point du monde (px), au zoom 2 par défaut : ce qu'on vise est à l'écran. */
  const look = (x: number, y: number, zoom = 2) =>
    page.evaluate(([x, y, z]) => {
      const cam = (window as any).game.scene.getScene('world').cameras.main;
      cam.setZoom(z);
      cam.centerOn(x, y);
      cam.preRender();
    }, [x, y, zoom] as const);
  const click = async (x: number, y: number, button: 'left' | 'right' = 'left') => {
    await look(x, y);
    const s = await screen(x, y);
    await page.mouse.move(s.x, s.y);
    await sleep(60);
    await page.mouse.click(s.x, s.y, { button });
    await sleep(110);
  };
  const send = (cmd: object) => page.evaluate((c) => (window as any).game.events.emit('build', c), cmd);
  // les pièces déjà posées sur la ferme à l'arrivée (la cabane du chasseur, posée depuis son plan) ne comptent pas
  let existing: Set<number> | undefined;
  const pieces = async () => {
    const all = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').map.builds.map((b: any) => b.piece))));
    existing ??= new Set(all.map((p: any) => p.id));
    return all.filter((p: any) => !existing!.has(p.id));
  };
  await pieces();
  const joints = async () =>
    (await page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').map.changes.joints)))).filter((j: any) => !existing?.has(j.a));

  /** Les pièces posées, par leur nom dans la liste. */
  const named = new Map<string, any>();
  const box = (s: ForgePiece) => ({ x: O!.x + (s.at ?? [s.x, s.y])[0], y: O!.y + (s.at ?? [s.x, s.y])[1], w: s.w, d: s.d });

  /**
   * Pose une pièce : prise au catalogue dans son sens, les crans montés (T), la souris sur le milieu de l'emprise visée (4 cm plus au
   * nord), vue à la hauteur de ce qui la porte à sa place (comme le fantôme), puis clic gauche. Vérifie sa place, sa hauteur, et,
   * pour une couche, que la pièce qu'elle recouvre a disparu.
   */
  const put = async (s: ForgePiece) => {
    await send({ kind: 'pick', piece: s.ref, ...(s.view ? { view: s.view } : {}), ...(s.natural ? { natural: s.natural } : {}) });
    for (let i = 0; i < (s.up ?? 0); i++) {
      await page.keyboard.press('KeyT');
      await sleep(30);
    }
    for (let i = 0; i < (s.down ?? 0); i++) {
      await page.keyboard.press('KeyG');
      await sleep(30);
    }
    // la hauteur où on la voit : le dessus de ce qui la porte (les pans de toit ne portent que le faîtage)
    const ridge = 'prop' in s.ref && s.ref.prop === 'earth-ridge';
    const S = await page.evaluate(
      async ([b, ridge]) => {
        const url = '/src/world/build.ts';
        const B = await import(url);
        const m = (window as any).game.scene.getScene('world').map;
        const roof = (q: any) => 'prop' in q.piece && /-roof/.test(q.piece.prop);
        return B.supportAt(m.builds.map((q: any) => q.piece).filter((q: any) => ridge || !roof(q)), b);
      },
      [box(s), ridge] as const,
    );
    const before = await pieces();
    const px = (O!.x + s.x + s.w / 2 + (s.aimX ?? 0)) / 5;
    const py = (O!.y + s.y + s.d / 2 - S - 4) / 5;
    // de près (zoom 6), pour que la souris tombe au centimètre près : la visée d'une pièce de 15 cm se joue à quelques centimètres
    await look(px, py, 6);
    let sp = await screen(px, py);
    await page.mouse.move(sp.x, sp.y);
    await sleep(40);
    // la souris là où on la veut : l'écart mesuré dans le monde, rattrapé
    for (let i = 0; i < 3; i++) {
      const e = await page.evaluate(([x, y]) => {
        const g = (window as any).game;
        const w = g.scene.getScene('world');
        const p = w.input.activePointer;
        const at = w.cameras.main.getWorldPoint(p.x, p.y);
        const rect = g.canvas.getBoundingClientRect();
        const k = w.cameras.main.zoom * (rect.width / g.scale.width);
        return { dx: (x - at.x) * k, dy: (y - at.y) * k };
      }, [px, py] as const);
      if (Math.abs(e.dx) < 0.5 && Math.abs(e.dy) < 0.5) break;
      sp = { x: sp.x + e.dx, y: sp.y + e.dy };
      await page.mouse.move(sp.x, sp.y);
      await sleep(40);
    }
    await sleep(40);
    // ce que montre le fantôme (pour le message, si la pièce n'est pas où elle doit)
    const readGhost = () =>
      page.evaluate(() => {
        const w = (window as any).game.scene.getScene('world');
        const a = w.builder.aim;
        const p = w.input.activePointer;
        const at = w.cameras.main.getWorldPoint(p.x, p.y);
        return { pointer: [at.x * 5, at.y * 5], aim: a && a.pieces.map((q: any) => [q.x, q.y, q.z]), why: a?.why };
      });
    let ghost = await readGhost();
    const seenGhosts = new Set<string>();
    // comme un joueur : si le fantôme ne montre pas la pièce à sa place (une bande de 10 cm, une huisserie de 15, hors de la grille de
    // 20 cm), la souris se déplace de quelques centimètres autour de la visée jusqu'à ce qu'il la montre, puis clic (chantier « maison-2 »)
    const want = s.at ?? [s.x, s.y];
    const right = (g: typeof ghost) => !!g.aim && !s.replaces && g.aim[0][0] === O!.x + want[0] && g.aim[0][1] === O!.y + want[1] && (s.z === undefined || g.aim[0][2] === s.z);
    if (!s.replaces && !right(ghost)) {
      const k = await page.evaluate(() => {
        const g = (window as any).game;
        const w = g.scene.getScene('world');
        const rect = g.canvas.getBoundingClientRect();
        return (w.cameras.main.zoom * (rect.width / g.scale.width)) / 5;
      });
      const steps = [-15, -10, -5, 0, 5, 10, 15];
      const tries = [...steps.map((d) => [d, 0]), ...steps.map((d) => [0, d]), ...steps.flatMap((a) => steps.map((b) => [a, b]))];
      // la souris seule, puis un cran plus bas (G) ou plus haut (T) avec elle : ce qu'offre le mode construction à un joueur
      let found = false;
      seenGhosts.clear();
      for (const crans of [0, -1, 1, -2]) {
        const key = crans < 0 ? 'KeyG' : 'KeyT';
        for (let i = 0; i < Math.abs(crans); i++) {
          await page.keyboard.press(key);
          await sleep(30);
        }
        for (const [dx, dy] of tries) {
          await page.mouse.move(sp.x + dx * k, sp.y + dy * k);
          await sleep(40);
          const g = await readGhost();
          seenGhosts.add(JSON.stringify([crans, g.aim?.[0]]));
          if (right(g)) {
            sp = { x: sp.x + dx * k, y: sp.y + dy * k };
            ghost = g;
            found = true;
            break;
          }
        }
        if (found) break;
        for (let i = 0; i < Math.abs(crans); i++) {
          await page.keyboard.press(crans < 0 ? 'KeyT' : 'KeyG');
          await sleep(30);
        }
      }
      if (!found) await page.mouse.move(sp.x, sp.y);
    }
    await page.mouse.click(sp.x, sp.y);
    await sleep(110);
    const list = await pieces();
    const p = list.find((q: any) => !before.some((o: any) => o.id === q.id));
    const seen = () => `visé en (${px * 5 - O!.x}, ${py * 5 - O!.y}), S ${S} ; souris ${ghost.pointer.map((v: number, i: number) => Math.round(v - (i ? O!.y : O!.x)))} ; fantôme ${JSON.stringify(ghost.aim?.map((q: number[]) => [q[0] - O!.x, q[1] - O!.y, q[2]]))} ${ghost.why ?? ''}`;
    if (seenGhosts.size && !(p && p.x - O!.x === (s.at ?? [s.x, s.y])[0] && p.y - O!.y === (s.at ?? [s.x, s.y])[1])) console.log(`  … ${s.name} : fantômes essayés ${[...seenGhosts].map((g) => { const [c, a] = JSON.parse(g); return a ? `${c}:${a[0] - O!.x},${a[1] - O!.y},${a[2]}` : `${c}:—`; }).join(' ')}`);
    assert.ok(p, `${s.name} : posée (${notices.at(-1) ?? ''} ; ${seen()})`);
    const at = s.at ?? [s.x, s.y];
    assert.deepEqual([p.x - O!.x, p.y - O!.y], at, `${s.name} : à sa place (${seen()})`);
    if (s.z !== undefined) assert.equal(p.z, s.z, `${s.name} : à ${s.z} cm`);
    if (s.view !== undefined) assert.equal(p.view, s.view, `${s.name} : dans son sens`);
    if (s.replaces) {
      const under = named.get(s.replaces);
      assert.ok(under, `${s.name} : la pièce recouverte, ${s.replaces}`);
      assert.ok(!list.some((q: any) => q.id === under.id), `${s.name} : remplace ${s.replaces}`);
      assert.equal(list.length, before.length, `${s.name} : une pièce pour une`);
      assert.deepEqual([p.x, p.y, p.z], [under.x, under.y, under.z], `${s.name} : à la place de ${s.replaces}`);
    } else assert.equal(list.length, before.length + 1, `${s.name} : une pièce de plus`);
    named.set(s.name, p);
  };
  /** L'assemblage `type` posé d'un clic sur la jonction de deux pièces, là où on la voit. */
  const joint = async (type: string, an: string, bn: string) => {
    const a = named.get(an);
    const b = named.get(bn);
    assert.ok(a && b, `${type} : ${an}, ${bn}`);
    await send({ kind: 'pick-joint', joint: type });
    const pt = await page.evaluate(async ([ia, ib]) => {
      const url = '/src/world/joints.ts';
      const J = await import(url);
      const m = (window as any).game.scene.getScene('world').map;
      const ps = m.builds.map((q: any) => q.piece);
      const shift = (q: any) => m.shownOffset(q);
      const ours = (q: any) => q && ((q.a.id === ia && q.b.id === ib) || (q.a.id === ib && q.b.id === ia));
      const j = J.junctions(ps, shift).find(ours);
      if (!j) return undefined;
      // une autre jonction au même point (l'enture de deux traverses sous un poteau) : on clique un peu à côté, là où la nôtre est la
      // plus proche
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2], [2, -2], [-2, 2]]) {
        if (ours(J.junctionAt(ps, j.x + dx, j.y + dy, 8, shift))) return { x: j.x + dx, y: j.y + dy, type: j.type, why: j.why };
      }
      return { x: j.x, y: j.y, type: j.type, why: j.why };
    }, [a.id, b.id] as const);
    assert.ok(pt, `${type} : une jonction entre ${an} et ${bn}`);
    const n = (await joints()).length;
    await click(pt!.x, pt!.y);
    assert.equal((await joints()).length, n + 1, `${type} entre ${an} et ${bn} : posé (${pt!.type ?? '—'} ${pt!.why ?? ''} ; ${notices.at(-1) ?? ''})`);
    // le mi-bois a pu faire descendre une des deux pièces
    const all = await pieces();
    for (const [k, v] of named) {
      const q = all.find((o: any) => o.id === v.id);
      if (q) named.set(k, q);
    }
  };
  /** Retire une pièce (une cale) d'un clic droit sur son image. */
  const remove = async (name: string) => {
    const p = named.get(name);
    await send({ kind: 'none' });
    const at = await page.evaluate((id) => {
      const b = (window as any).game.scene.getScene('world').map.builds.find((q: any) => q.piece.id === id);
      const r = b.image.getBounds();
      return { x: r.centerX, y: r.centerY };
    }, p.id);
    await click(at.x, at.y, 'right');
    assert.ok(!(await pieces()).some((q: any) => q.id === p.id), `${name} : retirée (${notices.at(-1) ?? ''})`);
    named.delete(name);
  };

  // les étapes de montage : une capture par étape, cadrée sur la maison, Xéros à l'est
  const shots: { name: string; png: PNG }[] = [];
  const L = -120, T = -900, R = 1800, B = 900;
  const frame = async (name: string) => {
    // en mode construction, rien en main (hors du mode, une commande de construction le rouvrirait)
    if ((await page.evaluate(() => (window as any).game.scene.getScene('world').mode)) === 'build') await send({ kind: 'none' });
    await page.mouse.move(5, 5);
    await sleep(200);
    const clip = await page.evaluate(([ox, oy, L, T, R, B]) => {
      const g = (window as any).game;
      const w = g.scene.getScene('world');
      w.player.actor.body.reset(Math.round((ox + 1650) / 5), Math.round((oy + 820) / 5));
      w.player.actor.face('down');
      // pour la capture seulement : les objets de la carte (arbres) dont l'image passe devant la maison sont cachés
      const l = (ox + L) / 5, t = (oy + T) / 5, r = (ox + R) / 5, b = (oy + B) / 5;
      for (const p of w.map.props) {
        const bb = p.image.getBounds();
        if (bb.right > l && bb.left < r && bb.bottom > t && bb.top < b) for (const part of p.parts ?? [p.image]) part.setVisible?.(false);
      }
      const cam = w.cameras.main;
      // sans l'interface (les messages) ni la caméra qui suit Xéros : la maison seule
      g.scene.getScene('hud').cameras.main.setVisible(false);
      cam.stopFollow();
      cam.setZoom(2);
      cam.centerOn((l + r) / 2, (t + b) / 2);
      cam.preRender();
      const rect = g.canvas.getBoundingClientRect();
      const k = cam.zoom * (rect.width / g.scale.width);
      const at = (x: number, y: number) => ({ x: rect.left + (x - cam.worldView.x) * k, y: rect.top + (y - cam.worldView.y) * k });
      const a = at(l, t);
      const c = at(r, b);
      return { x: Math.max(0, Math.round(a.x)), y: Math.max(0, Math.round(a.y)), w: Math.round(c.x - a.x), h: Math.round(c.y - a.y) };
    }, [O!.x, O!.y, L, T, R, B] as const);
    await sleep(250);
    const buf = await page.screenshot({ clip: { x: clip.x, y: clip.y, width: Math.min(clip.w, 1280 - clip.x), height: Math.min(clip.h, 720 - clip.y) } });
    shots.push({ name, png: PNG.sync.read(buf) });
    await page.evaluate(() => {
      const w = (window as any).game.scene.getScene('world');
      (window as any).game.scene.getScene('hud').cameras.main.setVisible(true);
      if (w.mode === 'play') w.cameras.main.startFollow(w.player.actor, true, 1, 1);
    });
    await away();
  };

  // l'âge du bois, réglé au catalogue (vieux, gris) : toutes les pièces de bois le prennent, le plan le fixe
  await send({ kind: 'age', age: 'old' });

  for (const s of forgeSteps()) {
    if (s.kind === 'piece') await put(s);
    else if (s.kind === 'joint') await joint(s.type, s.a, s.b);
    else if (s.kind === 'remove') await remove(s.name);
    else await frame(s.name);
  }
  const built = await pieces();

  // enregistrée comme plan : la zone de toute la forge (l'atelier, l'abri, le puits)
  await send({ kind: 'select' });
  await look((O!.x + 700) / 5, (O!.y + 360) / 5, 1.5);
  const a = await screen((O!.x - 80) / 5, (O!.y - 80) / 5);
  const b = await screen((O!.x + 1520) / 5, (O!.y + 800) / 5);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await sleep(150);
  await send({ kind: 'save-plan', name: 'Forge' });
  for (let i = 0; i < 50 && mtimeOf(PLAN_FILE) <= PLAN_BEFORE; i++) await sleep(100);
  assert.ok(mtimeOf(PLAN_FILE) > PLAN_BEFORE, `la forge est enregistrée dans ${PLAN_FILE} (${notices.at(-1) ?? ''})`);
  const plan = JSON.parse(readFileSync(PLAN_FILE, 'utf8'));
  if (!process.env.PLANS_WRITE) assert.deepEqual(plan, JSON.parse(readFileSync(COMMITTED, 'utf8')), `le plan bâti est celui de ${COMMITTED} (PLANS_WRITE=1 pour le mettre à jour)`);
  assert.equal(plan.pieces.length, built.length, 'toutes les pièces sont dans le plan');
  assert.equal(plan.joints.length, (await joints()).length, 'et tous les assemblages');
  // seulement des pièces du catalogue : des poutres du normal (équarries, 5,80 m au plus) et les éléments et meubles de la forge
  for (const p of plan.pieces) {
    if ('wood' in p.piece) assert.ok(p.piece.wood.size === 'normal' && p.piece.wood.hewn === 12 && p.piece.wood.length <= 580, JSON.stringify(p.piece));
    else assert.match(p.piece.prop, PROPS, JSON.stringify(p.piece));
  }
  assert.equal(plan.age, 'old', "le plan fixe l'âge de toutes ses pièces de bois (vieux, gris)");
  for (const p of plan.pieces) assert.ok(!p.age && !('wood' in p.piece && p.piece.wood.age), `l'âge est celui du plan, pas de la pièce : ${JSON.stringify(p)}`);
  // le coin nord-ouest de l'emprise du poteau nord-ouest dans le repère du plan (pour poser le plan sur la carte)
  const ox = Math.min(...built.map((p: any) => p.x));
  const oy = Math.min(...built.map((p: any) => p.y));
  const origin = [O!.x - ox, O!.y - oy];

  // hors du mode construction : l'atelier est un abri ouvert, pas un bâtiment où l'on entre
  await page.keyboard.press('KeyB');
  await page.waitForFunction(() => (window as any).game.scene.getScene('world').mode === 'play', null, { timeout: 5000 });
  const mine = (x: number, y: number) => x >= O!.x - 100 && x <= O!.x + 1600 && y >= O!.y - 100 && y <= O!.y + 900;
  const buildings: any[] = ((await page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').interiors.buildings())))) as any[]).filter((q) => mine(q.room.x, q.room.y));
  assert.equal(buildings.length, 0, `l'atelier est ouvert au sud : pas un bâtiment où l'on entre (${JSON.stringify(buildings.map((q) => q.room))})`);

  const stand = async (x: number, y: number, facing: string) => {
    await page.evaluate(([x, y, f]) => {
      const w = (window as any).game.scene.getScene('world');
      w.player.actor.body.reset(x, y);
      w.player.actor.face(f);
    }, [x, y, facing] as const);
  };
  /** L'opacité des pans de l'atelier et ce qu'on voit de la lueur de la forge (0 : cachée, 1 : entière). */
  const seen = () =>
    page.evaluate(([south, north, hearth]) => {
      const m = (window as any).game.scene.getScene('world').map;
      const at = (id: number) => m.builds.find((q: any) => q.piece.id === id);
      const glows = (at(hearth).parts ?? []).filter((p: any) => p.light).map((p: any) => p.obj.getData('cover') as number);
      return { south: at(south).image.alpha as number, north: at(north).image.alpha as number, glow: glows.length ? Math.min(...glows) : -1 };
    }, [named.get('pan sud').id, named.get('pan nord').id, named.get('forge').id] as const);
  // dehors, devant l'atelier : le toit opaque, la lueur cachée
  await stand(Math.round((O!.x + 440) / 5), Math.round((O!.y + 760) / 5), 'up');
  await page.evaluate(() => (window as any).__until(() => (window as any).game.scene.getScene('world').map.builds.every((b: any) => b.image.alpha === 1), 'le toit opaque, Xéros dehors'));
  const out = await seen();
  assert.ok(out.glow >= 0, 'la forge a sa lueur');
  assert.equal(out.glow, 0, `dehors, la lueur de la forge est cachée sous le toit (${JSON.stringify(out)})`);
  // dessous, devant la forge : les pans s'effacent, la lueur se voit
  await stand(Math.round((O!.x + HEARTH[0] + 110) / 5), Math.round((O!.y + HEARTH[1] + 220) / 5), 'up');
  await page.evaluate(([s, n]) => {
    const m = (window as any).game.scene.getScene('world').map;
    const a = (id: number) => m.builds.find((q: any) => q.piece.id === id).image.alpha;
    return (window as any).__until(() => a(s) < 1 && a(n) < 1 && a(s) === a(n) && m.builds.find((q: any) => q.piece.id === s).image.alpha <= 0.5, 'les pans effacés, Xéros sous le toit');
  }, [named.get('pan sud').id, named.get('pan nord').id] as const);
  const under = await seen();
  assert.ok(under.glow > 0, `dessous, la lueur de la forge se voit (${JSON.stringify(under)})`);

  // .art-preview/forge.png : les étapes de montage, trois par rangée
  const per = 3;
  const gap = 4;
  const rows: { name: string; png: PNG }[][] = [];
  for (let i = 0; i < shots.length; i += per) rows.push(shots.slice(i, i + per));
  const W = Math.max(...rows.map((row) => row.reduce((s, x) => s + x.png.width + gap, gap)));
  const H = rows.reduce((s, row) => s + Math.max(...row.map((x) => x.png.height)) + gap, gap);
  const sheet = new PNG({ width: W, height: H });
  sheet.data.fill(0x14);
  let y = gap;
  for (const row of rows) {
    let x = gap;
    for (const s of row) {
      PNG.bitblt(s.png, sheet, 0, 0, s.png.width, s.png.height, x, y);
      x += s.png.width + gap;
    }
    y += Math.max(...row.map((s) => s.png.height)) + gap;
  }
  writeFileSync('.art-preview/forge.png', PNG.sync.write(sheet));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  const secs = Math.round((Date.now() - START) / 1000);
  console.log(
    `  ✓ forge : ${built.length} pièces, ${plan.joints.length} assemblages, enregistrée dans ${PLAN_FILE} ; le coin nord-ouest du poteau nord-ouest à (${origin}) cm de l'origine du plan ; un abri ouvert, le toit s'efface dessous ; ${shots.length} captures dans .art-preview/forge.png ; ${secs} s`,
  );
}, { speed: 1 }); // x1 : bâtir dans le mode construction ne demande pas de temps de jeu, et x10 alourdit chaque image
