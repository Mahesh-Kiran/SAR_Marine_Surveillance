import os
from pathlib import Path
import shutil
from PIL import Image
import torch
from services.oilspill_util import VisionTransformer, get_r50_b16_config, ResizeToTensor, predict_single_image  # import your classes
from services.stitch import stitch_predicted_folder
from config import OILSPILL_MODEL_PATH, OUTPUTS_DIR, TILES_DIR
from services.dzi_service import generate_dzi
TILE_SIZE = 256
OVERLAP = 1

# Set up model (load once)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# instantiate config, model
config = get_r50_b16_config()
model = VisionTransformer(config, img_size=(224, 224),  # or whatever your actual input size is
                          num_classes=config.n_classes).to(device)

# load weights
model.load_state_dict(torch.load(str(OILSPILL_MODEL_PATH), map_location=device, weights_only=False))
model.eval()

# transform
transform = ResizeToTensor(size=(224,224))

def detect_oilspill(tile_folder: str, zoom_level: str = "15", image_id: str = None) -> str:
    """
    tile_folder: path to dzi folder (e.g. .../image_id_files)
    zoom_level: subfolder name (e.g. "15")
    image_id: used to name output path under OUTPUTS_DIR
    Returns: filepath to stitched mask image
    """
    zoom_path = Path(tile_folder) / zoom_level
    if not zoom_path.exists():
        raise FileNotFoundError(f"Zoom-level folder not found: {zoom_path}")

    # Make directory to store per-tile predictions
    # e.g. OUTPUTS_DIR / "oilspill" / image_id / "pred_tiles" / zoom_level
    if image_id is None:
        image_id = os.path.basename(tile_folder.rstrip('/\\'))
    pred_tiles_dir = Path(OUTPUTS_DIR) / "oilspill" / image_id / "pred_tiles" / zoom_level
    # Clean existing prediction tiles directory
    if pred_tiles_dir.exists():
        shutil.rmtree(pred_tiles_dir)
    pred_tiles_dir.mkdir(parents=True, exist_ok=True)

    valid_exts = (".jpeg", ".jpg", ".png", ".tiff", ".tif", ".bmp")
    for tile_name in os.listdir(zoom_path):
        if not tile_name.lower().endswith(valid_exts):
            continue
        tile_path = zoom_path / tile_name
        # name without extension
        name, _ = os.path.splitext(tile_name)
        out_mask = pred_tiles_dir / f"{name}_mask.png"
        # call your predict_single_image logic
        predict_single_image(str(tile_path), str(out_mask), model, transform, device)

    # Now stitch predicted tiles
    # Optionally find xml for cropping
    xml_path = None
    # if there's a vips-properties.xml in parent folder
    parent = Path(tile_folder)
    xml_candidate = parent / "vips-properties.xml"
    if xml_candidate.exists():
        xml_path = str(xml_candidate)

    stitched_dir = Path(OUTPUTS_DIR) / "oilspill" / image_id
    stitched_dir.mkdir(parents=True, exist_ok=True)
    stitched_path = stitched_dir / f"{image_id}_oilspill_mask.png"

    stitch_predicted_folder(str(pred_tiles_dir), str(stitched_path), xml_path=xml_path)

    dzi_output_dir = Path(OUTPUTS_DIR) / "oilspill" / image_id
    dzi_output_dir.mkdir(parents=True, exist_ok=True)

    generate_dzi(
        input_path=str(stitched_path),
        output_prefix=str(dzi_output_dir),
        tile_size=256
    )

    return {
        "stitched_mask": str(stitched_path),
        "dzi_path": str(dzi_output_dir),
        "dzi_folder": str(dzi_output_dir / f"{Path(dzi_output_dir).stem}_files")
    }
