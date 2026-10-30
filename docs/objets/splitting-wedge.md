# Coin de fendage (`splitting-wedge`)

## Identité
- Clé : `splitting-wedge` (objet possédable, `items.json`) ; au sol dans la réserve : `splitting-wedge-ground` (objet du monde, `props.json`).
- Nom affiché : coin de fendage.
- Nature : objet possédable, `kind: tool`.
- Mains : une. Un seul coin dans le jeu pour l'instant.

## Masse
- 2 kg, saisie (`mass: 2`). Sans effet sur Xéros.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Fer, 20 × 7 × 4 cm : 20 cm de long (la hauteur plantée), 7 cm de large, 4 cm d'épaisseur à la tête.
- Posé par terre (`splitting-wedge-ground`) : 20 × 7 × 4 cm, boîte ; à l'écran 4 × 1,5 px à la taille réelle, agrandi au plancher de lisibilité (6 × 2,2 px) : le dessin fait 6 × 2 px.
- Planté dans le bout d'une bille : seule la tête dépasse de la face coupée (environ 7 × 4 cm) ; le reste est dans le bois.

## Vues
- Icône 16 × 16 (`item-splitting-wedge`) : le coin vu de côté, en pointe vers le bas, tête plate en haut, fer bleuté.
- Au sol (`splitting-wedge-ground`, 6 × 2 px, aussi l'image `ground` de l'objet possédable) : couché, la tête à un bout.
- En main (`held-splitting-wedge`, posture `hand`, vues `down`, `up`, `right`) : un petit bloc de fer tenu à la main.
- Planté : il apparaît dans l'image de la pièce de bois où il est planté (son réglage `wedge` : le bout et les coups, parties `wedge-…` des planches de bois, voir la fiche [pièce de bois](wood-piece.md)), pas à part.
- Fantôme : aucun.

## Regroupement
Seul. Ne s'entrepose pas.

## Gestes
- E court : prendre.
- Espace, depuis un bout d'une grosse bille ou d'une demi-bille couchée, face à la coupe (à l'est ou à l'ouest d'une pièce est-ouest, au nord ou au sud d'une pièce nord-sud) : le coin se plante dans le bois de bout, au milieu de la face coupée, la pointe dans le sens de la fente ; sans geste, d'un coup ; la main est libérée. Depuis le flanc : « Le coin se plante dans le bout, là où on voit les cernes. »
- Q (A en AZERTY) : lâcher.

## Origine
Trouvé dans la réserve de la maison (`maison.tmj`), à côté de la masse. E le prend directement dans la main.

## Devenir
Planté, il reste dans la bille jusqu'au troisième coup de masse : il tombe alors au sol à côté des morceaux, à ramasser. Rien ne le fait disparaître.

## Vérification
- Aperçu : `.art-preview/fendage.png`.
- En jeu : le donner (`?dieu`), le planter sur une grosse bille, frapper trois fois à la masse, le ramasser.
