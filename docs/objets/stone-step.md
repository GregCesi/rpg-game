# L'escalier de pierre et le garde-corps

Décidé le 4 et le 5 novembre 2026 (chantier « maison du coq », CADRAGE-coq.md sections 9 à 12 ; dessins du pixel-artist validés par
Grégoire : `.art-preview/coq-catalogue-*.png`, `.art-preview/coq-integration-*.png`). L'escalier droit de la maison du coq (réponse 7) : des marches monolithes de 100 × 30 × 19 cm, chacune posée sur la précédente (giron de 26 cm, 4 cm de recouvrement), et le mur d'échiffre de pierres sous elles ; le garde-corps de bois le long de la trémie, à l'étage. Les marches se marchent (`walk`) : on monte d'une marche à chaque pas (19 cm, sous les 50 cm de `step`).

## Identité
- Clés : `stone-step`, `stair-stringer-block`, `stair-railing`, `stair-railing-short`.
- Nature : objets du monde (`props.json`), posés en mode construction ; aucun ne se prend encore (leur icône et leur vue portée sont à dessiner).
- Âge : le bois travaillé prend l’âge du bois (`aged`).

## Masse
Par la matière (`mass` : `matter`, `fill` ; calcaire 2 400 kg/m³, bois 900, fer 7 870), ou saisie pour la laine, le verre et le plomb :

| Clé | Nom | Dimensions (cm) | Masse | Vues |
| --- | --- | --- | --- | --- |
| `stone-step` | marche de pierre | 100 × 30 × 19 | 137 kg | quatre (`four` : R0 à R3) |
| `stair-stringer-block` | pierre d'échiffre | 60 × 20 × 30 | 69 kg | quatre (`four` : R0 à R3) |
| `stair-railing` | garde-corps | 280 × 10 × 100 | 20 kg | quatre (`four` : R0 à R3) |
| `stair-railing-short` | garde-corps court | 100 × 10 × 100 | 9,0 kg | quatre (`four` : R0 à R3) |

Au-dessus des 70 kg que Xéros porte seul : `stone-step` (à deux, avec l’aide de la mère jusqu’à 140 kg, puis un engin de levage : réponse 22).

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
En jeu : on monte en marchant (CONCEPTION « L'étage ») ; le niveau affiché change à mi-hauteur.

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
