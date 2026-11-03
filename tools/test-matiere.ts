// La matière se conserve (règle de Grégoire, CONCEPTION « Le monde ne limite pas ») : nouer, dénouer, empiler, reprendre d'un tas,
// fendre, couper, transformer ne créent jamais de matière. La masse totale (et le nombre de pièces quand il a un sens) est la même
// avant et après, sauf ce qu'un travail retire et nomme (le déchet `waste` d'une transformation : copeaux, éclats). Sans le jeu :
// - chaque transformation de transforms.json : la sortie ne pèse jamais plus que l'entrée, et ce qui manque est un déchet nommé ;
// - nouer, dénouer : un tas de n branches et son lien pèse ce que pèse le fagot de n branches, de 2 à 12 ; tenu, offert à un tas,
//   posé seul et sauvegardé, le fagot garde son nombre ;
// - empiler, reprendre : la pièce tenue pèse la pièce du tas ;
// - fendre : les morceaux pèsent la pièce, pour chaque bois qui se fend ;
// - couper : les deux morceaux pèsent la pièce, à chaque coupe de la grille.
// Le fagot noué puis dénoué en jeu, au vrai clavier : npm run test:noeud. Usage : npx tsx tools/test-matiere.ts (npm run test:fast).

import assert from 'node:assert/strict';
import { items, matters, piles, props, rocks, transforms, wood } from '../src/content';
import { heldMass, pieceMass, propMass, woodMass } from '../src/content/mass';
import { addPile, GameStateSchema, newGame, spawnObject } from '../src/state/GameState';
import { SAVE_VERSION, upgrade } from '../src/state/save';
import { pileOf } from '../src/world/offer';
import { bundleOfKind } from '../src/world/pileShape';
import { balance } from '../src/world/transform';
import { cutWood, splitPieces } from '../src/world/woodShape';
import type { WoodPiece } from '../src/content/types';

const cat = { items, props, piles, matters, rocks } as Parameters<typeof balance>[1];
const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 1e-6, `${what} : ${a.toFixed(4)} kg contre ${b.toFixed(4)} kg`);

// 1. les transformations
for (const [key, t] of Object.entries(transforms)) {
  const b = balance(t, cat);
  assert.ok(b.waste >= -1e-6, `${key} : la sortie (${b.output.toFixed(2)} kg) pèse plus que l'entrée (${b.input.toFixed(2)} kg)`);
  if (!t.waste) near(b.output, b.input, `${key} : sans déchet nommé, rien ne se perd`);
}
console.log(`✓ matière : ${Object.keys(transforms).length} transformations, rien ne naît, ce qui se perd est un déchet nommé`);

// 2. nouer, dénouer : le fagot de n branches
const branches = Object.keys(piles).find((g) => piles[g].tie?.into)!;
const tie = piles[branches].tie!;
const fagots = props[tie.into].take!.pile!;
const branch = pieceMass(piles[branches].piece);
const lien = heldMass({ item: tie.item });
for (let n = 2; n <= 12; n++) {
  // le tas noué : n branches et le lien ; le fagot qui en naît pèse autant
  near(propMass(tie.into, undefined, undefined, undefined, undefined, n), n * branch + lien, `fagot de ${n} branches`);
  // tenu, il pèse autant ; offert à un tas, il ne va que sur un tas de fagots de n branches
  near(heldMass({ prop: tie.into, bundle: n }), n * branch + lien, `fagot de ${n} tenu`);
  const kind = pileOf({ prop: tie.into, bundle: n })!;
  assert.equal(kind.pile, fagots);
  assert.equal(bundleOfKind(kind), n, `fagot de ${n} : le tas qui le reçoit le compte ${bundleOfKind(kind)}`);
  // noué en tas de fagots (GameState : le tas garde son nombre), posé seul (un objet né), sauvegardé, relu : son nombre est gardé
  const s = newGame();
  const pile = addPile(s, 'ferme', { pile: fagots, bundle: n, x: 0, y: 0, places: ['a'] });
  assert.equal(pile.bundle, n, `fagot de ${n} noué en tas`);
  const o = spawnObject(s, 'ferme', tie.into, 10, 10, { bundle: n });
  const back = GameStateSchema.parse(JSON.parse(JSON.stringify(s)));
  assert.equal(back.maps.ferme.spawned.find((q) => q.id === o.id)?.bundle, n, `fagot de ${n} posé seul, sauvegardé`);
  assert.equal(back.maps.ferme.piles.find((q) => q.id === pile.id)?.bundle, n, `fagot de ${n} en tas, sauvegardé`);
}
console.log(`✓ matière : le fagot de 2 à 12 branches pèse ses branches et son lien (${branch.toFixed(2)} kg la branche, ${lien} kg le lien), tenu, offert à un tas, posé seul, sauvegardé`);

// 3. empiler, reprendre : la pièce tenue pèse la pièce du tas
for (const [g, def] of Object.entries(piles)) {
  const p = def.piece;
  const held = 'item' in p ? { item: p.item } : 'prop' in p ? { prop: p.prop } : { prop: 'wood-piece', wood: { ...p.wood, axis: 'ew' as const } };
  near(heldMass(held), pieceMass(p), `${g} : la pièce tenue pèse la pièce du tas`);
}
console.log(`✓ matière : ${Object.keys(piles).length} genres de tas, la pièce reprise pèse ce qu'elle pesait posée`);

// 4. fendre, couper : les morceaux pèsent la pièce
let splits = 0;
let cuts = 0;
for (const [size, s] of Object.entries(wood.sizes)) {
  for (const shape of Object.keys(s.split ?? {}) as ('round' | 'half')[]) {
    for (const length of [100, 200, 350]) {
      const piece: WoodPiece = { size, shape, length, axis: 'ew' };
      const out = splitPieces(piece).reduce((m, q) => m + woodMass(q.piece), 0);
      // les lattes tirées de la demi-perche : le cœur et l'écorce partent, nommés (`waste` de la fente) ; sinon rien ne se perd
      if (s.split![shape]!.waste) assert.ok(out < woodMass(piece) + 1e-6, `fendre ${size} ${shape} : les morceaux pèsent plus que la pièce`);
      else near(out, woodMass(piece), `fendre ${size} ${shape} de ${length} cm`);
      splits++;
    }
  }
  const piece: WoodPiece = { size, shape: 'round', length: 400, axis: 'ew' };
  for (let at = wood.min; at <= piece.length - wood.min; at += wood.grid) {
    const [a, b] = cutWood(piece, at);
    assert.equal(a.length + b.length, piece.length, `couper ${size} à ${at} cm : les longueurs`);
    near(woodMass(a) + woodMass(b), woodMass(piece), `couper ${size} à ${at} cm`);
    cuts++;
  }
}
console.log(`✓ matière : ${splits} fentes et ${cuts} coupes, les morceaux pèsent la pièce`);

// 5. une sauvegarde d'avant le tas de 12 (version 26) : un fagot sans nombre était plein, de 10 branches ; il les garde
{
  const old = {
    version: 26,
    state: {
      hands: [{ prop: tie.into }, null],
      both: null,
      active: 1,
      maps: { ferme: { piles: [{ id: 0, pile: fagots, x: 0, y: 0, places: ['a'] }], spawned: [{ id: 0, type: tie.into, x: 0, y: 0 }, { id: 1, type: tie.into, x: 0, y: 0, bundle: 4 }] } },
    },
  };
  const up = upgrade(old) as { version: number; state: typeof old.state & { hands: { bundle?: number }[] } };
  // jusqu'à la version d'aujourd'hui (la main active retirée en 28, chantier « commandes »)
  assert.equal(up.version, SAVE_VERSION);
  assert.equal('active' in up.state, false, 'la main active n’existe plus');
  assert.equal((up.state.maps.ferme.piles[0] as { bundle?: number }).bundle, 10, 'tas de fagots sans nombre : 10 branches');
  assert.deepEqual(up.state.maps.ferme.spawned.map((o) => (o as { bundle?: number }).bundle), [10, 4], 'fagot posé seul : 10 sans nombre, son nombre sinon');
  assert.equal(up.state.hands[0].bundle, 10, 'fagot tenu sans nombre : 10 branches');
  assert.equal(pieceMass(piles[branches].piece) * Object.keys(piles[branches].places).length + lien, propMass(tie.into), 'le fagot plein (sans nombre) : le tas de branches plein et son lien');
  console.log(`✓ matière : une sauvegarde d'avant (fagot plein de 10) garde ses 10 branches ; le plein est maintenant de ${Object.keys(piles[branches].places).length}`);
}
