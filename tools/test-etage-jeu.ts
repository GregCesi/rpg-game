// L'étage de la maison du coq, dans le vrai jeu (tools/lib/playtest.ts ; CONCEPTION « L'étage »), depuis une partie neuve : Xéros
// devant la maison du coq (au bas de la ferme du riche), il ouvre la porte en arc avec E et entre ; il va au pied de l'escalier et
// monte en marchant (le niveau affiché change à mi-hauteur, pas avant : sa hauteur, tenue pas de physique par pas de physique) ; sur
// le palier, il ouvre la porte de la chambre du coq, la traverse, ouvre celle de la chambre de sa fille et y entre ; la page est
// rechargée : il est toujours en haut, l'étage affiché ; il revient, redescend l'escalier (le rez-de-chaussée revient à mi-hauteur) et
// ressort sur la ferme. Rien n'est contourné : il marche au vrai clavier, chaque porte s'ouvre par E.
// Usage : npm run test:etage.

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';
import { walker } from './lib/walk';

await playtest('etage', async ({ page, errors, load }) => {
  await load('?dieu&reset');
  const { where, goTo } = walker(page);
  const W = (fn: string) => page.evaluate(fn);
  await W(`window.__idle('le réveil')`);
  await W(`window.game.events.emit('dieu', { kind: 'stamina-infinite', on: true })`);
  // la ferme du riche : la maison du coq y est posée (un rectangle Plan de Tiled)
  await W(`window.__restart({ kind: 'map', map: 'ferme-du-riche' })`);
  /** La maison sur la carte en cours : son coin nord-ouest (px), d'après la porte en arc (posée à 615 cm du coin, 640 au sud). */
  const house = () =>
    page.evaluate(() => {
      const w = (window as any).game.scene.getScene('world');
      const door = w.map.builds.find((b: any) => /^oak-arch-door/.test(b.piece.piece.prop ?? ''));
      return door ? { x: (door.piece.x - 615) / 5, y: (door.piece.y - 640) / 5, open: /open/.test(door.piece.piece.prop) } : undefined;
    });
  const out = await house();
  assert.ok(out, 'la maison du coq est sur la ferme du riche');
  // devant la porte (2 m au sud), tourné vers elle
  await page.evaluate(([x, y]) => {
    const w = (window as any).game.scene.getScene('world');
    w.player.actor.body.reset(x, y);
    w.player.actor.face('up');
  }, [Math.round(out!.x + 134), Math.round(out!.y + 136 + 30)] as const);
  await W(`window.__idle('devant la porte')`);
  await goTo((await where()).wx, (await where()).wy - 16, 'y', 2);
  await W(`window.__face('up')`);
  if (!(await house())!.open) {
    await W(`window.__key('KeyE')`);
    await page.evaluate(() => (window as any).__until(() => /open/.test((window as any).game.scene.getScene('world').map.builds.find((b: any) => /^oak-arch-door/.test(b.piece.piece.prop ?? ''))?.piece.piece.prop ?? ''), 'E ouvre la porte en arc'));
  }
  // il entre : le passage de la porte, tourné vers le dedans
  await W(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))`);
  await page.evaluate(() => (window as any).__until(() => (window as any).game.scene.getScene('world').map.def.id.startsWith('interieur:'), 'entrer dans la maison'));
  await W(`window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))`);
  await W(`window.__idle('dedans')`);
  const inside = (await where()).id;

  /** Dans l'intérieur : la maison (son coin nord-ouest, px, d'après la 1re marche, posée à 680, 480 cm), le niveau, la hauteur. */
  const state = () =>
    page.evaluate(() => {
      const w = (window as any).game.scene.getScene('world');
      const steps = w.map.builds.filter((b: any) => b.piece.piece.prop === 'stone-step').map((b: any) => b.piece);
      const first = steps.sort((a: any, b: any) => a.z - b.z)[0];
      const a = w.player.actor;
      return { ox: (first.x - 680) / 5, oy: (first.y - 480) / 5, x: a.x, y: a.y, z: w.player.mobility.z as number, storey: w.storeys?.current as number, id: w.map.def.id as string };
    });
  let s = await state();
  assert.equal(s.storey, 0, 'en entrant : le rez-de-chaussée');
  const at = (cx: number, cy: number) => ({ x: s.ox + cx / 5, y: s.oy + cy / 5 });

  // 1. au pied de l'escalier (la colonne x 680-780, sous la 1re marche, y 520), puis il monte vers le nord
  const foot = at(730, 540);
  await goTo(foot.x, foot.y, 'y', 3);
  // le niveau affiché pendant la montée : guetté à chaque pas de jeu (il ne change qu'une fois, à mi-hauteur)
  await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const log: { z: number; storey: number }[] = [];
    (window as any).__climb = log;
    w.events.on('postupdate', () => log.push({ z: w.player.mobility.z, storey: w.storeys?.current }));
  });
  await W(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))`);
  await page.evaluate(() => (window as any).__until(() => (window as any).game.scene.getScene('world').player.mobility.z >= 280, 'monter jusqu’au palier'));
  await W(`window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))`);
  await W(`window.__idle('sur le palier')`);
  const climb = (await page.evaluate(() => (window as any).__climb)) as { z: number; storey: number }[];
  const change = climb.findIndex((c) => c.storey === 1);
  assert.ok(change > 0, "l'étage s'affiche pendant la montée");
  assert.ok(climb[change].z >= 140 && climb[change - 1].z < 160, `il s'affiche à mi-hauteur (à ${climb[change].z} cm, avant ${climb[change - 1].z})`);
  assert.ok(climb.slice(change).every((c) => c.storey === 1), "une fois l'étage affiché, il le reste en montant");
  s = await state();
  assert.equal(s.id, inside, 'la même carte : on monte sans changer de carte');
  assert.equal(s.storey, 1, "en haut : l'étage");

  // 2. la chambre du coq : la porte du palier (refend est, y 100-200), puis la cloison et la chambre de la fille
  const palier = at(740, 130);
  await goTo(palier.x, palier.y, 'y', 2);
  const doorAt = (id: string) =>
    page.evaluate((x) => (window as any).game.scene.getScene('world').map.builds.filter((b: any) => /inner-door/.test(b.piece.piece.prop ?? '') && Math.abs(b.piece.x / 5 - x) < 6).map((b: any) => b.piece.piece.prop)[0], id as unknown as number);
  const openTo = async (dir: string, x: number, what: string) => {
    await W(`window.__face('${dir}')`);
    if (!/open/.test((await doorAt(x as unknown as string)) ?? '')) {
      await W(`window.__key('KeyE')`);
      await page.evaluate(([x, what]) => (window as any).__until(() => (window as any).game.scene.getScene('world').map.builds.some((b: any) => /inner-door-open/.test(b.piece.piece.prop ?? '') && Math.abs(b.piece.x / 5 - x) < 6), what), [x, what] as const);
    }
  };
  await openTo('right', s.ox + 805 / 5, 'E ouvre la porte de la chambre du coq');
  const coq = at(1000, 150);
  await goTo(coq.x, coq.y, 'x', 3);
  const cloison = at(1270, 255);
  await goTo(cloison.x, cloison.y, 'y', 2);
  await openTo('right', s.ox + 1300 / 5, 'E ouvre la porte de la chambre de la fille');
  const fille = at(1450, 300);
  await goTo(fille.x, fille.y, 'x', 3);
  s = await state();
  assert.ok(s.x > s.ox + 1315 / 5 && s.storey === 1 && s.z >= 280, `dans la chambre de la fille, à l'étage (${JSON.stringify(s)})`);

  // 3. la page rechargée : il est toujours en haut, l'étage affiché
  await W(`window.__settle()`);
  await page.waitForTimeout(400);
  await load('?dieu');
  await W(`window.__idle('rechargé')`);
  s = await state();
  assert.equal(s.id, inside, 'rechargé : dans la maison');
  assert.ok(s.z >= 280 && s.storey === 1, `rechargé : toujours en haut (z ${s.z}, niveau ${s.storey})`);

  // 4. il revient au palier, redescend, ressort
  await goTo(cloison.x + 10, cloison.y, 'x', 3);
  await goTo(coq.x, coq.y, 'y', 3);
  await goTo(palier.x + 8, palier.y, 'x', 2);
  await goTo(palier.x, palier.y, 'x', 2);
  const top = at(730, 150);
  await goTo(top.x, top.y, 'x', 2);
  await W(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }))`);
  await page.evaluate(() => (window as any).__until(() => (window as any).game.scene.getScene('world').player.mobility.z <= 1, 'redescendre jusqu’en bas'));
  await W(`window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }))`);
  await W(`window.__idle('en bas')`);
  s = await state();
  assert.equal(s.storey, 0, 'en bas : le rez-de-chaussée');
  const exit = at(670, 600);
  await goTo(exit.x, exit.y, 'x', 2);
  await W(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }))`);
  await page.evaluate(() => (window as any).__until(() => (window as any).game.scene.getScene('world').map.def.id === 'ferme-du-riche', 'ressortir sur la ferme'));
  await W(`window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }))`);
  await W(`window.__idle('dehors')`);
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  console.log(`  ✓ etage : entré, monté (l'étage à ${climb[change].z} cm), la chambre de la fille par celle du coq, rechargé en haut, redescendu, ressorti`);
});
