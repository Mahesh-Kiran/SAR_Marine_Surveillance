import os
import torch
from PIL import Image
from transformers import DeformableDetrForObjectDetection, DeformableDetrImageProcessor
import torchvision.ops as ops
from config import SHIP_MODEL_PATH

TILE_SIZE = 512
OVERLAP = 1
SCORE_THRESHOLD = 0.5
IOU_THRESHOLD = 0.5
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Load model once globally
model = DeformableDetrForObjectDetection.from_pretrained(SHIP_MODEL_PATH).to(DEVICE)
processor = DeformableDetrImageProcessor.from_pretrained(SHIP_MODEL_PATH)
model.eval()
id2label = model.config.id2label if hasattr(model.config, 'id2label') else {0: "object"}


def detect_ships(tile_folder: str, zoom_level: str = "15") -> list:
    zoom_path = os.path.join(tile_folder, zoom_level)
    detections = []
    for tile_file in os.listdir(zoom_path):
        if not tile_file.endswith(".jpeg"):
            continue

        x_str, y_str = tile_file.replace(".jpeg", "").split("_")
        x_idx, y_idx = int(x_str), int(y_str)

        tile_path = os.path.join(zoom_path, tile_file)
        tile_img = Image.open(tile_path).convert("RGB")
        full_w, full_h = tile_img.size

        content_w = full_w - 2 * OVERLAP
        content_h = full_h - 2 * OVERLAP

        offset_x = x_idx * TILE_SIZE - (OVERLAP if x_idx > 0 else 0)
        offset_y = y_idx * TILE_SIZE - (OVERLAP if y_idx > 0 else 0)

        tile_detections = detect_on_tile(tile_img, (offset_x, offset_y), content_w, content_h)
        detections.extend(tile_detections)

    return apply_nms(detections)


def detect_on_tile(tile_img, offset, content_w, content_h):
    inputs = processor(images=tile_img, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        outputs = model(**inputs)

    target_sizes = torch.tensor([[tile_img.size[1], tile_img.size[0]]]).to(DEVICE)
    results = processor.post_process_object_detection(outputs, threshold=SCORE_THRESHOLD, target_sizes=target_sizes)[0]

    detections = []
    for box, label, score in zip(results["boxes"], results["labels"], results["scores"]):
        x1, y1, x2, y2 = box.tolist()

        if x1 < OVERLAP or y1 < OVERLAP or x2 > OVERLAP + content_w or y2 > OVERLAP + content_h:
            continue

        global_x = offset[0] + (x1 - OVERLAP)
        global_y = offset[1] + (y1 - OVERLAP)

        detections.append({
            "x": global_x,
            "y": global_y,
            "w": x2 - x1,
            "h": y2 - y1,
            "label": id2label.get(int(label), str(label)),
            "score": score.item()
        })

    return detections


def apply_nms(detections):
    if not detections:
        return []

    boxes = torch.tensor([[d["x"], d["y"], d["x"] + d["w"], d["y"] + d["h"]] for d in detections])
    scores = torch.tensor([d["score"] for d in detections])
    keep = ops.nms(boxes, scores, IOU_THRESHOLD)
    return [detections[i] for i in keep]
