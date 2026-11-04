// Essai (chantier « maison du coq », hors jeu) : la planche-catalogue des pièces DE PIERRE de la maison du coq, une par une, x4,
// avec Xéros pour l'échelle. npx tsx tools/essai-coq-catalogue-pierre.ts écrit .art-preview/coq-catalogue-pierre-1.png à -4.png
// et .art-preview/coq-catalogue-pierre.json (pour chaque vue mesurée : { key, view, expected, drawn, ok }).
//
// Rien ici n'entre dans le jeu. Les pièces (clés, dimensions, masses, vues) viennent d'art/proposals/coq-catalogue-data.ts, leurs
// dessins d'art/proposals/coq-catalogue-pierre.ts ; les pièces qui existent déjà sont leurs images du jeu (src/generated/, en
// lecture seule ; la planche de 4 m et la terre battue sont assemblées comme le jeu les assemble). La lauze de la forge est lue dans
// le commit e77165c de la branche forge (git show), recopiée dans .art-preview/ avec ses imports réécrits, importée à la volée : si
// ça échoue, la planche le dit et continue.

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import { world } from '../art/palette';
import { interiorTiles } from '../art/interior/house';
import { composeWood } from '../art/world/wood-pieces';
import { renderPiece, withGroundShadow, type Part, type Quad, type Rot } from '../art/lib/volumes';
import { PIECES, GROUPS, massOf, expectedOf, CARRY, type Piece, type Group } from '../art/proposals/coq-catalogue-data';
import {
  PAL, STONE_PIECES, pieceView, keystoneWide, wallSample, wallLayout, archAssembly, mantelAssembly, crossAssembly, lavePan,
  WALL_T,
} from '../art/proposals/coq-catalogue-pierre';
import { TOLERANCE, expectedSize, silhouette } from '../src/content/gabarit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.art-preview');
const K = 4;
const T = 2;
const LINE = 12;
const MAXW = 2360;
const GRASS: Rgb = [123, 133, 68];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [220, 220, 205];
const GOLD: Rgb = [245, 215, 120];
const RED: Rgb = [255, 140, 120];
const GREEN: Rgb = [180, 240, 160];
const INK: Rgb = [70, 45, 40];

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

// ---------- les images ----------

interface View { label: string; grid: Grid; pal: Palette; marks?: { text: string; x: number; y: number }[] }

/** Une image du jeu (src/generated/<nom>.png) en grille : une couleur par signe, l'alpha gardé (l'ombre reste translucide). */
function gamePng(name: string): { grid: Grid; pal: Palette } {
  const png = PNG.sync.read(readFileSync(join(ROOT, 'src', 'generated', `${name}.png`)));
  const pal: Palette = {}, sign = new Map<string, string>();
  let next = 0x2460;
  const grid: Grid = [];
  for (let y = 0; y < png.height; y++) {
    let row = '';
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4, a = png.data[i + 3];
      if (a === 0) { row += '.'; continue; }
      const hex = '#' + [0, 1, 2].map((k) => png.data[i + k].toString(16).padStart(2, '0')).join('') + (a < 255 ? a.toString(16).padStart(2, '0') : '');
      let c = sign.get(hex);
      if (!c) { c = String.fromCharCode(next++); sign.set(hex, c); pal[c] = hex; }
      row += c;
    }
    grid.push(row);
  }
  return { grid, pal };
}

/** Des volumes dont la matière rend des couleurs « #rrggbb » (la forge) : chaque couleur prend un signe, ajouté à la palette. */
function signify(qs: Quad[], pal: Palette): Quad[] {
  const sign = new Map<string, string>();
  let next = 0x2500;
  const of = (v: string) => {
    if (!v.startsWith('#')) return v;
    let c = sign.get(v);
    if (!c) { c = String.fromCharCode(next++); sign.set(v, c); pal[c] = v; }
    return c;
  };
  const parts = new Map<Part, Part>();
  return qs.map((q) => {
    let p = parts.get(q.part);
    if (!p) { p = { ...q.part, dark: of(q.part.dark) }; parts.set(q.part, p); }
    const tex = q.tex;
    return { ...q, part: p, tex: (s, t, c) => { const v = tex(s, t, c); return v === null ? null : of(v); } };
  });
}

/** Le coin haut-gauche (à l'écran du jeu, k = 1) d'une scène, pour poser une légende par-dessus. */
function originOf(qs: Quad[]): [number, number] {
  let x0 = Infinity, y0 = Infinity;
  for (const q of qs) for (const p of [q.o, [q.o[0] + q.u[0], q.o[1] + q.u[1], q.o[2] + q.u[2]], [q.o[0] + q.v[0], q.o[1] + q.v[1], q.o[2] + q.v[2]]]) {
    x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1] - p[2]);
  }
  return [Math.floor(x0), Math.floor(y0)];
}

// ---------- la mesure ----------

interface Measure { key: string; view: string; expected: [number, number]; drawn: [number, number]; ok: boolean }
const measures: Measure[] = [];

function measure(p: Piece, r: 0 | 1 | 2 | 3, v: View): string {
  const e = expectedOf(p, r), s = silhouette(v.grid, v.pal);
  const okW = s.w >= e.w - TOLERANCE && s.w <= e.wMax + TOLERANCE;
  const okH = s.h >= e.h - TOLERANCE && s.h <= e.hMax + TOLERANCE;
  measures.push({ key: p.key, view: `R${r}`, expected: [Math.round(e.w * 10) / 10, Math.round(e.h * 10) / 10], drawn: [s.w, s.h], ok: okW && okH });
  return `R${r} ATTENDU ${fmt(e.w)}X${fmt(e.h)}  MESURE ${s.w}X${s.h}  ${okW && okH ? 'OK' : 'HORS TOLERANCE'}`;
}

// ---------- les cellules ----------

interface Line { text: string; color: Rgb }
interface Cell { views: View[]; lines: Line[] }

const EXISTING: Record<string, string[]> = {
  'threshold-stone': ['threshold-stone', 'threshold-stone-ns'],
  'inner-threshold-stone': ['inner-threshold-stone', 'inner-threshold-stone-ns'],
  'chimney-cap': ['chimney-cap', 'chimney-cap-ns'],
  'stone-hearth': ['stone-hearth', 'stone-hearth-r1', 'stone-hearth-r2', 'stone-hearth-r3'],
};

/** La matière écrite d'une pièce qui existe déjà (son image est celle du jeu). */
const EXISTING_MATTER: Record<string, string> = {
  'threshold-stone': 'calcaire (image du jeu)',
  'inner-threshold-stone': 'calcaire (image du jeu)',
  'chimney-cap': 'calcaire (image du jeu)',
  'stone-hearth': 'calcaire et moellons (image du jeu)',
  'wood-piece:big:plank': 'bois du gros, scie (image du jeu)',
  'packed-earth': 'terre battue (tuile du jeu)',
};

/** Les vues d'une pièce : les images du jeu si elle existe, sinon nos dessins. */
function viewsOf(p: Piece): View[] {
  const rs: (0 | 1 | 2 | 3)[] = p.views === 'four' ? [0, 1, 2, 3] : p.views === 'symmetric' ? [0, 1] : [0];
  if (EXISTING[p.key]) {
    return EXISTING[p.key].map((n, i) => {
      const g = gamePng(n);
      // l'âtre est une planche de trois images (le feu qui brûle) : la première
      const frames = p.key === 'stone-hearth' ? 3 : 1, fw = g.grid[0].length / frames;
      return { label: `R${rs[i]}`, grid: g.grid.map((r) => [...r].slice(0, fw).join('')), pal: g.pal };
    });
  }
  if (p.key === 'wood-piece:big:plank') {
    return (['ew', 'ns'] as const).map((axis, i) => ({ label: `R${i}`, grid: composeWood({ size: 'big', shape: 'plank', axis, length: 400 }).toGrid(), pal: world as Palette }));
  }
  if (p.key === 'packed-earth') {
    const g = interiorTiles.tiles.floor.slice(0, 20).map((r) => r.slice(0, 20));
    return [{ label: 'R0', grid: g, pal: interiorTiles.palette }];
  }
  return rs.map((r) => ({ label: `R${r}`, grid: pieceView(p.key, r as Rot), pal: PAL }));
}

function pieceCell(p: Piece): Cell {
  const views = viewsOf(p);
  const m = massOf(p);
  const { w, d, h } = p.dims;
  const lines: Line[] = [
    { text: p.name, color: GOLD },
    { text: p.key, color: WHITE },
    { text: `${w} X ${d} X ${h} CM${p.dims.ground ? ' (PIECE DE BATIMENT)' : ''}${p.dims.shape === 'flat' ? ' (A PLAT)' : ''}`, color: GREY },
    { text: p.matter === 'fixed' && !p.kg ? 'MASSE : SANS (LE SOL)' : `MASSE ${Math.round(m)} KG, XEROS SEUL : ${m <= CARRY ? 'OUI' : `NON (${Math.round(m)} KG, IL EN PORTE ${CARRY})`}`, color: m <= CARRY ? GREY : RED },
    { text: EXISTING_MATTER[p.key] ?? STONE_PIECES[p.key]?.matter ?? '', color: GREY },
    { text: p.forge ? 'NOUVELLE, A REPRENDRE DE LA FORGE' : p.existing ? `EXISTE : ${p.existing}` : 'NOUVELLE', color: p.forge ? RED : p.existing ? GREEN : WHITE },
  ];
  const rs: (0 | 1 | 2 | 3)[] = p.views === 'four' ? [0, 1, 2, 3] : p.views === 'symmetric' ? [0, 1] : [0];
  views.forEach((v, i) => {
    const t = measure(p, rs[i], v);
    lines.push({ text: t, color: t.endsWith('OK') ? GREEN : RED });
  });
  if (p.views === 'symmetric') lines.push({ text: 'R2 = R0, R3 = R1', color: GREY });
  return { views, lines };
}

/** Un assemblage rendu comme un bâtiment (k = 1), avec son ombre. */
const assembled = (label: string, qs: Quad[], pal: Palette = PAL, k = 1): View => ({ label, grid: withGroundShadow(renderPiece(qs, { k })), pal });

function wallCell(): Cell {
  const qs = wallSample();
  const [ox, oy] = originOf(qs);
  const LETTER: Record<string, string> = { Q: 'A', B: 'B', C40: '4', C60: '6', C80: '8', T: 'T', T60: 'T' };
  const marks = wallLayout().map((b) => ({ text: LETTER[b.kind], x: b.x + b.w / 2 - ox, y: WALL_T - (b.k * 6 + 3) - oy }));
  return {
    views: [assembled('DANS LE MUR', qs), { ...assembled('LES PIECES', qs), marks }],
    lines: [
      { text: 'DANS LE MUR : 2,30 X 1,50 M, CINQ ASSISES, MUR DE 60 CM', color: GOLD },
      { text: 'A : PIERRE D ANGLE (CHAINE EN HARPE, 60 ET 40 DE FACE)', color: WHITE },
      { text: 'B : BOUTISSE (TRAVERSE LE MUR : VOIR L ARASE)', color: WHITE },
      { text: '4, 6, 8 : CARREAUX DE 40, 60 ET 80 (20 CM DE LIT)', color: WHITE },
      { text: 'T : PIERRE DE TABLEAU, BORD DE BAIE (40 ET 60 DE FACE)', color: WHITE },
      { text: 'L ARASE : LES DEUX PAREMENTS, LA FOURRURE ENTRE EUX', color: GREY },
      { text: 'UN JOINT A 10 CM SEULEMENT (ASSISE 1-2), VOIR LE RAPPORT', color: RED },
    ],
  };
}

function keystoneWideCell(): Cell {
  const v: View = { label: 'R0', grid: keystoneWide(), pal: PAL };
  const s = silhouette(v.grid, v.pal), e = expectedSize({ w: 50, d: 60, h: 50, shape: 'box' });
  return {
    views: [v],
    lines: [
      { text: 'CLEF AU COQ, VARIANTE DE LA PLANCHE VALIDEE', color: GOLD },
      { text: 'door-keystone (si les dims changent)', color: WHITE },
      { text: '50 X 60 X 50 CM (PROPOSE)', color: GREY },
      { text: 'LE COQ VALIDE (40 X 30 CM) Y TIENT ;', color: GREY },
      { text: 'SUR LA CLEF DE 30 CM, IL N A QUE 4 PX', color: GREY },
      { text: `R0 ATTENDU ${fmt(e.w)}X${fmt(e.h)}  MESURE ${s.w}X${s.h}`, color: GREY },
    ],
  };
}

// ---------- la lauze de la forge ----------

interface ForgeRoof { leanToQuads: (c: 'slates', o: [number, number, number], u: [number, number, number], v: [number, number, number]) => Quad[]; roofQuads: (c: 'slates', o: [number, number]) => Quad[] }

async function forgeRoof(): Promise<ForgeRoof | string> {
  try {
    const src = execSync('git show e77165c:art/proposals/forge-toits.ts', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const fixed = src.replace(/from '\.\.\/palette'/g, "from '../art/palette'").replace(/from '\.\.\/lib\/volumes'/g, "from '../art/lib/volumes'");
    const tmp = join(OUT, 'tmp-forge-toits.ts');
    writeFileSync(tmp, fixed);
    return (await import(pathToFileURL(tmp).href)) as ForgeRoof;
  } catch (e) {
    return `LA LAUZE DE LA FORGE N A PAS PU ETRE LUE (${String((e as Error).message).slice(0, 60)})`;
  }
}

async function laveCell(): Promise<Cell> {
  const pal: Palette = { ...PAL };
  const views: View[] = [assembled('NOTRE LAVE, 45 DEGRES', lavePan())];
  const lines: Line[] = [
    { text: 'LA LAVE : NOTRE PAN CONTRE LA LAUZE DE LA FORGE (X4)', color: GOLD },
    { text: '1 : NOS LAVES (coq-pierre.ts laves, lavesRidge) 2 X 1,50 M A 45 DEG', color: WHITE },
  ];
  const f = await forgeRoof();
  if (typeof f === 'string') lines.push({ text: f, color: RED });
  else {
    const d = 30 / Math.SQRT2;
    views.push(assembled('FORGE, MEME PAN A 45 DEGRES', signify(f.leanToQuads('slates', [0, 40, 4], [40, 0, 0], [0, -d, d]), pal), pal));
    const full = renderPiece(signify(f.roofQuads('slates', [0, 0]), pal));
    views.push({ label: 'FORGE, LE TOIT DE L ATELIER (37 DEG)', grid: full.map((r) => r.slice(76, 116)), pal });
    lines.push(
      { text: '2 : LAUZE DE LA FORGE (forge-toits.ts leanToQuads slates) MEME PAN', color: WHITE },
      { text: '3 : LAUZE DE LA FORGE SUR SON TOIT (roofQuads slates), 2 M DE LARGE', color: WHITE },
      { text: 'IL N EN FAUT QU UNE : LA NOTRE EST A REPRENDRE DE LA FORGE', color: RED },
    );
  }
  return { views, lines };
}

// ---------- la planche ----------

const xg = xeros.animations['idle-down'].frames[0];
const xs = silhouette(xg, xeros.palette);
const XW = xs.w * K;

interface Section { title: string; cells: Cell[] }

const silOf = (v: View) => silhouette(v.grid, v.pal);
function cellSize(c: Cell) {
  const vw = c.views.reduce((s, v) => s + Math.max(v.grid[0].length * K, textWidth(v.label, T)) + 12, -12);
  const tw = Math.max(...c.lines.map((l) => textWidth(l.text, T)));
  return { w: Math.max(vw, tw), vw };
}

function render(head: string[], sections: Section[]): PNG {
  const PAD = 16, GAP = 28;
  // les rangées : Xéros en tête, puis les cellules tant qu'elles tiennent
  type Row = { section?: string; cells: Cell[] };
  const rows: Row[] = [];
  for (const s of sections) {
    let cur: Row = { section: s.title, cells: [] }, x = PAD + XW + GAP;
    for (const c of s.cells) {
      const { w } = cellSize(c);
      if (cur.cells.length && x + w > MAXW) { rows.push(cur); cur = { cells: [] }; x = PAD + XW + GAP; }
      cur.cells.push(c); x += w + GAP;
    }
    rows.push(cur);
  }
  const geo = rows.map((r) => {
    const views = r.cells.flatMap((c) => c.views);
    const above = Math.max(xs.h * K, ...views.map((v) => { const s = silOf(v); return (s.y + s.h) * K - (s.y * K); })) + 16;
    const below = Math.max(K * 2, ...views.map((v) => { const s = silOf(v); return (v.grid.length - (s.y + s.h)) * K; }));
    const text = Math.max(...r.cells.map((c) => c.lines.length)) * LINE + 8;
    const w = r.cells.reduce((s, c) => s + cellSize(c).w + GAP, PAD + XW + GAP);
    return { above, below, text, title: r.section ? 30 : 0, w };
  });
  const width = Math.max(...geo.map((g) => g.w), ...head.map((l) => textWidth(l, T) + PAD * 2));
  const height = 16 + head.length * LINE + 8 + geo.reduce((s, g) => s + g.title + g.above + g.below + g.text + GAP, 0);
  const sheet = new Sheet(width, height, GRASS);
  head.forEach((l, i) => sheet.text(l, PAD, 12 + i * LINE, i ? WHITE : GOLD, T));
  let y = 16 + head.length * LINE + 8;
  rows.forEach((r, ri) => {
    const g = geo[ri];
    if (r.section) { sheet.text(r.section, PAD, y + 4, GOLD, 3); y += g.title; }
    const ground = y + g.above;
    // Xéros, les pieds sur la ligne de sol
    sheet.blit(xg, xeros.palette, PAD - xs.x * K, ground - (xs.y + xs.h) * K, K);
    let x = PAD + XW + GAP;
    for (const c of r.cells) {
      let vx = x;
      for (const v of c.views) {
        const s = silOf(v), top = ground - (s.y + s.h) * K;
        sheet.text(v.label, vx, ground - s.h * K - 14, WHITE, T);
        sheet.blit(v.grid, v.pal, vx, top, K);
        for (const m of v.marks ?? []) sheet.text(m.text, vx + Math.round(m.x * K) - 3, top + Math.round(m.y * K) - 5, INK, T);
        vx += Math.max(v.grid[0].length * K, textWidth(v.label, T)) + 12;
      }
      c.lines.forEach((l, i) => sheet.text(l.text, x, ground + g.below + 6 + i * LINE, l.color, T));
      x += cellSize(c).w + GAP;
    }
    y += g.above + g.below + g.text + GAP;
  });
  return sheet.png;
}

async function main() {
  const mine = (p: Piece) => p.matter === 'stone' || p.key === 'wood-piece:big:plank' || p.key === 'packed-earth';
  const cellsOf = (g: Group) => PIECES.filter((p) => p.group === g && mine(p)).map(pieceCell);
  const title = (g: Group) => GROUPS.find((x) => x.key === g)!.title;
  // les assemblages de pièces posées (l'arc, la croisée, le manteau) : vus comme leurs pièces, le dessus raccourci de moitié
  const asm = (label: string, qs: Quad[], lines: Line[]): Cell => ({ views: [assembled(label, qs, PAL, 0.5)], lines });
  const head = (n: number, what: string) => [
    `MAISON DU COQ, CATALOGUE DES PIECES DE PIERRE ${n}/4 : ${what} (X4, 5 CM PAR PIXEL)`,
    'CHAQUE PIECE EN OBJET POSE AU SOL : FACE SUD EN VRAIE GRANDEUR, DESSUS RACCOURCI DE MOITIE. R0 VUE DU SUD, R1 A R3 UN QUART DE TOUR DE PLUS',
    'LE MUR COMME LE JEU MONTRE UN BATIMENT (DESSUS EN VRAIE GRANDEUR) ; L ARC, LA CROISEE, LE MANTEAU COMME LEURS PIECES. GABARIT : ATTENDU (DIMS) CONTRE MESURE (SILHOUETTE), 2 PX DE TOLERANCE',
  ];
  const sheets: { name: string; head: string[]; sections: Section[] }[] = [
    {
      name: 'coq-catalogue-pierre-1', head: head(1, 'LA PIERRE DE TAILLE, LES REFENDS'),
      sections: [
        { title: title('pierre'), cells: [...cellsOf('pierre'), wallCell()] },
        { title: title('cloisons'), cells: cellsOf('cloisons') },
      ],
    },
    {
      name: 'coq-catalogue-pierre-2', head: head(2, 'LES SOLS, LE TOIT, L ESCALIER'),
      sections: [
        { title: title('sols'), cells: cellsOf('sols') },
        { title: title('toit'), cells: [...cellsOf('toit'), await laveCell()] },
        { title: title('escalier'), cells: cellsOf('escalier') },
      ],
    },
    {
      name: 'coq-catalogue-pierre-3', head: head(3, 'LES BAIES'),
      sections: [{
        title: title('baies'),
        cells: [
          ...cellsOf('baies'), keystoneWideCell(),
          asm('L ARC ASSEMBLE', archAssembly(), [
            { text: 'LA PORTE EN ARC : 1,10 X 2,20 M, PLEIN CINTRE', color: GOLD },
            { text: 'CINQ ASSISES DE PIERRES DE TABLEAU DE CHAQUE COTE', color: WHITE },
            { text: 'DEUX SOMMIERS (LE LIT DU DESSUS EN BIAIS)', color: WHITE },
            { text: 'HUIT CLAVEAUX ET LA CLEF AU COQ', color: WHITE },
            { text: 'SANS LA PORTE DE CHENE (L AUTRE PLANCHE)', color: GREY },
          ]),
          asm('LA CROISEE ASSEMBLEE', crossAssembly(), [
            { text: 'LA CROISEE : JOUR DE 1,05 X 1,60 M', color: GOLD },
            { text: 'L APPUI, LE MENEAU DU BAS, LA TRAVERSE,', color: WHITE },
            { text: 'LE MENEAU DU HAUT, LE LINTEAU', color: WHITE },
            { text: 'SUR SIX ASSISES DE PIERRES DE TABLEAU', color: WHITE },
            { text: 'SANS VITRAIL NI VOLET (L AUTRE PLANCHE)', color: GREY },
          ]),
        ],
      }],
    },
    {
      name: 'coq-catalogue-pierre-4', head: head(4, 'LES CHEMINEES'),
      sections: [{
        title: title('cheminees'),
        cells: [
          ...cellsOf('cheminees'),
          asm('LE MANTEAU ASSEMBLE', mantelAssembly(), [
            { text: 'LA CHEMINEE DE SALLE : 2,40 M DE MANTEAU', color: GOLD },
            { text: 'DEUX JAMBAGES, DEUX CONSOLES DE HOTTE', color: WHITE },
            { text: 'HUIT CLAVEAUX EN PLATE-BANDE (JOINTS RAYONNANTS)', color: WHITE },
            { text: 'LE CONTRECOEUR AU FOND', color: WHITE },
            { text: 'LE CLAVEAU DU CATALOGUE EST CELUI DU MILIEU ;', color: GREY },
            { text: 'LES AUTRES, LE MEME BLOC TAILLE A SA PLACE', color: GREY },
          ]),
        ],
      }],
    },
  ];
  mkdirSync(OUT, { recursive: true });
  for (const s of sheets) {
    const png = render(s.head, s.sections);
    writeFileSync(join(OUT, `${s.name}.png`), PNG.sync.write(png));
    console.log(`${s.name} -> ${png.width} x ${png.height}`);
  }
  writeFileSync(join(OUT, 'coq-catalogue-pierre.json'), JSON.stringify(measures, null, 1));
  const bad = measures.filter((m) => !m.ok);
  console.log(`${measures.length} vues mesurées, ${bad.length} hors tolérance`);
  for (const m of bad) console.log(`  ${m.key} ${m.view} : attendu ${m.expected.join(' x ')}, mesuré ${m.drawn.join(' x ')}`);
}

main();
