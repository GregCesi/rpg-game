// Chantier « hauteurs » (CADRAGE-hauteurs.md) : recalage des cinq plans du monde sur la hauteur vraie de la pièce de bois couchée
// (sa section, sans les 10 cm du contour de son dessin). Script d'un seul usage, rangé dans .poubelle/ après usage.
//
//   npx tsx tools/recale-hauteurs.ts            essai : les plans recalés dans .art-preview/hauteurs/<plan>.json, et le rapport
//   npx tsx tools/recale-hauteurs.ts --write    les plans recalés écrits dans src/content/plans/
//
// À lancer AVANT le changement du moteur : la hauteur d'avant est celle de boxOf (contour compris), la nouvelle en retire le contour.
//
// - la forge, la grange, l'étal, la maison : chaque pièce descend sur le nouveau dessus de ce qui la portait (le plus haut, s'il y en
//   a plusieurs) ; une encoche garde sa règle (le rondin du dessus s'enfonce de la moitié de la hauteur de celui du dessous) ; la
//   maison : son solin passe de 40 à 50 cm (proposition du cadrage), si bien que tout ce qui est au-dessus de la traverse basse reste
//   à sa hauteur ;
// - la cabane : remontée d'après la même géométrie que tools/test-cabane.ts, à 30 cm par rondin (7 assises au lieu de 5, la même
//   hauteur de mur, 2,52 m), la porte de 2,10 m, la fenêtre sur deux assises.
//
// Le rapport dit chaque « jour » : une pièce dont un appui d'avant n'est plus sous elle après (un vide entre les deux).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { BuildPlaced, BuildPlan } from '../src/content/types';
import { overlaps, solidOf } from '../src/world/build';
import { CONTOUR_CM } from '../src/content/gabarit';

const WRITE = process.argv.includes('--write');
/** Les hauteurs nouvelles des objets de props.json que le cadrage change (cm). */
const PROP_H: Record<string, number> = { 'rough-sill-wall': 50, 'narrow-sill-wall': 50, 'plank-door': 210 };

const lying = (p: BuildPlaced) => 'wood' in p.piece && p.piece.wood.axis !== 'up';
const hOld = (p: BuildPlaced) => solidOf(p).h;
const hNew = (p: BuildPlaced) => ('prop' in p.piece && PROP_H[p.piece.prop]) || hOld(p) - (lying(p) ? CONTOUR_CM : 0);
const label = (p: BuildPlaced) => ('wood' in p.piece ? `bois ${p.piece.wood.axis} L${p.piece.wood.length}${p.piece.wood.hewn ? ' (poutre)' : ''}` : p.piece.prop);

/** La descente : chaque pièce sur le nouveau dessus de ses appuis d'avant. */
function settle(plan: BuildPlan, name: string, report: string[]): BuildPlan {
  const ps = plan.pieces;
  const notch = new Set((plan.joints ?? []).filter((j) => j.type === 'notch').map((j) => `${Math.min(j.a, j.b)}-${Math.max(j.a, j.b)}`));
  const z = new Map<number, number>();
  const order = ps.map((_, i) => i).sort((a, b) => ps[a].z - ps[b].z);
  for (const i of order) {
    const p = ps[i];
    const tops: { v: number; j: number }[] = [];
    ps.forEach((s, j) => {
      if (j === i || !z.has(j) || !overlaps(solidOf(s), solidOf(p))) return;
      if (s.z + hOld(s) === p.z) tops.push({ v: z.get(j)! + hNew(s), j });
      else if (notch.has(`${Math.min(i, j)}-${Math.max(i, j)}`) && s.z < p.z && s.z + hOld(s) / 2 === p.z) tops.push({ v: z.get(j)! + hNew(s) / 2, j });
    });
    const at = tops.length ? Math.max(...tops.map((t) => t.v)) : p.z;
    z.set(i, at);
    const low = tops.filter((t) => t.v < at);
    if (low.length) report.push(`${name} #${i} ${label(p)} (z ${p.z} → ${at}) : un jour au-dessus de ${low.map((t) => `#${t.j} ${label(ps[t.j])} (${at - t.v} cm)`).join(', ')}`);
  }
  // l'ordre des pièces d'un plan enregistré : par hauteur, puis y, puis x (les assemblages suivent les indices)
  const moved = ps.map((p, i) => ({ p: { ...p, z: z.get(i)! }, i }));
  const sorted = [...moved].sort((a, b) => a.p.z - b.p.z || a.p.y - b.p.y || a.p.x - b.p.x || a.i - b.i);
  const index = new Map(sorted.map((s, k) => [s.i, k]));
  const joints = (plan.joints ?? []).map((j) => ({ ...j, a: index.get(j.a)!, b: index.get(j.b)!, ...(j.top !== undefined ? { top: index.get(j.top)! } : {}) }));
  const n = moved.filter((m) => m.p.z !== ps[m.i].z).length;
  report.push(`${name} : ${ps.length} pièces, ${n} changent de hauteur`);
  return { ...plan, ...(joints.length ? { joints } : {}), pieces: sorted.map((s) => s.p) };
}

/** La cabane remontée à 30 cm par rondin, comme tools/test-cabane.ts la bâtit (y du plan = y du scénario + 20). */
function cabin(old: BuildPlan): BuildPlan {
  const out: BuildPlaced[] = [];
  const joints: [BuildPlaced, BuildPlaced][] = [];
  const log = (axis: 'ew' | 'ns', length: number, x: number, y: number, z: number): BuildPlaced => {
    const p: BuildPlaced = { piece: { wood: { size: 'normal', length, shape: 'round', peeled: true, axis } }, x, y: y + 20, z, view: 0 };
    out.push(p);
    return p;
  };
  const prop = (key: string, x: number, y: number, z: number, view = 0, natural = false): BuildPlaced => {
    const p: BuildPlaced = { piece: { prop: key }, x, y: y + 20, z, view, ...(natural ? { natural: { form: 0, size: 100 } } : {}) };
    out.push(p);
    return p;
  };
  const R = 30; // un rondin du normal, sa hauteur vraie
  const EW = (k: number) => 12 + R * k;
  const NS = (k: number) => 12 + R / 2 + R * k;
  const COURSES = 7;
  const WINDOW = [3, 4];
  for (const [x, y] of [[20, 20], [320, 20], [20, 380], [320, 380], [80, 380], [260, 380]]) prop('slab', x, y, 0, 0, true);
  let west: BuildPlaced | undefined;
  let east: BuildPlaced[] = [];
  for (let k = 0; k < COURSES; k++) {
    const north = log('ew', 380, 0, 20, EW(k));
    const southL = log('ew', 140, 0, 380, EW(k));
    const southR = log('ew', 140, 240, 380, EW(k));
    if (west) joints.push([north, west], [north, east[0]], [southL, west], [southR, east.at(-1)!]);
    west = log('ns', 440, 20, 0, NS(k));
    if (WINDOW.includes(k)) {
      east = [log('ns', 180, 320, 0, NS(k)), log('ns', 200, 320, 240, NS(k))];
      if (k === WINDOW[0]) prop('plank-shutter', 340, 180, NS(k), 3);
    } else east = [log('ns', 440, 320, 0, NS(k))];
    joints.push([west, north], [west, southL], [east[0], north], [east.at(-1)!, southR]);
  }
  for (const x of [195, 140]) prop('slab', x, 380, 0, 0, true);
  prop('plank-door', 140, 400, 12);
  for (const y of [20, 380]) {
    const top = log('ew', 380, 0, y, EW(COURSES));
    joints.push([top, west!], [top, east[0]]);
  }
  const wall = EW(COURSES) + R;
  prop('plank-roof', 0, -20, wall, 1);
  prop('plank-roof', 180, -20, wall, 3);
  prop('plank-gable', 60, 40, wall, 2);
  prop('plank-gable', 60, 400, wall, 0);
  log('ns', 440, 185, 0, wall + 60);
  const sorted = out.map((p, i) => ({ p, i })).sort((a, b) => a.p.z - b.p.z || a.p.y - b.p.y || a.p.x - b.p.x || a.i - b.i);
  const index = new Map(sorted.map((s, k) => [s.p, k]));
  const js = joints.map(([u, v]) => {
    const [a, b] = [index.get(u)!, index.get(v)!].sort((m, n) => m - n);
    return { type: 'notch' as const, a, b, top: u.z > v.z ? index.get(u)! : index.get(v)! };
  });
  return { ...old, joints: js, pieces: sorted.map((s) => s.p) };
}

const report: string[] = [];
const outDir = WRITE ? 'src/content/plans' : '.art-preview/hauteurs';
mkdirSync(outDir, { recursive: true });
for (const name of ['cabane', 'maison-xeros', 'forge', 'grange', 'etal']) {
  const plan = JSON.parse(readFileSync(`src/content/plans/${name}.json`, 'utf8')) as BuildPlan;
  const next = name === 'cabane' ? cabin(plan) : settle(plan, name, report);
  if (name === 'cabane') report.push(`cabane : remontée, ${plan.pieces.length} → ${next.pieces.length} pièces, ${next.joints?.length} encoches`);
  writeFileSync(`${outDir}/${name}.json`, `${JSON.stringify(next, null, 2)}\n`);
  if (!WRITE) writeFileSync(`${outDir}/${name}-avant.json`, `${JSON.stringify(plan, null, 2)}\n`);
}
console.log(report.join('\n'));
console.log(`→ ${outDir}/`);
