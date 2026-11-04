// Ce que fera chaque touche et chaque clic (src/world/actionPlan.ts), sans navigateur : la même fonction que lisent le jeu et
// l'affichage des touches (docs/COMMANDES.md).
// - E : prendre ce qui est devant (la main droite, puis la gauche), parler, ouvrir, lire ; les mains pleines : rien à montrer ;
//   une place trop lourde : dire ce qui manque ; maintenu, les mains vides : nouer, dénouer, pivoter ; une main libre : appeler la mère ;
// - F : l'outil de la main droite s'il travaille ce qui est devant, sinon celui de la gauche ; puiser face à l'eau ; le piquet d'un
//   plan connu se plante ;
//   un outil sans rien à travailler : rien ;
// - A : poser ce que tient la main droite (sinon la gauche), Maj + A la gauche ; sur une place de chantier, sur le billot, sinon devant ;
// - les clics : chaque bouton sa main frappe (le poing, une arme, un outil, une ressource, même dans le vide) ; maintenu, il lance ;
//   à deux mains, la taille au clic gauche, le coup d'en haut au droit ; le clic gauche est la main droite.
// Usage : npx tsx tools/test-touches.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import { items, plans, props } from '../src/content';
import { actionPlan, clickPlan, HAND_OF, putHand, takeHand, type Aimed } from '../src/world/actionPlan';
import type { Held } from '../src/state/GameState';

const find = (f: (k: string) => boolean, what: string): string => {
  const k = Object.keys(items).find(f);
  assert.ok(k, `le contenu a ${what}`);
  return k!;
};
// les objets par ce qu'ils déclarent, jamais par leur nom
const oneHandTool = find((k) => items[k].kind === 'tool' && items[k].hands === 1 && !!items[k].does?.length, 'un outil à une main');
const otherTool = find((k) => k !== oneHandTool && items[k].kind === 'tool' && items[k].hands === 1 && !!items[k].does?.length, 'un autre outil à une main');
const twoHandTool = find((k) => items[k].kind === 'tool' && items[k].hands === 2 && !!items[k].does?.length, 'un outil à deux mains');
const weapon1 = find((k) => items[k].kind === 'weapon' && items[k].hands === 1, 'une arme à une main');
const stake = find((k) => Object.values(plans).some((p) => p.stake === k), 'le piquet d’un plan');
const resource = find((k) => items[k].kind === 'resource' && !items[k].weapon && items[k].hands === 1 && !Object.values(plans).some((p) => p.stake === k), 'une ressource à une main');
const lump = Object.keys(props).find((k) => props[k].take && !props[k].harvest)!;

const hands = (left: Held | null, right: Held | null, both: Held | null = null) => ({ hands: [left, right] as const, both });
const plan = (h: ReturnType<typeof hands>, aimed: Aimed = {}, knows = false) => actionPlan(h, aimed, knows);
const empty = hands(null, null);

assert.equal(HAND_OF.left, 1, 'le clic gauche est la main droite');
assert.equal(HAND_OF.right, 0, 'le clic droit est la main gauche');

// E
{
  assert.equal(plan(empty, { take: 'pile' }).e.short, 'pile', 'E devant un tas : reprendre');
  assert.equal(plan(empty, { use: 'talk' }).e.short, 'talk', 'E devant quelqu’un : parler');
  assert.equal(plan(empty).e.short, 'none', 'rien devant : rien');
  assert.equal(plan(empty).e.long, 'none');
  assert.equal(plan(empty, { take: 'pile', hold: 'knot' }).e.long, 'knot', 'E maintenu sur un tas lié : nouer');
  assert.equal(plan(empty, { take: 'take', hold: 'unknot' }).e.long, 'unknot', 'sur un fagot : dénouer');
  assert.equal(plan(empty, { hold: 'turn' }).e.long, 'turn', 'au contact d’une bille : pivoter');
  assert.equal(plan(empty, { site: 'help', hold: 'help' }).e.short, 'help-info', 'place trop lourde : dire ce qui manque');
  assert.equal(plan(empty, { site: 'help', hold: 'help' }).e.long, 'help', 'maintenu : appeler la mère');
  const one = hands({ item: resource }, null);
  assert.equal(plan(one, { take: 'pickup' }).e.short, 'pickup', 'une main libre : E prend encore');
  assert.equal(plan(one, { take: 'pile', hold: 'knot' }).e.long, 'none', 'nouer demande les mains vides');
  assert.equal(plan(one, { site: 'help', hold: 'help' }).e.long, 'help', 'appeler la mère : une main libre suffit');
  const full = hands({ item: resource }, { item: resource });
  assert.equal(plan(full, { take: 'pickup' }).e.short, 'full', 'les mains pleines devant ce qui se prend : la touche ne s’affiche pas');
  assert.equal(plan(hands(null, null, { prop: lump }), { take: 'take' }).e.short, 'full', 'un objet à deux mains : les mains pleines');
  assert.equal(plan(full, { use: 'swing' }).e.short, 'swing', 'les mains pleines, E ouvre encore');
  assert.equal(takeHand(empty, 1), 1, 'E prend dans la main droite d’abord');
  assert.equal(takeHand(hands(null, { item: resource }), 1), 0, 'puis dans la gauche');
  assert.equal(takeHand(empty, 0), 0, 'Maj + E : dans la gauche');
  assert.equal(takeHand(hands({ item: resource }, null), 0), 1, 'Maj + E, la gauche prise : la droite');
  assert.equal(takeHand(full, 1), undefined);
}

// F
{
  const h = hands(null, { item: oneHandTool });
  assert.deepEqual(plan(h, { work: [undefined, 'whittle'] }).f, { kind: 'work', hand: 1, work: 'whittle' }, 'l’outil devant ce qu’il travaille : F travaille');
  assert.equal(plan(h).f.kind, 'none', 'sans rien à travailler : F ne fait rien');
  assert.equal(plan(hands({ item: oneHandTool }, null), { work: ['break', undefined] }).f.hand, 0, 'l’outil de la main gauche aussi');
  const two = hands({ item: otherTool }, { item: oneHandTool });
  assert.equal(plan(two, { work: ['break', 'whittle'] }).f.hand, 1, 'deux outils qui travaillent : celui de la main droite');
  assert.equal(plan(two, { work: ['break', undefined] }).f.hand, 0, 'sinon celui de la gauche');
  assert.equal(plan(hands(null, null, { item: twoHandTool }), { work: ['fell', 'fell'] }).f.work, 'fell', 'à deux mains : F abat');
  assert.equal(plan(hands(null, { item: stake }), {}, true).f.kind, 'plant', 'le piquet, un plan connu : F le plante');
  assert.equal(plan(hands(null, { item: stake }), {}, false).f.kind, 'none', 'sans plan connu : F ne fait rien');
  assert.equal(plan(hands(null, { item: resource }), { work: [undefined, 'hit'] }).f.kind, 'none', 'une ressource ne travaille pas');
  assert.deepEqual(plan(hands({ item: resource }, null), { work: ['draw', undefined] }).f, { kind: 'work', hand: 0, work: 'draw' }, 'face à un poste du sol (le seau face à l’eau) : F puise, quoi qu’on tienne');
}

// A et Maj + A
{
  const two = hands({ item: resource }, { item: weapon1 });
  assert.deepEqual(plan(two).a, { kind: 'put', hand: 1 }, 'A pose la main droite');
  assert.deepEqual(plan(two).aLeft, { kind: 'put', hand: 0 }, 'Maj + A pose la gauche');
  assert.deepEqual(plan(hands({ item: resource }, null)).a, { kind: 'put', hand: 0 }, 'la droite vide : A pose la gauche');
  assert.deepEqual(plan(hands(null, { item: resource })).aLeft, { kind: 'put', hand: 1 }, 'la gauche vide : Maj + A pose la droite');
  assert.equal(plan(empty).a.kind, 'none', 'rien en main : rien');
  assert.deepEqual(plan(hands(null, null, { prop: lump })).a, { kind: 'put', hand: 1 }, 'à deux mains : A le pose');
  assert.equal(plan(hands(null, { item: stake }), {}, true).a.kind, 'put', 'le piquet d’un plan connu : A le pose toujours');
  assert.equal(plan(hands(null, { item: resource }), { site: 'place' }).a.kind, 'place', 'sur une place de chantier, A y pose (ou la place dit son refus)');
  const roll = hands(null, { prop: lump });
  assert.equal(plan(roll, { rest: [1] }).a.kind, 'rest', 'sur ce qui l’accepte (le billot) : A l’y pose');
  assert.equal(plan(roll, { rest: [0] }).a.kind, 'put', 'ce qui accepte l’objet de l’autre main ne compte pas');
  assert.equal(putHand(empty, 1), undefined);
}

// les clics : le combat seulement
{
  assert.equal(clickPlan('right', empty).short.kind, 'punch', 'main vide : le poing');
  assert.equal(clickPlan('left', empty).long.kind, 'none', 'main vide, maintenu : rien (les gestes longs sont à E)');
  for (const it of [oneHandTool, weapon1, resource, stake]) {
    const h = hands(null, { item: it });
    assert.equal(clickPlan('left', h).short.kind, 'strike', `${it} : le clic frappe, même dans le vide`);
    assert.equal(clickPlan('left', h).long.kind, 'throw', `${it} : maintenu, il se lance`);
    assert.equal(clickPlan('right', h).short.kind, 'punch', 'le clic droit est la main gauche, vide');
  }
  assert.equal(clickPlan('left', hands(null, { item: weapon1 })).short.from, undefined, 'à une main, l’enchaînement part du début');
  const two = hands(null, null, { item: twoHandTool });
  assert.equal(clickPlan('left', two).short.from, 0, 'à deux mains, le gauche frappe de taille');
  assert.equal(clickPlan('right', two).short.from, 1, 'le droit, d’en haut');
  assert.equal(clickPlan('left', hands(null, null, { prop: lump })).long.kind, 'throw', 'à deux mains, il se lance aussi');
}
console.log('✓ touches : E prend et agit (maintenu : nouer, pivoter, la mère), F travaille, A et Maj + A posent, chaque clic sa main frappe ou lance');
