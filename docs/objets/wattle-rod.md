# Baguette de clayonnage (`wattle-rod`)

## Identité
- Clé : `wattle-rod` ; image au sol `wattle-rod-ground` et ses vues.
- Nom affiché : baguette de clayonnage.
- Nature : objet possédable (`items.json`, `kind: resource`) : un rejet fin et droit (noisetier), écorce lisse.
- Mains : une (légère, tenue en son milieu ; longue, mais souple).

## Masse
- Calculée : 200 cm × Ø 2,5 × 900 kg/m³ (bois vert) = **0,9 kg**.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 200 × Ø 2,5 cm. À l'écran : 40 × 0,6 px, dessinée sur 1 à 2 px d'épaisseur (dans la tolérance).

## Vues
- Symétrie : quatre, couchée : un gros bout coupé en biseau, un bout fin. R la tourne.
- En main : `held-wattle-rod` (`hand`). Case : `item-wattle-rod`.

## Variantes naturelles
Aucune : on coupe les rejets à la longueur au taillis.

## Regroupement
En tas : genre `wattle-rods`.

## Gestes
E prendre, poser, R tourner.

## Origine
Un taillis de noisetiers (à créer). En attendant, parée à la hachette dans une branche du houppier. **Triche notée** : la branche fait 1 à 1,5 m, la baguette 2 m ; la longueur sera juste quand le taillis viendra.

## Devenir
Le clayonnage des pans de mur : tressée entre des piquets (les palançons), puis couverte de torchis.

## Transformations
- `trim-rod` : branche → baguette ; déchet : rameaux et brindilles (1,6 kg, au feu) ; outil : hachette ; poste : billot ; geste à venir.

## Métier
Bûcheron (`woodcutter`).

## Vérification
- Aperçu : `briques.png` (groupe 3), `couches.png`, `piles.png`. En jeu : `npm run test:briques`.
