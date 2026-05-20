# SAR Marine Surveillance System 🌊🚢

> **The Problem:** Ocean pollution and maritime security are critical global challenges. Every day, illegal fishing vessels go untracked and oil spills devastate marine ecosystems. Manually scanning massive, gigapixel satellite images for these anomalies is like finding a needle in a haystack—it's slow, exhausting, and prone to human error. 
> 
> **The Solution:** What if AI could scan these vast oceans in seconds? That’s exactly what this project does. We built a deep learning platform that automatically analyzes high-resolution SAR (Synthetic Aperture Radar) satellite imagery to detect ships and outline oil spills instantly.

This project is a comprehensive maritime surveillance platform built as a final year project by Team-12 (E. Shiva Prasad Reddy & C. Mahesh Kiran).

---

## 🏗 System Architecture

![SAR Marine Surveillance System Architecture](./Architecture.jpeg)

The system is designed across three highly decoupled layers to handle massive image processing efficiently:
1. **React Frontend**: An interactive, high-performance UI featuring DeepZoom viewing (via OpenSeadragon) to smoothly pan and zoom across gigapixel images without crashing your browser.
2. **Node.js API Server**: A secure intermediary that handles Firebase authentication, job queuing, and MongoDB storage, ensuring the ML backend is never overwhelmed.
3. **Python ML Backend**: A FastAPI service powering two distinct AI pipelines (Deformable DETR for ships, TransUNet for oil spills), generating image tiles via `pyvips`, and returning real-time bounding boxes and segmentation masks.

---

## ✨ Key Features

- **Ship Detection**: Powered by **Deformable DETR** with a ResNet-50 backbone. By using deformable self-attention, the model focuses only on key sampling points instead of the whole image, delivering highly accurate bounding boxes even in complex sea clutter.
- **Oil Spill Detection**: Powered by **TransUNet**, merging the spatial feature extraction of a U-Net (CNN) with the long-range global context of a Transformer. It outputs precise pixel-level segmentation masks of irregular oil spills.
- **Deep Zoom Viewer**: SAR images are enormous. We slice them into Deep Zoom Images (DZI) on the fly, allowing you to explore them just like Google Maps.
- **Dual/Triple Panel Sync**: Compare the original satellite image side-by-side with the AI detection mask and a blended red-overlay mask. Pan or zoom in one panel, and the others follow perfectly.
- **Authentication**: Fully secured with Firebase Auth (Email & Phone login).

---

## 📊 Datasets & Model Details

As detailed in our research, the models were trained on specialized SAR maritime datasets:

- **Ship Detection Dataset**: 
  - A combined dataset sourced from **HRSID** and **OPEN-SSDD**.
  - Contains **6,735 SAR images** with **17,708 labeled ships** (instance annotations).
  - Preprocessed and resized to 640×640, formatted in COCO for ML compatibility.
  - Utilizes a strict, balanced **70-20-10** (train/val/test) split for fair and reliable evaluation.
  
- **Oil Spill Detection Dataset**: 
  - Sourced from **ALOS** and **Sentinel-1A** satellites covering real-world ocean spill incidents.
  - Features precise pixel-level segmentation masks perfect for our TransUNet architecture.
  - Enhanced with data augmentation (cropping, rotation, noise) for environmental robustness.

*(Curious about the math? Check out the `research_papers/` folder in this repo where we've uploaded the core research PDFs behind these architectures!)*

---

## 🚀 Getting Started

### Prerequisites
- Docker Desktop
- Node.js 18+
- Python 3.11+
- MongoDB

### 1. Environment Setup

```bash
# Frontend environment
cp sar-fe/.env.example sar-fe/.env
# Edit sar-fe/.env with your Firebase keys

# Backend environment
cp sar_marine_backend/.env.example sar_marine_backend/.env
# Edit sar_marine_backend/.env with your MongoDB URI
```

### 2. Run the ML Backend (Docker)

To process huge files safely, the Python ML container mounts a shared volume with the host. This allows the Node.js server to upload a file, and the ML container to read it and spit out tiles.

```powershell
# CPU Mode
docker run -p 8000:8000 `
  -v "${PWD}\sar_marine_backend\shared:/app/shared" `
  maheshkiran/sar-model-backend

# GPU Mode (CUDA 12.1)
docker run --gpus all -p 8000:8000 `
  -v "${PWD}\sar_marine_backend\shared:/app/shared" `
  maheshkiran/sar-model-backend
```

### 3. Run the Node.js API Server

```bash
cd sar_marine_backend/server
npm install
npm start
```

### 4. Run the React Frontend

```bash
cd sar-fe
npm install
npm run dev
```

Visit `http://localhost:5173` to start scanning the oceans!

---
*Developed by Team-12 — E. Shiva Prasad Reddy & C. Mahesh Kiran, KMIT*
