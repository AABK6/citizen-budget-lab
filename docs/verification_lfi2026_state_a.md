# Verification LFI 2026 - ETAT A (recettes/equilibre)

- Source JO: `Loi n° 2026-103 du 19 fevrier 2026` (`JORFTEXT000053508155`).
- Source annexe parlementaire: `https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw` (Article 147, tableau d'equilibre).
- Methode: extraction ligne a ligne des principaux agregats de recettes/charges/solde (M EUR), comparaison stricte aux montants promulgues.
- Complement: extraction exhaustive de la table `Etat A > Voies et moyens > I. Budget general` (codes de ligne + montants en euros).

| Cle | Libelle | Valeur extraite (M EUR) | Valeur JO attendue (M EUR) | Match | Ref annexe |
| --- | --- | ---: | ---: | :---: | --- |
| budget_general_recettes_fiscales_nettes | Recettes fiscales** / dépenses*** | 363603 | 363603 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw#L24812 |
| budget_general_recettes_non_fiscales | Recettes non fiscales | 28900 | 28900 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw#L24858 |
| budget_general_recettes_totales | Recettes totales / dépenses totales | 392503 | 392503 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw#L24904 |
| budget_general_psr_collectivites_ue | À déduire : Prélèvements sur recettes au profit des collectivités territoriales et de l’Union européenne | 73264 | 73264 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw |
| budget_general_montants_nets_ressources | Montants nets pour le budget général | 319239 | 319239 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw#L24996 |
| budget_general_montants_nets_charges | Montants nets pour le budget général | 452716 | 452716 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw#L24996 |
| budget_general_montants_nets_solde | Montants nets pour le budget général | -133477 | -133477 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw#L24996 |
| solde_general | Solde général | -134627 | -134627 | OK | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw#L25778 |

**Resultat global:** OK (8/8 correspondances).

## Etat A - Voies et moyens (lignes extraites)

- Lignes extraites: `173`.
- Repartition: fiscal `84`, non fiscal `57`, prelevements sur recettes `32`.

| Code | Intitule | Montant (EUR) | Ref annexe |
| --- | --- | ---: | --- |
| 1101 | Impôt net sur le revenu | 99836208951 | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw |
| 1301 | Impôt net sur les sociétés | 61628838886 | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw |
| 1302 | Contribution sociale sur les bénéfices des sociétés | 1411000000 | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw |
| 1304 | Impôt minimum mondial à 15 % - pilier 2 | 500000000 | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw |
| 1501 | Accises sur les énergies (ex-TICPE) | 17469533401 | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw |
| 1601 | Taxe sur la valeur ajoutée nette | 99805199715 | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw |
| 1761 | Taxe et droits de consommation sur les tabacs | 78000000 | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw |
| 2116 | Produits des participations de l’État dans des entreprises non financières et bénéfices des établissements publics non financiers | 3911700000 | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw |
| 2505 | Produit des autres amendes et condamnations pécuniaires | 1048281302 | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw |
| 2622 | Divers versements de l’Union européenne | 6140000000 | https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw |
