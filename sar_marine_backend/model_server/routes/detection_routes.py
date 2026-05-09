from fastapi import APIRouter, HTTPException, BackgroundTasks
from config import TILES_DIR
from services.ship_detector import detect_ships
from services.oilspill_detector import detect_oilspill
from pathlib import Path
import requests
import traceback

router = APIRouter()

@router.post("/detect/dzi/{type}/{image_id}")
def detect_from_dzi(type: str, image_id: str):
    # existing synchronous synchronous detection for clients that want it
    if type not in {"ship", "oilspill"}:
        raise HTTPException(status_code=400, detail="Invalid type. Use 'ship' or 'oilspill'.")

    dzi_folder = TILES_DIR / type / f"{image_id}_files"
    if not dzi_folder.exists():
        raise HTTPException(status_code=404, detail=f"Tile folder not found: {dzi_folder}")

    # Find deepest zoom
    try:
        zoom_levels = [
            int(folder.name) for folder in dzi_folder.iterdir() if folder.is_dir() and folder.name.isdigit()
        ]
        if not zoom_levels:
            raise HTTPException(status_code=500, detail="No zoom level folders found inside tile folder.")
        max_zoom_level = str(max(zoom_levels))
        deepest_tile_path = dzi_folder / max_zoom_level
        if not deepest_tile_path.exists():
            raise HTTPException(status_code=404, detail=f"Deepest zoom level folder not found: {deepest_tile_path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading zoom levels: {str(e)}")

    try:
        if type == "ship":
            results = detect_ships(str(dzi_folder), max_zoom_level)
        else:
            results = detect_oilspill(str(dzi_folder), max_zoom_level)

        return {
            "message": f"{type.capitalize()} DZI detection complete.",
            "count": len(results),
            "detections": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# New endpoint to start background detection and callback when finished
@router.post("/start_detection")
def start_detection(payload: dict, background_tasks: BackgroundTasks):
    """
    Expects JSON payload:
    {
      "type": "ship" | "oilspill",
      "image_id": "<id>",
      "job_id": "<uuid>",
      "callback_url": "http://node-server/.../webhook"
    }
    """
    try:
        type_ = payload.get('type')
        image_id = payload.get('image_id')
        job_id = payload.get('job_id')
        callback_url = payload.get('callback_url')

        if not type_ or type_ not in {"ship", "oilspill"}:
            raise HTTPException(status_code=400, detail="Invalid type. Use 'ship' or 'oilspill'.")
        if not image_id or not job_id or not callback_url:
            raise HTTPException(status_code=400, detail="Missing one of required fields: image_id, job_id, callback_url")

        # schedule background task
        background_tasks.add_task(_run_detection_and_callback, type_, image_id, job_id, callback_url)
        return {"started": True, "job_id": job_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _run_detection_and_callback(type_: str, image_id: str, job_id: str, callback_url: str):
    """
    This function runs in background (FastAPI BackgroundTasks).
    It runs the detection and then POSTs results to callback_url.
    """
    try:
        dzi_folder = TILES_DIR / type_ / f"{image_id}_files"
        if not dzi_folder.exists():
            # send error back to callback anyway
            payload = {
                "job_id": job_id,
                "type": type_,
                "image_id": image_id,
                "error": f"Tile folder not found: {dzi_folder}"
            }
            requests.post(callback_url, json=payload, timeout=15)
            return

        # Find deepest zoom level
        zoom_levels = [
            int(folder.name) for folder in dzi_folder.iterdir() if folder.is_dir() and folder.name.isdigit()
        ]
        if not zoom_levels:
            payload = {
                "job_id": job_id,
                "type": type_,
                "image_id": image_id,
                "error": "No zoom level folders found"
            }
            requests.post(callback_url, json=payload, timeout=15)
            return

        max_zoom_level = str(max(zoom_levels))

        # Run detection
        if type_ == "ship":
            results = detect_ships(str(dzi_folder), max_zoom_level)
        else:
            results = detect_oilspill(str(dzi_folder), max_zoom_level)

        # Prepare payload
        payload = {
            "job_id": job_id,
            "type": type_,
            "image_id": image_id,
            "detections": results
        }

        # Post results to callback_url
        try:
            requests.post(callback_url, json=payload, timeout=30)
        except Exception as post_err:
            # If callback fails, log it (FastAPI logs) and optionally retry logic can be added
            print(f"Failed to post results to callback {callback_url}: {post_err}")
            # Optionally write to file or DB for later retries
    except Exception as e:
        # Unexpected error: send error info to callback
        try:
            payload = {
                "job_id": job_id,
                "type": type_,
                "image_id": image_id,
                "error": "Exception during detection",
                "detail": str(e),
                "trace": traceback.format_exc()
            }
            requests.post(callback_url, json=payload, timeout=15)
        except Exception:
            print("Failed to send error callback; original exception:", traceback.format_exc())
