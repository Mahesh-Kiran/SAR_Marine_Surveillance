from fastapi import APIRouter
from services.dzi_service import generate_dzi
from config import UPLOADS_DIR, TILES_DIR
from pathlib import Path

router = APIRouter()

ALLOWED_TYPES = {"ship", "oilspill"}

@router.post("/api/generate_dzi/{type}/{image_id}")
def dzi_endpoint(type: str, image_id: str):
    if type not in ALLOWED_TYPES:
        return {"error": f"Invalid type: {type}. Must be 'ship' or 'oilspill'."}

    input_path = UPLOADS_DIR / type / f"{image_id}.tiff"
    output_dir = TILES_DIR / type
    output_dir.mkdir(parents=True, exist_ok=True)

    if not input_path.exists():
        return {"error": f"Image '{input_path}' not found"}

    try:
        # Use tile_size 512 for ship, 256 otherwise
        tile_size = 512 if type == "ship" else 256

        # Save as tiles/type/imageId/imageId.dzi
        generate_dzi(input_path, output_dir / image_id, tile_size=tile_size)

        return {
            "message": "DZI generated successfully",
            "dzi_url": f"/tiles/{type}/{image_id}.dzi"
        }

    except Exception as e:
        return {"error": str(e)}
