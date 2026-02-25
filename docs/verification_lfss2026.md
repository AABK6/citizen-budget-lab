# Verification LFSS 2026 - Equilibres votes

- Source JO: `Loi n° 2025-1403 du 19 decembre 2025` (`JORFTEXT000053226384`).
- Source annexe parlementaire: `https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0199.raw`.
- Methode: extraction ligne a ligne des tableaux votes (article liminaire + tableau d'equilibre 2026 par branche), comparaison stricte.

## ASSO (Article liminaire, % PIB)

| Cle | Libelle | Extrait | Attendu | Match | Ref annexe |
| --- | --- | ---: | ---: | :---: | --- |
| asso_recettes_pct_pib_2026 | Recettes | 26.9 | 26.9 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0199.raw#L501 |
| asso_depenses_pct_pib_2026 | Dépenses | 26.8 | 26.8 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0199.raw#L501 |
| asso_solde_pct_pib_2026 | Solde | 0.1 | 0.1 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0199.raw#L501 |

## Regimes de base (2026, MdEUR)

| Branche | Recettes | Depenses | Solde | Match | Ref annexe |
| --- | ---: | ---: | ---: | :---: | --- |
| Maladie | 257.5 | 271.3 | -13.8 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0199.raw#L643 |
| Accidents du travail et maladies professionnelles . | 17.1 | 18.0 | -1.0 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0199.raw#L669 |
| Vieillesse | 305.8 | 310.4 | -4.6 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0199.raw#L695 |
| Famille | 60.1 | 59.7 | 0.4 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0199.raw#L721 |
| Autonomie | 43.3 | 43.6 | -0.4 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0199.raw#L747 |
| Toutes branches (hors transferts entre branches) | 664.8 | 684.2 | -19.4 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0199.raw#L773 |

**Resultat global:** OK (9/9 correspondances).
