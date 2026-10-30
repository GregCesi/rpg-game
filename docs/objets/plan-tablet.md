# Planchette gravée (`plan-tablet`)

## Identité
- Clé : `plan-tablet`.
- Nom affiché : planchette gravée.
- Nature : objet du monde (`props.json`), sans `take` : il reste en place. Composant `teaches` : le plan de l'abri à bois (`woodshed`, plans.json).
- Mains : aucune.

## Masse
- Pas déplaçable : pas de masse.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Planchette de bois de 30 × 20 cm, 2 cm d'épaisseur, contour compris, où la mère, qui sculpte, a gravé au couteau le plan de l'abri : les quatre dés, les quatre poteaux, le toit en pente. Boîte (`box`), à plat.
- À l'écran : W = 6 px ; H + D/2 = 0,4 + 2 = 2,4 : **6 × 3**.
- Elle est posée sur une table de ferme (`table`, 210 × 90 × 78 cm) dans la chambre de la mère (`maison.tmj`). Le bas de son image est au sol, au bord sud de la table (c'est sa profondeur d'affichage), et elle garde sous elle, dans son image, des rangées vides : la hauteur de la table (78 cm = **16 rangées**), pour qu'elle se voie posée sur le plateau.

## Vues
- Posée : `plan-tablet`, 6 × (3 + 16 rangées vides) px : un petit rectangle de bois clair (matière de la palette), le dessus gravé de quelques traits sombres (deux carrés dessinés, des lignes), la tranche au sud ; contour comme les petits objets. Pas de version `-left`.
- En main, case d'interface, fantôme, porté : aucun (elle reste sur la table).

## Regroupement
Seule.

## Gestes
- E court : Xéros apprend le plan (« Xéros connaît maintenant le plan de l'abri à bois. ») ; déjà connu : « Xéros connaît déjà ce plan. ». La planchette reste en place. Les plans connus sont dans GameState (`knownPlans`).
- E maintenu, Espace, R, Q : rien.

## Origine
Gravée par la mère, posée sur sa table. Rien d'autre ne l'enseigne dans ce chantier.

## Devenir
Reste sur la table. Plus tard : d'autres planchettes, d'autres plans (cabane, maison).

## Vérification
- Aperçu : `.art-preview/collection.png`.
- En jeu, en cinq étapes : 1. `?dieu`, ou à la main : E sur la planchette, chez la mère (le plan est appris). 2. Hachette (réserve de la maison) dans une main, branche dans l'autre, face au billot, Espace : la branche devient un piquet ; en tailler quatre. 3. Un piquet en main, Espace : le coin nord-ouest ; les trois autres coins en fantôme, y planter les trois autres (un piquet loin des coins est refusé, un tracé gêné aussi). 4. Le chantier naît : six pierres plates sur la berge, en porter une jusqu'à un coin, E sur la place : le dé, et le piquet arraché tombe à côté. 5. Quatre dés : « Abri à bois : poteaux, 0 sur 4 » et les poteaux en fantôme.
