// Test de scénario des sangliers (docs/CONCEPTION.md, « Les créatures » et « La vie de Xéros »), dans le vrai jeu (tools/lib/playtest.ts),
// avec ?dieu&debug, d'une partie neuve, dans la forêt profonde :
// - un sanglier voit Xéros qui marche vers lui, annonce, charge en ligne droite et le renverse : Xéros perd de la vie, lâche ce qu'il
//   tient, glisse dans le sens de la charge, reste à terre, se relève ;
// - Xéros, la hache en main, se tient devant un gros tronc ; le sanglier charge, Xéros s'écarte en courant : la charge passe et
//   s'écrase contre le tronc, le sanglier reste sonné ; Xéros le frappe à la hache jusqu'à le tuer : il bascule et devient un sanglier
//   mort, la bauge compte une bête de moins ;
// - à midi, les sangliers de la forêt des ronces dorment à leur bauge : en marche discrète, Xéros approche à moins de 4 m sans en réveiller un ; un pas à la
//   marche, et il se réveille.
// Le sanglier des deux premiers essais vient près de Xéros par ?dieu « Faire sortir près de Xéros » (une bête de la bauge se lève) ;
// Xéros marche, court et frappe au clavier et à la souris, comme un joueur. La force est celle de Xéros, plafonnée au plus fort des
// humains (?dieu « force ») pour le coup de hache.
// Usage : npm run test:sangliers (lancé aussi par npm run test:scenarios).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('sangliers', async ({ page, load }) => {
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
    type Beast = { id: string; kind: string; mode: string; pose: string; x: number; y: number; v: number; dist: number; hp: number };
    const census = () => (w().creatures.census(me().x, me().y) as Beast[]).filter((c) => c.kind === 'boar');
    const find = (id: string) => census().find((c) => c.id === id);
    const def = content.creatures.boar;
    const out: Record<string, any> = {};
    const stand = async (x: number, y: number, face: string) => {
      me().body.reset(Math.round(x), Math.round(y));
      me().face(face);
      await W.__frames(2);
    };
    /** Un couloir libre (px) pour un corps de 16 px de haut, de x0 à x1, ses pieds sur y. */
    const lane = (y: number, x0: number, x1: number) => {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 2) if (!w().map.areaFree({ left: x - 8, top: y - 12, right: x + 8, bottom: y + 2 })) return false;
      return true;
    };
    /** Le sanglier vient à (dx, dy) m de Xéros ; rend son identifiant. */
    const summon = async (dx: number, dy: number) => {
      const msg = await new Promise<string>((res) => {
        const off = (t: string) => {
          g.events.off('notice', off);
          res(t);
        };
        g.events.on('notice', off);
        g.events.emit('dieu', { kind: 'creature-spawn', dx, dy });
      });
      await W.__settle();
      const near = census().sort((a, b) => a.dist - b.dist)[0];
      if (!near) throw new Error(`aucun sanglier n'est venu (${msg})`);
      return near.id;
    };

    // ---------- la forêt profonde, à l'aube : les sangliers sont debout ----------
    await W.__restart({ kind: 'map', map: 'foret-profonde' });
    await send({ kind: 'stamina-infinite', on: true });
    out.hour = gs.game.clock.minute / 60;
    out.boars = census().length;

    // ---------- 1. la charge qui renverse Xéros ----------
    // un couloir libre de 16 m d'ouest en est
    let L1: { x: number; y: number } | undefined;
    for (let y = 400; y < 3600 && !L1; y += 24) for (let x = 300; x < 3200 && !L1; x += 40) if (lane(y, x - 120, x + 220)) L1 = { x, y };
    if (!L1) throw new Error('aucun couloir libre de 16 m dans la forêt profonde');
    await stand(L1.x, L1.y, 'right');
    await send({ kind: 'give', held: { item: 'branch' } });
    const id1 = await summon(7.5, 0);
    await W.__until(() => find(id1)?.mode === 'calm' || find(id1)?.mode === 'alert', 'le sanglier arrivé, tranquille');
    const seen1: string[] = [];
    let downAt: { x: number; y: number } | undefined;
    const life0 = gs.game.health;
    const watch1 = () => {
      const q = find(id1);
      if (q && seen1[seen1.length - 1] !== q.mode) seen1.push(q.mode);
      if (!downAt && w().player.down) downAt = { x: me().x, y: me().y };
    };
    w().events.on('postupdate', watch1);
    const x0 = me().x;
    key('keydown', 'KeyD');
    await W.__until(() => w().player.down, `Xéros renversé (le sanglier : ${seen1.join(' > ')})`);
    key('keyup', 'KeyD');
    out.handsDown = [gs.game.hands[0], gs.game.hands[1], gs.game.both].filter(Boolean).length;
    out.lifeHit = gs.game.health;
    out.mode1 = w().mode;
    await W.__until(() => !w().player.down && w().mode === 'play', 'Xéros relevé');
    w().events.off('postupdate', watch1);
    await W.__resume();
    out.seen1 = seen1;
    out.life0 = life0;
    // la glissade : depuis là où il a été renversé
    out.slide = ((downAt?.x ?? me().x) - me().x) / 20;
    out.walked = ((downAt?.x ?? x0) - x0) / 20;
    out.branchOnGround = (gs.game.maps['foret-profonde'].ground as { item: string }[]).some((o) => o.item === 'branch');

    // ---------- 2. le tronc derrière Xéros, la bête sonnée, la hache ----------
    // un gros tronc, un couloir libre de 11 m à son ouest, à la hauteur du milieu de son corps
    const trunks = (w().map.props as any[]).filter((p) => p.type === 'big-tree' && p.box);
    let T: { box: { left: number; right: number; top: number; bottom: number }; y: number } | undefined;
    for (const p of trunks) {
      // loin des bords de la carte (Xéros s'écarte vers le nord)
      if (p.box.top < 200 || p.box.bottom > w().map.height - 200 || p.box.left < 400) continue;
      // loin du premier essai (le sanglier y est resté)
      if (Math.hypot(p.box.left - L1.x, p.box.top - L1.y) < 800) continue;
      const y = Math.round((p.box.top + p.box.bottom) / 2) + 4;
      if (lane(y, p.box.left - 220, p.box.left - 8) && lane(y - 24, p.box.left - 60, p.box.left - 20)) {
        T = { box: p.box, y };
        break;
      }
    }
    if (!T) throw new Error('aucun gros tronc avec 11 m libres à son ouest');
    // la hache en main, devant le tronc ; le sanglier vient à 7,5 m à l'ouest, et Xéros fait aussitôt un pas vers lui
    await stand(T.box.left - 30, T.y + 2, 'left');
    await send({ kind: 'force', multiplier: 10 });
    await send({ kind: 'give', held: { item: 'axe' } });
    w().combat.rand = () => 0;
    out.axeHeld = !!gs.game.both;
    const id2 = await summon(-7.5, -2 / 20);
    const seen2: string[] = [];
    let dodge = 0;
    const watch2 = (_t: number, delta: number) => {
      const q = find(id2);
      if (q && seen2[seen2.length - 1]?.split('@')[0] !== q.mode) seen2.push(`${q.mode}@${Math.round(q.x)},${Math.round(q.y)} X${Math.round(me().x)},${Math.round(me().y)}`);
      // le joueur voit la charge partir : il lâche A et court vers le nord, un tiers de seconde
      if (q?.mode === 'charge' && !dodge) {
        key('keyup', 'KeyA');
        key('keydown', 'ShiftLeft');
        key('keydown', 'KeyW');
        dodge = 1;
      } else if (dodge > 0 && dodge < 400) {
        dodge += delta;
        if (dodge >= 340) {
          key('keyup', 'KeyW');
          key('keyup', 'ShiftLeft');
          dodge = 400;
        }
      }
    };
    w().events.on('postupdate', watch2);
    // un pas vers lui, à la marche : il le voit
    key('keydown', 'KeyA');
    await W.__until(() => find(id2)?.mode === 'stunned' || w().player.down, `la charge finit contre le tronc (le sanglier : ${seen2.join(' > ')}, à (${Math.round(find(id2)?.x ?? 0)}, ${Math.round(find(id2)?.y ?? 0)}) ; Xéros en (${Math.round(me().x)}, ${Math.round(me().y)}))`);
    key('keyup', 'KeyA');
    key('keyup', 'KeyW');
    key('keyup', 'ShiftLeft');
    w().events.off('postupdate', watch2);
    out.seen2 = seen2;
    out.stunned = find(id2)?.mode === 'stunned';
    out.gored2 = w().player.down;
    // les coups de hache, tant qu'il vit
    const members = () => (Object.values(gs.game.maps['foret-profonde'].warrens) as { members: unknown[] }[]).reduce((n, q) => n + q.members.length, 0);
    out.membersBefore = members();
    const hits: number[] = [];
    const deadAt = { x: 0, y: 0 };
    // il court jusqu'à la bête sonnée, au nord de son flanc, comme un joueur (Maj et les flèches, droit vers elle)
    {
      const q = find(id2)!;
      const goal = { x: q.x, y: q.y - 22 };
      const held = new Set<string>();
      const steer = () => {
        const dx = goal.x - me().x;
        const dy = goal.y - me().y;
        const want = new Set(['ShiftLeft', ...(dx > 3 ? ['KeyD'] : dx < -3 ? ['KeyA'] : []), ...(dy > 3 ? ['KeyS'] : dy < -3 ? ['KeyW'] : [])]);
        if (want.size === 1) want.clear();
        for (const k of held) if (!want.has(k)) (key('keyup', k), held.delete(k));
        for (const k of want) if (!held.has(k)) (key('keydown', k), held.add(k));
      };
      w().events.on('postupdate', steer);
      await W.__until(() => Math.hypot(goal.x - me().x, goal.y - me().y) <= 4 || find(id2)?.mode !== 'stunned', `Xéros court jusqu'au sanglier sonné (${Math.round(me().x)}, ${Math.round(me().y)})`);
      w().events.off('postupdate', steer);
      for (const k of held) key('keyup', k);
      out.reached = Math.hypot(goal.x - me().x, goal.y - me().y);
    }
    // il frappe sans relâche, comme un joueur : un clic pendant le geste enchaîne le coup suivant (la taille, puis le coup d'en haut)
    let clicks = 0;
    let last = -1;
    while (find(id2) && !w().player.down && clicks < 24) {
      const q = find(id2)!;
      [deadAt.x, deadAt.y] = [q.x, q.y];
      if (w().mode === 'play' && !w().combat.busy) {
        out.modesWhileHit = [...(out.modesWhileHit ?? []), q.mode];
        try {
          await W.__do('strike', { at: { x: q.x, y: q.y - 4 } });
        } catch (e) {
          throw new Error(`${(e as Error).message} ; le sanglier ${q.mode} en (${Math.round(q.x)}, ${Math.round(q.y)}), le tronc ${JSON.stringify(T.box)}, la ligne y ${T.y} ; avant : ${seen2.join(' > ')} ; à terre ${out.gored2} ; clics ${JSON.stringify(w().keys?.clicks)} ; tenu ${JSON.stringify(gs.game.both ?? gs.game.hands)}`);
        }
        clicks++;
      } else if (w().mode === 'use' && w().combat.log.length !== last) {
        // pendant le geste : un clic, et le coup suivant partira à sa fin
        last = w().combat.log.length;
        W.__aim(q.x, q.y - 4);
        W.__press('left');
        await W.__frames(2);
        W.__release('left');
        clicks++;
      }
      await W.__frames(2);
      if (find(id2) && find(id2)!.hp !== hits[hits.length - 1]) hits.push(find(id2)!.hp);
    }
    await W.__resume();
    out.hits = hits;
    await W.__until(() => (gs.game.maps['foret-profonde'].ground as { item: string }[]).some((o) => o.item === 'dead-boar'), `le sanglier mort au sol, après sa bascule (vies après chaque coup : ${hits.join(', ')} ; modes : ${(out.modesWhileHit ?? []).join(', ')} ; avant : ${seen2.join(' > ')} ; le sanglier : ${JSON.stringify(find(id2))})`);
    const dead = (gs.game.maps['foret-profonde'].ground as { item: string; x: number; y: number }[]).find((o) => o.item === 'dead-boar')!;
    out.dead = { x: dead.x, y: dead.y, from: deadAt };
    out.membersAfter = members();
    // trop lourd pour lui (80 kg, il en porte 70) : à sa force à lui, E le dit
    await send({ kind: 'force', multiplier: 1 });

    // ---------- 3. à midi, à la bauge : la marche discrète ----------
    // la bête de la forêt profonde est morte : la forêt des ronces en a trois
    await send({ kind: 'clock', hour: 12 });
    await W.__restart({ kind: 'map', map: 'foret-des-ronces' });
    await send({ kind: 'stamina-infinite', on: true });
    const resting = census().filter((c) => c.mode === 'rest');
    out.resting = resting.length;
    const b = resting[0];
    if (!b) throw new Error('aucun sanglier couché à midi');
    // un couloir libre vers lui, de 6 m à 3,6 m, dans une des seize directions
    let from: { x: number; y: number; ux: number; uy: number } | undefined;
    for (let k = 0; k < 16 && !from; k++) {
      const a = (k * Math.PI) / 8;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      let ok = true;
      for (let d = 72; d <= 120 && ok; d += 2) ok = w().map.areaFree({ left: b.x - ux * d - 5, top: b.y - uy * d - 10, right: b.x - ux * d + 5, bottom: b.y - uy * d - 2 });
      if (ok) from = { x: b.x - ux * 120, y: b.y - uy * 120, ux, uy };
    }
    if (!from) throw new Error('aucun couloir libre vers le sanglier couché');
    await stand(from.x, from.y, 'right');
    // il marche discrètement vers lui, droit, jusqu'à 3,7 m (la souris ne compte pas : il va où vont les touches)
    const keysFor = (ux: number, uy: number) => [ux > 0.38 ? 'KeyD' : ux < -0.38 ? 'KeyA' : '', uy > 0.38 ? 'KeyS' : uy < -0.38 ? 'KeyW' : ''].filter(Boolean);
    const keys = keysFor(from.ux, from.uy);
    let closest = Infinity;
    const watch3 = () => (closest = Math.min(closest, find(b.id)?.dist ?? Infinity));
    w().events.on('postupdate', watch3);
    key('keydown', 'AltLeft');
    for (const k of keys) key('keydown', k);
    await W.__until(() => (find(b.id)?.dist ?? 0) <= 3.7 || find(b.id)?.mode !== 'rest', `Xéros approche le sanglier couché en marche discrète (${find(b.id)?.mode}, ${find(b.id)?.dist.toFixed(1)} m)`);
    for (const k of keys) key('keyup', k);
    key('keyup', 'AltLeft');
    await W.__frames(30);
    out.sneakDist = find(b.id)?.dist;
    out.sneakMode = find(b.id)?.mode;
    // un pas à la marche : il se réveille
    for (const k of keys) key('keydown', k);
    await W.__until(() => find(b.id)?.mode !== 'rest', 'à la marche, le sanglier se réveille');
    for (const k of keys) key('keyup', k);
    w().events.off('postupdate', watch3);
    out.walkMode = find(b.id)?.mode;
    out.walkDist = find(b.id)?.dist;
    out.senses = { sneak: def.senses.sneak, walk: def.senses.walk, asleep: def.asleep };
    return out;
  })) as Record<string, any>;

  console.log(JSON.stringify(r));
  assert.ok(r.boars >= 1, `des sangliers dans la forêt profonde (${r.boars})`);
  // 1. la charge
  for (const m of ['tell', 'charge']) assert.ok(r.seen1.includes(m), `il annonce puis charge (${r.seen1.join(' > ')})`);
  assert.ok(r.lifeHit < r.life0, `la charge blesse Xéros (${r.life0} -> ${r.lifeHit})`);
  assert.ok(r.life0 - r.lifeHit >= 10, `de plus de 10 points (${r.life0 - r.lifeHit})`);
  assert.equal(r.handsDown, 0, 'renversé, il lâche ce qu’il tient');
  assert.ok(r.branchOnGround, 'la branche est au sol');
  assert.ok(r.slide >= 1, `il glisse dans le sens de la charge (${r.slide.toFixed(1)} m vers l'ouest)`);
  assert.equal(r.mode1, 'down', 'à terre, rien ne le mène');
  // 2. le tronc, la hache
  assert.ok(r.axeHeld, 'la hache en main');
  assert.ok(!r.gored2, 'Xéros s’est écarté à temps');
  assert.ok(r.stunned, `la charge s'écrase contre le tronc : sonné (${r.seen2.join(' > ')})`);
  assert.ok(r.hits.length >= 2, `plusieurs coups de hache (${r.hits.join(', ')})`);
  assert.ok(r.dead && Math.hypot(r.dead.x - r.dead.from.x, r.dead.y - r.dead.from.y) < 60, `le sanglier mort là où il est mort (${JSON.stringify(r.dead)})`);
  assert.equal(r.membersAfter, r.membersBefore - 1, 'la bauge compte une bête de moins');
  // 3. la marche discrète
  assert.ok(r.resting >= 1, `à midi, des sangliers couchés (${r.resting})`);
  assert.equal(r.sneakMode, 'rest', `en marche discrète, à ${r.sneakDist?.toFixed(1)} m, il dort encore`);
  assert.ok(r.sneakDist < r.senses.walk.alert * r.senses.asleep, `plus près que là où la marche le réveille (${r.sneakDist?.toFixed(1)} m < ${r.senses.walk.alert * r.senses.asleep} m)`);
  assert.ok(['alert', 'tell'].includes(r.walkMode), `un pas à la marche le réveille (${r.walkMode})`);
  console.log(
    `✓ sangliers : à l'aube, ${r.boars} debout ; il voit Xéros, annonce, charge et le renverse (${r.life0} -> ${r.lifeHit} points, la branche lâchée, ${r.slide.toFixed(1)} m de glissade) ; devant un gros tronc, Xéros s'écarte et la charge s'y écrase, sonné ; ${r.hits.length} coups de hache le tuent, un sanglier mort à sa place ; à midi, couché, Xéros discret approche à ${r.sneakDist.toFixed(1)} m sans le réveiller, un pas à la marche et il se lève`,
  );
});
