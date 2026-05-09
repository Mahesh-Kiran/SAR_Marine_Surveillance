import React, { useEffect, useState, useRef } from "react";
import OpenSeadragon from "openseadragon";
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Image as ImageIcon, Loader2, Play, Info, Ship, RefreshCw } from 'lucide-react';
import sampledetections from '../detections.json';

const ShipViewer = () => {
  const navigate = useNavigate();
  const [imageMode, setImageMode] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [dziList, setDziList] = useState([]);
  const [selectedDzi, setSelectedDzi] = useState(null);
  const [imageId, setImageId] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [pollInterval, setPollInterval] = useState(null);
  const [hasDetectionRun, setHasDetectionRun] = useState(false);
  
  const viewerLeftRef = useRef(null);
  const viewerRightRef = useRef(null);
  const syncingRef = useRef(false);
  const pendingDetectionsRef = useRef([]);

  const sampleDziPath = "/output_dzi.dzi";

  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

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

  const loadDetections = async (imgId) => {
    try {
      setStatusMsg("Loading detections...");
      const res = await fetch(`http://localhost:3000/api/detect/ship/${imgId}`);
      
      if (res.status === 404) {
        setDetections([]);
        setHasDetectionRun(false);
        setStatusMsg("No detections found. Run detection first.");
      } else if (res.ok) {
        const data = await res.json();
        const detectionsArray = data.detections || [];
        console.log('🚢 Loaded detections:', detectionsArray);
        setDetections(detectionsArray);
        pendingDetectionsRef.current = detectionsArray;
        setHasDetectionRun(true);
        setStatusMsg(`${detectionsArray.length} ship(s) detected`);
      } else {
        setDetections([]);
        setHasDetectionRun(false);
        setStatusMsg("Failed to fetch detections");
      }
    } catch (err) {
      console.error("Error loading detections:", err);
      setDetections([]);
      setHasDetectionRun(false);
      setStatusMsg("Error fetching detections");
    }
  };

  const drawOverlays = (viewer, boxes) => {
    if (!viewer || !boxes || boxes.length === 0) {
      console.log('❌ Cannot draw overlays');
      return;
    }

    console.log(` Drawing ${boxes.length} overlays...`);

    boxes.forEach((b, index) => {
      const elt = document.createElement("div");
      elt.style.border = "1px solid #ef4444";
      elt.style.background = "rgba(239, 68, 68, 0.2)";
      elt.style.pointerEvents = "none";
      elt.style.boxSizing = "border-box";
      elt.title = `Ship ${index + 1}`;

      const rect = viewer.viewport.imageToViewportRectangle(
        new OpenSeadragon.Rect(
          parseFloat(b.x),
          parseFloat(b.y),
          parseFloat(b.w),
          parseFloat(b.h)
        )
      );

      viewer.addOverlay({
        element: elt,
        location: rect,
      });

      console.log(` Drew overlay ${index + 1}`);
    });

    console.log(` Finished drawing ${boxes.length} overlays`);
  };

  useEffect(() => {
    if (!selectedDzi) return;

    if (viewerLeftRef.current) {
      viewerLeftRef.current.destroy();
      viewerLeftRef.current = null;
    }
    if (viewerRightRef.current) {
      viewerRightRef.current.destroy();
      viewerRightRef.current = null;
    }

    const dziSource = imageMode === 'sample' ? selectedDzi : `http://localhost:3000${selectedDzi}`;

    try {
      const leftViewer = OpenSeadragon({
        element: document.getElementById("osd-viewer-left"),
        prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
        tileSources: dziSource,
        showNavigator: true,
        navigatorSizeRatio: 0.15,
        visibilityRatio: 1,
        minZoomLevel: 0.1,
        maxZoomLevel: 20,
      });

      const rightViewer = OpenSeadragon({
        element: document.getElementById("osd-viewer-right"),
        prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
        tileSources: dziSource,
        showNavigator: true,
        navigatorSizeRatio: 0.15,
        visibilityRatio: 1,
        minZoomLevel: 0.1,
        maxZoomLevel: 20,
      });

      // For sample mode, draw on open
      if (imageMode === 'sample') {
        rightViewer.addHandler("open", () => {
          console.log('🔵 Sample mode: Drawing sample detections on open');
          drawOverlays(rightViewer, sampledetections);
        });
      }

      // For backend mode, draw pending detections on open
      rightViewer.addHandler("open", () => {
        console.log('🟢 Right viewer opened');
        
        if (imageMode === 'backend' && pendingDetectionsRef.current.length > 0) {
          console.log('🔴 Backend mode: Drawing pending detections');
          drawOverlays(rightViewer, pendingDetectionsRef.current);
        }
      });

      viewerLeftRef.current = leftViewer;
      viewerRightRef.current = rightViewer;

      // Setup viewport synchronization
      leftViewer.addHandler('zoom', (event) => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        const zoom = event.zoom;
        const refPoint = event.refPoint || leftViewer.viewport.getCenter();
        rightViewer.viewport.zoomTo(zoom, refPoint, true);
        syncingRef.current = false;
      });

      leftViewer.addHandler('pan', () => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        rightViewer.viewport.panTo(leftViewer.viewport.getCenter(), true);
        syncingRef.current = false;
      });

      rightViewer.addHandler('zoom', (event) => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        const zoom = event.zoom;
        const refPoint = event.refPoint || rightViewer.viewport.getCenter();
        leftViewer.viewport.zoomTo(zoom, refPoint, true);
        syncingRef.current = false;
      });

      rightViewer.addHandler('pan', () => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        leftViewer.viewport.panTo(rightViewer.viewport.getCenter(), true);
        syncingRef.current = false;
      });

      // Load detections if backend mode
      if (imageMode === 'backend' && imageId) {
        loadDetections(imageId);
      }
    } catch (err) {
      console.error("Error initializing viewers:", err);
      setStatusMsg("Failed to initialize viewers");
    }

    return () => {
      if (viewerLeftRef.current) viewerLeftRef.current.destroy();
      if (viewerRightRef.current) viewerRightRef.current.destroy();
      viewerLeftRef.current = null;
      viewerRightRef.current = null;
    };
  }, [selectedDzi, imageMode]);

  // When detections change, redraw if viewer is already open
  useEffect(() => {
    if (detections.length > 0 && viewerRightRef.current) {
      const viewer = viewerRightRef.current;
      
      // Check if viewer is already open
      if (viewer.world.getItemCount() > 0) {
        console.log('🟡 Detections changed, redrawing overlays');
        drawOverlays(viewer, detections);
      }
    }
  }, [detections]);

  const startDetection = async () => {
    if (!imageId) return;
    setLoading(true);
    setStatusMsg("Starting ship detection...");
    
    try {
      const res = await fetch(`http://localhost:3000/api/detect/ship/${imageId}`, { 
        method: "POST" 
      });
      const data = await res.json();
      
      if (res.ok && data.accepted) {
        const jobId = data.jobId;
        setStatusMsg(`Detection job started. Polling for results...`);
        
        const interval = setInterval(async () => {
          try {
            const statusRes = await fetch(`http://localhost:3000/api/detect/status/${jobId}`);
            const statusData = await statusRes.json();
            
            if (statusData.status === 'completed') {
              clearInterval(interval);
              setStatusMsg("Detection completed! Loading results...");
              setLoading(false);
              await loadDetections(imageId);
            } else if (statusData.status === 'failed') {
              clearInterval(interval);
              setStatusMsg(`Detection failed: ${statusData.error || 'Unknown error'}`);
              setLoading(false);
            } else {
              setStatusMsg(`Detection in progress (${statusData.status})...`);
            }
          } catch (pollErr) {
            console.error("Error polling job status:", pollErr);
          }
        }, 3000);
        
        setPollInterval(interval);
      } else {
        setStatusMsg(`Failed: ${data.error || data.message || "Unknown error"}`);
        setLoading(false);
      }
    } catch (err) {
      console.error("Detection error:", err);
      setStatusMsg("Error starting detection");
      setLoading(false);
    }
  };

  const refreshOverlays = () => {
    if (detections.length > 0 && viewerRightRef.current) {
      console.log('🔄 Manual refresh triggered');
      viewerRightRef.current.clearOverlays();
      drawOverlays(viewerRightRef.current, detections);
    }
  };

  const handleSelectDzi = (dziPath) => {
    const imgId = dziPath.split("/").pop().replace(".dzi", "");
    setSelectedDzi(dziPath);
    setImageId(imgId);
    setDetections([]);
    pendingDetectionsRef.current = [];
    setHasDetectionRun(false);
    setStatusMsg("Loading image...");
  };

  if (!imageMode) {
    return (
      <div className="container max-w-5xl mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ship className="h-6 w-6 text-primary" />
              <CardTitle>Ship Detection Viewer</CardTitle>
            </div>
            <CardDescription>Choose how to load images for analysis</CardDescription>
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
                      <p className="text-sm text-muted-foreground">Upload SAR images for detection</p>
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
                      <ImageIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Sample Images</h3>
                      <p className="text-sm text-muted-foreground">View pre-loaded sample data</p>
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
            <CardDescription>Select an image to view and detect ships</CardDescription>
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
                if (pollInterval) clearInterval(pollInterval);
                setImageMode(null);
                setSelectedDzi(null);
                setImageId(null);
                setDetections([]);
                pendingDetectionsRef.current = [];
                setHasDetectionRun(false);
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
            <span>Viewing sample image with {sampledetections.length} pre-computed detections</span>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => {
                setImageMode(null);
                setSelectedDzi(null);
                setDetections([]);
                pendingDetectionsRef.current = [];
                setHasDetectionRun(false);
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
                  {imageMode === 'backend' && !hasDetectionRun && (
                    <Button onClick={startDetection} disabled={loading} size="sm">
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Start Detection
                        </>
                      )}
                    </Button>
                  )}
                  {detections.length > 0 && (
                    <>
                      <div className="flex items-center gap-2">
                        <Ship className="h-4 w-4 text-primary" />
                        <Badge variant="secondary">{detections.length} Ship(s) Detected</Badge>
                      </div>
                      <Button onClick={refreshOverlays} size="sm" variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Overlays
                      </Button>
                    </>
                  )}
                  {imageMode === 'sample' && (
                    <div className="flex items-center gap-2">
                      <Ship className="h-4 w-4 text-green-500" />
                      <Badge variant="secondary">Sample Data</Badge>
                    </div>
                  )}
                  <Badge variant="outline" className="gap-1.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Viewport Sync Active
                  </Badge>
                </div>
                {statusMsg && (
                  <span className="text-sm text-muted-foreground">{statusMsg}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dual Viewer Comparison</CardTitle>
              <CardDescription>
                Synchronized viewers for ship detection analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Original SAR Image</Label>
                  <div 
                    id="osd-viewer-left" 
                    className="w-full h-[75vh] bg-black rounded-md border" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Detection Results (Red boxes = ships)</Label>
                  <div 
                    id="osd-viewer-right" 
                    className="w-full h-[75vh] bg-black rounded-md border" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ShipViewer;
