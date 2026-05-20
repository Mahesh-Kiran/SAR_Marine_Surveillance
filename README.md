# SAR Marine Surveillance System

Modern maritime monitoring faces significant challenges: millions of square miles of ocean must be surveilled to identify unauthorized vessels and detect ecological disasters such as oil spills. Manual analysis of high-resolution Synthetic Aperture Radar (SAR) imagery is computationally intensive, extremely time-consuming, and prone to human error.

The **SAR Marine Surveillance System** is an enterprise-grade, deep learning-powered platform designed to solve this problem. It automates the analysis of gigapixel satellite images, delivering real-time, highly accurate detection of maritime objects and environmental hazards.

## Real-World Applications

- **Environmental Protection & Disaster Response:** Rapidly identifies the precise boundaries of marine oil spills, enabling immediate containment and cleanup efforts before irreversible ecological damage occurs.
- **Coastal Security & Defense:** Detects unauthorized or illegal vessels (dark ships) that may have disabled their AIS tracking, supporting border security and anti-piracy operations.
- **Maritime Traffic Management:** Automates the tracking of shipping lanes and port congestion using constant SAR satellite feeds, regardless of weather or daylight conditions.

---

## High-Level Architecture

![SAR Marine Surveillance System Architecture](./Architecture.jpeg)

The platform utilizes a decoupled, three-tier microservice architecture to ensure high availability and responsiveness when processing massive datasets:

1. **Client Interface (React.js):** A high-performance web application utilizing Deep Zoom Image (DZI) technology to render gigapixel SAR images flawlessly in the browser. 
2. **Gateway API (Node.js):** Acts as the secure orchestration layer. It handles user authentication, data persistence (MongoDB), and job queuing, ensuring the heavy ML workloads do not block user interactions.
3. **Machine Learning Service (Python/FastAPI):** A GPU-accelerated inference engine running advanced state-of-the-art neural networks. It automatically generates image tiles via `pyvips` and processes them through the detection models.

---

## Artificial Intelligence Models

- **Ship Detection (Deformable DETR):** Utilizes a Detection Transformer with a ResNet-50 backbone. By employing deformable self-attention mechanisms, it focuses computation on key object reference points, resulting in highly accurate bounding box predictions even within severe sea clutter.
- **Oil Spill Segmentation (TransUNet):** Combines the granular spatial feature extraction of a Convolutional Neural Network (U-Net) with the global contextual awareness of Vision Transformers. This hybrid architecture excels at outlining the complex, irregular boundaries of oil slicks at a pixel-perfect level.

---

## Deployment & Setup

### Prerequisites
- Docker & Docker Compose
- Node.js (v18+)
- Python (v3.11+)
- MongoDB 

### 1. Configuration
Securely configure your environment variables using the provided templates:
```bash
cp sar-fe/.env.example sar-fe/.env
cp sar_marine_backend/.env.example sar_marine_backend/.env
```
*Note: Your `.env` files contain sensitive credentials and are safely ignored by git.*

### 2. ML Inference Engine (Docker)
The Python ML service is containerized for cross-platform compatibility and seamless GPU allocation. It mounts a shared storage volume to exchange large `.tiff` uploads and `.dzi` outputs with the Node.js API.

```bash
# Start the ML Backend with GPU acceleration (CUDA 12.1)
docker run --gpus all -p 8000:8000 -v "${PWD}\sar_marine_backend\shared:/app/shared" maheshkiran/sar-model-backend
```

### 3. API Gateway
Start the Node.js orchestration server:
```bash
cd sar_marine_backend/server
npm install
npm start
```

### 4. Client Application
Start the frontend interface:
```bash
cd sar-fe
npm install
npm run dev
```
Navigate to `http://localhost:5173` to access the surveillance dashboard.
