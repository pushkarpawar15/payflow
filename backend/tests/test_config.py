from app.config import Settings


def test_settings_parse_contract_environment(monkeypatch) -> None:
    monkeypatch.setenv("PAYFLOW_STORAGE_BACKEND", "firestore")
    monkeypatch.setenv("PAYFLOW_SEED_DATA", "true")
    monkeypatch.setenv("PAYFLOW_CORS_ORIGINS", " https://one.test/,https://two.test ")
    monkeypatch.setenv("PAYFLOW_LOG_LEVEL", " warning ")
    monkeypatch.setenv("FIRESTORE_DATABASE", "(default)")
    settings = Settings(_env_file=None)
    assert settings.storage_backend == "firestore"
    assert settings.should_seed is True
    assert settings.allowed_origins == ["https://one.test", "https://two.test"]
    assert settings.log_level == "WARNING"


def test_seed_default_depends_on_storage_backend(monkeypatch) -> None:
    monkeypatch.delenv("PAYFLOW_STORAGE_BACKEND", raising=False)
    monkeypatch.delenv("PAYFLOW_SEED_DATA", raising=False)
    assert Settings(_env_file=None).should_seed is True
    monkeypatch.setenv("PAYFLOW_STORAGE_BACKEND", "firestore")
    assert Settings(_env_file=None).should_seed is False
