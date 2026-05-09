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
import { Upload, FileImage, Loader2, Play, Info, Droplet, AlertCircle } from 'lucide-react';

const AdvancedOilSpillViewer = () => {
  const navigate = useNavigate();
  const [imageMode, setImageMode] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [dziList, setDziList] = useState([]);
  const [selectedDzi, setSelectedDzi] = useState(null);
  const [imageId, setImageId] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [viewerError, setViewerError] = useState(null);
  const [polygonData, setPolygonData] = useState([]);
  const [pollInterval, setPollInterval] = useState(null);
  
  const osdLeftRef = useRef(null);
  const osdCenterRef = useRef(null);
  const osdRightRef = useRef(null);
  const syncingRef = useRef(false);

  const sampleData = {
    original: "/actual.png",
    mask: "/merged_mask.png",
    overlay: "/overlayed_fullres.png"
  };

  useEffect(() => {
    if (imageMode === 'sample') {
      fetch('/merged_polygons.json')
        .then(response => response.json())
        .then(data => {
          setPolygonData(Array.isArray(data) ? data : []);
        })
        .catch(error => {
          console.warn('Failed to load polygon data:', error);
          setPolygonData([]);
        });
    }
  }, [imageMode]);

  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  const fetchBackendImages = async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch("http://localhost:3000/api/dzi/oilspill");
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
    setSelectedDzi(sampleData.original);
    setImageId('sample_image');
    setPolygonData([]);
  };

  useEffect(() => {
    if (!selectedDzi) return;

    if (osdLeftRef.current) osdLeftRef.current.destroy();
    if (osdCenterRef.current) osdCenterRef.current.destroy();
    if (osdRightRef.current) osdRightRef.current.destroy();

    try {
      if (imageMode === 'sample') {
        initializeSampleViewers();
      } else if (imageMode === 'backend') {
        initializeBackendViewers(imageId);
      }
    } catch (err) {
      console.error("Error initializing viewers:", err);
      setViewerError("Failed to initialize viewers");
    }

    return () => {
      if (osdLeftRef.current) osdLeftRef.current.destroy();
      if (osdCenterRef.current) osdCenterRef.current.destroy();
      if (osdRightRef.current) osdRightRef.current.destroy();
      osdLeftRef.current = null;
      osdCenterRef.current = null;
      osdRightRef.current = null;
    };
  }, [selectedDzi, imageMode]);

  const initializeSampleViewers = () => {
    const leftViewer = OpenSeadragon({
      id: "osd-viewer-left",
      prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
      tileSources: {
        type: 'image',
        url: sampleData.original,
        buildPyramid: false
      },
      showNavigator: true,
      navigatorSizeRatio: 0.15,
      visibilityRatio: 1,
      minZoomLevel: 0.1,
      maxZoomLevel: 8,
    });

    const centerViewer = OpenSeadragon({
      id: "osd-viewer-center",
      prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
      tileSources: {
        type: 'image',
        url: sampleData.mask,
        buildPyramid: false
      },
      showNavigator: true,
      navigatorSizeRatio: 0.15,
      visibilityRatio: 1,
      minZoomLevel: 0.1,
      maxZoomLevel: 8,
    });

    const rightViewer = OpenSeadragon({
      id: "osd-viewer-right",
      prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
      tileSources: {
        type: 'image',
        url: sampleData.overlay,
        buildPyramid: false
      },
      showNavigator: true,
      navigatorSizeRatio: 0.15,
      visibilityRatio: 1,
      minZoomLevel: 0.1,
      maxZoomLevel: 8,
    });

    osdLeftRef.current = leftViewer;
    osdCenterRef.current = centerViewer;
    osdRightRef.current = rightViewer;

    setupViewportSync([leftViewer, centerViewer, rightViewer]);
    setStatusMsg("Sample images loaded successfully");
  };

  const initializeBackendViewers = async (imgId) => {
    const baseUrl = "http://localhost:3000";
    
    try {
      // Fetch detection outputs to check if mask exists
      const res = await fetch(`${baseUrl}/api/images/outputs/oilspill`);
      
      if (res.ok) {
        const data = await res.json();
        const outputsList = data.items || [];
        
        // Find output by matching imageId in the dziFile name
        const imageOutput = outputsList.find(item => 
          item.dziFile && item.dziFile.includes(imgId)
        );
        
        if (imageOutput) {
          setDetectionResult(imageOutput);
          
          // Construct URLs based on API response structure
          const originalDzi = `/tiles/oilspill/${imgId}.dzi`;
          const maskDzi = `/outputs/oilspill/${imageOutput.dziFile}`;
          
          console.log("Loading DZIs:", {
            original: originalDzi,
            mask: maskDzi,
            dziFile: imageOutput.dziFile
          });
          
          const leftViewer = OpenSeadragon({
            id: "osd-viewer-left",
            prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
            tileSources: `${baseUrl}${originalDzi}`,
            showNavigator: true,
            navigatorSizeRatio: 0.15,
            visibilityRatio: 1,
            minZoomLevel: 0.1,
            maxZoomLevel: 20,
          });

          const centerViewer = OpenSeadragon({
            id: "osd-viewer-center",
            prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
            tileSources: `${baseUrl}${maskDzi}`,
            showNavigator: true,
            navigatorSizeRatio: 0.15,
            visibilityRatio: 1,
            minZoomLevel: 0.1,
            maxZoomLevel: 20,
          });

          const rightViewer = OpenSeadragon({
            id: "osd-viewer-right",
            prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
            tileSources: `${baseUrl}${maskDzi}`,
            showNavigator: true,
            navigatorSizeRatio: 0.15,
            visibilityRatio: 1,
            minZoomLevel: 0.1,
            maxZoomLevel: 20,
          });

          osdLeftRef.current = leftViewer;
          osdCenterRef.current = centerViewer;
          osdRightRef.current = rightViewer;

          setupViewportSync([leftViewer, centerViewer, rightViewer]);
          setStatusMsg("Detection results loaded successfully");
        } else {
          // No detection results - show original only
          setDetectionResult(null);
          const originalDzi = `/tiles/oilspill/${imgId}.dzi`;
          
          const leftViewer = OpenSeadragon({
            id: "osd-viewer-left",
            prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
            tileSources: `${baseUrl}${originalDzi}`,
            showNavigator: true,
            navigatorSizeRatio: 0.15,
            visibilityRatio: 1,
            minZoomLevel: 0.1,
            maxZoomLevel: 20,
          });

          const placeholderViewer1 = OpenSeadragon({
            id: "osd-viewer-center",
            prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
            tileSources: `${baseUrl}${originalDzi}`,
            showNavigator: true,
            navigatorSizeRatio: 0.15,
            visibilityRatio: 1,
            minZoomLevel: 0.1,
            maxZoomLevel: 20,
          });

          const placeholderViewer2 = OpenSeadragon({
            id: "osd-viewer-right",
            prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
            tileSources: `${baseUrl}${originalDzi}`,
            showNavigator: true,
            navigatorSizeRatio: 0.15,
            visibilityRatio: 1,
            minZoomLevel: 0.1,
            maxZoomLevel: 20,
          });

          osdLeftRef.current = leftViewer;
          osdCenterRef.current = placeholderViewer1;
          osdRightRef.current = placeholderViewer2;

          setupViewportSync([leftViewer, placeholderViewer1, placeholderViewer2]);
          setStatusMsg("No detection results found. Run detection to generate masks.");
        }
      } else {
        throw new Error('Failed to fetch outputs');
      }
    } catch (err) {
      console.error("Error loading backend images:", err);
      setStatusMsg("Failed to load images");
      setViewerError(err.message);
    }
  };

  const setupViewportSync = (viewers) => {
    viewers.forEach((leadViewer, leadIndex) => {
      leadViewer.addHandler('zoom', (event) => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        
        const zoom = event.zoom;
        const refPoint = event.refPoint || leadViewer.viewport.getCenter();
        
        viewers.forEach((viewer, index) => {
          if (index !== leadIndex && viewer) {
            viewer.viewport.zoomTo(zoom, refPoint, true);
          }
        });
        
        syncingRef.current = false;
      });

      leadViewer.addHandler('pan', (event) => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        
        const center = leadViewer.viewport.getCenter();
        
        viewers.forEach((viewer, index) => {
          if (index !== leadIndex && viewer) {
            viewer.viewport.panTo(center, true);
          }
        });
        
        syncingRef.current = false;
      });

      leadViewer.addHandler('rotate', (event) => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        
        const degrees = event.degrees;
        
        viewers.forEach((viewer, index) => {
          if (index !== leadIndex && viewer) {
            viewer.viewport.setRotation(degrees, true);
          }
        });
        
        syncingRef.current = false;
      });
    });
  };

  const startDetection = async () => {
    if (!imageId) return;
    setLoading(true);
    setStatusMsg("Starting oil spill detection...");
    
    try {
      const res = await fetch(`http://localhost:3000/api/detect/oilspill/${imageId}`, { 
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
              setStatusMsg("Detection completed! Reloading results...");
              setLoading(false);
              setTimeout(() => {
                // Force re-initialization
                setSelectedDzi(null);
                setTimeout(() => {
                  setSelectedDzi(`/tiles/oilspill/${imageId}.dzi`);
                }, 100);
              }, 1000);
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

  const handleSelectDzi = (dziPath) => {
    const imgId = dziPath.split("/").pop().replace(".dzi", "");
    setSelectedDzi(dziPath);
    setImageId(imgId);
    setStatusMsg("Loading image...");
  };

  if (!imageMode) {
    return (
      <div className="container max-w-5xl mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Droplet className="h-6 w-6 text-primary" />
              <CardTitle>Oil Spill Detection Viewer</CardTitle>
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
                      <p className="text-sm text-muted-foreground">Upload SAR images for analysis</p>
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
            <CardDescription>Select an image to view and detect oil spills</CardDescription>
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
                setDetectionResult(null);
                setPolygonData([]);
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
            <div className="flex items-center gap-2">
              <span>Viewing sample images with pre-computed detection</span>
              {polygonData.length > 0 && (
                <Badge variant="outline">
                  {polygonData.length} oil spills detected
                </Badge>
              )}
            </div>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => {
                setImageMode(null);
                setSelectedDzi(null);
                setImageId(null);
                setDetectionResult(null);
                setPolygonData([]);
              }}
            >
              Change
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {viewerError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{viewerError}</AlertDescription>
        </Alert>
      )}

      {selectedDzi && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  {imageMode === 'backend' && !detectionResult && (
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
                  {detectionResult && (
                    <div className="flex items-center gap-2">
                      <Droplet className="h-4 w-4 text-primary" />
                      <Badge variant="secondary">Detection Complete</Badge>
                    </div>
                  )}
                  {imageMode === 'sample' && (
                    <div className="flex items-center gap-2">
                      <Droplet className="h-4 w-4 text-green-500" />
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
              <CardTitle>Multi-View Comparison</CardTitle>
              <CardDescription>
                Synchronized viewers for comprehensive analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Original SAR Image</Label>
                  <div 
                    id="osd-viewer-left" 
                    className="w-full h-[70vh] bg-black rounded-md border" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Detection Mask</Label>
                  <div 
                    id="osd-viewer-center" 
                    className="w-full h-[70vh] bg-black rounded-md border" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Detection Overlay</Label>
                  <div 
                    id="osd-viewer-right" 
                    className="w-full h-[70vh] bg-black rounded-md border" 
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

export default AdvancedOilSpillViewer;