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
    const census = () => w().creatures.census(me().x, me().y) as { id: string; mode: string; x: number; y: number; dist: number; seenAt: number; hp: number; fled?: string }[];
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

    // une bande libre de 28 m d'ouest en est, près d'une garenne, pour marcher droit vers un lapin : le lapin sort à son bout est (3 m
    // à l'est de Xéros, ?dieu « Faire sortir », de la garenne la plus proche), assez près des entrées de sa garenne pour y brouter sans
    // partir (`graze.range`, moins une marge), et Xéros s'en éloigne de 20 m vers l'ouest dans la bande
    const lane = (y: number, x0: number, x1: number) => {
      for (let x = x0; x <= x1; x += 2) if (!w().map.areaFree({ left: x - 8, top: y - 8, right: x + 8, bottom: y + 2 })) return false;
      return true;
    };
    const warrens = (w().creatures as any).warrens as { site: { id: number; population: number; holes: { x: number; y: number }[] } }[];
    const holeDist = (site: { holes: { x: number; y: number }[] }, x: number, y: number) => Math.min(...site.holes.map((h) => Math.hypot(h.x - x, h.y - y)));
    const reach = (def.graze.range - 4) * 20;
    let X0 = 0;
    let laneY = 0;
    for (const { site } of [...warrens].sort((a, b) => b.site.population - a.site.population)) {
      const xs = site.holes.map((h) => h.x);
      const ys = site.holes.map((h) => h.y);
      for (let y = Math.min(...ys) - reach; y <= Math.max(...ys) + reach && !laneY; y += 4) {
        for (let x0 = Math.min(...xs) - 560; x0 <= Math.max(...xs) && !laneY; x0 += 8) {
          const rx = x0 + 480;
          if (holeDist(site, rx, y) > reach) continue;
          // la garenne dont sortira le lapin : la plus proche de Xéros, par son entrée la plus proche
          if (warrens.some((o) => o.site !== site && holeDist(o.site, x0 + 420, y) < holeDist(site, x0 + 420, y))) continue;
          if (lane(y, x0, x0 + 560)) {
            X0 = x0;
            laneY = y;
          }
        }
      }
      if (laneY) break;
    }
    if (!laneY) throw new Error('aucune bande libre de 28 m près d’une garenne');
    out.laneY = laneY;
    out.laneX = X0;
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
     * Xéros recule à 20 m à l'ouest du lapin `id`, attend qu'il soit calme, puis marche vers lui (les touches `keys`, et il se dirige
     * vers lui s'il s'écarte de sa ligne) : à chaque pas de
     * jeu, l'état du lapin et sa distance à Xéros ; s'arrête quand il fuit (ou qu'il n'est plus là). Rend la distance au premier passage
     * aux aguets, à la fuite, et la plus courte avant la fuite.
     */
    const approach = async (id: string, keys: string[]) => {
      const c = find(id)!;
      await stand(c.x - 400, c.y, 'right');
      await W.__until(() => find(id)?.mode === 'calm', `le lapin ${id} calme, Xéros à 20 m`);
      const seen: { alert?: number; flee?: number; why?: string; min: number } = { min: Infinity };
      const watch = () => {
        const q = find(id);
        if (!q) return;
        // la distance d'où il a perçu Xéros (sa place au début du pas) : au pas où il fuit, il a déjà fait son premier bond
        if (q.mode === 'alert' && seen.alert === undefined) seen.alert = q.seenAt;
        if (q.mode === 'flee' && seen.flee === undefined) [seen.flee, seen.why] = [q.seenAt, q.fled];
        if (seen.flee === undefined) seen.min = Math.min(seen.min, q.dist);
      };
      // Xéros marche vers le lapin, comme un joueur qui le vise : vers l'est (les touches `keys`), et vers le nord ou le sud quand le
      // lapin, qui broute en sautillant, s'écarte de sa ligne
      let side = '';
      const steer = () => {
        const q = find(id);
        const want = !q ? '' : q.y < me().y - 6 ? 'KeyW' : q.y > me().y + 6 ? 'KeyS' : '';
        if (want === side) return;
        if (side) key('keyup', side);
        if (want) key('keydown', want);
        side = want;
      };
      w().events.on('postupdate', watch);
      w().events.on('postupdate', steer);
      for (const k of keys) key('keydown', k);
      await W.__until(() => seen.flee !== undefined || !find(id), `le lapin ${id} fuit devant Xéros (${keys.join('+')}) ; Xéros en (${Math.round(me().x)}, ${Math.round(me().y)}), le lapin en (${Math.round(find(id)?.x ?? 0)}, ${Math.round(find(id)?.y ?? 0)}), ${find(id)?.mode}`);
      for (const k of keys) key('keyup', k);
      w().events.off('postupdate', steer);
      if (side) key('keyup', side);
      w().events.off('postupdate', watch);
      return seen;
    };

    /**
     * Un lapin sort, Xéros l'approche (`approach`). Les lapins d'une garenne broutent ensemble : celui que Xéros fait fuir en passant
     * tambourine en entrant au terrier, et l'alerte fait fuir tous ceux qui sont à `thump.radius` m (le jeu, voulu). Une fuite sur
     * l'alerte d'un autre (`fled` : `alarm`) ne mesure pas ce que le lapin perçoit de Xéros : un autre lapin sort, et Xéros recommence
     * (trois fois au plus, chacune comptée dans `alarms`).
     */
    const measure = async (keys: string[]) => {
      for (let n = 0; ; n++) {
        const id = await spawnAt(X0 + 420);
        const seen = await approach(id, keys);
        if (seen.why !== 'alarm' || n === 2) return { id, seen };
        out.alarms = ((out.alarms as number) ?? 0) + 1;
        await W.__until(() => !find(id), `le lapin ${id}, alerté par un autre, entre au terrier`);
      }
    };

    // ---------- à la marche : aux aguets, puis la fuite, puis le terrier ----------
    const a = await measure(['KeyD']);
    out.walk = a.seen;
    await W.__until(() => !find(a.id), `le lapin ${a.id} entre au terrier`);
    out.walkEntered = true;

    // ---------- en marche discrète : plus près ----------
    const b = await measure(['AltLeft', 'KeyD']);
    out.sneak = b.seen;
    // il rentre au terrier et y tambourine : l'alerte ferait fuir le lapin de l'essai suivant, sorti à 11 m de là
    await W.__until(() => !find(b.id), `le lapin ${b.id} entre au terrier`);
    out.senses = { walk: def.senses.walk, sneak: def.senses.sneak };

    // ---------- la force au maximum, un coup de branche : un lapin mort ----------
    await send({ kind: 'force', multiplier: 10 });
    await send({ kind: 'give', held: { item: 'branch' } });
    // un lapin qui se laisse approcher (ses distances réglées dans ?dieu), la précision du coup sans écart
    for (const gait of ['still', 'sneak', 'walk', 'run']) await send({ kind: 'creature-senses', creature: kind, gait, alert: 0.2, near: 0.1 });
    w().combat.rand = () => 0;
    // toutes les garennes de la ferme : le lapin tué manque à la sienne
    const members = () => (Object.values(gs.game.maps.ferme.warrens) as { members: unknown[] }[]).reduce((n, g) => n + g.members.length, 0);
    out.membersBefore = members();
    const c = await spawnAt(X0 + 200);
    const q0 = find(c)!;
    await stand(q0.x - 22, q0.y, 'right');
    // Xéros le suit à sa gauche (il broute et sautille) et frappe dès qu'il y est, comme un joueur : tout se décide à chaque pas de
    // jeu (postupdate), jamais à la lecture du test (à x10 sous la charge, une image vaut jusqu'à 80 pas de jeu, plus d'une seconde :
    // le lapin aurait le temps de s'éloigner entre le pas où Xéros arrive et le clic)
    const at = { x: q0.x, y: q0.y };
    const held = new Set<string>();
    let clicks = 0;
    let button: 'left' | 'right' | undefined;
    // le journal des coups au dernier clic : un nouveau clic attend que le précédent ait donné son coup
    let logged = -1;
    const hunter = () => {
      const q = find(c);
      if (!q || clicks >= 6) return;
      const dx = q.x - 22 - me().x;
      const dy = q.y - me().y;
      const there = Math.abs(dx) <= 3 && Math.abs(dy) <= 3;
      const want = new Set(there ? [] : [...(dx > 1 ? ['KeyD'] : dx < -1 ? ['KeyA'] : []), ...(dy > 1 ? ['KeyS'] : dy < -1 ? ['KeyW'] : [])]);
      for (const k of held) if (!want.has(k)) (key('keyup', k), held.delete(k));
      for (const k of want) if (!held.has(k)) (key('keydown', k), held.add(k));
      if (!there || w().mode !== 'play' || w().combat.busy || w().combat.log.length === logged) return;
      // la branche est dans la main droite (clic gauche) : contre ce qui encaisse un coup, une ressource frappe
      button = (['left', 'right'] as const).find((b) => w().keys?.clicks[b].short.kind === 'strike') ?? 'left';
      [at.x, at.y] = [q.x, q.y];
      W.__aim(q.x, q.y - 3);
      W.__press(button);
      W.__release(button);
      logged = w().combat.log.length;
      clicks++;
    };
    w().events.on('postupdate', hunter);
    await W.__until(() => !find(c) || clicks >= 6, `le lapin tué disparaît (coup : ${JSON.stringify(button)}, ${clicks} clics ; le lapin ${JSON.stringify(find(c))} ; Xéros en (${Math.round(me().x)}, ${Math.round(me().y)}))`);
    w().events.off('postupdate', hunter);
    for (const k of held) key('keyup', k);
    W.__leave();
    out.button = button;
    out.clicks = clicks;
    if (find(c)) throw new Error(`le lapin n'est pas mort en ${clicks} coups (${JSON.stringify(find(c))})`);
    await W.__settle();
    const ground = gs.game.maps.ferme.ground as { item?: string; x: number; y: number }[];
    const dead = ground.find((o) => o.item === def.becomes);
    out.dead = dead ? { x: dead.x, y: dead.y, from: { x: at.x, y: at.y } } : undefined;
    out.membersAfter = members();
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
  assert.ok(walk.why === 'seen' && (sneak.why === undefined || sneak.why === 'seen'), `les fuites mesurées sont dues à Xéros (${walk.why}, ${sneak.why} ; ${r.alarms ?? 0} alertes d'un autre lapin)`);
  assert.ok(walk.alert !== undefined && walk.alert < senses.walk.alert && walk.alert >= senses.walk.near, `à la marche, aux aguets entre ${senses.walk.near} et ${senses.walk.alert} m (${walk.alert})`);
  assert.ok(walk.flee !== undefined && walk.flee < senses.walk.near, `à la marche, il fuit en deçà de ${senses.walk.near} m (${walk.flee})`);
  assert.ok(r.walkEntered, 'il entre au terrier');
  assert.ok(sneak.min < senses.walk.near - 1, `en marche discrète, Xéros approche à ${sneak.min.toFixed(1)} m sans le faire fuir (à la marche, ${senses.walk.near} m)`);
  assert.ok(sneak.flee === undefined || sneak.flee < senses.sneak.near, `en marche discrète, il fuit en deçà de ${senses.sneak.near} m (${sneak.flee})`);
  assert.equal(r.clicks, 1, `la force au maximum, un seul coup de branche le tue (${r.clicks} clics)`);
  assert.ok(r.dead, 'un lapin mort au sol');
  assert.ok(Math.hypot(r.dead.x - r.dead.from.x, r.dead.y - r.dead.from.y) < 40, `le lapin mort là où le lapin est mort (${JSON.stringify(r.dead)})`);
  assert.equal(r.deadCount, 1, 'un seul lapin mort');
  assert.equal(r.membersAfter, r.membersBefore - 1, 'la garenne compte une bête de moins');
  assert.ok(r.held.includes('dead-rabbit'), `le lapin mort ramassé (${JSON.stringify(r.held)})`);
  console.log(
    `✓ lapins : ${r.outside} dehors à l'aube ; à la marche, aux aguets à ${walk.alert.toFixed(1)} m, fuite à ${walk.flee.toFixed(1)} m, au terrier ; en marche discrète, approché à ${sneak.min.toFixed(1)} m${r.alarms ? ` (${r.alarms} fuite${r.alarms > 1 ? 's' : ''} sur l'alerte d'un autre lapin, recommencée${r.alarms > 1 ? 's' : ''})` : ''} ; la force au maximum, un coup de branche le tue, un lapin mort à sa place, ramassé`,
  );
});
