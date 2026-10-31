// Maquette de la chaumière : les deux propositions de plan intérieur (docs/maison-chaumiere.md, « Deux plans »), en données.
// Repère de la maison (cm) : x vers l'est, y vers le sud, depuis le coin nord-ouest du solin. L'intérieur va des faces
// intérieures des murs, x 40 à 1400 et y 40 à 600 (13,60 × 5,60 m). Rien ici n'est lu par le jeu.

/** Un rectangle au sol, en cm. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  d: number;
}

/** Une pièce, ce qu'on y fait. */
export interface Room extends Rect {
  name: string;
  /** Où écrire son nom (cm, le début du texte) ; sinon au milieu. */
  label?: [number, number];
}

/** Un meuble ou un objet posé : son nom, son emprise, sa sorte (pour la couleur du plan). */
export interface Furniture extends Rect {
  name: string;
  kind: 'bois' | 'lit' | 'pierre' | 'terre' | 'paille' | 'outil' | 'sauvegarde';
}

/** Une ouverture dans un mur : porte ou fenêtre, sur le mur nord ou sud, de x à x + w. */
export interface Opening {
  kind: 'porte' | 'fenetre';
  wall: 'north' | 'south';
  x: number;
  w: number;
}

export interface Plan {
  key: 'A' | 'B';
  name: string;
  /** Les raisons, en phrases courtes (le document les reprend). */
  why: string[];
  rooms: Room[];
  /** Les cloisons : des segments de 20 cm d'épaisseur, déjà percés de leurs passages. */
  partitions: Rect[];
  /** La cheminée (l'âtre ouvert vers `opens`). */
  chimney: Rect & { opens: 'west' | 'east' };
  furniture: Furniture[];
  openings: Opening[];
  /** Le mur sud et le mur nord, d'ouest en est : la sorte de chaque travée (les pans de la maquette). */
  south: Bay[];
  north: Bay[];
  /** La cheminée est-elle dans le pignon est (plan A) ou au milieu (plan B) ? */
  chimneyInGable: boolean;
}

export type Bay = 'angle' | 'plein' | 'fenetre' | 'porte';

/** Une cloison nord-sud en x, de y0 à y1, et une est-ouest en y, de x0 à x1. */
const ns = (x: number, y0: number, y1: number): Rect => ({ x: x - 10, y: y0, w: 20, d: y1 - y0 });
const ew = (y: number, x0: number, x1: number): Rect => ({ x: x0, y: y - 10, w: x1 - x0, d: 20 });

export const PLANS: Plan[] = [
  {
    key: 'A',
    name: 'Plan A : la salle au pignon (trois pièces en enfilade)',
    why: [
      'La disposition la plus courante d’une longère : la salle à feu à un bout, la chambre ou l’atelier au milieu, le cellier à l’autre bout.',
      'L’âtre contre le pignon est : le conduit monte dans le pignon et sort à la pointe du toit, sans traverser le chaume.',
      'La mère dort dans la salle, à côté de l’âtre : la place la plus chaude, celle des parents dans une maison paysanne.',
      'L’atelier est entre la salle et la réserve : la lumière du sud sur l’établi, les copeaux loin du feu, le bois rangé au sec.',
      'Xéros a son cagibi à lui, contre la réserve : il garde ses affaires près des outils, et c’est là qu’il dort et qu’on sauvegarde.',
      'La porte d’entrée ouvre sur la salle ; la porte de derrière, dans la réserve, mène au jardin et au tas de bois.',
    ],
    rooms: [
      { name: 'reserve', x: 40, y: 40, w: 380, d: 310, label: [150, 290] },
      { name: 'cagibi de Xeros', x: 40, y: 370, w: 220, d: 230, label: [50, 455] },
      { name: 'passage', x: 280, y: 370, w: 140, d: 230, label: [285, 540] },
      { name: 'atelier de la mere', x: 440, y: 40, w: 380, d: 560, label: [470, 250] },
      { name: 'salle commune et cuisine', x: 840, y: 40, w: 560, d: 560, label: [880, 160] },
    ],
    partitions: [ew(360, 40, 280), ns(270, 360, 500), ns(430, 40, 380), ns(430, 480, 600), ns(830, 40, 300), ns(830, 400, 600)],
    chimney: { x: 1320, y: 220, w: 120, d: 200, opens: 'west' },
    furniture: [
      { name: 'tonneau', kind: 'bois', x: 60, y: 60, w: 60, d: 60 },
      { name: 'jarres', kind: 'terre', x: 130, y: 60, w: 100, d: 45 },
      { name: 'sacs', kind: 'paille', x: 60, y: 140, w: 50, d: 120 },
      { name: 'etagere', kind: 'bois', x: 250, y: 50, w: 160, d: 30 },
      { name: 'corde, masse, coin', kind: 'outil', x: 140, y: 200, w: 120, d: 40 },
      { name: 'paillasse', kind: 'lit', x: 50, y: 500, w: 200, d: 90 },
      { name: 'coffre de Xeros', kind: 'sauvegarde', x: 50, y: 390, w: 90, d: 50 },
      { name: 'etabli', kind: 'bois', x: 450, y: 535, w: 200, d: 60 },
      { name: 'billot', kind: 'bois', x: 690, y: 430, w: 55, d: 55 },
      { name: 'bois a sculpter', kind: 'bois', x: 460, y: 50, w: 200, d: 60 },
      { name: 'outils', kind: 'outil', x: 690, y: 50, w: 110, d: 30 },
      { name: 'table', kind: 'bois', x: 960, y: 270, w: 210, d: 90 },
      { name: 'banc', kind: 'bois', x: 965, y: 230, w: 200, d: 30 },
      { name: 'banc', kind: 'bois', x: 965, y: 370, w: 200, d: 30 },
      { name: 'planche de cuisine', kind: 'bois', x: 1100, y: 45, w: 200, d: 65 },
      { name: 'eau', kind: 'terre', x: 1050, y: 50, w: 45, d: 45 },
      { name: 'lit de la mere', kind: 'lit', x: 1190, y: 445, w: 200, d: 150 },
      { name: 'coffre', kind: 'bois', x: 1095, y: 545, w: 90, d: 50 },
    ],
    openings: [
      { kind: 'fenetre', wall: 'south', x: 440, w: 80 },
      { kind: 'porte', wall: 'south', x: 840, w: 100 },
      { kind: 'fenetre', wall: 'south', x: 1040, w: 80 },
      { kind: 'porte', wall: 'north', x: 240, w: 100 },
    ],
    south: ['angle', 'plein', 'fenetre', 'plein', 'porte', 'fenetre', 'angle'],
    north: ['angle', 'porte', 'plein', 'plein', 'plein', 'plein', 'angle'],
    chimneyInGable: true,
  },
  {
    key: 'B',
    name: 'Plan B : la salle au milieu (l’âtre au cœur de la maison)',
    why: [
      'Une grande salle où se passe toute la vie, comme dans la plupart des maisons paysannes : on y cuisine, on y mange, on y dort.',
      'La cheminée au milieu : le conduit sort au faîtage, là où le chaume craint le moins le feu ; son dos chauffe l’autre moitié.',
      'L’atelier de la mère est derrière la cheminée, au chaud l’hiver, avec la lumière du sud ; la réserve au nord, au frais.',
      'La mère et Xéros dorment dans la salle, près du feu : elle dans le coin sud-ouest, lui dans une alcôve au nord-ouest, fermée d’un rideau.',
      'L’alcôve de Xéros est son coin à lui : son coffre, sa paillasse ; c’est là qu’on sauvegarde.',
      'La façade change : la porte à l’ouest, la cheminée au milieu du toit ; les deux pignons sont pleins.',
    ],
    rooms: [
      { name: 'salle commune et cuisine', x: 40, y: 40, w: 660, d: 560, label: [60, 410] },
      { name: 'reserve', x: 840, y: 40, w: 560, d: 260, label: [1040, 160] },
      { name: 'atelier de la mere', x: 840, y: 320, w: 560, d: 280, label: [1010, 400] },
    ],
    partitions: [ns(830, 40, 120), ns(830, 220, 440), ns(830, 540, 600), ew(310, 840, 1400), ns(250, 40, 160)],
    chimney: { x: 700, y: 220, w: 120, d: 200, opens: 'west' },
    furniture: [
      { name: 'alcove de Xeros', kind: 'lit', x: 50, y: 60, w: 190, d: 90 },
      { name: 'coffre de Xeros', kind: 'sauvegarde', x: 60, y: 175, w: 90, d: 50 },
      { name: 'lit de la mere', kind: 'lit', x: 50, y: 445, w: 200, d: 150 },
      { name: 'table', kind: 'bois', x: 300, y: 270, w: 210, d: 90 },
      { name: 'banc', kind: 'bois', x: 305, y: 230, w: 200, d: 30 },
      { name: 'banc', kind: 'bois', x: 305, y: 370, w: 200, d: 30 },
      { name: 'planche de cuisine', kind: 'bois', x: 470, y: 45, w: 200, d: 65 },
      { name: 'eau', kind: 'terre', x: 420, y: 50, w: 45, d: 45 },
      { name: 'coffre', kind: 'bois', x: 270, y: 545, w: 90, d: 50 },
      { name: 'tonneau', kind: 'bois', x: 860, y: 60, w: 60, d: 60 },
      { name: 'jarres', kind: 'terre', x: 930, y: 60, w: 100, d: 45 },
      { name: 'sacs', kind: 'paille', x: 1300, y: 60, w: 50, d: 120 },
      { name: 'etagere', kind: 'bois', x: 1060, y: 50, w: 160, d: 30 },
      { name: 'corde, masse, coin', kind: 'outil', x: 880, y: 200, w: 120, d: 40 },
      { name: 'etabli', kind: 'bois', x: 1050, y: 535, w: 200, d: 60 },
      { name: 'billot', kind: 'bois', x: 1290, y: 430, w: 55, d: 55 },
      { name: 'bois a sculpter', kind: 'bois', x: 860, y: 520, w: 150, d: 60 },
      { name: 'outils', kind: 'outil', x: 860, y: 340, w: 110, d: 30 },
    ],
    openings: [
      { kind: 'porte', wall: 'south', x: 240, w: 100 },
      { kind: 'fenetre', wall: 'south', x: 440, w: 80 },
      { kind: 'fenetre', wall: 'south', x: 1040, w: 80 },
      { kind: 'porte', wall: 'north', x: 1040, w: 100 },
    ],
    south: ['angle', 'porte', 'fenetre', 'plein', 'plein', 'fenetre', 'angle'],
    north: ['angle', 'plein', 'plein', 'plein', 'plein', 'porte', 'angle'],
    chimneyInGable: false,
  },
];

/** Longueurs (cm) des cloisons d'un plan, passages déduits. */
export const partitionLengths = (p: Plan): number[] => p.partitions.map((r) => Math.max(r.w, r.d));
