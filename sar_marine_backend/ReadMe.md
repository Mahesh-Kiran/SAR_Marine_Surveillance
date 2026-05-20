# SAR Marine Surveillance — Backend & ML

This folder contains the heavy lifting of the SAR Marine Surveillance platform. It is split into two distinct services that work together to keep the system fast and responsive.

## The Two-Part Architecture

### 1. Node.js API Server (`/server`)
AI models are resource-heavy and slow. If the frontend talked directly to the Python ML server, the server would quickly get overwhelmed by authentication checks, database queries, and large file uploads. 

Instead, the **Node.js Express Server** acts as a secure bouncer. It:
- Authenticates incoming requests.
- Accepts the massive `.tiff` uploads and saves them to a shared volume.
- Creates a "Job" in MongoDB.
- Triggers the Python API asynchronously and tells the frontend "I'm working on it."
- Serves the final `.dzi` image tiles back to the frontend.

### 2. Python ML Server (`/model_server`)
Written in **FastAPI**, this is a pure number-crunching microservice. It:
- Uses `pyvips` to slice 1GB+ TIFF images into thousands of tiny `256x256` Deep Zoom tiles.
- Runs **Deformable DETR** (ResNet-50) for Ship Detection.
- Runs **TransUNet** for Oil Spill Segmentation.
- Generates a custom red-overlay blend combining the original SAR image with the segmentation mask.

## Setup & Run

### 1. Start the Node.js Server
Requires MongoDB running locally or a MongoDB Atlas URI.
```bash
cd server
npm install
# Ensure you copy .env.example to .env and set your MongoDB URI
npm start
```
Runs on `http://localhost:3000`.

### 2. Start the Python ML Server
Because AI dependencies (CUDA, PyTorch, Transformers) are notoriously difficult to configure across different operating systems, we **strongly recommend** running the Python server via Docker.

```powershell
# Build the image (Make sure you are in the root project folder, not this folder!)
# Use -GPU flag if you have an Nvidia card and want CUDA support.
.\build_and_push.ps1 -GPU

# Run the container, mounting the shared folder so Node and Python can share files
docker run --gpus all -p 8000:8000 `
  -v "${PWD}\shared:/app/shared" `
  maheshkiran/sar-model-backend
```

If you *must* run it locally without Docker:
```bash
cd model_server
pip install -r requirements.txt
uvicorn app:app --port 8000 --reload
```
*(Warning: Installing `pyvips` on Windows natively can be extremely difficult. Use Docker!)*
