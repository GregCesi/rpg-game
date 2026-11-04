# Billot d'enclume (`anvil-block`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées) : le gros tronçon de chêne debout qui porte l'[enclume](anvil.md) et boit ses coups.

## Identité
- Clé : `anvil-block`.
- Nom affiché : « billot d'enclume » (masculin).
- Nature : objet du monde (`props.json`), famille `mobilier`, sans `take` : un tronçon de gros bois, debout, cerclé de fer en haut.
- Mains : aucune.
- Âge : bois travaillé, il prend l'âge du bois (`"aged": true` ; dans la forge, vieux).

## Masse
`{"matter": "wood", "fill": 0.9}` sur son cylindre (Ø 60 × 55 cm, 0,156 m³) : **126 kg** de bois vert. Il ne se porte pas (126 kg,
Xéros en porte 70) ; il se roulerait, mais il n'a pas de `roll`.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Ø 60 cm, 55 cm de haut hors du sol ; cylindre debout (`axis: up`).
- **Dans le réel, il est enterré de 20 cm** (il ne bouge pas sous le marteau, et la terre amortit) : le jeu le pose sur le sol, ses
  55 cm visibles ; les 20 cm enterrés (46 kg de plus) ne sont ni dessinés ni comptés.
- Pourquoi pas le billot du jeu (`chopping-block`, Ø 55 × 45) : avec l'enclume de 30 cm, la table serait à 75 cm, sous la main ; à
  55, elle est à 85 (CADRAGE-forge.md, question 6).
- À l'écran : 12 × (11 + 6) = **12 × 17 px**.

## Vues
Rond (`round`, une vue) : le flanc d'écorce ou de bois nu, le cercle de fer en haut, le dessus de bois de bout (cernes, l'empreinte
du pied de l'enclume).

## Variantes naturelles
Aucune : un tronçon scié à la mesure.

## Regroupement
Seul.

## Gestes
- Mode construction : clic gauche le pose au sol, clic droit le retire (R sans effet : il est rond).
- En jeu : il bloque son emprise. L'enclume se pose dessus.

## Travail
Aucun.

## Arme
Aucune.

## Origine
Un tronçon du pied d'un gros arbre (le tronc du gros a 55 cm : 60, c'est là où il s'évase), scié au passe-partout, le cercle de fer du
forgeron. Pas encore fabriqué en jeu.

## Devenir
Il reste sous l'enclume.

## Transformations
Aucune.

## Métier
Le charpentier (`carpenter`).

## Vérification
- `.art-preview/forge-pieces.png` : sa vue au gabarit, l'enclume dessus, Xéros à côté ; ses trois âges.
- `npm run test:forge` (à venir) ; `npm run check`.
