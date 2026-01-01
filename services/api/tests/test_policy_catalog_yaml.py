from services.api import policy_catalog as pol


def test_policy_catalog_yaml_valid():
    data = pol.load_policy_catalog(refresh=True)
    assert data, "Expected non-empty policy catalog"
    ids = [d.get("id") for d in data]
    assert len(ids) == len(set(ids))


def test_policy_catalog_validation_roundtrip():
    text = pol.read_policy_catalog_text()
    errors = pol.validate_policy_catalog_text(text)
    assert errors == []
