// Mobilier et objets de ferme posables (tonneau, caisse, botte de foin, coffre, table, tabouret, puits).
// Les petits meubles sont dessinés à leur taille réelle (gabarit, docs/STYLE.md section 8 : 5 cm par pixel).
// Vue de trois quarts, lumière nord-ouest, ancrage en bas au centre, ombre portée `x` décalée vers la droite.
// Contour d'un pixel : teinte la plus sombre de la matière en haut et à gauche, OUTLINE en bas et à droite.

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

/** Teinte la plus sombre de chaque matière : contour côté lumière (STYLE.md, section 3). */
const DARKEST: Record<string, string> = {
  M: 'K', m: 'K', N: 'K', K: 'K',
  R: 'Z', r: 'Z', z: 'Z', Z: 'Z',
  Y: 'P', t: 'P', T: 'P', P: 'P',
};

/** Contour : côté haut-gauche, teinte la plus sombre de la matière voisine ; côté bas-droite, OUTLINE. */
function shadedOutline(c: Canvas, darkest: Record<string, string> = DARKEST): Canvas {
  const add: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.get(x, y) !== EMPTY) continue;
    let side = 0;
    let lit: string | null = null;
    let any = false;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const n = c.get(x + dx, y + dy);
      if (n === EMPTY || n === 'x') continue;
      any = true;
      side += dx + dy;
      if (dx + dy > 0 && !lit) lit = n;
    }
    if (!any) continue;
    add.push([x, y, side > 0 && lit ? darkest[lit] ?? 'o' : 'o']);
  }
  for (const [x, y, col] of add) c.px[y][x] = col;
  return c;
}

/** Ombre portée : ellipse translucide qui ne remplit que les pixels encore vides. */
function groundShadow(c: Canvas, cx: number, cy: number, rx: number, ry: number): Canvas {
  const s = new Canvas(c.w, c.h).ellipse(cx, cy, rx, ry, 'x');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (s.get(x, y) !== EMPTY && c.get(x, y) === EMPTY) c.set(x, y, 'x');
  }
  return c;
}

// ---------- Petits meubles, dessinés à la main à leur taille réelle ----------

/**
 * Petit meuble dessiné pixel par pixel : `fill` est la matière seule, sans contour (silhouette = fill + 2 px).
 * Image : 2 px de marge à gauche et à droite (le `body` de props.json est centré sur l'image), la silhouette en haut,
 * deux rangées d'ombre portée dessous : le bas de la silhouette est à 3 rangées du bas de l'image.
 */
function furniture(fill: Grid, darkest = WOOD_DARKEST): Canvas {
  const c = new Canvas(fill[0].length + 6, fill.length + 4);
  c.stamp(fill, 3, 1);
  shadedOutline(c, darkest);
  return furnitureShadow(c, fill[0].length);
}

/** Ombre portée sous un petit meuble, décalée vers la droite. */
function furnitureShadow(c: Canvas, fw: number): Canvas {
  return groundShadow(c, 3 + fw / 2 + 1.5, c.h - 2, fw / 2 + 1.5, 1.6);
}

// ---------- Tonneau ----------

/**
 * Tonneau cerclé de fer, debout (Ø 60 cm, 90 cm de haut, cylindre debout). Gabarit : 12 × (18 + 6) = 12 × 24 px.
 * Fond supérieur vu de dessus (jable clair, fond en retrait, bonde), quatre douelles et leurs joints, ventre plus
 * large que les bouts, deux cercles de fer qui plongent au milieu (la courbure vue de trois quarts). Image 16 × 26.
 */
function barrel(): Canvas {
  return furniture([
    '..MYYYMm..',
    '.MNNNNNNm.',
    '.MmmmmKmm.',
    '.MMMMmmmN.',
    '.MmMmNmNK.',
    'RRmMmNmNZZ',
    'zzRrrrzzZZ',
    'MMzzzzZZKK',
    'MMmMmNmNKK',
    'MYmMmNmNKK',
    'MYmMmNmNKK',
    'MYmMmNmNKK',
    'MMmMmNmNKK',
    'MMmMmNmNKK',
    'MMmMmNmNKK',
    'MMmMmNmNKK',
    'RRmMmNmNZZ',
    'zzRrrrzzZZ',
    'MMzzzzZZKK',
    '.MmMmNmNK.',
    '.MmMmNmNK.',
    '..mMmNmN..',
  ]);
}

// ---------- Caisse ----------

/**
 * Caisse de planches clouées (60 × 50 × 50 cm, boîte). Gabarit : 12 × (10 + 5) = 12 × 15 px.
 * Dessus à lattes est-ouest dans le bois clair ; face sud dans l'ombre, cadre et écharpe en diagonale. Image 16 × 17.
 */
function crate(): Canvas {
  return furniture([
    'MYYYYYYMMm',
    'MMMMMMMMMm',
    'mmmmmmmmmN',
    'MMMMMMMMMm',
    'mmmmmmmmmN',
    'mNNNNNNmmN',
    'mNNNNNmmKN',
    'mNNNNmmKNN',
    'mNNNmmKNNN',
    'mNNmmKNNNN',
    'mNmmKNNNNN',
    'mmmmmmmmmN',
    'NNNNNNNNNK',
  ]);
}

// ---------- Botte de foin ----------

/**
 * Botte de paille liée de deux ficelles, couchée est-ouest (90 × 45 × 35 cm, boîte). Gabarit : 18 × (7 + 4,5) = 18 × 11,5 px.
 * Dessus clair, face sud et bout est dans l'ombre, brins couchés dans le sens de la botte. Image 22 × 14.
 */
function hayBale(): Canvas {
  const c = furniture([
    '.YYYNPYYYYYNPYt.',
    'YtttNPYYYtttNPYT',
    'YYYYNPYttYYYNPtT',
    'YYYYNPYYYYYYNPYT',
    'tTTTMPTTTTTTMPTT',
    'tttTNPttTTTtNPtT',
    'tttttPtTTTttNPtT',
    'TTttNPtttTTtNPTT',
    'tTTTNPTTTttTNPTT',
    '.TTTNPTTTTTTNPT.',
  ], DARKEST);
  // brins ébouriffés, posés sur le contour du dessus (ils n'agrandissent pas la silhouette)
  c.set(6, 0, 'Y').set(12, 0, 'Y');
  return c;
}

// ---------- Coffre ----------

/**
 * Coffre de bois ferré (90 × 50 × 55 cm, boîte). Gabarit : 18 × (11 + 5) = 18 × 16 px.
 * Couvercle bombé (dessus clair, flanc sud qui tourne vers l'ombre, lèvre), caisse en planches, deux pentures de fer,
 * moraillon et serrure au milieu, coins ferrés. Image 22 × 18.
 */
function chest(): Canvas {
  return furniture([
    '..RrYYYYYMMMRrm.',
    '.MRrYMMMMMMMRrmm',
    'MMRrMMMMMMMMRrmm',
    'mmrzmmmmmmmmrzmN',
    'NNrzNNNrrNNNrzNN',
    'KKzZKKKrzKKKzZKK',
    'MMrzMMRrrzMMrzNN',
    'mmrzmmrZrzmmrzNN',
    'mmrzmmzzzZmmrzNN',
    'NNrzNNNNNNNNrzNN',
    'mmrzmmmmmmmmrzNN',
    'mmrzmmmmmmmmrzNN',
    'zzrzmmmmmmmmrzZZ',
    'zzzZNNNNNNNNzZZZ',
  ]);
}

// ---------- Table de ferme ----------

/**
 * Table de ferme en bois massif, 48x32 : plateau épais à planches est-ouest (dessus visible),
 * ceinture sous le plateau, quatre pieds équarris (les deux de devant entiers, ceux du fond dans l'ombre).
 */
function table(): Canvas {
  const c = new Canvas(48, 32);
  const x0 = 3;
  const x1 = 43; // inclus
  const w = x1 - x0 + 1;
  const t0 = 6;
  const t1 = 14; // dernière ligne du dessus
  const e1 = 17; // bas de l'épaisseur du plateau
  const g = 29; // sol, sous les pieds de devant
  // pieds du fond : en retrait, dans l'ombre du plateau
  for (const x of [x0 + 5, x1 - 7]) c.rect(x, e1 + 1, 3, 4, 'K');
  // ceinture sous le plateau, en retrait
  c.rect(x0 + 2, e1 + 1, w - 4, 2, 'N').rect(x0 + 2, e1 + 1, w - 4, 1, 'K');
  // pieds de devant : équarris, face éclairée à gauche
  for (const x of [x0 + 1, x1 - 4]) {
    c.rect(x, e1 + 1, 4, g - e1, 'm');
    c.rect(x, e1 + 1, 1, g - e1, 'M');
    c.rect(x + 3, e1 + 1, 1, g - e1, 'N');
    c.rect(x, e1 + 1, 4, 1, 'K'); // ombre du plateau sur le haut du pied
  }
  // plateau : dessus en bois clair, trois planches est-ouest
  c.rect(x0, t0, w, t1 - t0 + 1, 'M');
  c.rect(x0 + 1, t0, w - 2, 1, 'Y'); // arête nord qui accroche la lumière
  for (const y of [t0 + 3, t0 + 6]) c.rect(x0, y, w, 1, 'm'); // joints des planches
  c.rect(x1, t0 + 1, 1, t1 - t0, 'm'); // bout est, qui tourne vers l'ombre
  c.within('M', (c) => {
    c.rect(x0 + 10, t0 + 1, 5, 1, 'm'); // veines du bois
    c.rect(x0 + 24, t0 + 4, 6, 1, 'm');
    c.rect(x0 + 14, t0 + 7, 5, 1, 'm');
  });
  c.rect(x0 + 2, t0 + 1, 5, 1, 'Y'); // reflet au nord-ouest
  // épaisseur du plateau (face sud) : chant de 3 px
  c.rect(x0, t1 + 1, w, e1 - t1, 'm');
  c.rect(x0, t1 + 1, w, 1, 'M');
  c.rect(x0, e1, w, 1, 'N');
  c.rect(x1 - 1, t1 + 1, 2, e1 - t1, 'N');
  for (const [x, y] of [[x0, t0], [x1, t0]]) c.set(x, y, EMPTY); // coins adoucis
  shadedOutline(c, WOOD_DARKEST);
  groundShadow(c, 25, g + 1.5, 22, 1.8);
  return c;
}

// ---------- Tabouret ----------

/**
 * Tabouret à trois pieds (assise Ø 30 cm, 32 × 32 × 45 cm, cylindre debout). Gabarit : 6,4 × (9 + 3,2) ≈ 6 × 12 px,
 * dessiné 8 × 12 (pieds écartés, pied de devant de 2 px : à 7 px de large, l'assise se lit en champignon). Assise ronde vue de dessus, chant dans l'ombre ; trois pieds d'un pixel (5 cm) : les deux du fond
 * écartés vers l'ouest et vers l'est touchent le sol plus haut, celui de devant descend jusqu'au bas. Image 12 × 15.
 */
function stool(): Canvas {
  const c = new Canvas(12, 15);
  // assise, contour compris : rangées 0 à 5 de la silhouette
  c.stamp(['.MYYm.', 'MMMMmm', 'NNNNNK'], 3, 1);
  shadedOutline(c, WOOD_DARKEST);
  // pieds, sous le chant : fond ouest éclairé (K), fond est dans l'ombre (o), devant éclairé à l'ouest
  c.stamp([
    '.K.mN.o.',
    '.K.mN.o.',
    '.K.mN.o.',
    'K..mN..o',
    'K..mN..o',
    '...mN...',
    '...oo...',
  ], 2, 5);
  return furnitureShadow(c, 6);
}

// ---------- Puits ----------

/**
 * Puits de pierre, 48x64 : margelle circulaire en pierres appareillées, deux montants de bois,
 * treuil, toit à deux pentes en planches, seau suspendu à la corde au-dessus de l'ouverture.
 */
function well(): Canvas {
  const c = new Canvas(48, 64);
  const cx = 23.5;
  const rimY = 40; // centre de l'ellipse du dessus de la margelle
  const rx = 17;
  const ry = 6;
  const wallH = 13; // hauteur de la face sud de la margelle
  const arc = (x: number) => {
    const u = (x + 0.5 - cx) / rx;
    return ry * Math.sqrt(Math.max(0, 1 - u * u));
  };
  // margelle : cylindre de pierre, modelé par colonne (R éclairé à l'ouest, z puis Z à l'est)
  for (let x = 0; x < c.w; x++) {
    const u = (x + 0.5 - cx) / rx;
    if (Math.abs(u) > 1) continue;
    const yb = Math.round(rimY + wallH + arc(x));
    for (let y = rimY; y <= yb; y++) c.set(x, y, u < -0.55 ? 'R' : u < 0.25 ? 'r' : u < 0.7 ? 'z' : 'Z');
  }
  // pierres appareillées : assises de 3 px qui suivent la courbe, joints décalés d'une assise à l'autre
  const darker: Record<string, string> = { R: 'r', r: 'z', z: 'Z', Z: 'Z' };
  const wallBottom = (x: number) => Math.round(rimY + wallH + arc(x));
  for (let row = 0; row < 4; row++) {
    const mortar = (x: number) => Math.round(rimY + 3 + row * 3 + arc(x));
    for (let x = 0; x < c.w; x++) {
      if (Math.abs((x + 0.5 - cx) / rx) > 1) continue;
      const y = mortar(x);
      const p = c.get(x, y);
      if (p in darker && y < wallBottom(x)) c.set(x, y, darker[p]); // lit de mortier
    }
    // joints verticaux de l'assise au-dessus, à pas d'angle constant : ils se resserrent vers les bords
    const step = 0.42;
    for (let a = -Math.PI / 2 + (row % 2 ? step / 2 : 0) + step / 2; a < Math.PI / 2 - 0.25; a += step) {
      if (a < -Math.PI / 2 + 0.25) continue;
      const x = Math.floor(cx + rx * Math.sin(a));
      for (let k = 1; k <= 2; k++) {
        const y = mortar(x) - k;
        const q = c.get(x, y);
        if (q in darker && y > rimY + arc(x)) c.set(x, y, darker[q]);
      }
    }
  }
  // assise du bas : joints sous le dernier lit
  for (let a = -Math.PI / 2 + 0.42; a < Math.PI / 2 - 0.25; a += 0.42) {
    const x = Math.floor(cx + rx * Math.sin(a));
    for (const k of [1, 2]) {
      const y = Math.round(rimY + 12 + arc(x)) + k;
      const q = c.get(x, y);
      if (q in darker && y < wallBottom(x)) c.set(x, y, darker[q]);
    }
  }
  // dessus de la margelle : couronne de pierres plates, ouverture sombre au milieu
  c.ellipse(cx, rimY, rx + 0.4, ry + 0.4, 'r');
  c.within('r', (c) => {
    c.ellipse(cx - 3, rimY - 1, rx - 4, ry - 1.5, 'R'); // couronne éclairée au nord-ouest
  });
  c.ellipse(cx + 0.5, rimY + 0.3, rx - 4.5, ry - 2.2, 'Z'); // paroi intérieure, dans l'ombre
  c.ellipse(cx + 1, rimY + 1.2, rx - 7, ry - 3.5, 'q'); // eau au fond
  c.within('R', (c) => c.ellipse(cx + 6, rimY + 4.5, 8, 2, 'r')); // couronne sud, qui tourne vers la face
  // montants : deux poteaux posés sur la margelle à l'est et à l'ouest
  const postTop = 15;
  for (const [x, lit] of [[6, true], [38, false]] as [number, boolean][]) {
    c.rect(x, postTop, 4, rimY + 2 - postTop, 'm');
    c.rect(x, postTop, 1, rimY + 2 - postTop, lit ? 'M' : 'm');
    c.rect(x + 3, postTop, 1, rimY + 2 - postTop, lit ? 'N' : 'K');
    if (!lit) c.rect(x + 1, postTop, 2, rimY + 2 - postTop, 'N');
    c.rect(x, postTop, 4, 2, 'K'); // ombre du toit sur le haut du poteau
  }
  // treuil : rondin entre les montants, manivelle à l'est
  const ty = 24;
  c.rect(10, ty, 28, 3, 'm').rect(10, ty, 28, 1, 'M').rect(10, ty + 2, 28, 1, 'N');
  c.rect(20, ty, 7, 3, 'T').rect(20, ty, 7, 1, 't').rect(20, ty + 2, 7, 1, 'P'); // corde enroulée
  c.rect(42, ty, 2, 2, 'z').rect(42, ty, 2, 1, 'r'); // bout d'axe
  c.rect(43, ty + 2, 1, 3, 'z'); // bras de la manivelle
  c.rect(43, ty + 5, 2, 2, 'N').set(43, ty + 5, 'm'); // poignée de bois
  // corde et seau suspendu au-dessus de l'ouverture
  c.rect(23, ty + 3, 1, 6, 'T');
  const by = ty + 9; // haut du seau
  c.rect(20, by, 8, 6, 'm').rect(20, by, 2, 6, 'M').rect(26, by, 2, 6, 'N');
  c.rect(20, by, 8, 1, 'N'); // bord intérieur, vu par-dessus
  c.rect(21, by + 5, 6, 1, 'N');
  c.rect(20, by + 2, 8, 1, 'r').rect(26, by + 2, 2, 1, 'z'); // cercle de fer
  c.set(20, by + 5, EMPTY).set(27, by + 5, EMPTY);
  // toit à deux pentes : versant nord étroit et clair, faîtage, versant sud en planches
  const ridge = 7;
  const eave = 16;
  c.polygon([[4, ridge], [44, ridge], [42, ridge - 4], [6, ridge - 4]], 'M'); // versant nord
  c.rect(8, ridge - 3, 28, 1, 'Y'); // faîte nord qui accroche la lumière
  c.polygon([[3, ridge], [45, ridge], [46, eave + 1], [2, eave + 1]], 'm'); // versant sud
  c.rect(3, ridge, 42, 1, 'N'); // faîtage
  c.within('m', (c) => {
    for (let x = 6; x < 46; x += 5) c.line(x, ridge + 1, x + (x - 24) / 12, eave, 'N'); // joints des planches
    c.rect(2, eave - 1, 45, 2, 'N'); // bord de l'avant-toit, dans l'ombre
    c.polygon([[3, ridge + 1], [9, ridge + 1], [8, eave - 2], [2, eave - 2]], 'M'); // pignon ouest éclairé
  });
  c.rect(2, eave + 1, 45, 1, 'K'); // dessous de l'avant-toit
  shadedOutline(c, WOOD_DARKEST);
  // anse du seau, trait de fer fin posé après le contour
  c.within('.o', (c) => c.line(21, by - 1, 23, by - 3, 'z').line(26, by - 1, 24, by - 3, 'z'));
  groundShadow(c, cx + 3, rimY + wallH + ry + 1, rx + 3, 2.2);
  return c;
}

/** Pour les objets en bois, le reflet `Y` est une lumière du bois : son contour reste brun. */
const WOOD_DARKEST = { ...DARKEST, Y: 'K' };

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [
  img('barrel', barrel()),
  img('crate', crate()),
  img('hay-bale', hayBale()),
  img('chest', chest()),
  img('table', table()),
  img('stool', stool()),
  img('well', well()),
];
