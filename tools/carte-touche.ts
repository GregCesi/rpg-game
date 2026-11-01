// Carte de touche (npx tsx tools/carte-touche.ts [fichier] -> .art-preview/carte-touche.png) : où chaque coup touche, vu du dessus,
// au sol. Pour chaque arme et chaque geste (rangées : épée taille, épée coup vertical, branche taille, branche coup vertical, poing
// direct droit, poing direct gauche) et chaque direction (colonnes : bas, haut, droite, gauche), Xéros au centre (le carré sombre,
// le trait clair : où il regarde), une grille de cases de 10 cm sur ± 2 m ; la cible (le mannequin, son emprise au sol posée sur la
// case) est essayée sur chaque case, le coup joué sans écart de précision ; une case touchée prend la couleur de la première image
// active qui la touche : rouge la 1re, orange la 2e, jaune la 3e (la taille et le coup vertical : la frappe en deux images, puis le
// début de la suite). Les traits gris : tous les 50 cm. Rien n'est lancé : la zone au sol de world/strike.ts, comme le jeu
// (systems/combat.ts). Elle se refait par npm run art:preview.

import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { combat, items, props } from '../src/content';
import { itemMass } from '../src/content/mass';
import type { Facing, Weapon } from '../src/content/types';
import { firstHit, footprint } from '../src/world/strike';

const OUT = process.argv[2] ?? '.art-preview/carte-touche.png';
const CELL_CM = 10;
const HALF = 20; // cases de chaque côté : ± 2 m
const PX = 4; // pixels par case dans l'image
const SIDE = HALF * 2 * PX;
const GAP = 12;
const DIRS: Facing[] = ['down', 'up', 'right', 'left'];
const COLORS: [number, number, number][] = [[214, 64, 42], [236, 150, 40], [240, 220, 70], [120, 200, 90]];
const dummy = props['training-dummy'];

const rows: { weapon: Weapon; kg: number; gesture: string; hand: 'right' | 'left' }[] = [
  { weapon: items['wooden-sword'].weapon!, kg: itemMass('wooden-sword'), gesture: 'cut', hand: 'right' },
  { weapon: items['wooden-sword'].weapon!, kg: itemMass('wooden-sword'), gesture: 'overhead', hand: 'right' },
  { weapon: items.branch.weapon!, kg: itemMass('branch'), gesture: 'cut', hand: 'right' },
  { weapon: items.branch.weapon!, kg: itemMass('branch'), gesture: 'overhead', hand: 'right' },
  { weapon: combat.unarmed, kg: combat.unarmed.mass, gesture: 'jab-right', hand: 'right' },
  { weapon: combat.unarmed, kg: combat.unarmed.mass, gesture: 'jab-left', hand: 'left' },
];

/** Le rang de la première image active qui touche la cible posée sur la case (i, j), ou −1 : la zone au sol de world/strike.ts. */
function touch(weapon: Weapon, gesture: string, facing: Facing, i: number, j: number): number {
  // le centre de la case, en px du jeu (5 cm par px) ; l'emprise du mannequin centrée dessus, son bord sud à sa base
  const cx = ((i + 0.5) * CELL_CM) / 5;
  const cy = ((j + 0.5) * CELL_CM) / 5;
  const box = footprint(dummy.dims, cx, cy + dummy.dims.d / 5 / 2);
  const sweep = combat.sweeps[gesture];
  return sweep.active.indexOf(firstHit(sweep, weapon, facing, { x: 0, y: 0 }, box));
}

const W = DIRS.length * (SIDE + GAP) + GAP;
const H = rows.length * (SIDE + GAP) + GAP;
const out = new PNG({ width: W, height: H });
const put = (x: number, y: number, [r, g, b]: [number, number, number]) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const k = (y * W + x) * 4;
  out.data[k] = r;
  out.data[k + 1] = g;
  out.data[k + 2] = b;
  out.data[k + 3] = 255;
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, [40, 44, 30]);
rows.forEach((row, ri) => {
  DIRS.forEach((dir, di) => {
    const ox = GAP + di * (SIDE + GAP);
    const oy = GAP + ri * (SIDE + GAP);
    for (let j = -HALF; j < HALF; j++) {
      for (let i = -HALF; i < HALF; i++) {
        const k = touch(row.weapon, row.gesture, dir, i, j);
        const grid = (i * CELL_CM) % 50 === 0 || (j * CELL_CM) % 50 === 0;
        const c: [number, number, number] = k >= 0 ? COLORS[Math.min(k, COLORS.length - 1)] : grid ? [86, 96, 64] : [104, 120, 70];
        for (let v = 0; v < PX; v++) for (let u = 0; u < PX; u++) put(ox + (i + HALF) * PX + u, oy + (j + HALF) * PX + v, c);
      }
    }
    // Xéros au centre (ses pieds), et un trait vers où il regarde
    const mx = ox + HALF * PX;
    const my = oy + HALF * PX;
    for (let v = -3; v < 3; v++) for (let u = -3; u < 3; u++) put(mx + u, my + v, [30, 20, 14]);
    const d = { down: [0, 1], up: [0, -1], right: [1, 0], left: [-1, 0] }[dir];
    for (let t = 4; t < 14; t++) put(mx + d[0] * t, my + d[1] * t, [240, 232, 210]);
  });
});
writeFileSync(OUT, PNG.sync.write(out));
console.log(`carte de touche : ${OUT} (${W} × ${H})`);
