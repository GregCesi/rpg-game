// Ce que fera chaque clic (src/world/clickAction.ts), sans navigateur : la même fonction que lisent le jeu et le HUD.
// - main vide : prendre ce qui est visé, sinon le poing ; le maintien noue, dénoue, pivote, appelle la mère, sinon rien ;
// - un outil devant ce qu'il travaille : le travail ; sans rien à travailler : il frappe ;
// - le piquet d'un plan connu : le planter ; sans plan connu, il se pose ;
// - une arme : frapper ; à deux mains, la taille au clic gauche, le coup d'en haut au droit ;
// - une ressource : frapper ce qui encaisse un coup, sinon la poser (sur une place de chantier, sur le billot, ou au fantôme) ;
// - tout ce qu'on tient se lance au clic maintenu ;
// - le clic gauche est la main droite, le droit la main gauche.
// Usage : npx tsx tools/test-clics.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import { items, plans, props } from '../src/content';
import { clickPlan, HAND_OF, type Aimed } from '../src/world/clickAction';
import type { Held } from '../src/state/GameState';

const find = (f: (k: string) => boolean, what: string): string => {
  const k = Object.keys(items).find(f);
  assert.ok(k, `le contenu a ${what}`);
  return k!;
};
// les objets par ce qu'ils déclarent, jamais par leur nom
const oneHandTool = find((k) => items[k].kind === 'tool' && items[k].hands === 1 && !!items[k].does?.length, 'un outil à une main');
const twoHandTool = find((k) => items[k].kind === 'tool' && items[k].hands === 2 && !!items[k].does?.length, 'un outil à deux mains');
const weapon1 = find((k) => items[k].kind === 'weapon' && items[k].hands === 1, 'une arme à une main');
const fighting = find((k) => items[k].kind === 'resource' && !!items[k].weapon, 'une ressource qui frappe bien (la branche)');
const stake = find((k) => Object.values(plans).some((p) => p.stake === k), 'le piquet d’un plan');
const resource = find((k) => items[k].kind === 'resource' && !items[k].weapon && items[k].hands === 1 && !Object.values(plans).some((p) => p.stake === k), 'une ressource à une main');
const lump = Object.keys(props).find((k) => props[k].take && !props[k].harvest)!;

const hands = (left: Held | null, right: Held | null, both: Held | null = null) => ({ hands: [left, right] as const, both });
const plan = (b: 'left' | 'right', h: ReturnType<typeof hands>, aimed: Aimed = {}, knows = false) => clickPlan(b, h, aimed, knows);

assert.equal(HAND_OF.left, 1, 'le clic gauche est la main droite');
assert.equal(HAND_OF.right, 0, 'le clic droit est la main gauche');

// main vide
{
  const empty = hands(null, null);
  assert.equal(plan('left', empty, { take: 'pile' }).short.kind, 'take', 'main vide sur un tas : reprendre');
  assert.equal(plan('left', empty, { take: 'pile' }).short.label, 'prendre');
  assert.equal(plan('right', empty).short.kind, 'punch', 'main vide, rien à prendre : le poing');
  assert.equal(plan('left', empty).long.kind, 'none', 'main vide, rien de long : rien');
  assert.equal(plan('left', empty, { take: 'pile', hold: 'knot' }).long.kind, 'knot', 'maintenu sur un tas lié : nouer');
  assert.equal(plan('left', empty, { take: 'take', hold: 'unknot' }).long.label, 'dénouer');
  assert.equal(plan('left', empty, { hold: 'turn' }).long.kind, 'turn', 'maintenu au contact d’une bille : pivoter');
  assert.equal(plan('left', empty, { site: 'help', hold: 'help' }).short.kind, 'help-info', 'place trop lourde : dire ce qui manque');
  assert.equal(plan('left', empty, { site: 'help', hold: 'help' }).long.kind, 'help', 'maintenu : appeler la mère');
  // l'autre main tient quelque chose : ce clic reste celui d'une main vide
  assert.equal(plan('left', hands({ item: resource }, null), { take: 'pickup' }).short.kind, 'take');
  assert.equal(plan('right', hands({ item: resource }, null), { take: 'pickup' }).short.kind, 'put', 'le clic de la main pleine pose');
}

// un outil
{
  const h = hands(null, { item: oneHandTool });
  assert.equal(plan('left', h, { work: [undefined, 'whittle'] }).short.kind, 'work', 'l’outil devant ce qu’il travaille : le travail');
  assert.equal(plan('left', h, { work: [undefined, 'whittle'] }).short.label, 'tailler');
  assert.equal(plan('left', h).short.kind, 'strike', 'sans rien à travailler : il frappe');
  assert.equal(plan('left', h).long.kind, 'throw', 'tout ce qu’on tient se lance');
  assert.equal(plan('right', h, { take: 'pile' }).short.kind, 'take', 'l’autre main, vide, prend');
  const two = hands(null, null, { item: twoHandTool });
  assert.equal(plan('left', two, { work: ['fell', 'fell'] }).short.label, 'abattre', 'à deux mains, le gauche lance le travail');
  assert.equal(plan('right', two, { work: ['fell', 'fell'] }).short.kind, 'work', 'et le droit aussi');
  assert.equal(plan('left', two).short.from, 0, 'à deux mains, le gauche frappe de taille');
  assert.equal(plan('right', two).short.from, 1, 'le droit, d’en haut');
}

// le piquet, l'arme, la ressource
{
  assert.equal(plan('left', hands(null, { item: stake }), {}, true).short.kind, 'plant', 'le piquet, un plan connu : le planter');
  assert.equal(plan('left', hands(null, { item: stake }), {}, false).short.kind, 'put', 'sans plan connu : il se pose');
  assert.equal(plan('left', hands(null, { item: stake }), { site: 'help' }, true).short.kind, 'help-info', 'devant une place trop lourde : dire ce qui manque, quoi qu’on tienne');
  assert.equal(plan('left', hands(null, { item: weapon1 })).short.kind, 'strike', 'une arme frappe');
  assert.equal(plan('left', hands(null, { item: weapon1 })).short.from, undefined, 'à une main, l’enchaînement part du début');
  const both = hands({ item: weapon1 }, { item: weapon1 });
  assert.equal(plan('left', both).short.kind, 'strike', 'une arme dans chaque main : chaque clic frappe');
  assert.equal(plan('right', both).short.kind, 'strike');
  assert.equal(plan('left', hands(null, { item: fighting })).short.kind, 'put', 'une ressource qui frappe bien, sans ennemi : elle se pose');
  assert.equal(plan('left', hands(null, { item: fighting }), { target: true }).short.kind, 'strike', 'contre ce qui encaisse : elle frappe');
  const r = hands(null, { item: resource });
  assert.equal(plan('left', r).short.kind, 'put', 'une ressource sans ennemi : elle se pose');
  assert.equal(plan('left', r, { target: true }).short.kind, 'strike', 'une ressource contre ce qui encaisse : elle frappe');
  assert.equal(plan('left', r, { site: 'place' }).short.kind, 'place', 'sur une place de chantier : elle s’y pose');
  const roll = hands(null, { prop: lump });
  assert.equal(plan('left', roll, { rest: [1] }).short.kind, 'rest', 'sur ce qui l’accepte (le billot) : elle s’y pose');
  assert.equal(plan('left', roll, { rest: [0] }).short.kind, 'put', 'ce qui accepte l’objet de l’autre main ne compte pas');
  assert.equal(plan('left', hands(null, null, { prop: lump })).long.kind, 'throw', 'à deux mains, il se lance aussi');
}
console.log('✓ clics : main vide, outil, piquet, arme, ressource, à une et deux mains ; chaque bouton sa main ; tout se lance au maintien');
