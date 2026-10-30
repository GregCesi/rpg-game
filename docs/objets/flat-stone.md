# Pierre plate (`flat-stone`)

## Identité
- Clé : `flat-stone` (objet du monde, `props.json`, avec `take`).
- Nom affiché : pierre plate.
- Nature : objet du monde qu'on prend. Une fois posée sur une place du chantier, elle devient le dé de pierre (`footing-stone`, voir [footing-stone.md](footing-stone.md)).
- Mains : deux (35 kg).

## Masse
- **35 kg**, calculée : la boîte de ses `dims` (30 × 30 × 15 cm = 0,0135 m³) × la densité de la pierre, 2 600 kg/m³ (`STONE_DENSITY`, `src/content/mass.ts`, à côté de celle du bois). Xéros la porte (jusqu'à 70 kg), mais au-delà de 25 kg : pas de course, une marche lente, de l'endurance par kg de trop.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Pierre plate, à peu près cubique, à plat : 30 × 30 × 15 cm, contour compris. Boîte (`box`).
- À l'écran : W = 6 px ; H + D/2 = 3 + 3 = **6 × 6** (le même gabarit que le dé : 6 × 6).

## Vues
- Symétrie : ronde (`views: "round"`, une vue) : à 6 × 6 px, une pierre plate tournée ne se distingue pas ; R ne la tourne pas.
- Au sol : `flat-stone`, 6 × 6 px, le dessus clair, la face sud plus sombre, un coin émoussé, jamais un œuf ; ombre portée dessous, à droite. C'est le dessin du dé de pierre (`footing-stone`, 7 × 7 avec son ombre) : même pierre, même lumière.
- En main (`held-flat-stone`, posture `carry`, vues `down`, `up`, `right`) : portée à deux mains devant le ventre ; de face, la face sud ; de dos, cachée par le corps ; de profil, de côté.
- Case d'interface : `item-flat-stone`, 16 × 16, la pierre en trois quarts.
- Fantôme : le dé (`footing-stone`) en transparence sur les places libres de l'étape « les dés ».
- Porté : à deux mains (`carry`).

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

## Vérification
- Aperçu : `.art-preview/collection.png` (`flat-stone`, `item-flat-stone`), `.art-preview/hands.png` (`held-flat-stone`), `gabarit.png`.
- En jeu : voir la liste de [l'implantation](plan-tablet.md#vérification).
