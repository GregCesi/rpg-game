# Le toit de laves

Décidé le 4 et le 5 novembre 2026 (chantier « maison du coq », CADRAGE-coq.md sections 9 à 12 ; dessins du pixel-artist validés par
Grégoire : `.art-preview/coq-catalogue-*.png`, `.art-preview/coq-integration-*.png`). Le toit de la maison du coq (réponses 5 et 26) : **notre lave, plus sombre et moussue, est la seule lauze du jeu** (elle a aussi remplacé celle de la forge, `lauze-roof-large`) ; deux pans à 45° entre les pignons découverts (`ashlar-gable`), le pan nord percé pour la souche de la salle et de la chambre, le faîtage de pierres taillées en bâtière. La lave seule (`stone-slate`) est la pierre qu'on porte. La charpente (pannes, ferme, chevrons, lattes) est comprise dans le pan, comme le chevronnage du chaume de la maison de Xéros.

## Identité
- Clés : `lave-roof`, `lave-roof-pierced`, `lave-ridge`, `stone-slate`, `ashlar-gable`.
- Nature : objets du monde (`props.json`), posés en mode construction ; aucun ne se prend encore (leur icône et leur vue portée sont à dessiner).
- Âge : aucun, c’est de la pierre.

## Masse
Par la matière (`mass` : `matter`, `fill` ; calcaire 2 400 kg/m³, bois 900, fer 7 870), ou saisie pour la laine, le verre et le plomb :

| Clé | Nom | Dimensions (cm) | Masse | Vues |
| --- | --- | --- | --- | --- |
| `lave-roof` | pan de laves | 1520 × 370 × 370 | 44 947 kg | quatre (`four` : R0 à R3) |
| `lave-roof-pierced` | pan de laves percé | 1520 × 370 × 370 | 43 948 kg | quatre (`four` : R0 à R3) |
| `lave-ridge` | faîtage de laves | 1520 × 60 × 30 | 3 283 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `stone-slate` | lave | 40 × 50 × 4 | 15 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `ashlar-gable` | pignon découvert | 680 × 60 × 380 | 18 605 kg | quatre (`four` : R0 à R3) |

Au-dessus des 70 kg que Xéros porte seul : `lave-roof`, `lave-roof-pierced`, `lave-ridge`, `ashlar-gable` (à deux, avec l’aide de la mère jusqu’à 140 kg, puis un engin de levage : réponse 22).

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
Rien : un toit (`roof`), qui ne s'efface jamais dehors (la maison est close).

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
roofer.

## Vérification
`npm run art:preview`, `npm run check` ; la maison bâtie : `npm run test:maison-coq` ; l'étage : `npm run test:etage`.
