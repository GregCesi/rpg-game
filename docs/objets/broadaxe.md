# Doloire (`broadaxe`)

## Identité
- Clé : `broadaxe` (objet possédable, `items.json`) ; au sol dans la réserve : `broadaxe-ground` (objet du monde, `props.json`).
- Nom affiché : doloire.
- Nature : objet possédable, `kind: tool`. Hache à équarrir : lame large et plate, un seul biseau, fil long et droit ; manche coudé, déporté vers l'extérieur pour que les mains ne frottent pas la face qu'on dresse.
- Mains : deux.

## Masse
- 3 kg, saisie (`mass: 3`). Sans effet sur la marche de Xéros (sous 25 kg).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Fer de 25 × 15 cm (25 cm de fil, 15 cm de l'œil au fil), manche de 60 cm.
- Posée par terre, la lame à plat (`broadaxe-ground`) : 60 × 25 × 6 cm, boîte ; gabarit 12 × 3,7 px (largeur 60 / 5, hauteur 6 / 5 + 25 / 10) ; dessinée 12 × 5 px, contour compris.
- En main, à l'échelle (5 cm par pixel) : manche de 12 px, du bout au haut de l'œil, déporté d'un pixel au coude, deux pixels au-dessus de la prise. Le fer est grossi de 1,6 fois pour se lire (la cognée et la hachette : du double) : de profil, 8 px de fil sur 5 de l'œil au fil ; par la tranche, une lame mince de 8 px le long du manche, l'œil en bloc de 5 px de large à son bout.

## Vues
- Symétrie : quatre vues (`views: "four"`, couché, `lying`) : `broadaxe-ground` (la tête à l'est), `broadaxe-ground-r1` (au sud), `broadaxe-ground-r2` (à l'ouest), `broadaxe-ground-r3` (au nord), chacune dessinée, lumière en haut à gauche ; les vues nord-sud ont les dimensions de l'est-ouest inversées (règle D, docs/STYLE.md section 8). R les fait défiler à la pose.
- Icône 16 × 16 (`item-broadaxe`) : la doloire en diagonale, comme les autres manches ; la lame large pend du haut à droite le long du manche, son fil droit et clair vers le haut à gauche.
- Au sol (`broadaxe-ground`, 12 × 5 px, aussi l'image `ground` de l'objet possédable) : couchée, la lame à plat au nord du bout du manche, le fil clair au bord nord.
- Portée (`held-broadaxe`, posture `shoulder`, vues `down`, `up`, `right`, la gauche est le miroir) : sur l'épaule comme la cognée et la masse, le poing près du bout du manche. De face et de dos, par la tranche (la lame mince et l'œil) ; de profil, la face de la lame, le fil vers le bas, à plat contre le dos.
- En main pendant le geste (`tool-broadaxe`, planche tirée de `heldToolSheet` : cinq dessins de base `diag`, `upright`, `flat`, `flatDiag`, `flatEnd`, prise au centre de 48 px, convention dans l'en-tête de `art/lib/held.ts`). Gestes `use`, `chop`, `maul` comme la hachette ; elle sert au `chop`, de haut en bas : on la voit alors par la tranche.
- Fantôme : aucun (elle ne s'entrepose pas).

## Regroupement
Seule. Ne s'entrepose pas.

## Gestes
- E court : la prendre, sur l'épaule, à deux mains.
- Espace, face au flanc d'un rondin couché : un coup (`chop`) ; trois coups dressent une face, quatre faces font la poutre. Sur une bille du gros arbre : « Trop grosse pour une poutre. »
- Q (A en AZERTY) : lâcher.

## Origine
Posée dans la réserve de la maison, à côté de la hachette.

## Devenir
Outil : reste dans les mains, se lâche comme un outil ; ne s'use pas.

## Vérification
- Aperçu : `.art-preview/xeros-chop-broadaxe.png` (et `xeros-use-broadaxe.png`), `tool-broadaxe.png`, `held-broadaxe.png`, `item-broadaxe.png`, `broadaxe-ground.png`, `collection.png`, à côté de la cognée et de la hachette, et des étalons (`gabarit.png`).
- En jeu : la prendre dans la réserve (ou la donner par `?dieu`) ; elle se porte sur l'épaule ; Espace face au flanc d'un rondin couché : trois coups par face, quatre faces ; face à une bille du gros arbre, le refus.
