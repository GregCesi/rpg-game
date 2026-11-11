# Dalles de sol

Décidé le 4 et le 5 novembre 2026 (chantier « maison du coq », CADRAGE-coq.md sections 9 à 12 ; dessins du pixel-artist validés par
Grégoire : `.art-preview/coq-catalogue-*.png`, `.art-preview/coq-integration-*.png`). Le dallage de calcaire de la salle et du passage (réponse 11). **Le dallage se pose par pans qui consomment leurs dalles** (réponse 30) : `flagstone-row`, une rangée de dalles de 60 × 40 × 8 cm, de toute longueur, joints décalés d'une rangée à l'autre ; la dalle seule `floor-flagstone` reste posable pour les retouches. Les deux se marchent (`walk` : CONCEPTION « L'étage »).

## Identité
- Clés : `floor-flagstone`, `flagstone-row`.
- Nature : objets du monde (`props.json`), posés en mode construction ; aucun ne se prend encore (leur icône et leur vue portée sont à dessiner).
- Âge : aucun, c’est de la pierre.

## Masse
Par la matière (`mass` : `matter`, `fill` ; calcaire 2 400 kg/m³, bois 900, fer 7 870), ou saisie pour la laine, le verre et le plomb :

| Clé | Nom | Dimensions (cm) | Masse | Vues |
| --- | --- | --- | --- | --- |
| `floor-flagstone` | dalle de sol | 60 × 40 × 8 | 46 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `flagstone-row` | pan de dallage | 160 × 40 × 8 | 123 kg | quatre (`four` : R0 à R3) |

Au-dessus des 70 kg que Xéros porte seul : `flagstone-row` (à deux, avec l’aide de la mère jusqu’à 140 kg, puis un engin de levage : réponse 22).

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
Mode construction : un pan de dallage se pose de toute longueur, rangée après rangée ; on marche dessus (8 cm).

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
