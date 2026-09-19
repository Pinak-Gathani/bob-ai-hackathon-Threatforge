from app.config import Settings


def test_cors_allows_vite_5174_origin():
    settings = Settings(cors_origins="http://localhost:5173,http://localhost:5174")

    assert settings.cors_origins_list == [
        "http://localhost:5173",
        "http://localhost:5174",
    ]
