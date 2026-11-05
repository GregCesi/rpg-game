# Les cheminées de la maison du coq

Décidé le 4 et le 5 novembre 2026 (chantier « maison du coq », CADRAGE-coq.md sections 9 à 12 ; dessins du pixel-artist validés par
Grégoire : `.art-preview/coq-catalogue-*.png`, `.art-preview/coq-integration-*.png`). La cheminée à hotte de pierre de la salle (deux jambages, deux consoles, huit claveaux en plate-bande (`mantel-lintel`, d'un seul tenant dans le jeu), le contrecœur), la cheminée de la chambre du coq (deux jambages, un linteau), et, à la cuisine, l'évier de pierre qui verse dehors et la dalle du potager.

## Identité
- Clés : `mantel-lintel`, `fireplace-jamb`, `fireplace-console`, `mantel-voussoir`, `fireback`, `small-fireplace-jamb`, `small-fireplace-lintel`, `stone-sink`, `stove-slab`.
- Nature : objets du monde (`props.json`), posés en mode construction ; aucun ne se prend encore (leur icône et leur vue portée sont à dessiner).
- Âge : aucun, c’est de la pierre.

## Masse
Par la matière (`mass` : `matter`, `fill` ; calcaire 2 400 kg/m³, bois 900, fer 7 870), ou saisie pour la laine, le verre et le plomb :

| Clé | Nom | Dimensions (cm) | Masse | Vues |
| --- | --- | --- | --- | --- |
| `fireplace-jamb` | jambage de cheminée | 40 × 50 × 110 | 528 kg | quatre (`four` : R0 à R3) |
| `fireplace-console` | console de hotte | 40 × 60 × 30 | 121 kg | quatre (`four` : R0 à R3) |
| `mantel-voussoir` | claveau de manteau | 30 × 40 × 40 | 104 kg | quatre (`four` : R0 à R3) |
| `fireback` | contrecœur | 120 × 10 × 100 | 288 kg | deux (`symmetric` : est-ouest et `-ns`) |
| `small-fireplace-jamb` | jambage de cheminée de chambre | 30 × 40 × 100 | 288 kg | quatre (`four` : R0 à R3) |
| `small-fireplace-lintel` | linteau de cheminée de chambre | 160 × 30 × 30 | 346 kg | quatre (`four` : R0 à R3) |
| `stone-sink` | évier de pierre | 80 × 50 × 15 | 101 kg | quatre (`four` : R0 à R3) |
| `stove-slab` | dalle de potager | 120 × 60 × 12 | 176 kg | quatre (`four` : R0 à R3) |

Au-dessus des 70 kg que Xéros porte seul : `fireplace-jamb`, `fireplace-console`, `mantel-voussoir`, `fireback`, `small-fireplace-jamb`, `small-fireplace-lintel`, `stone-sink`, `stove-slab` (à deux, avec l’aide de la mère jusqu’à 140 kg, puis un engin de levage : réponse 22).

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
Rien de plus que les meubles : on passe devant, on ne les prend pas.

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
