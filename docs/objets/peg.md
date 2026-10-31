# Cheville (`peg`)

## Identité
- Clé : `peg` ; image au sol `peg-ground` et ses vues.
- Nom affiché : cheville.
- Nature : objet possédable (`items.json`, `kind: resource`) : une cheville de charpente, un bout taillé en pointe.
- Mains : une.

## Masse
- Calculée : 25 cm × Ø 3 × 900 kg/m³ = **0,16 kg**.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 25 × Ø 3 cm. À l'écran : 5 × 0,7 px, dessinée au plancher (5 à 6 × 1 à 2).

## Vues
- Symétrie : quatre, couchée (pointe, tête). R la tourne.
- En main : `held-peg`. Case : `item-peg`.

## Variantes naturelles
Aucune : taillée à la mesure.

## Regroupement
Seule (plus tard, un panier).

## Gestes
- E prendre, poser, R tourner.
- La faire : la hachette dans une main, un piquet dans l'autre, Espace face au billot (le geste du piquet, `convert` du billot : branche → piquet, piquet → cheville).

## Origine
Taillée dans un piquet, sur le billot. **Choix** : une cheville par piquet (le reste part au feu) : le geste réel du piquet ne rend qu'un objet dans la main.

## Devenir
Elle chevillera les tenons des colombages et des chevrons (à venir).

## Transformations
- `whittle-peg` : piquet → cheville ; déchet : le reste du piquet, en copeaux et bois de feu (0,8 kg) ; outil : hachette ; poste : billot ; **geste réel** (`systems/harvest.ts`).

## Métier
Charpentier (`carpenter`).

## Vérification
- Aperçu : `briques.png` (groupe 4), `couches.png`.
- En jeu : la hachette et un piquet en main, Espace face au billot.
