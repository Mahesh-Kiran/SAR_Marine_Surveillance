import React, { useEffect, useRef, useState } from "react";
import OpenSeadragon from "openseadragon";
import { createOSDAnnotator } from '@annotorious/openseadragon';
import '@annotorious/openseadragon/annotorious-openseadragon.css';

const AnnotationViewer = ({
  dziUrl = "/output_dzi.dzi",
  onSaveAnnotations,
  existingDetections = []
}) => {
  const viewerRef = useRef(null);
  const osdViewer = useRef(null);
  const annotatorRef = useRef(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentTool, setCurrentTool] = useState('rectangle');
  const [annotationCount, setAnnotationCount] = useState(0);
  const [savedAnnotations, setSavedAnnotations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [imageDimensions, setImageDimensions] = useState(null);

  useEffect(() => {
    if (osdViewer.current && osdViewer.current.isOpen()) {
      console.log('State changed, redrawing overlays...');
      osdViewer.current.clearOverlays();
      addSavedAnnotationOverlays();
    }
  }, [savedAnnotations]);

  useEffect(() => {
    initializeViewer();
    return () => {
      cleanupViewer();
    };
  }, []);

  const initializeViewer = () => {
    if (osdViewer.current) return;

    osdViewer.current = OpenSeadragon({
      element: viewerRef.current,
      id: "osd-annotation-viewer",
      prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/",
      tileSources: dziUrl,
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

    osdViewer.current.addHandler("open", () => {
      const tiledImage = osdViewer.current.world.getItemAt(0);
      const dimensions = tiledImage.getContentSize();
      setImageDimensions({ width: dimensions.x, height: dimensions.y });
      console.log('Image dimensions:', dimensions.x, 'x', dimensions.y);

      initializeAnnotations();
      addSavedAnnotationOverlays();
    });
  };

  const initializeAnnotations = () => {
    annotatorRef.current = createOSDAnnotator(osdViewer.current, {
      drawingEnabled: false,
      drawingMode: 'drag',
      autoSave: false,
      style: {
        stroke: '#00ff00',
        strokeWidth: 1,
        fill: 'rgba(0, 255, 0, 0.15)'
      }
    });

    console.log("✓ Annotorious initialized");
    annotatorRef.current.setDrawingTool('rectangle');

    const updateCount = () => {
      const annotations = annotatorRef.current.getAnnotations();
      setAnnotationCount(annotations.length);
    };

    annotatorRef.current.on('createAnnotation', updateCount);
    annotatorRef.current.on('deleteAnnotation', updateCount);
  };

  const addSavedAnnotationOverlays = () => {
    if (!osdViewer.current || savedAnnotations.length === 0) return;

    savedAnnotations.forEach((annotation, idx) => {
      const elt = document.createElement("div");
      elt.className = "saved-annotation-box";
      elt.style.border = "1px solid lime";
      elt.style.background = "rgba(0, 255, 0, 0.15)";
      elt.style.pointerEvents = "none";
      elt.style.boxSizing = "border-box";
      elt.title = `Manual Annotation: ${annotation.label} (${(annotation.score * 100).toFixed(1)}%)`;

      const rect = osdViewer.current.viewport.imageToViewportRectangle(
        new OpenSeadragon.Rect(annotation.x, annotation.y, annotation.w, annotation.h)
      );

      osdViewer.current.addOverlay({
        element: elt,
        location: rect,
        placement: OpenSeadragon.Placement.TOP_LEFT
      });
    });
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

  const saveAnnotations = async () => {
    if (!annotatorRef.current) return;
    const annotations = annotatorRef.current.getAnnotations();
    if (annotations.length === 0) {
      alert('No annotations to save!');
      return;
    }

    setIsSaving(true);

    try {
      const newDetections = annotations.map((annotation) => {
        const selector = annotation.target.selector;
        if (selector.type === 'RECTANGLE' && selector.geometry) {
          const { x, y, w, h } = selector.geometry;
          return { x, y, w, h, label: "ship", score: 1.0 };
        }
        return null;
      }).filter(Boolean);

      setSavedAnnotations(prev => [...prev, ...newDetections]);

      if (onSaveAnnotations) {
        await onSaveAnnotations(newDetections);
      }

      annotatorRef.current.clearAnnotations();
      console.log(`✅ ${newDetections.length} annotations saved`);
      alert(`Successfully saved ${newDetections.length} annotations!`);

    } catch (error) {
      console.error('Error during save:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Download ONLY manual annotations as JSON
  const downloadAnnotationsJSON = () => {
    if (!imageDimensions) {
      alert('Please wait for image to load before downloading');
      return;
    }

    // Only manual annotations
    const manualAnnotations = savedAnnotations.map(d => ({
      ...d,
      type: 'manual_annotation'
    }));

    const exportData = {
      imageDimensions: imageDimensions, // Use actual dimensions from DZI
      timestamp: new Date().toISOString(),
      annotations: manualAnnotations,
      metadata: {
        totalAnnotations: manualAnnotations.length,
        aiDetections: 0,
        manualAnnotations: manualAnnotations.length
      }
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `ship_annotations_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✅ Manual annotations exported as JSON');
    console.log('Image dimensions:', imageDimensions);
  };

  const debugAnnotationStructure = () => {
    if (!annotatorRef.current) return;

    const annotations = annotatorRef.current.getAnnotations();
    console.log('=== DETAILED ANNOTATION DEBUG ===');
    console.log('Total annotations:', annotations.length);

    annotations.forEach((annotation, index) => {
      console.log(`\n--- Annotation ${index} ---`);
      console.log('Full structure:', JSON.stringify(annotation, null, 2));

      const selector = annotation.target.selector;
      if (selector.geometry) {
        console.log('Coordinates:', {
          x: selector.geometry.x,
          y: selector.geometry.y,
          w: selector.geometry.w,
          h: selector.geometry.h
        });
      }
    });

    if (osdViewer.current) {
      const tiledImage = osdViewer.current.world.getItemAt(0);
      console.log('\n📐 Image dimensions:', tiledImage.getContentSize());
    }

    console.log('=== END DEBUG ===');
  };

  const cleanupViewer = () => {
    if (annotatorRef.current) {
      annotatorRef.current.destroy();
      annotatorRef.current = null;
    }
    if (osdViewer.current) {
      osdViewer.current.destroy();
      osdViewer.current = null;
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4 bg-gray-900/80 border-2 border-gray-600/40 p-4 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300 font-mono text-sm font-bold">
                Active Annotations: {annotationCount}
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
                  {imageDimensions.width} × {imageDimensions.height}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
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

            {isDrawingMode && (
              <div className="flex items-center gap-1 bg-gray-900/90 px-2 py-1 rounded border-2 border-orange-600/60 shadow-lg">
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

                <div className="w-px h-6 bg-gray-600 mx-1"></div>
                <button
                  onClick={saveAnnotations}
                  disabled={isSaving || annotationCount === 0}
                  title="Save Annotations"
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

                <button
                  onClick={debugAnnotationStructure}
                  className="p-2 rounded bg-yellow-600 text-white hover:bg-yellow-500"
                  title="Debug Annotation Structure"
                >
                  🐛
                </button>
              </div>
            )}

            {/* Download JSON button - Only manual annotations */}
            {!isDrawingMode && savedAnnotations.length > 0 && (
              <div className="flex items-center gap-2 bg-gray-900/90 px-2 py-1 rounded border-2 border-blue-600/60 shadow-lg">
                <button
                  onClick={downloadAnnotationsJSON}
                  title="Download Manual Annotations as JSON"
                  className="px-3 py-2 rounded font-mono text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 transition-all shadow-md"
                >
                  📄 Download JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <h3 className="text-sm font-bold mb-2 font-mono uppercase tracking-wider">
          ✏ SAR Image Annotation Workspace
        </h3>
        <div
          ref={viewerRef}
          style={{ width: "100%", height: "90vh", background: "black", borderRadius: "8px" }}
        />

        {savedAnnotations.length > 0 && (
          <div className="absolute top-4 right-4 bg-black/80 border border-gray-600 p-2 rounded text-xs font-mono">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-2 bg-green-500 border border-green-600"></div>
              <span className="text-white">Active Annotations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-2 bg-lime-500 border border-lime-600"></div>
              <span className="text-white">Saved Annotations</span>
            </div>
          </div>
        )}

        {isDrawingMode && (
          <div className="absolute bottom-4 left-4 px-4 py-2 rounded-lg border bg-orange-900/90 border-orange-600 text-white font-mono text-xs">
            <div className="font-bold mb-1">
              ✏ {currentTool === 'rectangle' ? 'Rectangle Mode' : 'Polygon Mode'}
            </div>
            <div className="text-gray-200">
              Click and drag to draw a rectangle
            </div>
            <div className="text-yellow-300 mt-1 text-xs">
              💾 Click SAVE to persist annotations
            </div>
          </div>
        )}
      </div>

      <style>{`
        .saved-annotation-box {
          pointer-events: none;
          box-sizing: border-box;
          position: absolute;
        }

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

export default AnnotationViewer;

/*
import React, { useEffect, useRef, useState } from "react";
import OpenSeadragon from "openseadragon";
import { createOSDAnnotator } from '@annotorious/openseadragon';
import '@annotorious/openseadragon/annotorious-openseadragon.css';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileImage, Loader2, Info, Ship, Save, Trash2, Download } from 'lucide-react';

const ShipAnnotationPage = () => {
  const navigate = useNavigate();
  const [imageMode, setImageMode] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [dziList, setDziList] = useState([]);
  const [selectedDzi, setSelectedDzi] = useState(null);
  const [imageId, setImageId] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  
  // Annotation states
  const viewerRef = useRef(null);
  const osdViewer = useRef(null);
  const annotatorRef = useRef(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [annotationCount, setAnnotationCount] = useState(0);
  const [savedAnnotations, setSavedAnnotations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [imageDimensions, setImageDimensions] = useState(null);

  const sampleDziPath = "/output_dzi.dzi";

  const fetchBackendImages = async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch("http://localhost:3000/api/dzi/ship");
      if (res.ok) {
        const data = await res.json();
        if (data?.length > 0) {
          setDziList(data);
          setImageMode('backend');
        } else {
          setStatusMsg("No images found in backend");
        }
      }
    } catch (err) {
      console.error("Error fetching DZI list:", err);
      setStatusMsg("Failed to load backend images");
    } finally {
      setIsLoadingList(false);
    }
  };

  const loadSampleImages = () => {
    setImageMode('sample');
    setSelectedDzi(sampleDziPath);
    setImageId('sample_image');
  };

  useEffect(() => {
    if (!selectedDzi) return;

    cleanupViewer();
    initializeViewer();

    return () => {
      cleanupViewer();
    };
  }, [selectedDzi]);

  const initializeViewer = () => {
    if (osdViewer.current) return;

    const dziSource = imageMode === 'sample' ? selectedDzi : `http://localhost:3000${selectedDzi}`;

    osdViewer.current = OpenSeadragon({
      element: viewerRef.current,
      prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/",
      tileSources: dziSource,
      showNavigator: true,
      showNavigationControl: true,
      navigatorSizeRatio: 0.15,
      visibilityRatio: 1,
      minZoomLevel: 0.1,
      maxZoomLevel: 20,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true,
        dragToPan: true,
        scrollToZoom: true,
      },
    });

    osdViewer.current.addHandler("open", () => {
      const tiledImage = osdViewer.current.world.getItemAt(0);
      const dimensions = tiledImage.getContentSize();
      setImageDimensions({ width: dimensions.x, height: dimensions.y });
      console.log('Image dimensions:', dimensions);
      
      initializeAnnotations();
      addSavedAnnotationOverlays();
      setStatusMsg("Image loaded successfully");
    });
  };

  const initializeAnnotations = () => {
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

    annotatorRef.current.setDrawingTool('rectangle');

    const updateCount = () => {
      const annotations = annotatorRef.current.getAnnotations();
      setAnnotationCount(annotations.length);
    };

    annotatorRef.current.on('createAnnotation', updateCount);
    annotatorRef.current.on('deleteAnnotation', updateCount);
  };

  const addSavedAnnotationOverlays = () => {
    if (!osdViewer.current || savedAnnotations.length === 0) return;

    savedAnnotations.forEach((annotation) => {
      const elt = document.createElement("div");
      elt.style.border = "2px solid lime";
      elt.style.background = "rgba(0, 255, 0, 0.15)";
      elt.style.pointerEvents = "none";
      elt.style.boxSizing = "border-box";

      const rect = osdViewer.current.viewport.imageToViewportRectangle(
        new OpenSeadragon.Rect(annotation.x, annotation.y, annotation.w, annotation.h)
      );

      osdViewer.current.addOverlay({
        element: elt,
        location: rect,
      });
    });
  };

  const toggleDrawingMode = () => {
    if (annotatorRef.current && osdViewer.current) {
      const newState = !isDrawingMode;
      annotatorRef.current.setDrawingEnabled(newState);
      osdViewer.current.setMouseNavEnabled(!newState);
      setIsDrawingMode(newState);
    }
  };

  const clearAllAnnotations = () => {
    if (annotatorRef.current && window.confirm('Clear all active annotations?')) {
      annotatorRef.current.clearAnnotations();
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
      const newDetections = annotations.map((annotation) => {
        const selector = annotation.target.selector;
        if (selector.type === 'RECTANGLE' && selector.geometry) {
          const { x, y, w, h } = selector.geometry;
          return { x, y, w, h, label: "ship", score: 1.0 };
        }
        return null;
      }).filter(Boolean);

      setSavedAnnotations(prev => [...prev, ...newDetections]);
      annotatorRef.current.clearAnnotations();
      
      setStatusMsg(`Saved ${newDetections.length} annotation(s)`);
      alert(`Successfully saved ${newDetections.length} annotations!`);

    } catch (error) {
      console.error('Error during save:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadAnnotationsJSON = () => {
    if (!imageDimensions) {
      alert('Please wait for image to load');
      return;
    }

    const exportData = {
      imageId: imageId,
      imageDimensions: imageDimensions,
      timestamp: new Date().toISOString(),
      annotations: savedAnnotations,
      metadata: {
        totalAnnotations: savedAnnotations.length,
        annotationType: 'manual_ship_annotation'
      }
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ship_annotations_${imageId}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('Annotations exported');
  };

  const cleanupViewer = () => {
    if (annotatorRef.current) {
      annotatorRef.current.destroy();
      annotatorRef.current = null;
    }
    if (osdViewer.current) {
      osdViewer.current.destroy();
      osdViewer.current = null;
    }
  };

  const handleSelectDzi = (dziPath) => {
    const imgId = dziPath.split("/").pop().replace(".dzi", "");
    setSelectedDzi(dziPath);
    setImageId(imgId);
    setSavedAnnotations([]);
    setAnnotationCount(0);
    setStatusMsg("Loading image...");
  };

  if (!imageMode) {
    return (
      <div className="container max-w-5xl mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ship className="h-6 w-6 text-primary" />
              <CardTitle>Ship Annotation Tool</CardTitle>
            </div>
            <CardDescription>Choose how to load images for annotation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Card 
                className="cursor-pointer hover:border-primary transition-colors" 
                onClick={() => navigate('/upload')}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Upload Image</h3>
                      <p className="text-sm text-muted-foreground">Upload SAR images for annotation</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary transition-colors" 
                onClick={loadSampleImages}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <FileImage className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Sample Images</h3>
                      <p className="text-sm text-muted-foreground">Annotate pre-loaded sample</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Or load from backend storage</p>
              <Button variant="secondary" onClick={fetchBackendImages} disabled={isLoadingList}>
                {isLoadingList ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load Backend Images'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-6">
      {imageMode === 'backend' && (
        <Card>
          <CardHeader>
            <CardTitle>Image Selection</CardTitle>
            <CardDescription>Select an image to annotate ships</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Available Images</Label>
                <Select onValueChange={handleSelectDzi}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select image" />
                  </SelectTrigger>
                  <SelectContent>
                    {dziList.map((item, idx) => (
                      <SelectItem key={idx} value={item.dzi}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {imageId && (
                <div className="space-y-2">
                  <Label>Image ID</Label>
                  <Badge variant="secondary" className="font-mono">{imageId}</Badge>
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setImageMode(null);
                setSelectedDzi(null);
                setImageId(null);
                setSavedAnnotations([]);
                setAnnotationCount(0);
              }}
            >
              Change Source
            </Button>
          </CardContent>
        </Card>
      )}

      {imageMode === 'sample' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Annotating sample image</span>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => {
                setImageMode(null);
                setSelectedDzi(null);
                setSavedAnnotations([]);
                setAnnotationCount(0);
              }}
            >
              Change
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {selectedDzi && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-mono font-bold">
                      Active: {annotationCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-lime-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-mono font-bold">
                      Saved: {savedAnnotations.length}
                    </span>
                  </div>
                  {imageDimensions && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {imageDimensions.width} × {imageDimensions.height}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={toggleDrawingMode}
                    size="sm"
                    variant={isDrawingMode ? "default" : "secondary"}
                    className={isDrawingMode ? "animate-pulse" : ""}
                  >
                    {isDrawingMode ? '✏️ Drawing' : '🔍 Pan/Zoom'}
                  </Button>

                  {isDrawingMode && (
                    <>
                      <Button
                        onClick={clearAllAnnotations}
                        size="sm"
                        variant="destructive"
                        disabled={annotationCount === 0}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear
                      </Button>

                      <Button
                        onClick={saveAnnotations}
                        size="sm"
                        variant="default"
                        disabled={isSaving || annotationCount === 0}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </>
                  )}

                  {!isDrawingMode && savedAnnotations.length > 0 && (
                    <Button
                      onClick={downloadAnnotationsJSON}
                      size="sm"
                      variant="secondary"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download JSON
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Annotation Workspace</CardTitle>
              <CardDescription>
                {isDrawingMode 
                  ? "Click and drag to draw rectangles around ships" 
                  : "Enable drawing mode to annotate"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div
                  ref={viewerRef}
                  className="w-full h-[80vh] bg-black rounded-md border"
                />

                {isDrawingMode && (
                  <div className="absolute bottom-4 left-4 px-4 py-2 rounded-lg bg-orange-900/90 border border-orange-600 text-white font-mono text-sm">
                    <div className="font-bold mb-1">✏️ Rectangle Mode</div>
                    <div className="text-gray-200 text-xs">
                      Click and drag to annotate ships
                    </div>
                    <div className="text-yellow-300 mt-1 text-xs">
                      💾 Click SAVE to persist annotations
                    </div>
                  </div>
                )}

                {savedAnnotations.length > 0 && (
                  <div className="absolute top-4 right-4 bg-black/80 border border-gray-600 p-2 rounded text-xs font-mono space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-2 bg-green-500 border border-green-600"></div>
                      <span className="text-white">Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-2 bg-lime-500 border border-lime-600"></div>
                      <span className="text-white">Saved</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {statusMsg && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>{statusMsg}</AlertDescription>
            </Alert>
          )}
        </>
      )}

      <style>{`
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

export default ShipAnnotationPage;
*/

