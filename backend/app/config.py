import os
from pathlib import Path

# Application Settings
class Settings:
    def __init__(self):
        self.APP_NAME: str = os.getenv("APP_NAME", "ComplaintIQ")
        self.APP_ENV: str = os.getenv("APP_ENV", "development")
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./complaintiq.db")
        self.BASE_DIR: Path = Path(__file__).resolve().parent.parent
        self.MODELS_STORAGE_DIR: Path = Path(os.getenv("MODELS_STORAGE_DIR", str(self.BASE_DIR / "models_storage")))
        self.DATA_DIR: Path = Path(os.getenv("DATA_DIR", str(self.BASE_DIR.parent / "data")))
        self.UPLOAD_MAX_SIZE_MB: int = int(os.getenv("UPLOAD_MAX_SIZE_MB", "100"))
        self.CORS_ORIGINS: list[str] = [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(",")
        ]

        # Analytical thresholds
        self.DEFAULT_SIMILARITY_THRESHOLD: float = float(os.getenv("DEFAULT_SIMILARITY_THRESHOLD", "0.65"))
        self.DEFAULT_EMERGING_GROWTH_THRESHOLD: float = float(os.getenv("DEFAULT_EMERGING_GROWTH_THRESHOLD", "0.4"))
        self.DEFAULT_PRIORITY_VOLUME_WEIGHT: float = float(os.getenv("DEFAULT_PRIORITY_VOLUME_WEIGHT", "0.4"))
        self.DEFAULT_PRIORITY_SEVERITY_WEIGHT: float = float(os.getenv("DEFAULT_PRIORITY_SEVERITY_WEIGHT", "0.3"))
        self.DEFAULT_PRIORITY_GROWTH_WEIGHT: float = float(os.getenv("DEFAULT_PRIORITY_GROWTH_WEIGHT", "0.3"))

        # Ensure storage dirs exist
        self.MODELS_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
