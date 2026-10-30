# Masse de bûcheron (`maul`)

## Identité
- Clé : `maul` (objet possédable, `items.json`) ; au sol dans la réserve : `maul-ground` (objet du monde, `props.json`).
- Nom affiché : masse de bûcheron.
- Nature : objet possédable, `kind: tool`.
- Mains : deux (manche de 80 cm, tête de fer de 4 kg avec le manche).

## Masse
- 4 kg, saisie (`mass: 4`). Porté (jusqu'à 70 kg) et marche normale (jusqu'à 25 kg) : sans effet sur Xéros.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Tête de fer 15 × 8 × 8 cm (15 cm dans le sens du travers du manche), manche de 80 cm.
- Posée par terre (`maul-ground`) : 80 × 15 × 8 cm, boîte ; à l'écran 16 × 3 px (largeur 80 / 5, hauteur 8 / 5 + 15 / 10).
- En main, à l'échelle : 5 cm par pixel, le manche mesure 16 px, la tête 3 × 2 px de fer.

## Vues
- Symétrie : quatre vues (`views: "four"`, couché, `lying`) : `maul-ground` (la tête à l'est), `maul-ground-r1` (au sud), `maul-ground-r2` (à l'ouest), `maul-ground-r3` (au nord), chacune dessinée, lumière en haut à gauche ; les vues nord-sud ont les dimensions de l'est-ouest inversées (règle D, docs/STYLE.md section 8). R les fait défiler à la pose.
- Icône 16 × 16 (`item-maul`) : la masse en diagonale, comme l'icône de la hache, tête en haut à droite.
- Au sol (`maul-ground`, 16 × 3 px à peu près, aussi l'image `ground` de l'objet possédable) : couchée, le manche à l'horizontale, la tête de fer à un bout.
- Sur l'épaule (`held-maul`, posture `shoulder`, vues `down`, `up`, `right`, la gauche est le miroir) : comme la hache, qu'elle remplace.
- En main pendant le geste « frapper à la masse » (`tool-maul`, planche tirée de `heldToolSheet` : cinq dessins de base `diag`, `upright`, `flat`, `flatDiag`, `flatEnd`, à 5 cm par pixel, prise au centre de 48 px). Coup vertical : on la voit par la tranche, un bloc sombre carré au bout du manche (la tête fait 15 × 8 × 8, donc plus gros que le fer de la hache, mais pas plus long).
- Corps de Xéros : animations `maul-down`, `maul-up`, `maul-right`, `maul-left` (4 images, la gauche est le miroir de la droite), geste `maul` de `gestures.json`.
- Fantôme : aucun (elle ne s'entrepose pas).

## Regroupement
Seule. Ne s'entrepose pas.

## Gestes
- E court : prendre (mains libres : les deux).
- Espace : sur une bille coin planté (grosse bille ou demi-bille), un coup de masse ; sur une bille sans coin, « Il faut d'abord un coin. » ; ailleurs elle ne frappe rien (le geste se joue dans le vide).
- Q (A en AZERTY) : lâcher.

## Origine
Trouvée dans la réserve de la maison (`maison.tmj`, `maul-ground`, à côté du rouleau de corde). E la prend directement dans les deux mains.

## Devenir
Reste dans les mains ; se lâche comme un outil. Plus tard : forgée, achetée.

## Vérification
- Aperçu : `.art-preview/fendage.png` (Xéros qui frappe à côté de la bille), `xeros-maul-maul.png`, `item-maul.png`.
- En jeu : donner la masse (`?dieu`), la voir sur l'épaule, frapper une bille coin planté, trois coups.
