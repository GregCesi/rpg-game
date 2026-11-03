// Le passage d'une zone à sa voisine (src/systems/zones.ts, src/world/zones.ts), sans navigateur : Xéros marche droit vers chacun des
// quatre côtés d'une zone ouverte partout, avec les vraies bornes de marche (`walkBounds`) et le vrai corps de ses pieds (FEET de
// config.ts : la boîte `w` × `h`, son bas `gap` au-dessus des pieds, comme Actor), retenu par les bornes comme le fait la physique. Il
// doit passer de chaque côté, arriver dans la voisine au même point du monde, et ne pas repasser aussitôt dans l'autre sens.
// Usage : tsx tools/test-zones.ts (lancé par npm run test:fast, donc par npm run build).

import assert from 'node:assert/strict';
import { FEET, TILE } from '../src/config';
import { maps } from '../src/content';
import type { MapData } from '../src/content/types';
import { ZoneCrossing } from '../src/systems/zones';

type Side = 'north' | 'south' | 'east' | 'west';
const DIRS: Record<Side, [number, number]> = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };

// une zone ouverte des quatre côtés
const zone = Object.values(maps).find((m) => {
  const z = new ZoneCrossing(m);
  return z.isZone && z.open.north && z.open.south && z.open.east && z.open.west;
});
assert.ok(zone, 'une zone du monde ouverte des quatre côtés');

/** Le corps des pieds (Actor : `setSize(FEET.w, FEET.h)`, son bas `FEET.gap` au-dessus du point des pieds), retenu dans les bornes. */
function clampFeet(x: number, y: number, b: { x: number; y: number; w: number; h: number }): { x: number; y: number } {
  const left = Math.max(b.x, Math.min(b.x + b.w - FEET.w, x - FEET.w / 2));
  const top = Math.max(b.y, Math.min(b.y + b.h - FEET.h, y - FEET.gap - FEET.h));
  return { x: left + FEET.w / 2, y: top + FEET.h + FEET.gap };
}

const moving = (x: number, y: number) => ({ dir: { lengthSq: () => 1 }, actor: { x, y } }) as never;

/** Xéros marche d'un pixel par pas vers `side` depuis le milieu de la carte ; rend le passage (la voisine, l'arrivée, d'où) ou rien. */
function walk(map: MapData, side: Side): { map: MapData; x: number; y: number; from: { x: number; y: number } } | undefined {
  const z = new ZoneCrossing(map);
  const b = z.walkBounds;
  const [dx, dy] = DIRS[side];
  let p = { x: (map.width * TILE) / 2, y: (map.height * TILE) / 2 };
  for (let i = 0; i < map.width * TILE; i++) {
    const next = clampFeet(p.x + dx, p.y + dy, b);
    const moved = next.x !== p.x || next.y !== p.y;
    p = next;
    const c = z.update(moving(p.x, p.y));
    if (c) return { ...c, from: p };
    if (!moved) return undefined;
  }
  return undefined;
}

for (const side of Object.keys(DIRS) as Side[]) {
  const c = walk(zone, side);
  assert.ok(c, `${zone.id} : vers le ${side}, Xéros passe dans la voisine (il bute au bord)`);
  // les pieds au même point du monde
  assert.equal(zone.world!.x + c.from.x, c.map.world!.x + c.x, `${zone.id} -> ${c.map.id} : même x dans le monde`);
  assert.equal(zone.world!.y + c.from.y, c.map.world!.y + c.y, `${zone.id} -> ${c.map.id} : même y dans le monde`);
  // arrivé, il ne repasse pas aussitôt dans l'autre sens
  assert.equal(new ZoneCrossing(c.map).update(moving(c.x, c.y)), undefined, `${c.map.id} : arrivé par le ${side}, il ne repasse pas aussitôt`);
}
console.log(`✓ zones : de ${zone.id}, Xéros passe vers le nord, le sud, l'est et l'ouest (vraies bornes de marche, vrai corps des pieds), arrive au même point du monde et ne repasse pas aussitôt`);
