import numpy as np
from PIL import Image
from pathlib import Path


def generate_detection_overlay(
    sar_path: str,
    mask_path: str,
    overlay_path: str,
    red_alpha: float = 0.5,
    mask_threshold: int = 127,
) -> str:
    """
    Merge a grayscale SAR image with a binary detection mask
    to produce a red-overlay visualization.

    Detected pixels (white in mask) are painted with a red tint over the
    original SAR grayscale, making oil spills stand out clearly.

    Args:
        sar_path       : Path to the input SAR image (TIFF or PNG, grayscale).
        mask_path      : Path to the binary segmentation mask (PNG).
        overlay_path   : Path where the output overlay PNG will be saved.
        red_alpha      : Blending strength for the red color (0.0–1.0).
        mask_threshold : Pixel value cutoff to binarize the mask (0–255).

    Returns:
        str: The path to the saved overlay PNG.
    """
    # ── Load SAR image ────────────────────────────────────────────────────────
    sar_img = Image.open(sar_path).convert("L")
    sar_arr = np.array(sar_img, dtype=np.float32)          # (H, W)

    # ── Load detection mask ───────────────────────────────────────────────────
    mask_img = Image.open(mask_path).convert("L")

    # Resize mask to SAR dimensions if they differ
    if mask_img.size != sar_img.size:
        mask_img = mask_img.resize(sar_img.size, Image.NEAREST)

    mask_arr = np.array(mask_img)

    # ── Build binary detection map ────────────────────────────────────────────
    detected = mask_arr > mask_threshold

    # ── Convert SAR to 3-channel RGB ─────────────────────────────────────────
    sar_rgb = np.stack([sar_arr, sar_arr, sar_arr], axis=2)  # (H, W, 3)

    # ── Apply red overlay on detected pixels ─────────────────────────────────
    overlay = sar_rgb.copy()
    red = np.array([255.0, 0.0, 0.0])
    overlay[detected] = red_alpha * red + (1.0 - red_alpha) * sar_rgb[detected]

    # ── Clip and convert to uint8 ─────────────────────────────────────────────
    overlay = np.clip(overlay, 0, 255).astype(np.uint8)

    # ── Save output ───────────────────────────────────────────────────────────
    Path(overlay_path).parent.mkdir(parents=True, exist_ok=True)
    result_img = Image.fromarray(overlay, mode="RGB")
    result_img.save(overlay_path)

    detected_pct = 100.0 * detected.sum() / detected.size
    print(f"[✓] Overlay saved → {overlay_path}")
    print(f"    Image size   : {sar_img.size[0]}×{sar_img.size[1]} px")
    print(f"    Detected area: {detected.sum():,} px  ({detected_pct:.1f}% of image)")

    return str(overlay_path)
