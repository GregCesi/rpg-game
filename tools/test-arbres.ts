// Test rapide des arbres qui s'abattent (docs/CONCEPTION.md, « Abattre un arbre ») : pour chaque arbre de props.json qui tombe
// (`harvest.fall`), et pour chaque côté, ce que ses données et ses dessins donnent (art/world/trees.ts) :
// - ses étapes d'abattage (`<image>-stage-<n>`, `<image>-left-stage-<n>`), une par part de `stages`, à la taille de l'arbre debout,
//   l'étape 0 étant l'arbre debout lui-même ;
// - sa chute sans saut : sous la coupe, la première image du raccord est, pixel pour pixel, la dernière étape posée (au-dessus, le
//   haut continue de basculer : c'est le raccord) ; la dernière image est la souche et l'arbre couché posés comme le jeu les pose ;
// - ses décalages calculés (src/generated/trees.json) : ceux que le jeu lit dans props.json (`props` de src/content) ;
// - ses étapes d'ébranchage, dans les deux vues de l'arbre couché, à sa taille ;
// - la pièce de bois qu'il donne (`becomes: "wood-piece"`, `wood` : un diamètre de wood.json, une longueur sur la grille), posée
//   sur le tronc de l'arbre couché.
// Usage : npx tsx tools/test-arbres.ts (lancé par npm run test:fast, après npm run art).

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import type { Grid } from '../art/lib/canvas';
import { world } from '../art/palette';
import { fellingStage } from '../art/world/felling';
import { FALLS, STAGE_GROUPS, TREES, treeLayouts } from '../art/world/trees';
import { props, wood } from '../src/content';
import { WOOD_PIECE } from '../src/world/woodPiece';
import { Board } from './lib/composite-previews';
import { placeLying, type Placed } from './lib/trees-preview';

const solid = (q: string | undefined) => q !== undefined && q !== '.' && q !== 'x';
const sizeOf = (g: Grid) => `${g[0].length} × ${g.length}`;
const images = new Map(STAGE_GROUPS.flatMap((g) => g.stages).map((s) => [s.name, s.grid]));
const built = (name: string) => existsSync(`src/generated/${name}.png`);

// les arbres sont ceux de props.json qui tombent, tous
const falling = Object.entries(props).filter(([, p]) => p.harvest?.fall).map(([k]) => k);
assert.deepEqual(TREES.map((t) => t.key), falling, 'les arbres tirés de props.json : tous ceux qui ont harvest.fall');
assert.ok(TREES.length > 0, 'au moins un arbre');

// les décalages : ceux que le jeu lit sont ceux que les dessins donnent
const layouts = treeLayouts();
for (const t of TREES) {
  const h = props[t.key].harvest!;
  const l = layouts.standing[t.key];
  assert.deepEqual({ x: h.fall!.x, foot: h.fall!.foot, left: h.fall!.left.x }, { x: l.fall.x, foot: l.fall.foot, left: l.fall.left.x }, `${t.key} : la chute posée comme ses dessins le disent (npm run art)`);
  assert.equal(h.fall!.y, 0, `${t.key} : la chute a le bas de l'arbre debout`);
  assert.deepEqual(h.at, l.at, `${t.key} : la souche posée comme ses dessins le disent`);
  assert.deepEqual(h.spawns, l.spawns, `${t.key} : l'arbre couché posé comme ses dessins le disent`);
  assert.deepEqual(props[t.felled.key].harvest!.at, layouts.felled[t.felled.key].at, `${t.felled.key} : la pièce de bois posée comme ses dessins le disent`);
}

const stageOf = (name: string): Grid => {
  const g = images.get(name);
  assert.ok(g, `image d'étape '${name}' tirée des dessins`);
  assert.ok(built(name), `image d'étape '${name}' produite par npm run art`);
  return g!;
};

for (const t of TREES) {
  const s = t.standing;
  const h = props[t.key].harvest!;
  const nStages = h.stages?.length ?? 0;
  assert.ok(nStages > 0, `${t.key} : des étapes d'abattage (stages)`);
  const stand = fellingStage(s, 0).toGrid();
  assert.equal(sizeOf(stand), `${s.w} × ${s.h}`, `${t.key} : l'étape 0 a la taille de l'arbre debout`);
  assert.ok(built(t.image), `${t.key} : l'image de l'arbre debout '${t.image}' est produite`);

  for (const left of [false, true]) {
    const where = `${t.key}${left ? ' (chute à gauche)' : ''}`;
    // les étapes de l'abattage
    for (let n = 1; n <= nStages; n++) {
      const g = stageOf(`${t.image}${left ? '-left' : ''}-stage-${n}`);
      assert.equal(sizeOf(g), `${s.w} × ${s.h}`, `${where} : l'étape ${n} a la taille de l'arbre debout`);
    }
    // la chute
    const f = left ? h.fall!.left : h.fall!;
    const sheet = FALLS.find((x) => x.name === f.image);
    assert.ok(sheet, `${where} : planche de chute '${f.image}' tirée des dessins`);
    assert.ok(built(f.image), `${where} : planche de chute '${f.image}' produite`);
    const fs = sheet!.animations[h.fall!.anim]?.frames;
    assert.ok(fs && fs.length === 5, `${where} : la chute a ses cinq images (raccord, raccord, 10°, 45°, couché)`);
    const W = sheet!.frameW, H = sheet!.frameH;
    assert.equal(H, s.h, `${where} : la chute a la hauteur de l'arbre debout`);
    const offX = f.x;
    // sous la coupe : la première image est la dernière étape posée (l'ombre du haut, qui suit la penche, n'est pas comparée)
    const last = stageOf(`${t.image}${left ? '-left' : ''}-stage-${nStages}`);
    let bad = 0;
    let first: [number, number] | undefined;
    for (let y = s.floor - 1; y < last.length; y++) for (let x = 0; x < last[0].length; x++) {
      const p = last[y][x];
      const q = fs![0][y]?.[x - offX];
      if ((solid(p) || solid(q)) && p !== q) { bad++; first ??= [x - offX, y]; }
    }
    assert.equal(bad, 0, `${where} : sous la coupe, la première image de la chute diffère de la dernière étape posée (${bad} pixels, premier en ${first})`);
    // au-dessus, le raccord continue la penche : la première image n'est pas l'étape d'avant tournée d'un autre angle par erreur
    // (même nombre de pixels pleins, à quelques-uns près : la même matière, qui pivote)
    const count = (g: Grid) => g.reduce((a, r) => a + [...r].filter(solid).length, 0);
    assert.ok(Math.abs(count(fs![0]) - count(last)) <= count(last) * 0.02, `${where} : la première image du raccord a la matière de la dernière étape`);

    // la dernière image : la souche et l'arbre couché, posés comme le jeu les pose
    const lying = left ? t.lying.left : t.lying.right;
    const image = (name: string | undefined) => {
      if (name === t.image) return { grid: Array.from({ length: s.h }, () => '.'.repeat(s.w)), palette: world };
      if (name === props[t.stump].image) return { grid: t.art.stump().toGrid(), palette: world };
      if (name === t.felled.image) return { grid: t.lying.right.toGrid(), palette: world };
      if (name === `${t.felled.image}-left`) return { grid: t.lying.left.toGrid(), palette: world };
      return undefined;
    };
    const placed = placeLying(image, props, t.key, t.felled.key, left, 'whole', world);
    assert.ok(placed, `${where} : souche et arbre couché posés`);
    const a = new Board(W, H, undefined);
    const b = new Board(W, H, undefined);
    a.blit(fs![4], world, 0, 0);
    for (const p of placed!) b.blit(p.grid, p.palette, p.x - offX, p.y - (s.h - H));
    const diff = a.diff(b);
    assert.equal(diff.length, 0, `${where} : la dernière image de la chute diffère de l'arbre couché posé (${diff.length} pixels, premier en ${diff[0]})`);
    // l'arbre couché posé entier sous la planche : rien ne dépasse de la dernière image
    for (const p of placed!) {
      assert.ok(p.x - offX >= 0 && p.x - offX + p.grid[0].length <= W && p.y >= 0, `${where} : '${p.grid.length}' posé hors de la chute`);
    }

    // l'ébranchage : ses étapes dans la vue de ce côté, à la taille de l'arbre couché
    const fh = props[t.felled.key].harvest!;
    assert.ok(fh.work && 'limbs' in fh.work, `${t.felled.key} : il s'ébranche (work.limbs)`);
    const base = `${t.felled.image}${left ? '-left' : ''}`;
    assert.ok(built(base), `${t.felled.key} : image couchée '${base}' produite`);
    for (let n = 1; n <= (fh.stages?.length ?? 0); n++) {
      const g = stageOf(`${base}-stage-${n}`);
      assert.equal(sizeOf(g), sizeOf(lying.toGrid()), `${base} : l'étape d'ébranchage ${n} a la taille de l'arbre couché`);
    }
    assert.ok((fh.stages?.length ?? 0) > 0, `${t.felled.key} : des étapes d'ébranchage`);

    // la pièce de bois : ronde, d'un diamètre de wood.json, sur la grille, posée sur le tronc de l'arbre couché
    assert.equal(fh.becomes, WOOD_PIECE, `${t.felled.key} : ébranché, il devient une pièce de bois`);
    const w = fh.wood!;
    assert.ok(wood.sizes[w.size], `${t.felled.key} : diamètre '${w.size}' de wood.json`);
    assert.ok(w.length % wood.grid === 0 && w.length >= wood.min && w.length <= wood.max, `${t.felled.key} : ${w.length} cm, sur la grille de ${wood.grid} cm, entre ${wood.min} et ${wood.max}`);
    const trunk = placeLying(image, props, t.key, t.felled.key, left, 'trunk', world)!;
    const piece: Placed = trunk[trunk.length - 1];
    const whole = placed![placed!.length - 1];
    let out = 0;
    for (let y = 0; y < piece.grid.length; y++) for (let x = 0; x < piece.grid[0].length; x++) {
      if (!solid(piece.grid[y][x])) continue;
      const q = whole.grid[piece.y + y - whole.y]?.[piece.x + x - whole.x];
      if (!solid(q)) out++;
    }
    assert.equal(out, 0, `${where} : la pièce de bois de ${w.length} cm déborde du tronc de l'arbre couché (${out} pixels)`);
  }
}

console.log(`test-arbres : ${TREES.length} arbres (${TREES.map((t) => t.key).join(', ')}), leurs étapes, leurs deux chutes, leurs arbres couchés, leur ébranchage et leur pièce de bois`);
