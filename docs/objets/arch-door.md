# La porte en arc au coq

Décidé le 4 et le 5 novembre 2026 (chantier « maison du coq », CADRAGE-coq.md sections 9 à 12 ; dessins du pixel-artist validés par
Grégoire : `.art-preview/coq-catalogue-*.png`, `.art-preview/coq-integration-*.png`). La porte d'entrée de la maison du coq : un arc en plein cintre de claveaux chanfreinés sur deux sommiers, sa **clef au coq de 50 × 60 × 50 cm** (réponse 25), l'arc se pose d'un seul tenant dans le jeu (`stone-arch`, tiré de l'assemblage validé), et la porte de chêne cloutée de 1,10 × 2,20 m qui s'ouvre (E, `swing.passage` : on entre par elle).

## Identité
- Clés : `stone-arch`, `door-voussoir`, `door-keystone`, `door-springer`, `oak-arch-door`, `oak-arch-door-open`.
- Nature : objets du monde (`props.json`), posés en mode construction ; aucun ne se prend encore (leur icône et leur vue portée sont à dessiner).
- Âge : le bois travaillé prend l’âge du bois (`aged`).

## Masse
Par la matière (`mass` : `matter`, `fill` ; calcaire 2 400 kg/m³, bois 900, fer 7 870), ou saisie pour la laine, le verre et le plomb :

| Clé | Nom | Dimensions (cm) | Masse | Vues |
| --- | --- | --- | --- | --- |
| `door-voussoir` | claveau de l'arc | 30 × 60 × 30 | 95 kg | quatre (`four` : R0 à R3) |
| `door-keystone` | clef au coq | 50 × 60 × 50 | 331 kg | quatre (`four` : R0 à R3) |
| `door-springer` | sommier de l'arc | 40 × 60 × 30 | 164 kg | quatre (`four` : R0 à R3) |
| `oak-arch-door` | porte de chêne en arc | 110 × 8 × 220 | 162 kg | quatre (`four` : R0 à R3) |
| `oak-arch-door-open` | porte de chêne en arc (ouverte) | 110 × 8 × 220 | 162 kg | quatre (`four` : R0 à R3) |

Au-dessus des 70 kg que Xéros porte seul : `door-voussoir`, `door-keystone`, `door-springer`, `oak-arch-door`, `oak-arch-door-open` (à deux, avec l’aide de la mère jusqu’à 140 kg, puis un engin de levage : réponse 22).

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
E sur la porte : l'ouvre ou la ferme ; ouverte, on entre dans la maison.

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
