// Essai hors jeu (chantier « hauteurs », CADRAGE-hauteurs.md, variante B retenue) : la planche de validation du volet de cabane
// (`cabin-shutter`, 60 × 4 × 60 cm), .art-preview/volet-cabane.png. Lancé par `npx tsx tools/essai-volet-cabane.ts` (après
// `npx tsx tools/recale-hauteurs.ts`, qui écrit les plans recalés de .art-preview/hauteurs/). Rien ici n'entre dans le jeu.
//
// Le dessin : art/proposals/cabin-shutter.ts (ses quatre vues ; ouvert, les mêmes images, une vue plus loin autour du gond). Les âges
// patiné et vieux : la même grille peinte de la rampe de l'âge (`agedPalette` de art/world/wood.ts, comme le build pour un objet
// `aged`). Les scènes (le bout de mur, la cabane) : la mécanique de tools/essai-hauteurs.ts (les pièces posées comme le jeu les
// monte, aux hauteurs recalées), le volet de 40 remplacé par le volet de cabane.

import { mkdirSync, writeFileSync } from 'node:fs';
import cabinShutter from '../art/proposals/cabin-shutter';
import { agedPalette } from '../art/world/wood';
import { expectedSize, TOLERANCE, type Dims } from '../src/content/gabarit';
import type { BuildPlaced, WoodPiece } from '../src/content/types';
import { boxOf, swung, type BuildPiece } from '../src/world/build';
import { blank, blit, rect, text, textWidth, toPng, type Img, type RGBA } from './lib/world-render';
import { GROUND, XEROS, band, crop, cut, enlarge, hex, overImg, planScene, png, renderScene } from './essai-hauteurs';

const PX = 5;
type Age = 'new' | 'worn' | 'old';
const AGES: Age[] = ['new', 'worn', 'old'];
const AGE_NAME: Record<Age, string> = { new: 'NEUF', worn: 'PATINE', old: 'VIEUX' };

// ---------------------------------------------------------------------------------------------------------------------------------
// Les images

const SOURCES = new Map(cabinShutter.map((s) => [s.name, s]));

/** Une vue du volet de cabane (`r` 0 à 3), à l'âge voulu. */
function shutter(r: number, age: Age = 'new'): Img {
  const s = SOURCES.get(r ? `cabin-shutter-r${r}` : 'cabin-shutter');
  if (!s) throw new Error(`essai-volet-cabane : pas de vue r${r}`);
  const pal = agedPalette(s.palette, age);
  const out = blank(s.grid[0].length, s.grid.length, [0, 0, 0, 0]);
  s.grid.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const c = pal[ch];
    if (!c) throw new Error(`essai-volet-cabane : couleur « ${ch} » hors palette`);
    out.data.set(hex(c), (y * out.w + x) * 4);
  }));
  return out;
}

/** Le volet actuel (`plank-shutter`, 60 × 40), tel que le build l'a tiré. */
function current(r: number): Img {
  const k = r ? `plank-shutter-r${r}` : 'plank-shutter';
  const i = png(k);
  if (!i) throw new Error(`essai-volet-cabane : pas d'image ${k} (npm run art)`);
  return i;
}

/** La silhouette : la boîte des pixels opaques (contour compris, sans ombre : le volet n'en a pas). */
function silhouette(img: Img): { w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.data[(y * img.w + x) * 4 + 3] === 255) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Les mesures (gabarit, docs/STYLE.md section 8)

const DIMS: Dims = { w: 60, d: 4, h: 60, shape: 'box' };
const report: string[] = [];
for (let r = 0; r < 4; r++) {
  const s = silhouette(shutter(r));
  const d: Dims = r % 2 ? { ...DIMS, w: DIMS.d, d: DIMS.w } : DIMS;
  const e = expectedSize(d);
  // une vue de face porte en plus la colonne des gonds (un pixel), comme le volet de 40
  const okW = s.w >= e.w - TOLERANCE && s.w <= e.wMax + TOLERANCE;
  const okH = s.h >= e.h - TOLERANCE && s.h <= e.hMax + TOLERANCE;
  report.push(`cabin-shutter${r ? `-r${r}` : ''} : silhouette ${s.w} x ${s.h} px, gabarit ${e.w.toFixed(1)} x ${e.h.toFixed(1)}${e.wMax !== e.w ? ` (jusqu'à ${e.wMax.toFixed(1)} x ${e.hMax.toFixed(1)} au plancher de lisibilité)` : ''} : ${okW && okH ? 'OK' : 'HORS GABARIT'}`);
}
for (let r = 0; r < 4; r++) {
  const s = silhouette(current(r));
  report.push(`plank-shutter${r ? `-r${r}` : ''} (actuel) : silhouette ${s.w} x ${s.h} px`);
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Les rangées d'objets posés sur une même ligne de sol

/** Des images posées côte à côte sur la même ligne de sol (le bas de chacune), sur l'herbe. */
function lineup(imgs: Img[], gap = 6, pad = 6): Img {
  const h = Math.max(...imgs.map((i) => i.h));
  const w = imgs.reduce((a, i) => a + i.w, 0) + gap * (imgs.length - 1);
  const out = blank(w + 2 * pad, h + 2 * pad, GROUND);
  let x = pad;
  for (const i of imgs) {
    overImg(out, i, x, pad + h - i.h);
    x += i.w + gap;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Ouvert : la vue fermée en fantôme, la vue ouverte pleine, à leur place (world/build.ts `swung`)

/** Le fantôme d'une image : son alpha au tiers. */
function ghost(img: Img): Img {
  const out = blank(img.w, img.h, [0, 0, 0, 0]);
  out.data.set(img.data);
  for (let i = 3; i < out.data.length; i += 4) out.data[i] = Math.round(out.data[i] * 0.35);
  return out;
}

/**
 * Le volet fermé dans la vue `view` et son ouvert, posés au sol (z = 0) comme world/build.ts les place : l'emprise au sol est celle
 * du volet de 40 (60 × 4 cm, la même : seule la hauteur change), qui porte le même `swing` à charnière de côté.
 */
function openScene(view: number): Img {
  const closed: BuildPlaced = { piece: { prop: 'plank-shutter' }, x: 100, y: 100, z: 0, view };
  const open = swung(closed);
  if (!open) throw new Error('essai-volet-cabane : le volet ne bat pas');
  const place = (p: BuildPlaced, img: Img) => {
    const b = boxOf(p);
    return { img, x: Math.round((b.x + b.w / 2) / PX - img.w / 2), y: Math.round((b.y + b.d) / PX) - img.h };
  };
  const a = place(closed, ghost(shutter(view)));
  const b = place(open, shutter(open.view));
  // le gond : le coin commun
  const x0 = Math.min(a.x, b.x) - 8;
  const y0 = Math.min(a.y, b.y) - 8;
  const out = blank(Math.max(a.x + a.img.w, b.x + b.img.w) - x0 + 8, Math.max(a.y + a.img.h, b.y + b.img.h) - y0 + 8, GROUND);
  for (const s of [a, b].sort((p, q) => p.y + p.img.h - (q.y + q.img.h))) overImg(out, s.img, s.x - x0, s.y - y0);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Le bout de mur de la cabane, vu de face : des rondins est-ouest de 30 cm d'assise (après recalage), la fenêtre de deux assises

const LOG = (length: number): WoodPiece => ({ size: 'normal', length, shape: 'round', peeled: true, axis: 'ew' } as WoodPiece);
let nextId = 9000;

/**
 * Un bout de mur sud de la cabane (la cabane met sa fenêtre au mur est, vue de chant ; ce bout de mur la montre de face, comme dans
 * un mur sud bâti au mode construction) : 7 assises de rondins de 30 cm (le rondin du normal, Ø 40, posé à 30 d'entraxe comme la
 * cabane recalée), l'ouverture de 60 cm sur les assises 4 et 5 (z 117 et 147, comme le mur est de la cabane), le volet dedans à
 * mi-épaisseur, fermé ou ouvert (tourné d'un quart vers le dehors, au sud).
 */
function wallFront(open: boolean, age: Age): Img {
  const y = 20;
  const pieces: BuildPiece[] = [];
  const add = (p: BuildPlaced) => pieces.push({ ...p, id: nextId++ });
  for (const z of [27, 57, 87, 177, 207]) add({ piece: { wood: LOG(240) }, x: 0, y, z, view: 0 });
  for (const z of [117, 147]) {
    add({ piece: { wood: LOG(90) }, x: 0, y, z, view: 0 });
    add({ piece: { wood: LOG(90) }, x: 150, y, z, view: 0 });
  }
  const closed: BuildPlaced = { piece: { prop: 'plank-shutter' }, x: 90, y: y + 20, z: 117, view: 0, age };
  add(open ? (swung(closed) as BuildPlaced) : closed);
  const s = renderScene(pieces, { mode: 'apres', cabinShutter: true, noRoof: true }, { x: 66, y: 16 }, 8);
  return s.img;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// La planche

const INK: RGBA = [250, 236, 200, 255];
const SOFT: RGBA = [210, 196, 160, 255];
const HOT: RGBA = [236, 160, 90, 255];
const BG: RGBA = [40, 31, 24, 255];
const W = 1800;
const sheet = blank(W, 6000, BG);
let cy = 16;

function frame(img: Img, x: number, y: number, w: number, h: number, c: RGBA): void {
  rect(img, x, y, w, 1, c);
  rect(img, x, y + h - 1, w, 1, c);
  rect(img, x, y, 1, h, c);
  rect(img, x + w - 1, y, 1, h, c);
}
function heading(s: string, sub: string[] = []): void {
  cy += 10;
  rect(sheet, 16, cy - 6, W - 32, 1, SOFT);
  text(sheet, s, 16, cy + 4, 3, INK);
  cy += 34;
  for (const l of sub) {
    text(sheet, l, 16, cy, 1, SOFT);
    cy += 12;
  }
  cy += 8;
}
interface Panel { img: Img; k: number; title: string[]; hot?: boolean }
function row(panels: Panel[], gap = 24): void {
  let x = 16;
  const top = cy;
  let bottom = cy;
  for (const p of panels) {
    const big = enlarge(p.img, p.k);
    const tw = Math.max(...p.title.map((t) => textWidth(t, 1)));
    p.title.forEach((t, i) => text(sheet, t, x, top + i * 11, 1, p.hot ? HOT : INK));
    const iy = top + p.title.length * 11 + 4;
    blit(sheet, big, x, iy);
    frame(sheet, x - 1, iy - 1, big.w + 2, big.h + 2, SOFT);
    x += Math.max(big.w, tw) + gap;
    bottom = Math.max(bottom, iy + big.h);
  }
  if (x > W) console.warn(`essai-volet-cabane : rangée trop large (${x} px)`);
  cy = bottom + 18;
}

cy += 4;
text(sheet, 'VOLET DE CABANE 60 X 60 (CABIN-SHUTTER) - A VALIDER', 16, cy, 3, INK);
cy += 30;
text(sheet, 'DESSIN - ART PROPOSALS CABIN-SHUTTER (PRET A INTEGRER). BOITE 60 X 4 X 60 CM, 5 CM PAR PIXEL, X4. MEME FACTURE QUE LE VOLET DE 40 (PLANK-SHUTTER), QUI RESTE CELUI DE LA MAISON.', 16, cy, 1, SOFT);
cy += 12;
text(sheet, 'FACE 12 X 12 PX (+ LA COLONNE DES GONDS - 13 X 12), CHANT 4 X 18 PX (PLANCHER DE LISIBILITE). PAS D OMBRE PORTEE - ACCROCHE AU MUR. XEROS (1,60 M) POUR L ECHELLE.', 16, cy, 1, SOFT);
cy += 14;

// --- 1. Les quatre vues, fermé, à côté du volet actuel et de Xéros ---
heading('1. FERME - LES QUATRE VUES, A COTE DU VOLET ACTUEL', [
  'R0 LE DEHORS (GONDS A GAUCHE, TETES DE CHEVILLES, FIL ET NOEUD), R1 DE CHANT (LE DEHORS A L OUEST), R2 LE DEDANS (LES DEUX TRAVERSES), R3 DE CHANT (LE DEHORS A L EST).',
  'POSES SUR LA MEME LIGNE DE SOL QUE XEROS (EN JEU, LE VOLET EST A HAUTEUR DE FENETRE).',
]);
row([
  { img: lineup([XEROS, current(0), current(1), current(2), current(3)]), k: 4, title: ['ACTUEL 60 X 40 X4', 'R0 13X8, R1 4X14, R2 13X8, R3 4X14'] },
  { img: lineup([XEROS, shutter(0), shutter(1), shutter(2), shutter(3)]), k: 4, title: ['CABANE 60 X 60 X4', 'R0 13X12, R1 4X18, R2 13X12, R3 4X18'], hot: true },
]);
row([
  { img: lineup([shutter(0), current(0)], 4), k: 8, title: ['DEHORS X8', 'CABANE / ACTUEL'], hot: true },
  { img: lineup([shutter(2), current(2)], 4), k: 8, title: ['DEDANS X8', 'CABANE / ACTUEL'], hot: true },
  { img: lineup([shutter(1), shutter(3), current(1), current(3)], 4), k: 8, title: ['CHANTS X8', 'R1 R3 CABANE / ACTUEL'], hot: true },
]);

// --- 2. Les trois âges ---
heading('2. LES TROIS AGES - NEUF, PATINE, VIEUX', [
  'LA MEME GRILLE PEINTE DE LA RAMPE DE L AGE (WOODAGES DE ART PALETTE, AGEDPALETTE DE ART WORLD WOOD) : LE BUILD TIRE CABIN-SHUTTER-WORN ET -OLD POUR UN OBJET AGED.',
]);
row(AGES.map((age) => ({ img: lineup([0, 1, 2, 3].map((r) => shutter(r, age))), k: 4, title: [`${AGE_NAME[age]} X4`, 'R0 R1 R2 R3'], hot: true })));

// --- 3. Ouvert ---
heading('3. OUVERT (CABIN-SHUTTER-OPEN) - LES MEMES IMAGES, UNE VUE PLUS LOIN', [
  'SWING A CHARNIERE DE COTE, COMME PLANK-SHUTTER-OPEN : OUVRIR, C EST TOURNER D UN QUART VERS LE DEHORS AUTOUR DU GOND (WORLD BUILD SWUNG).',
  'EN FANTOME LE FERME, EN PLEIN L OUVERT, A LEUR PLACE AU SOL (Z = 0 ICI POUR LA LECTURE). FERME R0 -> OUVERT R1, R1 -> R2, R2 -> R3, R3 -> R0.',
]);
row([0, 1, 2, 3].map((v) => ({ img: openScene(v), k: 4, title: [`FERME R${v} -> OUVERT R${(v + 1) % 4}`, 'X4'], hot: true })));

// --- 4. Dans le mur ---
heading('4. DANS LE MUR DE LA CABANE - LA FENETRE DE DEUX ASSISES', [
  'A - UN BOUT DE MUR SUD EN RONDINS (7 ASSISES DE 30 CM, APRES RECALAGE), L OUVERTURE DE 60 CM SUR LES ASSISES 4 ET 5 (Z 117 ET 147), LE VOLET A MI-EPAISSEUR, FERME PUIS OUVERT VERS LE SUD.',
  'B - LA CABANE (PLAN RECALE), MUR EST, COUPE A 1,77 M : LA FENETRE VUE DE CHANT (REGLE D), LE VOLET FERME PUIS OUVERT. LE MUR EST ENTIER LA COUVRE (LES ASSISES DU DESSUS).',
]);
row([
  { img: wallFront(false, 'new'), k: 4, title: ['A - FERME X4'], hot: true },
  { img: wallFront(true, 'new'), k: 4, title: ['A - OUVERT X4'], hot: true },
  { img: wallFront(false, 'old'), k: 4, title: ['A - FERME, VOLET VIEUX X4'], hot: true },
]);
{
  const r = band('cabane', 54, 30, 100, 2);
  const east = (o: { cutAbove?: number }) => {
    const s = planScene('cabane', { mode: 'apres', cabinShutter: true, noRoof: true, cutAbove: o.cutAbove });
    return cut(s, r);
  };
  row([
    { img: east({ cutAbove: 177 }), k: 4, title: ['B - MUR EST, COUPE A 1,77 M X4', 'VOLET FERME (R3)'], hot: true },
    { img: openEast(), k: 4, title: ['B - MUR EST, COUPE A 1,77 M X4', 'VOLET OUVERT (R0)'], hot: true },
    { img: east({}), k: 4, title: ['B - MUR EST ENTIER X4'], hot: true },
  ]);
}

/** Le mur est de la cabane, coupé à 1,77 m, le volet ouvert : la même scène, le volet remplacé par son ouvert. */
function openEast(): Img {
  // planScene ne sait pas ouvrir : on rend la scène fermée puis ouverte avec les pièces du plan, le volet battu
  const s = planScene('cabane', { mode: 'apres', cabinShutter: true, noRoof: true, cutAbove: 177, openShutters: true });
  return cut(s, band('cabane', 54, 30, 100, 2));
}

const out = crop(sheet, 0, 0, W, cy + 10);
mkdirSync('.art-preview', { recursive: true });
writeFileSync('.art-preview/volet-cabane.png', toPng(out));
console.log(report.join('\n'));
console.log(`.art-preview/volet-cabane.png : ${W} x ${cy + 10}`);
