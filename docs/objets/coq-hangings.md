# Les tentures

Décidé le 4 et le 5 novembre 2026 (chantier « maison du coq », CADRAGE-coq.md sections 9 à 12 ; dessins du pixel-artist validés par
Grégoire : `.art-preview/coq-catalogue-*.png`, `.art-preview/coq-integration-*.png`). La verdure au coq de la salle (2,40 × 1,60 m, laine : des feuillages et le coq sur un médaillon) et la tenture de la chambre, pendues à des tringles de fer (réponse 10). Achetées à la ville.

## Identité
- Clés : `verdure-tapestry`, `wall-hanging`, `hanging-rod`.
- Nature : objets du monde (`props.json`), posés en mode construction ; aucun ne se prend encore (leur icône et leur vue portée sont à dessiner).
- Âge : le bois travaillé prend l’âge du bois (`aged`).

## Masse
Par la matière (`mass` : `matter`, `fill` ; calcaire 2 400 kg/m³, bois 900, fer 7 870), ou saisie pour la laine, le verre et le plomb :

| Clé | Nom | Dimensions (cm) | Masse | Vues |
| --- | --- | --- | --- | --- |
| `verdure-tapestry` | verdure au coq | 240 × 5 × 160 | 8,0 kg | quatre (`four` : R0 à R3) |
| `wall-hanging` | tenture | 160 × 5 × 120 | 3,0 kg | quatre (`four` : R0 à R3) |
| `hanging-rod` | tringle de fer | 260 × 6 × 8 | 2,9 kg | deux (`symmetric` : est-ouest et `-ns`) |

Toutes se portent seul.

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
Rien : elles pendent au mur.

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
joiner ; le fer et le plomb : `hanging-rod` (smith).

## Vérification
`npm run art:preview`, `npm run check` ; la maison bâtie : `npm run test:maison-coq` ; l'étage : `npm run test:etage`.
