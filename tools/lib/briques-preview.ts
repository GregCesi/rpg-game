// Aperçu des matières (chantier « briques ») : .art-preview/briques.png (npm run art:preview).
// Par groupe (la pierre, la terre, les fibres, le bois travaillé) : chaque objet dans toutes ses vues et ses formes, posé sur une
// même ligne de sol à côté de Xéros, sur le quadrillage des cases (32 px, 1,60 m), avec en dessous son nom, sa taille en pixels
// (silhouette de sa première vue), sa masse et sa symétrie ; puis chaque chaîne de transformation du groupe dessinée de gauche à
// droite (ce qui entre, ce qui sort, le déchet), avec les masses (transforms.json, world/transform.ts). Agrandi x3.

import type { PNG } from 'pngjs';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource } from '../../art/lib/types';
import { composeWood } from '../../art/world/wood-pieces';
import { world } from '../../art/palette';
import { items, matters, props, transforms, wood } from '../../src/content';
import { silhouette } from '../../src/content/gabarit';
import { itemMass, propMass, woodMass } from '../../src/content/mass';
import type { TransformPart, Views, WoodPiece } from '../../src/content/types';
import { viewImages } from '../../src/content/views';
import { formImage, kilos } from '../../src/world/natural';
import { balance, partName, partWood } from '../../src/world/transform';
import { lookDef, lookOf } from '../../src/world/woodShape';
import { Sheet, textWidth, type Rgb } from './audit-preview';

const K = 3;
const PAD = 10;
const T = 2;
const GRASS: Rgb = [123, 133, 68];
const GRID: Rgb = [110, 120, 60];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [215, 215, 200];
const GOLD: Rgb = [245, 215, 120];
const NAMES = { items, props, matters };

/** Un objet de l'aperçu : un objet possédable, un objet du monde, ou une pièce de bois (ses réglages). */
type Entry = { item: string } | { prop: string } | { wood: Omit<WoodPiece, 'axis'> };

/** Les groupes, dans l'ordre des briques : leurs objets, puis leurs transformations (clés de transforms.json). */
const GROUPS: { title: string; objects: Entry[]; chains: string[] }[] = [
  {
    title: 'Groupe 1 : la pierre (solin, cheminée)',
    objects: [{ item: 'rough-stone' }, { item: 'big-rough-stone' }, { item: 'rubble-stone' }, { item: 'ashlar' }, { prop: 'flat-stone' }, { prop: 'footing-stone' }, { prop: 'stone-chips' }, { item: 'stone-hammer' }, { item: 'stone-chisel' }, { item: 'mallet' }],
    chains: ['dress-rubble', 'dress-ashlar'],
  },
  {
    title: 'Groupe 2 : la terre (solin, remplissage)',
    objects: [{ item: 'clay-clod' }, { item: 'cob' }, { prop: 'earth-mortar' }, { prop: 'bucket' }, { prop: 'bucket-water' }, { item: 'spade' }],
    chains: ['dig-clay', 'fill-bucket', 'mix-mortar', 'mix-cob'],
  },
  {
    title: 'Groupe 3 : les fibres (remplissage, toit)',
    objects: [{ item: 'wattle-rod' }, { item: 'straw' }, { item: 'thatch-bundle' }],
    chains: ['trim-rod', 'comb-thatch'],
  },
  {
    title: 'Groupe 4 : le bois travaillé (charpente, ouvertures)',
    objects: [
      { wood: { size: 'pole', shape: 'round', length: 400 } },
      { wood: { size: 'big', shape: 'plank', length: 200 } },
      { item: 'shingle' },
      { item: 'peg' },
      { item: 'froe' },
    ],
    chains: ['pole-from-top', 'rive-plank', 'rive-plank-half', 'rive-shingle', 'whittle-stake', 'whittle-peg', 'split-log', 'split-half', 'hew-beam'],
  },
];

/** La première image d'une source (une image, ou la première image de la première animation d'une planche). */
function gridOf(sources: ArtSource[], name: string): { grid: Grid; palette: Palette } | undefined {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind === 'tileset') return undefined;
  return { grid: s.kind === 'image' ? s.grid : Object.values(s.animations)[0].frames[0], palette: s.palette };
}

/** Ce qu'on montre d'un objet : ses images (toutes ses vues, ses deux formes), son nom, sa masse, sa symétrie. */
function shown(sources: ArtSource[], e: Entry): { images: { grid: Grid; palette: Palette }[]; lines: string[] } | undefined {
  const has = (k: string) => sources.some((s) => s.name === k);
  if ('wood' in e) {
    const size = wood.sizes[e.wood.size];
    if (!size || !size.looks[lookOf(e.wood)]) return undefined;
    const ew: WoodPiece = { ...e.wood, axis: 'ew' };
    const ns: WoodPiece = { ...e.wood, axis: 'ns' };
    const images = [ew, ns].map((p) => ({ grid: composeWood(p).toGrid(), palette: world }));
    const s = silhouette(images[0].grid, world);
    return { images, lines: [lookDef(e.wood.size, lookOf(ew)).name, `${e.wood.length / 100} m : ${s.w}X${s.h} px`, kilos(woodMass(ew)), 'piece de bois'] };
  }
  const def = 'item' in e ? items[e.item] : props[e.prop];
  const base = 'item' in e ? (items[e.item].ground ?? items[e.item].icon) : props[e.prop].image;
  const views: Views = def.views;
  const bases = def.natural?.forms === 2 ? [base, formImage(base, { form: 1, size: 100 })] : [base];
  const images = bases.flatMap((b) => viewImages(b, views, has)).map((k) => gridOf(sources, k)).filter((g): g is NonNullable<typeof g> => !!g);
  if (!images.length) return undefined;
  const s = silhouette(images[0].grid, images[0].palette);
  const kg = 'item' in e ? itemMass(e.item) : def.mass !== undefined ? propMass(e.prop) : undefined;
  const vary = def.natural ? ` +-${def.natural.vary}%` : '';
  return {
    images,
    lines: [def.name, `${s.w}X${s.h} px`, kg !== undefined ? `${kilos(kg)}${vary}` : 'sans masse', `${views}${def.natural?.forms === 2 ? ', 2 formes' : ''}`],
  };
}

/** Une entrée ou une sortie d'une transformation, dessinée : son image (sa première vue) et sa ligne. */
function partShown(sources: ArtSource[], part: TransformPart, length?: number): { image?: { grid: Grid; palette: Palette }; text: string } {
  const name = partName(part, NAMES);
  if (part.raw) return { text: `${name} ${kilos(part.kg!)}` };
  if (part.wood) {
    if (!wood.sizes[part.wood.size]?.looks[lookOf(part.wood)]) return { text: name };
    const p = partWood(part, length);
    return { image: { grid: composeWood(p).toGrid(), palette: world }, text: `${name} ${kilos(woodMass(p) * part.count)}` };
  }
  const image = part.item ? (items[part.item].ground ?? items[part.item].icon) : props[part.prop!].image;
  const kg = part.item ? itemMass(part.item) : propMass(part.prop!);
  return { image: gridOf(sources, image), text: `${name} ${kilos(kg * part.count)}` };
}

/** La planche des matières ; undefined si Xéros n'est pas dessiné. */
export function briquesPreview(sources: ArtSource[]): PNG | undefined {
  const body = sources.find((s) => s.kind === 'spritesheet' && s.name === 'xeros');
  if (body?.kind !== 'spritesheet') return undefined;
  const xeros = body.animations['idle-down'].frames[0];
  const xs = silhouette(xeros, body.palette);

  // les rangées : un titre, une rangée d'objets, une rangée par chaîne
  type Cell = { w: number; art: number; below: number; draw: (sheet: Sheet, x: number, ground: number) => void };
  type Row = { title?: string; cells: Cell[] };
  const rows: Row[] = [];
  const objectCell = (e: ReturnType<typeof shown> & object): Cell => {
    const artW = e.images.reduce((s, g) => s + g.grid[0].length + 3, 0) * K;
    const artH = Math.max(...e.images.map((g) => g.grid.length)) * K;
    const textW = Math.max(...e.lines.map((l) => textWidth(l, T)));
    return {
      w: Math.max(artW, textW) + 2 * PAD,
      art: artH,
      below: e.lines.length * 12 + 12,
      draw: (sheet, x, ground) => {
        let gx = x + PAD;
        for (const g of e.images) {
          sheet.blit(g.grid, g.palette, gx, ground - g.grid.length * K, K);
          gx += (g.grid[0].length + 3) * K;
        }
        e.lines.forEach((l, i) => sheet.text(l, x + PAD, ground + 8 + i * 12, i === 0 ? WHITE : GREY, T));
      },
    };
  };
  const xerosCell: Cell = {
    w: Math.max(xs.w * K, textWidth('xeros 1,60 m', T)) + 2 * PAD,
    art: xs.h * K,
    below: 24,
    draw: (sheet, x, ground) => {
      sheet.blit(xeros, body.palette, x + PAD - xs.x * K, ground - (xs.y + xs.h) * K, K);
      sheet.text('xeros 1,60 m', x + PAD, ground + 8, GOLD, T);
    },
  };
  for (const g of GROUPS) {
    const cells = g.objects.map((e) => shown(sources, e)).filter((e): e is NonNullable<typeof e> => !!e).map(objectCell);
    rows.push({ title: g.title, cells: [xerosCell, ...cells] });
    for (const id of g.chains) {
      const t = transforms[id];
      if (!t) continue;
      const parts = [...t.inputs.map((p) => partShown(sources, p)), { text: '>' }, ...t.outputs.map((p) => partShown(sources, p))];
      const { input, output, waste } = balance(t, { props, items, piles: {}, matters });
      if (t.waste) parts.push({ text: '+' }, { ...(t.waste.prop ? { image: gridOf(sources, props[t.waste.prop].image) } : {}), text: `dechet : ${t.waste.name} ${kilos(Math.max(0, waste))}` });
      const cellsOf = parts.map<Cell>((p) => {
        const artW = p.image ? p.image.grid[0].length * K : 0;
        const artH = p.image ? p.image.grid.length * K : 0;
        return {
          w: Math.max(artW, textWidth(p.text, T)) + 2 * PAD,
          art: artH,
          below: 20,
          draw: (sheet, x, ground) => {
            if (p.image) sheet.blit(p.image.grid, p.image.palette, x + PAD, ground - p.image.grid.length * K, K);
            sheet.text(p.text, x + PAD, ground + 6, p.text === '>' || p.text === '+' ? GOLD : GREY, T);
          },
        };
      });
      const gesture = t.gesture === 'soon' ? 'geste : a venir' : `geste : ${t.gesture.keys}`;
      const label = `${t.name} (${id}) : ${kilos(input)} > ${kilos(output)} - outil : ${t.tools.length ? t.tools.map((k) => items[k]?.name ?? k).join(', ') : 'aucun'} - poste : ${t.station} - metier : ${t.trade} - ${gesture}`;
      rows.push({ title: label, cells: cellsOf });
    }
  }

  const width = Math.max(...rows.map((r) => r.cells.reduce((s, c) => s + c.w, 0)), ...rows.map((r) => textWidth(r.title ?? '', T) + 20)) + 2 * PAD;
  // une rangée : son titre, la plus haute image au-dessus de la ligne de sol, le plus long texte dessous
  const art = (r: Row) => Math.max(...r.cells.map((c) => c.art));
  const below = (r: Row) => Math.max(...r.cells.map((c) => c.below));
  const rowH = (r: Row) => 24 + art(r) + below(r) + 16;
  const height = rows.reduce((s, r) => s + rowH(r), 20);
  const sheet = new Sheet(width, height, GRASS);
  // le quadrillage des cases : 32 px du jeu, 1,60 m
  for (let x = 0; x < width; x += 32 * K) sheet.rect(x, 0, 1, height, GRID);
  for (let y = 0; y < height; y += 32 * K) sheet.rect(0, y, width, 1, GRID);
  let y = 10;
  for (const r of rows) {
    if (r.title) sheet.text(r.title, PAD, y, r.title.startsWith('Groupe') ? GOLD : WHITE, T);
    const ground = y + 24 + art(r);
    let x = PAD;
    for (const c of r.cells) {
      c.draw(sheet, x, ground);
      x += c.w;
    }
    y += rowH(r);
  }
  return sheet.png;
}
