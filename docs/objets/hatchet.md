# Hachette (`hatchet`)

## Identité
- Clé : `hatchet` (objet possédable, `items.json`) ; au sol dans la réserve : `hatchet-ground` (objet du monde, `props.json`).
- Nom affiché : hachette.
- Nature : objet possédable, `kind: tool`.
- Mains : une. (La cognée, `axe`, reste à deux mains et ne change pas.)

## Masse
- 1 kg, saisie (`mass: 1`). Sans effet sur Xéros.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Fer d'environ 12 × 8 cm (12 cm de tranchant, 8 cm de large), manche de 40 cm.
- Posée par terre (`hatchet-ground`) : 40 × 12 × 5 cm, boîte ; à l'écran 8 × 3 px (largeur 40 / 5, hauteur 5 / 5 + 12 / 10 = 2,2).
- En main pendant le geste, à l'échelle : 5 cm par pixel, le manche mesure 8 px, le fer 2 × 2 px.

## Vues
- Symétrie : quatre vues (`views: "four"`, couché, `lying`) : `hatchet-ground` (la tête à l'est), `hatchet-ground-r1` (au sud), `hatchet-ground-r2` (à l'ouest), `hatchet-ground-r3` (au nord), chacune dessinée, lumière en haut à gauche ; les vues nord-sud ont les dimensions de l'est-ouest inversées (règle D, docs/STYLE.md section 8). R les fait défiler à la pose.
- Icône 16 × 16 (`item-hatchet`) : la hachette en diagonale, fer en haut à droite, plus petite que l'icône de la hache.
- Au sol (`hatchet-ground`, 8 × 3 px, aussi l'image `ground` de l'objet possédable) : couchée, le fer à un bout.
- Tenue à la main (`held-hatchet`, posture `hand`, vues `down`, `up`, `right`, la gauche est le miroir) : au poing, le long de la jambe, le fer vers le bas.
- En main pendant le geste (`tool-hatchet`, planche tirée de `heldToolSheet` comme `tool-axe` : cinq dessins de base `diag`, `upright`, `flat`, `flatDiag`, `flatEnd`, prise au centre de 48 px, convention dans l'en-tête de `art/lib/held.ts` ; un petit fer, un manche court). Le geste est celui d'un coup de cognée de haut en bas (`chop`), sans nouvelle pose.
- Fantôme : aucun (elle ne s'entrepose pas).

## Regroupement
Seule. Ne s'entrepose pas.

## Gestes
- E court : prendre (une main libre).
- Espace, hachette dans une main, branche dans l'autre, face au billot : un coup (`chop`) taille la pointe : la branche devient un piquet (`stake`), qui reste dans la main qui tenait la branche. Coûte 0,4 point d'endurance (`whittle`, `stamina.json`), la moitié d'un coup de cognée. Si l'autre main ne tient pas de branche : « Tiens la branche ou le piquet debout sur le billot, de l'autre main. »
- Q (A en AZERTY) : lâcher.

## Origine
Trouvée dans la réserve de la maison (`maison.tmj`, `hatchet-ground`, à côté de la masse et du coin). E la prend dans une main.

## Devenir
Reste dans la main ; se lâche comme un outil. Plus tard : tailler d'autres pièces (chevilles, manches).

## Vérification
- Aperçu : `.art-preview/collection.png`, `xeros-chop-hatchet.png`, `item-hatchet.png`.
- En jeu : la donner (`?dieu`), une branche dans l'autre main, face au billot, Espace : un piquet dans la main de la branche.
