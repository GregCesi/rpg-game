// Planche des deux corrections de Grégoire (4 novembre) sur les dessins définitifs du chemin creux (chantier « relief », hors jeu) :
//   npx tsx tools/essai-relief-final-corrections.ts  ->  .art-preview/relief-final-7-corrections.png
//   1. côté ferme (cases 47 à 60), le flanc extérieur des talus redevient un talus planté (relief-face-planted, le passage
//      relief-face-planted-edge sur les 3,2 premiers mètres de la rive est) ;
//   2. le sol du couloir reste clair dans la pénombre (tuiles lane éclaircies, FLOOR_GLOOM).
// Chaque fois « avant » (l'état validé, figé dans art/proposals/relief-final-v1*.ts) à gauche, « après » à droite, x2, Xéros pour
// l'échelle ; la teinte moyenne du sol du couloir sous Xéros, avant et après.

import * as v1 from '../art/proposals/relief-final-v1-scene';
import { FLOOR_GLOOM } from '../art/proposals/relief-final';
import * as fin from '../art/proposals/relief-final-scene';
import { Sheet, type Rgb } from './lib/audit-preview';
import { BG, copy, save, scene, shot, VH, VW, type Layer, type Scene } from './lib/relief-final-shot';

const { OY, W, XR, Z, T } = fin;
const GREY: Rgb = [215, 215, 200];
const GOLD: Rgb = [245, 215, 120];
const K = 2;
const PAD = 24;
const GAP = 40;

const BEFORE: Scene = scene('avant', v1);
const AFTER: Scene = scene('apres', fin, FLOOR_GLOOM);

interface Row { title: string; pose: fin.Pose; cx: number; cy?: number; dy: number; floor: boolean; notes: string[] }
const ROWS: Row[] = [
  {
    title: '1 - cote ferme, cases 47 a 60 : le flanc exterieur du talus sud', pose: { key: 'xeros-up', x: 1690, dy: 196, label: '' }, cx: 1700, dy: -110, floor: false,
    notes: [
      'avant : relief-face-earth (terre sombre, racines, lierre) sur tout le flanc exterieur',
      `apres : relief-face-planted (herbe, broussailles, terre nue) ; le passage relief-face-planted-edge sur les 64 px (3,2 m) a l est de la rive (case ${XR / T}) ; lu par la distance a l ecran au-dessus du pied`,
      'la paroi interieure, le flanc au-dessus de l eau et la falaise gardent la terre sombre',
    ],
  },
  {
    title: '2 - dans le couloir, case 51 (sous la voute)', pose: { key: 'xeros-left', x: 1640, label: '' }, cx: 1640, dy: -20, floor: true,
    notes: [`apres : tuiles lane eclaircies (calcaire presque blanc), et le sol ne recoit que ${FLOOR_GLOOM} de la penombre (FLOOR_GLOOM) ; parois et xeros inchanges`],
  },
  {
    title: '3 - dans le couloir, case 44,5 (au-dessus de la riviere, penombre entiere)', pose: { key: 'xeros-left', x: Math.round(44.5 * 32), label: '' }, cx: Math.round(44.5 * 32), dy: -16, floor: true,
    notes: [],
  },
];

/** La teinte moyenne du sol clair du couloir visible dans le cadre (pixels du sol, ni feuillage ni Xéros). */
function floorMean(sc: Scene, lay: Layer, x0: number, y0: number, pale = false): Rgb {
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = Math.max(0, y0); y < y0 + VH; y++) for (let x = Math.max(0, x0); x < Math.min(W, x0 + VW); x++) {
    const k = y * W + x;
    // le sol vu : celui du rendu complet, ou celui qu'on voit à travers le bord sud effacé (le rendu sans bord sud)
    if (y >= lay.sheet.h || (sc.fullR.zone[k] !== Z.FLOOR && sc.cutR.zone[k] !== Z.FLOOR) || lay.veg[k] || x < 5 * T || x >= 60 * T) continue;
    // le calcaire seul (sans la frange de terre brune des bords)
    const ch = sc.fullR.zone[k] === Z.FLOOR ? sc.fullR.grid[y][x] : sc.cutR.grid[y][x];
    if (pale && !'+!=;#'.includes(ch)) continue;
    const o = k * 4;
    for (let i = 0; i < 3; i++) sum[i] += lay.sheet.png.data[o + i];
    n++;
  }
  return sum.map((v) => Math.round(v / Math.max(1, n))) as Rgb;
}
const hex = (c: Rgb) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
const lum = (c: Rgb) => Math.round(0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]);

const top0 = 70;
const rowH = VH * K + 60 + 3 * 16;
const sheet = new Sheet(PAD * 2 + VW * K * 2 + GAP, top0 + ROWS.length * rowH + 40, BG);
sheet.text('7 - les deux corrections : avant (valide) a gauche, apres a droite, x2', PAD, 16, GOLD, 4);
sheet.text('ecran de jeu 427 X 240 PX (21 X 12 M) ; xeros pour l echelle', PAD, 46, GREY, 2);
const report: string[] = [];
ROWS.forEach((row, i) => {
  const yy = top0 + i * rowH;
  sheet.text(row.title, PAD, yy, GOLD, 2);
  [BEFORE, AFTER].forEach((sc, j) => {
    const lay = shot(sc, [row.pose]);
    const xp = sc.mod.xerosAt(sc.full, row.pose);
    const x0 = Math.round(row.cx - VW / 2);
    const y0 = Math.round(xp.y - xp.z + OY + row.dy - VH / 2);
    const dx = PAD + j * (VW * K + GAP);
    copy(lay.sheet, x0, y0, VW, VH, sheet, dx, yy + 20, K);
    let tag = j ? 'APRES' : 'AVANT';
    if (row.floor) {
      const m = floorMean(sc, lay, x0, y0);
      const p = floorMean(sc, lay, x0, y0, true);
      tag += ` - sol ${hex(m)} (lum. ${lum(m)}), calcaire seul ${hex(p)} (lum. ${lum(p)})`;
      report.push(`${row.title.slice(0, 40)} ${j ? 'apres' : 'avant'} : sol ${hex(m)} lum ${lum(m)} ; calcaire seul ${hex(p)} lum ${lum(p)}`);
    }
    sheet.rect(dx, yy + 20, textW(tag) + 12, 22, BG);
    sheet.text(tag, dx + 6, yy + 25, GOLD, 2);
  });
  row.notes.forEach((l, k) => sheet.text(l, PAD, yy + 20 + VH * K + 10 + k * 16, GREY, 2));
});
function textW(s: string) { return s.length * 8; }
console.log(report.join('\n'));
save(sheet, 'relief-final-7-corrections.png', 'essai-relief-final-corrections');
