import importlib


def _reload_settings_module(monkeypatch, **env):
    keys = ["SNAPSHOT_FAST", "LEGO_BASELINE_STATIC", "MACRO_BASELINE_STATIC"]
    for key in keys:
        monkeypatch.delenv(key, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    import services.api.settings as settings_module

    reloaded = importlib.reload(settings_module)
    return reloaded.get_settings()


def test_snapshot_fast_defaults_to_static_on(monkeypatch):
    settings = _reload_settings_module(monkeypatch)
    assert settings.snapshot_fast is True
    assert settings.lego_baseline_static is True
    assert settings.macro_baseline_static is True


def test_snapshot_fast_zero_disables_static_flags_by_default(monkeypatch):
    settings = _reload_settings_module(monkeypatch, SNAPSHOT_FAST="0")
    assert settings.snapshot_fast is False
    assert settings.lego_baseline_static is False
    assert settings.macro_baseline_static is False


def test_legacy_static_flags_still_override_alias(monkeypatch):
    settings = _reload_settings_module(
        monkeypatch,
        SNAPSHOT_FAST="0",
        LEGO_BASELINE_STATIC="1",
        MACRO_BASELINE_STATIC="1",
    )
    assert settings.snapshot_fast is False
    assert settings.lego_baseline_static is True
    assert settings.macro_baseline_static is True
