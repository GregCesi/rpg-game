// La maison du coq, bâtie dans le mode construction (règle de Grégoire : un bâtiment est validé quand on réussit à le bâtir dans le
// mode construction, par un scénario, uniquement avec les pièces du catalogue, puis à l'enregistrer comme plan ; CONCEPTION « La maison
// du coq », CADRAGE-coq.md section 12). Dans le vrai jeu (tools/lib/playtest.ts), à la vraie souris et au vrai clavier, comme la maison
// de Xéros (tools/test-maison.ts) : chaque pièce prise au catalogue, visée à la souris (le point vu, sur ce qui la portera), posée d'un
// clic ; la liste des pièces, dans l'ordre du montage : tools/lib/maison-coq.ts (le rez-de-chaussée meublé, ses murs d'assises de
// pierre de taille, le plancher sur ses muraillères et ses chevêtres, l'étage meublé, ses murs, le toit de laves).
//   - la zone enregistrée comme plan : src/content/plans/maison-coq.json (comparé au plan commité ; PLANS_WRITE=1 le réécrit) ;
//   - aucune pièce au-dessus du vide (validate.ts le vérifie aussi sur le plan) ;
//   - l'intérieur : un seul bâtiment, deux niveaux (0 et 283), une entrée, la porte en arc ;
//   - .art-preview/maison-coq.png : la maison montée étape par étape, puis finie.
// Usage : npm run test:maison-coq.

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { playtest } from './lib/playtest';
import { coqSteps, type PieceStep } from './lib/maison-coq';
import { overhangs } from '../src/world/overhang';

/** Le plan commité (le contenu du jeu) ; le scénario écrit le sien dans un dossier temporaire et le compare, sauf avec PLANS_WRITE=1. */
const COMMITTED = 'src/content/plans/maison-coq.json';
// le dossier des plans écrits : celui du banc partagé (tools/run-scenarios.ts, son serveur l'écrit), sinon un dossier temporaire à soi
const OUT_DIR = process.env.PLANS_WRITE ? 'src/content/plans' : (process.env.XEROS_PLANS_OUT ?? mkdtempSync(join(tmpdir(), 'xeros-plans-')));
process.env.XEROS_PLANS_OUT = OUT_DIR;
const PLAN_FILE = `${OUT_DIR}/maison-coq.json`;
const mtimeOf = (f: string) => (existsSync(f) ? statSync(f).mtimeMs : 0);
const PLAN_BEFORE = mtimeOf(PLAN_FILE);
/** Les pièces du catalogue dont la maison est faite (outre la pièce de bois, une poutre du normal). */
/** Les pièces du catalogue dont la maison est faite (outre la pièce de bois : les poutres du normal, les planches du gros). */
const PROPS = /^(ashlar-wall|ashlar-wall-40|string-course-wall|string-course-wall-40|flagstone-row|stone-step|window-lintel|half-cross-window|cross-window|stone-arch|oak-arch-door|inner-door|casement-shutter|fireplace-jamb|fireplace-console|fireback|mantel-lintel|small-fireplace-jamb|small-fireplace-lintel|stone-hearth|kneading-trough|table|high-chair|dresser|chest|verdure-tapestry|door-frame|lime-panel|lime-rail|lime-panel-low|stair-railing|stair-railing-short|bed|unmade-bed|writing-desk|canopy-bed|wall-hanging|tailor-table|cloth-bolt|ashlar-gable|chimney-flue|chimney-cap|lave-roof|lave-roof-pierced|lave-ridge)$/;
const START = Date.now();

await playtest('maison-coq', async ({ page, errors, load }) => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  // un pas dessiné joué : ce qu'on vient de faire (la souris, une touche) est lu et le fantôme suit (il n'est recalculé qu'au pas
  // dessiné) ; sous la charge, une pause fixe peut passer sans qu'aucun pas ne soit joué (le pas de jeu fixe, src/world/timeStep.ts)
  const stepped = () => page.evaluate(() => (window as any).__drawn(1));
  await load('?construire&dieu&reset');
  // B lu avant la suite (une commande de carte est refusée en mode construction), attendu sur l'état du jeu, jamais une pause fixe
  await page.keyboard.press('KeyB');
  await page.evaluate((m) => (window as any).__until(() => (window as any).game.scene.getScene('world').mode === m, `B lu : le mode ${m}`), 'play');
  await page.evaluate(() => (window as any).__restart({ kind: 'map', map: 'ferme' }));
  await page.keyboard.press('KeyB');
  await page.evaluate((m) => (window as any).__until(() => (window as any).game.scene.getScene('world').mode === m, `B lu : le mode ${m}`), 'build');
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
      if (Math.hypot(x + 160 - px.x, y + 70 - px.y) > 260 && m.areaFree({ left: x - 24, top: y - 24, right: x + 420, bottom: y + 170 })) {
        w.cameras.main.setZoom(2);
        w.cameras.main.centerOn(x + 160, y + 40 - (w.lifts?.liftAt?.(x + 160, y + 40) ?? 0));
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
      w.player.actor.body.reset(Math.round((ox + 1900) / 5), Math.round((oy + 760) / 5));
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
  const send = (cmd: object) => page.evaluate((c) => (window as any).game.events.emit('build', c), cmd);
  // les pièces déjà posées sur la ferme à l'arrivée (la cabane du chasseur, posée depuis son plan) ne comptent pas
  let existing: Set<number> | undefined;
  const pieces = async () => {
    const all = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').map.builds.map((b: any) => b.piece))));
    existing ??= new Set(all.map((p: any) => p.id));
    return all.filter((p: any) => !existing!.has(p.id));
  };
  await pieces();
  /** Les pièces posées, par leur nom dans la liste. */
  const named = new Map<string, any>();
  const box = (s: PieceStep) => ({ x: O!.x + s.x, y: O!.y + s.y, w: s.w, d: s.d });
  /** Un pan de toit : sa base est le dessus de ce qui porte sa rive basse (une bande de 60 cm du côté bas), comme le mode construction. */
  const roofStrip = (s: PieceStep) => {
    if (!('prop' in s.ref) || !/^lave-roof/.test(s.ref.prop)) return undefined;
    const b = box(s);
    const low = (['south', 'west', 'north', 'east'] as const)[(s.view ?? 0) % 4];
    return low === 'south' ? { ...b, y: b.y + b.d - 60, d: 60 } : low === 'north' ? { ...b, d: 60 } : low === 'west' ? { ...b, w: 60 } : { ...b, x: b.x + b.w - 60, w: 60 };
  };

  /**
   * Pose une pièce : prise au catalogue dans son sens, les crans montés (T), la souris sur le milieu de l'emprise visée (4 cm plus au
   * nord), vue à la hauteur de ce qui la porte à sa place (comme le fantôme), puis clic gauche. Vérifie sa place, sa hauteur, et,
   * pour une couche, que la pièce qu'elle recouvre a disparu.
   */
  const put = async (s: PieceStep) => {
    await send({ kind: 'pick', piece: s.ref, ...(s.view ? { view: s.view } : {}) });
    // la hauteur où on la voit : le dessus de ce qui la porte (les pans de toit ne portent que le faîtage)
    const ridge = 'prop' in s.ref && s.ref.prop === 'lave-ridge';
    // la hauteur où on la voit : le dessus de ce qui la porte (les pans de toit ne portent que le faîtage ; une marche, la précédente)
    const stair = 'prop' in s.ref && s.ref.prop === 'stone-step';
    const aimed = await page.evaluate(
      async ([b, ridge, stairZ]) => {
        const url = '/src/world/build.ts';
        // le module gardé dans la page (un import() refait coûte près de 100 ms au serveur de Vite)
        const B = (((window as any).__mods ??= {})[url] ??= await import(url));
        const m = (window as any).game.scene.getScene('world').map;
        const roof = (q: any) => 'prop' in q.piece && /lave-roof|lave-ridge/.test(q.piece.prop);
        const ps = m.builds.map((q: any) => q.piece).filter((q: any) => ridge || !roof(q));
        const S = stairZ ?? B.supportAt(ps, b);
        const cx = b.x + b.w / 2;
        const cy = b.y + b.d / 2;
        const under = ps.map(B.boxOf).filter((o: any) => o.z + o.h === S && o.x < b.x + b.w && b.x < o.x + o.w && o.y < b.y + b.d && b.y < o.y + o.d);
        const onIt = under.find((o: any) => cx >= o.x && cx < o.x + o.w && cy >= o.y && cy < o.y + o.d);
        const u = onIt ?? under[0];
        const mid = (a0: number, a1: number, b0: number, b1: number) => (Math.max(a0, b0) + Math.min(a1, b1)) / 2;
        void u;
        void mid;
        return { S, x: cx, y: cy };
      },
      [roofStrip(s) ?? box(s), ridge, stair ? s.z : null] as const,
    );
    const S = aimed.S;
    const before = await pieces();
    // la souris au milieu de l'emprise (pour un pan de toit aussi : la bande de sa rive basse ne donne que sa hauteur)
    const B0 = box(s);
    const px = (B0.x + B0.w / 2) / 5;
    const py = (B0.y + B0.d / 2 - S - 4) / 5;
    void aimed.x;
    // de près (zoom 6), pour que la souris tombe au centimètre près : la visée d'une pièce de 15 cm se joue à quelques centimètres
    await look(px, py, 6);
    let sp = await screen(px, py);
    await page.mouse.move(sp.x, sp.y);
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
      await stepped();
    }
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
    const want = [s.x, s.y];
    const right = (g: typeof ghost) => !!g.aim && g.aim[0][0] === O!.x + want[0] && g.aim[0][1] === O!.y + want[1] && g.aim[0][2] === s.z;
    if (!right(ghost)) {
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
      // les crans : ceux qui mènent à sa hauteur (une tenture au-dessus du sol), puis autour
      const up = Math.round((s.z - S) / 20);
      for (const crans of [...new Set([up, 0, -1, 1, -2, up - 1, up + 1])]) {
        const key = crans < 0 ? 'KeyG' : 'KeyT';
        for (let i = 0; i < Math.abs(crans); i++) {
          await page.keyboard.press(key);
          await stepped();
        }
        for (const [dx, dy] of tries) {
          await page.mouse.move(sp.x + dx * k, sp.y + dy * k);
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
          await stepped();
        }
      }
      if (!found) await page.mouse.move(sp.x, sp.y);
    }
    await page.mouse.click(sp.x, sp.y);
    // le clic joué : la file des clics du mode construction vidée par un pas de jeu
    await page.evaluate(() => (window as any).__until(() => !(window as any).game.scene.getScene('world').builder?.clicks?.length, 'le clic joué'));
    await stepped();
    const list = await pieces();
    const p = list.find((q: any) => !before.some((o: any) => o.id === q.id));
    const seen = () => `visé en (${px * 5 - O!.x}, ${py * 5 - O!.y}), S ${S} ; souris ${ghost.pointer.map((v: number, i: number) => Math.round(v - (i ? O!.y : O!.x)))} ; fantôme ${JSON.stringify(ghost.aim?.map((q: number[]) => [q[0] - O!.x, q[1] - O!.y, q[2]]))} ${ghost.why ?? ''}`;
    if (seenGhosts.size && !(p && p.x - O!.x === s.x && p.y - O!.y === s.y)) console.log(`  … ${s.name} : fantômes essayés ${[...seenGhosts].map((g) => { const [c, a] = JSON.parse(g); return a ? `${c}:${a[0] - O!.x},${a[1] - O!.y},${a[2]}` : `${c}:—`; }).join(' ')}`);
    assert.ok(p, `${s.name} : posée (${notices.at(-1) ?? ''} ; ${seen()})`);
    const at = [s.x, s.y];
    assert.deepEqual([p.x - O!.x, p.y - O!.y], at, `${s.name} : à sa place (${seen()})`);
    if (s.z !== undefined) assert.equal(p.z, s.z, `${s.name} : à ${s.z} cm`);
    if (s.view !== undefined) assert.equal(p.view, s.view, `${s.name} : dans son sens`);
    assert.equal(list.length, before.length + 1, `${s.name} : une pièce de plus`);
    named.set(s.name, p);
  };
  // les étapes de montage : une capture par étape, cadrée sur la maison, Xéros à l'est
  const shots: { name: string; png: PNG }[] = [];
  const L = -120, T = -1180, R = 1760, B = 780;
  const frame = async (name: string) => {
    // en mode construction, rien en main (hors du mode, une commande de construction le rouvrirait)
    if ((await page.evaluate(() => (window as any).game.scene.getScene('world').mode)) === 'build') await send({ kind: 'none' });
    await page.mouse.move(5, 5);
    await sleep(200);
    const clip = await page.evaluate(([ox, oy, L, T, R, B]) => {
      const g = (window as any).game;
      const w = g.scene.getScene('world');
      w.player.actor.body.reset(Math.round((ox + 1900) / 5), Math.round((oy + 760) / 5));
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

  // la progression, toutes les 20 étapes (un scénario arrêté au bout de sa limite dit où il en était)
  let done = 0;
  for (const s of coqSteps()) {
    if (++done % 20 === 0) console.log(`  [maison-coq] ${done} étapes en ${Math.round((Date.now() - START) / 1000)} s`);
    if (s.kind === 'piece') await put(s);
    else await frame(s.name);
  }
  const built = await pieces();
  // rien au-dessus du vide (la règle de Grégoire : chaque pièce a un vrai appui)
  assert.deepEqual(overhangs(built), [], 'aucune pièce au-dessus du vide');

  // enregistrée comme plan : la zone de toute la maison, ses débords de toit et ses souches
  await send({ kind: 'select' });
  await look((O!.x + 820) / 5, (O!.y + 340) / 5);
  const a = await screen((O!.x - 60) / 5, (O!.y - 80) / 5);
  const b = await screen((O!.x + 1700) / 5, (O!.y + 760) / 5);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await sleep(150);
  await send({ kind: 'save-plan', name: 'Maison coq' });
  for (let i = 0; i < 50 && mtimeOf(PLAN_FILE) <= PLAN_BEFORE; i++) await sleep(100);
  assert.ok(mtimeOf(PLAN_FILE) > PLAN_BEFORE, `la maison est enregistrée dans ${PLAN_FILE} (${notices.at(-1) ?? ''})`);
  const plan = JSON.parse(readFileSync(PLAN_FILE, 'utf8'));
  if (!process.env.PLANS_WRITE) assert.deepEqual(plan, JSON.parse(readFileSync(COMMITTED, 'utf8')), `le plan bâti est celui de ${COMMITTED} (PLANS_WRITE=1 pour le mettre à jour)`);
  assert.equal(plan.pieces.length, built.length, 'toutes les pièces sont dans le plan');
  // seulement des pièces du catalogue : des poutres du normal (équarries, 5,80 m au plus), des planches du gros, et les éléments
  for (const p of plan.pieces) {
    if ('wood' in p.piece) assert.ok((p.piece.wood.size === 'normal' && p.piece.wood.hewn === 12 && p.piece.wood.length <= 580) || (p.piece.wood.size === 'big' && p.piece.wood.shape === 'plank'), JSON.stringify(p.piece));
    else assert.match(p.piece.prop, PROPS, JSON.stringify(p.piece));
  }
  assert.equal(plan.age, 'worn', "le plan fixe l'âge de toutes ses pièces de bois (patiné)");

  // l'intérieur : un bâtiment, deux niveaux, une entrée (la porte en arc)
  await page.keyboard.press('KeyB');
  await page.evaluate((m) => (window as any).__until(() => (window as any).game.scene.getScene('world').mode === m, `B lu : le mode ${m}`), 'play');
  const mine = (x: number, y: number) => x >= O!.x - 100 && x <= O!.x + 1700 && y >= O!.y - 100 && y <= O!.y + 760;
  const buildings: any[] = ((await page.evaluate(() => JSON.parse(JSON.stringify((window as any).game.scene.getScene('world').interiors.buildings())))) as any[]).filter((q) => mine(q.room.x, q.room.y));
  assert.equal(buildings.length, 1, 'la maison est un bâtiment où l’on entre');
  const house = buildings[0];
  assert.deepEqual(house.storeys?.map((s: any) => s.z), [0, 283], `deux niveaux, le plancher à 2,83 m (${JSON.stringify(house.storeys?.map((s: any) => s.z))})`);
  assert.equal(house.entrances.length, 1, 'une entrée');
  assert.equal(house.entrances[0].side, 'south', "l'entrée au sud");
  assert.equal(house.entrances[0].door, named.get("porte d'entrée").id, "l'entrée est la porte en arc");
  assert.equal(house.storeys[0].rooms.length, 3, `en bas, la cuisine, le passage, la salle (${JSON.stringify(house.storeys[0].rooms)})`);
  assert.equal(house.storeys[1].rooms.length, 4, `en haut, les garçons, le palier, le coq, la fille (${JSON.stringify(house.storeys[1].rooms)})`);
  await frame('la maison finie');

  // .art-preview/maison-coq.png : les étapes de montage, quatre par rangée, la maison finie, puis l'intérieur
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
  writeFileSync('.art-preview/maison-coq.png', PNG.sync.write(out));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  const secs = Math.round((Date.now() - START) / 1000);
  console.log(`  ✓ maison du coq : ${built.length} pièces, enregistrée dans ${PLAN_FILE} ; deux niveaux, trois pièces en bas, quatre en haut, une entrée ; ${shots.length} captures dans .art-preview/maison-coq.png ; ${secs} s`);
}, { speed: 1 }); // x1 : bâtir dans le mode construction ne demande pas de temps de jeu, et x10 alourdit chaque image
