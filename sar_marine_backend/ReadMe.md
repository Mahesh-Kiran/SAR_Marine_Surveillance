# API Documentation for Image Processing and Detection System

This document provides detailed information about the **Node.js** and **Python-based** integrated image processing server. The system manages image uploads, Deep Zoom Image (DZI) generation, and asynchronous detection for **ship** (bounding boxes) and **oil spill** (mask output) imagery. The backend uses **MongoDB** for storing detection results and job statuses.

---

## Base URL

`http://localhost:3000` (configurable via the `PORT` environment variable)

Python processing service: `http://localhost:8000`

---

## 1. Image Upload Routes (`/api/images`)

### POST `/api/images/upload/:type`

Uploads a TIFF image for the specified type (`ship` or `oilspill`).

**Method:** POST
**Path Parameters:**

* `type`: `ship` or `oilspill`

**Body (multipart/form-data):**

* `image`: TIFF image file (`.tif` or `.tiff`)

**Success (201):**

```json
{
  "message": "Image uploaded successfully",
  "type": "ship",
  "file": {
    "imageId": "<unique-image-id>",
    "filename": "<generated-filename>",
    "size": <file-size>,
    "uploadPath": "/uploads/ship/<filename>"
  }
}
```

**Error (400):**

```json
{
  "error": "Invalid upload type" | "Only TIFF files are allowed" | "No file uploaded"
}
```

---

### GET `/api/images/uploads/:type`

Lists all uploaded images for a given type.

**Method:** GET
**Path Parameters:**

* `type`: `ship` or `oilspill`

**Success (200):**

```json
{
  "images": [
    {
      "imageId": "<unique-image-id>",
      "filename": "<filename>",
      "uploadUrl": "/uploads/<type>/<filename>"
    }
  ]
}
```

**Error (400):**

```json
{
  "error": "Invalid image type. Use 'ship' or 'oilspill'."
}
```

---

## 2. DZI Generation Routes (`/api/dzi`)

### POST `/api/dzi/generate/:type/:imageId`

Generates DZI tiles for the specified image. Required before detection.

**Method:** POST
**Path Parameters:**

* `type`: `ship` or `oilspill`
* `imageId`: Unique image identifier

**Success (200):**

```json
{
  "message": "DZI generated successfully",
  "dzi_url": "/tiles/<type>/<imageId>/<imageId>.dzi"
}
```

**Error (400/500):**

```json
{
  "error": "Invalid type or generation failure"
}
```

---

## 3. Detection Routes (`/api/detect`)

Detection is processed **asynchronously**. When initiated, the server immediately returns a job identifier. The detection process is handled by the Python service in the background, and results are reported to the Node.js server via a webhook.

### POST `/api/detect/:type/:imageId`

Initiates detection for a specified image.

**Method:** POST
**Path Parameters:**

* `type`: `ship` or `oilspill`
* `imageId`: Unique image identifier

**Response (202 Accepted):**

```json
{
  "accepted": true,
  "jobId": "<uuid>",
  "message": "ship detection queued"
}
```

**Process:**

1. Node.js stores a job entry in MongoDB with status `queued`.
2. The Python service is triggered asynchronously via `/start_detection`.
3. The Python service performs the detection and posts results to `/api/detect/webhook`.
4. The Node.js server updates the job status to `completed` or `failed`.

---

### POST `/api/detect/webhook`

This endpoint is used internally. The Python service sends detection results to this webhook after background processing.

**Request Body:**

```json
{
  "job_id": "<uuid>",
  "type": "ship",
  "image_id": "<image-id>",
  "detections": [
    {
      "x": 120.5,
      "y": 250.8,
      "w": 42.3,
      "h": 25.1,
      "label": "ship",
      "score": 0.94
    }
  ]
}
```

**Response:**

```json
{ "received": true }
```

**Webhook Logic:**

| Type     | Data Stored                 | detectionsCount      | Description                                              |
| -------- | --------------------------- | -------------------- | -------------------------------------------------------- |
| ship     | Detection + Job collections | Number of detections | Bounding boxes are saved                                 |
| oilspill | Job collection only         | `null`               | Only job status is updated; output mask is saved on disk |

---

### GET `/api/detect/status/:jobId`

Fetches the current status of a detection job.

**Method:** GET
**Path Parameters:**

* `jobId`: Job identifier

**Response (200):**

```json
{
  "jobId": "<uuid>",
  "type": "ship",
  "imageId": "<image-id>",
  "status": "completed",
  "detectionsCount": 12,
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```

**Possible Status Values:**

* `queued`: Job created and waiting for processing
* `running`: Detection process started
* `completed`: Detection finished successfully
* `failed`: Detection failed or could not start

**Example - Failed Job:**

```json
{
  "jobId": "<uuid>",
  "status": "failed",
  "error": "Tile folder not found"
}
```

---

## 4. Static File Routes

| Route                 | Description                            |
| --------------------- | -------------------------------------- |
| `/tiles/ship/*`       | Serves DZI tiles for ship imagery      |
| `/tiles/oilspill/*`   | Serves DZI tiles for oil spill imagery |
| `/outputs/oilspill/*` | Serves oil spill mask outputs and DZIs |

**Example Requests:**

```
GET /outputs/oilspill/<imageId>_oilspill_mask.png
GET /outputs/oilspill/<imageId>.dzi
```

---

## 5. MongoDB Models

### Job Model

Tracks detection job progress and results.

| Field           | Type                                                | Description                       |
| --------------- | --------------------------------------------------- | --------------------------------- |
| jobId           | String                                              | Unique job identifier             |
| type            | String (`ship` or `oilspill`)                       | Detection type                    |
| imageId         | String                                              | Image identifier                  |
| status          | String (`queued`, `running`, `completed`, `failed`) | Current job status                |
| detectionsCount | Number or `null`                                    | Number of detections (ships only) |
| error           | String                                              | Error message (if any)            |
| createdAt       | Date                                                | Timestamp of job creation         |
| updatedAt       | Date                                                | Timestamp of last update          |

### Detection Model

Stores results of ship detections only.

| Field      | Type   | Description                                     |
| ---------- | ------ | ----------------------------------------------- |
| imageId    | String | Associated image ID                             |
| type       | String | Always `ship`                                   |
| detections | Array  | Bounding box results (x, y, w, h, label, score) |

---

## 6. Workflow Summary

1. Upload image → `POST /api/images/upload/:type`
2. Generate DZI → `POST /api/dzi/generate/:type/:imageId`
3. Start detection → `POST /api/detect/:type/:imageId` (returns jobId)
4. Poll job status → `GET /api/detect/status/:jobId`
5. Retrieve results:

   * Ship: Bounding boxes stored in MongoDB
   * Oilspill: Mask available in `/outputs/oilspill/`

---

## 7. Configuration and Environment Variables

The system requires the following environment variables:

```
PYTHON_API_BASE=http://localhost:8000
NODE_BASE=http://localhost:3000
PORT=3000
```

Ensure both Node.js and Python servers are running concurrently for proper operation.
