// Le fagot garde son nombre de branches, dans le vrai jeu (tools/lib/playtest.ts), au vrai clavier (bug vu par Grégoire : un tas de 2
// branches noué donnait un fagot de 10, et le dénouer rendait 10 branches). Pour chaque nombre de 2 au tas plein : un tas lié de n branches
// devant Xéros (?dieu), E maintenu le noue (un tas d'un fagot de n branches) ; E court le prend (le fagot tenu compte n) ;
// A (Q en QWERTY) le pose seul (un objet né qui compte n, dessiné à son nombre) ; E maintenu le dénoue : le tas lié a exactement n
// branches. Puis un fagot de 3 posé seul, la page rechargée : il compte toujours 3, et dénoué rend 3 branches. Pour un nombre sur deux,
// E court pour prendre le fagot se fait sur une machine lente (une image de 700 ms juste après l'appui) : il reste un appui court. Jusqu'au tas de branches plein (ses places dans
// piles.json). Usage : npm run test:noeud.

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('noeud', async ({ page, errors, load }) => {
  /** Une partie de la boucle, dans la page : de `n` branches, jusqu'au fagot posé seul (`keep` : on s'arrête là). */
  const round = (n: number, keep: boolean) =>
    page.evaluate(
      async ({ n, keep }) => {
        const g = (window as any).game;
        const w = () => g.scene.getScene('world');
        const until = (window as any).__until as (c: () => boolean, label: string) => Promise<void>;
        const stateUrl = '/src/state/index.ts';
        const contentUrl = '/src/content/index.ts';
        const gs = await import(stateUrl);
        const content = await import(contentUrl);
        const branches = Object.keys(content.piles).find((k: string) => content.piles[k].tie?.into);
        const fagot = content.piles[branches!].tie.into as string;
        const ms = () => gs.mapState(gs.game, w().map.def.id);
        // une touche, comme un joueur : E (prendre ; maintenu, nouer et dénouer), A (Q en QWERTY : poser)
        const key = (type: string, code: string) => void window.dispatchEvent(new KeyboardEvent(type, { code }));
        // deux images, que le jeu voie Xéros à sa nouvelle place et calcule sa cible avant l'appui
        const frames = async () => {
          await new Promise((r) => requestAnimationFrame(r));
          await new Promise((r) => requestAnimationFrame(r));
        };
        const tap = async (code: string, done: () => boolean, label: string) => {
          await frames();
          key('keydown', code);
          await until(done, label);
          key('keyup', code);
        };
        // un appui court (E court : prendre ; Q : poser), relâché à l'image suivante, puis l'état attendu
        // un appui court (E court : prendre ; Q : poser), relâché à l'image suivante, puis l'état attendu (le jeu garde l'appui jusqu'à
        // le lire, src/input/keyLatch.ts : un seul appui suffit, même quand il rame)
        // `slow` : la machine lente (Grégoire : un appui court n'y est jamais perdu ni changé en appui long) ; le jeu voit l'appui
        // commencer, puis la touche est relâchée pendant une image de 700 ms (la page bloquée), plus longue qu'un appui maintenu (500 ms)
        const press = async (code: string, done: () => boolean, label: string, slow = false) => {
          await frames();
          if (slow) {
            // enfoncée à un pas de jeu, relâchée au pas où le jeu a vu l'appui commencer (à x10, quelques ms plus tard ; jamais la durée
            // d'une image, qui sous la charge dépasse celle d'un appui maintenu), puis la page bloquée 700 ms
            await new Promise<void>((done) => {
              let down = false;
              const step = () => {
                if (!down) return void ((down = true), key('keydown', code));
                if (!w().ePress.pending) return;
                w().events.off('postupdate', step);
                key('keyup', code);
                const t = performance.now();
                while (performance.now() - t < 700);
                done();
              };
              w().events.on('postupdate', step);
            });
          } else {
            // une tape : enfoncée puis relâchée aussitôt (le jeu la garde jusqu'à la lire, src/input/keyLatch.ts)
            key('keydown', code);
            key('keyup', code);
          }
          await until(done, label).catch((e: Error) => {
            throw new Error(`${e.message} (messages : ${notices.join(' / ')} ; mode ${w().mode} ; mains ${JSON.stringify([gs.game.hands, gs.game.both])} ; tas ${JSON.stringify(ms().piles)})`);
          });
        };
        const out: Record<string, unknown> = { n };
        const notices: string[] = ((window as any).notices ??= []);
        if (!(window as any).listening) ((window as any).listening = true), g.events.on('notice', (t: string) => notices.push(t));
        // une place dégagée, Xéros tourné vers le bas
        const m = w().map;
        let spot: { x: number; y: number } | undefined;
        for (let y = 200; y < m.height - 200 && !spot; y += 16) for (let x = 200; x < m.width - 200 && !spot; x += 16) if (m.areaFree({ left: x - 40, top: y - 20, right: x + 40, bottom: y + 60 })) spot = { x, y };
        const a = w().player.actor;
        a.body.reset(spot!.x, spot!.y);
        a.face('down');
        // le tas lié de n branches
        const before = ms().piles.length;
        g.events.emit('dieu', { kind: 'pile', pile: branches, count: n, turned: false, tie: true });
        await until(() => ms().piles.length > before, 'le tas de branches');
        out.pile = ms().piles.at(-1).places.length;
        // Xéros au nord du tas, tourné vers lui (ses pièces au sol : l'emprise de ses places posées)
        const facePile = () => {
          const p = w().map.piles.at(-1);
          const zs = p.pile.places.map((id: string) => p.def.places[id].body).filter(Boolean);
          const left = p.pile.x + Math.min(...zs.map((z: any) => z.x));
          const right = p.pile.x + Math.max(...zs.map((z: any) => z.x + z.w));
          const top = p.pile.y + Math.min(...zs.map((z: any) => z.y));
          a.body.reset(Math.round((left + right) / 2), Math.round(top - 3));
          a.face('down');
        };
        facePile();
        // E maintenu, les mains vides : noué
        await tap('KeyE', () => ms().piles.some((p: any) => p.pile !== branches), 'le fagot noué').catch((e: Error) => {
          throw new Error(`${e.message} (messages : ${notices.join(' / ')} ; mode ${w().mode} ; tas ${JSON.stringify(ms().piles)} ; pieds ${a.x},${a.y})`);
        });
        const tied = ms().piles.find((p: any) => p.pile !== branches);
        out.tiedBundle = tied.bundle ?? null;
        // E : pris dans les mains
        await until(() => w().mode === 'play', 'le jeu');
        await press('KeyE', () => !!gs.game.both || !!gs.game.hands[0] || !!gs.game.hands[1], 'le fagot pris', n % 2 === 1);
        const held = gs.game.both ?? gs.game.hands[0] ?? gs.game.hands[1];
        out.held = held.prop;
        out.heldBundle = held.bundle ?? null;
        // Q : posé seul
        await press('KeyQ', () => ms().spawned.some((o: any) => o.type === fagot), 'le fagot posé seul');
        const lone = ms().spawned.find((o: any) => o.type === fagot);
        out.loneBundle = lone.bundle ?? null;
        out.image = w().map.props.find((p: any) => p.spawned && p.id === lone.id)?.image.texture.key;
        if (keep) return out;
        // E maintenu : dénoué
        const piles = ms().piles.length;
        await tap('KeyE', () => ms().piles.length > piles, 'le fagot dénoué');
        const back = ms().piles.at(-1);
        out.untied = back.places.length;
        out.untiedTie = !!back.tie;
        // place nette pour le suivant : on remet la carte à zéro
        await (window as any).__restart({ kind: 'reset-map' });
        return out;
      },
      { n, keep },
    );

  await page.evaluate(() => (window as any).__restart({ kind: 'map', map: 'ferme' }));
  const full = await page.evaluate(async () => {
    const contentUrl = '/src/content/index.ts';
    const content = await import(contentUrl);
    const b = Object.keys(content.piles).find((k: string) => content.piles[k].tie?.into)!;
    return Object.keys(content.piles[b].places).length;
  });
  // jusqu'au tas de branches plein : un fagot de plus de branches que le tas n'a de places ne se dénouerait pas (dessin du tas)
  for (let n = 2; n <= full; n++) {
    const r = (await round(n, false)) as Record<string, unknown>;
    const want = n === full ? null : n;
    assert.equal(r.pile, n, `tas de ${n} branches posé : ${JSON.stringify(r)}`);
    assert.equal(r.tiedBundle, want, `noué, le fagot compte ${n} : ${JSON.stringify(r)}`);
    assert.equal(r.heldBundle, want, `tenu, le fagot compte ${n} : ${JSON.stringify(r)}`);
    assert.equal(r.loneBundle, want, `posé seul, le fagot compte ${n} : ${JSON.stringify(r)}`);
    if (want) assert.ok(String(r.image).includes(`-n${n}`), `posé seul, le fagot est dessiné à ${n} branches (${r.image})`);
    assert.equal(r.untied, n, `dénoué, le fagot rend ${n} branches : ${JSON.stringify(r)}`);
    assert.ok(r.untiedTie, `dénoué, le lien reste sous le tas`);
    console.log(`  ✓ ${n} branches : noué, tenu, posé seul, dénoué : ${n} branches`);
  }

  // la sauvegarde : un fagot de 3 posé seul, la page rechargée
  const kept = (await round(3, true)) as Record<string, unknown>;
  assert.equal(kept.loneBundle, 3);
  // la sauvegarde s'écrit seule à chaque changement (systems/autosave.ts) : on attend qu'elle compte le fagot posé seul
  await page.evaluate(() => (window as any).__until(() => /"spawned":\[[^\]]*"bundle":3/.test(localStorage.getItem('xeros-partie') ?? ''), 'la sauvegarde du fagot posé seul'));
  await load('?dieu');
  const after = await page.evaluate(async () => {
    const g = (window as any).game;
    const w = () => g.scene.getScene('world');
    const until = (window as any).__until as (c: () => boolean, label: string) => Promise<void>;
    const stateUrl = '/src/state/index.ts';
    const gs = await import(stateUrl);
    const ms = () => gs.mapState(gs.game, w().map.def.id);
    const lone = ms().spawned.find((o: any) => o.bundle);
    const bundle = lone?.bundle ?? null;
    // Xéros devant lui, E maintenu : dénoué
    const p = w().map.props.find((q: any) => q.spawned && q.id === lone.id);
    const a = w().player.actor;
    a.body.reset(Math.round(p.baseX), Math.round(p.top - 2));
    a.face('down');
    const piles = ms().piles.length;
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    const notes: string[] = [];
    g.events.on('notice', (t: string) => notes.push(t));
    await until(() => ms().piles.length > piles, 'le fagot rechargé, dénoué').catch((e: Error) => {
      throw new Error(`${e.message} (carte ${w().map.def.id} ; mode ${w().mode} ; messages ${notes.join(' / ')} ; objets nés ${JSON.stringify(ms().spawned)} ; pieds ${a.x},${a.y} ; fagot ${p?.baseX},${p?.top})`);
    });
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
    return { map: w().map.def.id, bundle, untied: ms().piles.at(-1).places.length };
  });
  assert.equal(after.bundle, 3, `rechargé, le fagot posé seul compte 3 : ${JSON.stringify(after)}`);
  assert.equal(after.untied, 3, `rechargé puis dénoué, il rend 3 branches : ${JSON.stringify(after)}`);
  console.log('  ✓ sauvegarde : le fagot de 3 posé seul, la page rechargée, compte 3 et rend 3 branches');
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
});
