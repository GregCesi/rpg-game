// MIS DE CÔTÉ (hors jeu) : le logis du forgeron proposé à l'essai 1 de la forge (CADRAGE-forge.md, sections 0 et 2). Grégoire l'a trouvé
// bien, mais trop proche de la maison de Xéros : il servira pour un autre emplacement. L'essai 2 de la forge n'a plus de logis (l'atelier
// seul, l'abri à charbon, le puits, la place de la fonderie). tools/essai-forge.ts l'importe encore pour la planche de l'intérieur de
// l'essai 1 (`npx tsx tools/essai-forge.ts interieur`, .art-preview/forge-interieur.png).
//
// Le logis : la maison de Xéros raccourcie (le modèle en volumes de art/proposals/maison-xeros.ts), 8 × 6,40 m entre les axes, cinq
// travées sur quatre ; la salle (4,80 m, la cheminée du jeu contre le mur nord, art/world/chimney.ts) et la chambre (3,20 m), une cloison
// à porte ; deux fenêtres au sud, la porte d'entrée en 3e travée, une fenêtre au nord, une à l'est ; le chaume à 45°. Ses meubles sont
// les images du jeu. Tout en px du jeu (5 cm), l'origine sur l'axe du poteau nord-ouest.

import type { Grid, Palette } from '../lib/canvas';
import { chimneyQuads, AT as CH_AT } from '../world/chimney';
import type { Board, Quad, Tex, V3 } from '../lib/volumes';
import { houseScene, type Plan } from './maison-xeros';
import { mantel } from './cheminee-2';

type Img = { grid: Grid; pal: Palette };
const moveBoard = (b: Board, dx: number, dy: number): Board => ({ ...b, x: b.x + dx, y: b.y + dy, depth: (r) => b.depth(r) + dy });
const moveQuads = (qs: Quad[], [dx, dy, dz]: V3): Quad[] =>
  qs.map((q) => ({ ...q, o: [q.o[0] + dx, q.o[1] + dy, q.o[2] + dz] as V3, tex: (s, t, c) => q.tex(s, t, { ...c, p: [c.p[0] - dx, c.p[1] - dy, c.p[2] - dz] }) }));

/** Le logis : la maison de Xéros raccourcie, 8 × 6,40 m entre les axes, cinq travées sur quatre, la salle et la chambre. */
export const LOGIS: Plan = {
  L: 160, D: 128, pitch: 45, sill: 16, doorW: 18, innerDoorW: 16, trusses: [96],
  walls: [
    { side: 'S', ew: true, c: 128, posts: [0, 32, 64, 96, 128, 160], out: 1, bays: ['plain', 'window', 'door', 'plain', 'window'] },
    { side: 'N', ew: true, c: 0, posts: [0, 32, 64, 96, 128, 160], out: -1, bays: ['plain', 'plain', 'window', 'plain', 'plain'] },
    { side: 'W', ew: false, c: 0, posts: [0, 32, 64, 96, 128], out: -1, bays: ['plain', 'plain', 'plain', 'plain'], ends: [true, true] },
    { side: 'E', ew: false, c: 160, posts: [0, 32, 64, 96, 128], out: 1, bays: ['plain', 'window', 'plain', 'plain'], ends: [true, true] },
    { ew: false, c: 96, posts: [0, 32, 64, 96, 128], out: 1, bays: ['plain', 'plain', 'inner-door', 'plain'], ends: [true, true] },
  ],
};
/** La cheminée du jeu dans le logis : l'âtre en x 10–54 px (contre le mur nord de la salle). */
const CH_DX = 10 - CH_AT.hearth[0];

/** Le chaume percé au droit du conduit (repère de la maison). */
function pierce(quads: Quad[]): Quad[] {
  const x0 = CH_AT.flue(0)[0] + CH_DX, y0 = CH_AT.flue(0)[1], x1 = x0 + 20, y1 = y0 + 16;
  return quads.map((q) => {
    if (q.part.name !== 'chaume' && q.part.name !== 'latte' && q.part.name !== 'chevron') return q;
    const tex: Tex = (s, t, cx) => {
      const [x, y] = cx.p;
      if (x > x0 - 0.3 && x < x1 + 0.3 && y > y0 - 0.3 && y < y1 + 0.3) return null;
      const k = q.tex(s, t, cx);
      if (k === null || q.part.name !== 'chaume' || cx.face !== 'slope') return k;
      if (x > x0 - 2.1 && x < x1 + 2.1 && y > y0 - 2.1 && y < y1 + 2.1) return x < x0 + 0.5 || y < y0 ? 'd' : 'D';
      return k;
    };
    return { ...q, tex };
  });
}

/** Le logis dans la scène, à l'origine o (px, l'axe du poteau nord-ouest) ; toit posé ou non (le mur sud et la cloison coupés bas). */
export function logisScene(o: [number, number], roof: boolean, frame = 0, img: (name: string) => Img): { quads: Quad[]; boards: Board[]; floor: [number, number, number, number] } {
  const house = houseScene(roof ? { rot: 0, wall: 4, roof: 5, plan: LOGIS } : { rot: 0, wall: 4, roof: 0, cut: true, plan: LOGIS }, img);
  let quads = house.quads;
  if (roof) quads = pierce(quads);
  const chim = moveQuads(chimneyQuads(frame, roof ? Infinity : 52), [CH_DX, 0, 0]);
  const m = mantel('ew');
  const mb: Board = { grid: m.grid, pal: m.pal, x: CH_AT.mantel[0] + CH_DX, y: Math.round(28 - 30 - m.grid.length), depth: () => 28 };
  return {
    quads: moveQuads([...quads, ...chim], [o[0], o[1], 0]),
    boards: [...house.boards, mb].map((b) => moveBoard(b, o[0], o[1])),
    floor: [o[0] + 5, o[0] + 155, o[1] + 5, o[1] + 123],
  };
}

/** Les meubles du logis (repère du logis, px) : la salle et la chambre. */
export function logisFurniture(o: [number, number], prop: (key: string, x0: number, y0: number, view: number, z: number, o: [number, number]) => Board): Board[] {
  const at = (key: string, x: number, y: number, v = 0) => prop(key, x * 5, y * 5, v, 0, o);
  return [
    at('table', 28, 58), at('bench', 29, 77), at('stool', 34, 50), at('stool', 58, 50),
    at('barrel', 7, 90), at('jar', 8, 106), at('bucket-water', 58, 12), at('chest', 6, 38, 1),
    at('bed', 122, 6), at('chest', 102, 6), at('crate', 140, 108),
  ];
}

