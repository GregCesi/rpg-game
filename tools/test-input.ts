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

// la vitesse de simulation (src/systems/simSpeed.ts) : à x10, l'horloge des pas (le `time` de chaque pas, `time.now` des scènes, que
// lisent les verrous après une action) reste croissante d'un pas à l'autre et d'une image à l'autre, même quand les images s'allongent
// (le jeu qui rame), et ne recule pas quand on revient à x1
{
  const { setSimSpeed } = await import('../src/systems/simSpeed');
  const times: number[] = [];
  const game = {
    loop: { callback: (t: number) => void times.push(t) },
    headlessStep: (t: number) => void times.push(t),
  } as any;
  setSimSpeed(game, 10);
  let t = 0;
  for (const d of [16, 16, 100, 250, 16, 100]) game.loop.callback((t += d), d);
  setSimSpeed(game, 1);
  for (const d of [16, 100, 16]) game.loop.callback((t += d), d);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] > times[i - 1], `l'horloge du jeu recule au pas ${i} : ${times[i - 1]} puis ${times[i]}`);
  assert.equal(times.length, 6 * 10 + 3, 'x10 : dix pas par image ; x1 : un');
  console.log("✓ vitesse de simulation : l'horloge du jeu ne recule jamais, à x10 comme au retour à x1");
}
