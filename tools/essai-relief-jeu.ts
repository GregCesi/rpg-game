// Captures du relief dans le vrai jeu (chantier « relief », pour regarder, pas un test) : npx tsx tools/essai-relief-jeu.ts
// Xéros est posé (par ?dieu et la scène, sans marcher) à quelques points du chemin creux, du bord du plateau et, dehors, au sud de
// la masse de terre ; une capture par point,
// au zoom de départ : .art-preview/relief-jeu-<nom>.png.
import { playtest } from './lib/playtest';

const T = 32;
const SPOTS: { name: string; x: number; y: number }[] = [
  { name: '1-entree', x: 63 * T, y: 66 * T + 8 },
  { name: '2-avant', x: 51 * T, y: 66 * T },
  { name: '3-coupure', x: 44.5 * T, y: 66 * T },
  { name: '4-montee', x: 25 * T, y: 66 * T },
  { name: '5-sortie', x: 6 * T, y: 66 * T },
  { name: '6-falaise', x: 52 * T, y: 40 * T },
  { name: '7-plateau', x: 30 * T, y: 40 * T },
  { name: '8-dehors', x: 53 * T, y: 77 * T },
];

await playtest('essai-relief-jeu', async ({ page, load }) => {
  await load('?dieu&reset');
  await page.evaluate(() => (window as any).__restart({ kind: 'map', map: 'ferme' }));
  for (const s of SPOTS) {
    await page.evaluate(({ x, y }) => {
      const w = (window as any).game.scene.getScene('world');
      w.player.actor.body.reset(x, y);
      // la règle de pas part du nouveau point
      w.footing.last = undefined;
      w.cameras.main.centerOn(x, y);
    }, s);
    await page.evaluate(() => (window as any).__frames(40));
    await page.screenshot({ path: `.art-preview/relief-jeu-${s.name}.png` });
    console.log(`.art-preview/relief-jeu-${s.name}.png`);
  }
}, { speed: 1 });
