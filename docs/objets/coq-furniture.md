# Les meubles de la maison du coq

Décidé le 4 et le 5 novembre 2026 (chantier « maison du coq », CADRAGE-coq.md sections 9 à 12 ; dessins du pixel-artist validés par
Grégoire : `.art-preview/coq-catalogue-*.png`, `.art-preview/coq-integration-*.png`). Le mobilier propre à la famille du coq : le lit à courtines des parents, le dressoir et ses étains, la chaise à haut dossier du coq, le pétrin de la cuisine, l'écritoire de l'intellectuel, la table de tailleuse de la fille et ses coupons d'étoffe, le lit défait du fainéant.

## Identité
- Clés : `canopy-bed`, `dresser`, `high-chair`, `kneading-trough`, `writing-desk`, `tailor-table`, `cloth-bolt`, `pewter`, `unmade-bed`.
- Nature : objets du monde (`props.json`), posés en mode construction ; aucun ne se prend encore (leur icône et leur vue portée sont à dessiner).
- Âge : le bois travaillé prend l’âge du bois (`aged`).

## Masse
Par la matière (`mass` : `matter`, `fill` ; calcaire 2 400 kg/m³, bois 900, fer 7 870), ou saisie pour la laine, le verre et le plomb :

| Clé | Nom | Dimensions (cm) | Masse | Vues |
| --- | --- | --- | --- | --- |
| `canopy-bed` | lit à courtines | 160 × 210 × 200 | 121 kg | quatre (`four` : R0 à R3) |
| `dresser` | dressoir | 100 × 45 × 180 | 73 kg | quatre (`four` : R0 à R3) |
| `high-chair` | chaise à haut dossier | 55 × 50 × 130 | 26 kg | quatre (`four` : R0 à R3) |
| `kneading-trough` | pétrin | 150 × 60 × 80 | 78 kg | quatre (`four` : R0 à R3) |
| `writing-desk` | écritoire | 90 × 60 × 90 | 35 kg | quatre (`four` : R0 à R3) |
| `tailor-table` | table de tailleuse | 140 × 70 × 75 | 33 kg | quatre (`four` : R0 à R3) |
| `cloth-bolt` | coupon d'étoffe | 40 × 30 × 10 | 2,0 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `pewter` | étains (plat, pichet) | 30 × 30 × 25 | 2,0 kg | une (`round`) |
| `unmade-bed` | lit défait | 150 × 200 × 80 | 65 kg | quatre (`four` : R0 à R3) |

Au-dessus des 70 kg que Xéros porte seul : `canopy-bed`, `dresser`, `kneading-trough` (à deux, avec l’aide de la mère jusqu’à 140 kg, puis un engin de levage : réponse 22).

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
Mode construction : posés comme les autres meubles ; en jeu, ils barrent le passage à leur niveau seulement.

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
joiner.

## Vérification
`npm run art:preview`, `npm run check` ; la maison bâtie : `npm run test:maison-coq` ; l'étage : `npm run test:etage`.
