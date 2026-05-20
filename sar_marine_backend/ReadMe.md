# Backend Infrastructure & ML Pipeline

The backend of the SAR Marine Surveillance platform is highly specialized, dividing responsibilities between a Node.js Gateway and a Python Machine Learning microservice. This decoupling ensures that heavy computational workloads do not degrade the overall system's response times.

---

## 🧠 Model Details & Metrics

The Python ML engine utilizes two distinct deep learning architectures to process the Synthetic Aperture Radar (SAR) imagery.

### 1. Ship Detection (Deformable DETR)
- **Architecture**: Detection Transformer (DETR) with a **ResNet-50** backbone.
- **Why it works**: Traditional CNNs struggle with the massive scale variations of ships in vast oceans. Deformable DETR uses deformable self-attention mechanisms to focus computation only on key reference points, drastically improving performance and accuracy.
- **Dataset (SARscope)**: 5,719 SAR images containing 17,708 labeled ship instances (Combines HRSID and OPEN-SSDD sources at 640×640 resolution, VV/VH polarizations).

### 2. Oil Spill Segmentation (TransUNet)
- **Architecture**: Hybrid Vision Transformer + U-Net.
- **Why it works**: Combines the high-resolution spatial feature extraction of a Convolutional Neural Network (U-Net) with the global contextual awareness of Vision Transformers. This is critical for understanding the vast, irregular, and fluid shapes of marine oil spills.
- **Dataset**: 8,070 total oil spill images (256×256 pixels).
  - **Palsar Dataset** (Mexico Gulf): ALOS PALSAR (1270 MHz, 23.62 cm wavelength for better weather penetration). *3,101 train / 776 test.*
  - **Sentinel Dataset** (Persian Gulf): Sentinel-1A (5.405 GHz for higher temporal resolution). *3,354 train / 839 test.*

---

## 📡 API Documentation

### Node.js API Gateway (`/server`)

The Gateway acts as the secure orchestrator. It manages MongoDB persistence and delegates heavy tasks to the Python engine.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/images/upload/:type` | `POST` | Uploads a `.tiff` image to the shared volume. `:type` must be `ship` or `oilspill`. |
| `/api/images/uploads/:type` | `GET` | Retrieves a list of previously uploaded images for the specific type. |
| `/api/detect/:type/:imageId` | `POST` | Initializes a detection job in MongoDB and asynchronously triggers the Python ML API. |
| `/api/detect/status/:jobId` | `GET` | Polls the current status of an AI job (`queued`, `running`, `completed`, `failed`). |
| `/api/detect/webhook` | `POST` | Internal endpoint. The Python ML container hits this when a detection job finishes. |

### Python Machine Learning API (`/model_server`)

The FastAPI engine strictly handles GPU processing. It is internal and should not be exposed to the public web.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/start_detection` | `POST` | Accepts a background task to tile a TIFF via `pyvips`, run inference, and POST results back to the Node webhook. |
| `/api/generate_overlay/oilspill/{image_id}` | `POST` | Generates a composite `.png` blending the original SAR image and the TransUNet mask, then converts it to a `.dzi` for the frontend. |

---

## 🚀 Deployment Instructions

### API Gateway (Node.js)
The Gateway requires an active MongoDB connection.
```bash
cd server
npm install
npm start
```
By default, the API binds to `http://localhost:3000`.

### ML Engine (Python / FastAPI)
You can run the ML engine natively (using your local `dl_env`) or via Docker.

**Method A: Run Locally (Recommended)**
```cmd
cd model_server
conda activate dl_env
uvicorn app:app --port 8000
```
*(When running locally, Node.js will automatically target `localhost:8000` and Python will automatically hit the webhook at `localhost:3000` without any extra configuration).*

**Method B: Run via Docker**
```cmd
docker run --gpus all -p 8000:8000 -v "C:\Users\Mahesh Kiran\KMIT College\Trinetra\A_FINAL SAR\sar_marine_backend\shared:/app/shared" maheshkiran/sar-model-backend
```
*(If using Docker, you MUST add `CALLBACK_URL=http://host.docker.internal:3000/api/detect/webhook` to your Node API's `.env` file!)*
