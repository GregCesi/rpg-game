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
- Sous un tas de branches : une corde passée du nord au sud sous le milieu du tas ; on n'en voit que les deux bouts, courts,
  qui dépassent de chaque côté du tas (devant et derrière).

## Masse
- **0,2 kg** (`items.json`, saisie).

## Vues
- Symétrie : deux vues (`views: "symmetric"`, couché) : `rope-tie-ground` est-ouest, `rope-tie-ground-ns` nord-sud, ses dimensions inversées (règle D). R le tourne à la pose.
- Au sol : `rope-tie-ground`, l'écheveau couché, son ombre.
- En main (`held-rope-tie`, posture `hand`) : l'écheveau plié pend du poing, environ 10 px ; de face, de dos et de profil
  (la gauche en miroir).
- Case d'interface : `item-rope-tie`, 16×16, une petite boucle de corde.
- Fantôme : en transparence, là où il ira : son bout de devant (`pile-branch-tie-south`) sous le tas visé, ou sa boucle
  (`pile-branch-tie-alone`) par terre devant Xéros.
- Porté : à une main (`hand`).
- Seul par terre (un tas lié sans branche) : `pile-branch-tie-alone`, une petite boucle de corde lâche (`tie.alone` de
  `piles.json`, `x`, `y`, repère du tas).
- Sous le tas : ses deux bouts courts, `pile-branch-tie-north` derrière la branche au sol la plus au nord et
  `pile-branch-tie-south` (le nœud lâche) devant la plus au sud (`tie.north`, `tie.south` de `piles.json` : `x`, `dy`),
  toujours sous toutes les branches ; ils suivent la taille du tas, d'une branche au tas plein.

## Regroupement
Seul. Il ne compte pas comme une pièce du tas : c'est un attribut du tas de branches (`tie` dans GameState), un seul par tas.

## Gestes
- Clic court, main vide : le ramasser au sol ; sur un tas de branches lié et vide (le lien seul), le reprendre.
- Clic maintenu, main vide : rien sur lui seul (voir le tas : nouer).
- R : rien.
- Clic court de la main qui le tient, ou A (Q en QWERTY) : le poser. Sur un tas de branches sans lien, à portée : il le ceinture par-dessous. Sinon par terre devant Xéros, où il
  commence un tas de branches sur lui (le tas n'a encore aucune branche). Sans place : « Pas la place ici. ».

## Origine
Coupé dans un rouleau de corde posé sur le billot, à la hache (voir [rouleau](rope-coil.md#devenir)).

## Devenir
Sous un tas de branches plein (10 branches), un clic maintenu d'une main vide, une demi-seconde, noue la corde : le tas devient un
[fagot](faggot.md). Dénouer un fagot rend le tas de 10 branches et son lien.

## Vérification
- Aperçu : `.art-preview/collection.png` (rope-tie-ground, item-rope-tie, pile-branch-tie-north, pile-branch-tie-south, pile-branch-tie-alone), `.art-preview/hands.png`
  (held-rope-tie), `.art-preview/piles.png` (rangées « lié » : le lien seul, puis la construction type sur lui).
- En jeu, de la corde au fagot (`?reset`, ou `?dieu` pour aller plus vite) :
  1. Au réveil, aller dans la réserve (en haut à gauche de la maison) : un rouleau de corde au sol. Un clic : il est dans la
     main, l'icône dans sa case avec « 10 m » en petit en bas ; Xéros le tient au bout du bras dans les 4 directions.
  2. Sortir vers la ferme, jusqu'au billot où est plantée la hache. Il faut les deux mains pour la hache : poser le
     rouleau (A), prendre la hache (un clic), la poser (un clic), reprendre le rouleau (un clic). Face au billot nu, un
     clic de la main du rouleau : le rouleau est sur le billot (`chopping-block-rope`), la main est vide.
  3. Reprendre la hache, face au billot : le mot « couper » près des cases. Un clic : geste de haut
     en bas, un lien tombe à côté du billot, « Rouleau de corde : 8 m restants. ». Quatre coups de plus :
     « Rouleau de corde : vide. », le billot est nu.
  4. Variante : billot qui porte le rouleau, mains libres, un clic : on reprend le rouleau, avec sa longueur (le message de la
     coupe suivante le prouve).
  5. Poser la hache, ramasser un lien (un clic), le poser (un clic ou A) par terre dans un coin libre : le lien seul au sol, le fantôme le montrait
     avant. Un clic dessus, main vide : on le reprend. Le poser à nouveau.
  6. Poser des branches dessus (un clic ou A, une par une) : elles se posent sur le lien, il reste visible devant et derrière. Tout
     près du tas, un petit nombre en bas à droite compte les branches ; il disparaît quand on s'éloigne.
  7. Un lien posé sur un tas de branches existant sans lien : il passe dessous. Un second lien posé sur un tas déjà lié : il
     va par terre devant, pas sous le même tas.
  8. Tas lié de moins de 10 branches, mains libres, clic maintenu : la jauge se remplit au-dessus de Xéros, puis « Pas assez
     de branches. ». Tas plein sans lien : « Il faut un lien. ». Clic court sur un tas : une branche reprise, pas de jauge
     qui aboutit.
  9. Tas plein et lié, clic maintenu une demi-seconde : la jauge se remplit, le tas devient un fagot couché est-ouest au même
     endroit. Relâcher le clic avant la fin : rien ne change (ou une branche reprise si le clic était court).
  10. Clic court sur le fagot : il est porté à deux mains, Xéros marche lentement, ne court pas. R : il tourne nord-sud (le
      fantôme suit). Un clic ou A : posé ; d'autres fagots portés se posent en tas (3, 2, 1), en est-ouest ou nord-sud.
  11. Fagot posé seul, mains libres, clic maintenu : il se dénoue, tas de 10 branches avec son lien, compteur à 10.
  12. Recharger la page à chaque étape : tout est là (rouleau et sa longueur, lien, tas lié, fagots).

## Métier
Le paysan (`peasant`) : il coupe ses liens au rouleau de corde (ajouté le 1er novembre 2026, chantier « combat » : le lien entre dans
la transformation du mannequin d'entraînement, et tout ce qui y figure dit son métier).
