// Test de scénario des étapes visibles d'un travail (docs/CONCEPTION.md, « Le travail », § 6), dans le vrai jeu : l'arbre normal
// abattu au coup (lancé d'un appui sur Espace) passe par ses images d'étape dans l'ordre ; Xéros se met lui-même en place du côté où il
// frappe, l'entaille se dessine de ce côté (des étapes dessinées pour la gauche) et l'arbre tombe de ce côté ; (l'entaille en trois temps, le trait d'abattage, le craquement, il penche),
// puis tombe ; arrêté à une étape, il la garde après rechargement ; l'arbre couché s'allège à l'ébranchage. Xéros est rendu aussi
// fort que le permet un humain un humain (?dieu « force », plafonnée), l'endurance infinie et la simulation à x20, pour que l'essai reste court.
// Usage : npm run test:etapes (lancé aussi par npm run test:scenarios).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('etapes', async ({ page, errors, load }) => {
  // Espace devant la cible (le travail va seul) ; relève l'image de l'objet à chaque changement ; s'arrête (Échap) à l'image `until`
  const run = (args: { type: string; until?: string; side?: 'left' | 'right'; id?: number }) =>
    page.evaluate(async ({ type, until, side, id }) => {
      const sleep = (t: number) => new Promise((r) => setTimeout(r, t));
      const g = (window as any).game;
      const w = () => g.scene.getScene('world');
      const send = async (c: unknown) => {
        g.events.emit('dieu', c);
        await sleep(150);
      };
      if (w().map.def.id !== 'ferme') {
        await (window as any).__restart({ kind: 'map', map: 'ferme' });
      }
      await send({ kind: 'stamina-infinite', on: true });
      // la force au plafond humain (×2,6) et la simulation à x20 : l'essai reste court, sans rien sauter
      await send({ kind: 'force', multiplier: 10 });
      await send({ kind: 'sim-speed', factor: 20 });
      await send({ kind: 'give', held: { item: 'axe' } });
      const p = w().map.props.find((q: any) => q.type === type && q.image.visible && (id === undefined || q.id === id));
      if (!p) throw new Error(`pas de ${type} sur la ferme`);
      const a = w().player.actor;
      const before = new Set(w().map.props.filter((q: any) => q.type === 'normal-felled-tree').map((q: any) => q));
      if (type === 'normal-tree') {
        // tourné vers l'arbre mais pas tout à fait en place (un peu loin, un peu bas) : au lancement, Xéros se met lui-même en place
        a.body.reset(Math.round(p.aimX + (side === 'right' ? 19 : -19)), Math.round(p.aimY + 3));
        a.face(side === 'right' ? 'left' : 'right');
      } else {
        a.body.reset(Math.round(p.aimX), Math.round(p.aimY + 14));
        a.face('up');
      }
      await sleep(200);
      const keys: string[] = [p.image.texture.key];
      const flips: boolean[] = [];
      // un seul appui : le travail va seul
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', keyCode: 32 } as KeyboardEventInit));
      await sleep(60);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', keyCode: 32 } as KeyboardEventInit));
      for (let i = 0; i < 100 && w().mode !== 'work'; i++) await sleep(20);
      const stood = { dx: Math.round(a.x - p.aimX), dy: Math.round(a.y - p.aimY), facing: a.facing };
      const t0 = performance.now();
      while (w().map.props.includes(p) && performance.now() - t0 < 120000) {
        const k = p.image.texture.key;
        if (k !== keys.at(-1)) {
          keys.push(k);
          flips.push(p.image.flipX);
        }
        if (until && k === until) break;
        await sleep(20);
      }
      // Échap : arrêté après le coup en cours (sinon, le travail lancé va seul jusqu'au bout)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', keyCode: 27 } as KeyboardEventInit));
      await sleep(60);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', keyCode: 27 } as KeyboardEventInit));
      for (let i = 0; i < 200 && w().mode !== 'play'; i++) await sleep(20);
      await send({ kind: 'sim-speed', factor: 1 });
      await sleep(300);
      // l'arbre couché né de la chute : de quel côté du tronc
      await sleep(1500);
      const felled = w().map.props.find((q: any) => q.type === 'normal-felled-tree' && !before.has(q));
      const fellSide = felled ? (felled.x + felled.image.width / 2 < p.aimX ? 'left' : 'right') : null;
      return { keys, flips, stood, fellSide, id: p.id, spawned: !!p.spawned, gone: !w().map.props.includes(p), now: w().map.props.includes(p) ? p.image.texture.key : null, flipNow: p.image.flipX };
    }, args);

  // l'arbre normal, arrêté à l'entaille finie, retrouvé ainsi après rechargement ; Vite recharge parfois la page au premier lancement
  // (dépendances optimisées) : la première étape est alors rejouée une fois, sur une partie neuve
  // frappé depuis la gauche : Xéros se place à gauche, l'entaille à gauche (l'image retournée), l'arbre tombera à gauche
  const part = await run({ type: 'normal-tree', until: 'normal-tree-left-stage-3', side: 'left' }).catch(async (e: Error) => {
    if (!/context was destroyed|navigation/.test(e.message)) throw e;
    await load();
    return run({ type: 'normal-tree', until: 'normal-tree-left-stage-3', side: 'left' });
  });
  await load('?dieu');
  const after = await page.evaluate((id: number) => {
    const p = (window as any).game.scene.getScene('world').map.props.find((q: any) => q.id === id && !q.spawned);
    return { key: p?.image.texture.key, flip: p?.image.flipX };
  }, part.id);
  // puis jusqu'au bout (Xéros revient de la droite : le côté reste celui de l'entaille commencée, gardé avec le travail)
  const rest = await run({ type: 'normal-tree', side: 'right', id: part.id });
  // un autre arbre, frappé depuis la droite : l'entaille à droite (l'image telle quelle), la chute à droite
  const right = await run({ type: 'normal-tree', side: 'right' });
  const limbs = await run({ type: 'normal-felled-tree' });
  console.log(JSON.stringify({ part, after, rest, right, limbs }));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  const stages = (base: string, n: number) => Array.from({ length: n }, (_, i) => `${base}-stage-${i + 1}`);
  assert.deepEqual(part.keys, ['normal-tree', ...stages('normal-tree-left', 3)], `depuis la gauche, l'entaille se creuse à gauche en trois temps (${part.keys.join(', ')})`);
  assert.deepEqual(part.stood, { dx: -14, dy: 0, facing: 'right' }, 'au lancement, Xéros se met en place à gauche de l’arbre, tourné vers lui');
  assert.ok(part.flips.every((f: boolean) => !f), 'les étapes de gauche sont dessinées, pas retournées');
  assert.equal(part.now, 'normal-tree-left-stage-3', 'arrêté, l’arbre garde son entaille');
  assert.deepEqual(after, { key: 'normal-tree-left-stage-3', flip: false }, 'l’entaille est retrouvée après rechargement, du même côté');
  assert.equal(rest.stood.facing, 'right', 'repris depuis la droite, Xéros retourne du côté de l’entaille commencée');
  assert.equal(rest.fellSide, 'left', 'l’arbre tombe du côté de l’entaille : à gauche');
  assert.deepEqual(right.stood, { dx: 14, dy: 0, facing: 'left' }, 'depuis la droite : Xéros en place à droite, tourné vers l’arbre');
  assert.ok(right.keys.slice(1).every((k: string) => /^normal-tree-stage-\d$/.test(k)), `depuis la droite : l'entaille à droite (${right.keys.join(', ')})`);
  assert.equal(right.fellSide, 'right', 'l’arbre tombe à droite');
  assert.deepEqual(rest.keys.slice(0, 5), stages('normal-tree-left', 7).slice(2), `puis le trait d'abattage, le craquement, il penche (${rest.keys.join(', ')})`);
  assert.ok(rest.gone && right.gone, 'puis il tombe');
  assert.ok(limbs.keys.length >= 4 && limbs.keys.slice(1, 4).every((k: string, i: number) => k.endsWith(`-stage-${i + 1}`)), `l'ébranchage allège le houppier en trois temps (${limbs.keys.join(', ')})`);
  assert.ok(limbs.gone, 'ébranché, l’arbre couché devient une pièce de bois');
  console.log('  ✓ étapes : l’entaille en trois temps, gardée après rechargement, le trait, le craquement, l’arbre qui penche puis tombe ; l’ébranchage en trois temps');
});
