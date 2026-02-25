from __future__ import annotations

from tools.verify_lfss_2026 import _extract_asso_pct_metrics, _extract_branch_metrics


def test_extract_asso_and_branch_metrics() -> None:
    html = """
    <html><body>
      <p>Article liminaire</p>
      <p>Les prévisions de dépenses, de recettes et de solde des administrations de sécurité sociale pour les années 2025 et 2026 s’établissent comme suit</p>
      <table>
        <tr><td>(En points de produit intérieur brut)</td></tr>
        <tr><td></td><td>2025</td><td>2026</td></tr>
        <tr><td>Recettes</td><td>26,7</td><td>26,9</td></tr>
        <tr><td>Dépenses</td><td>26,9</td><td>26,8</td></tr>
        <tr><td>Solde</td><td>-0,3</td><td>0,1</td></tr>
      </table>

      <p>Pour l’année 2026 est approuvé le tableau d’équilibre, par branche, de l’ensemble des régimes obligatoires de base de sécurité sociale</p>
      <table>
        <tr><td>(En milliards d’euros)</td></tr>
        <tr><td>Maladie</td><td>257,5</td><td>271,3</td><td>-13,8</td></tr>
        <tr><td>Accidents du travail et maladies professionnelles</td><td>17,1</td><td>18,0</td><td>-1,0</td></tr>
        <tr><td>Vieillesse</td><td>305,8</td><td>310,4</td><td>-4,6</td></tr>
        <tr><td>Famille</td><td>60,1</td><td>59,7</td><td>0,4</td></tr>
        <tr><td>Autonomie</td><td>43,3</td><td>43,6</td><td>-0,4</td></tr>
        <tr><td>Toutes branches (hors transferts entre branches)</td><td>664,8</td><td>684,2</td><td>-19,4</td></tr>
      </table>
    </body></html>
    """

    asso = _extract_asso_pct_metrics(html)
    by_key = {r.key: r for r in asso}
    assert by_key["asso_recettes_pct_pib_2026"].value_pct == 26.9
    assert by_key["asso_depenses_pct_pib_2026"].value_pct == 26.8
    assert by_key["asso_solde_pct_pib_2026"].value_pct == 0.1
    assert all(r.match_ok for r in asso)

    branches = _extract_branch_metrics(html)
    by_branch = {r.key: r for r in branches}
    assert by_branch["maladie"].recettes_bn == 257.5
    assert by_branch["at_mp"].depenses_bn == 18.0
    assert by_branch["vieillesse"].solde_bn == -4.6
    assert by_branch["all_branches_hors_transferts"].depenses_bn == 684.2
    assert all(r.match_ok for r in branches)
