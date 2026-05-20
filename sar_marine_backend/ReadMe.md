# Backend Infrastructure & ML Pipeline

The backend of the SAR Marine Surveillance platform is highly specialized, dividing responsibilities between a Node.js Gateway and a Python Machine Learning microservice. This decoupling ensures that heavy computational workloads do not degrade the overall system's response times.

## Architecture Breakdown

### 1. Gateway API (`/server`)
The Node.js (Express) server acts as the central orchestrator and security gateway.
- **Role:** Handles client authentication, rate limiting, and business logic.
- **Data Ingestion:** Safely streams massive satellite `.tiff` uploads into a shared Docker volume.
- **Job Orchestration:** Records detection tasks in MongoDB and signals the ML pipeline to begin processing.
- **Asset Delivery:** Serves the highly optimized `.dzi` image tiles back to the client interface.

### 2. ML Inference Engine (`/model_server`)
The Python (FastAPI) service is a dedicated, GPU-accelerated computational node.
- **Image Tiling:** Utilizes the high-performance `pyvips` library to slice raw satellite images into Deep Zoom tiles on demand.
- **Ship Detection:** Executes a Deformable DETR (Detection Transformer) model to map bounding boxes around vessels.
- **Oil Spill Segmentation:** Executes a TransUNet model to perform pixel-perfect segmentation of environmental hazards.
- **Composite Generation:** Automatically blends original SAR imagery with AI masks to create high-contrast analytical overlays.

## Deployment Instructions

### API Gateway (Node.js)
The Gateway requires an active MongoDB connection.
```bash
cd server
npm install
npm start
```
By default, the API binds to `http://localhost:3000`.

### ML Engine (Docker)
Due to the complexity of CUDA drivers, PyTorch dependencies, and the `pyvips` C-library, the ML engine is strictly distributed via Docker.

```bash
# Execute within the root project directory to ensure volume mounting maps correctly.
docker run --gpus all -p 8000:8000 \
  -v "${PWD}\shared:/app/shared" \
  maheshkiran/sar-model-backend:latest
```

*Note: The shared volume mapping (`-v`) is critical. It allows the Node.js Gateway to write an uploaded image to disk, and the Python ML Engine to immediately read, process, and write the tiled output back to the same disk.*
