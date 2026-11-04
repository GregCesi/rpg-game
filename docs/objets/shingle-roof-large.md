# Grand pan de bardeaux (`shingle-roof-large`, `shingle-roof-large-pierced`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées) : **le toit de l'atelier et de l'abri à charbon est en bardeaux de chêne fendu, gris** (le bois vieux). Les planches
sombres de l'essai 1 sont refusées : elles se lisaient comme de la tôle. La charpente de la forge est celle de la grange **relevée à
45°** (poinçons de 3 m au lieu de 2,20, faîtage à 6,42 m, pignons [`board-gable-tall`](board-gable-tall.md)). Les trois couvertures (bardeaux,
[tuiles plates](tile-roof-large.md), [lauzes](lauze-roof-large.md)) restent des pièces du jeu pour d'autres maisons, chacune à sa pente.
Le **pan percé** est le même pan, troué pour le [conduit](chimney-flue.md) de la [forge](forge-hearth.md) : il sert de pan nord.

## Identité
- Clés : `shingle-roof-large`, `shingle-roof-large-pierced`.
- Nom affiché : grand pan de bardeaux ; grand pan de bardeaux percé (masculin).
- Nature : objet du monde (`props.json`), famille `éléments`, pièce de toit (`roof: true`, `pitch: south` dans la vue 0), sans
  `take` : des bardeaux de chêne fendu (le [bardeau](shingle.md) du jeu) cloués en rangs sur des lattes, trois épaisseurs partout.
- Mains : aucune (il se monte bardeau à bardeau ; ici, un seul élément).
- Âge : bois travaillé, il prend l'âge du bois (`"aged": true` : neuf, patiné, vieux ; **gris au vieux**, celui de la forge).

## Masse
- Par la matière : `{"matter": "wood", "fill": 0.019}` sur la boîte de ses `dims` (960 × 340 × 340 cm, 111 m³) : **1,9 t**.
- Le calcul : la pente fait 4,81 m (340 cm de haut sur 340 de profondeur), soit 46,2 m² de pan. Les bardeaux du jeu (40 × 10 × 1,5 cm,
  0,54 kg) posés au pureau de 13 cm (un tiers de leur longueur : trois épaisseurs partout) en font 77 au m², **41,5 kg/m²** de bois
  vert ; 46,2 × 41,5 = 1 916 kg, et 1 916 ÷ (111 × 900) = 0,019. Les lattes ne sont pas comptées (environ 12 kg/m² de plus).
- **La part annoncée d'abord, 0,115, donnait 11,5 t (249 kg/m²) : dix fois trop**, la même erreur que celle du pan de planches
  corrigée le 31 octobre. Un dixième, 0,0115 (25 kg/m²), serait un bardeau sec et léger ; 0,019 suit le bardeau du jeu (la matière se
  conserve : le pan pèse ce que pèsent ses bardeaux).
- Le pan percé : la même part (le trou d'environ 1 × 0,8 m ne compte pas sur 46 m²).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Dans sa vue 0 : 9,60 m le long du faîtage (est-ouest), 3,40 m de la rive basse au faîte (nord-sud), 3,40 m de haut : **45°**. Le côté
  bas est au sud (`pitch: "south"`) ; un quart de tour le met à l'ouest (r1), au nord (r2), à l'est (r3).
- **Pourquoi 45°** : la pente des bardeaux fendus (décision de Grégoire ; connaissance générale, **non sourcée** : on les pose d'ordinaire
  entre 40 et 60°, l'eau doit filer avant de pénétrer le fil du bois).
- Sur la charpente de la grange relevée : la rive basse sur la sablière à 3,42 m, le faîte à 6,82 m (la grange, à 37°, l'avait à 6,02).
- **Pièce de bâtiment qui relie des appuis** (`ground: true`) : r0 et r2, 192 × (68 + 68) = **192 × 136 px** ; r1 et r3, 68 × (68 + 192) =
  **68 × 260 px**.
- Ombre portée (`shadow`, hauteurs sud et nord) : à donner avec le plan de la forge (rive basse 342 cm, faîte 682 cm, si elle suit
  la grange).

## Vues
- Quatre (`four`), chacune le pan vu de dessus en trois quarts : les rangs de bardeaux en écailles, décalés d'un rang à l'autre, leurs
  bouts arrondis par l'usure ; la rive basse du côté bas, l'arête du faîte du côté haut. Gris argenté au vieux, plus brun au neuf. Pas
  d'ombre peinte. Lumière en haut à gauche.
- **Le pan percé** sert de pan **nord** (vue r2) : le trou et son solin de mortier de chaux au droit du conduit de la forge (le conduit
  sur la hotte, x 220–320, y 45–125 dans le repère de l'atelier) ; sa place dans le dessin se tire de la souche, comme le [pan de chaume
  percé](thatch-roof-pierced.md), et se fixera avec le plan de la forge. Vu du sud (r2), le pan nord se voit par la tranche : rien du
  trou ne paraît.

## Variantes naturelles
Aucune : les bardeaux sont fendus à la mesure.

## Regroupement
Deux pans font un toit à deux versants ; ils se rejoignent au faîte.

## Gestes
- Mode construction : clic gauche le pose, sa rive basse sur le dessus de ce qu'il y a dessous (la sablière), R le tourne (le côté
  bas), clic droit le retire. Il ne se heurte pas à ce qui est sous sa pente (pignon, faîtage).
- En jeu : il ne bloque pas (posé au-dessus de 2 m). L'atelier est un abri ouvert : le toit s'efface quand Xéros est dessous.

## Travail
Aucun.

## Arme
Aucune.

## Origine
Pas encore fabriqué en jeu. Les bardeaux se fendent au coutre dans un quartier court (`rive-shingle` de transforms.json, jouable par
« Transformer ») ; **les lattes** : la latte existe comme aspect de la pièce de bois (la demi-perche refendue, `lath` de wood.json, 6 ×
3 cm), mais **le lattis posé n'existe pas encore** (aucune pièce de charpente qui le porte, aucun plan qui le pose) ; les clous du
forgeron non plus.

## Devenir
Il reste sur le toit ; un bardeau fendu ou pourri se remplace (pas encore au jeu).

## Transformations
Aucune pour l'instant.

## Métier
Le couvreur (`roofer`, métier nouveau, chantier « forge »).

## Points ouverts
- Du bois au-dessus d'un feu de forge : les escarbilles du conduit, même s'il dépasse le faîte (CADRAGE-forge.md, section 0). Choix
  de Grégoire, en connaissance de cause.

## Vérification
- `.art-preview/forge-pieces.png` : ses quatre vues, et le pan percé, au gabarit ; ses trois âges.
- `npm run test:forge` (à venir) pose les deux pans, le percé au nord, sur la charpente relevée ; `npm run check`.
