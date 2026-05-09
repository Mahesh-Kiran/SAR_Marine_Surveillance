import React, { useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import { createOSDAnnotator } from '@annotorious/openseadragon';
import '@annotorious/openseadragon/annotorious-openseadragon.css';

const OilSpillAnnotationViewer = ({ 
  imagePath = "/actual.png",
  dziPath = null,
  onSaveAnnotations
}) => {
  const viewerRef = useRef(null);
  const osdViewer = useRef(null);
  const annotatorRef = useRef(null);
  const overlayRefs = useRef([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [annotationCount, setAnnotationCount] = useState(0);
  const [savedAnnotations, setSavedAnnotations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [imageDimensions, setImageDimensions] = useState(null);

  // Redraw overlays when saved annotations change
  useEffect(() => {
    if (osdViewer.current && osdViewer.current.isOpen() && savedAnnotations.length > 0) {
      console.log('Redrawing polygon overlays...');
      clearOldOverlays();
      addSavedAnnotationOverlays();
    }
  }, [savedAnnotations]);

  // Add handler for viewport updates
  useEffect(() => {
    if (osdViewer.current && osdViewer.current.isOpen()) {
      const updateHandler = () => {
        if (savedAnnotations.length > 0) {
          updateOverlayPositions();
        }
      };
      
      osdViewer.current.addHandler('animation', updateHandler);
      osdViewer.current.addHandler('resize', updateHandler);
      
      return () => {
        if (osdViewer.current) {
          osdViewer.current.removeHandler('animation', updateHandler);
          osdViewer.current.removeHandler('resize', updateHandler);
        }
      };
    }
  }, [savedAnnotations]);

  useEffect(() => {
    initializeViewer();
    return () => {
      cleanupViewer();
    };
  }, []);

  const initializeViewer = () => {
    if (viewerRef.current && !osdViewer.current) {
      try {
        let tileSource;
        
        if (dziPath) {
          tileSource = dziPath;
        } else {
          tileSource = {
            type: 'image',
            url: imagePath,
            buildPyramid: false
          };
        }

        osdViewer.current = OpenSeadragon({
          element: viewerRef.current,
          prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/",
          tileSources: tileSource,
          showNavigationControl: true,
          showNavigator: true,
          navigatorSizeRatio: 0.15,
          defaultZoomLevel: 0,
          minZoomLevel: 0.1,
          maxZoomLevel: dziPath ? 20 : 8,
          gestureSettingsMouse: {
            clickToZoom: false,
            dblClickToZoom: true,
            dragToPan: true,
            scrollToZoom: true,
            pinchToZoom: true
          },
          timeout: 30000,
        });

        osdViewer.current.addHandler('open', () => {
          setIsLoading(false);
          setError(null);
          
          // Get image dimensions
          const tiledImage = osdViewer.current.world.getItemAt(0);
          const dimensions = tiledImage.getContentSize();
          setImageDimensions({ width: dimensions.x, height: dimensions.y });
          console.log('Image dimensions:', dimensions.x, 'x', dimensions.y);
          
          initializeAnnotations();
        });

        osdViewer.current.addHandler('open-failed', (event) => {
          console.error('Failed to open viewer:', event);
          setError('Failed to load oil spill image');
          setIsLoading(false);
        });

      } catch (err) {
        console.error('Error initializing viewer:', err);
        setError('Failed to initialize viewer: ' + err.message);
        setIsLoading(false);
      }
    }
  };

  const initializeAnnotations = () => {
    if (!osdViewer.current || annotatorRef.current) return;

    annotatorRef.current = createOSDAnnotator(osdViewer.current, {
      drawingEnabled: false,
      drawingMode: 'drag',
      autoSave: false,
      style: {
        stroke: '#00ff00',
        strokeWidth: 2,
        fill: 'rgba(0, 255, 0, 0.15)'
      }
    });

    console.log('✓ Annotorious initialized for oil spill viewer');
    annotatorRef.current.setDrawingTool('polygon');

    const updateCount = () => {
      const annotations = annotatorRef.current.getAnnotations();
      setAnnotationCount(annotations.length);
    };

    annotatorRef.current.on('createAnnotation', updateCount);
    annotatorRef.current.on('deleteAnnotation', updateCount);
  };

  const clearOldOverlays = () => {
    // Remove all saved polygon overlays from DOM
    overlayRefs.current.forEach(overlay => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    overlayRefs.current = [];
  };

  const updateOverlayPositions = () => {
    if (!osdViewer.current || overlayRefs.current.length === 0) return;

    overlayRefs.current.forEach((svgElement, idx) => {
      const annotation = savedAnnotations[idx];
      if (!annotation || !annotation.points) return;

      const polygon = svgElement.querySelector('polygon');
      if (!polygon) return;

      // Convert image coordinates to viewport pixel coordinates
      const viewportPoints = annotation.points.map(point => {
        const imgPoint = new OpenSeadragon.Point(point[0], point[1]);
        const vpPoint = osdViewer.current.viewport.imageToViewportCoordinates(imgPoint);
        return osdViewer.current.viewport.viewportToViewerElementCoordinates(vpPoint);
      });

      // Update polygon points
      const pointsStr = viewportPoints.map(p => `${p.x},${p.y}`).join(' ');
      polygon.setAttribute('points', pointsStr);
    });
  };

  const addSavedAnnotationOverlays = () => {
    if (!osdViewer.current || !osdViewer.current.isOpen() || savedAnnotations.length === 0) return;

    const svgNS = "http://www.w3.org/2000/svg";
    const container = osdViewer.current.canvas;

    savedAnnotations.forEach((annotation, idx) => {
      if (annotation.type === 'polygon' && annotation.points && annotation.points.length > 0) {
        
        // Create SVG container
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("class", "saved-polygon-overlay");
        svg.style.position = "absolute";
        svg.style.top = "0";
        svg.style.left = "0";
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.pointerEvents = "none";
        svg.style.overflow = "visible";
        svg.style.zIndex = "10";

        // Convert image coordinates to viewport pixel coordinates
        const viewportPoints = annotation.points.map(point => {
          const imgPoint = new OpenSeadragon.Point(point[0], point[1]);
          const vpPoint = osdViewer.current.viewport.imageToViewportCoordinates(imgPoint);
          return osdViewer.current.viewport.viewportToViewerElementCoordinates(vpPoint);
        });

        // Create polygon element with pixel coordinates
        const polygon = document.createElementNS(svgNS, "polygon");
        const pointsStr = viewportPoints.map(p => `${p.x},${p.y}`).join(' ');
        polygon.setAttribute("points", pointsStr);
        polygon.setAttribute("fill", "rgba(0, 255, 0, 0.2)");
        polygon.setAttribute("stroke", "lime");
        polygon.setAttribute("stroke-width", "3");

        svg.appendChild(polygon);

        // Add SVG to viewer container
        container.appendChild(svg);
        overlayRefs.current.push(svg);

        console.log(`✅ Rendered saved polygon #${idx + 1} with ${annotation.points.length} points`);
      }
    });

    console.log(`✅ Total saved polygons rendered: ${savedAnnotations.length}`);
  };

  const toggleDrawingMode = () => {
    if (annotatorRef.current && osdViewer.current) {
      const newState = !isDrawingMode;
      
      annotatorRef.current.setDrawingEnabled(newState);
      osdViewer.current.setMouseNavEnabled(!newState);
      
      setIsDrawingMode(newState);
      console.log(`Drawing mode: ${newState ? 'ON' : 'OFF'}`);
    }
  };

  const clearAllAnnotations = () => {
    if (annotatorRef.current && window.confirm('Clear all unsaved annotations?')) {
      annotatorRef.current.clearAnnotations();
      console.log('All unsaved annotations cleared');
    }
  };

  const saveAnnotations = async () => {
    if (!annotatorRef.current) return;
    const annotations = annotatorRef.current.getAnnotations();
    
    if (annotations.length === 0) {
      alert('No annotations to save!');
      return;
    }

    setIsSaving(true);

    try {
      const formattedAnnotations = annotations.map((annotation) => {
        const selector = annotation.target.selector;
        
        if (selector.type === 'POLYGON' && selector.geometry && selector.geometry.points) {
          console.log('Saving polygon with points:', selector.geometry.points);
          return {
            type: 'polygon',
            points: selector.geometry.points, // Already in image coordinates
            label: "oil_spill",
            score: 1.0,
            id: annotation.id || `polygon_${Date.now()}_${Math.random()}`
          };
        }
        return null;
      }).filter(Boolean);

      if (formattedAnnotations.length === 0) {
        alert('No valid polygon annotations to save!');
        setIsSaving(false);
        return;
      }

      console.log('Formatted annotations:', formattedAnnotations);

      // Update local state - this will trigger useEffect to redraw
      setSavedAnnotations(prev => {
        const updated = [...prev, ...formattedAnnotations];
        console.log('Updated saved annotations:', updated);
        return updated;
      });

      // Call parent callback if provided
      if (onSaveAnnotations) {
        await onSaveAnnotations(formattedAnnotations);
      }

      // Clear active annotations
      annotatorRef.current.clearAnnotations();

      console.log(`✅ ${formattedAnnotations.length} polygon annotations saved`);
      alert(`Successfully saved ${formattedAnnotations.length} oil spill polygon(s)!`);

    } catch (error) {
      console.error('Error during save:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadAnnotationsJSON = () => {
    if (!imageDimensions) {
      alert('Please wait for image to load before downloading');
      return;
    }

    if (savedAnnotations.length === 0) {
      alert('No annotations to download!');
      return;
    }

    const exportData = {
      imageDimensions: imageDimensions,
      timestamp: new Date().toISOString(),
      annotations: savedAnnotations.map(ann => ({
        type: 'polygon',
        points: ann.points,
        label: 'oil_spill',
        score: 1.0,
        annotation_type: 'manual_annotation'
      })),
      metadata: {
        totalAnnotations: savedAnnotations.length,
        annotationType: 'polygon',
        label: 'oil_spill'
      }
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `oil_spill_annotations_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✅ Downloaded JSON with', savedAnnotations.length, 'polygons');
  };

  const debugAnnotations = () => {
    if (!annotatorRef.current) return;

    const annotations = annotatorRef.current.getAnnotations();
    console.log('=== DETAILED DEBUG ===');
    console.log('Active annotations:', annotations.length);
    console.log('Saved annotations:', savedAnnotations.length);
    
    annotations.forEach((ann, idx) => {
      console.log(`\nActive #${idx}:`, {
        type: ann.target.selector.type,
        pointCount: ann.target.selector.geometry?.points?.length,
        points: ann.target.selector.geometry?.points
      });
    });

    savedAnnotations.forEach((ann, idx) => {
      console.log(`\nSaved #${idx}:`, {
        type: ann.type,
        pointCount: ann.points?.length,
        points: ann.points
      });
    });

    console.log('\nViewer info:');
    if (osdViewer.current) {
      const tiledImage = osdViewer.current.world.getItemAt(0);
      console.log('Image dimensions:', tiledImage.getContentSize());
      console.log('Viewport zoom:', osdViewer.current.viewport.getZoom());
      console.log('Container size:', osdViewer.current.viewport.getContainerSize());
    }

    console.log('\nDOM overlays:', overlayRefs.current.length);
    console.log('=== END DEBUG ===');
  };

  const cleanupViewer = () => {
    clearOldOverlays();
    if (annotatorRef.current) {
      annotatorRef.current.destroy();
      annotatorRef.current = null;
    }
    if (osdViewer.current) {
      osdViewer.current.destroy();
      osdViewer.current = null;
    }
  };

  if (error) {
    return (
      <div className="w-full p-4">
        <div className="bg-gray-900 text-white border-2 border-red-500 rounded-lg p-8 text-center">
          <div className="text-red-400 text-lg mb-2">⚠️ Error</div>
          <div className="text-gray-300">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      {/* Header */}
      <div className="mb-4 bg-gray-900/80 border-2 border-gray-600/40 p-4 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300 font-mono text-sm font-bold">
                Active: {annotationCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-lime-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300 font-mono text-sm font-bold">
                Saved: {savedAnnotations.length}
              </span>
            </div>
            {imageDimensions && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-300 font-mono text-xs">
                  📐 {imageDimensions.width} × {imageDimensions.height}
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {!isLoading && (
              <>
                <button
                  onClick={toggleDrawingMode}
                  className={`px-3 py-1 rounded font-mono text-xs font-bold transition-all ${
                    isDrawingMode
                      ? 'bg-orange-600 border-2 border-orange-400 text-white shadow-lg animate-pulse'
                      : 'bg-green-600 border-2 border-green-400 text-white shadow-md'
                  }`}
                >
                  {isDrawingMode ? '✏️ DRAW MODE' : '🔍 PAN/ZOOM MODE'}
                </button>

                {isDrawingMode && (
                  <div className="flex items-center gap-1 bg-gray-900/90 px-2 py-1 rounded border-2 border-orange-600/60 shadow-lg">
                    <div className="p-2 bg-blue-600 text-white rounded" title="Polygon Tool (Active)">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 19 12 15 22 19" />
                      </svg>
                    </div>

                    <div className="w-px h-6 bg-gray-600 mx-1"></div>

                    <button
                      onClick={clearAllAnnotations}
                      title="Clear Unsaved Annotations"
                      className="p-2 rounded bg-red-700 text-white hover:bg-red-600 transition-all"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>

                    <div className="w-px h-6 bg-gray-600 mx-1"></div>

                    <button
                      onClick={saveAnnotations}
                      disabled={isSaving || annotationCount === 0}
                      title="Save Annotations"
                      className={`p-2 rounded transition-all ${
                        isSaving || annotationCount === 0
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-lime-600 text-white hover:bg-lime-500 shadow-md'
                      }`}
                    >
                      {isSaving ? (
                        <svg width="20" height="20" className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17,21 17,13 7,13 7,21" />
                          <polyline points="7,3 7,8 15,8" />
                        </svg>
                      )}
                    </button>

                    <button
                      onClick={debugAnnotations}
                      className="p-2 rounded bg-yellow-600 text-white hover:bg-yellow-500"
                      title="Debug Console"
                    >
                      🐛
                    </button>
                  </div>
                )}

                {!isDrawingMode && savedAnnotations.length > 0 && (
                  <div className="flex items-center gap-2 bg-gray-900/90 px-2 py-1 rounded border-2 border-blue-600/60 shadow-lg">
                    <button
                      onClick={downloadAnnotationsJSON}
                      title="Download Polygon Annotations"
                      className="px-3 py-2 rounded font-mono text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 transition-all shadow-md"
                    >
                      📄 Download JSON
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Viewer */}
      <div className="relative">
        <h3 className="text-sm font-bold mb-2 text-white font-mono uppercase tracking-wider">
          ✏️ Oil Spill Polygon Annotation Workspace
        </h3>

        {isLoading && (
          <div className="w-full h-[80vh] flex items-center justify-center bg-gray-900 rounded-lg border-2 border-gray-600/40">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
              <div className="font-mono text-sm">Loading Oil Spill Image...</div>
            </div>
          </div>
        )}

        <div
          ref={viewerRef}
          style={{
            width: '100%',
            height: '80vh',
            background: 'black',
            border: '2px solid #444',
            borderRadius: '8px',
            display: isLoading ? 'none' : 'block',
            position: 'relative'
          }}
        />

        {/* Legend */}
        {savedAnnotations.length > 0 && (
          <div className="absolute top-4 right-4 bg-black/80 border border-gray-600 p-2 rounded text-xs font-mono z-20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-2 bg-green-500 border border-green-600"></div>
              <span className="text-white">Active Polygons</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-2 bg-lime-500 border border-lime-600"></div>
              <span className="text-white">Saved Polygons ({savedAnnotations.length})</span>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isLoading && (
          <div className={`absolute bottom-4 left-4 px-4 py-2 rounded-lg border font-mono text-xs z-20 ${
            isDrawingMode
              ? 'bg-orange-900/90 border-orange-600 text-white'
              : 'bg-green-900/90 border-green-600 text-white'
          }`}>
            <div className="font-bold mb-1">
              {isDrawingMode ? '✏️ Polygon Drawing Mode' : '🔍 Pan & Zoom Mode'}
            </div>
            <div className="text-gray-200">
              {isDrawingMode
                ? 'Click to add points • ENTER to finish • ESC to cancel'
                : 'Drag to pan • Scroll to zoom • Double-click to zoom in'
              }
            </div>
            {isDrawingMode && (
              <div className="text-yellow-300 mt-1 text-[10px]">
                💾 Draw irregular shapes • Click SAVE to persist
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .saved-polygon-overlay {
          pointer-events: none !important;
        }

        svg.a9s-annotationlayer .a9s-selection .a9s-outer,
        svg.a9s-annotationlayer .a9s-annotation .a9s-outer {
          stroke: #00ff00;
          stroke-width: 2;
          fill: rgba(0, 255, 0, 0.1);
        }

        svg.a9s-annotationlayer .a9s-selection .a9s-inner,
        svg.a9s-annotationlayer .a9s-annotation .a9s-inner {
          stroke: #00ff00;
          stroke-width: 2;
          stroke-dasharray: 5;
          fill: rgba(0, 255, 0, 0.15);
        }

        svg.a9s-annotationlayer .a9s-annotation.editable:hover .a9s-inner {
          fill: rgba(0, 255, 0, 0.25);
        }

        svg.a9s-annotationlayer .a9s-handle .a9s-handle-inner {
          fill: #00ff00;
          stroke: #00ff00;
        }
      `}</style>
    </div>
  );
};

export default OilSpillAnnotationViewer;