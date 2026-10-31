# Encoche (`notch`)

Décidée le 31 octobre 2026 (chantier « cabane en rondins ») : l'assemblage des rondins aux angles d'une cabane. Chaque rondin est
creusé par-dessous d'une encoche en creux arrondi, à la forme du rondin qu'il croise, et s'y pose : il s'enfonce de la moitié de son
diamètre. Les assises montent ainsi en alternant est-ouest et nord-sud, et les rondins dépassent de 20 à 30 cm à l'angle.

## Identité
- Clé : `notch` (type d'assemblage, `JointTypeSchema`) ; pas un objet de props.json : une jonction entre deux rondins.
- Nom affiché : encoche (féminin).
- Nature : un assemblage posé en mode construction (famille « assemblages »), gardé par GameState (`joints` : type, les deux pièces,
  `top` : le rondin du dessus).
- Mains : aucune.

## Masse
Aucune à part : le rondin perd un peu de bois dans le creux (négligé).

## Dimensions (gabarit, docs/STYLE.md section 8)
Deux rondins **ronds** (aspect `round`, à l'écorce) de **même section**, qui se croisent **à angle droit**, le second posé sur le
premier : avec l'encoche, sa base descend de la moitié du diamètre (20 cm pour le rondin du normal, 40 cm contour compris). Une
assise (est-ouest puis nord-sud) monte donc de 40 cm.

## Vues
- Chaque rondin garde son dessin ; par-dessus, au croisement, une image (`joint-notch-normal-<dessus>-<masque>`, art/world/joints.ts,
  10 × 18 px) montre le rondin du dessus logé dans son encoche : il chevauche celui du dessous, l'arche de l'encoche sur sa face vue,
  l'ombre sur le rondin du dessous. Sa colonne 0 est celle de l'image du rondin nord-sud, sa rangée 0 quatre rangées au-dessus de
  celle du rondin est-ouest (`halvingOverlays`, world/jointView.ts). Le masque dit de quels côtés un rondin continue (nord 1, est 2,
  sud 4, ouest 8) ; un dépassement de 20 cm au plus est un bout, pas une suite.
- Dessiné pour le normal (le rondin de cabane).
- Fantôme : un cercle au croisement visé, clair si les rondins vont ensemble, rouge sinon.

## Variantes naturelles
Aucune à part celle des rondins.

## Regroupement
Une par croisement : quatre par assise pour une cabane à quatre murs.

## Gestes (mode construction)
- Poser le rondin du dessus en travers sur l'autre (il s'accroche sur son dessus), puis l'encoche en main, clic gauche sur le
  croisement : il s'enfonce de la moitié de son diamètre ; s'il l'est déjà (par une autre encoche, à l'autre bout), rien ne bouge.
  Refusé avec la raison : « Les deux pièces doivent avoir la même section. », « … dans le même état… » (une poutre : le mi-bois),
  « L'encoche croise deux pièces à angle droit. », « L'une doit reposer sur l'autre. ».
- Clic droit sur le croisement : l'encoche est retirée ; le rondin remonte s'il ne tient plus par une autre encoche, refusé tant
  qu'une pièce repose sur le croisement.

## Origine
En mode construction : posée d'un clic. **Plus tard, en jeu** : tracer l'encoche au compas (le « scribe ») sur le rondin posé en
travers, la creuser à la hache et à la gouge, le reposer ; le bûcheron ou le charpentier.

## Devenir
Elle tient tant que les rondins se croisent.

## Transformations
Aucune pour l'instant.

## Métier
Le bûcheron (`woodcutter`) ou le charpentier.

## Vérification
- `.art-preview/joint-notch.png` (planche du pixel-artist), `.art-preview/cabane.png`.
- `tools/test-build.ts` : la règle ; `npm run test:cabane` : 42 assemblages, dont les encoches de cinq assises, de la dernière et de
  la faîtière.
