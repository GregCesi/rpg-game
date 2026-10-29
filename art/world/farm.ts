// Mobilier et objets de ferme posables (tonneau, caisse, botte de foin, coffre, table, tabouret, puits).
// Vue de trois quarts, lumière nord-ouest, ancrage en bas au centre, ombre portée `x` décalée vers la droite.
// Contour d'un pixel : teinte la plus sombre de la matière en haut et à gauche, OUTLINE en bas et à droite.

import { Canvas, EMPTY } from '../lib/canvas';
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

// ---------- Tonneau ----------

/**
 * Tonneau cerclé de fer, debout. 24x32. Douelles bombées (plus large au milieu),
 * fond supérieur vu de dessus, deux paires de cercles de fer qui suivent la courbure.
 */
function barrel(): Canvas {
  const c = new Canvas(24, 32);
  const cx = 11.5;
  const top = 10; // ligne médiane du fond supérieur
  const base = 25; // bas des douelles au bord (le centre descend de `bow`)
  const bow = 2.6; // courbure vue de trois quarts
  const half = (y: number) => 7 + 2 * Math.sin((Math.PI * (y - top)) / (base + bow - top));
  const curve = (x: number) => {
    const u = (x + 0.5 - cx) / 9;
    return bow * Math.sqrt(Math.max(0, 1 - u * u));
  };
  // corps : douelles, modelées par colonne (M éclairé à gauche, m, N, K à droite)
  for (let y = top; y < 32; y++) for (let x = 0; x < c.w; x++) {
    const dx = x + 0.5 - cx;
    if (Math.abs(dx) > half(y)) continue;
    if (y > base + curve(x)) continue;
    const u = dx / half(y);
    c.set(x, y, u < -0.45 ? 'M' : u < 0.3 ? 'm' : u < 0.72 ? 'N' : 'K');
  }
  // joints des douelles, un ton sous la douelle
  const darker: Record<string, string> = { M: 'm', m: 'N', N: 'K', K: 'K' };
  for (const u0 of [-0.62, -0.2, 0.22, 0.6]) {
    for (let y = top; y < 32; y++) {
      const x = Math.floor(cx + u0 * half(y));
      const p = c.get(x, y);
      if (p in darker) c.set(x, y, darker[p]);
    }
  }
  // cercles de fer : deux bandes de 2 px, en haut et en bas, qui suivent la courbe
  for (const yb of [top + 1, base - 4]) {
    for (let x = 0; x < c.w; x++) {
      const y = yb + Math.round(curve(x));
      if (c.get(x, y) === EMPTY) continue;
      const u = (x + 0.5 - cx) / half(y);
      c.set(x, y, u < -0.3 ? 'R' : u < 0.45 ? 'r' : 'z');
      if (c.get(x, y + 1) !== EMPTY) c.set(x, y + 1, u < 0.45 ? 'z' : 'Z');
    }
  }
  // fond supérieur : jable clair, fond en retrait, deux joints et la bonde
  c.ellipse(cx, top, 7.6, 3.1, 'M');
  c.ellipse(cx + 0.4, top + 0.5, 6, 2.2, 'm');
  c.within('m', (c) => c.rect(0, top - 2, 24, 1, 'N')); // ombre du jable sur le fond, côté nord
  c.within('M', (c) => c.rect(13, top + 2, 6, 1, 'm')); // jable sud, plus sombre que le nord
  c.rect(14, top, 2, 1, 'K'); // bonde
  c.within('M', (c) => c.rect(5, top - 3, 6, 1, 'Y')); // reflet du jable au nord-ouest
  shadedOutline(c);
  groundShadow(c, cx + 2, 28.5, 10, 2.2);
  return c;
}

// ---------- Caisse ----------

/** Caisse en planches clouées : dessus à lattes, face sud à cadre et écharpe en diagonale. 24x24. */
function crate(): Canvas {
  const c = new Canvas(24, 24);
  const x0 = 3;
  const x1 = 19; // inclus
  const w = x1 - x0 + 1;
  // dessus : lattes est-ouest, dans le bois clair
  const t0 = 4;
  const t1 = 10; // dernière ligne du dessus
  c.rect(x0, t0, w, t1 - t0 + 1, 'M');
  c.rect(x0, t0, w, 1, 'Y');
  for (const y of [6, 8]) c.rect(x0, y, w, 1, 'm');
  c.rect(x1, t0, 1, t1 - t0 + 1, 'm');
  // face sud, dans l'ombre : panneau en retrait, cadre et écharpe
  const f0 = t1 + 1;
  const f1 = 20;
  c.rect(x0, f0, w, f1 - f0 + 1, 'N');
  c.rect(x0, f0 + 4, w, 1, 'K').rect(x0, f0 + 7, w, 1, 'K'); // joints des planches du panneau
  c.line(x0 + 2, f1 - 1, x1 - 2, f0 + 1, 'M').line(x0 + 3, f1 - 1, x1 - 1, f0 + 1, 'm'); // écharpe
  c.line(x0 + 4, f1 - 1, x1, f0 + 1, 'K');
  c.rect(x0, f0, w, 2, 'm').rect(x0, f0, w, 1, 'M'); // traverse haute
  c.rect(x0, f1 - 1, w, 2, 'm').rect(x0, f1, w, 1, 'N'); // traverse basse
  c.rect(x0, f0, 2, f1 - f0 + 1, 'm').rect(x0, f0, 1, f1 - f0 + 1, 'M'); // montant ouest, éclairé
  c.rect(x1 - 1, f0, 2, f1 - f0 + 1, 'm').rect(x1, f0, 1, f1 - f0 + 1, 'N'); // montant est
  c.rect(x0 + 1, f0, w - 1, 1, 'M'); // arête entre dessus et face
  // clous des traverses
  for (const [x, y] of [[x0 + 1, f0 + 1], [x1 - 1, f0 + 1], [x0 + 1, f1 - 1], [x1 - 1, f1 - 1]]) c.set(x, y, 'K');
  shadedOutline(c);
  groundShadow(c, 12.5, f1 + 1.5, 10, 1.8);
  return c;
}

// ---------- Botte de foin ----------

/** Botte de foin rectangulaire, liée de deux ficelles, couchée est-ouest. 32x24. */
function hayBale(): Canvas {
  const c = new Canvas(32, 24);
  const x0 = 2;
  const x1 = 28; // inclus
  const w = x1 - x0 + 1;
  const t0 = 5;
  const t1 = 11; // dessus
  const f1 = 19; // bas de la face sud
  // volume : dessus Y, face sud t, bout est T ; coins adoucis
  c.rect(x0, t0, w, t1 - t0 + 1, 'Y');
  c.rect(x0, t1 + 1, w, f1 - t1, 't');
  c.rect(x1 - 1, t0, 2, f1 - t0 + 1, 'T');
  c.rect(x0, f1 - 1, w, 2, 'T');
  c.rect(x0, t1 + 1, w, 1, 'T'); // arête : la paille tourne vers l'ombre
  for (const [x, y] of [[x0, t0], [x1, t0], [x0, f1], [x1, f1]]) c.set(x, y, EMPTY);
  // texture de paille : brins de trois pixels, couchés dans le sens de la botte
  const strands: [number, number, string][] = [
    [5, 7, 't'], [12, 6, 't'], [17, 9, 't'], [23, 7, 't'], [4, 10, 't'],
    [3, 14, 'T'], [11, 14, 'T'], [16, 15, 'T'], [23, 14, 'T'], [5, 16, 'T'], [13, 17, 'T'], [18, 17, 'T'],
  ];
  for (const [x, y, col] of strands) c.within('Yt', (c) => c.rect(x, y, 3, 1, col));
  // brins qui dépassent aux deux bouts
  c.set(x0 - 1, 8, 'Y').set(x0 - 1, 14, 't').set(x1 + 1, 9, 'T').set(x1 + 1, 15, 'T');
  c.set(6, t0 - 1, 'Y').set(15, t0 - 1, 'Y').set(16, t0 - 1, 'Y').set(25, t0 - 1, 'Y'); // brins ébouriffés sur le dessus
  // deux ficelles : sur le dessus (nord-sud) puis sur la face sud
  for (const x of [9, 21]) {
    c.rect(x, t0, 1, f1 - t0 + 1, 'N');
    c.rect(x + 1, t0, 1, f1 - t0 + 1, 'P'); // creux de la paille serrée, côté ombre
    c.set(x, t1 + 1, 'M'); // ficelle qui accroche la lumière sur l'arête
  }
  c.set(x0, t0, EMPTY);
  shadedOutline(c);
  groundShadow(c, 17, f1 + 1.5, 14, 1.8);
  return c;
}

// ---------- Coffre ----------

/** Coffre de bois ferré : couvercle bombé, deux pentures de fer, serrure au milieu. 28x24. */
function chest(): Canvas {
  const c = new Canvas(28, 24);
  const x0 = 2;
  const x1 = 24; // inclus
  const w = x1 - x0 + 1;
  // couvercle bombé : demi-cylindre couché est-ouest, coins arrondis
  const l0 = 3;
  const l1 = 11; // bas du couvercle
  c.rect(x0, l0 + 2, w, l1 - l0 - 1, 'm');
  c.rect(x0 + 1, l0 + 1, w - 2, 1, 'M');
  c.rect(x0 + 2, l0, w - 4, 1, 'M');
  c.rect(x0 + 1, l0 + 2, w - 2, 2, 'M'); // dessus, face au ciel
  c.rect(x0 + 3, l0 + 1, w - 7, 1, 'Y'); // reflet
  c.rect(x0, l1 - 2, w, 2, 'N'); // flanc sud du couvercle
  c.rect(x0, l1, w, 1, 'K'); // lèvre
  c.rect(x1, l0 + 2, 1, l1 - l0 - 1, 'N');
  // caisse : planches horizontales
  const b0 = l1 + 1;
  const b1 = 20;
  c.rect(x0, b0, w, b1 - b0 + 1, 'm');
  c.rect(x0, b0, w, 1, 'M');
  c.rect(x0, b0 + 4, w, 1, 'N');
  c.rect(x0, b1, w, 1, 'N');
  c.rect(x1 - 1, b0, 2, b1 - b0 + 1, 'N');
  // pentures de fer, du couvercle au bas de la caisse
  for (const x of [x0 + 3, x1 - 4]) {
    for (let y = l0; y <= b1; y++) {
      if (c.get(x, y) === EMPTY) continue;
      c.set(x, y, y < l1 - 2 ? 'R' : 'r');
      c.set(x + 1, y, y < l1 - 2 ? 'r' : 'z');
    }
    c.set(x, l1, 'z').set(x + 1, l1, 'Z');
  }
  // coins ferrés en bas
  c.rect(x0, b1 - 1, 2, 2, 'z').rect(x1 - 1, b1 - 1, 2, 2, 'Z');
  // moraillon et serrure
  const sx = 12;
  c.rect(sx, l1 - 2, 3, 3, 'r').rect(sx, l1 - 2, 3, 1, 'R');
  c.rect(sx - 1, b0, 5, 4, 'r').rect(sx - 1, b0, 5, 1, 'R').rect(sx + 3, b0, 1, 4, 'z');
  c.set(sx + 1, b0 + 1, 'Z').set(sx + 1, b0 + 2, 'Z');
  shadedOutline(c);
  groundShadow(c, 15, b1 + 1.5, 13, 1.8);
  return c;
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

/** Tabouret à trois pieds, 16x20 : assise ronde vue de dessus, chant, pieds écartés. */
function stool(): Canvas {
  const c = new Canvas(16, 20);
  const cx = 7.5;
  // pieds : deux en arrière sur les côtés (ils touchent le sol plus haut), un devant ; tous écartés
  c.line(4, 8, 2, 15, 'M').line(5, 8, 3, 15, 'm');
  c.line(10, 8, 12, 15, 'N').line(11, 8, 13, 15, 'K');
  c.rect(7, 9, 2, 8, 'm').rect(7, 9, 1, 8, 'M');
  // assise : chant de 2 px (face sud, dans l'ombre) puis dessus rond, vus de trois quarts
  c.ellipse(cx, 6.6, 7, 3, 'N');
  c.within('N', (c) => c.rect(11, 0, 5, 12, 'K')); // chant est
  c.ellipse(cx, 4.8, 7, 3, 'm');
  c.ellipse(cx - 0.8, 4.4, 6, 2.5, 'M'); // dessus, liseré sud-est qui tourne vers l'ombre
  c.rect(3, 3, 4, 1, 'Y'); // reflet au nord-ouest
  shadedOutline(c, WOOD_DARKEST);
  groundShadow(c, 9, 16.6, 6.5, 1.6);
  return c;
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
