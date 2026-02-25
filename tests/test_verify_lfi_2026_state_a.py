from __future__ import annotations

from tools.verify_lfi_2026_state_a import extract_line_items, verify_metrics


def test_verify_metrics_extracts_expected_state_a_values() -> None:
    html = """
    <html><body>
      <p>Article 147</p>
      <p>I. – Pour 2026, ...</p>
      <table>
        <tr><td>Recettes fiscales** / dépenses***</td><td>363 603</td><td>363 603</td><td>452 716</td><td>422 705</td><td>30 010</td></tr>
        <tr><td>Recettes non fiscales</td><td>28 900</td><td>15 861</td><td>13 039</td></tr>
        <tr><td>Recettes totales / dépenses totales</td><td>392 503</td><td>379 464</td><td>13 039</td><td>452 716</td><td>422 705</td><td>30 010</td></tr>
        <tr><td>À déduire : Prélèvements sur recettes au profit des collectivités territoriales et de l’Union européenne</td><td>73 264</td></tr>
        <tr><td>Montants nets pour le budget général</td><td>319 239</td><td>306 200</td><td>13 039</td><td>452 716</td><td>422 705</td><td>30 010</td><td>-133 477</td></tr>
        <tr><td>Solde général</td><td>-134 627</td></tr>
      </table>
    </body></html>
    """

    rows = verify_metrics(html)
    by_key = {r.key: r for r in rows}

    assert by_key["budget_general_recettes_fiscales_nettes"].value_mio == 363_603
    assert by_key["budget_general_recettes_non_fiscales"].value_mio == 28_900
    assert by_key["budget_general_recettes_totales"].value_mio == 392_503
    assert by_key["budget_general_psr_collectivites_ue"].value_mio == 73_264
    assert by_key["budget_general_montants_nets_ressources"].value_mio == 319_239
    assert by_key["budget_general_montants_nets_charges"].value_mio == 452_716
    assert by_key["budget_general_montants_nets_solde"].value_mio == -133_477
    assert by_key["solde_general"].value_mio == -134_627
    assert all(r.match_ok for r in rows)


def test_extract_line_items_from_voies_et_moyens_table() -> None:
    html = """
    <html><body>
      <p>État A</p>
      <p>Voies et moyens</p>
      <table>
        <tr><td>Numéro de ligne</td><td>Intitulé de la recette</td><td>Évaluation pour 2026</td></tr>
        <tr><td>1101</td><td>Impôt net sur le revenu</td><td>99 836 208 951</td></tr>
        <tr><td>1301</td><td>Impôt net sur les sociétés</td><td>61 628 838 886</td></tr>
        <tr><td>2116</td><td>Produits des participations</td><td>3 911 700 000</td></tr>
        <tr><td>2505</td><td>Produit des autres amendes</td><td>1 048 281 302</td></tr>
        <tr><td>3106</td><td>Prélèvement sur recettes</td><td>7 866 719 297</td></tr>
      </table>
    </body></html>
    """

    rows = extract_line_items(html)
    by_code = {r.line_code: r for r in rows}

    assert by_code["1101"].amount_eur == 99_836_208_951
    assert by_code["1301"].section == "fiscal"
    assert by_code["2116"].section == "non_fiscal"
    assert by_code["3106"].section == "prelevements_sur_recettes"
