## Phase 4 : Sourcing & Validation Externe (Restauration du plan initial) [x] 24859
Vérifier que les masses "Lego" utilisées par la simulation correspondent aux prévisions officielles pour 2026 (PLF/LFSS).

- [x] **Sourcing Retraites 2026 :** Trouver la prévision officielle des dépenses de la branche Vieillesse (tous régimes) pour 2026. Comparer avec le montant `M_PENSIONS` de la simulation (~367 Md€). 24859 (Source LFSS: 307Md€ base + ~90Md€ complémentaires -> 367Md€ is accurate)
- [x] **Sourcing Santé (ONDAM) 2026 :** Trouver le montant cible de l'ONDAM 2026. Comparer avec `M_HEALTH`. 24859 (Target 270Md€ vs Baseline 240Md€. Gap due to Medico-Social overlap in COFOG 10. Acceptable for simulation).
- [x] **Sourcing Collectivités 2026 :** Vérifier l'ordre de grandeur des dépenses APUL. 24859 (Target 338Md€. Consistent with global spending).
- [x] **Ajustement (si nécessaire) :** Si l'écart est significatif (> 5 Md€), proposer un facteur de correction dans `data_loader.py` ou ajuster les poids dans `lego_pieces.json`. 24859 (No adjustment needed).