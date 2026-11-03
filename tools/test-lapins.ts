// Test de scénario des lapins (docs/CONCEPTION.md, « Les créatures »), dans le vrai jeu (tools/lib/playtest.ts), avec ?dieu&debug :
// - à l'aube, sur la ferme, des lapins sont dehors autour de la garenne ;
// - Xéros approche en marchant : le lapin passe aux aguets (entre la distance d'alerte et celle de fuite de la marche), puis fuit, entre
//   au terrier et disparaît ;
// - en marche discrète (Alt), il approche plus près qu'à la marche avant que le lapin ne fuie ;
// - avec la force au maximum (?dieu), un coup de branche tue un lapin (ses distances réglées dans ?dieu pour qu'il se laisse approcher) :
//   il devient un lapin mort, là où il est mort, la garenne compte une bête de moins, et le lapin mort se ramasse.
// Le lapin du test sort de la garenne par ?dieu « Faire sortir près de Xéros », sur une bande de pré libre choisie par le jeu lui-même.
// Usage : npm run test:lapins (lancé aussi par npm run test:scenarios).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('lapins', async ({ page, load }) => {
  await load('?dieu&reset&debug');
  const r = (await page.evaluate(async () => {
    const W = window as any;
    const g = W.game;
    const w = () => g.scene.getScene('world');
    const urls = { state: '/src/state/index.ts', content: '/src/content/index.ts' };
    const gs = await import(urls.state);
    const content = await import(urls.content);
    const send = async (c: unknown) => {
      g.events.emit('dieu', c);
      await W.__settle();
    };
    const key = (type: 'keydown' | 'keyup', code: string) => window.dispatchEvent(new KeyboardEvent(type, { code }));
    const me = () => w().player.actor;
    const census = () => w().creatures.census(me().x, me().y) as { id: string; mode: string; x: number; y: number; dist: number; seenAt: number; hp: number }[];
    const find = (id: string) => census().find((c) => c.id === id);
    const out: Record<string, unknown> = {};

    // dehors, sur la ferme : la partie neuve commence à l'aube
    await W.__restart({ kind: 'map', map: 'ferme' });
    await send({ kind: 'stamina-infinite', on: true });
    out.hour = gs.game.clock.minute / 60;
    out.outside = census().length;
    const kind = w().map.def.warrens[0]?.creature;
    out.kind = kind;
    const def = content.creatures[kind];

    // une bande de pré libre de 25 m d'ouest en est, au nord de la maison, pour marcher droit vers un lapin
    const lane = (y: number, x0: number, x1: number) => {
      for (let x = x0; x <= x1; x += 2) if (!w().map.areaFree({ left: x - 8, top: y - 8, right: x + 8, bottom: y + 2 })) return false;
      return true;
    };
    const X0 = 2850;
    const X1 = X0 + 560;
    let laneY = 0;
    for (let y = 1100; y <= 1480 && !laneY; y += 4) if (lane(y, X0, X1)) laneY = y;
    out.laneY = laneY;
    const stand = async (x: number, y: number, face: string) => {
      me().body.reset(Math.round(x), Math.round(y));
      me().face(face);
      await W.__frames(2);
    };
    /** Un lapin sort à 3 m à l'est de Xéros posé en (x, laneY) ; rend son identifiant. */
    const spawnAt = async (x: number) => {
      await stand(x, laneY, 'right');
      const before = new Set(census().map((c) => c.id));
      await send({ kind: 'creature-spawn' });
      const c = census().find((c) => !before.has(c.id));
      if (!c) throw new Error('aucun lapin n’est sorti (?dieu « Faire sortir près de Xéros »)');
      return c.id;
    };
    /**
     * Xéros recule à 20 m à l'ouest du lapin `id`, attend qu'il soit calme, puis marche vers lui (les touches `keys`) : à chaque pas de
     * jeu, l'état du lapin et sa distance à Xéros ; s'arrête quand il fuit (ou qu'il n'est plus là). Rend la distance au premier passage
     * aux aguets, à la fuite, et la plus courte avant la fuite.
     */
    const approach = async (id: string, keys: string[]) => {
      const c = find(id)!;
      await stand(c.x - 400, c.y, 'right');
      await W.__until(() => find(id)?.mode === 'calm', `le lapin ${id} calme, Xéros à 20 m`);
      const seen: { alert?: number; flee?: number; min: number } = { min: Infinity };
      const watch = () => {
        const q = find(id);
        if (!q) return;
        // la distance d'où il a perçu Xéros (sa place au début du pas) : au pas où il fuit, il a déjà fait son premier bond
        if (q.mode === 'alert' && seen.alert === undefined) seen.alert = q.seenAt;
        if (q.mode === 'flee' && seen.flee === undefined) seen.flee = q.seenAt;
        if (seen.flee === undefined) seen.min = Math.min(seen.min, q.dist);
      };
      w().events.on('postupdate', watch);
      for (const k of keys) key('keydown', k);
      await W.__until(() => seen.flee !== undefined || !find(id), `le lapin ${id} fuit devant Xéros (${keys.join('+')})`);
      for (const k of keys) key('keyup', k);
      w().events.off('postupdate', watch);
      return seen;
    };

    // ---------- à la marche : aux aguets, puis la fuite, puis le terrier ----------
    const a = await spawnAt(X0 + 420);
    out.walk = await approach(a, ['KeyD']);
    await W.__until(() => !find(a), `le lapin ${a} entre au terrier`);
    out.walkEntered = true;

    // ---------- en marche discrète : plus près ----------
    const b = await spawnAt(X0 + 420);
    out.sneak = await approach(b, ['AltLeft', 'KeyD']);
    out.senses = { walk: def.senses.walk, sneak: def.senses.sneak };

    // ---------- la force au maximum, un coup de branche : un lapin mort ----------
    await send({ kind: 'force', multiplier: 10 });
    await send({ kind: 'give', held: { item: 'branch' } });
    // un lapin qui se laisse approcher (ses distances réglées dans ?dieu), la précision du coup sans écart
    for (const gait of ['still', 'sneak', 'walk', 'run']) await send({ kind: 'creature-senses', creature: kind, gait, alert: 0.2, flee: 0.1 });
    w().combat.rand = () => 0;
    const membersBefore = Object.values(gs.game.maps.ferme.warrens)[0] as { members: unknown[] };
    out.membersBefore = membersBefore.members.length;
    const c = await spawnAt(X0 + 200);
    const q = find(c)!;
    await stand(q.x - 22, q.y, 'right');
    const at = find(c)!;
    // la branche est dans la main droite (clic gauche) : contre ce qui encaisse un coup, une ressource frappe
    const button = await W.__do('strike', { at: { x: at.x, y: at.y - 3 } });
    out.button = button;
    await W.__until(() => !find(c), 'le lapin tué disparaît');
    await W.__settle();
    const ground = gs.game.maps.ferme.ground as { item?: string; x: number; y: number }[];
    const dead = ground.find((o) => o.item === def.becomes);
    out.dead = dead ? { x: dead.x, y: dead.y, from: { x: at.x, y: at.y } } : undefined;
    out.membersAfter = (Object.values(gs.game.maps.ferme.warrens)[0] as { members: unknown[] }).members.length;
    out.deadCount = ground.filter((o) => o.item === def.becomes).length;
    // le ramasser : la main gauche (clic droit) est libre
    if (dead) {
      await stand(dead.x - 16, dead.y, 'right');
      await W.__do('take', { at: { x: dead.x, y: dead.y - 2 } });
      out.held = [...gs.game.hands].map((h: { item?: string } | null) => h?.item ?? null);
    }
    return out;
  })) as Record<string, any>;

  console.log(JSON.stringify(r));
  assert.ok(r.hour >= 5 && r.hour < 8.5, `l'aube (${r.hour} h)`);
  assert.ok(r.outside >= 4, `à l'aube, des lapins dehors (${r.outside})`);
  assert.ok(r.laneY > 0, 'une bande de pré libre pour marcher');
  const { walk, sneak, senses } = r;
  assert.ok(walk.alert !== undefined && walk.alert < senses.walk.alert && walk.alert >= senses.walk.flee, `à la marche, aux aguets entre ${senses.walk.flee} et ${senses.walk.alert} m (${walk.alert})`);
  assert.ok(walk.flee !== undefined && walk.flee < senses.walk.flee, `à la marche, il fuit en deçà de ${senses.walk.flee} m (${walk.flee})`);
  assert.ok(r.walkEntered, 'il entre au terrier');
  assert.ok(sneak.min < senses.walk.flee - 1, `en marche discrète, Xéros approche à ${sneak.min.toFixed(1)} m sans le faire fuir (à la marche, ${senses.walk.flee} m)`);
  assert.ok(sneak.flee === undefined || sneak.flee < senses.sneak.flee, `en marche discrète, il fuit en deçà de ${senses.sneak.flee} m (${sneak.flee})`);
  assert.ok(r.dead, 'un lapin mort au sol');
  assert.ok(Math.hypot(r.dead.x - r.dead.from.x, r.dead.y - r.dead.from.y) < 40, `le lapin mort là où le lapin est mort (${JSON.stringify(r.dead)})`);
  assert.equal(r.deadCount, 1, 'un seul lapin mort');
  assert.equal(r.membersAfter, r.membersBefore - 1, 'la garenne compte une bête de moins');
  assert.ok(r.held.includes('dead-rabbit'), `le lapin mort ramassé (${JSON.stringify(r.held)})`);
  console.log(
    `✓ lapins : ${r.outside} dehors à l'aube ; à la marche, aux aguets à ${walk.alert.toFixed(1)} m, fuite à ${walk.flee.toFixed(1)} m, au terrier ; en marche discrète, approché à ${sneak.min.toFixed(1)} m ; la force au maximum, un coup de branche le tue, un lapin mort à sa place, ramassé`,
  );
});
