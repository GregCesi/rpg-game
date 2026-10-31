# Gerbe de paille (`straw`)

## Identité
- Clé : `straw` ; image au sol `straw-ground` et ses vues `-r1`, `-r2`, `-r3`.
- Nom affiché : gerbe de paille (« paille » jusqu'au 31 octobre 2026 : une icône ronde de 0,3 kg, sans image au sol ni masse calculée ; mise au protocole au chantier « briques »).
- Nature : objet possédable (`items.json`, `kind: resource`) : la paille de seigle ou de blé gardée longue pour le chaume, liée en son milieu.
- Mains : une (tenue par le lien).

## Masse
- Calculée : cylindre de 120 cm × Ø 20 × 100 kg/m³ (paille tassée) = **3,8 kg**.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 120 × Ø 20 cm, couchée est-ouest. À l'écran : 24 × 4,5 px.

## Vues
- Symétrie : quatre, couchée : un bout d'épis, un bout de pied coupé net. R la tourne.
- En main : `held-straw` (`hand`). Case : `item-straw` (refaite : la gerbe). Fantôme : sa vue.

## Variantes naturelles
Aucune : une gerbe se lie à la brassée, à une mesure d'usage.

## Regroupement
En tas : genre `straw-sheaves`.

## Gestes
E prendre, poser à son fantôme, R tourner.

## Origine
La moisson (à la faucille), battue sans casser la tige. S'achète au paysan riche de la ferme commune.

## Devenir
Peignée en bottes de chaume ; hachée dans le torchis.

## Transformations
- `comb-thatch` : 3 gerbes → 1 botte de chaume ; déchet : paille courte et épis peignés (≈ 2,8 kg ; elle servira au torchis et à la litière, disparaît pour l'instant) ; poste : sol ; geste à venir.
- `mix-cob` : une gerbe y entre.

## Métier
Paysan (`peasant`).

## Vérification
- Aperçu : `briques.png` (groupe 3), `couches.png`, `piles.png`. En jeu : ?dieu « Au sol », « Transformer ».
