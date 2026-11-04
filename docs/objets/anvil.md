# Enclume (`anvil`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées) : l'enclume du forgeron, posée sur son [billot](anvil-block.md), à un pas et demi du feu.

## Identité
- Clé : `anvil`.
- Nom affiché : « enclume » (féminin).
- Nature : objet du monde (`props.json`), famille `mobilier`, en fer : la table, la bigorne (la corne), le talon, le pied.
- Mains : aucune pour l'instant (pas de `take` ; voir les points ouverts).
- Âge : aucun, c'est du fer.

## Masse
`{"matter": "iron", "fill": 0.25}` sur la boîte de ses `dims` (70 × 20 × 30 cm, 0,042 m³) : 0,0105 m³ de fer (7 870 kg/m³),
**83 kg**, l'enclume d'un forgeron de village. Xéros ne la porterait pas (83 kg, il en porte 70) ; le forgeron, oui.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 70 (de la bigorne au talon) × 20 × 30 cm de haut, contour compris ; boîte.
- **Posée sur son billot** de 55 cm : sa table à 85 cm, la hauteur des jointures du poing, bras tendu (l'usage, connaissance
  générale, non sourcée). Le mode construction la pose sur le plus haut dessus que recoupe son emprise (z 55). La bigorne et le
  talon dépassent le billot de Ø 60 de 5 cm de chaque côté, comme dans le réel.
- Place dans l'atelier : le milieu en x 270, y 300, un pas et demi devant la forge.
- À l'écran, en long (est-ouest) : 14 × (6 + 2) = **14 × 8 px** ; nord-sud : 4 × (6 + 7) = **4 × 13 px** (le plancher de lisibilité
  permettrait 6 px de large, proportions gardées : 6 × 19 ; permis, pas obligé, à décider au dessin).

## Vues
Symétrique (`symmetric`) : l'est-ouest (`anvil`, la bigorne d'un côté, le talon de l'autre, la table claire et usée au milieu) et le
nord-sud (`anvil-ns`, vue par le bout : la table sur son pied).

## Variantes naturelles
Aucune : du fer forgé.

## Regroupement
Seule.

## Gestes
- Mode construction : clic gauche la pose sur le billot, R la tourne (est-ouest, nord-sud), clic droit la retire.
- En jeu : le billot bloque ; l'enclume posée dessus n'ajoute rien au sol. Plus tard, le poste du forgeron (forger, au marteau).

## Travail
Aucun pour l'instant.

## Arme
Aucune.

## Origine
Forgée (par un forgeron d'une ville : une enclume se soude de plusieurs pièces) ou achetée. Pas encore fabriquée en jeu.

## Devenir
Elle reste ; elle passe d'un forgeron à l'autre.

## Transformations
Aucune.

## Métier
Le forgeron (`smith`).

## Points ouverts
- **La prendre** : la règle « le monde ne limite pas » voudrait qu'elle se prenne à deux mains (`take`), avec le refus « Trop lourde
  pour lui (83 kg, il en porte 70) » à la force de Xéros. Pas demandé pour l'instant : à décider.
- Si la vérification des porte-à-faux (`overhangs`, src/world/overhang.ts) relève les 5 cm de bigorne et de talon au-dessus du vide
  sur le plan de la forge, l'écart est voulu (c'est la forme d'une enclume).

## Vérification
- `.art-preview/forge-pieces.png` : ses deux vues au gabarit, posées sur le billot, Xéros à côté (la table à hauteur de son poing).
- `npm run test:forge` (à venir) ; `npm run check`.
