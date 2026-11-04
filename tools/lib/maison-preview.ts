// Aperçu des pièces de la maison de Xéros (art/world/xeros-house.ts, CONCEPTION « La maison de Xéros », étape 2) :
// .art-preview/maison-pieces.png (npm run art:preview), x3. Chaque pièce dans toutes ses vues (r0 à r3, ou est-ouest et nord-sud),
// les quatre étapes d'un remplissage côte à côte, les travées de porte montées à leurs vraies hauteurs (chantier « maison-2 »), Xéros
// pour l'échelle.

import type { PNG } from 'pngjs';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource } from '../../art/lib/types';
import { Sheet, textWidth, type Rgb } from './audit-preview';

const K = 3;
const GAP = 6;
const BG: Rgb = [123, 133, 68];
const INK: Rgb = [250, 245, 225];
const STAGES = ['staves', 'wattle', 'daub', 'lime'];
const V4 = ['', '-r1', '-r2', '-r3'];

type Img = { grid: Grid; palette: Palette };
/** Un groupe : son titre et ses images, côte à côte, le bas aligné ; `tight` : collées (une travée montée). */
type Item = { label: string; names: string[]; tight?: boolean };

export function maisonPreview(sources: ArtSource[]): PNG | undefined {
  const find = (name: string): Img | undefined => {
    const s = sources.find((x) => x.name === name);
    if (!s) return undefined;
    if (s.kind === 'image') return { grid: s.grid, palette: s.palette };
    if (s.kind === 'spritesheet') {
      const a = s.animations['idle-down'] ?? Object.values(s.animations)[0];
      return { grid: a.frames[0], palette: s.palette };
    }
    return undefined;
  };
  const xeros = find('xeros');
  if (!xeros || !find('lime-panel')) return undefined;
  const all = (base: string) => V4.map((v) => `${base}${v}`);
  const rows: Item[][] = [
    STAGES.map((s) => ({ label: `${s}-panel`, names: all(`${s}-panel`) })),
    STAGES.map((s) => ({ label: `${s}-window-panel`, names: all(`${s}-window-panel`) })),
    [
      ...STAGES.map((s) => ({ label: `${s}-jamb`, names: all(`${s}-jamb`) })),
      { label: 'travee : porte d\'entree (vraies hauteurs)', names: ['@bay-door'] },
    ],
    [
      ...STAGES.map((s) => ({ label: `${s}-inner-jamb`, names: all(`${s}-inner-jamb`) })),
      { label: 'travee : porte interieure (vraies hauteurs)', names: ['@bay-inner'] },
      { label: 'door-frame', names: all('door-frame') },
      { label: 'lime-door-head', names: all('lime-door-head') },
      { label: 'inner-threshold-stone', names: ['inner-threshold-stone', 'inner-threshold-stone-ns'] },
    ],
    [
      { label: 'cottage-door', names: all('cottage-door') },
      { label: 'inner-door', names: all('inner-door') },
      { label: 'patine (worn)', names: ['lime-jamb-r2-worn', 'cottage-door-worn', 'lime-jamb-worn', 'staves-panel-worn'] },
      { label: 'narrow-sill-wall', names: all('narrow-sill-wall') },
      { label: 'hearth (3 images)', names: ['hearth'] },
      { label: 'threshold-stone', names: ['threshold-stone', 'threshold-stone-ns'] },
      { label: 'bench', names: ['bench', 'bench-ns'] },
    ],
    [{ label: 'lime-gable', names: all('lime-gable') }, { label: 'lime-gable-smoke', names: all('lime-gable-smoke') }],
    [{ label: 'thatch-roof-frame', names: all('thatch-roof-frame') }],
    [{ label: 'thatch-roof-half', names: all('thatch-roof-half') }],
    [{ label: 'thatch-roof', names: all('thatch-roof') }, { label: 'earth-ridge', names: ['earth-ridge', 'earth-ridge-ns'] }],
    [{ label: 'thatch-roof-pierced', names: all('thatch-roof-pierced') }],
    [
      { label: 'stone-hearth (3 images)', names: ['stone-hearth'] },
      { label: 'stone-hearth r1 r2 r3', names: ['stone-hearth-r1', 'stone-hearth-r2', 'stone-hearth-r3'] },
      { label: 'chimney-hood', names: ['chimney-hood', 'chimney-hood-ns'] },
      { label: 'chimney-flue', names: ['chimney-flue', 'chimney-flue-ns'] },
      { label: 'chimney-cap', names: ['chimney-cap', 'chimney-cap-ns'] },
    ],
    [
      { label: 'cheminee montee (sud)', names: ['@chimney'] },
      { label: 'cinq troncons (est-ouest, nord-sud)', names: ['@flue5', '@flue5-ns'] },
    ],
  ];
  // le foyer, l'âtre : leurs trois images côte à côte
  const framesOf = (name: string): Img[] => {
    if (name.startsWith('@')) {
      const m = mounted(name.slice(1));
      return m ? [m] : [];
    }
    const sheet = sources.find((s) => s.name === name);
    if ((name === 'hearth' || name === 'stone-hearth') && sheet?.kind === 'spritesheet') return sheet.animations.burn.frames.map((g) => ({ grid: g, palette: sheet.palette }));
    const i = find(name);
    return i ? [i] : [];
  };
  // la cheminée montée comme le mode construction la pose (tools/lib/maison-xeros.ts, en cm : centre x, bord sud y, hauteur z) : le
  // bas de chaque image au bord sud de son emprise relevé de sa hauteur (y − z), centrée sur l'emprise ; dans l'ordre de pose
  const mounted = (what: string): Img | undefined => {
    const ns = what.endsWith('-ns') ? '-ns' : '';
    const flues = Array.from({ length: 5 }, (_, k) => ({ name: `chimney-flue${ns}`, x: 780, y: 110, z: 250 + 100 * k }));
    // une baie de porte (chantier « maison-2 ») à ses vraies hauteurs : les bandes sur la traverse (70 cm), le seuil au sol, les
    // huisseries et la porte sur le seuil (20 cm), la tête de baie sur les huisseries (2 m) ; la travée d'entrée, de x 490 à 630
    const bay = (door: string, sill: string, south: number) => [
      { name: 'lime-jamb', x: 495, y: south, z: 70 },
      { name: 'lime-jamb', x: 625, y: south, z: 70 },
      { name: sill, x: 560, y: south, z: 0 },
      { name: 'door-frame', x: 507, y: south, z: 20 },
      { name: door, x: 560, y: south - 15, z: 20 },
      { name: 'door-frame', x: 612, y: south, z: 20 },
      { name: 'lime-door-head', x: 560, y: south, z: 200 },
    ];
    const parts = what === 'chimney'
      ? [{ name: 'stone-hearth', x: 780, y: 140, z: 0 }, { name: 'chimney-hood', x: 780, y: 110, z: 150 }, ...flues, { name: 'chimney-cap', x: 780, y: 130, z: 750 }]
      : what === 'bay-door' ? bay('cottage-door', 'threshold-stone', 660)
      : what === 'bay-inner' ? bay('inner-door', 'inner-threshold-stone', 640)
      : flues;
    const imgs = parts.map((q) => ({ q, i: q.name === 'stone-hearth' ? framesOf('stone-hearth')[0] : find(q.name) }));
    if (imgs.some((e) => !e.i)) return undefined;
    const at = imgs.map(({ q, i }) => ({ g: i!.grid, x: Math.round(q.x / 5 - i!.grid[0].length / 2), y: Math.round((q.y - q.z) / 5) - i!.grid.length }));
    const x0 = Math.min(...at.map((a) => a.x)), y0 = Math.min(...at.map((a) => a.y));
    const W = Math.max(...at.map((a) => a.x + a.g[0].length)) - x0, H = Math.max(...at.map((a) => a.y + a.g.length)) - y0;
    const rows = Array.from({ length: H }, () => Array<string>(W).fill('.'));
    for (const a of at) a.g.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') rows[a.y - y0 + j][a.x - x0 + i] = ch; }));
    return { grid: rows.map((r) => r.join('')), palette: imgs[0].i!.palette };
  };
  const XW = 12; // Xéros, 12 px de large (rangées 14 à 45)
  const layout = rows.map((items) => {
    const blocks = items.map((it) => {
      const imgs = it.names.flatMap(framesOf);
      const w = imgs.reduce((s, i) => s + i.grid[0].length, 0) + (it.tight ? 0 : (imgs.length - 1) * 2) + XW + 3;
      const h = Math.max(32, ...imgs.map((i) => i.grid.length));
      return { it, imgs, w: Math.max(w, Math.ceil(textWidth(it.label, 1) / K) + 2), h };
    });
    return { blocks, h: Math.max(...blocks.map((b) => b.h)) };
  });
  const width = Math.max(...layout.map((r) => r.blocks.reduce((s, b) => s + b.w + GAP, GAP)));
  const height = layout.reduce((s, r) => s + r.h + 10, 4);
  const sheet = new Sheet(width * K, height * K, BG);
  let y = 4;
  for (const r of layout) {
    let x = GAP;
    for (const b of r.blocks) {
      sheet.text(b.it.label, x * K, y * K, INK, 1);
      const base = y + 4 + r.h; // le sol
      sheet.blit(xeros.grid, xeros.palette, (x - 10) * K, (base - 46) * K, K, [14, 45]);
      let ix = x + XW + 3;
      for (const i of b.imgs) {
        sheet.blit(i.grid, i.palette, ix * K, (base - i.grid.length) * K, K);
        ix += i.grid[0].length + (b.it.tight ? 0 : 2);
      }
      x += b.w + GAP;
    }
    y += r.h + 10;
  }
  return sheet.png;
}
