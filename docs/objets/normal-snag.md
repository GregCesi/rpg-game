# Chicot (`normal-snag`) et sa cime (`normal-snag-top`)

L'arbre normal cassé debout par la tempête (CONCEPTION « La tempête »), et sa cime tombée à côté de lui. Une fiche pour les deux :
ensemble, ils sont l'[arbre normal](normal-tree.md) entier, rien de plus, rien de moins (la matière se conserve).

## Identité
- Clés : `normal-snag` (le chicot debout), `normal-snag-top` (sa cime couchée). Aussi clés d'image.
- Noms affichés : chicot, cime.
- Nature : objets du monde (`props.json`), chacun avec un `harvest`.
- Mains : aucune (ni l'un ni l'autre ne se porte) ; le bois qui en sort est la [pièce de bois](wood-piece.md) du diamètre `normal`.
- Âge : aucun (bois brut, sur pied ou couché, comme l'arbre et l'arbre couché : sa masse est saisie, pas la matière bois).

## Masse
Tronc de 30 cm, bois vert à 900 kg/m³ (wood.json) : 63,6 kg par mètre.
- Chicot : **159 kg**, les 2,5 m de tronc depuis le sol (la souche de 40 cm comprise).
- Cime : **286,4 kg** : 3,7 m de tronc (235,4 kg) et tout le houppier (51,0 kg : l'arbre couché, 420 kg, moins sa pièce de bois
  de 5,8 m, 369,0 kg).
- Ensemble : 445,4 kg, exactement la souche (40 cm, 25,4 kg) plus l'arbre couché (420 kg) : l'arbre entier. `tools/test-paysage.ts`
  le vérifie.
- Ni l'un ni l'autre ne se déplace : pas de prise, pas de roulement.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Chicot : 65 × 55 × 290 cm (boîte : le pied évasé de l'arbre ; les esquilles du côté ouest montent jusqu'à 2,9 m, le côté est
  casse à 2,5 m) : silhouette 13 × 63,5 px.
- Cime : 455 × 100 × 50 cm (boîte, couchée) : 91 × 20 px (le reste des 140 px de l'arbre couché), son houppier entier.
- Images : `normal-snag` 24 × 70 (pied en (12, 63), comme l'arbre debout : à sa place, coin bas gauche + (12, 0)) ;
  `normal-snag-top` 91 × 22, `-r1` et `-r3` 22 × 91 ; la cime posée à côté du chicot : coin bas gauche du chicot + (18, 3).

## Vues
- Chicot : rond (`round`), une vue, `normal-snag` : le pied et l'écorce de l'arbre normal, la cassure en esquilles de bois frais,
  deux moignons de branches. Le bas de l'image au sol, comme l'arbre debout.
- Cime : couchée (`lying`), quatre vues (`four` : `normal-snag-top`, `-r1`, `-r2`, `-r3`), découpées dans l'arbre couché (et
  son `-left` pour `-r2`) par le même profil de cassure que le chicot : sa cassure répond à la sienne, creux contre pointe ; `-r1`
  et `-r3` sont les vues est-ouest transposées (l'arbre couché n'a pas encore ses vues nord-sud : VIEWS_TODO).
- Dessins : `art/world/storm.ts` (pixel-artist), planche `.art-preview/tempete.png`.

## Regroupement
Seuls.

## Gestes
- Le chicot : la cognée, de côté (`use`), comme l'arbre debout : un travail au coup (`harvest.work.fell`, le tronc de 30 cm) ; il
  laisse sa souche (`normal-tree-stump`) et le tronc qui restait debout, couché à son pied : une pièce de bois de 2 m (sa longueur
  utile sur la grille de 20 cm ; les esquilles de la cassure partent en copeaux). Pas de chute dessinée : la pièce paraît au sol.
- La cime : la cognée, de haut en bas (`chop`), sur le houppier, comme l'arbre couché : un travail au coup (`work.limbs` : 12
  branches de 7 cm), elle lâche 3 à 4 branches et son tronc devient une pièce de bois ronde de 3,6 m (sa longueur utile sur la grille, comme les 5,8 m
  de l'arbre couché).

## Travail
Celui de l'arbre normal : abattre (`fell`, diamètre 30 cm), ébrancher (`limbs`). Voir CONCEPTION « Le travail ».

## Arme
Aucune.

## Origine
La tempête : posés dans les cartes (Tiled), sur la ferme et le long du chemin.

## Devenir
La souche, une pièce de bois de 2 m (le chicot), des branches et une pièce de bois de 3,6 m (la cime).

## Vérification
- Aperçu : `.art-preview/tempete.png` (`npx tsx tools/essai-tempete.ts`).
- Test : `tools/test-paysage.ts` (la masse du chicot et de sa cime, l'arbre entier ; leur place dans les cartes).
