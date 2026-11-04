// Planches des dessins définitifs du chemin creux (chantier « relief », hors jeu, à valider par Grégoire) :
//   npx tsx tools/essai-relief-final.ts  écrit
//   .art-preview/relief-final-1-matieres.png  chaque matière et objet seul (tools/essai-relief-final-matieres.ts) ;
//   .art-preview/relief-final-2-entree.png    l'entrée côté ferme ;
//   .art-preview/relief-final-3-couloir.png   Xéros dans le couloir avant la rivière (le bord sud s'efface à 0,2) ;
//   .art-preview/relief-final-4-coupure.png   Xéros au-dessus de la rivière, et le détail de la coupure sud ;
//   .art-preview/relief-final-5-falaise.png   la falaise le long de la rivière, face en raccourci, lierre, ombre ;
//   .art-preview/relief-final-6-voute.png     la voûte : l'essai 4 à gauche, les dessins définitifs à droite, même cadrage.
// Scène : art/proposals/relief-final-scene.ts (le terrain de l'essai 4, les matières définitives) ; dessins :
// art/proposals/relief-final.ts. Les arbres, buissons, fougères et Xéros sont ceux du jeu (src/generated/).

import './essai-relief-final-matieres';
import type { Rgb } from './lib/audit-preview';
import { Sheet } from './lib/audit-preview';
import * as old from '../art/proposals/relief-creux4-scene';
import { FLOOR_GLOOM } from '../art/proposals/relief-final';
import * as fin from '../art/proposals/relief-final-scene';
import { copy, FADE, save as saveAs, scene, shot, VH, VW, type Layer, type Scene } from './lib/relief-final-shot';

const { H, OY, SH, TOP, W, XC, XE, XT, Z, axisY, floorZ, wallZ } = fin;

const BG: Rgb = [40, 44, 36];
const GREY: Rgb = [215, 215, 200];
const GOLD: Rgb = [245, 215, 120];

// le sol du couloir ne reçoit que FLOOR_GLOOM de la pénombre (correction de Grégoire, 4 nov.)
const NEW: Scene = scene('final', fin, FLOOR_GLOOM);
const OLD: Scene = scene('essai4', old);
const save = (sheet: Sheet, name: string) => saveAs(sheet, name, 'essai-relief-final');
void SH;

// ---------- les vues, x2 et détail x4 ----------

interface View {
  file: string; title: string; pose?: fin.Pose; at?: [number, number]; dx: number; dy: number; detail: [number, number]; notes: string[];
  /** Un second détail x4 (la coupure sud), centré sur ce point de l'écran du monde. */
  cut?: boolean;
  /** Un Xéros posé pour l'échelle, hors du suivi de la caméra. */
  extra?: fin.Pose;
}
const DW = 212;
const DH = 106;
const K = 2;
const PAD = 24;
const VIEWS: View[] = [
  {
    file: 'relief-final-2-entree.png', title: '2 - l entree cote ferme', pose: { key: 'xeros-left', x: 1905, label: '' }, dx: -110, dy: -30, detail: [-60, -20],
    notes: [
      'xeros sur le chemin de la ferme, devant la bouche : le chemin (path) entre dans le sol clair par path-lane-w',
      'le rideau lane-curtain est pose sur le talus sud de l entree, a sa hauteur : il pend au-dessus de la bouche',
      'les talus plantes (bank) montent de 0 a 5 m vers l ouest ; leurs flancs vus du sud : relief-face-earth et sa levre',
      'aucun arbre penche : la voute, ce sont le rideau, les avancees et les arbres du jeu, debout',
    ],
  },
  {
    file: 'relief-final-3-couloir.png', title: '3 - dans le couloir, avant la riviere', pose: { key: 'xeros-left', x: 1640, label: '' }, dx: 0, dy: -20, detail: [0, 0],
    notes: [
      `xeros dans le couloir, case 51 : le bord sud et ce qui y est pose s effacent autour de lui (il en reste ${FADE})`,
      'au nord : la paroi (relief-face-earth, coupee par le haut selon sa hauteur) et sa levre (relief-lip)',
      'le sol : lane-14 en haut, lane-11 en bas (quatre variantes de chaque), pris par les deux bords de la bande de 2,5 m',
    ],
  },
  {
    file: 'relief-final-4-coupure.png', title: '4 - au-dessus de la riviere, dans le couloir', pose: { key: 'xeros-left', x: Math.round(44.5 * 32), label: '' }, dx: 0, dy: -16, detail: [0, 10], cut: true,
    notes: [
      'xeros case 44,5, sous la riviere : sol a 0 m entre les talus de 5 m. le bord sud s efface',
      'en bas : la coupure sud. le flanc exterieur du talus au-dessus de l eau (relief-face-wet : lierre jusqu a l eau, pied mouille),',
      'le lisere water-cut contre son pied, puis le miroitement shimmer (image 1 de 4) ; jamais d eau dans le couloir',
    ],
  },
  {
    file: 'relief-final-5-falaise.png', title: '5 - la falaise le long de la riviere', at: [XC + 10, 830], extra: { key: 'xeros-down', x: XC - 22, dy: 236, label: '' }, dx: 0, dy: 0, detail: [-20, -30],
    notes: [
      'la face est de la falaise (5 m), en raccourci : relief-face-raked, 12 px de face (de la levre au pied) + le lierre qui deborde sur l eau',
      'son ombre portee sur l eau : 25 px a l est et 10 au sud pour 5 m (shadow de src/config.ts, calculee par le jeu)',
      'xeros sur le plateau, au bord, pour l echelle',
    ],
  },
];

for (const v of VIEWS) {
  const poses = v.pose ? [v.pose] : v.extra ? [v.extra] : [];
  const lay = shot(NEW, poses);
  const s = lay.sheet;
  let cx: number;
  let cy: number;
  if (v.pose) { const xp = fin.xerosAt(NEW.full, v.pose); cx = xp.x; cy = xp.y - xp.z + OY; } else { [cx, cy] = v.at!; cy += OY - TOP; }
  const top = 70;
  const detailTop = top + VH * K + 40;
  const cutTop = detailTop + DH * 4 + 40;
  const notesTop = (v.cut ? cutTop + DH * 4 : detailTop + DH * 4) + 16;
  const sheet = new Sheet(PAD * 2 + Math.max(VW * K, DW * 4), notesTop + v.notes.length * 16 + 30, BG);
  sheet.text(v.title, PAD, 16, GOLD, 4);
  sheet.text('ecran de jeu 427 X 240 PX (21 X 12 M), X2', PAD, 46, GREY, 2);
  copy(s, Math.round(cx + v.dx - VW / 2), Math.round(cy + v.dy - VH / 2), VW, VH, sheet, PAD, top, K);
  sheet.text('detail X4 (xeros pour l echelle)', PAD, detailTop - 18, GOLD, 2);
  let ddx = cx + v.detail[0];
  let ddy = cy + v.detail[1];
  if (!v.pose && v.extra) { const xp = fin.xerosAt(NEW.full, v.extra); ddx = (xp.x + XC + 30) / 2 + v.detail[0]; ddy = xp.y - xp.z + OY + v.detail[1]; }
  copy(s, Math.round(ddx - DW / 2), Math.round(ddy - DH * 0.6), DW, DH, sheet, PAD, detailTop, 4);
  if (v.cut) {
    const xp = fin.xerosAt(NEW.full, v.pose!);
    let foot = xp.y;
    while (foot < H - 1 && NEW.full.zone[foot * W + xp.x] !== Z.RIVER) foot++;
    sheet.text('detail X4 : la coupure sud (flanc mouille, lisere, miroitement)', PAD, cutTop - 18, GOLD, 2);
    copy(s, Math.round(xp.x - DW / 2), Math.round(foot + OY - DH * 0.55), DW, DH, sheet, PAD, cutTop, 4);
  }
  v.notes.forEach((l, i) => sheet.text(l, PAD, notesTop + i * 16, GREY, 2));
  save(sheet, v.file);
}

// ---------- 6. la voûte : l'essai 4 contre les dessins définitifs ----------

/**
 * Combien la voûte referme le couloir, vu de loin (sans Xéros, rien ne s'efface) : sur les colonnes du couloir creusé (de la
 * case 6 à l'entrée), la part des pixels de l'écran où le terrain seul montrerait le sol du couloir ou la paroi nord, et que le
 * feuillage (arbres, rideau, avancées, capuchons de l'essai 4) recouvre.
 */
function closure(sc: Scene, lay: Layer, x0: number, x1: number) {
  let floor = 0, floorC = 0, wall = 0, wallC = 0;
  for (let y = 0; y < SH; y++) for (let x = x0; x < x1; x++) {
    const k = y * W + x;
    const z = sc.fullR.zone[k];
    if (z === Z.FLOOR && (x >= XC || wallZ(x) - floorZ(x) > 20)) { floor++; if (lay.veg[k] === 1) floorC++; }
    if (z === Z.NBANK) { wall++; if (lay.veg[k] === 1) wallC++; }
  }
  return { floor: floorC / Math.max(1, floor), wall: wallC / Math.max(1, wall), all: (floorC + wallC) / Math.max(1, floor + wall) };
}

{
  const a = shot(OLD, []);
  const b = shot(NEW, []);
  const x0 = 6 * 32;
  const x1 = XE;
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  const segs: [string, number, number][] = [['tout le couloir', x0, x1], ['cote plateau (cases 6-42)', x0, XC], ['sur la riviere (42-47)', XC, 47 * 32], ['cote ferme (47-60)', 47 * 32, x1]];
  const lines = segs.map(([n, p, q]) => {
    const ca = closure(OLD, a, p, q);
    const cb = closure(NEW, b, p, q);
    return `${n} : sol couvert ${pct(ca.floor)} -> ${pct(cb.floor)} ; paroi nord couverte ${pct(ca.wall)} -> ${pct(cb.wall)} ; ensemble ${pct(ca.all)} -> ${pct(cb.all)}`;
  });
  console.log(lines.join('\n'));
  // le cadrage : la bande du couloir, à x1 en entier, puis trois écrans de jeu x2 côte à côte (même cadre de chaque côté)
  const cy = Math.round(axisY(1200)) + OY - 70;
  const bandH = 220;
  const frames: [string, number, number][] = [['cote ferme, case 53', 1700, cy + 10], ['sur la riviere, case 44', 1424, cy + 10], ['cote plateau, case 30', 960, cy + 30]];
  const top = 70;
  const fullW = W - 120;
  const sheetW = PAD * 2 + Math.max(fullW, VW * K * 2 + 40);
  const rowsTop = top + (bandH + 40) * 2 + 40;
  const sheet = new Sheet(sheetW, rowsTop + frames.length * (VH * K + 50) + lines.length * 16 + 60, BG);
  sheet.text('6 - la voute : essai 4 (arbres penches, capuchons) contre les dessins definitifs (arbres debout, rideau, avancees)', PAD, 16, GOLD, 3);
  sheet.text('vue de loin, sans xeros (rien ne s efface) ; meme cadrage des deux cotes', PAD, 46, GREY, 2);
  sheet.text('essai 4', PAD, top - 4, GOLD, 2);
  copy(a.sheet, 60, cy - bandH / 2, fullW, bandH, sheet, PAD, top + 12, 1);
  sheet.text('definitif', PAD, top + bandH + 36, GOLD, 2);
  copy(b.sheet, 60, cy - bandH / 2, fullW, bandH, sheet, PAD, top + bandH + 52, 1);
  frames.forEach(([n, fx, fy], i) => {
    const yy = rowsTop + i * (VH * K + 50);
    sheet.text(`${n} : essai 4 (a gauche), definitif (a droite), x2`, PAD, yy - 18, GOLD, 2);
    copy(a.sheet, fx - VW / 2, fy - VH / 2, VW, VH, sheet, PAD, yy, K);
    copy(b.sheet, fx - VW / 2, fy - VH / 2, VW, VH, sheet, PAD + VW * K + 40, yy, K);
  });
  const ly = rowsTop + frames.length * (VH * K + 50) + 10;
  sheet.text('part du couloir (sol visible et paroi nord) que le feuillage couvre, essai 4 -> definitif :', PAD, ly, GOLD, 2);
  lines.forEach((l, i) => sheet.text(l, PAD, ly + 18 + i * 16, GREY, 2));
  save(sheet, 'relief-final-6-voute.png');
}
void XT;
