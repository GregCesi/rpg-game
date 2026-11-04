# Étau (`vise`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées) : l'étau à pied du forgeron, au bout sud de l'établi, où tombe la lumière du sud.

## Identité
- Clé : `vise`.
- Nom affiché : « étau » (masculin).
- Nature : objet du monde (`props.json`), famille `mobilier`, en fer : deux mâchoires, la vis et son levier, la bride qui le serre à
  l'établi.
- Mains : aucune pour l'instant (pas de `take`).
- Âge : aucun, c'est du fer.

## Masse
`{"matter": "iron", "fill": 0.13}` sur la boîte de ses `dims` (20 × 30 × 40 cm, 0,024 m³) : 0,0031 m³ de fer, **24,6 kg**. Xéros le
porterait (24,6 kg : il en porte 70, et marche normalement jusqu'à 25) s'il se prenait.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 20 × 30 × 40 cm de haut, contour compris ; boîte. **Posé sur l'établi** du jeu (85 cm) : le mode construction le pose sur le plus
  haut dessus que recoupe son emprise (z 85).
- Place dans l'atelier : sur l'établi nord-sud contre le bardage est (x 850–920, y 120–440), à son bout sud, les mâchoires vers
  l'ouest, vers la pièce.
- À l'écran, de face (r0, r2) : 4 × (8 + 3) = **4 × 11 px** (le plancher de lisibilité permettrait 6 px de large, proportions
  gardées : 6 × 16) ; de côté (r1, r3) : 6 × (8 + 2) = **6 × 10 px**.

## Vues
Quatre (`four` : les mâchoires d'un côté, la vis et son levier de l'autre).

## Variantes naturelles
Aucune.

## Regroupement
Seul.

## Gestes
- Mode construction : clic gauche le pose sur l'établi, R le tourne (les mâchoires), clic droit le retire.
- En jeu : posé en hauteur, son petit corps (`body` 4 × 4 px, le contrat des meubles) est dans celui de l'établi : il ne bloque rien de plus.

## Travail
Aucun pour l'instant.

## Arme
Aucune.

## Origine
Forgé par le forgeron, ou acheté. Pas encore fabriqué en jeu.

## Devenir
Il reste.

## Transformations
Aucune.

## Métier
Le forgeron (`smith`).

## Points ouverts
- **Le pied** : un étau à pied a une jambe de fer qui descend jusqu'au sol, le long du pied de l'établi, et reprend les coups de
  marteau. Ses 40 cm sont la tête au-dessus de l'établi ; la jambe, sous le plateau, sort de sa boîte. À l'écran, l'établi la cache
  presque toute ; si le dessin la montre, elle se dessine dans l'image de l'établi ou comme une pièce à part : à trancher avec le dessin.
- **Le prendre** (`take`, une main) : pas demandé pour l'instant.

## Vérification
- `.art-preview/forge-pieces.png` : ses quatre vues au gabarit, posé sur l'établi, Xéros à côté.
- `npm run test:forge` (à venir) ; `npm run check`.
