# SAR Marine Surveillance System

## 🌊 Use Case Introduction
Modern maritime monitoring faces significant challenges: millions of square miles of ocean must be surveilled to identify unauthorized vessels and detect ecological disasters such as oil spills. Manual analysis of high-resolution Synthetic Aperture Radar (SAR) imagery is computationally intensive, extremely time-consuming, and prone to human error.

The **SAR Marine Surveillance System** is an enterprise-grade, deep learning-powered platform designed to solve this problem. It automates the analysis of gigapixel satellite images, delivering real-time, highly accurate detection of maritime objects and environmental hazards. This empowers **Coastal Security Agencies** to spot "dark ships" lacking AIS transponders, and **Environmental Protection Teams** to instantly locate oil spills for rapid containment.

---

## 🏗 High-Level Architecture

![SAR Marine Surveillance System Architecture](./Architecture.jpeg)

The platform utilizes a decoupled, three-tier microservice architecture to ensure high availability and responsiveness:
1. **Client Interface (React.js):** The high-performance frontend dashboard utilizing Vite, TailwindCSS, and OpenSeadragon for gigapixel image tiling.
2. **Gateway API (Node.js/Express):** Acts as the secure orchestration layer handling authentication (Firebase), data persistence (MongoDB), and asynchronous job queuing.
3. **Machine Learning Service (Python/FastAPI):** A GPU-accelerated inference engine running the deep learning models, utilizing `pyvips` for on-the-fly image tiling and mask generation.

---

## 🌟 Core Features

### 1. Ship Detection (Deformable DETR)
Detects marine vessels in high-clutter environments. By using a Detection Transformer model, the system draws precise bounding boxes around ships even across massive gigapixel images. This is critical for anti-piracy, border defense, and monitoring illegal fishing.

### 2. Oil Spill Detection (TransUNet)
Generates pixel-perfect segmentation masks outlining environmental hazards. Oil spills spread irregularly due to ocean currents; TransUNet successfully maps these fluid shapes, directing cleanup crews precisely where containment booms are needed.

### 3. Model Validation & Multi-Panel Analysis
AI results must be verified by human experts to ensure the model isn't hallucinating due to radar noise (like a natural oil seep). The interface provides three mathematically synchronized viewports (Original SAR, AI Mask, Blended Overlay). Panning or zooming in one panel instantly updates the others, allowing rapid human validation.

### 4. Interactive Annotations
Users can dynamically view and interact with AI-generated bounding boxes. The system uses advanced coordinate math to map absolute image pixels to dynamic viewport coordinates, ensuring annotations scale flawlessly as the user zooms deeply into the image.

### 5. Model Metrics, Datasets, and Training
Our models were heavily trained on specialized maritime datasets:

**🚢 Ship Detection Dataset (SARscope)**
- **Total Data**: 5,719 SAR images containing 17,708 labeled ship instances.
- **Sources**: Combines HRSID and OPEN-SSDD sources.
- **Specifications**: 640×640 resolution, VV/VH polarizations.

**🛢️ Oil Spill Detection Dataset**
- **Total Data**: 8,070 total oil spill images (256×256 pixels).
- **Sub-Dataset 1 (Palsar Dataset)**: 
  - *Location*: Mexico Gulf oil spill area
  - *Satellite*: ALOS PALSAR (L-band 1270 MHz, wavelength 23.62 cm)
  - *Advantages*: Better penetration through weather
  - *Split*: 3,101 Training images / 776 Test images
- **Sub-Dataset 2 (Sentinel Dataset)**:
  - *Location*: Persian Gulf oil spill area
  - *Satellite*: Sentinel-1A (5.405 GHz)
  - *Advantages*: Higher temporal resolution, free data access
  - *Split*: 3,354 Training images / 839 Test images

*(Check out the `research_papers/` folder in this repo for the complete academic math and metric evaluations behind these architectures).*

---

## 🚀 Deployment & Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.11+) + CUDA (if running locally via `dl_env`)
- Docker Desktop (Optional, for containerized ML backend)
- MongoDB 

### 1. Configuration
Securely configure your environment variables using the provided templates:
```bash
cp sar-fe/.env.example sar-fe/.env
cp sar_marine_backend/.env.example sar_marine_backend/.env
```
*(Your `.env` files contain sensitive credentials and are safely ignored by git).*

### 2. Start the Machine Learning Engine (Choose one method)

#### Method A: Local GPU Execution via your custom `dl_env` (Recommended for Local Dev)
If you have your local Python virtual environment (`dl_env`) pre-configured with PyTorch and CUDA:
```cmd
cd sar_marine_backend\model_server
# Activate your environment
conda activate dl_env
# Start the server
uvicorn app:app --port 8000
```

#### Method B: Containerized Execution (Docker)
If you prefer not to manage local Python dependencies, use the pre-built Docker container:
```cmd
docker run --gpus all -p 8000:8000 -v "C:\Users\Mahesh Kiran\KMIT College\Trinetra\A_FINAL SAR\sar_marine_backend\shared:/app/shared" maheshkiran/sar-model-backend
```
*(⚠️ **CRITICAL**: If you run the Python backend via Docker, you MUST add `CALLBACK_URL=http://host.docker.internal:3000/api/detect/webhook` to your Node API's `.env` file so the Docker container can communicate back to your local Node server!)*

### 3. Start the API Gateway
Start the Node.js orchestration server:
```bash
cd sar_marine_backend/server
npm install
npm start
```

### 4. Start the Client Application
Start the frontend interface:
```bash
cd sar-fe
npm install
npm run dev
```
Navigate to `http://localhost:5173` to access the surveillance dashboard.
