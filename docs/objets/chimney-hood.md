# Hotte (`chimney-hood`)

Décidé le 3 novembre 2026 (CONCEPTION « La maison de Xéros » ; la cheminée paysanne refaite, proposition validée par Grégoire :
`art/proposals/cheminee-2.ts`, `.art-preview/cheminee-2.png`, avec sa retouche : « la hotte descendue à 1,50 m, posée sur le
manteau, sans vide derrière ») : la hotte de la cheminée, posée sur l'[âtre](stone-hearth.md) à 1,50 m, derrière le manteau ; le
[conduit](chimney-flue.md) monte dessus.

## Identité
- Clé : `chimney-hood`.
- Nom affiché : « hotte » (féminin).
- Nature : objet du monde (`props.json`), famille `éléments`, une pièce de bâtiment.
- Mains : aucune.
- Âge : aucun (torchis chaulé, pas de bois visible).

## Masse
`{"matter": "cob", "fill": 0.55}` : 2,20 × 0,80 × 1,00 m (1,76 m³), creuse (parois de 15 cm, le dessus) : environ 0,97 m³ de
torchis, 1,7 t (1 750 kg/m³). Ne se déplace pas.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 220 × 80 × 100 cm ; boîte, `ground: true` (posée sur l'âtre : voir sa fiche). Place (cm, en axes) : x 660–880, y 30–110,
  z 150–250.
- Elle repose sur les jambages et le contrecœur à 1,50 m, sa face sud contre le dos du manteau (y 110) : ses 20 cm du bas sont
  cachés derrière lui, puis elle se voit au-dessus de lui jusqu'à 2,50 m (la sablière). Plus aucun vide entre l'âtre et la hotte.
  Son emprise ne recoupe pas celle du manteau (y 110–140) : le mode construction la pose sur l'âtre, pas sur le manteau.
- Torchis sur clayonnage chaulé, comme les murs (la proposition ; RAPPORT.md point 12 : au village, hotte « en plâtre sur planches,
  moellons, ou bois enduit d'argile », Viollet-le-Duc, historiccookingschool.com) ; parois de 15 cm, choisies faute de source.
- Les murs jusqu'à 90 cm, puis un glacis de 10 cm à l'est et à l'ouest jusqu'au plat du dessus, au droit du conduit (x 720–820) ;
  au nord et au sud, la face monte jusqu'au plat (le conduit couvre toute la profondeur).
- À l'écran : 44 × (20 + 16) = **44 × 36 px** ; de côté **16 × 64** (dessinée 16 × 62 : le glacis abaisse ses deux bouts).

## Vues
Quatre (`four`) : r0 le devant, la chaux noircie au bas par la fumée qui lèche le manteau (pleine derrière lui, qui s'éteint
au-dessus) ; r2 le dos, contre le mur, propre ; r1 et r3 de côté, un peu de suie au bas. Sur le dessus, le plat et le passage du
conduit (60 × 40) noir, que le conduit posé couvre.

## Variantes naturelles
Aucune.

## Regroupement
Seule.

## Gestes
Mode construction : posée sur l'âtre (x 660, y 30, z 150), à côté du manteau.

## Travail
Aucun.

## Arme
Aucune.

## Origine
Montée par le maçon : un clayonnage sur des perches, le torchis des deux côtés, la chaux.

## Devenir
Elle reste.

## Transformations
Aucune.

## Métier
Le maçon (`mason`).

## Vérification
`.art-preview/cheminee-2.png` (`npx tsx tools/essai-cheminee.ts` : ses quatre vues au gabarit ; la cheminée montée, le repère
« haut de la hotte 2,50 m » ; le détail x4), `.art-preview/chimney-hood.png`, `npm run check`.
