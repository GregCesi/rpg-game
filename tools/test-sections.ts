// Test des pièces fendues (docs/CONCEPTION.md, « Les pièces fendues »), sans navigateur : les vues calculées depuis la section
// (art/world/wood-section.ts) et ce qu'en font les tas et le fendage.
// 1. Recouvrement : dans un tas de bois et dans une rangée de pièces posées côte à côte dans la profondeur, est-ouest, le flanc
//    (une surface tournée de côté ou vers le bas) d'une pièce qui en a une autre devant elle, dans sa couche, n'est visible nulle
//    part : la pièce de devant le cache au pixel près. Et l'affichage d'un tas de bois va couche par couche (ce qui est plus haut
//    cache ce qui est dessous), de l'arrière vers l'avant.
// 2. Positions après la coupe : la bille donne deux demi-billes identiques, écorce en bas, face plate en l'air, côte à côte ; la
//    demi-bille deux quartiers identiques, écorce en bas, pointe en l'air, côte à côte ; la perche deux palançons, le palançon deux
//    lattes (chaque diamètre, chaque règle de `split` de wood.json) ; dans les deux sens, centrés sur la pièce fendue, à un pas l'un
//    de l'autre.
// 3. Règle D : chaque aspect (le quartier pointe en l'air et pointe en bas), à plusieurs longueurs, nord-sud = est-ouest inversé, à
//    1 px près.
// Usage : npm run test:sections (lancé aussi par npm run test).

import assert from 'node:assert/strict';
import { world } from '../art/palette';
import { composeWood } from '../art/world/wood-pieces';
import { lyingView, sectionGeom } from '../art/world/wood-section';
import { silhouette } from '../src/content/gabarit';
import type { PileWood, WoodLook, WoodPiece } from '../src/content/types';
import { drawOrder, shapeOf } from '../src/world/pileShape';
import { woodPileDef } from '../src/world/woodPile';
import { lengthPx, lookOf, shapeOfLook, splitPieces, WOOD, woodBody, woodSize } from '../src/world/woodShape';

/** Les quatre états que Grégoire juge : le rondin, la demi-bille, le quartier, la poutre. */
const STATES: PileWood[] = [
  { size: 'normal', shape: 'round', length: 100 },
  { size: 'big', shape: 'half', length: 60 },
  { size: 'big', shape: 'quarter', length: 100 },
  { size: 'normal', shape: 'round', length: 180, hewn: 12 },
  { size: 'pole', shape: 'half', length: 200 },
  { size: 'pole', shape: 'lath', length: 200 },
];

/** Une pièce posée dans un repère commun : coin bas gauche (x, y) et sa couche. */
interface Laid { id: string; piece: WoodPiece; x: number; y: number; layer: number }

/** Les pixels visibles de chaque pièce, dessinées dans l'ordre : (id, flanc ?) par pixel ; l'ombre (`x`) ne cache rien. */
function composite(laid: Laid[]): Map<string, { id: string; flank: boolean }> {
  const seen = new Map<string, { id: string; flank: boolean }>();
  for (const l of laid) {
    const { w, h } = woodSize(l.piece.size, lookOf(l.piece), l.piece.axis, l.piece.length);
    const v = lyingView(l.piece.size, lookOf(l.piece), l.piece.axis as 'ew' | 'ns', l.piece.axis === 'ew' ? w : h, 0, l.piece.point);
    const g = v.c.toGrid();
    g.forEach((row, Y) => [...row].forEach((q, X) => {
      if (q === '.' || q === 'x') return;
      const up = v.up[Y][X];
      seen.set(`${l.x + X},${l.y - g.length + Y}`, { id: l.id, flank: !Number.isNaN(up) && up <= 0.05 });
    }));
  }
  return seen;
}

/** Les pièces qui ont devant elles (plus au sud) une pièce de leur couche, est-ouest. */
function behind(laid: Laid[]): Set<string> {
  return new Set(laid.filter((a) => laid.some((b) => b !== a && b.layer === a.layer && b.y > a.y)).map((a) => a.id));
}

let checks = 0;

// ---------- 1. Recouvrement ----------
for (const w of STATES) {
  const what = `${w.size} ${lookOf(w)} ${w.length} cm`;
  const def = woodPileDef(w);
  for (const turned of [false, true]) {
    const s = shapeOf(def, turned);
    const o = drawOrder(s, Object.keys(s.places));
    const layers = o.map((id) => s.places[id].layer);
    assert.deepEqual(layers, [...layers].sort((a, b) => a - b), `${what}${turned ? ' nord-sud' : ''} : le tas s'affiche couche par couche`);
    for (let i = 1; i < o.length; i++) {
      const [a, b] = [s.places[o[i - 1]], s.places[o[i]]];
      if (a.layer === b.layer) assert.ok(a.y < b.y || (a.y === b.y && a.x <= b.x), `${what}${turned ? ' nord-sud' : ''} : dans une couche, de l'arrière (de l'ouest) vers l'avant`);
    }
  }
  // le tas plein, est-ouest
  const shape = shapeOf(def, false);
  const order = drawOrder(shape, Object.keys(shape.places));
  const pile: Laid[] = order.map((id) => ({ id, piece: shape.places[id].wood!, x: shape.places[id].x, y: shape.places[id].y, layer: shape.places[id].layer }));
  // trois pièces posées seules, l'une derrière l'autre, au pas d'un tas
  const piece: WoodPiece = { ...w, axis: 'ew' };
  const step = woodBody(w.size, lookOf(piece), 'ew', w.length).h + 1;
  const row: Laid[] = [0, 1, 2].map((i) => ({ id: `r${i}`, piece, x: 0, y: -(2 - i) * step, layer: 0 }));
  for (const [name, laid] of [['tas', pile], ['rangée', row]] as const) {
    const seen = composite(laid);
    const hidden = behind(laid);
    const shown = [...seen.values()].filter((p) => hidden.has(p.id) && p.flank);
    assert.equal(shown.length, 0, `${what}, ${name} est-ouest : le flanc d'une pièce cachée se voit (${shown.length} px, pièces ${[...new Set(shown.map((p) => p.id))].join(', ')})`);
    checks++;
  }
}

// ---------- 2. Positions après la coupe ----------
const SPLITS = Object.entries(WOOD.sizes).flatMap(([size, def]) => Object.entries(def.split).map(([from, rule]) => ({ size, from: from as 'round' | 'half', into: rule!.into })));
assert.ok(SPLITS.some((r) => r.size === 'pole' && r.into === 'lath'), 'la perche se fend en palançons, le palançon en lattes');
for (const axis of ['ew', 'ns'] as const) {
  for (const { size, from, into } of SPLITS) {
    const piece: WoodPiece = { size, shape: from, length: 100, axis };
    const out = splitPieces(piece);
    const what = `${size} ${from} ${axis}`;
    assert.equal(out.length, 2, `${what} : deux morceaux`);
    assert.deepEqual(out[0].piece, out[1].piece, `${what} : deux morceaux identiques, dans le même sens`);
    assert.deepEqual(out[0].piece, { size, length: 100, axis, shape: into }, `${what} : ${into}, dans sa position de section (sans pointe en bas)`);
    // les collisions au sol des deux morceaux : côte à côte en travers, à un pas, centrées sur la pièce fendue
    const look = lookOf(out[0].piece);
    const box = (p: WoodPiece, dx: number, dy: number) => {
      const { w } = woodSize(p.size, lookOf(p), p.axis, p.length);
      const b = woodBody(p.size, lookOf(p), p.axis, p.length);
      return { cx: dx + (w - b.w) / 2 + b.w / 2, cy: dy - b.bottom - b.h / 2 };
    };
    const whole = box(piece, 0, 0);
    const [a, b] = out.map((o) => box(o.piece, o.dx, o.dy));
    const across = axis === 'ew' ? Math.abs(a.cy - b.cy) : Math.abs(a.cx - b.cx);
    const along = axis === 'ew' ? Math.abs(a.cx - b.cx) : Math.abs(a.cy - b.cy);
    const pitch = woodBody(size, look, 'ew', 100).h + 1;
    assert.ok(Math.abs(across - pitch) <= 1, `${what} : les deux ${into} côte à côte, à un pas (${across} px, pas ${pitch})`);
    assert.ok(along <= 1, `${what} : les deux ${into} à la même hauteur le long de la pièce`);
    const mid = axis === 'ew' ? (a.cy + b.cy) / 2 - whole.cy : (a.cx + b.cx) / 2 - whole.cx;
    assert.ok(Math.abs(mid) <= 1, `${what} : les deux ${into} centrés sur la pièce fendue (écart ${mid} px)`);
    checks++;
  }
}
// la section : la demi-bille, écorce en bas, face plate en l'air ; le quartier, écorce en bas, pointe (le cœur) en l'air
{
  const half = sectionGeom('big', 'half');
  assert.ok(half.planes.some((p) => p.n[1] === 1 && Math.abs(p.d - half.zmax) < 1e-6), 'demi-bille : la face plate en l\'air');
  assert.ok(half.disk && half.disk.c[1] - half.disk.r <= 1e-6, 'demi-bille : l\'écorce touche le sol');
  const q = sectionGeom('big', 'quarter');
  assert.ok(Math.abs(q.heart[1] - q.zmax) < 1e-6, 'quartier : la pointe (le cœur) en l\'air');
  assert.ok(q.disk && Math.abs(q.disk.c[1] - q.disk.r) < 1e-6, 'quartier : l\'écorce en bas, sur le sol');
  const down = sectionGeom('big', 'quarter', 'down');
  assert.ok(Math.abs(down.heart[1]) < 1e-6, 'quartier pointe en bas : le cœur au sol, l\'écorce en l\'air');
  // vue nord-sud, la face de coupe au sud : la pointe en haut, plus étroite que le bas
  const v = lyingView('big', 'quarter', 'ns', 30);
  const ends = v.roles.map((r) => r.filter((c) => c === 'e').length).filter((n) => n > 0);
  assert.ok(ends[0] < ends[ends.length - 1], `quartier nord-sud : le bout coupé montre la pointe en haut (${ends.join(' ')})`);
  checks++;
}

// ---------- 3. Règle D ----------
for (const [size, def] of Object.entries(WOOD.sizes)) {
  for (const look of Object.keys(def.looks) as WoodLook[]) {
    const hewn = (['round', 'f1', 'f2', 'f3', 'beam'] as const).indexOf(look as 'round') * WOOD.hew.perFace;
    for (const point of look === 'quarter' ? [undefined, 'down' as const] : [undefined]) {
      for (const length of [60, 100, 300]) {
        const base: WoodPiece = { size, length, shape: shapeOfLook(look), axis: 'ew', ...(hewn > 0 ? { hewn } : {}), ...(point ? { point } : {}) };
        const ew = silhouette(composeWood(base).toGrid(), world);
        const ns = silhouette(composeWood({ ...base, axis: 'ns' }).toGrid(), world);
        const what = `${size} ${look}${point ? ' pointe en bas' : ''} ${length} cm`;
        assert.ok(Math.abs(ns.w - ew.h) <= 1 && Math.abs(ns.h - ew.w) <= 1, `${what} : nord-sud ${ns.w} × ${ns.h}, attendu ${ew.h} × ${ew.w} (règle D)`);
        assert.ok(Math.abs(ew.w - lengthPx(length)) <= 1, `${what} : est-ouest de ${ew.w} px pour ${lengthPx(length)}`);
        checks++;
      }
    }
  }
}

console.log(`✓ pièces fendues : recouvrement des tas et des rangées, positions après la coupe, règle D (${checks} contrôles)`);
