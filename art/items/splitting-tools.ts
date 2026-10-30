// Les outils du fendage : la masse de bûcheron et le coin de fendage (docs/objets/maul.md, splitting-wedge.md) :
// icônes, images au sol, objets tenus, et la masse en main pendant les gestes (planche tool-maul, art/items/held.ts).
// Échelle du jeu (5 cm par pixel), lumière en haut à gauche, contour d'un pixel (teinte la plus sombre de la matière en
// haut et à gauche, OUTLINE en bas et à droite).

import { Canvas, type Grid } from '../lib/canvas';
import { GRIP, TOOL_SIZE, gripOf, orientedZones, type ToolArt } from '../lib/held';
import { lightUp, type Material, type Materials } from '../lib/light';
import type { ArtSource, ImageSource, SpriteSheetSource } from '../lib/types';
import { BRANCH_FIST, FIST, behindHead, fistGap, sheet } from './carried';
import { darkest, outline } from './lib';
import { lyingView } from './lying';
import { toolPalette } from './tools';

/**
 * Palette des deux outils : celle des outils, plus le fer bleuté du coin (le fer 2 3 4 refroidi vers le bleu de l'eau
 * W w q, pour qu'on le distingue de la masse et de la hache ; l'ombre glisse vers le brun-violet, comme le reste).
 */
export const splittingPalette = {
  ...toolPalette,
  I: '#adb6b6', // fer bleuté éclairé, tête martelée du coin
  p: '#7b8790', // fer bleuté
  s: '#4f5563', // fer bleuté dans l'ombre, contour côté lumière
};

// ---------- Masse de bûcheron ----------
// Tête de fer de 15 × 8 × 8 cm sur un manche de 80 cm (16 px). En main, la prise (main la plus proche de la tête) est à
// 3 px du bout du manche, sous la seconde main ; la tête commence 9 px plus haut. Comme le fer de la hache, la tête est
// grossie du double pour se lire : de profil (coup horizontal, sur l'épaule de profil), un marteau de 6 px en travers du
// manche sur 4 de haut, ses deux faces de frappe claires ; par la tranche (coup vertical, sur l'épaule de face et de
// dos), un bloc carré de 6 × 5 px, plus large que le bloc de la hache (4) et pas plus long (5). Fer forgé gris sombre,
// moins noir que celui de la hache.

/** Bout du manche, derrière la prise, en pixels le long du manche (négatif : vers le bas de l'outil). */
const MAUL_TAIL = -3;
/** La tête le long du manche depuis la prise, par la tranche (bloc carré) : [pied, haut[. */
const MAUL_BLOCK: [number, number] = [9, 14];
/** La tête de profil (marteau) : [pied, haut[. */
const MAUL_HAMMER: [number, number] = [10, 14];
/** La tête en travers du manche (le manche est sur 0 et 1) : de −2 à 3, six pixels. */
const MAUL_ACROSS: [number, number] = [-2, 3];

/** Bois du manche à `a` le long du manche (de la prise vers la tête), ou rien hors du manche. */
function maulWood(a: number, top: number): string | null {
  if (a < MAUL_TAIL || a >= top) return null;
  if (a < MAUL_TAIL + 1) return 'N'; // bout du manche, bois de bout
  return a < 1.5 ? 'w' : 'M'; // poignée patinée par les deux mains
}

/**
 * La masse debout ou couchée vers l'est, en zones : `deg` 90 (tête en haut) ou 0 (tête à droite). `view` : de profil
 * (`face`, le marteau et ses faces de frappe `h`) ou par la tranche (`edge`, le bloc). Le manche est sur les colonnes
 * (rangées) GRIP et GRIP + 1, la main tient le pixel GRIP.
 */
function maulStraight(deg: 0 | 90, view: 'face' | 'edge'): Canvas {
  const c = new Canvas(TOOL_SIZE, TOOL_SIZE);
  const [gx, gy] = GRIP;
  const [foot, top] = view === 'edge' ? MAUL_BLOCK : MAUL_HAMMER;
  for (let y = 0; y < TOOL_SIZE; y++) for (let x = 0; x < TOOL_SIZE; x++) {
    const a = deg === 90 ? gy + 1 - (y + 0.5) : x + 0.5 - gx;
    const across = deg === 90 ? x - gx : y - gy;
    let z: string | null = null;
    if (a >= foot && a < top && across >= MAUL_ACROSS[0] && across <= MAUL_ACROSS[1]) {
      const end = across === MAUL_ACROSS[0] || across === MAUL_ACROSS[1];
      z = view === 'face' && end ? 'h' : 'f';
    } else if (across === 0 || across === 1) z = maulWood(a, foot);
    if (z) c.set(x, y, z);
  }
  return c;
}

/**
 * La masse en diagonale, tête vers le haut à droite, en zones : le manche est l'escalier de deux pixels à 45°, la tête un
 * rectangle tourné, aux bords d'équerre avec le manche. Repère : v = x + y − (gx + gy) en travers (le manche sur v = 0
 * et 1), u = x − y − (gx − gy) le long du manche (2 par pas de diagonale, soit 1,4 px), comme la hache par la tranche.
 */
function maulDiag(view: 'face' | 'edge'): Canvas {
  const c = new Canvas(TOOL_SIZE, TOOL_SIZE);
  const [gx, gy] = GRIP;
  // par la tranche, le bloc : 7 valeurs de u (5 px), 8 de v (6 px) ; de profil, le marteau : 6 valeurs de u (4 px)
  const [u0, u1] = view === 'edge' ? [12, 18] : [13, 18];
  for (let y = 0; y < TOOL_SIZE; y++) for (let x = 0; x < TOOL_SIZE; x++) {
    const u = x - y - (gx - gy), v = x + y - (gx + gy);
    let z: string | null = null;
    if (u >= u0 && u <= u1 && v >= -3 && v <= 4) z = view === 'face' && (v <= -2 || v >= 3) ? 'h' : 'f';
    else if ((v === 0 || v === 1) && u >= -4 && u < u0) z = u <= -3 ? 'N' : u <= 2 ? 'w' : 'M';
    if (z) c.set(x, y, z);
  }
  return c;
}

/** Matières de la masse en main : chaque zone retrouve sa rampe, éclairée après rotation. */
const maulMaterials: Materials = (() => {
  // fer forgé gris sombre : relevé (3) face à la lumière, sombre (4) de face, presque noir (0) dans l'ombre
  const iron: Material = { light: '3', base: '4', shade: '0', dark: '0' };
  const wood: Material = { light: 'M', base: 'M', shade: 'm', dark: 'K' };
  return {
    f: iron,
    h: { light: '2', base: '3', shade: '4', dark: '0' }, // faces de frappe, polies par les coups
    M: wood,
    w: { light: 'm', base: 'm', shade: 'N', dark: 'K' }, // bois patiné de la poignée
    N: { light: 'N', base: 'N', shade: 'N', dark: 'K' }, // bout du manche, bois de bout
  };
})();

/** La masse tenue en main : les cinq dessins des gestes, en zones, et leurs matières (art/lib/held.ts). */
export const maulArt = (): ToolArt => ({
  // de profil (le marteau), pour un coup horizontal
  diag: maulDiag('face').toGrid(),
  upright: maulStraight(90, 'face').toGrid(),
  // par la tranche (le bloc), pour un coup vertical
  flat: maulStraight(0, 'edge').toGrid(),
  flatDiag: maulDiag('edge').toGrid(),
  flatEnd: maulStraight(90, 'edge').toGrid(),
  materials: maulMaterials,
});

const S = 16;

/** Teinte la plus sombre de chaque matière, pour le contour côté lumière des icônes et des images au sol. */
const dark = darkest({
  M: 'K', m: 'K', N: 'K', K: 'K', '1': '0', '2': '0', '3': '0', '4': '0', '0': '0', I: 's', p: 's', s: 's',
}, 'o');

/**
 * Icône de la masse, 16 × 16, pas à l'échelle, comme l'icône de la hache : manche en diagonale du bas à gauche vers le
 * haut à droite, la tête en travers en haut à droite, un bloc de fer trapu, ses deux faces de frappe claires. Plus
 * courte et plus massive que la hache.
 */
function maulIcon(): Canvas {
  const c = new Canvas(S, S);
  // manche de deux pixels en escalier sur x + y = 15, du bas à gauche jusque sous la tête
  for (let y = 6; y <= 13; y++) c.set(15 - y, y, 'M').set(16 - y, y, 'm');
  c.set(2, 13, 'm').set(3, 12, 'm'); // poignée patinée
  c.set(1, 14, 'N').set(2, 14, 'N'); // bout du manche
  // tête : rectangle tourné à 45°, en travers du manche (le long de x − y), centrée sur le haut du manche
  const cx = 11.5, cy = 4.5;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const px = x + 0.5 - cx, py = y + 0.5 - cy;
    const along = (px - py) * Math.SQRT1_2; // le long du manche, vers le haut à droite
    const across = (px + py) * Math.SQRT1_2; // en travers, vers le bas à droite
    if (Math.abs(along) > 1.9 || Math.abs(across) > 4.4) continue;
    const k = across < -3.3 ? '2' : across > 3.3 ? '3' // faces de frappe
      : along > 1 || across < -2 ? '3' : along < -0.9 || across > 2.2 ? '0' : '4';
    c.set(x, y, k);
  }
  return outline(c, dark);
}

/**
 * Ombre portée d'une image au sol : sous la rangée la plus basse de la silhouette, décalée d'un pixel vers la droite
 * (STYLE, section 2). Ajoute une rangée à l'image.
 */
function groundShadow(c: Canvas): Grid {
  const g = c.toGrid();
  const last = g[g.length - 1];
  const shadow = [...last].map((_, x) => (x > 0 && last[x - 1] !== '.' ? 'x' : '.')).join('');
  return [...g, shadow];
}

/**
 * La masse couchée par terre (`maul-ground`, 80 × 15 × 8 cm : 16 × 3 px, contour compris) : le manche à l'horizontale
 * (un pixel), la tête de fer au bout droit, plus haute que le manche (son dessus clair, sa face sud plus sombre). Ombre
 * portée dessous, décalée vers la droite.
 */
function maulGround(): Grid {
  const c = new Canvas(16, 4);
  c.set(1, 2, 'N'); // bout du manche
  for (let x = 2; x <= 10; x++) c.set(x, 2, 'M');
  c.stamp(['223', '344'], 11, 1); // la tête : dessus, face sud
  return groundShadow(outline(c, dark));
}

/**
 * Les trois autres vues de la masse au sol (règle D : `-r1`, `-r3` nord-sud, 4 × 15 px ; `-r2` est-ouest, 15 × 4, contour
 * compris), chacune un quart de tour de plus dans le sens des aiguilles d'une montre. La tête garde sa lumière : dessus
 * clair à gauche, face sud sombre ; à l'ouest, le manche reste au pied de la tête, plus haute que lui.
 */
const MAUL_VIEWS: Record<'r1' | 'r2' | 'r3', Grid> = {
  // tête au sud : le manche descend le long de la colonne ouest, la tête au bout (dessus, puis face sud)
  r1: ['N.', ...Array(9).fill('M.'), '22', '23', '34'],
  // tête à l'ouest : la même tête, le manche vers l'est, son bout (N) au bout est
  r2: ['223..........', '344MMMMMMMMMN'],
  // tête au nord : la tête en haut (dessus, face sud), le manche descend le long de la colonne est
  r3: ['22', '23', '34', ...Array(9).fill('.M'), '.N'],
};

// ---------- Coin de fendage ----------
// Fer, 20 × 7 × 4 cm : une tête plate et large en haut, martelée (elle s'évase d'un pixel sous les coups), le corps
// qui s'amincit en coin vers le bas.

/**
 * Icône du coin, 16 × 16, vu de côté (par son épaisseur), la pointe en bas : la tête martelée en haut, son dessus clair et
 * un rebord qui déborde du corps ; le corps qui s'effile en V jusqu'à la pointe ; éclairé à gauche, sombre à droite.
 */
function wedgeIcon(): Canvas {
  const c = new Canvas(S, S);
  for (let x = 5; x <= 10; x++) c.set(x, 2, 'I'); // dessus de la tête
  c.set(4, 3, 'I').set(11, 3, 's');
  for (let x = 5; x <= 10; x++) c.set(x, 3, 'p'); // rebord martelé
  for (let y = 4; y <= 13; y++) {
    const half = 3 * (1 - (y - 4) / 10) + 0.2;
    const x0 = Math.round(8 - half), x1 = Math.round(8 + half) - 1;
    for (let x = x0; x <= x1; x++) c.set(x, y, x1 === x0 ? 'p' : x === x0 ? 'I' : x === x1 ? 's' : 'p');
  }
  return outline(c, dark);
}

/**
 * Le coin couché par terre (`splitting-wedge-ground`, 20 × 7 × 4 cm, agrandi au plancher de lisibilité : 6 × 4 px,
 * contour compris) : la tête à gauche, plus haute (son dessus clair, sa face sud), le corps qui s'effile vers la pointe à
 * droite. Ombre dessous.
 */
function wedgeGround(): Grid {
  const c = new Canvas(6, 4);
  c.stamp(['IIpp', 'Ip..'], 1, 1);
  return groundShadow(outline(c, dark));
}

/**
 * Les trois autres vues du coin au sol (règle D : `-r1`, `-r3` nord-sud, 4 × 6 px ; `-r2` est-ouest, 6 × 4, contour
 * compris), chacune un quart de tour de plus dans le sens des aiguilles d'une montre : la tête martelée au nord, à l'est,
 * puis au sud. La tête : son dessus clair (I), sa face sud (p) ; le corps qui s'effile, plus étroit que la tête.
 */
const WEDGE_VIEWS: Record<'r1' | 'r2' | 'r3', Grid> = {
  // tête au nord, pointe au sud
  r1: ['II', 'Ip', '.p', '.p'],
  // tête à l'est, pointe à l'ouest
  r2: ['ppII', '..Ip'],
  // tête au sud, pointe au nord
  r3: ['I.', 'p.', 'II', 'Ip'],
};

/** Matière du coin tenu en main (fer bleuté), éclairée par lightUp. */
const wedgeMaterials: Materials = {
  i: { light: 'I', base: 'p', shade: 's', dark: 's' },
};

/**
 * Le coin pend au poing, la tête serrée dans la main (le poing, 2 × 2, passe par-dessus), la pointe en bas : de face et de
 * dos, son flanc large (7 cm, deux pixels), qui s'effile ; de profil, sa tranche (4 cm), plus étroite.
 */
const WEDGE_HELD_FRONT: Grid = [
  'ii',
  'ii',
  'ii',
  'ii',
  'i.',
];
const WEDGE_HELD_SIDE: Grid = [
  'ii',
  'ii',
  'i.',
  'i.',
];

const WEDGE_SIZE = 11;

function heldWedgeView(view: 'down' | 'up' | 'right'): Grid {
  const C = Math.floor(WEDGE_SIZE / 2);
  const c = new Canvas(WEDGE_SIZE, WEDGE_SIZE);
  // la tête dans le poing (rangées C − 1 et C), les colonnes du poing (C et C + 1)
  c.stamp(view === 'right' ? WEDGE_HELD_SIDE : WEDGE_HELD_FRONT, C, C - 1);
  const g = lightUp(c.toGrid(), wedgeMaterials);
  return view === 'up' ? g : fistGap(g, C, BRANCH_FIST);
}

// ---------- La masse sur l'épaule ----------
// Comme la hache (held-axe, art/items/carried.ts) : le poing droit tient le manche près du bout, devant la poitrine ; le
// manche passe sur l'épaule ; la tête est derrière l'épaule, à hauteur de tête, plus bas que le fer de la hache (la masse
// est plus courte). De face et de dos, on voit la tête par le bout (le bloc carré) ; de profil, le marteau.

const MAUL_SIZE = 33;
const MAUL_C = Math.floor(MAUL_SIZE / 2);

/**
 * La masse par le bout de la tête, manche presque debout qui penche vers le dehors (vers la gauche de l'image ; `mirror` :
 * vers la droite). `from` : première rangée dessinée, en pixels au-dessus de la prise (de dos, ce qui est sous l'épaule
 * est caché par le corps).
 */
function maulEdgeZones(mirror: boolean, from = MAUL_TAIL): Canvas {
  const c = new Canvas(MAUL_SIZE, MAUL_SIZE);
  const lean = 0.45; // pixels vers le dehors par rangée qui monte
  const [foot, top] = MAUL_BLOCK;
  for (let up = Math.max(from, MAUL_TAIL); up < top; up++) {
    const off = Math.round(Math.min(up, foot) * lean);
    const x0 = mirror ? MAUL_C + off : MAUL_C - off; // pixel gauche du manche (2 px)
    const y = MAUL_C - up;
    if (up >= foot) {
      for (let k = MAUL_ACROSS[0]; k <= MAUL_ACROSS[1]; k++) c.set(x0 + k, y, 'f');
      continue;
    }
    const z = maulWood(up + 0.5, foot)!;
    c.set(x0, y, z).set(x0 + 1, y, z);
  }
  return c;
}

/** La masse de profil, tête vers le haut à gauche (derrière son dos). */
function maulSide(): Canvas {
  const art = maulArt();
  const zones = orientedZones(art, 'nw', 'cw');
  const [gx, gy] = gripOf('nw', 'cw');
  return new Canvas(MAUL_SIZE, MAUL_SIZE).stamp(zones, MAUL_C - gx, MAUL_C - gy);
}

const heldMaul = (): SpriteSheetSource => {
  const m = maulMaterials;
  return sheet('held-maul', MAUL_SIZE, toolPalette, {
    down: behindHead(fistGap(lightUp(maulEdgeZones(false).toGrid(), m), MAUL_C, FIST), 'down'),
    up: lightUp(maulEdgeZones(true, 4).toGrid(), m),
    right: behindHead(fistGap(lightUp(maulSide().toGrid(), m), MAUL_C, FIST), 'right'),
  });
};

const heldWedge = (): SpriteSheetSource =>
  sheet('held-splitting-wedge', WEDGE_SIZE, splittingPalette, {
    down: heldWedgeView('down'), up: heldWedgeView('up'), right: heldWedgeView('right'),
  });

const img = (name: string, grid: Grid, palette = splittingPalette): ImageSource => ({ kind: 'image', name, palette, grid });

const sources: ArtSource[] = [
  img('item-maul', maulIcon().toGrid()),
  img('maul-ground', maulGround()),
  img('maul-ground-r1', lyingView(MAUL_VIEWS.r1, dark, true)),
  img('maul-ground-r2', lyingView(MAUL_VIEWS.r2, dark, false)),
  img('maul-ground-r3', lyingView(MAUL_VIEWS.r3, dark, true)),
  heldMaul(),
  img('item-splitting-wedge', wedgeIcon().toGrid()),
  img('splitting-wedge-ground', wedgeGround()),
  img('splitting-wedge-ground-r1', lyingView(WEDGE_VIEWS.r1, dark, true)),
  img('splitting-wedge-ground-r2', lyingView(WEDGE_VIEWS.r2, dark, false)),
  img('splitting-wedge-ground-r3', lyingView(WEDGE_VIEWS.r3, dark, true)),
  heldWedge(),
];

export default sources;
