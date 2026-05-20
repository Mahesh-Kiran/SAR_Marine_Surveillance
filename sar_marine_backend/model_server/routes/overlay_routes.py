from fastapi import APIRouter, HTTPException
from pathlib import Path
from config import UPLOADS_DIR, OUTPUTS_DIR
from services.overlay_service import generate_detection_overlay
from services.dzi_service import generate_dzi

router = APIRouter()


@router.post("/api/generate_overlay/oilspill/{image_id:path}")
def generate_oilspill_overlay(image_id: str):
    """
    Generates a red detection overlay for a given oil spill image_id.

    The oilspill detector uses the DZI tile folder name as image_id internally,
    so all its output lives under:
      OUTPUTS_DIR/oilspill/{image_id}_files/

    This endpoint:
      - Reads SAR TIFF:   UPLOADS_DIR/oilspill/{image_id}.tiff
      - Reads mask PNG:   OUTPUTS_DIR/oilspill/{image_id}_files/{image_id}_files_oilspill_mask.png
      - Writes overlay:   OUTPUTS_DIR/oilspill/{image_id}_files/{image_id}_overlay.png
      - Writes DZI:       OUTPUTS_DIR/oilspill/{image_id}_overlay  → {image_id}_overlay.dzi

    Served at:  /outputs/oilspill/{image_id}_overlay.dzi
    """
    # ── Build the internal folder name (matches what oilspill_detector uses) ──
    id_folder = f"{image_id}_files"          # e.g. "1779275901133-river oilimage_files"

    # ── Locate input files ────────────────────────────────────────────────────
    sar_path  = Path(UPLOADS_DIR) / "oilspill" / f"{image_id}.tiff"
    mask_path = Path(OUTPUTS_DIR) / "oilspill" / id_folder / f"{id_folder}_oilspill_mask.png"

    if not sar_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"SAR image not found: {sar_path}"
        )

    if not mask_path.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                f"Detection mask not found: {mask_path}. "
                "Run oil spill detection first."
            )
        )

    # ── Output paths ──────────────────────────────────────────────────────────
    #   Save the overlay PNG inside the id_folder so it's grouped with the mask.
    #   Save the overlay DZI at the oilspill root so Node.js can serve it via
    #   the existing /outputs/oilspill static mount.
    overlay_png = Path(OUTPUTS_DIR) / "oilspill" / id_folder / f"{image_id}_overlay.png"
    dzi_prefix  = Path(OUTPUTS_DIR) / "oilspill" / f"{image_id}_overlay"
    # pyvips dzsave("{dzi_prefix}") produces:
    #   {image_id}_overlay.dzi   ← DZI manifest
    #   {image_id}_overlay_files/ ← tile directory

    try:
        # ── Generate overlay PNG ──────────────────────────────────────────────
        overlay_png.parent.mkdir(parents=True, exist_ok=True)
        generate_detection_overlay(
            sar_path=str(sar_path),
            mask_path=str(mask_path),
            overlay_path=str(overlay_png),
            red_alpha=0.5,
            mask_threshold=127,
        )

        # ── Convert overlay PNG → DZI for OpenSeadragon ──────────────────────
        generate_dzi(
            input_path=str(overlay_png),
            output_prefix=str(dzi_prefix),
            tile_size=256,
        )

        return {
            "message": "Overlay generated successfully",
            # URL path served by Node.js /outputs/oilspill static route
            "overlay_url": f"/outputs/oilspill/{image_id}_overlay.dzi",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
