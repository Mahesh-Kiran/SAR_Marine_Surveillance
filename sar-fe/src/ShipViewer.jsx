// import React, { useEffect, useRef } from "react";
// import OpenSeadragon from "openseadragon";
// import detections from "../detections.json"; // pixel-based bounding boxes

// const DeepZoomViewer = () => {
//   const viewerRef = useRef(null);

//   useEffect(() => {
//     if (viewerRef.current) return; // prevent double init

//     // ✅ Initialize OpenSeadragon
//     const viewer = OpenSeadragon({
//       id: "osd-viewer",
//       prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
//       tileSources: "http://localhost:8000/tiles/output.dzi", // adjust to your dzi path
//       showNavigator: true,
//       visibilityRatio: 1,
//     });

//     viewerRef.current = viewer;

//     // ✅ When image is ready, add overlays
//     viewer.addHandler("open", () => {
//       const image = viewer.world.getItemAt(0);
//       const imgWidth = image.getContentSize().x;
//       const imgHeight = image.getContentSize().y;

//       console.log("Image size:", imgWidth, imgHeight); // should be 24000 × 16000

//       detections.forEach((b, idx) => {
//         const elt = document.createElement("div");
//         elt.className = "bounding-box";
//         elt.style.border = "0.2px solid red";
//         // elt.style.background = "rgba(255,0,0,0.2)";
//         elt.title = `${b.label} (${(b.score * 100).toFixed(1)}%)`;

//         // ⚡ Convert absolute pixels → image coordinate system
//         // const normX = b.x / imgWidth;
//         // const normY = b.y / imgHeight;
//         // const normW = b.w / imgWidth;
//         // const normH = b.h / imgHeight;

//         const rect = viewer.viewport.imageToViewportRectangle(
//           new OpenSeadragon.Rect(b.x, b.y, b.w, b.h)
//         );


//         viewer.addOverlay({
//           element: elt,
//           location: rect,
//         });
//       });
//     });

//     return () => {
//       if (viewerRef.current) {
//         viewerRef.current.destroy();
//         viewerRef.current = null;
//       }
//     };
//   }, []);

//   return (
//     <div>
//       <div
//         id="osd-viewer"
//         style={{ width: "50%", height: "90vh", background: "black" }}
//       />
//       <style>{`
//         .bounding-box {
//           pointer-events: none; /* allow pan/zoom */
//           box-sizing: border-box;
//           position: absolute;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default DeepZoomViewer;

// import React, { useEffect, useRef } from "react";
// import OpenSeadragon from "openseadragon";
// import detections from "../detections.json"; // pixel-based bounding boxes

// const DeepZoomViewer = () => {
//   const viewerRef = useRef(null);

//   useEffect(() => {
//     if (viewerRef.current) return; // prevent double init

//     // Initialize OpenSeadragon
//     const viewer = OpenSeadragon({
//       id: "osd-viewer",
//       prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
//       tileSources: "http://localhost:8000/tiles/output.dzi", // adjust to your dzi path
//       showNavigator: false, // disable navigator
//       visibilityRatio: 1.0, // ensure entire image is visible
//       constrainDuringPan: true, // prevent panning outside image
//       minZoomLevel: 0, // allow zooming out to fit
//       defaultZoomLevel: 0, // start zoomed to fit
//       maxZoomLevel: 10, // adjust if needed
//       animationTime: 0, // immediate transitions
//       showNavigationControl: false, // hide zoom controls
//       wrapHorizontal: false, // prevent wrapping
//       wrapVertical: false, // prevent wrapping
//     });

//     viewerRef.current = viewer;

//     // When image is loaded, fit viewport to image and add overlays
//     viewer.addHandler("open", () => {
//       const image = viewer.world.getItemAt(0);
//       const imgWidth = image.getContentSize().x;
//       const imgHeight = image.getContentSize().y;

//       console.log("Image size:", imgWidth, imgHeight); // 24000 × 16000

//       // Calculate image aspect ratio
//       const aspectRatio = imgHeight / imgWidth; // 0.6667

//       // Get container dimensions
//       const container = viewer.container;
//       const containerWidth = container.clientWidth;
//       const containerHeight = container.clientHeight;
//       console.log("Container size:", containerWidth, containerHeight); // 916 × 657

//       // Fit viewport to match container, respecting image aspect ratio
//       const containerAspectRatio = containerHeight / containerWidth;
//       let bounds;
//       if (containerAspectRatio > aspectRatio) {
//         // Container is taller than image: fit to width, adjust height
//         const adjustedHeight = 1 * (containerHeight / containerWidth) * (imgWidth / imgHeight);
//         bounds = new OpenSeadragon.Rect(0, 0, 1, adjustedHeight);
//       } else {
//         // Container is wider than image: fit to height, adjust width
//         bounds = new OpenSeadragon.Rect(0, 0, 1, aspectRatio);
//       }

//       viewer.viewport.fitBounds(bounds, true); // immediate fit
//       viewer.viewport.zoomTo(viewer.viewport.getMinZoom(), null, true); // ensure min zoom

//       // Add overlays for detections
//       detections.forEach((b, idx) => {
//         const elt = document.createElement("div");
//         elt.className = "bounding-box";
//         elt.style.border = "2px solid red";
//         elt.style.background = "rgba(255,0,0,0.2)";
//         elt.title = `${b.label} (${(b.score * 100).toFixed(1)}%)`;

//         // Convert absolute pixels to normalized image coordinates
//         const normX = b.x / imgWidth;
//         const normY = b.y / imgHeight;
//         const normW = b.w / imgWidth;
//         const normH = b.h / imgHeight;

//         const rect = new OpenSeadragon.Rect(normX, normY, normW, normH);

//         viewer.addOverlay({
//           element: elt,
//           location: rect,
//         });
//       });
//     });

//     // Handle resize to keep image filling viewport
//     const handleResize = () => {
//       if (viewerRef.current) {
//         const image = viewerRef.current.world.getItemAt(0);
//         if (image) {
//           const imgWidth = image.getContentSize().x;
//           const imgHeight = image.getContentSize().y;
//           const aspectRatio = imgHeight / imgWidth;
//           const containerWidth = viewerRef.current.container.clientWidth;
//           const containerHeight = viewerRef.current.container.clientHeight;
//           const containerAspectRatio = containerHeight / containerWidth;

//           let bounds;
//           if (containerAspectRatio > aspectRatio) {
//             const adjustedHeight = 1 * (containerHeight / containerWidth) * (imgWidth / imgHeight);
//             bounds = new OpenSeadragon.Rect(0, 0, 1, adjustedHeight);
//           } else {
//             bounds = new OpenSeadragon.Rect(0, 0, 1, aspectRatio);
//           }

//           viewerRef.current.viewport.fitBounds(bounds, true);
//         }
//       }
//     };

//     window.addEventListener("resize", handleResize);

//     return () => {
//       window.removeEventListener("resize", handleResize);
//       if (viewerRef.current) {
//         viewerRef.current.destroy();
//         viewerRef.current = null;
//       }
//     };
//   }, []);

//   return (
//     <div style={{ width: "100%", height: "90vh", margin: 0, padding: 0 }}>
//       <div
//         id="osd-viewer"
//         style={{ width: "100%", height: "100%", background: "black" }}
//       />
//       <style>{`
//         .bounding-box {
//           pointer-events: none;
//           box-sizing: border-box;
//           position: absolute;
//         }
//         #osd-viewer {
//           width: 100% !important;
//           height: 100% !important;
//           overflow: hidden;
//           position: relative;
//           margin: 0;
//           padding: 0;
//         }
//         body, html {
//           margin: 0;
//           padding: 0;
//           width: 100%;
//           height: 100vh;
//           overflow: hidden;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default DeepZoomViewer;

import React, { useEffect, useRef } from "react";
import OpenSeadragon from "openseadragon";
import detections from "../detections.json"; // bounding boxes in pixel space

const ShipViewer = () => {
  const viewer1Ref = useRef(null);
  const viewer2Ref = useRef(null);

  useEffect(() => {
    if (viewer1Ref.current || viewer2Ref.current) return;

    const viewer1 = OpenSeadragon({
      id: "osd-viewer-1",
      prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
      tileSources: "/output_dzi.dzi", // 🔁 Change if needed
      showNavigator: true,
      visibilityRatio: 1,
    });

    const viewer2 = OpenSeadragon({
      id: "osd-viewer-2",
      prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
      tileSources: "/output_dzi.dzi", // 🔁 Change if needed
      showNavigator: true,
      visibilityRatio: 1,
    });

    viewer1Ref.current = viewer1;
    viewer2Ref.current = viewer2;

    // ✅ Sync viewport transforms
    let isSyncing = false;

    const syncView = (sourceViewer, targetViewer) => {
      if (isSyncing) return;
      isSyncing = true;

      const center = sourceViewer.viewport.getCenter();
      const zoom = sourceViewer.viewport.getZoom();

      targetViewer.viewport.panTo(center);
      targetViewer.viewport.zoomTo(zoom);

      isSyncing = false;
    };

    viewer1.addHandler("viewport-change", () => syncView(viewer1, viewer2));
    viewer2.addHandler("viewport-change", () => syncView(viewer2, viewer1));

    // ✅ Add overlays to viewer1 only
    viewer1.addHandler("open", () => {
      const image = viewer1.world.getItemAt(0);
      const imgWidth = image.getContentSize().x;
      const imgHeight = image.getContentSize().y;

      console.log("Image 1 size:", imgWidth, imgHeight);

      detections.forEach((b, idx) => {
        const elt = document.createElement("div");
        elt.className = "bounding-box";
        elt.style.border = "0.2px solid red";
        elt.title = `${b.label} (${(b.score * 100).toFixed(1)}%)`;

        const rect = viewer1.viewport.imageToViewportRectangle(
          new OpenSeadragon.Rect(b.x, b.y, b.w, b.h)
        );

        viewer1.addOverlay({
          element: elt,
          location: rect,
        });
      });
    });

    return () => {
      if (viewer1Ref.current) {
        viewer1Ref.current.destroy();
        viewer1Ref.current = null;
      }
      if (viewer2Ref.current) {
        viewer2Ref.current.destroy();
        viewer2Ref.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full">
      <div className="mb-4 bg-gray-900/80 border-2 border-gray-600/40 p-4 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300 font-mono text-sm font-bold">
                Detections: {detections.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-400 font-mono text-xs">
                VIEWPORT SYNC ACTIVE
              </span>
            </div>
          </div>
          <div className="text-gray-500 font-mono text-xs">
            {new Date().toISOString().slice(0, 19).replace("T", " ")} UTC
          </div>
        </div>
      </div>
      <div style={{ display: "flex" }}>
        <div
          id="osd-viewer-1"
          style={{ width: "50%", height: "90vh", background: "black" , margin:"2px"}}
        />
        <div
          id="osd-viewer-2"
          style={{ width: "50%", height: "90vh", background: "black", margin:"2px" }}
        />
      </div>
      <style>{`
        .bounding-box {
          pointer-events: none;
          box-sizing: border-box;
          position: absolute;
        }
      `}</style>
    </div>
  );
};

export default ShipViewer;
