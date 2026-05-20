# Client Interface

This repository contains the frontend application for the SAR Marine Surveillance platform. Built with React and Vite, it serves as the primary dashboard for maritime operators to upload, analyze, and review gigapixel satellite imagery.

## Real-Time Capabilities

Standard web browsers cannot load 1GB+ TIFF images directly into memory without crashing. To solve this, the platform dynamically generates and streams **Deep Zoom Images (DZI)**. Using `OpenSeadragon`, the frontend fetches only the exact image tiles required for the user's current viewport and zoom level—identical to how modern digital mapping applications function.

## Key Features

- **Context-Aware Workspaces**: Dedicated, isolated environments for Ship Detection and Oil Spill Detection. Uploads are strictly mapped to their respective AI pipelines to prevent data contamination.
- **Synchronized Multi-Panel Analysis**: In critical scenarios like oil spill containment, operators must compare raw radar data against AI segmentations. The interface provides up to three side-by-side viewports (Original SAR, AI Mask, Blended Overlay) that are mathematically synchronized; panning or zooming in one panel instantly updates the others.
- **Asynchronous Job Tracking**: The client maintains a lightweight polling mechanism with the Gateway API, providing operators with real-time feedback on AI inference jobs without requiring WebSocket overhead.
- **Dynamic Coordinate Mapping**: AI-generated bounding boxes are dynamically translated from absolute image pixel coordinates into dynamic viewport coordinates, scaling flawlessly as the user zooms in on a target vessel.

## Technology Stack

- **Core**: React 18, Vite
- **Styling**: TailwindCSS, shadcn/ui
- **Image Processing Engine**: OpenSeadragon
- **Authentication**: Firebase (Secure Identity Management)

## Local Development

1. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```
   Provide your specific Firebase credentials and API endpoints inside `.env`.

2. **Run the Application:**
   ```bash
   npm install
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.
