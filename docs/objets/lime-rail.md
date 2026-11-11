# La cloison de l'étage

Décidé le 4 et le 5 novembre 2026 (chantier « maison du coq », CADRAGE-coq.md sections 9 à 12 ; dessins du pixel-artist validés par
Grégoire : `.art-preview/coq-catalogue-*.png`, `.art-preview/coq-integration-*.png`). La cloison en pan de bois chaulé entre la chambre du coq et celle de sa fille (réponse 19) : les poteaux (`door-frame`), les remplissages chaulés (`lime-panel`, et `lime-panel-low` de 40 cm au-dessus de la lisse), la **lisse chaulée** de 25 cm qui la rend lisible vue d'en haut, la porte intérieure. Nord-sud, elle se voit entière, comme un mur de côté (réponse 32).

## Identité
- Clés : `lime-rail`, `lime-panel-low`.
- Nature : objets du monde (`props.json`), posés en mode construction ; aucun ne se prend encore (leur icône et leur vue portée sont à dessiner).
- Âge : le bois travaillé prend l’âge du bois (`aged`).

## Masse
Par la matière (`mass` : `matter`, `fill` ; calcaire 2 400 kg/m³, bois 900, fer 7 870), ou saisie pour la laine, le verre et le plomb :

| Clé | Nom | Dimensions (cm) | Masse | Vues |
| --- | --- | --- | --- | --- |
| `lime-rail` | lisse chaulée | 560 × 25 × 15 | 164 kg | quatre (`four` : R0 à R3) |
| `lime-panel-low` | remplissage chaulé bas | 140 × 15 × 40 | 135 kg | quatre (`four` : R0 à R3) |

Au-dessus des 70 kg que Xéros porte seul : `lime-rail`, `lime-panel-low` (à deux, avec l’aide de la mère jusqu’à 140 kg, puis un engin de levage : réponse 22).

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
Mode construction : posée sur le plancher, au droit d'une solive doublée.

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
