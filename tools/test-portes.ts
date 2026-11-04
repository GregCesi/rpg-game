// Les portes de la maison, dans le vrai jeu (tools/lib/playtest.ts), au vrai clavier, depuis une partie neuve (Xéros se réveille dans
// la maison) : il marche jusqu'à la sortie (les portes intérieures fermées en route, il les ouvre avec E) et sort sur la ferme ; dehors,
// la porte de la chaumière fermée (E la ferme si elle ne l'est pas), il n'entre pas ; E l'ouvre, il rentre ; puis, dedans, va jusqu'à une porte intérieure, la ferme et l'ouvre avec E, passe dans
// son ouverture, revient et la referme. Jamais bloqué : la marche (tools/lib/walk.ts) échoue en disant où Xéros s'est arrêté. Rien
// n'est contourné : pas de téléportation, chaque porte s'ouvre et se ferme par E, comme un joueur.
// Usage : npm run test:portes.

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';
import { walker, type DoorZone } from './lib/walk';

await playtest('portes', async ({ page, errors, load }) => {
  await load('?dieu&reset');
  const { where, goTo, routeTo } = walker(page);
  const W = (fn: string) => page.evaluate(fn);
  /** L'état des portes de la carte en cours (identifiant de la pièce et sa clé : `-open` quand elle est ouverte). */
  const doors = (): Promise<string> =>
    page.evaluate(() =>
      (window as any).game.scene
        .getScene('world')
        .map.builds.filter((b: any) => /door/.test(b.piece.piece.prop ?? ''))
        .map((b: any) => `${b.piece.id}:${b.piece.piece.prop}`)
        .sort()
        .join(),
    );
  /** E, puis la porte a changé d'état (sinon l'attente échoue en le nommant). */
  const pressE = async (what: string) => {
    const before = await doors();
    // ce que E visait (pour dire, en cas d'échec, pourquoi la porte n'a pas bougé)
    const aimed = await page.evaluate(() => {
      const w = (window as any).game.scene.getScene('world');
      const t = w.eTarget;
      const a = w.player.actor;
      const pr = w.player.probe(16);
      const swings = w.map.interactables().filter((i: any) => i.action.kind === 'swing').map((i: any) => [Math.round(i.x), Math.round(i.y)]).filter(([x, y]: number[]) => Math.hypot(x - a.x, y - a.y) < 60);
      return JSON.stringify({ probe: [Math.round(pr.x), Math.round(pr.y)], swings, body: [a.body.left, a.body.top, a.body.right, a.body.bottom], e: w.keys?.e, target: t && { kind: t.action.kind, x: Math.round(t.x), y: Math.round(t.y), prop: t.action.prop?.type }, at: [Math.round(a.x), Math.round(a.y), a.facing], mode: w.mode });
    });
    await W(`window.__key('KeyE')`);
    await page.evaluate(
      ([before, what]) =>
        (window as any).__until(() => {
          const w = (window as any).game.scene.getScene('world');
          const now = w.map.builds.filter((b: any) => /door/.test(b.piece.piece.prop ?? '')).map((b: any) => `${b.piece.id}:${b.piece.piece.prop}`).sort().join();
          return now !== before;
        }, what),
      [before, what] as const,
    ).catch((e: Error) => {
      throw new Error(`${e.message} ; E visait ${aimed} ; portes ${before}`);
    });
    await W(`window.__settle()`);
  };
  /** Marche dans une direction jusqu'à ce que la carte change (une porte passée), puis attend le jeu au repos. */
  const walkThrough = async (code: string, want: string) => {
    await W(`window.dispatchEvent(new KeyboardEvent('keydown', { code: '${code}' }))`);
    await page.evaluate(
      (want) =>
        (window as any).__until(() => {
          const id = (window as any).game.scene.getScene('world').map?.def?.id ?? '';
          return want.endsWith('*') ? id.startsWith(want.slice(0, -1)) : id === want;
        }, `passer la porte vers ${want}`),
      want,
    ).catch(async (e: Error) => {
      const st = await page.evaluate(() => {
        const w = (window as any).game.scene.getScene('world');
        const a = w.player.actor;
        const ent = w.map.buildings?.flatMap((b: any) => b.entrances).map((e: any) => ({ open: e.open, facing: e.facing, zone: e.zone }));
        return JSON.stringify({ at: [a.x, a.y, a.facing], body: [a.body.left, a.body.top, a.body.right, a.body.bottom], blocked: a.body.blocked, ent: ent?.filter((e: any) => Math.abs(e.zone.x / 5 - a.x) < 40 && Math.abs(e.zone.y / 5 - a.y) < 40) });
      });
      throw new Error(`${e.message} ; ${st}`);
    });
    await W(`window.dispatchEvent(new KeyboardEvent('keyup', { code: '${code}' }))`);
    await W(`window.__idle('arrivé')`);
  };
  /** Suit les coins d'un chemin ; devant une porte fermée (un arrêt `open`), tourné vers elle, l'ouvre avec E ; s'arrête à `stopAt`. */
  const follow = async (route: Awaited<ReturnType<typeof routeTo>>, opened: string[], stopAt?: number) => {
    for (let i = 1; i < route.length; i++) {
      const c = route[i];
      const now = await where();
      await goTo(c.x, c.y, Math.abs(c.x - now.x) > Math.abs(c.y - now.y) ? 'x' : 'y', 2);
      if (!c.open) continue;
      await W(`window.__face('${c.open}')`);
      if (stopAt !== undefined && i >= stopAt) return c;
      await pressE(`ouvrir la porte en route (${c.open})`);
      opened.push(c.open);
    }
    return undefined;
  };

  // 1. la partie neuve : Xéros se réveille dans la maison
  await W(`window.__idle('le réveil')`);
  await W(`window.game.events.emit('dieu', { kind: 'stamina-infinite', on: true })`);
  const start = await where();
  assert.match(start.id, /^interieur:ferme:/, `réveil dans la maison (${start.id})`);

  // 2. jusqu'à la sortie, les portes intérieures fermées ouvertes en route ; il sort sur la ferme (du dedans, le passage de la porte
  // d'entrée est toujours libre : la porte n'existe que dehors, dans le passage du bâtiment, systems/interiors.ts)
  const opened: string[] = [];
  const route = await routeTo();
  assert.ok(route.length > 1, 'un chemin de son coin à la porte d’entrée');
  await follow(route, opened);
  await W(`window.__face('down')`);
  await walkThrough('KeyS', 'ferme');
  assert.equal((await where()).id, 'ferme', 'Xéros est sorti sur la ferme');

  // 3. dehors, devant la porte de la chaumière : fermée (E la ferme si elle est ouverte), on n'entre pas ; E l'ouvre ; il rentre
  await W(`window.__face('up')`);
  const front = () =>
    page.evaluate(() => {
      const w = (window as any).game.scene.getScene('world');
      const a = w.player.actor;
      return w.map.buildings.flatMap((b: any) => b.entrances).sort((p: any, q: any) => Math.hypot(p.zone.x / 5 - a.x, p.zone.y / 5 - a.y) - Math.hypot(q.zone.x / 5 - a.x, q.zone.y / 5 - a.y))[0]?.open as boolean;
    });
  if (await front()) await pressE('E ferme la porte d’entrée');
  assert.equal(await front(), false, 'la porte d’entrée est fermée');
  // porte fermée : il pousse vers elle le temps de quelques pas, et reste dehors
  await W(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))`);
  await W(`window.__frames(20)`);
  await W(`window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))`);
  await W(`window.__idle('arrêté devant la porte')`);
  assert.equal((await where()).id, 'ferme', 'porte fermée : on n’entre pas');
  // arrêté contre la porte fermée, tourné vers elle, il l'ouvre avec E
  await W(`window.__face('up')`);
  await pressE('E ouvre la porte d’entrée');
  assert.equal(await front(), true, 'E ouvre la porte d’entrée');
  await walkThrough('KeyW', 'interieur:*');
  assert.equal((await where()).id, start.id, 'Xéros est rentré dans la maison');

  // 4. une porte intérieure (la plus proche de Xéros, pas celle d'entrée) : il y va, la ferme et l'ouvre, passe, revient, la referme
  const target = (await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const ex = w.interior.exits[0].zone;
    const e = { x: (ex.x + ex.w / 2) / 5, y: ex.y / 5 };
    const a = w.player.actor;
    return w.map.builds
      .filter((b: any) => b.zone && /door(-open)?$/.test(b.piece.piece.prop ?? ''))
      .map((b: any) => ({ id: b.piece.id, z: { x: b.zone.x, y: b.zone.y, width: b.zone.width, height: b.zone.height } }))
      .filter((d: any) => Math.hypot(d.z.x - e.x, d.z.y - e.y) > 24)
      .sort((p: any, q: any) => Math.hypot(p.z.x - a.x, p.z.y - a.y) - Math.hypot(q.z.x - a.x, q.z.y - a.y))[0];
  })) as { id: number; z: DoorZone } | undefined;
  assert.ok(target, 'la maison a une porte intérieure');
  const doorState = () => page.evaluate((id) => (window as any).game.scene.getScene('world').map.builds.find((b: any) => b.piece.id === id)?.piece.piece.prop as string, target!.id);
  // devant la porte, du côté de Xéros, à 14 px de son milieu (P1), tourné vers elle ; de l'autre côté, à 14 px (P2)
  const z = target!.z;
  const me = await where();
  const ns = z.width >= z.height;
  const sgn = ns ? (me.y > z.y ? 1 : -1) : me.x > z.x ? 1 : -1;
  const p1 = ns ? { x: z.x, y: z.y + sgn * 14 } : { x: z.x + sgn * 14, y: z.y };
  const p2 = ns ? { x: z.x, y: z.y - sgn * 14 } : { x: z.x - sgn * 14, y: z.y };
  const facing = ns ? (sgn > 0 ? 'up' : 'down') : sgn > 0 ? 'left' : 'right';
  const toDoor = await routeTo({ x: Math.round(p1.x / 4) * 4, y: Math.round(p1.y / 4) * 4 });
  assert.ok(toDoor.length > 0, `un chemin jusque devant la porte intérieure (porte ${JSON.stringify(target)} ; Xéros ${JSON.stringify(me)})`);
  await follow(toDoor, opened);
  await goTo(p1.x, p1.y, ns ? 'x' : 'y', 2);
  await W(`window.__face('${facing}')`);
  const first = await doorState();
  await pressE('E change la porte intérieure');
  const second = await doorState();
  await pressE('E la remet');
  const third = await doorState();
  assert.notEqual(first, second, `E ouvre ou ferme la porte intérieure (${first} → ${second})`);
  assert.equal(third, first, `E la remet dans son état (${third})`);
  assert.ok([first, second].some((s) => /-open$/.test(s)) && [first, second].some((s) => !/-open$/.test(s)), 'elle a été ouverte et fermée');
  // ouverte, il la traverse en ligne droite, revient devant elle et la referme
  if (!/-open$/.test(await doorState())) await pressE('E l’ouvre pour passer');
  await goTo(p2.x, p2.y, ns ? 'y' : 'x', 2);
  const beyond = await where();
  assert.ok(ns ? Math.sign(beyond.y - z.y) === -sgn : Math.sign(beyond.x - z.x) === -sgn, `Xéros a passé la porte (${beyond.x}, ${beyond.y})`);
  // le retour, par un chemin libre (par le milieu des passages, comme un joueur)
  await follow(await routeTo({ x: Math.round(p1.x / 4) * 4, y: Math.round(p1.y / 4) * 4 }), opened);
  await goTo(p1.x, p1.y, ns ? 'x' : 'y', 2);
  await W(`window.__face('${facing}')`);
  await pressE('E referme la porte intérieure');
  assert.ok(!/-open$/.test(await doorState()), 'la porte intérieure est refermée');

  console.log(`  ✓ portes : sortie, la porte d'entrée fermée puis ouverte avec E, retour ; ${opened.length} porte(s) intérieure(s) ouverte(s) en route ; une porte intérieure fermée, ouverte, passée et refermée avec E, sans rester bloqué`);
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
}, { speed: 1 }); // x1 : passer une porte se joue au pixel près, et à x10 un seul appui fait marcher Xéros de 4 px
