// Test de scénario de la vie de Xéros (docs/CONCEPTION.md, « La vie de Xéros »), dans le vrai jeu (tools/lib/playtest.ts), avec
// ?dieu&debug, d'une partie neuve :
// - la barre de vie du HUD montre sa vie pleine ;
// - dans la forêt profonde, la hache en main, presque à bout de vie (?dieu « Vie »), Xéros marche vers un sanglier qui le charge : il
//   perd le reste de sa vie, reste à terre et s'évanouit ;
// - il se réveille au cagibi le lendemain matin, la mère l'a trouvé (sa ligne de dialogue), sa vie remontée par la nuit (la moitié du
//   maximum), la hache restée là où il est tombé.
// Usage : npm run test:vie (lancé aussi par npm run test:scenarios).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('vie', async ({ page, load }) => {
  await load('?dieu&reset&debug');
  const r = (await page.evaluate(async () => {
    const W = window as any;
    const g = W.game;
    const w = () => g.scene.getScene('world');
    const hud = () => g.scene.getScene('hud');
    const urls = { state: '/src/state/index.ts', content: '/src/content/index.ts' };
    const gs = await import(urls.state);
    const content = await import(urls.content);
    const send = async (c: unknown) => {
      g.events.emit('dieu', c);
      await W.__settle();
    };
    const key = (type: 'keydown' | 'keyup', code: string) => window.dispatchEvent(new KeyboardEvent(type, { code }));
    const me = () => w().player.actor;
    const out: Record<string, any> = {};
    out.startHealth = gs.game.health;
    out.hudStart = hud().healthText;
    out.day0 = gs.game.clock.day;

    await W.__restart({ kind: 'map', map: 'foret-profonde' });
    await send({ kind: 'stamina-infinite', on: true });
    // un couloir libre de 16 m d'ouest en est
    const lane = (y: number, x0: number, x1: number) => {
      for (let x = x0; x <= x1; x += 2) if (!w().map.areaFree({ left: x - 8, top: y - 12, right: x + 8, bottom: y + 2 })) return false;
      return true;
    };
    let at: { x: number; y: number } | undefined;
    for (let y = 400; y < 3600 && !at; y += 24) for (let x = 300; x < 3200 && !at; x += 40) if (lane(y, x - 120, x + 220)) at = { x, y };
    if (!at) throw new Error('aucun couloir libre de 16 m dans la forêt profonde');
    me().body.reset(at.x, at.y);
    me().face('right');
    await send({ kind: 'give', held: { item: 'axe' } });
    await send({ kind: 'health', value: 15 });
    out.hudLow = hud().healthText;
    g.events.emit('dieu', { kind: 'creature-spawn', dx: 7.5, dy: 0 });
    await W.__settle();
    const boar = () => (w().creatures.census(me().x, me().y) as { kind: string; mode: string; dist: number }[]).filter((c) => c.kind === 'boar').sort((a, b) => a.dist - b.dist)[0];
    await W.__until(() => ['calm', 'alert'].includes(boar()?.mode), 'le sanglier arrivé');
    // il marche vers lui : la charge
    key('keydown', 'KeyD');
    await W.__until(() => w().player.down, `Xéros renversé (le sanglier : ${boar()?.mode})`);
    key('keyup', 'KeyD');
    out.fallHealth = gs.game.health;
    out.fellAt = { x: me().x, y: me().y };
    // évanoui : il reste à terre, puis le fondu ; il se réveille au cagibi, la mère parle
    await W.__until(() => g.scene.isActive('dialogue'), `le réveil au cagibi, la mère parle (mode ${w().mode}, carte ${w().mapId}, vie ${gs.game.health}, à terre ${w().player?.down}, jour ${gs.game.clock.day} ${Math.round(gs.game.clock.minute)})`);
    out.map = w().mapId;
    out.line = g.scene.getScene('dialogue').lines?.[0]?.text;
    out.expected = content.dialogues[content.health.faint.dialogue].lines[0].text;
    out.clock = { ...gs.game.clock };
    out.wakeHealth = gs.game.health;
    out.hudWake = hud().healthText;
    out.hands = [gs.game.hands[0], gs.game.hands[1], gs.game.both].filter(Boolean).length;
    out.axeLeft = (gs.game.maps['foret-profonde'].ground as { item: string; x: number; y: number }[]).find((o) => o.item === 'axe');
    out.max = content.health.max;
    out.wakeHour = content.time.wakeHour;
    return out;
  })) as Record<string, any>;

  console.log(JSON.stringify(r));
  assert.equal(r.startHealth, r.max, 'une partie neuve : la vie pleine');
  assert.equal(r.hudStart, `${r.max}/${r.max}`, `le HUD la montre (${r.hudStart})`);
  assert.equal(r.hudLow, `15/${r.max}`, `?dieu « Vie » : le HUD suit (${r.hudLow})`);
  assert.equal(r.fallHealth, 0, `la charge prend le reste de sa vie (${r.fallHealth})`);
  assert.ok(String(r.map).startsWith('interieur:ferme'), `réveillé au cagibi, dans la maison de la ferme (${r.map})`);
  assert.equal(r.line, r.expected, 'la mère l’a trouvé : sa ligne');
  assert.equal(r.clock.day, r.day0 + 1, `le lendemain (jour ${r.clock.day})`);
  // l'horloge tourne pendant le fondu d'arrivée, avant que la mère parle : le lever, à la minute près
  assert.ok(r.clock.minute >= r.wakeHour * 60 && r.clock.minute < r.wakeHour * 60 + 1, `au lever (${(r.clock.minute / 60).toFixed(3)} h)`);
  assert.ok(Math.abs(r.wakeHealth - r.max / 2) < 1, `la nuit lui a rendu la moitié de sa vie (${r.wakeHealth})`);
  assert.equal(r.hudWake, `${Math.round(r.wakeHealth)}/${r.max}`, `le HUD la montre au réveil (${r.hudWake})`);
  assert.equal(r.hands, 0, 'les mains vides au réveil');
  assert.ok(r.axeLeft && Math.hypot(r.axeLeft.x - r.fellAt.x, r.axeLeft.y - r.fellAt.y) < 80, `la hache restée là où il est tombé (${JSON.stringify(r.axeLeft)}, tombé en ${JSON.stringify(r.fellAt)})`);
  console.log(
    `✓ vie : pleine au départ (${r.hudStart}) ; à 15 points, une charge de sanglier le met à 0, il s'évanouit ; réveillé au cagibi le jour ${r.clock.day} à ${r.wakeHour} h, la mère l'a trouvé, ${r.hudWake}, la hache restée dans la forêt`,
  );
});
