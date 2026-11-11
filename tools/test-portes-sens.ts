// Le sens des portes d'entrée (chantier « corrections », DIAGNOSTIC.md 2.4), sans navigateur : dans chaque plan du dépôt
// (src/content/plans/), chaque porte d'entrée d'un bâtiment (une porte qu'on passe, entre une pièce close et le dehors) s'ouvre vers
// l'intérieur, comme une vraie porte d'entrée : ouverte, elle ne dépasse jamais la face du dehors de sa place fermée (la porte en arc
// du coq s'ouvrait vers le dehors et se voyait comme un poteau devant la façade). La porte charretière à deux battants de la grange
// (`hinge: double`) s'ouvre vers le dehors, comme celles des granges : elle est dite, pas refusée. Ouvrir puis refermer redonne la porte.
// Usage : npx tsx tools/test-portes-sens.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { props } from '../src/content';
import type { BuildPlan } from '../src/content/types';
import { boxOf, OUTWARD, planPieces, swung, type BuildPiece } from '../src/world/build';
import { buildingsOf } from '../src/world/interior';

const dir = 'src/content/plans';
let doors = 0;
const outward: string[] = [];
for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
  const plan = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as BuildPlan;
  const pieces: BuildPiece[] = planPieces(plan, { x: 0, y: 0, z: 0 }).map((p, i) => ({ ...p, id: i + 1 }));
  const byId = new Map(pieces.map((p) => [p.id, p]));
  for (const b of buildingsOf(pieces)) {
    for (const e of b.entrances) {
      if (e.door === undefined) continue;
      const p = byId.get(e.door)!;
      const key = 'prop' in p.piece ? p.piece.prop : '?';
      const s = props[key]?.swing;
      if (!s) continue;
      // la porte fermée (si le plan la pose ouverte, on la referme d'abord)
      const closed = s.open ? { ...swung(p)!, id: p.id } : p;
      const open = swung(closed)!;
      assert.ok(open, `${f} : ${key} s'ouvre`);
      const back = swung(open);
      assert.deepEqual({ x: back?.x, y: back?.y, view: back?.view }, { x: closed.x, y: closed.y, view: closed.view }, `${f} : ${key} ouverte puis refermée revient à sa place`);
      const c = boxOf(closed);
      const o = boxOf(open);
      // la face du dehors de la porte fermée, du côté de l'entrée (le dehors du bâtiment)
      const beyond = e.side === 'south' ? o.y + o.d > c.y + c.d : e.side === 'north' ? o.y < c.y : e.side === 'east' ? o.x + o.w > c.x + c.w : o.x < c.x;
      const name = `${f} : ${'prop' in closed.piece ? closed.piece.prop : '?'} (mur ${e.side}, vue ${closed.view})`;
      doors++;
      if (s.hinge === 'double') {
        console.log(`  · ${name} : porte charretière à deux battants, ouverte vers le dehors (comme celles des granges)`);
        continue;
      }
      if (beyond) outward.push(name);
      // sa vue : le dehors de la porte est le dehors du bâtiment (sa face du dehors dessinée vers la rue)
      const [ox, oy] = OUTWARD[closed.view % 4];
      const side = ox ? (ox > 0 ? 'east' : 'west') : oy > 0 ? 'south' : 'north';
      assert.equal(side, e.side, `${name} : la face du dehors de la porte regarde le dehors du bâtiment`);
    }
  }
}
assert.deepEqual(outward, [], `des portes d'entrée s'ouvrent vers le dehors :\n  ${outward.join('\n  ')}`);
// la cabane, la grange, la maison de Xéros, la maison du coq (la forge et l'étal n'ont pas de porte)
assert.ok(doors >= 4, `les portes d'entrée des plans (${doors})`);
console.log(`✓ portes : les ${doors} portes d'entrée des plans s'ouvrent vers l'intérieur et se referment à leur place`);
