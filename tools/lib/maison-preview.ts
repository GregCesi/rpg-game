// Aperçu des pièces de la maison de Xéros (art/world/xeros-house.ts, CONCEPTION « La maison de Xéros », étape 2) :
// .art-preview/maison-pieces.png (npm run art:preview), x3. Chaque pièce dans toutes ses vues (r0 à r3, ou est-ouest et nord-sud),
// les quatre étapes d'un remplissage côte à côte, une travée de porte montée (jambage r2, porte, jambage r0), Xéros pour l'échelle.

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
      { label: 'travee : porte d\'entree', names: ['lime-jamb-r2', 'cottage-door', 'lime-jamb'], tight: true },
    ],
    [
      ...STAGES.map((s) => ({ label: `${s}-inner-jamb`, names: all(`${s}-inner-jamb`) })),
      { label: 'travee : porte interieure', names: ['lime-inner-jamb-r2', 'inner-door', 'lime-inner-jamb'], tight: true },
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
  ];
  // le foyer : ses trois images côte à côte
  const hearth = sources.find((s) => s.name === 'hearth');
  const framesOf = (name: string): Img[] => {
    if (name === 'hearth' && hearth?.kind === 'spritesheet') return hearth.animations.burn.frames.map((g) => ({ grid: g, palette: hearth.palette }));
    const i = find(name);
    return i ? [i] : [];
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
