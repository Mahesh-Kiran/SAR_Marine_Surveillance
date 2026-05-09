
import React, { useEffect, useRef, useState } from "react";
import OpenSeadragon from "openseadragon";
import { createOSDAnnotator } from '@annotorious/openseadragon';
import '@annotorious/openseadragon/annotorious-openseadragon.css';
import detections from "../detections.json";

const DeepZoomViewer = () => {
  const viewer1Ref = useRef(null);
  const viewer2Ref = useRef(null);
  const osdViewer1 = useRef(null);
  const osdViewer2 = useRef(null);
  const annotatorRef = useRef(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentTool, setCurrentTool] = useState('rectangle');
  const [annotationCount, setAnnotationCount] = useState(0);
  const [savedAnnotations, setSavedAnnotations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Add this new useEffect hook to your component
  useEffect(() => {
    // Check if the viewer is ready before trying to draw
    if (osdViewer1.current && osdViewer1.current.isOpen()) {
      console.log('State changed, redrawing overlays...');

      // Redraw ALL overlays to ensure everything is up to date
      osdViewer1.current.clearOverlays();
      addDetectionOverlays(); // Redraws the red boxes
      addSavedAnnotationOverlays(); // Redraws the green boxes with the NEW data
    }
  }, [savedAnnotations]); // <-- The hook's dependency: it runs ONLY when 'savedAnnotations' changes
  useEffect(() => {
    initializeViewers();
    return () => {
      cleanupViewers();
    };
  }, []);

  const initializeViewers = () => {
    if (osdViewer1.current || osdViewer2.current) return;

    // Initialize Viewer 1 (with detections and annotations)
    osdViewer1.current = OpenSeadragon({
      element: viewer1Ref.current,
      id: "osd-viewer-1",
      prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/",
      tileSources: "http://localhost:8000/tiles/output.dzi",
      showNavigator: true,
      showNavigationControl: true,
      navigationControlAnchor: OpenSeadragon.ControlAnchor.TOP_LEFT,
      visibilityRatio: 1,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true,
        dragToPan: true,
        scrollToZoom: true,
        pinchToZoom: true
      },
      gestureSettingsTouch: {
        clickToZoom: false,
        dblClickToZoom: true,
        dragToPan: true,
        scrollToZoom: true,
        pinchToZoom: true
      }
    });

    // Initialize Viewer 2 (plain view)
    osdViewer2.current = OpenSeadragon({
      element: viewer2Ref.current,
      id: "osd-viewer-2",
      prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/",
      tileSources: "http://localhost:8000/tiles/output.dzi",
      showNavigator: true,
      showNavigationControl: true,
      navigationControlAnchor: OpenSeadragon.ControlAnchor.TOP_LEFT,
      visibilityRatio: 1,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true,
        dragToPan: true,
        scrollToZoom: true,
        pinchToZoom: true
      }
    });

    setupViewportSync();

    // When viewer 1 is ready, add detection overlays
    osdViewer1.current.addHandler("open", () => {
      addDetectionOverlays();
      addSavedAnnotationOverlays();
    });

    // Viewer 2 will get the annotation functionality
    osdViewer2.current.addHandler("open", () => {
      initializeAnnotations();
    });
  };

  const setupViewportSync = () => {
    let isSyncing = false;

    const syncView = (sourceViewer, targetViewer) => {
      if (isSyncing) return;
      isSyncing = true;

      const center = sourceViewer.viewport.getCenter();
      const zoom = sourceViewer.viewport.getZoom();

      targetViewer.viewport.panTo(center, true);
      targetViewer.viewport.zoomTo(zoom, null, true);

      isSyncing = false;
    };

    osdViewer1.current.addHandler("viewport-change", () =>
      syncView(osdViewer1.current, osdViewer2.current)
    );
    osdViewer2.current.addHandler("viewport-change", () =>
      syncView(osdViewer2.current, osdViewer1.current)
    );
  };

  const addDetectionOverlays = () => {
    const image = osdViewer1.current.world.getItemAt(0);
    console.log("Image size:", image.getContentSize());

    // Add red detection boxes
    detections.forEach((b, idx) => {
      const elt = document.createElement("div");
      elt.className = "detection-box";
      elt.style.border = "1px solid red";
      elt.style.background = "rgba(255, 0, 0, 0.2)";
      elt.style.pointerEvents = "none";
      elt.style.boxSizing = "border-box";
      elt.title = `${b.label} (${(b.score * 100).toFixed(1)}%)`;

      const rect = osdViewer1.current.viewport.imageToViewportRectangle(
        new OpenSeadragon.Rect(b.x, b.y, b.w, b.h)
      );

      osdViewer1.current.addOverlay({
        element: elt,
        location: rect,
        placement: OpenSeadragon.Placement.TOP_LEFT
      });
    });
  };

  const addSavedAnnotationOverlays = () => {
    if (!osdViewer1.current || savedAnnotations.length === 0) return;

    savedAnnotations.forEach((annotation, idx) => {
      const elt = document.createElement("div");
      elt.className = "saved-annotation-box";
      elt.style.border = "1px solid lime";
      elt.style.background = "rgba(0, 255, 0, 0.15)";
      elt.style.pointerEvents = "none";
      elt.style.boxSizing = "border-box";
      elt.title = `Manual Annotation: ${annotation.label} (${(annotation.score * 100).toFixed(1)}%)`;

      const rect = osdViewer1.current.viewport.imageToViewportRectangle(
        new OpenSeadragon.Rect(annotation.x, annotation.y, annotation.w, annotation.h)
      );

      osdViewer1.current.addOverlay({
        element: elt,
        location: rect,
        placement: OpenSeadragon.Placement.TOP_LEFT
      });
    });
  };

  const initializeAnnotations = () => {
    annotatorRef.current = createOSDAnnotator(osdViewer2.current, {
      drawingEnabled: false,
      drawingMode: 'drag',
      autoSave: false,
      style: {
        stroke: '#00ff00',
        strokeWidth: 1,
        fill: 'rgba(0, 255, 0, 0.15)'
      }
    });

    console.log("✓ Annotorious initialized on viewer 2");
    annotatorRef.current.setDrawingTool('rectangle');

    const updateCount = () => {
      const annotations = annotatorRef.current.getAnnotations();
      setAnnotationCount(annotations.length);
    };

    annotatorRef.current.on('createAnnotation', updateCount);
    annotatorRef.current.on('deleteAnnotation', updateCount);
  };

  const toggleDrawingMode = () => {
    if (annotatorRef.current && osdViewer2.current) {
      const newState = !isDrawingMode;

      annotatorRef.current.setDrawingEnabled(newState);
      osdViewer2.current.setMouseNavEnabled(!newState);

      setIsDrawingMode(newState);
      console.log(`Drawing mode: ${newState ? 'ON' : 'OFF'}`);
    }
  };

  const handleToolChange = (tool) => {
    if (annotatorRef.current) {
      annotatorRef.current.setDrawingTool(tool);
      setCurrentTool(tool);
      console.log(`Switched to ${tool} tool`);
    }
  };

  const clearAllAnnotations = () => {
    if (annotatorRef.current && window.confirm('Clear all annotations?')) {
      annotatorRef.current.clearAnnotations();
      console.log('All annotations cleared');
    }
  };

  // 🎯 FINAL CORRECTED SAVE ANNOTATIONS FUNCTION
  const saveAnnotations = async () => {
    if (!annotatorRef.current) return;
    const annotations = annotatorRef.current.getAnnotations();
    if (annotations.length === 0) {
      alert('No annotations to save!');
      return;
    }

    setIsSaving(true);

    try {
      // Your coordinate conversion logic is correct.
      const newDetections = annotations.map((annotation) => {
        const selector = annotation.target.selector;
        if (selector.type === 'RECTANGLE' && selector.geometry) {
          const { x, y, w, h } = selector.geometry;
          return { x, y, w, h, label: "ship", score: 1.0 };
        }
        return null;
      }).filter(Boolean);

      // This is now the ONLY thing this function needs to do after converting
      // 1. Update the state with the new data.
      setSavedAnnotations(prev => [...prev, ...newDetections]);

      // 2. Clear the workspace.
      annotatorRef.current.clearAnnotations();

      // The useEffect will handle all the redrawing automatically!
      console.log(`✅ ${newDetections.length} annotations ready. State updated.`);
      alert(`Successfully saved ${newDetections.length} annotations!`);

    } catch (error) {
      console.error('Error during save:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 🐛 Enhanced debug function to show the exact format
  const debugAnnotationStructure = () => {
    if (!annotatorRef.current) return;

    const annotations = annotatorRef.current.getAnnotations();
    console.log('=== DETAILED ANNOTATION DEBUG ===');
    console.log('Total annotations:', annotations.length);

    annotations.forEach((annotation, index) => {
      console.log(`\n--- Annotation ${index} ---`);
      console.log('ID:', annotation.id);
      console.log('Target:', annotation.target);

      const selector = annotation.target.selector;
      console.log('Selector type:', selector.type);
      console.log('Selector full object:', JSON.stringify(selector, null, 2));

      if (selector.geometry) {
        console.log('Geometry object found:', selector.geometry);
        console.log('Direct coordinates:', {
          x: selector.geometry.x,
          y: selector.geometry.y,
          w: selector.geometry.w,
          h: selector.geometry.h
        });

        if (selector.geometry.bounds) {
          console.log('Bounds found:', selector.geometry.bounds);
        }
      }

      // Try coordinate extraction
      let x, y, w, h;
      if (selector.type === 'RECTANGLE' && selector.geometry) {
        x = selector.geometry.x;
        y = selector.geometry.y;
        w = selector.geometry.w;
        h = selector.geometry.h;
        console.log('✅ Successfully extracted:', { x, y, w, h });
      } else {
        console.log('❌ Could not extract coordinates');
      }
    });

    // Also show image size for reference
    if (osdViewer2.current) {
      const tiledImage = osdViewer2.current.world.getItemAt(0);
      console.log('\n📐 Image dimensions:', tiledImage.getContentSize());
    }

    console.log('=== END DEBUG ===');
  };

  const cleanupViewers = () => {
    if (annotatorRef.current) {
      annotatorRef.current.destroy();
      annotatorRef.current = null;
    }
    if (osdViewer1.current) {
      osdViewer1.current.destroy();
      osdViewer1.current = null;
    }
    if (osdViewer2.current) {
      osdViewer2.current.destroy();
      osdViewer2.current = null;
    }
  };

  return (
    <div className="w-full">
      {/* Header with Controls */}
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
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300 font-mono text-sm font-bold">
                Annotations: {annotationCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-lime-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300 font-mono text-sm font-bold">
                Saved: {savedAnnotations.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-gray-400 font-mono text-xs">VIEWPORT SYNC ACTIVE</span>
            </div>
          </div>

          {/* Annotation Controls */}
          <div className="flex items-center gap-2">
            {/* Drawing Mode Toggle */}
            <button
              onClick={toggleDrawingMode}
              className={`px-3 py-1 rounded font-mono text-xs font-bold transition-all ${isDrawingMode
                ? 'bg-orange-600 border-2 border-orange-400 text-white shadow-lg animate-pulse'
                : 'bg-green-600 border-2 border-green-400 text-white shadow-md'
                }`}
              title={isDrawingMode ? 'Click to enable Pan/Zoom' : 'Click to enable Drawing'}
            >
              {isDrawingMode ? '✏ DRAW MODE' : '🔍 PAN/ZOOM MODE'}
            </button>

            {/* Tool Selector */}
            {isDrawingMode && (
              <div className="flex items-center gap-1 bg-gray-900/90 px-2 py-1 rounded border-2 border-orange-600/60 shadow-lg">
                {/* Rectangle Tool */}
                <button
                  onClick={() => handleToolChange('rectangle')}
                  title="Rectangle Tool"
                  className={`p-2 rounded transition-all ${currentTool === 'rectangle'
                    ? 'bg-blue-600 text-white shadow-md scale-110'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  </svg>
                </button>

                {/* Clear All Button */}
                <div className="w-px h-6 bg-gray-600 mx-1"></div>
                <button
                  onClick={clearAllAnnotations}
                  title="Clear All Annotations"
                  className="p-2 rounded bg-red-700 text-white hover:bg-red-600 transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>

                {/* Save Button */}
                <div className="w-px h-6 bg-gray-600 mx-1"></div>
                <button
                  onClick={saveAnnotations}
                  disabled={isSaving || annotationCount === 0}
                  title="Save Annotations to Database"
                  className={`p-2 rounded transition-all font-bold ${isSaving || annotationCount === 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-lime-600 text-white hover:bg-lime-500 shadow-md'
                    }`}
                >
                  {isSaving ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17,21 17,13 7,13 7,21" />
                      <polyline points="7,3 7,8 15,8" />
                    </svg>
                  )}
                </button>

                {/* DEBUG BUTTON - Remove after testing */}
                <button
                  onClick={debugAnnotationStructure}
                  className="p-2 rounded bg-yellow-600 text-white hover:bg-yellow-500"
                  title="Debug Annotation Structure"
                >
                  🐛
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Viewers */}
      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <h3 className="text-sm font-bold mb-2 font-mono uppercase tracking-wider">
            🔍 Detections + Saved Annotations
          </h3>
          <div
            ref={viewer1Ref}
            style={{ width: "100%", height: "90vh", background: "black", borderRadius: "8px" }}
          />

          {/* Legend */}
          <div className="absolute top-4 right-4 bg-black/80 border border-gray-600 p-2 rounded text-xs font-mono">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-2 bg-red-500 border border-red-600"></div>
              <span className="text-white">AI Detections</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-2 bg-lime-500 border border-lime-600"></div>
              <span className="text-white">Manual Annotations</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, position: "relative" }}>
          <h3 className="text-sm font-bold mb-2 font-mono uppercase tracking-wider">
            ✏ Annotation Workspace
          </h3>
          <div
            ref={viewer2Ref}
            style={{ width: "100%", height: "90vh", background: "black", borderRadius: "8px" }}
          />

          {/* Mode Instructions Overlay */}
          {isDrawingMode && (
            <div className="absolute bottom-4 left-4 px-4 py-2 rounded-lg border bg-orange-900/90 border-orange-600 text-white font-mono text-xs">
              <div className="font-bold mb-1">
                ✏ {currentTool === 'rectangle' ? 'Rectangle Mode' : 'Polygon Mode'}
              </div>
              <div className="text-gray-200">
                Click and drag to draw a rectangle
              </div>
              <div className="text-yellow-300 mt-1 text-xs">
                💾 Click SAVE 
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .detection-box {
          pointer-events: none;
          box-sizing: border-box;
          position: absolute;
        }

        .saved-annotation-box {
          pointer-events: none;
          box-sizing: border-box;
          position: absolute;
        }

        /* Custom Annotorious styling */
        svg.a9s-annotationlayer .a9s-selection .a9s-outer,
        svg.a9s-annotationlayer .a9s-annotation .a9s-outer {
          stroke: #00ff00;
          stroke-width: 1;
          fill: rgba(0, 255, 0, 0.1);
        }

        svg.a9s-annotationlayer .a9s-selection .a9s-inner,
        svg.a9s-annotationlayer .a9s-annotation .a9s-inner {
          stroke: #00ff00;
          stroke-width: 1;
          stroke-dasharray: 5;
          fill: rgba(0, 255, 0, 0.15);
        }

        svg.a9s-annotationlayer .a9s-annotation.editable:hover .a9s-inner {
          fill: rgba(0, 255, 0, 0.25);
          stroke-width: 1;
        }

        svg.a9s-annotationlayer .a9s-handle .a9s-handle-inner {
          fill: #00ff00;
          stroke: #00ff00;
        }

        svg.a9s-annotationlayer .a9s-selection-mask {
          fill: rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
};

export default DeepZoomViewer;
