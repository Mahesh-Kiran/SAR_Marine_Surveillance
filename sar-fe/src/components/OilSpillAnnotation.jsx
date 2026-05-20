import React, { useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
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
import { Upload, FileImage, Loader2, Info, Droplet, Save, Trash2, Download, ArrowLeft, Pencil, Search } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const OilSpillAnnotationPage = () => {
  const navigate = useNavigate();
  const [imageMode, setImageMode] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [dziList, setDziList] = useState([]);
  const [selectedDzi, setSelectedDzi] = useState(null);
  const [imageId, setImageId] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef(null);

  const viewerRef = useRef(null);
  const osdViewer = useRef(null);
  const annotatorRef = useRef(null);
  const overlayRefs = useRef([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [annotationCount, setAnnotationCount] = useState(0);
  const [savedAnnotations, setSavedAnnotations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [imageDimensions, setImageDimensions] = useState(null);

  const fetchBackendImages = async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch(`${API_BASE}/api/dzi/oilspill`);
      if (res.ok) {
        const data = await res.json();
        if (data?.length > 0) {
          setDziList(data);
          setImageMode('backend');
        } else {
          setStatusMsg("No precomputed DZI images found for oil spill.");
        }
      }
    } catch (err) {
      console.error("Error fetching DZI list:", err);
      setStatusMsg("Failed to load backend images");
    } finally {
      setIsLoadingList(false);
    }
  };

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
      const formData = new FormData();
      formData.append('image', file);
      const uploadRes = await fetch(`${API_BASE}/api/images/upload/oilspill`, {
        method: 'POST', body: formData
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }
      const uploadData = await uploadRes.json();
      const imgId = uploadData.file.imageId;
      setUploadProgress("Generating DZI tiles...");
      const dziRes = await fetch(`${API_BASE}/api/dzi/generate/oilspill/${imgId}`, { method: 'POST' });
      if (!dziRes.ok) {
        const err = await dziRes.json();
        throw new Error(err.error || 'DZI generation failed');
      }
      const dziData = await dziRes.json();
      setImageMode('backend');
      setImageId(imgId);
      setSelectedDzi(dziData.dziUrl || `/tiles/oilspill/${imgId}.dzi`);
      setStatusMsg("Image uploaded and DZI generated!");
      setUploadProgress("");
    } catch (err) {
      console.error('Upload error:', err);
      alert(`Error: ${err.message}`);
      setUploadProgress("");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const loadSampleImages = () => {
    setImageMode('sample');
    setSelectedDzi("/actual.png");
    setImageId('sample_oilspill');
  };

  useEffect(() => {
    if (!selectedDzi) return;
    cleanupViewer();
    const timer = setTimeout(() => initializeViewer(), 100);
    return () => { clearTimeout(timer); cleanupViewer(); };
  }, [selectedDzi]);

  useEffect(() => {
    if (osdViewer.current && osdViewer.current.isOpen() && savedAnnotations.length > 0) {
      clearOldOverlays();
      addSavedAnnotationOverlays();
    }
  }, [savedAnnotations]);

  useEffect(() => {
    if (osdViewer.current && osdViewer.current.isOpen()) {
      const updateHandler = () => {
        if (savedAnnotations.length > 0) updateOverlayPositions();
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

  const initializeViewer = () => {
    if (osdViewer.current || !viewerRef.current) return;
    setIsLoading(true);
    const isDzi = selectedDzi.endsWith('.dzi');
    const src = imageMode === 'sample' ? selectedDzi : `${API_BASE}${selectedDzi}`;
    const tileSource = isDzi ? src : { type: 'image', url: src, buildPyramid: false };

    osdViewer.current = OpenSeadragon({
      element: viewerRef.current,
      prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/",
      tileSources: tileSource,
      showNavigationControl: true,
      showNavigator: true,
      navigatorSizeRatio: 0.15,
      defaultZoomLevel: 0,
      minZoomLevel: 0.1,
      maxZoomLevel: isDzi ? 20 : 8,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true, dragToPan: true, scrollToZoom: true, pinchToZoom: true },
      timeout: 30000,
    });

    osdViewer.current.addHandler('open', () => {
      setIsLoading(false);
      const tiledImage = osdViewer.current.world.getItemAt(0);
      const dimensions = tiledImage.getContentSize();
      setImageDimensions({ width: dimensions.x, height: dimensions.y });
      initializeAnnotations();
      setStatusMsg("Image loaded successfully");
    });

    osdViewer.current.addHandler('open-failed', () => {
      setIsLoading(false);
      setStatusMsg("Failed to load image");
    });
  };

  const initializeAnnotations = () => {
    if (!osdViewer.current || annotatorRef.current) return;
    annotatorRef.current = createOSDAnnotator(osdViewer.current, {
      drawingEnabled: false, drawingMode: 'drag', autoSave: false,
      style: { stroke: '#00ff00', strokeWidth: 2, fill: 'rgba(0, 255, 0, 0.15)' }
    });
    annotatorRef.current.setDrawingTool('polygon');
    const updateCount = () => setAnnotationCount(annotatorRef.current.getAnnotations().length);
    annotatorRef.current.on('createAnnotation', updateCount);
    annotatorRef.current.on('deleteAnnotation', updateCount);
  };

  const clearOldOverlays = () => {
    overlayRefs.current.forEach(o => { if (o && o.parentNode) o.parentNode.removeChild(o); });
    overlayRefs.current = [];
  };

  const updateOverlayPositions = () => {
    if (!osdViewer.current || overlayRefs.current.length === 0) return;
    overlayRefs.current.forEach((svgEl, idx) => {
      const ann = savedAnnotations[idx];
      if (!ann || !ann.points) return;
      const polygon = svgEl.querySelector('polygon');
      if (!polygon) return;
      const pts = ann.points.map(p => {
        const vp = osdViewer.current.viewport.imageToViewportCoordinates(new OpenSeadragon.Point(p[0], p[1]));
        return osdViewer.current.viewport.viewportToViewerElementCoordinates(vp);
      });
      polygon.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
    });
  };

  const addSavedAnnotationOverlays = () => {
    if (!osdViewer.current || !osdViewer.current.isOpen() || savedAnnotations.length === 0) return;
    const svgNS = "http://www.w3.org/2000/svg";
    const container = osdViewer.current.canvas;
    savedAnnotations.forEach((ann) => {
      if (ann.type === 'polygon' && ann.points && ann.points.length > 0) {
        const svg = document.createElementNS(svgNS, "svg");
        svg.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:10";
        const pts = ann.points.map(p => {
          const vp = osdViewer.current.viewport.imageToViewportCoordinates(new OpenSeadragon.Point(p[0], p[1]));
          return osdViewer.current.viewport.viewportToViewerElementCoordinates(vp);
        });
        const polygon = document.createElementNS(svgNS, "polygon");
        polygon.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(' '));
        polygon.setAttribute("fill", "rgba(0, 255, 0, 0.2)");
        polygon.setAttribute("stroke", "lime");
        polygon.setAttribute("stroke-width", "3");
        svg.appendChild(polygon);
        container.appendChild(svg);
        overlayRefs.current.push(svg);
      }
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
    if (annotatorRef.current && window.confirm('Clear all unsaved annotations?')) {
      annotatorRef.current.clearAnnotations();
    }
  };

  const saveAnnotations = async () => {
    if (!annotatorRef.current) return;
    const annotations = annotatorRef.current.getAnnotations();
    if (annotations.length === 0) { alert('No annotations to save!'); return; }
    setIsSaving(true);
    try {
      const formatted = annotations.map(a => {
        const s = a.target.selector;
        if (s.type === 'POLYGON' && s.geometry && s.geometry.points) {
          return { type: 'polygon', points: s.geometry.points, label: "oil_spill", score: 1.0, id: a.id || `polygon_${Date.now()}` };
        }
        return null;
      }).filter(Boolean);
      if (formatted.length === 0) { alert('No valid polygon annotations!'); setIsSaving(false); return; }
      setSavedAnnotations(prev => [...prev, ...formatted]);
      annotatorRef.current.clearAnnotations();
      alert(`Saved ${formatted.length} polygon(s)!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadAnnotationsJSON = () => {
    if (!imageDimensions) { alert('Wait for image to load'); return; }
    if (savedAnnotations.length === 0) { alert('No annotations to download!'); return; }
    const exportData = {
      imageId, imageDimensions,
      timestamp: new Date().toISOString(),
      annotations: savedAnnotations.map(a => ({ ...a, type: 'manual_annotation', annotation_type: 'polygon', label: 'oil_spill', score: 1.0 })),
      metadata: { totalAnnotations: savedAnnotations.length, annotationType: 'polygon', label: 'oil_spill' }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `oil_spill_annotations_${imageId}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const cleanupViewer = () => {
    clearOldOverlays();
    if (annotatorRef.current) { annotatorRef.current.destroy(); annotatorRef.current = null; }
    if (osdViewer.current) { osdViewer.current.destroy(); osdViewer.current = null; }
  };

  const handleSelectDzi = (dziPath) => {
    setSelectedDzi(dziPath);
    setImageId(dziPath.split("/").pop().replace(".dzi", ""));
    setSavedAnnotations([]); setAnnotationCount(0);
    setStatusMsg("Loading image...");
  };

  const resetToSelection = () => {
    cleanupViewer();
    setImageMode(null); setSelectedDzi(null); setImageId(null);
    setSavedAnnotations([]); setAnnotationCount(0); setStatusMsg(""); setDziList([]);
  };

  // ── Selection Screen ──
  if (!imageMode) {
    return (
      <div className="container max-w-5xl mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Droplet className="h-6 w-6 text-orange-500" />
              <div>
                <CardTitle>Oil Spill Annotation Tool</CardTitle>
                <CardDescription>Choose how to load images for polygon annotation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:border-primary transition-colors relative">
                <CardContent className="pt-6">
                  <input ref={fileInputRef} type="file" accept=".tif,.tiff" onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={isUploading} />
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-orange-500/10">
                      {isUploading ? <Loader2 className="h-6 w-6 text-orange-500 animate-spin" /> : <Upload className="h-6 w-6 text-orange-500" />}
                    </div>
                    <div>
                      <h3 className="font-semibold">{isUploading ? 'Processing...' : 'Upload TIFF Image'}</h3>
                      <p className="text-sm text-muted-foreground">{uploadProgress || 'Upload SAR TIFF → auto-generate DZI → annotate'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={loadSampleImages}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-orange-500/10">
                      <FileImage className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Sample Image</h3>
                      <p className="text-sm text-muted-foreground">Annotate pre-loaded sample image</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Separator />
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Or load precomputed DZI from backend</p>
              <Button variant="secondary" onClick={fetchBackendImages} disabled={isLoadingList}>
                {isLoadingList ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : 'Load Backend Images'}
              </Button>
              {statusMsg && <p className="text-sm text-muted-foreground">{statusMsg}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Workspace ──
  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-6">
      {imageMode === 'backend' && !selectedDzi && (
        <Card>
          <CardHeader><CardTitle>Select Image</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Available Images</Label>
              <Select onValueChange={handleSelectDzi}>
                <SelectTrigger><SelectValue placeholder="Select image" /></SelectTrigger>
                <SelectContent>
                  {dziList.map((item, idx) => <SelectItem key={idx} value={item.dzi}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={resetToSelection}>← Change Source</Button>
          </CardContent>
        </Card>
      )}

      {imageMode === 'backend' && selectedDzi && (
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-mono">{imageId}</Badge>
              {imageDimensions && <Badge variant="outline" className="font-mono text-xs">{imageDimensions.width} × {imageDimensions.height}</Badge>}
            </div>
            <Button variant="outline" size="sm" onClick={resetToSelection}>Change Source</Button>
          </div>
        </CardContent></Card>
      )}

      {imageMode === 'sample' && (
        <Alert><Info className="h-4 w-4" /><AlertDescription className="flex items-center justify-between">
          <span>Annotating sample image</span>
          <Button variant="link" size="sm" onClick={resetToSelection}>Change</Button>
        </AlertDescription></Alert>
      )}

      {selectedDzi && (
        <>
          <Card><CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-mono font-bold">Active: {annotationCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-lime-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-mono font-bold">Saved: {savedAnnotations.length}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={toggleDrawingMode} size="sm" variant={isDrawingMode ? "default" : "secondary"} className={isDrawingMode ? "animate-pulse" : ""}>
                  {isDrawingMode ? (<><Pencil className="h-4 w-4 mr-1" /> Drawing</>) : (<><Search className="h-4 w-4 mr-1" /> Pan/Zoom</>)}
                </Button>
                {isDrawingMode && (<>
                  <Button onClick={clearAllAnnotations} size="sm" variant="destructive" disabled={annotationCount === 0}><Trash2 className="h-4 w-4 mr-2" />Clear</Button>
                  <Button onClick={saveAnnotations} size="sm" disabled={isSaving || annotationCount === 0}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save
                  </Button>
                </>)}
                {!isDrawingMode && savedAnnotations.length > 0 && (
                  <Button onClick={downloadAnnotationsJSON} size="sm" variant="secondary"><Download className="h-4 w-4 mr-2" />Download JSON</Button>
                )}
              </div>
            </div>
          </CardContent></Card>

          <Card>
            <CardHeader><CardTitle>Polygon Annotation Workspace</CardTitle>
              <CardDescription>{isDrawingMode ? "Click to add polygon points • ENTER to finish • ESC to cancel" : "Enable drawing mode to annotate oil spills"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {isLoading && (
                  <div className="w-full h-[80vh] flex items-center justify-center bg-black rounded-md border">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
                      <div className="font-mono text-sm">Loading Image...</div>
                    </div>
                  </div>
                )}
                <div ref={viewerRef} className="w-full h-[80vh] bg-black rounded-md border" style={{ display: isLoading ? 'none' : 'block' }} />
                {isDrawingMode && (
                  <div className="absolute bottom-4 left-4 px-4 py-2 rounded-lg bg-orange-900/90 border border-orange-600 text-white font-mono text-sm z-20">
                    <div className="font-bold mb-1 flex items-center gap-1"><Pencil className="h-3 w-3" /> Polygon Drawing Mode</div>
                    <div className="text-gray-200 text-xs">Click to add points • ENTER to finish</div>
                    <div className="text-yellow-300 mt-1 text-xs flex items-center gap-1"><Save className="h-3 w-3" /> Click SAVE to persist</div>
                  </div>
                )}
                {savedAnnotations.length > 0 && (
                  <div className="absolute top-4 right-4 bg-black/80 border border-gray-600 p-2 rounded text-xs font-mono space-y-1 z-20">
                    <div className="flex items-center gap-2"><div className="w-3 h-2 bg-green-500 border border-green-600"></div><span className="text-white">Active</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-2 bg-lime-500 border border-lime-600"></div><span className="text-white">Saved ({savedAnnotations.length})</span></div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {statusMsg && <Alert><Info className="h-4 w-4" /><AlertDescription>{statusMsg}</AlertDescription></Alert>}
        </>
      )}

      <style>{`
        svg.a9s-annotationlayer .a9s-selection .a9s-outer,
        svg.a9s-annotationlayer .a9s-annotation .a9s-outer { stroke: #00ff00; stroke-width: 2; fill: rgba(0, 255, 0, 0.1); }
        svg.a9s-annotationlayer .a9s-selection .a9s-inner,
        svg.a9s-annotationlayer .a9s-annotation .a9s-inner { stroke: #00ff00; stroke-width: 2; stroke-dasharray: 5; fill: rgba(0, 255, 0, 0.15); }
        svg.a9s-annotationlayer .a9s-annotation.editable:hover .a9s-inner { fill: rgba(0, 255, 0, 0.25); }
        svg.a9s-annotationlayer .a9s-handle .a9s-handle-inner { fill: #00ff00; stroke: #00ff00; }
        .saved-polygon-overlay { pointer-events: none !important; }
      `}</style>
    </div>
  );
};

export default OilSpillAnnotationPage;