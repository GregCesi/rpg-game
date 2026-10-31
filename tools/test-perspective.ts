// Contrôle de la règle D (docs/STYLE.md section 8 : une pièce couchée tournée d'un quart de tour garde exactement sa taille), dans
// le vrai jeu (voir tools/lib/playtest.ts) : pour chaque pièce de bois de test (60 cm, 1 m, 4 m), de chaque diamètre et de chaque
// aspect (le quartier pointe en l'air et pointe en bas), l'image que le jeu assemble (world/woodTexture.ts, ombre exclue) et la collision
// de sa définition (world/woodPiece.ts) sont, en nord-sud, celles de l'est-ouest inversées, à 1 px près pour l'image, exactement
// pour la collision ; un tas nord-sud monte de la même hauteur par couche qu'est-ouest, ses pièces au même écart, chacune au même
// pas au-dessus de sa porteuse de devant (la 4e bille d'un tas de 3 couvre le quart haut de celle du centre).
// Usage : npm run test:perspective (lancé aussi par npm run test).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('perspective', async ({ page, errors }) => {
  const r = (await page.evaluate(async () => {
    const g = (window as any).game;
    const scene = g.scene.getScene('world');
    const texUrl = '/src/world/woodTexture.ts';
    const shapeUrl = '/src/world/woodShape.ts';
    const pieceUrl = '/src/world/woodPiece.ts';
    const pileUrl = '/src/world/woodPile.ts';
    const { woodTexture } = await import(texUrl);
    const { WOOD, turnedWood } = await import(shapeUrl);
    const { defOf } = await import(pieceUrl);
    const { woodPileDef } = await import(pileUrl);
    /** Le cadre des pixels opaques de l'image '0' d'une texture, l'ombre au sol (`x` de la palette, translucide) exclue. */
    const box = (key: string) => {
      const f = scene.textures.getFrame(key, '0');
      const c = document.createElement('canvas');
      c.width = f.cutWidth;
      c.height = f.cutHeight;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
      const px = ctx.getImageData(0, 0, c.width, c.height).data;
      let [x0, y0, x1, y1] = [Infinity, Infinity, -1, -1];
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        if (px[(y * c.width + x) * 4 + 3] < 255) continue;
        [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
      }
      return { w: x1 - x0 + 1, h: y1 - y0 + 1 };
    };
    const out: { what: string; ew: unknown; ns: unknown; ok: boolean }[] = [];
    for (const [size, def] of Object.entries<any>(WOOD.sizes)) {
      for (const look of Object.keys(def.looks)) {
        const shape = look === 'half' || look === 'quarter' ? look : 'round';
        const hewn = ['round', 'f1', 'f2', 'f3', 'beam'].indexOf(look) * WOOD.hew.perFace;
        const points = shape === 'quarter' ? [undefined, 'down'] : [undefined];
        for (const point of points) {
          for (const length of [60, 100, 400]) {
            const ew = { size, shape, axis: 'ew', length, ...(hewn > 0 ? { hewn } : {}), ...(point ? { point } : {}) };
            const ns = turnedWood(ew);
            const [ie, inn] = [box(woodTexture(scene, ew)), box(woodTexture(scene, ns))];
            const [be, bn] = [defOf('wood-piece', ew).body, defOf('wood-piece', ns).body];
            const what = `${size} ${look}${point ? ' pointe en bas' : ''} ${length} cm`;
            const imageOk = Math.abs(inn.w - ie.h) <= 1 && Math.abs(inn.h - ie.w) <= 1;
            const bodyOk = bn.w === be.h && bn.h === be.w;
            out.push({ what: `${what} image`, ew: ie, ns: inn, ok: imageOk });
            out.push({ what: `${what} collision`, ew: { w: be.w, h: be.h }, ns: { w: bn.w, h: bn.h }, ok: bodyOk });
          }
        }
      }
    }
    // les tas : même écart au sol, et toutes les pièces s'emboîtent avec le même pas dans les deux sens : chaque pièce d'une couche
    // monte de la même hauteur au-dessus de sa porteuse de devant (est-ouest, la plus au sud ; le demi-pas en arrière d'un creux
    // fait partie de la montée)
    const piles: { what: string; ok: boolean; detail: string }[] = [];
    for (const w of [
      { size: 'big', shape: 'round', length: 60 },
      { size: 'normal', shape: 'round', length: 100 },
      { size: 'big', shape: 'quarter', length: 100 },
      { size: 'big', shape: 'half', length: 60 },
      { size: 'normal', shape: 'round', length: 100, hewn: 12 },
    ]) {
      const d = woodPileDef(w);
      const [e, n] = [d.places, d.turned.places];
      const gap = (p: any) => Math.abs((p.g1.x - p.g0.x) || (p.g1.y - p.g0.y));
      const rise = (p: any, k: string) => -(p[k].y - Math.max(...p[k].on.map((o: string) => p[o].y)));
      const upper = Object.keys(e).filter((k) => e[k].layer > 0);
      const rises = upper.map((k) => [rise(e, k), rise(n, k)]);
      const all = rises.flat();
      const ok = gap(e) === gap(n) && Math.max(...all) - Math.min(...all) <= 1;
      piles.push({ what: `tas de ${w.size} ${w.shape} ${w.length} cm`, ok, detail: `écart ${gap(e)}/${gap(n)}, montées ${upper.map((k, i) => `${k} ${rises[i].join('/')}`).join(', ')}` });
    }
    // le cas de Grégoire : sur un tas de 3 rondins de 1 m de l'arbre normal, est-ouest, le bas de la 4e pièce (dans le creux de
    // derrière) arrive au quart de celle du centre : elle en couvre le quart haut
    {
      const w = { size: 'normal', shape: 'round', length: 100 };
      const e = woodPileDef(w).places;
      const band = box(woodTexture(scene, { ...w, axis: 'ew' })).h;
      const covered = e.u01.y - e.g1.y + band;
      piles.push({ what: '4e rondin de 1 m sur un tas de 3', ok: covered === Math.round(band / 4), detail: `couvre ${covered} px de la pièce du centre (${band} px de haut ; attendu le quart)` });
    }
    return { out, piles };
  })) as { out: { what: string; ew: unknown; ns: unknown; ok: boolean }[]; piles: { what: string; ok: boolean; detail: string }[] };
  for (const o of r.out) assert.ok(o.ok, `${o.what} : est-ouest ${JSON.stringify(o.ew)}, nord-sud ${JSON.stringify(o.ns)} (attendu inversé)`);
  for (const p of r.piles) assert.ok(p.ok, `${p.what} : ${p.detail} (est-ouest / nord-sud)`);
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  console.log(`  ✓ perspective : ${r.out.length / 2} pièces de bois, image et collision nord-sud = est-ouest inversées ; ${r.piles.length} tas, même écart et même montée`);
});
