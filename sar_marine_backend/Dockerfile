# ============================================
# SAR Model Backend - Docker Build
# FastAPI + PyTorch (CUDA 12.1) + pyvips
# Image: maheshkiran/sar-model-backend
#
# Build (CPU-only, smaller image):
#   docker build -t maheshkiran/sar-model-backend .
#
# Build (GPU/CUDA - recommended for production):
#   docker build --build-arg TORCH_INDEX=https://download.pytorch.org/whl/cu121 \
#                -t maheshkiran/sar-model-backend .
#
# Run (CPU):
#   docker run -p 8000:8000 \
#     -v "%cd%\shared:/app/shared" \
#     maheshkiran/sar-model-backend
#
# Run (GPU):
#   docker run --gpus all -p 8000:8000 \
#     -v "%cd%\shared:/app/shared" \
#     maheshkiran/sar-model-backend
#
# Push:
#   docker push maheshkiran/sar-model-backend:latest
# ============================================

# ── Stage 1: Builder — compile native deps, install packages ─────────────────
FROM python:3.11-slim AS builder

# Install build-only system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips-dev \
    libvips-tools \
    libglib2.0-0 \
    libexpat1 \
    wget \
    build-essential \
    python3-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies first (cache layer)
COPY model_server/requirements.txt ./

# PyTorch index URL — default CPU, override with --build-arg for CUDA
ARG TORCH_INDEX=https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

RUN pip install --no-cache-dir \
    torch torchvision --index-url ${TORCH_INDEX}

RUN pip install --no-cache-dir \
    transformers \
    numpy \
    Pillow \
    requests \
    scipy

# ── Stage 2: Runtime — lean final image ──────────────────────────────────────
FROM python:3.11-slim AS runtime

# Install only the runtime system libs (no compilers or headers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips42 \
    libglib2.0-0 \
    libexpat1 \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed Python packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy model server source code
COPY model_server/ ./model_server/

# Copy ML model weights
COPY model_server/models/ ./model_server/models/

# shared/ is mounted at runtime via -v flag — do NOT bake it into the image.
# This allows the Node.js server and ML backend to share the same filesystem.
# The directories are created here so the container starts cleanly even
# if no volume is mounted (useful for isolated testing).
RUN mkdir -p shared/uploads/ship shared/uploads/oilspill \
             shared/tiles/ship shared/tiles/oilspill \
             shared/outputs/oilspill

# Environment variables (can be overridden at runtime with -e)
ENV UPLOADS_DIR=/app/shared/uploads
ENV TILES_DIR=/app/shared/tiles
ENV OUTPUTS_DIR=/app/shared/outputs
ENV SHIP_MODEL_PATH=/app/model_server/models
ENV OILSPILL_MODEL_PATH=/app/model_server/models/oil_spill.pth

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/docs || exit 1

WORKDIR /app/model_server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
