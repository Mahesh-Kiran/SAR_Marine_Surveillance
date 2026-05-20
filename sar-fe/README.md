# SAR Marine Surveillance — Frontend

This is the interactive UI for the SAR Marine Surveillance platform. When you're dealing with gigapixel satellite images (often over 1GB in size), standard HTML `<img>` tags will instantly crash your browser's memory. 

To solve this, our frontend uses **OpenSeadragon** to render images exactly like Google Maps does—fetching only the small, specific `.dzi` (Deep Zoom Image) tiles for the exact area and zoom level you're looking at.

## What makes this frontend special?

- **Type-Aware Uploads**: Click "Upload" from the Ship Viewer, and you're locked into Ship Detection. Click it from the Oil Spill Viewer, and you're locked into Oil Spills. No confusion.
- **Synchronized Viewports**: Our Oil Spill viewer features three side-by-side canvases (Original, Mask, and Red Overlay). When you pan or zoom on one, the other two follow along flawlessly.
- **Real-Time Polling**: AI inference takes time. The frontend polls the Node.js backend every 3 seconds to show you live job progress (Queued -> Processing -> Completed).
- **Interactive Annotations**: Ship bounding boxes are drawn dynamically on top of the DeepZoom canvas using coordinate math to map pixel space to viewport space.

## Tech Stack
- **React 18** with **Vite** (Lightning fast HMR)
- **TailwindCSS** + **shadcn/ui** (Clean, modern components)
- **OpenSeadragon** (Gigapixel rendering)
- **Firebase Auth** (Phone & Google Sign-In)
- **React Router DOM** (Client-side routing)

## Setup & Run

### 1. Environment Setup

We've provided a template so you know exactly what keys you need:
```bash
cp .env.example .env
```
Fill in `.env` with your Firebase project credentials. By default, it looks for the Node.js API on `http://localhost:3000`.

### 2. Start the Dev Server

```bash
npm install
npm run dev
```
Open `http://localhost:5173`. 

*(Note: To actually run detections, you must also be running the Node.js backend and the Python ML Docker container. See the [root README](../README.md) for the full stack startup guide).*
