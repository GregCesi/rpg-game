# Pierre de taille de la maison du coq

Décidé le 4 et le 5 novembre 2026 (chantier « maison du coq », CADRAGE-coq.md sections 9 à 12 ; dessins du pixel-artist validés par
Grégoire : `.art-preview/coq-catalogue-*.png`, `.art-preview/coq-integration-*.png`). Le moyen appareil de calcaire (la roche `limestone`), layé et ciselé (réponses 3, 4, 24 et 29 de Grégoire) : **un pan = une assise de 30 cm de toute longueur** (`wall: "ashlar"`, 60 cm de mur ; `ashlar-wall-40` pour les refends et les murs de l'étage au nord et au sud), dessiné par le jeu à partir des pierres en données (`world/walls.ts`, le tirage `ashlar` de walls.json : carreaux de 50, 70, 90 cm et boutisse de 40 de face, joints décalés d'au moins 15 cm d'une assise à l'autre par la parité de l'assise, chaîne d'angle et tableaux en harpe aux bouts). La face du dedans est enduite de chaux (réponse 31). Le cordon (`string-course-wall`, `string-course-wall-40`, 20 cm) court au niveau de l'étage. Les pierres une à une (carreaux, boutisses, pierre d'angle, de tableau, cordon, corbeau) sont les objets que le pan consomme (réponse 23).

## Identité
- Clés : `ashlar-wall`, `ashlar-wall-40`, `string-course-wall`, `string-course-wall-40`, `ashlar-block-50`, `ashlar-block-70`, `ashlar-block-90`, `ashlar-header`, `ashlar-header-40`, `ashlar-quoin`, `ashlar-jamb`, `ashlar-string-course`, `ashlar-corbel`.
- Nature : objets du monde (`props.json`), posés en mode construction ; aucun ne se prend encore (leur icône et leur vue portée sont à dessiner).
- Âge : aucun, c’est de la pierre.

## Masse
Par la matière (`mass` : `matter`, `fill` ; calcaire 2 400 kg/m³, bois 900, fer 7 870), ou saisie pour la laine, le verre et le plomb :

| Clé | Nom | Dimensions (cm) | Masse | Vues |
| --- | --- | --- | --- | --- |
| `ashlar-wall` | pan de mur de pierre de taille | 160 × 60 × 30 | 677 kg | quatre (`four` : R0 à R3) |
| `ashlar-wall-40` | pan de refend de pierre de taille | 160 × 40 × 30 | 461 kg | quatre (`four` : R0 à R3) |
| `string-course-wall` | pan de cordon | 160 × 60 × 20 | 438 kg | quatre (`four` : R0 à R3) |
| `ashlar-block-50` | carreau de 50 | 50 × 20 × 30 | 72 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `ashlar-block-70` | carreau de 70 | 70 × 20 × 30 | 101 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `ashlar-block-90` | carreau de 90 | 90 × 20 × 30 | 130 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `ashlar-header` | boutisse | 40 × 60 × 30 | 173 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `ashlar-header-40` | boutisse de refend | 40 × 40 × 30 | 115 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `ashlar-quoin` | pierre d'angle | 60 × 40 × 30 | 173 kg | quatre (`four` : R0 à R3) |
| `ashlar-jamb` | pierre de tableau | 40 × 60 × 30 | 173 kg | quatre (`four` : R0 à R3) |
| `ashlar-string-course` | cordon | 60 × 30 × 20 | 82 kg | quatre (`four` : R0 à R3) |
| `ashlar-corbel` | corbeau | 30 × 40 × 30 | 69 kg | quatre (`four` : R0 à R3) |

Au-dessus des 70 kg que Xéros porte seul : `ashlar-wall`, `ashlar-wall-40`, `string-course-wall`, `string-course-wall-40`, `ashlar-block-50`, `ashlar-block-70`, `ashlar-block-90`, `ashlar-header`, `ashlar-header-40`, `ashlar-quoin`, `ashlar-jamb`, `ashlar-string-course` (à deux, avec l’aide de la mère jusqu’à 140 kg, puis un engin de levage : réponse 22).

## Dimensions (gabarit, docs/STYLE.md section 8)
Les dimensions du tableau, en cm ; la taille à l'écran en découle (`expectedSize`), vérifiée par validate.ts à 2 px près. Un pan de
toute longueur (`wall`) a la longueur qu'on lui donne, sur la grille de 10 cm.

## Vues
Celles du tableau, toutes dessinées (le pixel-artist, validées par Grégoire).

## Variantes naturelles
Aucune : de la pierre taillée, du bois travaillé, des étoffes ; réguliers à la mesure du travail.

## Regroupement
Seuls ; un pan de mur ou de dallage compte pour les pierres qu'il consomme.

## Gestes
Mode construction : un pan se pose de toute longueur (sur la grille de 10 cm), assise sur assise ; les pans de même épaisseur, à la même hauteur et bout à bout font un tronçon dessiné d'un seul tenant ; deux tronçons à angle droit font une chaîne d'angle.

## Travail
Aucun pour l'instant (tailler la pierre de taille viendra avec le tailleur).

## Arme
Aucune.

## Origine
Taillé, forgé ou menuisé par le métier du village ; acheté par le coq.

## Devenir
Il reste dans la maison.

## Transformations
Aucune.

## Métier
mason.

## Vérification
`npm run art:preview`, `npm run check` ; la maison bâtie : `npm run test:maison-coq` ; l'étage : `npm run test:etage`.
