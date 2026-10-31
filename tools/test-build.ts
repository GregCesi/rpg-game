// Test du modèle du mode construction (src/world/build.ts), sans Phaser ni navigateur : boîtes, hauteur accrochée, porteurs,
// ordre d'affichage, plan tiré d'un groupe de pièces et reposé. Usage : npx tsx tools/test-build.ts (lancé aussi par npm run test).

import assert from 'node:assert/strict';
import { aimAt, boxOf, carriedBy, depthsOf, planOf, planPieces, planProblems, sizeOf, supportsOf, turned, withAbove, type BuildPiece } from '../src/world/build';

const post = { wood: { size: 'normal', length: 180, shape: 'round' as const, hewn: 12, axis: 'up' as const } };
const plate = { wood: { size: 'normal', length: 200, shape: 'round' as const, hewn: 12, axis: 'ew' as const } };
const pieces: BuildPiece[] = [];
const put = (p: Omit<BuildPiece, 'id'>) => {
  const q = { ...p, id: pieces.length };
  pieces.push(q);
  return q;
};

// une dalle au sol, visée au point (20, 20) : sur la grille, à z 0
const slabBox = aimAt(pieces, sizeOf({ prop: 'slab' }), 20, 20);
assert.deepEqual([slabBox.x, slabBox.y, slabBox.z], [0, 0, 0]);
const slab = put({ piece: { prop: 'slab' }, x: slabBox.x, y: slabBox.y, z: slabBox.z, view: 0 });

// un poteau debout visé sur la dalle : il prend le dessus de la dalle (12 cm)
const postSize = sizeOf(post);
assert.deepEqual(postSize, { w: 40, d: 40, h: 180 });
const postBox = aimAt(pieces, postSize, 20, 8);
assert.equal(postBox.z, 12, 'le poteau repose sur la dalle');
const p = put({ piece: post, x: postBox.x, y: postBox.y, z: postBox.z, view: 0 });
assert.deepEqual(supportsOf(pieces, p).map((q) => q.id), [slab.id]);

// une sablière visée sur la tête du poteau (vue à 1,92 m de haut : 38,4 px plus haut à l'écran)
const plateBox = aimAt(pieces, sizeOf(plate), 20, postBox.y + 20 - 192);
assert.equal(plateBox.z, 192, 'la sablière repose sur la tête du poteau');
const s = put({ piece: plate, x: plateBox.x, y: plateBox.y, z: plateBox.z, view: 0 });
assert.deepEqual(carriedBy(pieces, p.id).map((q) => q.id), [s.id], 'le poteau porte la sablière');
assert.deepEqual(withAbove(pieces, slab.id).map((q) => q.id).sort(), [0, 1, 2]);

// deux crans plus haut : 40 cm de plus ; jamais sous le sol
assert.equal(aimAt(pieces, sizeOf({ prop: 'slab' }), 300, 300, 2).z, 40);
assert.equal(aimAt(pieces, sizeOf({ prop: 'slab' }), 300, 300, -3).z, 0);

// l'ordre : la pièce portée passe après celle qui la porte
const depth = depthsOf(pieces);
assert.ok(depth.get(p.id)! > depth.get(slab.id)!);
assert.ok(depth.get(s.id)! > depth.get(p.id)!);

// R : la poutre est-ouest passe nord-sud, puis debout, puis revient est-ouest ; un objet à quatre vues fait le tour
let r = turned(plate, 0);
assert.equal(('wood' in r.ref && r.ref.wood.axis), 'ns');
r = turned(r.ref, 0);
assert.equal(('wood' in r.ref && r.ref.wood.axis), 'up');
r = turned(r.ref, 0);
assert.equal(('wood' in r.ref && r.ref.wood.axis), 'ew');
assert.equal(turned({ prop: 'chest' }, 3).view, 0);
assert.deepEqual(sizeOf({ prop: 'chest' }, 1), { w: 50, d: 90, h: 55 });

// un plan tiré des trois pièces, reposé ailleurs : mêmes pièces, mêmes écarts
const plan = planOf(pieces, { x: -20, y: -20, w: 100, d: 100 }, 'essai')!;
assert.equal(plan.pieces.length, 3);
assert.deepEqual(planProblems(plan), []);
const again = planPieces(plan, { x: 400, y: 200, z: 0 });
const ox = Math.min(...pieces.map((q) => q.x));
const oy = Math.min(...pieces.map((q) => q.y));
const before = pieces.map(boxOf).map((b) => [b.x - ox, b.y - oy, b.z]).sort();
const after = again.map(boxOf).map((b) => [b.x - 400, b.y - 200, b.z]).sort();
assert.deepEqual(after, before);
assert.match(planProblems({ ...plan, pieces: [{ ...plan.pieces[0], piece: { prop: 'nope' } }] })[0], /n'existe pas/);
console.log('✓ test-build : boîtes, hauteur accrochée, porteurs, ordre, plans');
