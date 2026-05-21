# Client Interface — SAR Marine Surveillance

This repository contains the frontend application for the SAR Marine Surveillance platform. Built with React and Vite, it serves as the primary dashboard for maritime operators to upload, analyze, and review gigapixel satellite imagery.

## 🛠 How It Works

The frontend acts as the control room for the entire system. Instead of processing heavy AI loads directly, it relies on asynchronous communication with the backend Node.js API to orchestrate long-running machine learning jobs.

1. **Uploads**: Users upload massive `.tiff` files. The frontend securely pushes these to the Node.js gateway.
2. **Asynchronous Polling**: Once an AI job (like Ship Detection) is triggered, the frontend intelligently polls the Node API for status updates (`Queued` → `Processing` → `Completed`) without freezing the user interface.
3. **Data Retrieval**: Upon completion, the frontend requests the resulting `.dzi` files and geometric annotation data to display to the user.

## 🖼 Image Processing (OpenSeadragon)

Standard web browsers cannot load 1GB+ TIFF images directly into memory without crashing. To solve this, the platform utilizes **Deep Zoom Image (DZI)** technology.

Using `OpenSeadragon`, the frontend does not load the full image. Instead, it fetches only the exact, pre-sliced 256x256 image tiles required for the user's current viewport and zoom level—identical to how modern digital mapping applications (like Google Maps) function. This allows operators to pan and zoom across gigapixel radar imagery with zero lag.

## ✏️ Annotations & Coordinate Mapping

When the ML backend detects a ship, it returns an array of bounding boxes based on the **absolute pixel coordinates** of the original massive TIFF image. 

The frontend uses advanced mathematical mapping to overlay these annotations onto the OpenSeadragon canvas. As the user zooms or pans:
- The React component listens to OpenSeadragon's viewport events.
- It dynamically recalculates the position of the bounding boxes from "Image Pixel Space" to "Web Viewport Space".
- The annotations scale flawlessly in real-time, ensuring the bounding box tightly wraps the detected vessel regardless of the current zoom depth.

## 🤝 Real-Time Collaboration (Multiplayer)

The frontend features "Google Docs style" real-time collaboration for human analysts. Powered by `socket.io-client` via a shared `useCollaboration` React Hook, analysts can:
- **Join Rooms**: Connect to a specific Room ID via WebSockets.
- **Live Sync**: See bounding boxes (rectangles) or oil spill (polygons) drawn by remote colleagues instantly appear on their screen.
- **Attribution**: Every remote annotation is labeled with the specific author's name and assigned a unique color.
- **Export**: When the annotation session is complete, downloading the JSON bundles both local and remote annotations together, ensuring every shape is cryptographically tagged to the analyst who drew it.

## 🔍 Synchronized Multi-Panel Analysis

In critical scenarios like oil spill containment, operators must compare raw radar data against AI segmentations. The interface provides up to three side-by-side viewports:
1. **Original SAR Image**
2. **AI Detection Mask**
3. **Blended Red-Overlay**

These three instances of OpenSeadragon are mathematically synchronized. Panning, rotating, or zooming in one panel instantly triggers a coordinate update in the other two, allowing rapid human validation of AI inferences.

## 🚀 Local Development

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
