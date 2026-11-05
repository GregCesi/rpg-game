// Un appui n'est jamais perdu (règle de Grégoire : un joueur sur une machine lente ne voit jamais ses appuis ignorés). Sans
// navigateur, le clavier du jeu (src/input/keyLatch.ts, que lit src/input/PlayerInput.ts) et la fin d'un appui maintenu
// (pressEnd, que lit src/systems/longPress.ts) :
// - un appui plus court qu'une image (enfoncé puis relâché avant que le jeu lise) est lu, une fois ;
// - une flèche pressée entre deux images déplace d'une image ;
// - un appui court lu après une image longue reste court (E court : reprendre, pas dénouer) ; un appui tenu reste long ;
// - la durée d'un appui fini est gardée jusqu'à ce que le jeu la lise, même des images plus tard.
// Usage : npx tsx tools/test-input.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import { KeyLatch, pressEnd } from '../src/input/keyLatch';
import { LONG_PRESS } from '../src/config';

const E = ['KeyE', 'Enter'];
const UP = ['KeyW', 'ArrowUp'];
/** Une image à 60 images par seconde, en ms entières (assez près). */
const FRAME = 16;

// un appui de 5 ms, entre deux images : lu à l'image suivante, une seule fois
{
  const k = new KeyLatch();
  k.down('KeyE', 100);
  k.up('KeyE', 105);
  assert.equal(k.isDown(E), false, 'relâchée avant la lecture');
  assert.equal(k.take(E), true, "l'appui de 5 ms est lu");
  assert.equal(k.take(E), false, 'une seule fois');
  assert.equal(k.lastedFor(E), 5, 'sa durée vraie');
}

// une flèche tapée entre deux images : une image de déplacement, puis plus rien
{
  const k = new KeyLatch();
  k.down('KeyW', 0);
  k.up('KeyW', 3);
  assert.equal(k.downOrTapped(UP), true, 'la tape compte à la lecture de cette image');
  k.forgetTaps();
  assert.equal(k.downOrTapped(UP), false, "à l'image suivante, elle est oubliée");
  // tenue : elle compte à chaque image
  k.down('KeyW', 10);
  k.forgetTaps();
  assert.equal(k.downOrTapped(UP), true, 'tenue, elle compte encore');
}

// deux appuis dans une même image (le jeu qui rame) : deux appuis lus, l'un après l'autre (deux crans en mode construction)
{
  const k = new KeyLatch();
  k.down('KeyT', 0);
  k.up('KeyT', 5);
  k.down('KeyT', 10);
  k.up('KeyT', 15);
  const T = ['KeyT'];
  assert.equal(k.take(T), true, 'le premier appui');
  assert.equal(k.take(T), true, 'le second, jamais perdu');
  assert.equal(k.take(T), false, 'et rien de plus');
}

// la répétition du clavier n'est pas un nouvel appui
{
  const k = new KeyLatch();
  k.down('KeyE', 0);
  assert.equal(k.take(E), true);
  k.down('KeyE', 30, true);
  assert.equal(k.take(E), false, 'la répétition ne refait pas un appui');
}

// E court devant un fagot pendant une image de 900 ms (le jeu qui rame) : l'appui commence à une image, se lit fini à la suivante
{
  const k = new KeyLatch();
  const ms = LONG_PRESS.ms;
  k.down('KeyE', 1000);
  k.up('KeyE', 1000 + FRAME / 2);
  const start = 1000; // l'image où le jeu voit l'appui (LongPress.begin)
  const next = start + 900; // l'image suivante, longue
  // la durée est encore là des images plus tard (le jeu la lit quand il voit l'appui fini)
  assert.equal(k.lastedFor(E), FRAME / 2);
  assert.equal(pressEnd(k.isDown(E), next - start, ms, k.lastedFor(E)), 'short', 'un appui court lu après une image longue reste court');
  // tenu 600 ms puis relâché, lu tard : long
  k.down('KeyE', 3000);
  assert.equal(k.lastedFor(E), undefined, "enfoncée, son appui n'est pas fini");
  k.up('KeyE', 3600);
  assert.equal(pressEnd(false, 2000, ms, k.lastedFor(E)), 'long', 'un appui tenu 600 ms est long, même lu tard');
  // encore enfoncé : long dès que le jeu a avancé de 500 ms, sinon il attend
  assert.equal(pressEnd(true, ms, ms, undefined), 'long');
  assert.equal(pressEnd(true, ms - 1, ms, undefined), undefined);
}

// la fenêtre quittée : tout est oublié
{
  const k = new KeyLatch();
  k.down('KeyW', 0);
  k.clear();
  assert.equal(k.downOrTapped(UP), false);
  assert.equal(k.isDown(UP), false);
}
console.log("✓ clavier : un appui plus court qu'une image est lu, une tape déplace d'une image, un appui court reste court après une image longue");

// la vitesse de simulation et le pas de jeu fixe (src/systems/simSpeed.ts, src/world/timeStep.ts) : chaque pas dure STEP_MS, quelle
// que soit la durée des images (le jeu qui rame fait plusieurs pas par image, jamais un plus grand) ; à x10, dix fois plus de pas ;
// l'horloge des pas (le `time` de chaque pas, `time.now` des scènes, que lisent les verrous après une action) reste croissante d'un pas
// à l'autre et d'une image à l'autre, et ne recule pas quand on revient à x1
{
  const { setSimSpeed } = await import('../src/systems/simSpeed');
  const { STEP_MS } = await import('../src/world/timeStep');
  const times: number[] = [];
  const deltas: number[] = [];
  const record = (t: number, d: number) => void (times.push(t), deltas.push(d));
  const game = { loop: { callback: record }, headlessStep: record } as any;
  setSimSpeed(game, 10);
  let t = 1000;
  game.loop.callback(t, 16);
  const first = times.length;
  for (const d of [16, 16, 100, 50, 16, 100]) game.loop.callback((t += d), d);
  const at10 = times.length - first;
  setSimSpeed(game, 1);
  for (const d of [16, 100, 16]) game.loop.callback((t += d), d);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] > times[i - 1], `l'horloge du jeu recule au pas ${i} : ${times[i - 1]} puis ${times[i]}`);
  assert.ok(deltas.every((d) => d === STEP_MS), `chaque pas dure ${STEP_MS} ms (${[...new Set(deltas)].join(', ')})`);
  assert.equal(at10, Math.floor((298 * 10 + 2) / STEP_MS), 'x10 : le temps vrai × 10, en pas fixes');
  console.log("✓ vitesse de simulation : des pas fixes, dix fois plus nombreux à x10 ; l'horloge du jeu ne recule jamais, au retour à x1 non plus");
}

// E maintenu et F (src/input/PlayerInput.ts, src/systems/longPress.ts) : F se lit une fois par appui ; Maj + E est noté sous son propre
// code (`Shift:KeyE`, à l'instant de l'appui : la main gauche) ; E maintenu se juge à sa durée vraie, jamais au temps mis à le lire ;
// l'appui en cours dit où il en est (la touche qui se remplit d'or) et s'abandonne si Xéros cesse de viser la même chose
{
  const { LongPress } = await import('../src/systems/longPress');
  const k = new KeyLatch();
  k.down('KeyF', 10);
  k.up('KeyF', 12);
  assert.equal(k.take(['KeyF']), true, 'F tapé est lu');
  assert.equal(k.take(['KeyF']), false, 'une seule fois');
  k.down('Shift:KeyE', 20);
  k.up('Shift:KeyE', 25);
  assert.equal(k.take(['KeyE']), false, 'Maj + E n’est pas E seul');
  assert.equal(k.take(['Shift:KeyE']), true, 'Maj + E est lu sous son code');
  const press = new LongPress();
  press.begin('tas', 1000);
  assert.equal(press.progress(1000 + LONG_PRESS.ms / 2), 0.5, 'à mi-seuil, la touche est à moitié pleine');
  k.down('KeyE', 1000);
  assert.equal(press.update(1100, k.isDown(['KeyE']), 'tas', k.lastedFor(['KeyE'])), undefined, 'E enfoncé avant le seuil : il attend');
  k.up('KeyE', 1100);
  assert.equal(press.update(1000 + LONG_PRESS.ms * 3, k.isDown(['KeyE']), 'tas', k.lastedFor(['KeyE'])), 'short', 'relâché tôt mais lu tard : court');
  press.begin('tas', 2000);
  assert.equal(press.update(2000 + LONG_PRESS.ms, true, 'tas'), 'long', 'tenu jusqu’au seuil : maintenu');
  assert.equal(press.progress(2000), undefined, 'fini : plus d’appui en cours');
  press.begin('tas', 3000);
  assert.equal(press.update(3100, true, 'bille'), undefined, 'Xéros vise autre chose : abandonné');
  assert.equal(press.pending, false);
  console.log('✓ E maintenu et F : un appui chacun, Maj + E à part, la durée vraie, la touche qui se remplit');
}

// la souris (src/input/PlayerInput.ts) : ses deux boutons passent par le même verrou que le clavier (Mouse0, Mouse2), avec leur durée
// vraie ; un clic plus court qu'une image est lu, une fois ; un clic tenu est long même lu tard
{
  const { MOUSE } = { MOUSE: { left: 'Mouse0', right: 'Mouse2' } };
  const k = new KeyLatch();
  k.down(MOUSE.left, 100);
  k.up(MOUSE.left, 104);
  assert.equal(k.take([MOUSE.left]), true, 'le clic de 4 ms est lu');
  assert.equal(k.take([MOUSE.left]), false, 'une seule fois');
  assert.equal(k.take([MOUSE.right]), false, "l'autre bouton n'a rien fait");
  assert.equal(pressEnd(false, 900, LONG_PRESS.ms, k.lastedFor([MOUSE.left])), 'short', 'un clic court lu après une image longue reste court');
  k.down(MOUSE.right, 1000);
  k.up(MOUSE.right, 1000 + LONG_PRESS.ms + 50);
  assert.equal(pressEnd(false, 0, LONG_PRESS.ms, k.lastedFor([MOUSE.right])), 'long', 'un clic maintenu est long');
  console.log('✓ souris : les clics passent par le verrou du clavier, avec leur durée vraie');
}

// la visée (src/world/aim.ts) : Xéros se tourne vers la plus proche de ses directions de dessin ; il vise sous le curseur à portée,
// sinon dans sa direction, à la distance d'habitude ; sans curseur, devant lui (hors du combat, le jeu vise toujours devant lui)
{
  const { aimProbe, facingToward } = await import('../src/world/aim');
  assert.equal(facingToward(10, 3, 'down'), 'right');
  assert.equal(facingToward(-2, -9, 'down'), 'up');
  assert.equal(facingToward(5, 5, 'down'), 'down', 'à égalité, il garde sa direction si elle convient');
  assert.equal(facingToward(5, 5, 'left'), 'right', 'sinon l’horizontale');
  assert.equal(facingToward(0, 0, 'left'), 'left');
  const c = { x: 100, y: 100 };
  assert.deepEqual(aimProbe(c, { x: 110, y: 120 }, 'up', 32, 16), { x: 110, y: 120 }, 'à portée : sous le curseur');
  const far = aimProbe(c, { x: 100, y: 400 }, 'up', 32, 16);
  assert.deepEqual(far, { x: 100, y: 116 }, 'hors de portée : dans la direction du curseur, à 16 px');
  assert.deepEqual(aimProbe(c, undefined, 'left', 32, 16), { x: 84, y: 100 }, 'sans curseur : devant lui');
  console.log('✓ visée : la direction la plus proche, sous le curseur à portée, sinon dans sa direction ; sans souris, devant lui');
}
