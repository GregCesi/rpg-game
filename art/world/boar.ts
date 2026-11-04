// Le sanglier dans le jeu (chantier « sangliers », fiches docs/objets/boar.md et dead-boar.md) : la variante C validée par Grégoire
// (essai du 4 novembre 2026, planches de tools/essai-sangliers-c.ts), sans un pixel changé. Les dessins sont dans
// art/world/boar-shapes.ts ; ce module les range dans la planche du jeu.
//
// Ce module déclare :
// - la planche `boar` (la créature) : frames de 46 × 40, animations `<pose>-<direction>` pour les poses du moteur des créatures
//   (src/world/creature.ts) : `graze` (la fouille), `sit` et `alert` (debout, arrêté), `hop` (la marche), `tell` (l'annonce), `charge`,
//   `impact` (le choc contre un obstacle, joué une fois avant `stunned`), `stunned` (sonné), `rest` (couché à la bauge), `die` (la
//   bascule sur le flanc) ; dans les directions down, up, left, right (left = miroir de right ; la mort n'est dessinée que de profil :
//   de face et de dos, elle bascule comme de profil). Chaque image garde sa durée validée (`durations`).
//   Les pieds sur la rangée 34 : cinq rangées dessous (l'ombre, la poussière de la charge et de l'annonce) ; la planche le dit
//   (`feet`), et le jeu pose la bête d'autant (systems/creatures.ts). Le profil (46 × 30) et la face (22 × 46) des dessins sont posés
//   dans la frame à leurs pieds ; ce qui dépasserait est refusé.
// - le sanglier mort au sol : `dead-boar-ground` (tête à l'est, la dernière image de la mort), `-r1` (tête au sud), `-r2` (tête à
//   l'ouest), `-r3` (tête au nord) : les quatre vues de l'objet `dead-boar` (règle D : 28 × 16 et 16 × 28).

import { Canvas, EMPTY, flipX, type Grid } from '../lib/canvas';
import type { ArtSource, ImageSource, SpriteSheetSource } from '../lib/types';
import { FOOT, FFOOT, FRONT, SIDE, bed, charge, dazed, deadViews, death, impact, palette, root, stand, tell, walk, back, front, type Anim, type Dir } from './boar-shapes';

/** La frame du jeu, et la rangée de ses pieds (deux rangées dessous : l'ombre). */
export const BOAR_FRAME = { w: 46, h: 40, feet: 34 } as const;

/** Pose un dessin (profil ou face) dans la frame du jeu, ses pieds sur la rangée des pieds ; rien ne doit dépasser. */
function place(g: Grid, feet: number, name: string): Grid {
  const dx = Math.round((BOAR_FRAME.w - g[0].length) / 2);
  const dy = BOAR_FRAME.feet - feet;
  g.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === EMPTY) return;
      const fx = x + dx;
      const fy = y + dy;
      if (fx < 0 || fy < 0 || fx >= BOAR_FRAME.w || fy >= BOAR_FRAME.h) throw new Error(`boar ${name} : le pixel (${x}, ${y}) sort de la frame du jeu`);
    }),
  );
  return new Canvas(BOAR_FRAME.w, BOAR_FRAME.h).stamp(g, dx, dy).toGrid();
}

const at = (dir: Dir) => (dir === 'right' ? FOOT : FFOOT);
if (SIDE.w > BOAR_FRAME.w || FRONT.w > BOAR_FRAME.w) throw new Error('boar : la frame du jeu est plus étroite que les dessins');

/** Une animation dessinée, dans les trois directions dessinées (et la gauche en miroir). */
type Anims = Partial<Record<Dir, Anim>>;

/** Debout, arrêté : une seule image. */
const still: Anims = {
  right: { frames: [stand], ms: [1000], loop: true, note: '' },
  down: { frames: [front({})], ms: [1000], loop: true, note: '' },
  up: { frames: [back({})], ms: [1000], loop: true, note: '' },
};

/** La mort n'est dessinée que de profil : de face et de dos, la même bascule. */
const dying: Anims = { right: death, down: death, up: death };

const POSES: Record<string, Anims> = {
  graze: root,
  sit: still,
  hop: walk,
  alert: still,
  tell,
  charge,
  impact,
  stunned: dazed,
  rest: bed,
  die: dying,
};

function boarSheet(): SpriteSheetSource {
  const animations: SpriteSheetSource['animations'] = {};
  for (const [pose, anims] of Object.entries(POSES))
    for (const dir of ['right', 'down', 'up'] as const) {
      const a = anims[dir]!;
      // la mort de face et de dos reprend le profil
      const feet = pose === 'die' ? FOOT : at(dir);
      const frames = a.frames.map((g, i) => place(g, feet, `${pose}-${dir}-${i}`));
      const repeat = a.loop ? -1 : 0;
      animations[`${pose}-${dir}`] = { frames, frameRate: 1, repeat, durations: a.ms };
      if (dir === 'right') animations[`${pose}-left`] = { frames: frames.map(flipX), frameRate: 1, repeat, durations: a.ms };
    }
  return { kind: 'spritesheet', name: 'boar', frameW: BOAR_FRAME.w, frameH: BOAR_FRAME.h, feet: BOAR_FRAME.h - 1 - BOAR_FRAME.feet, palette, animations };
}

const img = (name: string, grid: Grid): ImageSource => ({ kind: 'image', name, palette, grid });

const [ground, r1, r2, r3] = deadViews;

const sources: ArtSource[] = [
  boarSheet(),
  img('dead-boar-ground', ground),
  img('dead-boar-ground-r1', r1),
  img('dead-boar-ground-r2', r2),
  img('dead-boar-ground-r3', r3),
];

export default sources;
