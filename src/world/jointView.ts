// Le dessin des assemblages (Phaser) : des pièces entées se montrent comme une seule pièce de bois de leur longueur totale
// (woodTexture), avec la marque de l'enture à chaque jonction (`joint-scarf-<diamètre>-<sens>`, art/world/joints.ts) ; une pièce
// couchée tenue par un tenon et mortaise montre la cheville (`joint-peg`) sur sa face, au droit du poteau. Chaque pièce garde son
// image (pour la retirer, la viser, l'effacer) et en montre sa part. Le calcul (qui va avec qui) est dans world/joints.ts.

import type Phaser from 'phaser';
import { CM_PER_PX } from '../content/gabarit';
import { boxOf, type Box3, type BuildPiece } from './build';
import { buildLook } from './buildView';
import { scarfChains, woodOfPiece, type JointRef } from './joints';
import { lookOf, upOf } from './woodShape';

/** Une pièce affichée, telle que GameMap la tient. */
export interface ShownPiece {
  piece: BuildPiece;
  image: Phaser.GameObjects.Image;
  crop?: { x: number; y: number; w: number; h: number };
}

/** De combien le fût d'un poteau monte sous la pièce couchée qu'il porte par un tenon (cm) : de quoi cacher sa tête (4 px). */
export const TENON = 20;

/** Une marque posée sur une image : sa clé et son coin haut gauche dans l'image. */
interface Mark {
  key: string;
  x: number;
  y: number;
}

/** Ce qu'on dessine d'un tenant : une pièce, ou une suite de pièces entées. */
interface Unit {
  pieces: BuildPiece[];
  /** La pièce (réelle ou entière) dont on dessine l'image. */
  look: BuildPiece;
  box: Box3;
  marks: Mark[];
  /** Où commence la part de chaque pièce le long de l'image (ew : colonnes, ns et debout : rangées), dans l'ordre de `pieces`. */
  cuts: number[];
  axis: 'ew' | 'ns' | 'up';
}

/** La texture d'une image avec ses marques posées dessus, peinte au premier besoin. */
function marked(scene: Phaser.Scene, key: string, frame: string | undefined, marks: Mark[]): { key: string; frame?: string } {
  const ok = marks.filter((m) => scene.textures.exists(m.key));
  if (!ok.length) return { key, frame };
  const id = `${key}#${frame ?? ''}#${ok.map((m) => `${m.key}@${m.x},${m.y}`).join(';')}`;
  if (!scene.textures.exists(id)) {
    const f = scene.textures.getFrame(key, frame);
    const canvas = scene.textures.createCanvas(id, f.width, f.height)!;
    const ctx = canvas.getContext();
    ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.width, f.height);
    for (const m of ok) {
      const g = scene.textures.getFrame(m.key);
      ctx.drawImage(g.source.image as CanvasImageSource, g.cutX, g.cutY, g.cutWidth, g.cutHeight, m.x, m.y, g.width, g.height);
    }
    canvas.refresh();
  }
  return { key: id };
}

/**
 * Redessine les pièces de bois : chacune seule, ou dans sa suite entée, avec les marques de ses assemblages. Les pièces qui ne sont
 * pas du bois ne changent pas (les morceaux de mur ont leur propre dessin commun).
 */
export function drawJoints(scene: Phaser.Scene, shown: readonly ShownPiece[], joints: readonly JointRef[]): void {
  const pieces = shown.map((s) => s.piece);
  const byId = new Map(shown.map((s) => [s.piece.id, s]));
  const units: Unit[] = [];
  const inChain = new Set<number>();
  for (const c of scarfChains(pieces, joints)) {
    c.pieces.forEach((p) => inChain.add(p.id));
    const look: BuildPiece = { id: -1, piece: { wood: c.wood }, x: c.box.x, y: c.box.y, z: c.box.z, view: 0 };
    units.push({ pieces: c.pieces, look, box: c.box, marks: [], cuts: c.cuts, axis: c.axis });
  }
  for (const s of shown) {
    const w = woodOfPiece(s.piece);
    if (!w || inChain.has(s.piece.id)) continue;
    units.push({ pieces: [s.piece], look: s.piece, box: boxOf(s.piece), marks: [], cuts: [], axis: w.axis });
  }
  const unitOf = new Map<number, Unit>();
  for (const u of units) for (const p of u.pieces) unitOf.set(p.id, u);

  // un poteau dont la tête entre dans la mortaise d'une pièce couchée : son fût monte d'un cran (TENON cm) sous la pièce couchée,
  // qui se dessine par-dessus ; sa tête (le bois de bout) ne se voit plus, et il n'y a pas de jour entre eux
  const tenonHead = (p: BuildPiece) =>
    joints.some((j) => {
      if (j.type !== 'mortise' || (j.a !== p.id && j.b !== p.id) || woodOfPiece(p)?.axis !== 'up') return false;
      const other = byId.get(j.a === p.id ? j.b : j.a)?.piece;
      const b = boxOf(p);
      return !!other && b.z + b.h === other.z;
    });
  for (const u of units) {
    const top = u.pieces[u.pieces.length - 1];
    if (u.axis === 'up' && tenonHead(top)) {
      const w = woodOfPiece(u.look)!;
      u.look = { ...u.look, piece: { wood: { ...w, length: w.length + TENON } } };
    }
  }

  for (const u of units) {
    const wood = woodOfPiece(u.look)!;
    const look = buildLook(scene, u.look);
    // les marques des entures, à chaque jonction
    for (const cut of u.cuts) {
      const key = `joint-scarf-${wood.size}-${u.axis}`;
      if (!scene.textures.exists(key)) continue;
      const m = scene.textures.getFrame(key);
      if (u.axis === 'ew') u.marks.push({ key, x: Math.round(cut / CM_PER_PX) - Math.floor(m.width / 2), y: look.h - m.height });
      else if (u.axis === 'ns') u.marks.push({ key, x: 0, y: Math.round(cut / CM_PER_PX) - Math.floor(m.height / 2) });
      else u.marks.push({ key, x: 0, y: upRow(wood, cut) - Math.floor(m.height / 2) });
    }
    // la cheville d'un tenon et mortaise, sur la face de la pièce couchée, au droit du poteau
    for (const j of joints) {
      if (j.type !== 'mortise') continue;
      const two = [j.a, j.b].map((id) => byId.get(id)?.piece);
      const post = two.find((p) => p && woodOfPiece(p)?.axis === 'up');
      const lying = two.find((p) => p && p !== post);
      if (!lying || !post || !u.pieces.includes(lying)) continue;
      const pb = boxOf(post);
      const px = Math.round((pb.x + pb.w / 2) / CM_PER_PX) - look.x;
      if (u.axis === 'ew') u.marks.push({ key: 'joint-peg', x: px - 1, y: Math.round(look.h * 0.6) - 1 });
      else u.marks.push({ key: 'joint-peg', x: Math.floor(look.w / 2) - 1, y: Math.round((pb.y + pb.d / 2 - u.box.y) / CM_PER_PX) - 1 });
    }
    const tex = marked(scene, look.key, look.frame, u.marks);
    const n = u.pieces.length;
    u.pieces.forEach((p, i) => {
      const s = byId.get(p.id)!;
      s.image.setTexture(tex.key, tex.frame).setPosition(look.x, look.y);
      if (n === 1) {
        s.image.setCrop();
        s.crop = undefined;
        return;
      }
      const c = cropOf(u, wood, look.w, look.h, i);
      s.image.setCrop(c.x, c.y, c.w, c.h);
      s.crop = c;
    });
  }
}

/** Le croisement d'un mi-bois, à poser par-dessus les deux pièces : sa clé, son coin haut gauche (px du monde), sa profondeur. */
export interface Overlay {
  key: string;
  x: number;
  y: number;
  depth: number;
}

/**
 * Les croisements des mi-bois et des encoches : une image (`joint-notch-<diamètre>-<dessus>-<masque>` pour l'encoche, rangée 0 quatre
 * rangées au-dessus de l'image de l'est-ouest) ; pour le mi-bois, une image (`joint-halving-<diamètre>-<aspect>-<dessus>-<masque>`, art/world/joints.ts) posée sur les
 * deux pièces, sa colonne 0 sur celle de l'image de la pièce nord-sud, sa rangée 0 sur celle de l'image de l'est-ouest ; le masque dit
 * de quels côtés une pièce continue au-delà du croisement (nord 1, est 2, sud 4, ouest 8). Juste au-dessus des deux pièces. À appeler
 * quand les pièces sont placées et à leur profondeur.
 */
export function halvingOverlays(scene: Phaser.Scene, shown: readonly ShownPiece[], joints: readonly JointRef[]): Overlay[] {
  const byId = new Map(shown.map((s) => [s.piece.id, s]));
  const out: Overlay[] = [];
  for (const j of joints) {
    if (j.type !== 'halving' && j.type !== 'notch') continue;
    const two = [byId.get(j.a), byId.get(j.b)];
    const ew = two.find((s) => s && woodOfPiece(s.piece)?.axis === 'ew');
    const ns = two.find((s) => s && woodOfPiece(s.piece)?.axis === 'ns');
    if (!ew || !ns) continue;
    const w = woodOfPiece(ew.piece)!;
    const E = boxOf(ew.piece);
    const N = boxOf(ns.piece);
    // une pièce continue au-delà du croisement ; pour l'encoche, un dépassement de 20 cm au plus est un bout (le rondin qui dépasse
    // à l'angle d'une cabane), pas une suite
    const over = j.type === 'notch' ? 20 : 0;
    const mask = (N.y < E.y - over ? 1 : 0) + (E.x + E.w > N.x + N.w + over ? 2 : 0) + (N.y + N.d > E.y + E.d + over ? 4 : 0) + (E.x < N.x - over ? 8 : 0);
    const top = j.top === ns.piece.id ? 'ns' : 'ew';
    // le mi-bois : rangée 0 sur celle de l'image de l'est-ouest ; l'encoche : 4 rangées plus haut (le rondin du dessus est 20 cm plus haut)
    const key = j.type === 'notch' ? `joint-notch-${w.size}-${top}-${mask}` : `joint-halving-${w.size}-${lookOf(w) === 'beam' ? 'beam' : 'round'}-${top}-${mask}`;
    if (!scene.textures.exists(key)) continue;
    const lift = j.type === 'notch' ? 4 : 0;
    out.push({ key, x: ns.image.x, y: ew.image.y - ew.image.height - lift, depth: Math.max(ew.image.depth, ns.image.depth) + 0.0005 });
  }
  return out;
}

/** La rangée de l'image d'une pièce debout à `cut` cm de son pied : la tête (`extra` rangées) en haut, puis le fût. */
function upRow(wood: { size: string; length: number } & Parameters<typeof lookOf>[0], cut: number): number {
  const u = upOf(wood.size, lookOf(wood));
  return u.extra + Math.round((wood.length - cut) / CM_PER_PX);
}

/** La part de l'image d'une suite entée que montre sa pièce n° i (ouest à est, nord à sud, pied à tête). */
function cropOf(u: Unit, wood: Parameters<typeof upRow>[0], w: number, h: number, i: number): { x: number; y: number; w: number; h: number } {
  const n = u.pieces.length;
  if (u.axis === 'ew') {
    const x0 = i === 0 ? 0 : Math.round(u.cuts[i - 1] / CM_PER_PX);
    const x1 = i === n - 1 ? w : Math.round(u.cuts[i] / CM_PER_PX);
    return { x: x0, y: 0, w: x1 - x0, h };
  }
  if (u.axis === 'ns') {
    const y0 = i === 0 ? 0 : Math.round(u.cuts[i - 1] / CM_PER_PX);
    const y1 = i === n - 1 ? h : Math.round(u.cuts[i] / CM_PER_PX);
    return { x: 0, y: y0, w, h: y1 - y0 };
  }
  // debout : la pièce du pied a le bas de l'image (et les rangées vides du dé), celle du haut la tête
  const top = i === n - 1 ? 0 : upRow(wood, u.cuts[i]);
  const bottom = i === 0 ? h : upRow(wood, u.cuts[i - 1]);
  return { x: 0, y: top, w, h: bottom - top };
}
