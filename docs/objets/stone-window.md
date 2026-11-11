# Croisées et demi-croisées

Décidé le 4 et le 5 novembre 2026 (chantier « maison du coq », CADRAGE-coq.md sections 9 à 12 ; dessins du pixel-artist validés par
Grégoire : `.art-preview/coq-catalogue-*.png`, `.art-preview/coq-integration-*.png`). Les baies de la maison du coq (réponse 6) : à l'étage, des croisées de pierre (un appui, deux meneaux, une traverse, un linteau ; vitraux en losanges plombés en haut, volets de bois en bas) ; au rez-de-chaussée, des demi-croisées (une imposte vitrée, des barreaux de fer, des volets). Dans le jeu, la baie se pose en deux pièces assemblées tirées des assemblages validés, au jour près (le moteur n'encastre pas une pièce dans une autre) : `cross-window` (l'appui et le jour de 1,65 m de la croisée) et `half-cross-window` (l'appui et le jour de 1,35 m de la demi-croisée), sous le linteau posé à part sur les tableaux ; les jours ont 5 cm de plus ou de moins que les planches pour tomber sur les assises de 30 cm. Les volets s'ouvrent et se ferment (E, `swing`) : ouverts, ils éclairent la pièce de leur niveau.

## Identité
- Clés : `cross-window`, `half-cross-window`, `window-sill`, `window-lintel`, `mullion-low`, `mullion-high`, `transom`, `leaded-glass`, `leaded-transom`, `casement-shutter`, `casement-shutter-open`, `window-bar`.
- Nature : objets du monde (`props.json`), posés en mode construction ; aucun ne se prend encore (leur icône et leur vue portée sont à dessiner).
- Âge : le bois travaillé prend l’âge du bois (`aged`).

## Masse
Par la matière (`mass` : `matter`, `fill` ; calcaire 2 400 kg/m³, bois 900, fer 7 870), ou saisie pour la laine, le verre et le plomb :

| Clé | Nom | Dimensions (cm) | Masse | Vues |
| --- | --- | --- | --- | --- |
| `window-sill` | appui de baie | 125 × 30 × 15 | 135 kg | quatre (`four` : R0 à R3) |
| `window-lintel` | linteau de baie | 140 × 30 × 30 | 302 kg | quatre (`four` : R0 à R3) |
| `mullion-low` | meneau du bas | 15 × 20 × 90 | 65 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `mullion-high` | meneau du haut | 15 × 20 × 55 | 40 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `transom` | traverse | 105 × 20 × 15 | 76 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `leaded-glass` | vitrail en losanges | 45 × 3 × 55 | 4,0 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `leaded-transom` | imposte vitrée | 105 × 3 × 45 | 7,0 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `casement-shutter` | volet de croisée | 45 × 3 × 90 | 9,8 kg | quatre (`four` : R0 à R3) |
| `casement-shutter-open` | volet de croisée (ouvert) | 45 × 3 × 90 | 9,8 kg | quatre (`four` : R0 à R3) |
| `window-bar` | barreau de fer | 3 × 3 × 90 | 4,5 kg | une (`round`) |

Au-dessus des 70 kg que Xéros porte seul : `window-sill`, `window-lintel`, `transom` (à deux, avec l’aide de la mère jusqu’à 140 kg, puis un engin de levage : réponse 22).

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
E sur un volet : l'ouvre ou le ferme.

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
mason ; le fer et le plomb : `leaded-glass` (smith), `leaded-transom` (smith), `window-bar` (smith).

## Vérification
`npm run art:preview`, `npm run check` ; la maison bâtie : `npm run test:maison-coq` ; l'étage : `npm run test:etage`.
