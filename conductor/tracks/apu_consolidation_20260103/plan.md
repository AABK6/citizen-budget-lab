# Track: Consolidation APU & Refonte des Leviers (Retraites & Santé)

**Date:** 2026-01-03
**Status:** Planned
**Goal:** Aligner les leviers de réforme ("Policy Levers") sur les masses budgétaires réelles (APU) déjà présentes dans la Treemap.
Actuellement, les leviers "Retraites" et "Santé" ciblent des missions budgétaires étroites (Budget de l'État : `M_SOLIDARITE`, `M_SANTE`) alors que la Treemap affiche les masses consolidées (Sécurité Sociale : `M_PENSIONS`, `M_HEALTH`).

## Contexte & Diagnostic
- **Retraites :** La Treemap affiche ~367 Md€ (via `soc_pensions` -> `M_PENSIONS`). Les leviers actuels (ex: report âge légal) ciblent `M_SOLIDARITE` (minima sociaux), ce qui les rend inopérants sur la masse principale.
- **Santé :** La Treemap affiche les dépenses hospitalières et de ville (via `health_hospitals` -> `M_HEALTH`). Les leviers (ex: hausse ONDAM) ciblent `M_SANTE` (crédits ministère), créant une déconnexion.
- **Collectivités :** La dépense est ventilée fonctionnellement (Transport, Culture...). Le statu quo est conservé (levier via Dotations `M_TERRITORIES`).

## Phase 1 : Redirection des Leviers Retraites [x] 3e5382b
Modifier `data/policy_levers.yaml` pour que les réformes structurelles impactent la mission `M_PENSIONS`.

- [x] **Identifier les leviers concernés :** 3e5382b
    - `amend_suspend_retirement_reform` (Report âge)
    - `raise_retirement_age_65`
    - `lower_retirement_age_62` / `60`
    - `extend_contribution_period`
    - `annee_blanche_indexation` (si applicable aux retraites)
    - `remove_pension_deduction` (Fiscalité - impact recette ou dépense ?) -> *A vérifier si c'est une recette fiscale (Recette État) ou une économie dépense.*
- [x] **Action :** Changer `mission_mapping` de `M_SOLIDARITE` vers `M_PENSIONS`. 3e5382b

## Phase 2 : Redirection des Leviers Santé [x] 3e5382b
Modifier `data/policy_levers.yaml` pour que les réformes de régulation (ONDAM) impactent la mission `M_HEALTH`.

- [x] **Identifier les leviers concernés :** 3e5382b
    - `amend_ondam_3pct_increase`
    - `amend_no_medical_copay_doubling` (Franchises)
    - `amend_limit_sick_leave_duration` (IJ - souvent dans ONDAM)
- [x] **Action :** Changer `mission_mapping` de `M_SANTE` vers `M_HEALTH`. 3e5382b

## Phase 3 : Vérification "Somme Nulle" & UX
- [ ] **Vérifier l'impact visuel :**
    - Lancer l'app.
    - Activer "Report âge légal".
    - Vérifier que la barre "Dépenses Retraites" (la grosse, pas la petite) diminue bien.
- [ ] **Validation Cohérence :**
    - S'assurer que le déficit bouge dans les proportions attendues (ex: ~10 Md€ pour une réforme retraite majeure, et non 0.1 Md€).
