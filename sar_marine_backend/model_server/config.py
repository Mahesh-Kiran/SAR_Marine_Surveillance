from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOADS_DIR = Path(os.getenv('UPLOADS_DIR', BASE_DIR / "shared/uploads"))
TILES_DIR = Path(os.getenv('TILES_DIR', BASE_DIR / "shared/tiles"))
OUTPUTS_DIR = Path(os.getenv('OUTPUTS_DIR', BASE_DIR / "shared/outputs"))

# Paths to models
SHIP_MODEL_PATH = Path(os.getenv('SHIP_MODEL_PATH', BASE_DIR / "model_server/models"))
OILSPILL_MODEL_PATH = Path(os.getenv('OILSPILL_MODEL_PATH', BASE_DIR / "model_server/models/oil_spill.pth"))
