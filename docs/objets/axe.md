# Cognée (`axe`)

Fiche écrite le 30 octobre 2026 (chantier « perspective »), pour son image au sol : la cognée existait avant les fiches.

## Identité
- Clé : `axe` (objet possédable, `items.json`) ; dans Tiled, plantée dans le billot : `chopping-block-axe` (objet du monde).
- Nom affiché : hache.
- Nature : objet possédable, `kind: tool`.
- Mains : deux (longue et lourde) ; portée sur l'épaule.

## Masse
- 2,5 kg, saisie (`mass: 2,5`). Sans effet sur la marche de Xéros.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Manche d'environ 90 cm, fer d'environ 20 cm de tranchant.
- Couchée par terre (`axe-ground`) : la boîte qui l'englobe, environ 90 × 20 × 6 cm, vue de dessus : 18 × 5 px est-ouest,
  5 × 18 nord-sud (règle D).

## Vues
- Symétrie : quatre vues (`views: "four"`, couchée, `lying`) : `axe-ground` (le fer à l'est), `axe-ground-r1` (au sud),
  `axe-ground-r2` (à l'ouest), `axe-ground-r3` (au nord), chacune dessinée, lumière en haut à gauche ; les vues nord-sud ont
  les dimensions de l'est-ouest inversées (règle D). R les fait défiler à la pose.
- Icône 16 × 16 (`item-axe`) : la hache en diagonale, fer en haut à droite.
- Portée (`held-axe`, posture `shoulder`, vues `down`, `up`, `right`, la gauche est le miroir) : sur l'épaule.
- En main pendant le geste (`tool-axe`, planche tirée de `heldToolSheet` : cinq dessins de base, convention dans l'en-tête de
  `art/lib/held.ts`) : `use` de côté sur ce qui est debout, `chop` de haut en bas sur ce qui est couché.
- Fantôme : la vue au sol en transparence, là où E ou Q la posera, dans son sens.

## Regroupement
Seule. Ne s'entrepose pas.

## Gestes
- E court : la prendre (deux mains libres) ; E dans le vide ou Q : la poser devant soi, dans le sens de son fantôme.
- E maintenu : rien.
- Espace : abattre un arbre (`use`), ébrancher le houppier, couper une pièce de bois sur la grille (`chop`), couper un lien sur
  le billot.
- R : tourner la vue où elle sera posée, d'un quart de tour.

## Origine
Plantée dans le billot de la ferme (`chopping-block-axe`) : E la donne dans les mains.

## Devenir
Ne s'use pas, ne disparaît pas.

## Vérification
- Aperçu : `.art-preview/couches.png` (ses quatre vues côte à côte), `.art-preview/collection.png`.
- En jeu : la prendre au billot, R trois fois en regardant le fantôme (fer au sud, à l'ouest, au nord), la poser, la reprendre :
  elle garde son sens.
