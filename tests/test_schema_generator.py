from tools.etl.schema_generator import policy_lever_columns


def test_policy_lever_columns_include_known_lever():
    columns = policy_lever_columns()

    assert "reform_wealth_tax" in columns


def test_policy_lever_columns_update_when_catalog_changes(tmp_path):
    catalog_path = tmp_path / "policy_levers.yaml"
    catalog_path.write_text("- id: test_dummy\n  label: Dummy\n")

    columns = policy_lever_columns(str(catalog_path))

    assert columns == ["reform_test_dummy"]
