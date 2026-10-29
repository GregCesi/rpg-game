# Lien (`rope-tie`)

## Identité
- Clé : `rope-tie`.
- Nom affiché : lien.
- Nature : objet possédable (`items.json`, `kind` : `resource`).
- Mains : une.

## Dimensions (gabarit)
- 2 m de corde de chanvre, Ø environ 1,5 cm (moins de 3 cm : un pixel de large, pour qu'elle existe).
- Au sol, plié en écheveau : environ 50 × 15 cm, à plat. À l'écran : **10 × 3 px** (objet possédable : taille vérifiée à
  l'œil, `validate.ts` ne mesure que les objets de `props.json`).
- Sous un tas de branches : une corde passée du nord au sud sous le milieu du tas, qui dépasse devant (ses deux bouts, noués
  lâche) et derrière.

## Vues
- Au sol : `rope-tie-ground`, l'écheveau couché, son ombre.
- En main (`held-rope-tie`, posture `hand`) : l'écheveau plié pend du poing, environ 10 px ; de face, de dos et de profil
  (la gauche en miroir).
- Case d'interface : `item-rope-tie`, 16×16, l'écheveau noué.
- Fantôme : `pile-branch-tie` en transparence, là où il ira : sous le tas visé, ou par terre devant Xéros.
- Porté : à une main (`hand`).
- Sous le tas : `pile-branch-tie`, dessiné dans le repère du tas de branches (`tie` de `piles.json`, `x`, `y`), toujours
  sous toutes les branches, visible devant et derrière le tas.

## Regroupement
Seul. Il ne compte pas comme une pièce du tas : c'est un attribut du tas de branches (`tie` dans GameState), un seul par tas.

## Gestes
- E court : le ramasser au sol ; sur un tas de branches lié et vide (le lien seul), le reprendre.
- E maintenu : rien sur lui seul (voir le tas : nouer).
- Espace : rien.
- R : rien.
- Q : le poser. Sur un tas de branches sans lien, à portée : il le ceinture par-dessous. Sinon par terre devant Xéros, où il
  commence un tas de branches sur lui (le tas n'a encore aucune branche). Sans place : « Pas la place ici. ».

## Origine
Coupé dans un rouleau de corde posé sur le billot, à la hache (voir [rouleau](rope-coil.md#devenir)).

## Devenir
Sous un tas de branches plein (10 branches), E maintenu une demi-seconde noue la corde : le tas devient un
[fagot](faggot.md). Dénouer un fagot rend le tas de 10 branches et son lien.

## Vérification
- Aperçu : `.art-preview/collection.png` (rope-tie-ground, item-rope-tie, pile-branch-tie), `.art-preview/hands.png`
  (held-rope-tie), `.art-preview/piles.png` (rangées « lié » : le lien seul, puis la construction type sur lui).
- En jeu, de la corde au fagot (`?reset`, ou `?dieu` pour aller plus vite) :
  1. Au réveil, aller dans la réserve (en haut à gauche de la maison) : un rouleau de corde au sol. E : il est dans une
     main, l'icône dans sa case ; Xéros le tient au bout du bras dans les 4 directions.
  2. Sortir vers la ferme, jusqu'au billot où est plantée la hache. Il faut les deux mains pour la hache : poser le
     rouleau (Q), prendre la hache (E), la poser (E), reprendre le rouleau (E). Face au billot nu, rouleau dans la main
     active, E : le rouleau est sur le billot (`chopping-block-rope`), la main est vide.
  3. Reprendre la hache, face au billot : invite « Espace ». Espace : geste de haut
     en bas, un lien tombe à côté du billot, « Il reste 8 m de corde. ». Quatre coups de plus : « Plus de corde. », le
     billot est nu.
  4. Variante : billot qui porte le rouleau, mains libres, E : on reprend le rouleau, avec sa longueur (le message de la
     coupe suivante le prouve).
  5. Poser la hache, ramasser un lien (E), Q par terre dans un coin libre : le lien seul au sol, le fantôme le montrait
     avant. E dessus : on le reprend. Q à nouveau.
  6. Poser des branches dessus (Q, une par une) : elles se posent sur le lien, il reste visible devant et derrière. Tout
     près du tas, un petit nombre en bas à droite compte les branches ; il disparaît quand on s'éloigne.
  7. Q d'un lien sur un tas de branches existant sans lien : il passe dessous. Q d'un second lien sur un tas déjà lié : il
     va par terre devant, pas sous le même tas.
  8. Tas lié de moins de 10 branches, mains libres, E maintenu : la jauge se remplit au-dessus de Xéros, puis « Pas assez
     de branches. ». Tas plein sans lien : « Il faut un lien. ». E court sur un tas : une branche reprise, pas de jauge
     qui aboutit.
  9. Tas plein et lié, E maintenu une demi-seconde : la jauge se remplit, le tas devient un fagot couché est-ouest au même
     endroit. Relâcher E avant la fin : rien ne change (ou une branche reprise si l'appui était court).
  10. E court sur le fagot : il est porté à deux mains, Xéros marche lentement, ne court pas. R : il tourne nord-sud (le
      fantôme suit). Q : posé ; d'autres fagots portés se posent en tas (3, 2, 1), en est-ouest ou nord-sud.
  11. Fagot posé seul, mains libres, E maintenu : il se dénoue, tas de 10 branches avec son lien, compteur à 10.
  12. Recharger la page à chaque étape : tout est là (rouleau et sa longueur, lien, tas lié, fagots).
