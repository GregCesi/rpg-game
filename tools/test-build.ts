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

// les tronçons de solin : trois morceaux bout à bout, un angle, le milieu retiré
{
  const { wallRuns } = await import('../src/world/wallRuns');
  const sill = (id: number, x: number, y: number, view = 0): BuildPiece => ({ id, piece: { prop: 'rough-sill-wall' }, x, y, z: 0, view });
  const line = [sill(1, 0, 0), sill(2, 160, 0), sill(3, 320, 0)];
  let runs = wallRuns(line);
  assert.equal(runs.length, 1, 'trois morceaux jointifs : un tronçon');
  assert.deepEqual([runs[0].pieces.length, runs[0].start, runs[0].end], [3, 'head', 'head']);
  assert.equal(wallRuns(line).at(0)!.seed, runs[0].seed, 'le tirage se tire de la position');
  runs = wallRuns([line[0], line[2]]);
  assert.equal(runs.length, 2, 'le morceau du milieu retiré coupe le tronçon en deux');
  // l'aimant : un morceau nord-sud visé près du carré ouest se colle sous le tronçon (y = 50, hors de la grille)
  const ns = aimAt(line, sizeOf({ prop: 'rough-sill-wall' }, 1), 25, 50 + 80 + 4);
  assert.deepEqual([ns.x, ns.y], [0, 50], "l'aimant colle le morceau nord-sud sous le carré d'angle");
  runs = wallRuns([...line, sill(4, 0, 50, 1), sill(5, 0, 210, 1)]);
  const ew = runs.find((r) => r.axis === 'ew')!;
  const nsRun = runs.find((r) => r.axis === 'ns')!;
  assert.equal(nsRun.pieces.length, 2);
  assert.deepEqual([ew.start, ew.end, nsRun.start, nsRun.end], ['corner-s', 'head', 'abut', 'head'], "l'angle : l'est-ouest possède le carré, le nord-sud vient contre");
  // l'ordre de pose ne change pas l'angle : le nord-sud couvre le carré au sol (posé d'abord), l'est-ouest vient contre son flanc ;
  // l'angle reste à l'est-ouest, qui dessine le carré en plus, le nord-sud le dessine en moins
  runs = wallRuns([sill(20, 0, 0, 1), sill(21, 0, 160, 1), sill(22, 50, 0), sill(23, 210, 0)]);
  const ew2 = runs.find((r) => r.axis === 'ew')!;
  const ns2 = runs.find((r) => r.axis === 'ns')!;
  assert.deepEqual([ew2.start, ew2.extra, ns2.start, ns2.extra, ns2.align], ['corner-s', { start: 10 }, 'abut', { start: -10 }, 'west'], "l'angle est toujours à l'est-ouest");
  // un rectangle de 4 × 3 (nord-sud de 3 entre deux est-ouest de 4) : quatre angles
  const rect: BuildPiece[] = [];
  let id = 10;
  for (let i = 0; i < 4; i++) rect.push(sill(id++, i * 160, 0), sill(id++, i * 160, 530));
  for (let j = 0; j < 3; j++) rect.push(sill(id++, 0, 50 + j * 160, 1), sill(id++, 590, 50 + j * 160, 1));
  runs = wallRuns(rect);
  assert.equal(runs.length, 4);
  for (const r of runs.filter((q) => q.axis === 'ew')) assert.ok(r.start.startsWith('corner') && r.end.startsWith('corner'), `est-ouest : ${r.start} ${r.end}`);
  for (const r of runs.filter((q) => q.axis === 'ns')) assert.deepEqual([r.start, r.end], ['abut', 'abut']);
  console.log('✓ test-build : tronçons de solin (bout à bout, aimant, angle, rectangle, coupure)');
}

// les assemblages : enture entre deux poteaux debout l'un sur l'autre, refusée entre deux sections, tenon sous une sablière
{
  const { judge, refusal, scarfChains, junctionAt } = await import('../src/world/joints');
  const beamUp = (length: number) => ({ wood: { size: 'normal', length, shape: 'round' as const, hewn: 12, axis: 'up' as const } });
  const lower: BuildPiece = { id: 1, piece: beamUp(180), x: 0, y: 0, z: 0, view: 0 };
  const upper: BuildPiece = { id: 2, piece: beamUp(100), x: 0, y: 0, z: 180, view: 0 };
  assert.deepEqual(judge(lower, upper), { type: 'scarf' }, 'deux poteaux debout bout à bout : une enture');
  const round: BuildPiece = { id: 3, piece: { wood: { size: 'normal', length: 100, shape: 'round', axis: 'up' } }, x: 0, y: 0, z: 180, view: 0 };
  assert.match(judge(lower, round)!.why!, /même état/);
  const pole: BuildPiece = { id: 4, piece: { wood: { size: 'pole', length: 200, shape: 'round', axis: 'ew' } }, x: 200, y: 0, z: 0, view: 0 };
  const beamEw: BuildPiece = { id: 5, piece: { wood: { size: 'normal', length: 200, shape: 'round', hewn: 12, axis: 'ew' } }, x: 0, y: 0, z: 0, view: 0 };
  const touching = { ...pole, y: beamEw.y + (sizeOf(beamEw.piece).d - sizeOf(pole.piece).d) };
  assert.equal(judge(beamEw, { ...touching, y: beamEw.y })?.why, 'Les deux pièces doivent avoir la même section.');
  const chains = scarfChains([lower, upper], [{ id: 1, type: 'scarf', a: 1, b: 2 }]);
  assert.equal(chains.length, 1);
  assert.equal(chains[0].wood.length, 280, 'la suite entée est une pièce de 2,80 m');
  assert.deepEqual(chains[0].cuts, [180]);
  // le tenon : un poteau dont la tête touche le dessous d'une sablière
  const plateOn: BuildPiece = { id: 6, piece: { wood: { size: 'normal', length: 200, shape: 'round', hewn: 12, axis: 'ew' } }, x: -80, y: 0, z: 180, view: 0 };
  assert.deepEqual(judge(lower, plateOn), { type: 'mortise' });
  assert.match(refusal(junctionAt([lower, plateOn], 4, 0 - 180 / 5 + 8, 20), 'scarf', [])!, /bout à bout/);
  console.log('✓ test-build : assemblages (enture debout, section et état, suite entée, tenon et mortaise)');
}

// le mi-bois : deux pièces couchées de même section qui se croisent à angle droit ; une pièce couchée sur le solin s'aligne dehors
{
  const { judge } = await import('../src/world/joints');
  const { alignOnWall } = await import('../src/world/wallRuns');
  const beamOf = (axis: 'ew' | 'ns', size = 'normal') => ({ wood: { size, length: 300, shape: 'round' as const, hewn: size === 'normal' ? 12 : undefined, axis } });
  const E: BuildPiece = { id: 1, piece: beamOf('ew'), x: 0, y: 0, z: 40, view: 0 };
  const N: BuildPiece = { id: 2, piece: beamOf('ns'), x: 0, y: 0, z: 70, view: 0 };
  assert.deepEqual(judge(E, N), { type: 'halving' }, "l'une sur l'autre, à angle droit : un mi-bois");
  assert.deepEqual(judge(E, { ...N, z: 40 }), { type: 'halving' }, "l'une dans l'autre, à la même hauteur : toujours le mi-bois");
  assert.match(judge(E, { ...N, piece: { wood: { size: 'pole', length: 300, shape: 'round', axis: 'ns' } } })!.why!, /même section/);
  assert.match(judge(E, { ...E, id: 3, y: 0, z: 70 })!.why!, /angle droit/);
  // le solin : un angle (nord-sud qui part vers le sud du bout ouest) ; la sablière est-ouest affleure le nord, la nord-sud l'ouest
  const sill = (id: number, x: number, y: number, view = 0): BuildPiece => ({ id, piece: { prop: 'rough-sill-wall' }, x, y, z: 0, view });
  const walls = [sill(10, 0, 0), sill(11, 160, 0), sill(12, 0, 50, 1), sill(13, 0, 210, 1)];
  const onEw = alignOnWall(walls, { x: 0, y: 10, z: 40, w: 300, d: 30, h: 30 });
  assert.equal(onEw.y, 0, 'la sablière est-ouest affleure la face nord (dehors)');
  const onNs = alignOnWall(walls, { x: 10, y: 60, z: 40, w: 30, d: 300, h: 30 });
  assert.equal(onNs.x, 0, 'la sablière nord-sud affleure la face ouest (dehors)');
  console.log('✓ test-build : mi-bois (croisement, section, sens), sablière alignée sur la face extérieure du solin');
}

// l'encoche : deux rondins ronds croisés à angle droit, celui du dessus enfoncé de la moitié de son diamètre ; pas entre deux poutres
{
  const { judge } = await import('../src/world/joints');
  const log = (axis: 'ew' | 'ns', length = 380) => ({ wood: { size: 'normal', length, shape: 'round' as const, axis } });
  const A: BuildPiece = { id: 1, piece: log('ew'), x: 0, y: 20, z: 12, view: 0 };
  const B: BuildPiece = { id: 2, piece: log('ns', 440), x: 20, y: 0, z: 52, view: 0 };
  assert.deepEqual(judge(A, B), { type: 'notch' }, 'deux rondins croisés, l’un sur l’autre : une encoche');
  assert.deepEqual(judge(A, { ...B, z: 32 }), { type: 'notch' }, 'enfoncé de la moitié : toujours l’encoche');
  assert.match(judge(A, { ...B, z: 42 })!.why!, /reposer/);
  const hewn = { wood: { size: 'normal', length: 440, shape: 'round' as const, hewn: 12, axis: 'ns' as const } };
  assert.match(judge(A, { ...B, piece: hewn })!.why!, /même état/);
  console.log('✓ test-build : encoche (rondins croisés, enfoncés de moitié, refus)');
}

// l'âge du bois : la pièce de bois le garde dans `wood.age`, un objet de bois dans `age` ; une dalle ne le prend pas ; un plan d'un seul
// âge le fixe (ses pièces ne le répètent pas) et l'impose à la pose ; deux pièces d'âges différents ne s'entent pas ; le rondin écorcé
// s'encoche comme le rond
{
  const { judge } = await import('../src/world/joints');
  const { ageOf, withAge } = await import('../src/world/build');
  const beam = (x: number, age?: 'worn' | 'old'): BuildPiece => ({ id: x, piece: { wood: { size: 'normal', length: 200, shape: 'round', hewn: 12, axis: 'ew', ...(age ? { age } : {}) } }, x, y: 0, z: 0, view: 0 });
  const door: BuildPiece = { id: 9, piece: { prop: 'plank-door' }, x: 0, y: 100, z: 0, view: 0 };
  const stone: BuildPiece = { id: 10, piece: { prop: 'slab' }, x: 200, y: 100, z: 0, view: 0 };
  assert.equal(ageOf(beam(0)), 'new', 'sans réglage : neuf');
  assert.deepEqual(withAge(beam(0), 'worn').piece, beam(0, 'worn').piece, 'la pièce de bois prend l’âge dans wood.age');
  assert.equal(withAge(door, 'old').age, 'old', 'un objet de bois le prend dans age');
  assert.equal(withAge(withAge(door, 'old'), 'new').age, undefined, 'neuf : le réglage est ôté');
  assert.equal(withAge(stone, 'old'), stone, 'une dalle ne le prend pas');
  assert.equal(ageOf(stone), undefined);
  const group: BuildPiece[] = [withAge(beam(0), 'worn'), withAge(door, 'worn'), stone];
  const plan = planOf(group, { x: 0, y: 0, w: 400, d: 200 }, 'Âge')!;
  assert.equal(plan.age, 'worn', 'un seul âge : le plan le fixe');
  assert.ok(plan.pieces.every((q) => !q.age && !('wood' in q.piece && q.piece.wood.age)), 'ses pièces ne le répètent pas');
  const again = planPieces({ ...plan, age: 'old' }, { x: 0, y: 0, z: 0 });
  assert.ok(again.filter((q) => ageOf(q)).every((q) => ageOf(q) === 'old'), 'l’âge du plan l’emporte à la pose');
  const mixed = planOf([withAge(beam(0), 'worn'), withAge(door, 'old')], { x: 0, y: 0, w: 400, d: 200 }, 'Mêlé')!;
  assert.equal(mixed.age, undefined, 'deux âges : chaque pièce garde le sien');
  assert.deepEqual(planProblems({ ...plan, pieces: [{ ...plan.pieces[0], piece: { prop: 'slab' }, age: 'old' }] }).length, 1, 'un âge sur une dalle est refusé');
  assert.match(judge(beam(0, 'worn'), { ...beam(200), id: 1 })!.why!, /même âge/, 'deux âges ne s’entent pas');
  assert.deepEqual(judge(beam(0, 'worn'), { ...beam(200, 'worn'), id: 1 }), { type: 'scarf' });
  const log = (axis: 'ew' | 'ns', length: number) => ({ wood: { size: 'normal', length, shape: 'round' as const, peeled: true as const, axis } });
  assert.deepEqual(judge({ id: 1, piece: log('ew', 380), x: 0, y: 20, z: 12, view: 0 }, { id: 2, piece: log('ns', 440), x: 20, y: 0, z: 52, view: 0 }), { type: 'notch' }, 'deux rondins écorcés : une encoche');
  console.log('✓ test-build : âge du bois (pièce, objet, plan, enture), rondin écorcé');
}

// Les intérieurs (chantier « intérieurs ») : la cabane et la grange de leurs plans, la pièce close derrière la porte, l'entrée, ce
// qu'on voit dedans ; la cabane sans sa porte : une ouverture sous le linteau ; sans son linteau non plus : plus de pièce close.
{
  const { readFileSync } = await import('node:fs');
  const { buildingsOf, interiorId, parseInteriorId } = await import('../src/world/interior');
  const { swung } = await import('../src/world/build');
  const placed = (name: string) => planPieces(JSON.parse(readFileSync(`src/content/plans/${name}.json`, 'utf8')), { x: 1000, y: 1000, z: 0 }).map((p, i) => ({ ...p, id: i }));
  const cabin = placed('cabane');
  const [c] = buildingsOf(cabin);
  assert.deepEqual(c.room, { x: 1060, y: 1080, w: 260, d: 320 }, 'la cabane : 2,60 × 3,20 m entre les faces des murs');
  assert.equal(c.entrances.length, 1);
  assert.deepEqual([c.entrances[0].side, c.entrances[0].open, c.entrances[0].facing], ['south', false, 'up'], 'la porte au sud, fermée');
  assert.deepEqual(c.windows.map((w) => [w.side, w.open]), [['east', false]], 'le volet de la fenêtre est');
  assert.ok(!c.shell.some((p) => 'prop' in p.piece && /roof|door/.test(p.piece.prop)), 'ni toit ni porte dedans');
  assert.ok(!c.shell.some((p) => 'wood' in p.piece && p.z >= 300), 'la faîtière passe au-dessus');
  const open = cabin.map((p) => ('prop' in p.piece && p.piece.prop === 'plank-door' ? { ...swung(p)!, id: p.id } : p));
  assert.equal(buildingsOf(open)[0].entrances[0].open, true, 'la porte ouverte : on passe');
  const doorless = cabin.filter((p) => !('prop' in p.piece && p.piece.prop === 'plank-door'));
  const [d] = buildingsOf(doorless);
  assert.ok(d && d.entrances.length === 1 && d.entrances[0].open && d.entrances[0].door === undefined, 'sans porte : une ouverture sous le linteau');
  assert.deepEqual(d.room, c.room, 'la même pièce');
  const lintel = Math.max(...doorless.filter((p) => 'wood' in p.piece && p.y === 1400).map((p) => p.z));
  assert.deepEqual(buildingsOf(doorless.filter((p) => !('wood' in p.piece && p.y === 1400 && p.z === lintel))), [], 'sans linteau : rien de clos');
  const [g] = buildingsOf(placed('grange'));
  assert.deepEqual([g.room.w, g.room.d], [880, 600], 'la grange : 8,80 × 6 m');
  assert.ok(g.south.length >= 4, 'la coupe du mur sud, de part et d’autre de la porte charretière');
  assert.deepEqual(parseInteriorId(interiorId('ferme', c.key)), { host: 'ferme', key: '1060,1080' });
  assert.equal(parseInteriorId('maison'), undefined);
  // la maison de Xéros : la cloison est-ouest entre le cagibi et le coin de Xéros est coupée avec tout ce qui est dans sa bande (chantier
  // « correctifs » : la traverse qu'elle porte, son solin, le poteau du milieu ; la sablière cachée), quelle que soit la forme de chaque
  // pièce ; les poteaux d'angle restent entiers avec les murs de côté
  {
    const [h] = buildingsOf(placed('maison-xeros'));
    const cag = h.rooms.filter((r) => r.y === h.room.y).sort((a, b) => a.x - b.x)[0];
    const line = cag.y + cag.d;
    const inWall = (p: BuildPiece) => {
      const b = boxOf(p);
      return b.y >= line - 40 && b.y + b.d <= line + 70 && b.x < cag.x + cag.w && b.x + b.w > cag.x;
    };
    const whole = h.shell.filter(inWall);
    assert.deepEqual(whole.map((p) => boxOf(p)), [], 'rien de la cloison du cagibi ne reste entier dans la vue de dedans');
    const cut = h.southPieces.filter(inWall);
    const beam = cut.find((p) => 'wood' in p.piece && p.piece.wood.axis === 'ew' && boxOf(p).z < 100);
    assert.ok(beam, 'la traverse de la cloison du cagibi est coupée avec elle');
    assert.ok(cut.some((p) => 'wood' in p.piece && p.piece.wood.axis === 'up'), 'le poteau du milieu de la cloison est coupé avec elle');
    assert.ok(!h.shell.some((p) => 'wood' in p.piece && p.piece.wood.axis === 'ew' && boxOf(p).z >= 200 && inWall(p)), 'la sablière de la cloison est cachée');
  }
  console.log('✓ test-build : intérieurs (pièce close, porte, ouverture sous le linteau, fenêtre, coupe du mur sud ; la cloison du cagibi coupée avec sa traverse et son poteau)');
}

// Le mur du fond (chantier maison-2, règle de Grégoire) : dans une pièce close, rien du mur du fond ne passe devant ce qui est dans la
// pièce, quoi qui le porte, pour tout bâtiment des plans du dépôt, dehors comme dedans ; ce qui est dans la pièce garde sa profondeur
{
  const { readFileSync, readdirSync } = await import('node:fs');
  const { backCaps, buildingsOf } = await import('../src/world/interior');
  const { planPieces, solidOf } = await import('../src/world/build');
  const { CM_PER_PX } = await import('../src/content/gabarit');
  let rooms = 0;
  for (const f of readdirSync('src/content/plans').filter((n) => n.endsWith('.json'))) {
    const plan = JSON.parse(readFileSync(`src/content/plans/${f}`, 'utf8'));
    const ps = planPieces(plan, { x: 1000, y: 1000, z: 0 }).map((p, i) => ({ ...p, id: i }));
    const all = buildingsOf(ps).flatMap((b) => b.rooms);
    const caps = backCaps(ps, all);
    const raw = depthsOf(ps);
    const depth = depthsOf(ps, caps);
    for (const r of all) {
      rooms++;
      const face = r.y / CM_PER_PX;
      // ce qui est dans la pièce (tout entier dedans) : jamais derrière sa face
      const inside = ps.filter((p) => {
        const b = solidOf(p);
        return b.y >= r.y && b.y + b.d <= r.y + r.d && b.x >= r.x && b.x + b.w <= r.x + r.w;
      });
      for (const p of inside) assert.ok(depth.get(p.id)! >= Math.min(face, raw.get(p.id)!), `${f} : une pièce dans la pièce reste devant sa face`);
      // le mur du fond : derrière la face
      for (const p of ps.filter((q) => caps.has(q.id) && (caps.get(q.id) ?? 0) <= face)) {
        const b = solidOf(p);
        if (b.y + b.d > r.y || b.x >= r.x + r.w || b.x + b.w <= r.x) continue;
        assert.ok(depth.get(p.id)! < face, `${f} : la pièce ${p.id} du mur du fond (${depth.get(p.id)}) passe derrière la face ${face}`);
        for (const q of inside) assert.ok(depth.get(p.id)! < depth.get(q.id)!, `${f} : le mur du fond derrière ce qui est dans la pièce`);
      }
    }
    // l'ordre de ce qui porte et de ce qui est porté reste vrai dans le mur du fond d'une même pièce (une poutre de côté qui traverse
    // la face d'une pièce et borde la suivante relève des murs de côté, à part)
    for (const p of ps) {
      if (!caps.has(p.id)) continue;
      for (const s of ps.filter((q) => caps.get(q.id) === caps.get(p.id) && q.z + boxOf(q).h === p.z && q.id !== p.id)) {
        const a = boxOf(p), c = boxOf(s);
        if (a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.d && c.y < a.y + a.d) assert.ok(depth.get(p.id)! > depth.get(s.id)!, `${f} : porté après porteur dans le fond`);
      }
    }
  }
  assert.ok(rooms >= 6, 'des pièces closes dans les plans du dépôt');
  console.log(`✓ test-build : le mur du fond derrière tout ce qui est dans la pièce (${rooms} pièces closes, tous les plans du dépôt)`);
}

// Le solin de toute longueur (chantier « maison-2 ») : un morceau se règle sur la grille de walls.json (10 cm, au moins 40), sa boîte
// en suit la longueur, des morceaux de longueurs mêlées font un seul tronçon, et un plan refuse une longueur hors de la grille
{
  const { WALL_PIECE } = await import('../src/world/walls');
  const { wallRuns, runPx } = await import('../src/world/wallRuns');
  assert.deepEqual(WALL_PIECE, { grid: 10, min: 40 });
  assert.deepEqual(sizeOf({ prop: 'rough-sill-wall', length: 70 }), { w: 70, d: 50, h: 40 });
  assert.deepEqual(sizeOf({ prop: 'rough-sill-wall', length: 70 }, 1), { w: 50, d: 70, h: 40 });
  const mixed: BuildPiece[] = [
    { id: 1, piece: { prop: 'rough-sill-wall', length: 70 }, x: 0, y: 0, z: 0, view: 0 },
    { id: 2, piece: { prop: 'rough-sill-wall' }, x: 70, y: 0, z: 0, view: 0 },
    { id: 3, piece: { prop: 'rough-sill-wall', length: 40 }, x: 230, y: 0, z: 0, view: 0 },
  ];
  const runs = wallRuns(mixed);
  assert.equal(runs.length, 1, 'des longueurs mêlées bout à bout : un tronçon');
  assert.equal(runPx(runs[0]), 54, '70 + 160 + 40 cm = 54 px');
  const bad = { name: 'x', size: { w: 100, d: 50 }, pieces: [{ piece: { prop: 'rough-sill-wall', length: 75 }, x: 0, y: 0, z: 0, view: 0 }, { piece: { prop: 'slab', length: 60 }, x: 0, y: 0, z: 0, view: 0 }] };
  const why = planProblems(bad as never);
  assert.equal(why.length, 2, `deux refus : ${why.join(' ; ')}`);
  console.log('✓ test-build : le solin de toute longueur (grille de 10 cm, au moins 40), des tronçons de longueurs mêlées');
}
