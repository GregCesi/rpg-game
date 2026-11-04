# Forge (`forge-hearth`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées) : la forge maçonnée de l'atelier, le feu du forgeron. Elle porte la [hotte](chimney-hood.md), le
[conduit](chimney-flue.md) et le [couronnement](chimney-cap.md) du jeu, comme l'[âtre](stone-hearth.md) de la maison de Xéros.

## Identité
- Clé : `forge-hearth`.
- Nom affiché : « forge » (féminin).
- Nature : objet du monde (`props.json`), famille `mobilier`, sans `take` ; son feu animé (`anim: burn`, comme l'âtre) et sa lueur
  (`light`, au milieu du feu ; rayon à régler sur le dessin, l'âtre a 160, choisi faute de source) ; pas de `smoke` : la fumée sort
  par le couronnement.
- Mains : aucune, elle ne se prend pas.
- Âge : aucun, c'est de la pierre.

## Masse
`{"matter": "stone", "fill": 0.45}` sur la boîte de ses `dims` (2,20 × 1,10 × 1,60 m, 3,87 m³) : 1,74 m³ de calcaire (2 400 kg/m³),
**4,2 t**. Ce que compte la part : le haut, les joues et le contrecœur (environ 0,78 m³), et la table, dont le cœur est un blocage de
pierraille et de terre (environ la moitié de ses 1,94 m³). Elle ne se déplace pas.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 220 (est-ouest) × 110 (nord-sud) × 160 cm de haut, contour compris ; boîte.
- **La table de feu à 80 cm** (la hauteur de la hanche : le forgeron travaille debout, le fer dans le feu), dessus en terre battue et
  charbon, le creuset du feu au milieu ; **le contrecœur et les deux joues jusqu'à 1,60 m**, en moellons ; **la tuyère dans la joue
  ouest**, où entre la buse du [soufflet](forge-bellows.md). Mesures choisies dans les fourchettes courantes (CADRAGE-forge.md,
  section 2 : connaissance générale, non sourcée).
- Place dans l'atelier (cm, repère du plan de la grange : x 0–960, y 0–680) : x 160–380, y 45–155, contre le bardage nord ; sa face de
  feu regarde le sud, la rue la voit.
- `ground: true`, comme l'âtre : la hotte, le conduit et le couronnement se posent dessus en (x, y − z), leur profondeur à l'échelle
  du sol. À l'écran, de face (r0, r2) : 44 × (32 + 22) = **44 × 54 px** ; de côté (r1, r3) : 22 × (32 + 44) = **22 × 76 px**.
- **Ce qu'elle porte** : la hotte du jeu (220 × 80 × 100) sur le haut des joues et du contrecœur, à 1,60 m (z 160 à 260), contre le
  nord (y 45–125) ; le devant de la table (30 cm) reste découvert sous son bord. Le conduit (tronçons d'1 m, 100 × 80) monte sur
  la hotte au milieu (x 220–320), perce le [pan nord](shingle-roof-large.md) et dépasse le faîte (vers 6,80 m : cinq tronçons, de 2,60
  à 7,60 m, à confirmer par le plan), le couronnement dessus.

## Vues
Quatre (`four`, elle a un devant), chacune une planche à l'animation `burn` (le feu ne se voit que de face : r1 à r3 ont trois fois
la même image).
- r0 (de face, 44 × 54) : la table de moellons, le creuset et son charbon rougeoyant, les flammes basses qui vacillent, le
  contrecœur noirci, les deux joues ; le trou de la tuyère dans la joue ouest.
- r1, r3 (de côté, 22 × 76) : le flanc d'une joue ; sur r3 (vue de l'ouest), la tuyère.
- r2 (de dos, 44 × 54) : le dos du contrecœur, en moellons.
- Fantôme : la vue de face en transparence (mode construction).

## Variantes naturelles
Aucune : de la pierre montée, régulière à la mesure du maçon.

## Regroupement
Seule.

## Gestes
- Mode construction : clic gauche la pose au sol, R la tourne (la face de feu), clic droit la retire.
- En jeu : elle bloque toute son emprise (`blocks`, src/world/build.ts). E : rien encore (plus tard, mettre le charbon, chauffer le
  fer).

## Travail
Aucun pour l'instant. Plus tard, le poste des transformations du forgeron (chauffer, souder, « cingler la loupe » : CADRAGE-forge.md,
section 4).

## Arme
Aucune.

## Origine
Bâtie par le maçon : moellons de calcaire, mortier, blocage de pierraille et de terre ; la tuyère en fer (le forgeron). Pas encore
fabriquée en jeu.

## Devenir
Elle reste.

## Transformations
Aucune pour l'instant (pas encore de poste « forge » dans transforms.json).

## Métier
Le maçon (`mason`).

## Vérification
- `.art-preview/forge-pieces.png` : ses trois images et ses vues r1 à r3 au gabarit, Xéros à côté ; la hotte, le conduit et le
  couronnement posés dessus.
- `npm run test:forge` (le scénario qui bâtira l'atelier, à venir) ; `npm run check`.
- En jeu : la poser en mode construction, la hotte dessus (z = 160), regarder qu'elle tombe juste ; le soir, la lueur.
