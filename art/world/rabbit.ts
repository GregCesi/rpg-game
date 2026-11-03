// Le lapin de garenne dans le jeu (chantier « lapins », fiches docs/objets/rabbit.md, dead-rabbit.md, warren-hole.md) : la
// version retenue par Grégoire parmi les propositions de l'essai (tools/essai-lapins.ts) : la robe rousse et contrastée de la
// proposition B (`rabbitFur` de art/palette.ts), la face et le dos à 3 px, la vraie échelle de la fiche (15 cm de large : on
// n'agrandit pas). Les dessins sont dans art/world/rabbit-shapes.ts, leur contrat dans art/world/rabbit-types.ts.
//
// Ce module déclare :
// - la planche `rabbit` (la créature) : frames de 14 × 14, animations `<pose>-<direction>` pour graze, sit, hop, alert, run,
//   thump et down, up, left, right (left = miroir de right), en boucle. Les pieds sur la rangée 11, l'ombre sur la 12, la 13
//   vide : comme Xéros (pieds à y = 45 d'une frame de 48), deux rangées sous les pieds ; le corps centré sur la colonne 7, le
//   milieu de la frame. Posée par son origine en bas au centre (Actor, setOrigin(0.5, 1)), la bête a les pieds 3 px au-dessus
//   du point de la créature.
// - le lapin mort au sol : `dead-rabbit-ground` (est-ouest, tête à l'ouest, 9 × 4 plus l'ombre), `-r1`, `-r2`, `-r3` (chaque
//   quart de tour dessiné, la lumière restant en haut à gauche ; règle D : 4 × 9 en nord-sud) ; le bas de l'image est la rangée
//   de l'ombre, comme branch-ground.
// - l'entrée de garenne `warren-hole` : à plat, 10 × 8, sans contour ni ombre (une trace au sol).
// - les touffes de poil `fx-fur` : 4 images de 8 × 8, comme les planches fx-<matière> (art/world/fx.ts).
// Le lapin mort tenu et son icône sont dans art/items/dead-rabbit.ts.

import { flipX, type Grid } from '../lib/canvas';
import type { ArtSource, ImageSource, SpriteSheetSource } from '../lib/types';
import { rabbitFur, world } from '../palette';
import { EARTH_KEYS, checkColors } from './rabbit-lib';
import { buildRabbit } from './rabbit-shapes';
import { FRAME, RABBIT_DIRS, RABBIT_POSES } from './rabbit-types';

/** La palette du lapin : la terre de `world` (garenne, contour, ombre) et la robe. */
export const rabbitPalette: Record<string, string> = {
  ...Object.fromEntries(EARTH_KEYS.map((k) => [k, world[k as keyof typeof world]])),
  l: rabbitFur.light,
  b: rabbitFur.base,
  s: rabbitFur.shade,
  k: rabbitFur.deep,
  w: world.a, // blanc du ventre et de la queue
  v: world.d, // blanc à l'ombre
  i: world['5'], // l'œil
};

/** Les dessins du jeu : la robe rousse, la face à 3 px. */
export const rabbitArt = buildRabbit({
  id: 'jeu',
  title: 'roux contraste, face a 3 px (le jeu)',
  note: 'la robe de B a la largeur de A : la version du jeu',
  palette: rabbitPalette,
  width: 3,
});

function rabbitSheet(): SpriteSheetSource {
  const animations: SpriteSheetSource['animations'] = {};
  for (const pose of RABBIT_POSES) {
    const frameRate = rabbitArt.rates[pose];
    for (const dir of RABBIT_DIRS) {
      const frames = rabbitArt.poses[pose][dir];
      frames.forEach((g, i) => {
        checkColors(`rabbit ${pose}-${dir}-${i}`, g, rabbitPalette);
        if (g.length !== FRAME.h || g.some((r) => r.length !== FRAME.w)) throw new Error(`rabbit : ${pose}-${dir}-${i} n'est pas de ${FRAME.w}×${FRAME.h}`);
      });
      animations[`${pose}-${dir}`] = { frames, frameRate, repeat: -1 };
      if (dir === 'right') animations[`${pose}-left`] = { frames: frames.map(flipX), frameRate, repeat: -1 };
    }
  }
  return { kind: 'spritesheet', name: 'rabbit', frameW: FRAME.w, frameH: FRAME.h, palette: rabbitPalette, animations };
}

const img = (name: string, grid: Grid): ImageSource => {
  checkColors(name, grid, rabbitPalette);
  return { kind: 'image', name, palette: rabbitPalette, grid };
};

const furSheet = (): SpriteSheetSource => ({
  kind: 'spritesheet',
  name: 'fx-fur',
  frameW: 8,
  frameH: 8,
  palette: rabbitPalette,
  animations: { chips: { frames: rabbitArt.fur, frameRate: 1, repeat: 0 } },
});

const [ground, r1, r2, r3] = rabbitArt.deadGround;

const sources: ArtSource[] = [
  rabbitSheet(),
  img('dead-rabbit-ground', ground),
  img('dead-rabbit-ground-r1', r1),
  img('dead-rabbit-ground-r2', r2),
  img('dead-rabbit-ground-r3', r3),
  img('warren-hole', rabbitArt.hole),
  furSheet(),
];

export default sources;
