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
import { Upload, FileImage, Loader2, Info, Ship, Save, Trash2, Download, ArrowLeft, Pencil, Search } from 'lucide-react';

const API_BASE = 'http://localhost:3000';

const ShipAnnotationPage = () => {
  const navigate = useNavigate();
  const [imageMode, setImageMode] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [dziList, setDziList] = useState([]);
  const [selectedDzi, setSelectedDzi] = useState(null);
  const [imageId, setImageId] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef(null);

  // Annotation states
  const viewerRef = useRef(null);
  const osdViewer = useRef(null);
  const annotatorRef = useRef(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [annotationCount, setAnnotationCount] = useState(0);
  const [savedAnnotations, setSavedAnnotations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [imageDimensions, setImageDimensions] = useState(null);

  // Fetch available DZIs from backend
  const fetchBackendImages = async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch(`${API_BASE}/api/dzi/ship`);
      if (res.ok) {
        const data = await res.json();
        if (data?.length > 0) {
          setDziList(data);
          setImageMode('backend');
        } else {
          setStatusMsg("No precomputed DZI images found for ship.");
        }
      }
    } catch (err) {
      console.error("Error fetching DZI list:", err);
      setStatusMsg("Failed to load backend images");
    } finally {
      setIsLoadingList(false);
    }
  };

  // Handle TIFF file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(tif|tiff)$/i)) {
      alert('Please select a TIFF file.');
      return;
    }

    setIsUploading(true);
    setUploadProgress("Uploading TIFF image...");

    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append('image', file);

      const uploadRes = await fetch(`${API_BASE}/api/images/upload/ship`, {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }

      const uploadData = await uploadRes.json();
      const imgId = uploadData.file.imageId;
      console.log('Upload success:', uploadData);

      // Step 2: Generate DZI
      setUploadProgress("Generating DZI tiles (this may take a moment)...");

      const dziRes = await fetch(`${API_BASE}/api/dzi/generate/ship/${imgId}`, {
        method: 'POST'
      });

      if (!dziRes.ok) {
        const err = await dziRes.json();
        throw new Error(err.error || 'DZI generation failed');
      }

      const dziData = await dziRes.json();
      console.log('DZI generated:', dziData);

      // Step 3: Load the generated DZI
      setImageMode('backend');
      setImageId(imgId);
      setSelectedDzi(dziData.dziUrl || `/tiles/ship/${imgId}.dzi`);
      setStatusMsg(`Image uploaded and DZI generated successfully!`);
      setUploadProgress("");

    } catch (err) {
      console.error('Upload/DZI error:', err);
      alert(`Error: ${err.message}`);
      setUploadProgress("");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load sample DZI
  const loadSampleImages = () => {
    setImageMode('sample');
    setSelectedDzi("/output_dzi.dzi");
    setImageId('sample_image');
  };

  // Initialize viewer when DZI is selected
  useEffect(() => {
    if (!selectedDzi) return;

    cleanupViewer();
    const timer = setTimeout(() => {
      initializeViewer();
    }, 100);

    return () => {
      clearTimeout(timer);
      cleanupViewer();
    };
  }, [selectedDzi]);

  // Redraw overlays when saved annotations change
  useEffect(() => {
    if (osdViewer.current && osdViewer.current.isOpen()) {
      osdViewer.current.clearOverlays();
      addSavedAnnotationOverlays();
    }
  }, [savedAnnotations]);

  const initializeViewer = () => {
    if (osdViewer.current || !viewerRef.current) return;

    const dziSource = imageMode === 'sample' ? selectedDzi : `${API_BASE}${selectedDzi}`;

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
      annotations: savedAnnotations.map(a => ({
        ...a,
        type: 'manual_annotation'
      })),
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

  const resetToSelection = () => {
    cleanupViewer();
    setImageMode(null);
    setSelectedDzi(null);
    setImageId(null);
    setSavedAnnotations([]);
    setAnnotationCount(0);
    setStatusMsg("");
    setDziList([]);
  };

  // ── Image Source Selection Screen ──
  if (!imageMode) {
    return (
      <div className="container max-w-5xl mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Ship className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Ship Annotation Tool</CardTitle>
                <CardDescription>Choose how to load images for annotation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Upload TIFF */}
              <Card className="cursor-pointer hover:border-primary transition-colors relative">
                <CardContent className="pt-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".tif,.tiff"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    disabled={isUploading}
                  />
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      ) : (
                        <Upload className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {isUploading ? 'Processing...' : 'Upload TIFF Image'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {uploadProgress || 'Upload a SAR TIFF → auto-generate DZI → annotate'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sample Image */}
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
                      <p className="text-sm text-muted-foreground">Annotate pre-loaded sample DZI</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Or load precomputed DZI from backend storage</p>
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
              {statusMsg && (
                <p className="text-sm text-muted-foreground">{statusMsg}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Annotation Workspace ──
  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-6">
      {/* Image Selection Header (backend mode) */}
      {imageMode === 'backend' && !selectedDzi && (
        <Card>
          <CardHeader>
            <CardTitle>Select Image</CardTitle>
            <CardDescription>Choose a precomputed DZI image to annotate</CardDescription>
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
            </div>
            <Button variant="outline" size="sm" onClick={resetToSelection}>
              ← Change Source
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Backend mode with selected image */}
      {imageMode === 'backend' && selectedDzi && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="font-mono">{imageId}</Badge>
                {imageDimensions && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {imageDimensions.width} × {imageDimensions.height}
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={resetToSelection}>
                Change Source
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample mode */}
      {imageMode === 'sample' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Annotating sample image</span>
            <Button variant="link" size="sm" onClick={resetToSelection}>
              Change
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {selectedDzi && (
        <>
          {/* Toolbar */}
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
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={toggleDrawingMode}
                    size="sm"
                    variant={isDrawingMode ? "default" : "secondary"}
                    className={isDrawingMode ? "animate-pulse" : ""}
                  >
                    {isDrawingMode ? (<><Pencil className="h-4 w-4 mr-1" /> Drawing</>) : (<><Search className="h-4 w-4 mr-1" /> Pan/Zoom</>)}
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

          {/* Viewer */}
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
                    <div className="font-bold mb-1 flex items-center gap-1"><Pencil className="h-3 w-3" /> Rectangle Mode</div>
                    <div className="text-gray-200 text-xs">
                      Click and drag to annotate ships
                    </div>
                    <div className="text-yellow-300 mt-1 text-xs flex items-center gap-1">
                      <Save className="h-3 w-3" /> Click SAVE to persist annotations
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
