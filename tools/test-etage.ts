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
  /** La maison sur la carte en cours : son coin nord-ouest (px), d'après la porte en arc (posée à 610 cm du coin, 640 au sud). */
  const house = () =>
    page.evaluate(() => {
      const w = (window as any).game.scene.getScene('world');
      const door = w.map.builds.find((b: any) => /^oak-arch-door/.test(b.piece.piece.prop ?? ''));
      return door ? { x: (door.piece.x - 610) / 5, y: (door.piece.y - 640) / 5, open: /open/.test(door.piece.piece.prop) } : undefined;
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

  /** Dans l'intérieur : la maison (son coin nord-ouest, px, d'après la 1re marche, posée à 680, 470 cm), le niveau, la hauteur. */
  const state = () =>
    page.evaluate(() => {
      const w = (window as any).game.scene.getScene('world');
      const steps = w.map.builds.filter((b: any) => b.piece.piece.prop === 'stone-step').map((b: any) => b.piece);
      const first = steps.sort((a: any, b: any) => a.z - b.z)[0];
      const a = w.player.actor;
      return { ox: (first.x - 680) / 5, oy: (first.y - 470) / 5, x: a.x, y: a.y, z: w.player.mobility.z as number, storey: w.storeys?.current as number, id: w.map.def.id as string };
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
  await page
    .evaluate(() => (window as any).__until(() => (window as any).game.scene.getScene('world').player.mobility.z >= 280, 'monter jusqu’au palier'))
    .catch(async (e) => {
      const at = await state();
      throw new Error(`${e.message} : arrêté en (${Math.round((at.x - at.ox) * 5)}, ${Math.round((at.y - at.oy) * 5)}) cm de la maison, à ${at.z} cm`);
    });
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

  // 2. la chambre du coq : la porte du palier (refend est, y 100-190, gond au nord : elle s'ouvre sur le palier), ouverte depuis la
  // 14e marche, hors de son battant (les pieds 15 cm au nord du point visé : entre y 141 et 162) ; puis la chambre, entre le refend et le lit à courtines (x 900-1060, y 60-270), la cloison et la chambre de
  // la fille (sa porte s'ouvre vers le coq, gond au nord : ouverte depuis le sud)
  const palier = at(740, 167);
  await goTo(palier.x, palier.y, 'y', 2);
  /** Tourné vers la porte, E l'ouvre : la porte visée (son identifiant : ouverte, elle tourne sur son gond et change de place). */
  const openTo = async (dir: string, what: string) => {
    await W(`window.__face('${dir}')`);
    const id = await page.evaluate(() => {
      const t = (window as any).game.scene.getScene('world').eTarget;
      return t?.action?.kind === 'swing' ? (t.action.id as number) : undefined;
    });
    assert.ok(id !== undefined, `${what} : la porte est visée`);
    const prop = () => page.evaluate((id) => (window as any).game.scene.getScene('world').map.builds.find((b: any) => b.piece.id === id)?.piece.piece.prop as string, id);
    assert.match(await prop(), /inner-door/, `${what} : une porte intérieure`);
    if (/open/.test(await prop())) return;
    await W(`window.__key('KeyE')`);
    await page.evaluate(([id, what]) => (window as any).__until(() => /open/.test((window as any).game.scene.getScene('world').map.builds.find((b: any) => b.piece.id === id)?.piece.piece.prop ?? ''), what), [id, what] as const);
  };
  await openTo('right', 'E ouvre la porte de la chambre du coq');
  // de la 14e marche (266 cm, au-dessus de l'assise du cordon, 240-260, qui fait le seuil), par la porte
  const seuil = at(860, 167);
  await goTo(seuil.x, seuil.y, 'x', 3);
  const coq = at(860, 310);
  await goTo(coq.x, coq.y, 'y', 3);
  const cloison = at(1265, 290);
  await goTo(cloison.x, coq.y, 'x', 3);
  await goTo(cloison.x, cloison.y, 'y', 2);
  await openTo('right', 'E ouvre la porte de la chambre de la fille');
  const fille = at(1450, 290);
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
  await goTo(cloison.x, cloison.y, 'x', 3);
  await goTo(cloison.x, coq.y, 'y', 2);
  await goTo(coq.x, coq.y, 'x', 3);
  await goTo(seuil.x, seuil.y, 'y', 3);
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
}, { speed: 1 }); // x1 : des gestes fins dans un palier d'un mètre (ouvrir hors du battant, passer de la 14e marche), qu'une image de 20 cm (x10) sauterait
