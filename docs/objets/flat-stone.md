# Pierre plate (`flat-stone`)

## Identité
- Clé : `flat-stone` (objet du monde, `props.json`, avec `take`).
- Nom affiché : pierre plate.
- Nature : objet du monde qu'on prend. Une fois posée sur une place du chantier, elle devient le dé de pierre (`footing-stone`, voir [footing-stone.md](footing-stone.md)).
- Mains : deux (50 kg à sa taille type).

## Masse
- **49,9 kg** à sa taille type (de 40,1 à 61,2 kg selon sa taille tirée), calculée par la matière : la boîte de ses `dims` (40 × 40 × 15 cm = 0,024 m³) × 0,8 (une dalle naturelle ne remplit pas sa boîte) × 2 600 kg/m³ (`matters.json`). 62,4 kg jusqu'au 31 octobre 2026 (« briques ») : elle était une boîte pleine, trop parfaite. Xéros la porte (jusqu'à 70 kg), mais au-delà de 25 kg : pas de course, une marche lente, de l'endurance par kg de trop.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Pierre plate, à peu près cubique, à plat : 40 × 40 × 15 cm, contour compris (30 × 30 avant le 31 octobre 2026 ; pas 45 : 79 kg, plus que Xéros ne porte). Boîte (`box`).
- À l'écran : W = 8 px ; H + D/2 = 3 + 4 = **8 × 7** (le même gabarit que le dé).

## Vues
- Symétrie : ronde (`views: "round"`, une vue par forme) : à 8 × 7 px, une pierre plate tournée ne se distingue pas ; R ne la tourne pas ; ses deux formes jouent le rôle de ses côtés.
- Au sol : `flat-stone` et `flat-stone-b`, 8 × 7 px, une dalle de berge irrégulière (« briques », 31 octobre 2026 : elle était trop parfaite), le dessus clair, la face sud plus sombre, bords cassés, jamais un œuf ; ombre portée dessous, à droite. C'est le dessin du dé de pierre (`footing-stone`, `footing-stone-b`) : même pierre, même lumière.
- En main (`held-flat-stone`, posture `carry`, vues `down`, `up`, `right`) : portée à deux mains devant le ventre ; de face, la face sud ; de dos, cachée par le corps ; de profil, de côté.
- Case d'interface : `item-flat-stone`, 16 × 16, la pierre en trois quarts.
- Fantôme : le dé (`footing-stone`) en transparence sur les places libres de l'étape « les dés ».
- Porté : à deux mains (`carry`).

## Variantes naturelles
Deux formes dessinées, taille type ± 7 % (`natural: {forms: 2, vary: 7}`). Une pierre de la berge (posée dans Tiled) tire les siennes de son identifiant (toujours les mêmes) ; prise, elle les garde (GameState) ; posée sur le chantier, le dé garde sa forme et sa taille : c'est la même pierre. Le plan de l'abri accepte toute pierre plate, quelle que soit sa forme.

## Regroupement
Seule. Ne s'entrepose pas (pas de tas de pierres plates dans ce chantier).

## Gestes
- E court : la prendre, à deux mains. Face à une place de l'étape « les dés » du chantier : la poser, et elle devient un dé ; une autre pierre ou un autre objet : « Il faut une pierre plate. »
- Q (A en AZERTY) : la lâcher devant Xéros.
- E maintenu, Espace, R : rien.

## Origine
Trouvée sur la berge de l'étang, à l'ouest de la ferme (six pierres plates posées dans `ferme.tmj` : quatre pour les dés de l'abri, deux de marge). La ferme a de l'eau ; il n'y a donc pas de pierrier.

## Devenir
Posée sur un chantier, elle devient un dé de pierre, pour de bon. Posée ailleurs, elle reste là où on la lâche.

## Transformations
Aucune : elle se pose telle quelle (le dé).

## Métier
Carrier (`quarryman`) ; tout paysan en ramasse sur la berge.

## Vérification
- Aperçu : `.art-preview/collection.png` (`flat-stone`, `item-flat-stone`), `.art-preview/hands.png` (`held-flat-stone`), `gabarit.png`.
- En jeu : voir la liste de [l'implantation](plan-tablet.md#vérification).
