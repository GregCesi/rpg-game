// Essai (chantier « maison du coq », hors jeu) : la planche-catalogue des pièces de bois, de fer, de verre, des meubles et des
// tentures de la maison du coq, chaque pièce vue de ses côtés (R0 à R3 selon sa symétrie), x4, Xéros à côté de chaque rangée.
// npx tsx tools/essai-coq-catalogue-bois.ts écrit .art-preview/coq-catalogue-bois-<n>.png et .art-preview/coq-catalogue-bois.json
// (pour chaque vue mesurée : la clé, la vue, la taille attendue par le gabarit, la taille dessinée, OK à 2 px près).
//
// Les pièces et leurs données : art/proposals/coq-catalogue-data.ts (la seule source) ; les dessins :
// art/proposals/coq-catalogue-bois.ts ; les images du jeu (porte intérieure, lit) : le registre d'art/index.ts. Rien n'entre au jeu.
//
// Le gabarit : `expectedOf` (src/content/gabarit.ts, `expectedSize`), la silhouette mesurée par `silhouette` (contour compris,
// ombre exclue), tolérance 2 px, plancher de lisibilité compris (un objet de moins de 6 px de large peut être agrandi en gardant
// ses proportions). Pour le bois couché (la règle D, STYLE.md section 8) la vue nord-sud a les dimensions de l'est-ouest
// inversées, et le bois debout la largeur de la même pièce couchée : ces vues sont jugées aussi par la règle D, que la formule de
// `expectedSize` (une boîte) ne connaît pas.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Grid, Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import { sources } from '../art/index';
import { renderPiece, rotQuads, withGroundShadow } from '../art/lib/volumes';
import { COQ_FURNITURE } from '../art/proposals/coq-maison';
import { PIECES, GROUPS, massOf, expectedOf, CARRY, type Piece, type Group } from '../art/proposals/coq-catalogue-data';
import {
  DRAWINGS, PAL, FURNITURE_VALIDATED, ROT, truss, railing, gameWood, lyingBatten, type Drawing,
} from '../art/proposals/coq-catalogue-bois';
import { silhouette, TOLERANCE } from '../src/content/gabarit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = 4, T = 2, LH = 12;
const MAXW = 2400, MAXH = 3000, PAD = 24, GAP = 40;
const BG: Rgb = [123, 133, 68];
const WHITE: Rgb = [255, 255, 255], GREY: Rgb = [220, 220, 205], GOLD: Rgb = [245, 215, 120], RED: Rgb = [255, 150, 130], GREEN: Rgb = [190, 240, 160];

// ---------- les pièces de ce catalogue ----------

const OTHER = new Set(['wood-piece:big:plank', 'packed-earth']);
const MINE = PIECES.filter((p) => (p.matter === 'wood' || p.matter === 'iron' || p.matter === 'fixed') && !OTHER.has(p.key));

/** Le bois couché (la règle D : nord-sud = est-ouest inversé) et le bois debout (règle D étendue). */
const LYING = new Set(['wood-piece:normal:beam-560', 'wood-piece:normal:beam-wallplate', 'wood-piece:normal:beam-120', 'wood-piece:normal:beam-purlin',
  'wood-piece:normal:beam-tie', 'wood-piece:normal:beam-plate', 'wood-piece:pole:lath', 'wood-piece:normal:rail', 'wood-piece:normal:beam-inner-lintel',
  'wood-piece:normal:beam-mantel']);
/** Debout : l'épaisseur de la même pièce couchée est-ouest (sa silhouette), et la tête (le bois de bout). */
const UPRIGHT: Record<string, () => { thick: number; head: number }> = {
  'wood-piece:normal:beam-kingpost': () => ({ thick: silhouette(gameWood('normal', 'beam', 100, 'ew'), PAL).h, head: 4 }),
  'wood-piece:normal:post': () => ({ thick: silhouette(lyingBatten(20, 1).views[0]!, PAL).h, head: 2 }),
  'wood-piece:pole:lath-baluster': () => ({ thick: 2, head: 1 }),
};

const MATTER: Record<string, string> = {
  'wood-piece:pole:lath': 'perche fendue (latte), patinée',
  'wood-piece:pole:lath-baluster': 'perche fendue (latte), patinée',
  'hoist-beam': 'chêne équarri, patiné ; poulie de bois, corde de chanvre',
  'leaded-glass': 'verre et plomb',
  'casement-shutter': 'chêne en planches, patiné ; pentures de fer',
  'window-bar': 'fer forgé',
  'oak-arch-door': 'chêne, deux épaisseurs de planches croisées, clous et pentures de fer',
  'inner-door': 'planches de chêne, patinées',
  'canopy-bed': 'chêne, patiné ; drap de garance, laine de guède',
  dresser: 'chêne, patiné ; étain',
  'high-chair': 'chêne, patiné ; coussin de drap',
  'kneading-trough': 'chêne, patiné',
  'writing-desk': 'chêne, patiné ; livres, papier',
  'tailor-table': 'chêne, patiné ; étoffes, osier',
  'cloth-bolt': 'drap, laine, lin',
  pewter: 'étain',
  'bed:unmade': 'bois de lit, drap de lin, couverture de laine',
  'verdure-tapestry': 'laine',
  'wall-hanging': 'laine (drap teint à la garance)',
  'hanging-rod': 'fer forgé',
};
const matterOf = (p: Piece) => (MATTER[p.key] ?? (p.matter === 'iron' ? 'fer forgé' : 'chêne équarri, patiné')).replace(/ ;/g, ' -'); // la police n'a pas de point-virgule
const statusOf = (p: Piece) => (p.key === 'bed:unmade' ? 'EXISTE : bed (NOUVEL ETAT : DEFAIT)'
  : p.existing ? `EXISTE : ${p.existing}` : p.woodLook ? 'NOUVEL ASPECT DU BOIS (wood.json)' : 'NOUVELLE');

// ---------- les images du jeu ----------

function gameImage(name: string): { grid: Grid; palette: Palette } {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'image') throw new Error(`essai-coq-catalogue-bois : image ${name} absente du registre`);
  return { grid: s.grid, palette: s.palette as Palette };
}

/** Les dessins d'une pièce, images du jeu comprises. */
function drawingsOf(p: Piece): Drawing[] {
  if (p.key === 'inner-door') {
    const v = [0, 1, 2, 3].map((r) => gameImage(r ? `inner-door-r${r}-worn` : 'inner-door-worn'));
    return [{ views: { 0: v[0].grid, 1: v[1].grid, 2: v[2].grid, 3: v[3].grid }, palette: v[0].palette, source: { 0: 'game', 1: 'game', 2: 'game', 3: 'game' } },
      { state: 'open', label: 'OUVERTE : LA MEME IMAGE, TOURNEE (inner-door-open)', views: {}, palette: v[0].palette, source: {} }];
  }
  if (p.key === 'bed:unmade') {
    const made = gameImage('bed-worn');
    return [{ state: 'made', label: 'LE LIT FAIT DU JEU (bed, SA SEULE VUE)', views: { 0: made.grid }, palette: made.palette, source: { 0: 'game' } }, ...DRAWINGS[p.key]()];
  }
  const d = DRAWINGS[p.key];
  if (!d) throw new Error(`essai-coq-catalogue-bois : pas de dessin pour ${p.key}`);
  const out = d();
  // les meubles : la vue validée par Grégoire (coq-maison.ts) à sa place, vérifiée contre le modèle refait
  const val = FURNITURE_VALIDATED[p.key];
  if (val) {
    const g = (COQ_FURNITURE as Record<string, () => Grid>)[val.fn]();
    const mine = out[0].views[val.view]!;
    SAME.push(`${p.key} ${val.fn} -> R${val.view} : ${g.join('\n') === mine.join('\n') ? 'IDENTIQUE' : 'DIFFERENT'}`);
    out[0].views[val.view] = g;
    out[0].source[val.view] = 'validated';
  }
  return out;
}
const SAME: string[] = [];

// ---------- la mesure ----------

interface Measure { key: string; state?: string; view: string; expected: [number, number]; drawn: [number, number]; ok: boolean; rule?: string; expectedRule?: [number, number]; okRule?: boolean }
const MEASURES: Measure[] = [];
const r1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (n: number) => String(r1(n)).replace('.', ',');

/** Dans la tolérance, à la taille réelle ou agrandie jusqu'au plancher de lisibilité (proportions gardées). */
function judge(e: { w: number; h: number; wMax: number }, w: number, h: number): boolean {
  if (Math.abs(w - e.w) <= TOLERANCE && Math.abs(h - e.h) <= TOLERANCE) return true;
  const k = Math.min(Math.max(w / e.w, 1), e.wMax / e.w);
  return Math.abs(w - e.w * k) <= TOLERANCE && Math.abs(h - e.h * k) <= TOLERANCE;
}

function measure(p: Piece, d: Drawing, r: 0 | 1 | 2 | 3, g: Grid): string[] {
  const turnedState = d.state === 'open' ? 1 : 0;
  const e = expectedOf(p, ((r + turnedState) % 4) as 0 | 1 | 2 | 3);
  const s = silhouette(g, d.palette);
  const m: Measure = { key: p.key, ...(d.state ? { state: d.state } : {}), view: `R${r}`, expected: [r1(e.w), r1(e.h)], drawn: [s.w, s.h], ok: judge(e, s.w, s.h) };
  const lines = [`R${r} : ATTENDU ${fmt(e.w)}X${fmt(e.h)}, MESURE ${s.w}X${s.h} : ${m.ok ? 'OK' : 'HORS TOLERANCE'}`];
  if (LYING.has(p.key) && r === 1 && d.views[0]) {
    // la règle D : la vue nord-sud a les dimensions de la vue est-ouest dessinée, inversées (à 1 px près, STYLE.md section 8)
    const s0 = silhouette(d.views[0], d.palette);
    m.rule = 'D'; m.expectedRule = [s0.h, s0.w];
    m.okRule = Math.abs(s.w - s0.h) <= 1 && Math.abs(s.h - s0.w) <= 1;
    lines.push(`   REGLE D (EST-OUEST DESSINE, INVERSE) ${s0.h}X${s0.w} : ${m.okRule ? 'OK' : 'HORS TOLERANCE'}`);
  }
  const up = UPRIGHT[p.key];
  if (up) {
    const { thick, head } = up();
    const want: [number, number] = [thick, p.dims.h / 5 + head];
    m.rule = 'D debout'; m.expectedRule = want;
    m.okRule = Math.abs(s.w - want[0]) <= 1 && Math.abs(s.h - want[1]) <= TOLERANCE;
    lines.push(`   REGLE D DEBOUT ${fmt(want[0])}X${fmt(want[1])} : ${m.okRule ? 'OK' : 'HORS TOLERANCE'}`);
  }
  MEASURES.push(m);
  return lines;
}

// ---------- la mise en page ----------

interface Img { grid: Grid; palette: Palette; cap: string }
interface Card { title: string[]; imgs: (Img | { sep: string })[]; lines: string[]; warn?: Set<number> }

const SEP = 10; // px du jeu entre deux vues
function cardOf(p: Piece): Card {
  const mass = massOf(p);
  const kg = Math.round(mass);
  const lines = [
    `${p.dims.w} X ${p.dims.d} X ${p.dims.h} CM${p.dims.ground ? ' (PIECE DE BATIMENT : PROFONDEUR ENTIERE)' : ''}`,
    `${kg < 1 ? fmt(mass) : kg} KG : XEROS SEUL ${mass <= CARRY ? 'OUI' : `NON (${kg} KG, IL EN PORTE ${CARRY})`}`,
    matterOf(p),
    statusOf(p),
  ];
  const warn = new Set<number>();
  const imgs: Card['imgs'] = [];
  for (const d of drawingsOf(p)) {
    if (d.state || d.label) imgs.push({ sep: d.label ?? d.state! });
    for (const r of [0, 1, 2, 3] as const) {
      const g = d.views[r];
      if (!g) continue;
      const src = d.source[r] === 'game' ? ' JEU' : d.source[r] === 'validated' ? ' VALIDE' : '';
      imgs.push({ grid: g, palette: d.palette, cap: `R${r}${src}` });
      const ml = measure(p, d, r, g);
      if (d.label || d.state) ml[0] = `${(d.state ?? '').toUpperCase()} ${ml[0]}`;
      for (const l of ml) { if (/HORS/.test(l)) warn.add(lines.length); lines.push(l); }
    }
  }
  if (p.views === 'symmetric') lines.push('SYMETRIQUE : R2 = R0, R3 = R1');
  if (p.views === 'round') lines.push('RONDE : UNE SEULE VUE');
  return { title: [p.name.toUpperCase(), p.key], imgs, lines, warn };
}

/** Les assemblages : la ferme, le garde-corps. */
function assemblies(g: Group): Card[] {
  if (g === 'charpente') {
    const face = withGroundShadow(renderPiece(truss(12), { k: 1 }));
    const house = withGroundShadow(renderPiece(rotQuads(truss(), ROT[3], [0, 0]), { k: 1 }));
    return [{
      title: ['LA FERME DE LA SALLE, ASSEMBLEE', 'entrait (2 moities entees), 2 arbaletriers, poincon, 2 pannes'],
      imgs: [{ grid: face, palette: PAL, cap: 'DE FACE (PANNES COUPEES A 60 CM)' }, { grid: house, palette: PAL, cap: 'DANS LA MAISON (NORD-SUD)' }],
      lines: ['ENTRAIT 6,60 M : DEUX POUTRES DE 3,60 ENTEES AU MILIEU', 'ARBALETRIERS A 45 DEGRES, TENONS DANS L ENTRAIT ET LE POINCON',
        'POINCON DE 3,40 M ; UNE PANNE DE 5 M SUR CHAQUE ARBALETRIER', 'LES PANNES PARTENT VERS LE NORD (LE REFEND)', 'DANS LA MAISON LA FERME EST VUE PAR LA TRANCHE'],
    }];
  }
  if (g === 'escalier') {
    const q = railing();
    return [{
      title: ['LE GARDE-CORPS DE LA TREMIE, ASSEMBLE', 'un cote de 2,80 m'],
      imgs: [0, 1].map((r) => ({ grid: withGroundShadow(renderPiece(rotQuads(q, ROT[r], [0, 0]), { k: 0.5 })), palette: PAL, cap: `R${r}` })),
      lines: ['DEUX POTEAUX DE CARRELET (1 M)', 'MAIN COURANTE ET LISSE BASSE (CARRELET COUCHE)', 'BALUSTRES : LA LATTE DEBOUT, TOUS LES 15 CM', 'LE RETOUR DE 1 M A SES DEUX AUTRES POTEAUX'],
    }];
  }
  return [];
}

const imgW = (i: Img) => Math.max(i.grid[0].length * K, textWidth(i.cap, T));
function cardW(c: Card): number {
  let w = 0;
  for (const i of c.imgs) w += 'sep' in i ? Math.max(SEP * K, textWidth(i.sep, T) + 16) : imgW(i) + SEP * K;
  return Math.max(w, ...[...c.title, ...c.lines].map((l) => textWidth(l, T)));
}
/** Au-dessus et au-dessous de la ligne de sol (px de l'écran) : la silhouette posée sur le sol. */
function extents(i: Img) {
  const s = silhouette(i.grid, i.palette);
  const bottom = s.y + s.h; // la rangée sous la silhouette
  let last = i.grid.length;
  while (last > bottom && !/[^.]/.test(i.grid[last - 1])) last--;
  return { above: bottom * K, below: (last - bottom) * K };
}

const xg = xeros.animations['idle-down'].frames[0];
const xs = silhouette(xg, xeros.palette);


function layout(groups: { g: Group; title: string; cards: Card[] }[]) {
  // les rangées : Xéros, puis des cartes tant qu'elles tiennent
  const XW = xs.w * K + GAP;
  type Line = { kind: 'title'; text: string; h: number } | { kind: 'row'; cards: Card[]; h: number; above: number; below: number; th: number };
  const lines: Line[] = [];
  for (const G of groups) {
    lines.push({ kind: 'title', text: G.title.toUpperCase(), h: 40 });
    let cur: Card[] = [], w = PAD + XW;
    const flush = () => {
      if (!cur.length) return;
      const ims = cur.flatMap((c) => c.imgs.filter((i): i is Img => !('sep' in i)));
      const above = Math.max(xs.h * K, ...ims.map((i) => extents(i).above));
      const below = Math.max(...ims.map((i) => extents(i).below), 0) + LH + 4;
      const th = Math.max(...cur.map((c) => c.title.length)) * LH + 8;
      const tl = Math.max(...cur.map((c) => c.lines.length)) * LH + 8;
      lines.push({ kind: 'row', cards: cur, h: th + above + below + tl + GAP, above, below, th });
      cur = []; w = PAD + XW;
    };
    for (const c of G.cards) {
      const cw = cardW(c);
      if (cur.length && w + cw > MAXW - PAD) flush();
      cur.push(c); w += cw + GAP;
    }
    flush();
  }
  // les pages
  const pages: Line[][] = [[]];
  let h = PAD + 30;
  lines.forEach((l, n) => {
    // un titre de groupe ne reste pas seul en bas de page : il part avec sa première rangée
    const need = l.kind === 'title' && lines[n + 1] ? l.h + lines[n + 1].h : l.h;
    if (h + need > MAXH && pages[pages.length - 1].length) { pages.push([]); h = PAD + 30; }
    pages[pages.length - 1].push(l); h += l.h;
  });
  return pages.map((ls, n) => {
    const width = Math.min(MAXW, Math.max(...ls.map((l) => (l.kind === 'row' ? PAD + XW + l.cards.reduce((s, c) => s + cardW(c) + GAP, 0) : textWidth(l.text, 3) + 2 * PAD))));
    const height = PAD + 30 + ls.reduce((s, l) => s + l.h, 0);
    const sheet = new Sheet(width, height, BG);
    sheet.text(`MAISON DU COQ : LES PIECES DE BOIS, DE FER, DE VERRE, LES MEUBLES ET LES TENTURES (X4, 5 CM PAR PIXEL) - PLANCHE ${n + 1}/${pages.length}`, PAD, PAD - 8, GOLD, T);
    let y = PAD + 30;
    for (const l of ls) {
      if (l.kind === 'title') { sheet.text(l.text, PAD, y + 8, GOLD, 3); y += l.h; continue; }
      const ground = y + l.th + l.above; // la rangée de l'écran sous la silhouette
      sheet.blit(xg, xeros.palette, PAD - xs.x * K, ground - (xs.y + xs.h) * K, K);
      let x = PAD + XW;
      for (const c of l.cards) {
        c.title.forEach((t, i) => sheet.text(t, x, y + i * LH, i ? WHITE : GOLD, T));
        let ix = x;
        for (const i of c.imgs) {
          if ('sep' in i) {
            sheet.rect(ix + 4, ground - l.above, 2, l.above, [100, 110, 55]);
            sheet.text(i.sep, ix + 12, ground + 8, GREEN, T);
            ix += Math.max(SEP * K, textWidth(i.sep, T) + 16);
            continue;
          }
          const s = silhouette(i.grid, i.palette);
          sheet.blit(i.grid, i.palette, ix, ground - (s.y + s.h) * K, K);
          sheet.text(i.cap, ix, ground + extents(i).below + 4, WHITE, T);
          ix += imgW(i) + SEP * K;
        }
        const ty = ground + l.below + 4;
        c.lines.forEach((t, i) => sheet.text(t, x, ty + i * LH, c.warn?.has(i) ? RED : i < 4 ? WHITE : GREY, T));
        x += cardW(c) + GAP;
      }
      y += l.h;
    }
    return sheet;
  });
}

function main() {
  const groups = GROUPS.filter((G) => MINE.some((p) => p.group === G.key)).map((G) => ({
    g: G.key, title: G.title, cards: [...assemblies(G.key), ...MINE.filter((p) => p.group === G.key).map(cardOf)],
  }));
  const sheets = layout(groups);
  const dir = join(ROOT, '.art-preview');
  mkdirSync(dir, { recursive: true });
  sheets.forEach((s, n) => {
    const out = join(dir, `coq-catalogue-bois-${n + 1}.png`);
    writeFileSync(out, (s.png.constructor as typeof import('pngjs').PNG).sync.write(s.png));
    console.log(`coq-catalogue-bois-${n + 1} (${s.w} x ${s.h}) -> ${out}`);
  });
  writeFileSync(join(dir, 'coq-catalogue-bois.json'), JSON.stringify(MEASURES, null, 1));
  for (const l of SAME) console.log(l);
  const bad = MEASURES.filter((m) => !m.ok);
  console.log(`${MEASURES.length} vues mesurées, ${bad.length} hors tolérance (gabarit strict) :`);
  for (const m of bad) console.log(`  ${m.key}${m.state ? ` (${m.state})` : ''} ${m.view} : attendu ${m.expected.join('x')}, dessiné ${m.drawn.join('x')}${m.rule ? `, règle ${m.rule} ${m.expectedRule!.join('x')} : ${m.okRule ? 'OK' : 'HORS'}` : ''}`);
  console.log(`pièces : ${MINE.map((p) => p.key).join(', ')}`);
}

main();
