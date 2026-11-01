// Test de scénario des vitesses de Xéros (docs/CONCEPTION.md, « Le travail », § 8), dans le vrai jeu : par défaut, la marche à 2 m/s
// (40 px/s à 5 cm par pixel) ; réglées dans ?dieu, la marche à 1,3 m/s fait 26 px/s, la course à 2,5 m/s 50 px/s ; une seule source :
// chargé (une bille de 64 kg dans les bras), il marche à la marche réglée × ce que permet sa force, jamais plus vite ; fatigué, à la
// marche × `tiredWalk` (1 m/s par défaut) ; retenues après rechargement ; « Par défaut » revient aux valeurs de config.ts. La vitesse lue
// est celle que le jeu donne au corps de Xéros (une distance chronométrée mentirait sur une machine chargée).
// Usage : npm run test:vitesses (lancé aussi par npm run test:scenarios).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('vitesses', async ({ page, errors, load }) => {
  // la vitesse du corps en marchant vers l'est (ou en courant, Maj), dans un coin dégagé de la ferme ; `load` : ce qu'il porte
  const measure = (o: { run?: boolean; carry?: boolean; tired?: boolean }) =>
    page.evaluate(async (o) => {
      const sleep = (t: number) => new Promise((r) => setTimeout(r, t));
      const g = (window as any).game;
      const w = () => g.scene.getScene('world');
      const send = async (c: unknown) => {
        g.events.emit('dieu', c);
        await sleep(150);
      };
      if (w().map.def.id !== 'ferme') {
        await send({ kind: 'map', map: 'ferme' });
        await sleep(2000);
      }
      await send({ kind: 'stamina-infinite', on: !o.tired });
      await send({ kind: 'stamina', breath: o.tired ? 10 : 100, ceiling: o.tired ? 10 : 100, max: 100 });
      if (o.carry) await send({ kind: 'give', held: { prop: 'wood-piece', wood: { size: 'normal', length: 100, shape: 'round', axis: 'ew' } } });
      const m = w().map;
      let spot: number[] | undefined;
      for (let y = 80; y < m.height - 80 && !spot; y += 16) {
        for (let x = 80; x < m.width - 300 && !spot; x += 16) if (m.areaFree({ left: x - 10, right: x + 260, top: y - 12, bottom: y + 12 })) spot = [x, y];
      }
      const a = w().player.actor;
      a.body.reset(spot![0], spot![1]);
      await sleep(200);
      if (o.run) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', keyCode: 16 } as KeyboardEventInit));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', keyCode: 68 } as KeyboardEventInit));
      await sleep(400);
      const v = Math.hypot(a.body.velocity.x, a.body.velocity.y);
      const factor = w().player.strength.walkFactor() * w().player.stamina.walkFactor();
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', keyCode: 68 } as KeyboardEventInit));
      if (o.run) window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', keyCode: 16 } as KeyboardEventInit));
      await sleep(150);
      if (o.carry) {
        const gs = await import('/src/state/index.ts' as string);
        gs.emptyHands(gs.game);
        w().handsChanged();
      }
      return { v, factor };
    }, o);
  const send = (c: unknown) =>
    page.evaluate(async (c) => {
      (window as any).game.events.emit('dieu', c);
      await new Promise((r) => setTimeout(r, 200));
    }, c);

  const before = await measure({});
  await send({ kind: 'speeds', walk: 1.3, run: 2.5 });
  const walk = await measure({});
  const run = await measure({ run: true });
  const carry = await measure({ carry: true });
  const tired = await measure({ tired: true });
  await load('?dieu');
  const kept = await measure({});
  await send({ kind: 'speeds-default' });
  const back = await measure({});
  console.log(JSON.stringify({ before, walk, run, carry, tired, kept, back }));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  const near = (v: number, want: number, what: string) => assert.ok(Math.abs(v - want) < 0.5, `${what} : ${want} px/s attendus, ${v.toFixed(1)}`);
  near(before.v, 40, 'par défaut, la marche (2 m/s)');
  near(walk.v, 26, 'la marche à 1,3 m/s');
  near(run.v, 50, 'la course à 2,5 m/s');
  assert.ok(carry.factor < 1, `la bille de 64 kg ralentit Xéros (${carry.factor.toFixed(2)})`);
  near(carry.v, 26 * carry.factor, 'chargé : la marche réglée × sa force, jamais une vitesse à part');
  near(tired.v, 26 * 0.5, 'fatigué : la moitié de la marche réglée');
  near(kept.v, 26, 'retenue après rechargement');
  near(back.v, 40, '« Par défaut »');
  console.log('  ✓ vitesses : 2 m/s par défaut ; réglées dans ?dieu, la marche, la course, et chargé ou fatigué une part de la marche ; retenues ; « Par défaut »');
});
