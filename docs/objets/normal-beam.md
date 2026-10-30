# Poutre (`normal-beam`)

Décidée le 30 octobre 2026 (équarrissage) : le bois des poteaux de l'abri. Au Moyen Âge, la charpente se faisait avec des
arbres jeunes de 25 à 35 cm, équarris à la hache, pas sciés, mis en œuvre verts.

## Identité
- Clé : `normal-beam` (couchée est-ouest), `normal-beam-ns` (couchée nord-sud). Icône : `item-normal-beam`. Portée :
  `held-normal-beam`.
- Nom affiché : poutre (féminin).
- Nature : objet du monde (`props.json`), bois d'œuvre (`timber`, aspect `beam`) : sa longueur est gardée par la partie. Elle se
  prend (`take`) quand elle pèse 70 kg ou moins.
- Mains : deux.

## Masse
- Calculée à sa longueur : 20 × 20 cm de bois × longueur × 900 kg/m³, soit **36 kg par mètre** : **61 kg** à 1,70 m (se porte,
  lentement), **108 kg** à 3 m (ne se porte pas). Elle ne roule pas : elle est carrée.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Section de 30 × 30 cm contour compris (20 × 20 de bois, tirée d'un rondin de 30 cm), longueur quelconque ; boîte couchée.
- Est-ouest : L/5 px de long ; attendu 6 + 3 = 9 px de haut, dessinée dans le cadre de 10 rangées du rondin.
- Nord-sud : 6 px de large, la face de bout au sud, le dessus à ½.
- Collision : celle du rondin de même longueur.

## Vues
- Au sol : trois parties comme le rondin (`beam-start`, `beam-mid`, `beam-end` des planches `normal-timber`, `-ns`) : faces
  dressées claires et lisses, le bout montre la section carrée et ses cernes.
- Étapes, sur le rondin qu'on équarrit : rond, une face, deux, trois (`f1`, `f2`, `f3`), puis la poutre.
- En main (`held-normal-beam`, `carry`) : portée à deux mains devant lui.
- Case d'interface : `item-normal-beam`, sa longueur en bas de la case.
- Fantôme : aucun (pas de tas).

## Regroupement
Seule. Pas de tas : elle attend au pied du chantier.

## Gestes
- Espace, la doloire en main, contre le flanc d'un rondin couché (au nord ou au sud d'un rondin est-ouest, à l'est ou à l'ouest
  d'un rondin nord-sud) : un coup ; **3 coups par face** (`hew.perFace`), 4 faces ; chaque face finie le dit (« Une face dressée
  (2 sur 4). ») et le dessin change ; au douzième coup, la poutre (« Poutre équarrie : 3 m. »). Un coup coûte 0,333 point par
  mètre de pièce (`hewPerM`) : **12 points** pour un poteau de 3 m, 6,8 pour 1,70 m. Refus, sans geste ni dépense : rondin
  entaillé (« Finis d'abord la coupe. »), grosse bille (« Trop grosse pour une poutre. »), rondin de moins de 20 cm de bois
  (« Trop mince pour une poutre. »).
- Pousser : « Elle ne roule pas : elle est carrée. »
- E court : la prendre si elle pèse 70 kg ou moins, sinon « Trop lourde à porter. ».
- R maintenu au contact, mains libres : elle pivote d'un quart de tour, s'il y a la place.

## Origine
Un rondin coupé à la longueur, roulé jusqu'au chantier, équarri sur place à la doloire. On équarrit au pied du chantier : une
poutre de 3 m (108 kg) ne se porte ni ne roule ; elle reste où elle a été faite.

## Devenir
Poteau de l'abri à bois, posé sur un dé avec l'aide de la mère : le chantier suivant.

## Vérification
- Aperçu : `.art-preview/timber.png` (étapes f1, f2, f3, poutre, est-ouest et nord-sud), `.art-preview/gabarit.png`.
- Test : `npm run test:equarrissage` (108 kg, ne roule pas, ne se porte pas, retrouvée après rechargement).
- En jeu : la doloire (réserve de la maison), contre le flanc d'un rondin de 3 m : douze coups, voir les faces se dresser.
