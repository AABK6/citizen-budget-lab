# Documentation - Table des Matières

Ce dossier contient la documentation technique et fonctionnelle du projet **Citizen Budget Lab**. Voici un guide rapide pour vous orienter.

## 📘 Documentation Générale

*   **[`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md)**
    *   **Quoi :** La vision produit, les fonctionnalités clés et la roadmap macro.
    *   **Pour qui :** Tout le monde. C'est le point de départ pour comprendre "pourquoi" et "quoi".

*   **[`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md)**
    *   **Quoi :** Guide d'installation (backend/frontend), architecture technique, commandes de build, et processus de CI/CD.
    *   **Pour qui :** Développeurs souhaitant installer ou contribuer au projet.

*   **[`DATA_MANIFEST.md`](./DATA_MANIFEST.md)**
    *   **Quoi :** L'inventaire de toutes les sources de données (Eurostat, PLF, etc.), des fichiers de configuration et des pipelines de données (warmers, dbt).
    *   **Pour qui :** Data engineers et développeurs travaillant sur la data.

## 🏗️ Méthodologie & Architecture

*   **[`LEGO_METHOD.md`](./LEGO_METHOD.md)**
    *   **Quoi :** Explication détaillée de la méthode "LEGO" : comment les budgets officiels sont découpés en briques, comment les calculs de déficit fonctionnent, et les hypothèses macroéconomiques.
    *   **Pour qui :** Économistes, data analysts et curieux du modèle de calcul.

*   **[`REFACTOR_PLAN.md`](./REFACTOR_PLAN.md)**
    *   **Quoi :** Historique et plan de la refonte technique majeure (migration vers un data warehouse dbt).
    *   **Pour qui :** Tech leads (utile pour comprendre l'état actuel de la dette technique).

## 🎨 Design & UX

*   **[`UX_OVERHAUL_PLAN.md`](./UX_OVERHAUL_PLAN.md)**
    *   **Quoi :** Le plan détaillé de la refonte graphique "Premium Glass" et de l'"expérience député" (gamification).
    *   **Pour qui :** Designers et développeurs frontend.

*   **[`tutorial-review.md`](./tutorial-review.md)**
    *   **Quoi :** Audit et plan d'amélioration pour le tutoriel d'onboarding utilisateur.
    *   **Pour qui :** Designers UX et développeurs frontend.

## 📂 Références & Migrations

*   **[`plf_missions_programmes.md`](./plf_missions_programmes.md)**
    *   **Quoi :** Nomenclature officielle des missions et programmes du PLF 2025/2026 utilisée dans l'application.
    *   **Pour qui :** Data teams vérifiant les correspondances budgétaires.

*   **[`admin_lens_migration.md`](./admin_lens_migration.md)**
    *   **Quoi :** Plan technique pour passer d'une vue purement fonctionnelle (COFOG) à une vue administrative (Missions de l'État) dans l'interface de construction.
    *   **Pour qui :** Développeurs backend et frontend.

*   **[`1. Mise à jour du __baseline__...docx`](./1.%20Mise%20à%20jour%20du%20__baseline__%20(Budget%202026%20officiel,%20incluant%20PLFSS%20adopté).docx)**
    *   **Quoi :** Document source (Word) contenant les chiffres officiels et les amendements pour le budget 2026, intégré manuellement en décembre 2025.
    *   **Pour qui :** Référence pour la validation des données 2026.
