// La maison de Xéros et de sa mère, bâtie dans le mode construction (règle de Grégoire : un bâtiment est validé quand on réussit à le
// bâtir dans le mode construction, par un scénario, uniquement avec les pièces du catalogue, puis à l'enregistrer comme plan ;
// CONCEPTION « La maison de Xéros »). Dans le vrai jeu (tools/lib/playtest.ts), à la vraie souris et au vrai clavier : chaque pièce
// prise au catalogue (BuildCommand), visée à la souris, posée d'un clic ; chaque assemblage posé d'un clic sur sa jonction ; les cales
// retirées d'un clic droit. La liste des pièces, dans l'ordre du montage : tools/lib/maison-xeros.ts.
//   - le bois patiné (l'âge réglé au catalogue, fixé par le plan) ;
//   - 12,80 × 6,40 m entre les axes des poteaux : le solin (50 cm sous les murs, 30 sous les cloisons, le seuil de pierre sous la porte
//     d'entrée), la traverse basse, les poteaux tous les 1,60 m, les remplissages montés couche par couche (palançons, clayonnage,
//     torchis, chaux : chaque couche remplace la précédente), la porte d'entrée et les trois portes intérieures entre leurs jambages,
//     sept fenêtres et leurs volets, les sablières, les entraits des deux fermes, les pignons (le trou de fumée à l'ouest), les deux
//     pans de chaume (chevronnage, demi couvert, plein : chacun remplace le précédent), le faîtage de terre ;
//   - dedans : l'âtre de la cheminée (sa hotte, son manteau, son conduit jusqu'au-dessus du faîte, par le pan nord percé), la table et le banc, la jarre, deux sacs au cagibi, le lit, le coffre et l'établi de la mère (une demi-bille sur quatre pieds en perche, ses tenons) (la paillasse, les
//     outils, la corde, le tas de bois et le seau sont des objets de la carte : ils ne sont pas au plan) ;
//   - la zone enregistrée comme plan : src/content/plans/maison-xeros.json (le plan s'écrit dans un dossier temporaire et se compare au
//     plan commité ; PLANS_WRITE=1 le réécrit) ;
//   - l'intérieur : un bâtiment de quatre pièces, une entrée (la porte d'entrée, ouverte avec E) ; Xéros entre, passe d'une pièce à
//     l'autre par les portes intérieures (ouvertes avec E), sans changer de carte ; la cloison est-ouest est en coupe ;
//   - .art-preview/maison-xeros.png : la maison montée étape par étape, puis finie à côté de Xéros, puis l'intérieur.
// Usage : npm run test:maison.

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { playtest } from './lib/playtest';
import { maisonSteps, SILL_NW, type PieceStep } from './lib/maison-xeros';

/** Le plan commité (le contenu du jeu) ; le scénario écrit le sien dans un dossier temporaire et le compare, sauf avec PLANS_WRITE=1. */
const COMMITTED = 'src/content/plans/maison-xeros.json';
// le dossier des plans écrits : celui du banc partagé (tools/run-scenarios.ts, son serveur l'écrit), sinon un dossier temporaire à soi
const OUT_DIR = process.env.PLANS_WRITE ? 'src/content/plans' : (process.env.XEROS_PLANS_OUT ?? mkdtempSync(join(tmpdir(), 'xeros-plans-')));
process.env.XEROS_PLANS_OUT = OUT_DIR;
const PLAN_FILE = `${OUT_DIR}/maison-xeros.json`;
const mtimeOf = (f: string) => (existsSync(f) ? statSync(f).mtimeMs : 0);
const PLAN_BEFORE = mtimeOf(PLAN_FILE);
/** Les pièces du catalogue dont la maison est faite (outre la pièce de bois, une poutre du normal). */
const PROPS = /^(rough-sill-wall|narrow-sill-wall|threshold-stone|(staves|wattle|daub|lime)-(panel|window-panel|jamb|door-head)|door-frame|inner-threshold-stone|cottage-door|inner-door|plank-shutter|lime-gable|thatch-roof-frame|thatch-roof-half|thatch-roof|thatch-roof-pierced|earth-ridge|stone-hearth|chimney-hood|chimney-flue|chimney-cap|table|bench|jar|sack|bed|chest)$/;
const START = Date.now();

await playtest('maison', async ({ page, errors, load }) => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  // deux pas de jeu joués : ce qu'on vient de faire (la souris, une touche) est lu et le fantôme suit ; sous la charge, une pause fixe
  // peut passer sans qu'aucun pas ne soit joué (le pas de jeu fixe, src/world/timeStep.ts)
  const stepped = () => page.evaluate(() => (window as any).__steps(2));
  await load('?construire&dieu&reset');
  await page.keyboard.press('KeyB');
  await sleep(150);
  await page.evaluate(() => (window as any).__restart({ kind: 'map', map: 'ferme' }));
  await page.keyboard.press('KeyB');
  await sleep(150);
  const notices: string[] = [];
  await page.exposeFunction('noticed', (t: string) => notices.push(t));
  await page.evaluate(() => (window as any).game.events.on('notice', (t: string) => (window as any).noticed(t)));

  // l'origine (l'axe du poteau nord-ouest, en cm, sur la grille) : une place dégagée de 18 × 8 m (la maison, ses cales, Xéros à l'est)
  const O = await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const m = w.map;
    const px = w.player.actor;
    // assez loin du bord nord : la souris visant un dessus haut (le pignon, 6 m) est loin au nord de la pièce, la caméra ne doit pas
    // buter contre le bord (le point visé serait sous le bandeau du haut)
    for (let y = 240; y < m.height - 220; y += 8) for (let x = 200; x < m.width - 480; x += 8) {
      if (Math.hypot(x + 130 - px.x, y + 60 - px.y) > 200 && m.areaFree({ left: x - 64, top: y - 24, right: x + 336, bottom: y + 156 })) {
        w.cameras.main.setZoom(2);
        w.cameras.main.centerOn(x + 130, y + 40 - (w.lifts?.liftAt?.(x + 130, y + 40) ?? 0));
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
      w.player.actor.body.reset(Math.round((ox + 1560) / 5), Math.round((oy + 700) / 5));
      w.player.actor.face('down');
    }, [O!.x, O!.y] as const);
  await away();
  await sleep(300);

  const screen = (x: number, y: number) =>
    page.evaluate(([x, y]) => {
      const g = (window as any).game;
      const cam = g.scene.getScene('world').cameras.main;
      const rect = g.canvas.getBoundingClientRect();
      return { x: rect.left + (x - cam.worldView.x) * cam.zoom * (rect.width / g.scale.width), y: rect.top + (y - ((window as any).game.scene.getScene('world').lifts?.liftAt?.(x, y) ?? 0) - cam.worldView.y) * cam.zoom * (rect.height / g.scale.height) };
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
    // le clic joué : la file des clics du mode construction (systems/build.ts) vidée par un pas de jeu ; sous la charge, ce pas peut venir
    // après la pause (un clic n'est jamais perdu, il attend son pas)
    await page.evaluate(() => (window as any).__until(() => !(window as any).game.scene.getScene('world').builder?.clicks?.length, 'le clic joué'));
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
  const box = (s: PieceStep) => ({ x: O!.x + (s.at ?? [s.x, s.y])[0], y: O!.y + (s.at ?? [s.x, s.y])[1], w: s.w, d: s.d });

  /**
   * Pose une pièce : prise au catalogue dans son sens, les crans montés (T), la souris sur le milieu de l'emprise visée (4 cm plus au
   * nord), vue à la hauteur de ce qui la porte à sa place (comme le fantôme), puis clic gauche. Vérifie sa place, sa hauteur, et,
   * pour une couche, que la pièce qu'elle recouvre a disparu.
   */
  const put = async (s: PieceStep) => {
    await send({ kind: 'pick', piece: s.ref, ...(s.view ? { view: s.view } : {}) });
    for (let i = 0; i < (s.up ?? 0); i++) {
      await page.keyboard.press('KeyT');
      await sleep(30);
      await stepped();
    }
    for (let i = 0; i < (s.down ?? 0); i++) {
      await page.keyboard.press('KeyG');
      await sleep(30);
      await stepped();
    }
    // la hauteur où on la voit : le dessus de ce qui la porte (les pans de toit ne portent que le faîtage)
    const ridge = 'prop' in s.ref && s.ref.prop === 'earth-ridge';
    const S = await page.evaluate(
      async ([b, ridge]) => {
        const url = '/src/world/build.ts';
        const B = await import(url);
        const m = (window as any).game.scene.getScene('world').map;
        const roof = (q: any) => 'prop' in q.piece && /thatch-roof|earth-ridge/.test(q.piece.prop);
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
    await stepped();
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
      await stepped();
    }
    await sleep(40);
    await stepped();
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
          await stepped();
        }
        for (const [dx, dy] of tries) {
          await page.mouse.move(sp.x + dx * k, sp.y + dy * k);
          await sleep(40);
          await stepped();
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
          await stepped();
        }
      }
      if (!found) await page.mouse.move(sp.x, sp.y);
    }
    await page.mouse.click(sp.x, sp.y);
    await sleep(110);
    // le clic joué : la file des clics du mode construction vidée par un pas de jeu
    await page.evaluate(() => (window as any).__until(() => !(window as any).game.scene.getScene('world').builder?.clicks?.length, 'le clic joué'));
    await stepped();
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
  const L = -100, T = -820, R = 1720, B = 760;
  const frame = async (name: string) => {
    // en mode construction, rien en main (hors du mode, une commande de construction le rouvrirait)
    if ((await page.evaluate(() => (window as any).game.scene.getScene('world').mode)) === 'build') await send({ kind: 'none' });
    await page.mouse.move(5, 5);
    await sleep(200);
    const clip = await page.evaluate(([ox, oy, L, T, R, B]) => {
      const g = (window as any).game;
      const w = g.scene.getScene('world');
      w.player.actor.body.reset(Math.round((ox + 1500) / 5), Math.round((oy + 700) / 5));
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
      const at = (x: number, y: number) => ({ x: rect.left + (x - cam.worldView.x) * k, y: rect.top + (y - ((window as any).game.scene.getScene('world').lifts?.liftAt?.(x, y) ?? 0) - cam.worldView.y) * k });
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

  // l'âge du bois, réglé au catalogue (patiné) : toutes les pièces de bois le prennent, le plan le fixe
  await send({ kind: 'age', age: 'worn' });

  for (const s of maisonSteps()) {
    if (s.kind === 'piece') await put(s);
    else if (s.kind === 'joint') await joint(s.type, s.a, s.b);
    else if (s.kind === 'remove') await remove(s.name);
    else await frame(s.name);
  }
  const built = await pieces();

  // enregistrée comme plan : la zone de toute la maison
  await send({ kind: 'select' });
  await look((O!.x + 640) / 5, (O!.y + 320) / 5);
  const a = await screen((O!.x - 80) / 5, (O!.y - 100) / 5);
  const b = await screen((O!.x + 1380) / 5, (O!.y + 740) / 5);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await sleep(150);
  await send({ kind: 'save-plan', name: 'Maison Xéros' });
  for (let i = 0; i < 50 && mtimeOf(PLAN_FILE) <= PLAN_BEFORE; i++) await sleep(100);
  assert.ok(mtimeOf(PLAN_FILE) > PLAN_BEFORE, `la maison est enregistrée dans ${PLAN_FILE} (${notices.at(-1) ?? ''})`);
  const plan = JSON.parse(readFileSync(PLAN_FILE, 'utf8'));
  if (!process.env.PLANS_WRITE) assert.deepEqual(plan, JSON.parse(readFileSync(COMMITTED, 'utf8')), `le plan bâti est celui de ${COMMITTED} (PLANS_WRITE=1 pour le mettre à jour)`);
  assert.equal(plan.pieces.length, built.length, 'toutes les pièces sont dans le plan');
  assert.equal(plan.joints.length, (await joints()).length, 'et tous les assemblages');
  // seulement des pièces du catalogue : des poutres du normal (équarries, 5,80 m au plus), l'établi (une demi-bille du gros, des perches
  // rondes debout) et les éléments de la chaumière
  const bench = (w: any) => (w.size === 'big' && w.shape === 'half' && !w.hewn) || (w.size === 'pole' && w.shape === 'round' && w.axis === 'up');
  for (const p of plan.pieces) {
    if ('wood' in p.piece) assert.ok((p.piece.wood.size === 'normal' && p.piece.wood.hewn === 12 && p.piece.wood.length <= 580) || bench(p.piece.wood), JSON.stringify(p.piece));
    else assert.match(p.piece.prop, PROPS, JSON.stringify(p.piece));
  }
  assert.equal(plan.age, 'worn', "le plan fixe l'âge de toutes ses pièces de bois (patiné)");
  for (const p of plan.pieces) assert.ok(!p.age && !('wood' in p.piece && p.piece.wood.age), `l'âge est celui du plan, pas de la pièce : ${JSON.stringify(p)}`);
  // le coin nord-ouest du solin dans le repère du plan (pour poser le plan sur la carte)
  const ox = Math.min(...built.map((p: any) => p.x));
  const oy = Math.min(...built.map((p: any) => p.y));
  const sill = [O!.x + SILL_NW[0] - ox, O!.y + SILL_NW[1] - oy];

  // l'intérieur : hors du mode construction, le bâtiment de la maison (la ferme a déjà la cabane du chasseur)
  await page.keyboard.press('KeyB');
  await page.waitForFunction(() => (window as any).game.scene.getScene('world').mode === 'play', null, { timeout: 5000 });
  const mine = (x: number, y: number) => x >= O!.x - 100 && x <= O!.x + 1400 && y >= O!.y - 100 && y <= O!.y + 760;
  const buildings: any[] = ((await page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').interiors.buildings())))) as any[]).filter((q) => mine(q.room.x, q.room.y));
  assert.equal(buildings.length, 1, 'la maison est un bâtiment où l’on entre');
  const house = buildings[0];
  assert.equal(house.rooms.length, 4, `quatre pièces (${JSON.stringify(house.rooms)})`);
  assert.equal(house.entrances.length, 1, 'une entrée');
  const entrance = house.entrances[0];
  assert.equal(entrance.side, 'south', "l'entrée au sud");
  assert.equal(entrance.door, named.get("porte d'entrée").id, "l'entrée est la porte d'entrée");
  // la cloison est-ouest (y = 320) en coupe, comme le mur sud
  const cutIds = new Set(house.southPieces.map((p: any) => p.id));
  assert.ok(named.get('lime remplissage cloison y=320 0') && cutIds.has(named.get('lime remplissage cloison y=320 0').id), 'la cloison est-ouest est en coupe');
  assert.ok(!cutIds.has(named.get('lime remplissage cloison x=320 0').id), 'la cloison nord-sud reste entière');

  const stand = async (x: number, y: number, facing: string) => {
    await page.evaluate(([x, y, f]) => {
      const w = (window as any).game.scene.getScene('world');
      w.player.actor.body.reset(x, y);
      w.player.actor.face(f);
    }, [x, y, facing] as const);
    await sleep(150);
  };
  const mapId = () => page.evaluate(() => (window as any).game.scene.getScene('world').map.def.id as string);
  const feet = () => page.evaluate(() => {
    const a = (window as any).game.scene.getScene('world').player.actor;
    return { x: a.x * 5, y: a.y * 5 };
  });
  const propOf = (name: string) =>
    page.evaluate((id) => (window as any).game.scene.getScene('world').map.builds.find((q: any) => q.piece.id === id)?.piece.piece.prop, named.get(name).id);

  // la porte d'entrée, fermée ; E l'ouvre ; Xéros entre
  const outside = { x: Math.round(entrance.outside.x / 5), y: Math.round(entrance.outside.y / 5) };
  await stand(outside.x, outside.y, 'up');
  await page.keyboard.press('KeyE');
  await sleep(300);
  assert.equal(await propOf("porte d'entrée"), 'cottage-door-open', `E ouvre la porte d'entrée (${notices.at(-1) ?? ''})`);
  // dehors : la maison finie, la porte ouverte, Xéros à côté (assez loin pour que le toit ne s'efface pas)
  await stand(Math.round((O!.x + 1500) / 5), Math.round((O!.y + 700) / 5), 'down');
  await sleep(900);
  await frame('la maison finie, la porte ouverte');
  const where = () =>
    page.evaluate(() => {
      const w = (window as any).game.scene.getScene('world');
      const a = w.player.actor;
      return `${w.map.def.id} (${Math.round(a.x * 5)}, ${Math.round(a.y * 5)}) ${w.mode}`;
    });
  // marche jusqu'à la carte `ok` (le début de son nom), puis attend la fin du fondu
  const walkTo = async (key: string, ok: string) => {
    await page.keyboard.down(key);
    try {
      await page.waitForFunction((want) => (window as any).game.scene.getScene('world')?.map?.def?.id?.startsWith(want), ok, { timeout: 20000, polling: 'raf' });
    } catch {
      await page.keyboard.up(key);
      assert.fail(`on n'arrive pas sur ${ok} : ${await where()} (${notices.at(-1) ?? ''})`);
    }
    await page.keyboard.up(key);
    await page.waitForFunction(() => (window as any).game.scene.getScene('world')?.mode === 'play', null, { timeout: 15000, polling: 'raf' });
    await sleep(300);
  };
  await stand(outside.x, outside.y, 'up');
  await walkTo('KeyW', 'interieur:');
  const inside = await mapId();
  // la vue intérieure est une carte à elle : ses pièces décalées de `shift` (cm) depuis la carte du dehors
  const interior = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').interior)));
  const shift = interior.shift as { x: number; y: number };
  const rooms = house.rooms.map((q: any) => ({ ...q, x: q.x + shift.x, y: q.y + shift.y }));

  // d'une pièce à l'autre : chaque porte intérieure, fermée, s'ouvre avec E (Xéros devant elle, du côté de la salle), puis il passe ;
  // le cagibi n'a pas de porte : sa baie, sous sa tête de baie, se passe tout droit
  assert.ok(!named.has('porte cloison x=320 160'), "le cagibi n'a pas de porte");
  const doors: [string, number, string, string][] = [
    ['lime tête cloison x=320 160', -1, 'le cagibi', 'KeyA'],
    ['porte cloison x=320 320', -1, 'le coin de Xéros', 'KeyA'],
    ['porte cloison x=960 320', 1, "l'atelier de la mère", 'KeyD'],
  ];
  for (const [name, dir, room, key] of doors) {
    const door = { x: named.get(name).x + shift.x, y: named.get(name).y + shift.y };
    const sx = dir < 0 ? door.x + 45 : door.x - 40;
    // le corps de Xéros est au-dessus de ses pieds (le point du personnage) : les pieds 30 cm sous le milieu de la porte, le corps dans la baie
    await stand(Math.round(sx / 5), Math.round((door.y + 70) / 5), dir < 0 ? 'left' : 'right');
    if (!name.includes('tête')) {
      await page.keyboard.press('KeyE');
      await sleep(300);
      assert.equal(await propOf(name), 'inner-door-open', `E ouvre ${name} (${notices.at(-1) ?? ''} ; ${await where()})`);
    }
    // il marche jusqu'à la pièce d'à côté, sans changer de carte
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(([x, d]) => {
        const a = (window as any).game.scene.getScene('world').player.actor;
        return d < 0 ? a.x * 5 < x : a.x * 5 > x;
      }, [dir < 0 ? door.x - 60 : door.x + 70, dir] as const, { timeout: 8000, polling: 'raf' });
    } catch {
      await page.keyboard.up(key);
      assert.fail(`vers ${room}, par ${name} : Xéros ne passe pas (${await where()})`);
    }
    await page.keyboard.up(key);
    await sleep(200);
    assert.equal(await mapId(), inside, `vers ${room} : la même carte`);
    const f = await feet();
    const rr = rooms.find((r: any) => f.x >= r.x && f.x <= r.x + r.w && f.y >= r.y && f.y <= r.y + r.d);
    assert.ok(rr && (dir < 0 ? rr.x + rr.w <= door.x + 20 : rr.x >= door.x - 20), `Xéros est dans ${room} (${JSON.stringify(f)} ; ${JSON.stringify(rooms)})`);
  }

  // dedans : toute la maison, Xéros dans l'atelier de sa mère
  const r = interior.room;
  const inShot = await page.evaluate(([x0, y0, x1, y1]) => {
    (window as any).game.scene.getScene('hud').cameras.main.setVisible(false);
    const cam = (window as any).game.scene.getScene('world').cameras.main;
    cam.stopFollow();
    cam.setZoom(2);
    cam.centerOn((x0 + x1) / 2, (y0 + y1) / 2);
    return null;
  }, [(r.x - 100) / 5, (r.y - 300) / 5, (r.x + r.w + 100) / 5, (r.y + r.d + 100) / 5] as const);
  void inShot;
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
  }, [(r.x - 100) / 5, (r.y - 300) / 5, (r.x + r.w + 100) / 5, (r.y + r.d + 100) / 5] as const);
  shots.push({ name: "l'intérieur", png: PNG.sync.read(Buffer.from(url.split(',')[1], 'base64')) });

  // .art-preview/maison-xeros.png : les étapes de montage, quatre par rangée, la maison finie, puis l'intérieur
  const per = 4;
  const gap = 4;
  const rows: { name: string; png: PNG }[][] = [];
  for (let i = 0; i < shots.length; i += per) rows.push(shots.slice(i, i + per));
  const W = Math.max(...rows.map((row) => row.reduce((s, x) => s + x.png.width + gap, gap)));
  const H = rows.reduce((s, row) => s + Math.max(...row.map((x) => x.png.height)) + gap, gap);
  const out = new PNG({ width: W, height: H });
  out.data.fill(0x14);
  let y = gap;
  for (const row of rows) {
    let x = gap;
    for (const s of row) {
      PNG.bitblt(s.png, out, 0, 0, s.png.width, s.png.height, x, y);
      x += s.png.width + gap;
    }
    y += Math.max(...row.map((s) => s.png.height)) + gap;
  }
  writeFileSync('.art-preview/maison-xeros.png', PNG.sync.write(out));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  const secs = Math.round((Date.now() - START) / 1000);
  console.log(
    `  ✓ maison : ${built.length} pièces, ${plan.joints.length} assemblages, enregistrée dans ${PLAN_FILE} ; le coin nord-ouest du solin à (${sill}) cm de l'origine du plan ; quatre pièces, une entrée ; ${shots.length} captures dans .art-preview/maison-xeros.png ; ${secs} s`,
  );
}, { speed: 1 }); // x1 : bâtir dans le mode construction ne demande pas de temps de jeu, et x10 alourdit chaque image
