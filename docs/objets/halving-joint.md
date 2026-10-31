# Mi-bois (`halving`)

Décidé le 31 octobre 2026 (chantier « assemblages », à la demande de Grégoire : nécessaire tout de suite, pour les angles). À l'angle
d'une maison, les sablières basses de deux murs se croisent : chacune est entaillée sur la moitié de son épaisseur, l'une se pose
dans l'autre, une cheville traverse le croisement, et le poteau d'angle se dresse au-dessus.

## Identité
- Clé : `halving` (type d'assemblage, `JointTypeSchema`) ; pas un objet de props.json : une jonction entre deux pièces de bois.
- Nom affiché : mi-bois (masculin).
- Nature : un assemblage posé en mode construction (famille « assemblages »), gardé par GameState (`joints` de la carte : type, les
  deux pièces, et `top`, la pièce du dessus).
- Mains : aucune.

## Masse
Aucune à part : les deux pièces perdent chacune la moitié de leur épaisseur sur la largeur de l'autre (quelques kilos, négligés).

## Dimensions (gabarit, docs/STYLE.md section 8)
Deux pièces couchées de **même section**, qui se croisent **à angle droit**, **à la même hauteur** : au croisement, une seule
épaisseur. Au bout de l'une ou des deux (un angle, un T) ou au milieu des deux (une croix).

## Vues
- Les deux pièces gardent leur dessin ; par-dessus, au croisement, une image opaque montre le croisement d'un seul tenant : la pièce du
  dessus entaillée qui se pose dans celle du dessous, à fleur, et le point de la cheville au centre (`joint-halving-normal-<aspect>-<dessus>-<masque>`,
  art/world/joints.ts : aspect `beam` ou `round`, dessus `ew` ou `ns`, masque des côtés où une pièce continue, nord 1, est 2, sud 4,
  ouest 8). Sa colonne 0 est celle de l'image de la pièce nord-sud, sa rangée 0 celle de l'image de l'est-ouest (`halvingOverlays`,
  world/jointView.ts). Dessiné pour le normal (la sablière) ; un autre diamètre s'assemble sans dessin de croisement, pour l'instant.
- Fantôme : un cercle au croisement visé, clair si les pièces vont ensemble, rouge sinon.

## Variantes naturelles
Aucune.

## Regroupement
Un par croisement ; une maison en a quatre aux angles de ses sablières basses.

## Gestes (mode construction)
- Poser la première sablière, puis la seconde **sur** elle, en travers (elle s'accroche sur son dessus) ; puis le mi-bois en main,
  clic gauche sur le croisement : la pièce du dessus **descend dans l'autre**, les deux à la même hauteur. Refusé avec la raison :
  « Les deux pièces doivent avoir la même section. », « … dans le même état… », « Le mi-bois croise deux pièces à angle droit. »,
  « Retire d'abord ce qui repose sur elle. ».
- Clic droit sur le croisement : le mi-bois est retiré, la pièce du dessus remonte sur l'autre ; refusé tant qu'une pièce repose sur
  le croisement (« Retire d'abord ce qui repose sur le croisement. », le poteau d'angle). Maj + clic droit sur une pièce : tout
  l'ensemble.

## Origine
En mode construction : posé d'un clic, sans fabrication. **Plus tard, en jeu** : tracer et scier les deux entailles (la scie, le
ciseau à bois et le **maillet**), percer le croisement (une **tarière**), enfoncer la **cheville** (`peg`) ; un geste par étape.

## Devenir
Il tient tant que les deux pièces se croisent. Retiré, la pièce du dessus reprend sa hauteur sur l'autre.

## Transformations
Aucune pour l'instant.

## Métier
Le charpentier (`carpenter`).

## Limite connue
Une sablière nord-sud posée sur un solin nord-sud affleure sa face extérieure dans les données (son emprise au sol), mais son image
déborde de 2 px vers le dehors : en règle D, l'image nord-sud d'une poutre fait 10 px de large pour 6 px d'emprise, et elle est aussi
relevée de sa hauteur (40 cm, 8 px vers le nord) alors que le solin nord-sud ne l'est pas. À trancher avec Grégoire (règle D des pièces
nord-sud posées en hauteur).

## Vérification
- `.art-preview/assemblages.png` : l'angle de deux sablières avant et après, sur un angle de solin, et le poteau d'angle.
- `npm run test:construction` : les sablières posées sur le solin s'accrochent sur son dessus et affleurent sa face extérieure ; le
  mi-bois les met à la même hauteur, un seul dessin au croisement ; le poteau d'angle se dresse au-dessus ; le retrait du mi-bois est
  refusé tant qu'il porte le poteau.
