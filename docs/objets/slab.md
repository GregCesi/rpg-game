# Dalle (`slab`)

Décidée le 31 octobre 2026 (chantier « pierre ») : **le calcaire se casse en plaques**. La dalle est la forme naturelle plate de la
[pierre brute de carrière](rough-stone.md), même roche, mêmes taches et mêmes cassures. Elle **remplace la pierre plate**
(`flat-stone`, chantier « briques », plus ancienne : la clé a changé, `SAVE_VERSION` 12 convertit les parties) et sert de dé sous
les poteaux de l'abri à bois.

## Identité
- Clé : `slab` (objet du monde, `props.json`, avec `take`) ; images `slab`, `slab-b`.
- Nom affiché : dalle (féminin).
- Nature : objet du monde qu'on prend. Posée sur une place de l'étape « les dés » d'un chantier, elle devient le dé de pierre
  (`footing-stone`, voir [footing-stone.md](footing-stone.md)).
- Mains : deux.
- Roche : le calcaire (`limestone`, `src/content/rocks.json`).

## Masse
- Calculée par la roche : `"mass": {"matter": "stone", "fill": 0.75}` : la boîte de ses `dims` (45 × 40 × 12 cm = 0,0216 m³) × 0,75
  (une plaque à bords cassés remplit mieux sa boîte qu'un bloc, moins qu'une pierre taillée) × 2 400 kg/m³ (le calcaire) =
  **38,9 kg** à sa taille type, de 31,4 à 47,6 kg selon sa taille tirée (± 7 %, au cube).
- Portée (70 kg au plus), lentement (au-dessus de 25 kg).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Plaque à plat : 45 × 40 × 12 cm, contour compris. Boîte (`box`).
- À l'écran : W = 9 px ; H + D/2 = 2,4 + 4 = 6,4 : **9 × 6 à 9 × 7** px. Le poteau debout (8 px de large) tient sur elle sans déborder
  (`validate.ts`).

## Vues
- Symétrie : ronde (`views: "round"`, une vue par forme) : à 9 px, une dalle tournée ne se distingue pas ; R ne la tourne pas ; ses
  deux formes jouent le rôle de ses côtés.
- Au sol : `slab` et `slab-b`, un dessus large et plat (la face de lit), une tranche mince et cassée, taches de patine, blanc là
  où un bord a sauté (le dessin C de l'essai `essai-pierre.png`) ; ombre portée au sud-est. C'est aussi le dessin du dé
  (`footing-stone`, `footing-stone-b`) : même pierre.
- En main (`held-slab`, posture `carry`, vues `down`, `up`, `right`) : portée à deux mains devant le ventre.
- Case d'interface : `item-slab`, 16 × 16.
- Fantôme : posée seule, sa forme en transparence ; sur un chantier, le dé (`footing-stone`) en transparence sur les places libres
  de l'étape « les dés ».

## Variantes naturelles
Deux formes dessinées, taille type ± 7 % (`natural: {forms: 2, vary: 7}`). Une dalle posée dans Tiled tire les siennes de son
identifiant (toujours les mêmes) ; prise, elle les garde (GameState) ; posée sur le chantier, le dé garde sa forme et sa taille :
c'est la même pierre. Le plan accepte toute dalle, quelle que soit sa forme.

## Regroupement
Seule. Pas de tas de dalles pour l'instant.

## Gestes
- E court : la prendre, à deux mains. Face à une place de l'étape « les dés » : la poser, elle devient un dé ; un autre objet :
  « Il faut une dalle. »
- E dans le vide, Q (A en AZERTY) : la poser devant Xéros, à son fantôme.
- E maintenu, Espace, R : rien.

## Origine
- Trouvée sur la berge de l'étang, à l'ouest de la ferme (six dalles posées dans `ferme.tmj` : quatre pour les dés de l'abri, deux de
  marge).
- Plus tard : à la carrière, où le calcaire s'ouvre en plaques selon ses lits (achetée au carrier, ou levée soi-même au levier).

## Devenir
Posée sur un chantier, elle devient un dé de pierre, pour de bon. Posée ailleurs, elle reste où on la lâche.

## Transformations
Aucune pour l'instant : elle se pose telle quelle (le dé).

## Métier
Carrier (`quarryman`) ; tout paysan en ramasse.

## Vérification
- Aperçu : `.art-preview/briques.png` (groupe 1), `collection.png`, `hands.png` (`held-slab`), `woodshed-1.png` (les dés sous les
  poteaux), `gabarit.png`.
- `?dieu` : « 4 dalles au sol », « Donner » une dalle.
- En jeu : voir la liste de [l'implantation](plan-tablet.md#vérification) ; `npm run test:implantation`, `npm run test:poteaux`,
  `npm run test:tas`.
