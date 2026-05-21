import React, { useEffect, useRef, useState } from "react";
import OpenSeadragon from "openseadragon";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertCircle, Upload, Image as ImageIcon, Grid3x3, RotateCcw, Home, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const OilSpillValidator = () => {
  const viewerRef = useRef(null);
  const containerRef = useRef(null);
  const osdViewer = useRef(null);

  const [imageFile, setImageFile] = useState(null);
  const [jsonFile, setJsonFile] = useState(null);
  const [selectedDzi, setSelectedDzi] = useState('');
  const [imageSource, setImageSource] = useState('upload');
  const [dziList, setDziList] = useState([]);
  const [isLoadingDzi, setIsLoadingDzi] = useState(false);
  const [annotationData, setAnnotationData] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [imageScale, setImageScale] = useState({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const cleanupViewer = () => {
    if (osdViewer.current) {
      try {
        if (osdViewer.current._annotationUpdateHandler) {
          osdViewer.current.removeHandler('animation', osdViewer.current._annotationUpdateHandler);
          osdViewer.current._annotationUpdateHandler = null;
        }
        
        if (osdViewer.current.canvas) {
          const overlays = osdViewer.current.canvas.querySelectorAll('.saved-polygon-overlay');
          overlays.forEach(overlay => overlay.remove());
        }
        
        osdViewer.current.destroy();
      } catch (e) {
        console.warn('Error destroying OSD viewer:', e);
      }
      osdViewer.current = null;
    }
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
  };

  useEffect(() => {
    return () => {
      cleanupViewer();
    };
  }, []);

  const handleImageSourceChange = (source) => {
    cleanupViewer();
    setImageSource(source);
    setIsImageLoaded(false);
    setImageFile(null);
    setSelectedDzi('');
    setImageDimensions(null);
    setError(null);
    if (source === 'dzi') {
      fetchDziList();
    }
  };

  const fetchDziList = async () => {
    setIsLoadingDzi(true);
    try {
      const res = await fetch(`${API_BASE}/api/dzi/oilspill`);
      if (res.ok) {
        const data = await res.json();
        setDziList(Array.isArray(data) ? data : []);
      } else {
        setDziList([]);
      }
    } catch (err) {
      console.error('Error fetching DZI list:', err);
      setDziList([]);
    } finally {
      setIsLoadingDzi(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setError(null);
      setImageFile(file);
      setIsImageLoaded(false);
      setImageDimensions(null);

      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }

      const url = URL.createObjectURL(file);
      setImageUrl(url);

      const img = new Image();
      img.onload = () => {
        const actualDims = {
          width: img.naturalWidth,
          height: img.naturalHeight
        };
        setImageDimensions(actualDims);
      };
      img.onerror = () => {
        setError('Failed to load image. Please try a different file format.');
      };
      img.src = url;
    }
  };

  const handleDziSelection = (value) => {
    setSelectedDzi(value);
    setImageDimensions(null);
    setIsImageLoaded(false);
    setError(null);
  };

  const handleJsonUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setError(null);
      setJsonFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          
          const polygonAnnotations = data.annotations.filter(a => {
            if (!a.points || !Array.isArray(a.points)) return false;
            if (a.points.length < 3) return false;
            return true;
          });

          setAnnotationData(data);

          const stats = {
            totalAnnotations: polygonAnnotations.length,
            polygonAnnotations: polygonAnnotations.length,
            imageDimensions: data.imageDimensions,
            timestamp: formatTimestamp(data.timestamp),
            collaborative: data.metadata?.collaborative || false,
            collaborators: data.collaborators || [],
            roomId: data.roomId || null
          };
          setStats(stats);
        } catch (err) {
          setError('Invalid JSON file: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const initializeDziViewer = () => {
    if (!selectedDzi || !annotationData) {
      setError('Please select DZI image and upload JSON file');
      return;
    }

    cleanupViewer();
    setError(null);

    try {
      osdViewer.current = OpenSeadragon({
        element: viewerRef.current,
        prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/",
        tileSources: selectedDzi,
        showNavigator: true,
        showNavigationControl: true,
        navigationControlAnchor: OpenSeadragon.ControlAnchor.TOP_LEFT,
        visibilityRatio: 1,
        minZoomLevel: 0.5,
        maxZoomLevel: 10,
        gestureSettingsMouse: {
          clickToZoom: false,
          dblClickToZoom: true,
          dragToPan: true,
          scrollToZoom: true,
        }
      });

      osdViewer.current.addHandler("open", () => {
        setIsImageLoaded(true);

        const tiledImage = osdViewer.current.world.getItemAt(0);
        const actualDimensions = tiledImage.getContentSize();
        setImageDimensions({ width: actualDimensions.x, height: actualDimensions.y });

        if (annotationData.imageDimensions) {
          if (actualDimensions.x !== annotationData.imageDimensions.width ||
            actualDimensions.y !== annotationData.imageDimensions.height) {
            setError(`Dimension mismatch: Image ${actualDimensions.x}×${actualDimensions.y}, JSON ${annotationData.imageDimensions.width}×${annotationData.imageDimensions.height}`);
          }
        }

        addDziAnnotationOverlays();
      });

    } catch (err) {
      setError('Error initializing DZI viewer: ' + err.message);
    }
  };

  const addDziAnnotationOverlays = () => {
    if (!osdViewer.current || !annotationData) return;

    const polygonAnnotations = annotationData.annotations.filter(a => a.points && Array.isArray(a.points) && a.points.length >= 3);
    const svgNS = "http://www.w3.org/2000/svg";
    const container = osdViewer.current.canvas;

    polygonAnnotations.forEach((annotation, index) => {
      const { points, label } = annotation;

      if (!points || points.length < 3) return;

      const cleanPoints = points.filter((point, i) => {
        if (i === 0) return true;
        const prev = points[i - 1];
        return !(point[0] === prev[0] && point[1] === prev[1]);
      });

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

      const viewportPoints = cleanPoints.map(point => {
        const imgPoint = new OpenSeadragon.Point(point[0], point[1]);
        const vpPoint = osdViewer.current.viewport.imageToViewportCoordinates(imgPoint);
        return osdViewer.current.viewport.viewportToViewerElementCoordinates(vpPoint);
      });

      const polygon = document.createElementNS(svgNS, "polygon");
      const pointsStr = viewportPoints.map(p => `${p.x},${p.y}`).join(' ');
      polygon.setAttribute("points", pointsStr);
      polygon.setAttribute("fill", `${annotation.color || '#ef4444'}33`);
      polygon.setAttribute("stroke", annotation.color || '#ef4444');
      polygon.setAttribute("stroke-width", "2");

      svg.appendChild(polygon);

      const minX = Math.min(...viewportPoints.map(p => p.x));
      const minY = Math.min(...viewportPoints.map(p => p.y));

      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", minX);
      text.setAttribute("y", minY - 10);
      text.setAttribute("fill", annotation.color || '#ef4444');
      text.setAttribute("font-size", "12");
      text.setAttribute("font-weight", "600");
      text.setAttribute("font-family", "monospace");
      text.textContent = annotation.drawnBy
        ? `${index + 1}: ${label || 'oil_spill'} — ${annotation.drawnBy}`
        : `${index + 1}: ${label || 'oil_spill'} (${cleanPoints.length})`;
      svg.appendChild(text);

      container.appendChild(svg);
    });

    const updateHandler = () => {
      const overlays = container.querySelectorAll('.saved-polygon-overlay');
      overlays.forEach(overlay => overlay.remove());
      addDziAnnotationOverlays();
    };

    if (osdViewer.current._annotationUpdateHandler) {
      osdViewer.current.removeHandler('animation', osdViewer.current._annotationUpdateHandler);
    }

    osdViewer.current._annotationUpdateHandler = updateHandler;
    osdViewer.current.addHandler('animation', updateHandler);
  };

  const calculateImageScale = () => {
    if (!viewerRef.current || !imageDimensions) return;

    const img = viewerRef.current.querySelector('img');
    if (!img) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    const scaleX = (img.clientWidth * zoom) / imageDimensions.width;
    const scaleY = (img.clientHeight * zoom) / imageDimensions.height;
    const offsetX = imgRect.left - containerRect.left + pan.x;
    const offsetY = imgRect.top - containerRect.top + pan.y;

    setImageScale({ scaleX, scaleY, offsetX, offsetY });
  };

  const renderRegularImageAnnotations = () => {
    if (!imageUrl || !annotationData) {
      setError('Please upload both image and JSON file');
      return;
    }

    setError(null);
    setIsImageLoaded(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });

    if (imageDimensions && annotationData.imageDimensions) {
      if (imageDimensions.width !== annotationData.imageDimensions.width ||
        imageDimensions.height !== annotationData.imageDimensions.height) {
        setError(`Dimension mismatch: Image ${imageDimensions.width}×${imageDimensions.height}, JSON ${annotationData.imageDimensions.width}×${annotationData.imageDimensions.height}`);
      }
    }

    setTimeout(calculateImageScale, 100);
  };

  const handleRenderClick = () => {
    if (imageSource === 'dzi') {
      initializeDziViewer();
    } else {
      renderRegularImageAnnotations();
    }
  };

  const handleWheel = (e) => {
    if (!isImageLoaded || imageSource === 'dzi') return;

    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.5, zoom + delta), 5);
    setZoom(newZoom);

    setTimeout(calculateImageScale, 10);
  };

  const handleMouseDown = (e) => {
    if (!isImageLoaded || imageSource === 'dzi') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const newPan = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };
    setPan(newPan);
    setTimeout(calculateImageScale, 10);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    if (imageSource === 'dzi' && osdViewer.current) {
      osdViewer.current.viewport.goHome();
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setTimeout(calculateImageScale, 10);
    }
  };

  const handleReset = () => {
    cleanupViewer();
    setImageFile(null);
    setJsonFile(null);
    setAnnotationData(null);
    setIsImageLoaded(false);
    setImageUrl(null);
    setStats(null);
    setError(null);
    setImageDimensions(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedDzi('');

    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
      input.value = '';
    });
  };

  const getPolygonAnnotations = () => {
    if (!annotationData) return [];
    return annotationData.annotations.filter(a => a.points && Array.isArray(a.points) && a.points.length >= 3);
  };

  const isReadyToRender = () => {
    if (imageSource === 'dzi') {
      return selectedDzi && annotationData;
    } else {
      return imageFile && annotationData;
    }
  };

  const calculatePolygonArea = (points) => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i][0] * points[j][1];
      area -= points[j][0] * points[i][1];
    }
    return Math.abs(area / 2);
  };

  return (
    <div className="space-y-6">
      {/* Image Source Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Image Source</CardTitle>
          <CardDescription>Select image upload method</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={imageSource === 'upload' ? 'default' : 'outline'}
              onClick={() => handleImageSourceChange('upload')}
              className="w-full justify-start gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Image
            </Button>
            <Button
              variant={imageSource === 'dzi' ? 'default' : 'outline'}
              onClick={() => handleImageSourceChange('dzi')}
              className="w-full justify-start gap-2"
            >
              <Grid3x3 className="h-4 w-4" />
              Select DZI
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Image Upload/Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {imageSource === 'upload' ? 'Image File' : 'DZI Image'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {imageSource === 'upload' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="image-upload">Image File</Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
                {imageFile && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-mono">
                      {imageFile.name}
                    </p>
                    {imageDimensions && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {imageDimensions.width} × {imageDimensions.height}
                      </Badge>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dzi-select">DZI Image (Oil Spill)</Label>
                  {isLoadingDzi ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                  ) : (
                    <Select value={selectedDzi} onValueChange={handleDziSelection}>
                      <SelectTrigger id="dzi-select">
                        <SelectValue placeholder={dziList.length === 0 ? 'No DZI images found' : 'Select DZI image'} />
                      </SelectTrigger>
                      <SelectContent>
                        {dziList.map((dzi, idx) => (
                          <SelectItem key={idx} value={`${API_BASE}${dzi.dzi}`}>
                            {dzi.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {selectedDzi && imageDimensions && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {imageDimensions.width} × {imageDimensions.height}
                  </Badge>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* JSON Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Annotations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="json-upload">JSON File</Label>
              <Input
                id="json-upload"
                type="file"
                accept=".json"
                onChange={handleJsonUpload}
              />
            </div>
            {jsonFile && (
              <p className="text-sm text-muted-foreground font-mono">
                {jsonFile.name}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Polygons</p>
                <p className="text-2xl font-bold font-mono">{stats.polygonAnnotations}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expected Size</p>
                <p className="text-sm font-mono">
                  {stats.imageDimensions.width} × {stats.imageDimensions.height}
                </p>
              </div>
              {imageDimensions && (
                <div>
                  <p className="text-sm text-muted-foreground">Actual Size</p>
                  <p className="text-sm font-mono">
                    {imageDimensions.width} × {imageDimensions.height}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Timestamp</p>
                <p className="text-xs font-mono">{stats.timestamp}</p>
              </div>
            </div>
            {stats.collaborative && (
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
                <Badge variant="outline" className="font-mono text-xs">COLLABORATIVE</Badge>
                {stats.roomId && <Badge variant="secondary" className="font-mono text-xs">Room: {stats.roomId}</Badge>}
                {stats.collaborators.map((name, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs font-mono">{name}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleRenderClick}
          disabled={!isReadyToRender()}
          size="lg"
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          Render Annotations
        </Button>

        {isImageLoaded && (
          <Button onClick={resetView} variant="outline" size="lg">
            <Home className="mr-2 h-4 w-4" />
            Reset View
          </Button>
        )}

        <Button onClick={handleReset} variant="outline" size="lg">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset All
        </Button>
      </div>

      {/* Zoom Controls */}
      {isImageLoaded && imageSource === 'upload' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-mono min-w-[80px]">
                Zoom: {(zoom * 100).toFixed(0)}%
              </Label>
              <input
                type="range"
                min="50"
                max="500"
                value={zoom * 100}
                onChange={(e) => {
                  setZoom(parseFloat(e.target.value) / 100);
                  setTimeout(calculateImageScale, 10);
                }}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground min-w-[150px]">
                Scroll zoom • Drag pan
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Viewer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Viewer {imageSource === 'dzi' && '(DZI Mode)'}</span>
            {isImageLoaded && annotationData && (
              <div className="flex items-center gap-2 text-sm font-normal">
                <div className="w-3 h-3 rounded-sm bg-red-500 border border-red-500"></div>
                <span className="text-muted-foreground">Oil Spill Polygons (Red)</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* DZI Viewer */}
          {imageSource === 'dzi' && (
            <div
              ref={viewerRef}
              className="w-full h-[70vh] bg-black rounded-md border"
            >
              {!selectedDzi && !annotationData && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <Grid3x3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Select DZI Image and Upload JSON</p>
                    <p className="text-sm">Choose a tiled image and upload annotations</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Regular Image Viewer */}
          {imageSource === 'upload' && (
            <div
              ref={containerRef}
              className="relative overflow-hidden w-full min-h-[70vh] bg-black rounded-md border"
              style={{
                cursor: isDragging ? 'grabbing' : (isImageLoaded ? 'grab' : 'default')
              }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {!imageFile && !annotationData && (
                <div className="flex items-center justify-center h-full min-h-[70vh]">
                  <div className="text-center text-muted-foreground">
                    <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Upload Files to Start</p>
                    <p className="text-sm">Upload image and JSON file, then render</p>
                  </div>
                </div>
              )}

              {imageUrl && isImageLoaded && (
                <div ref={viewerRef} className="relative flex items-center justify-center p-4">
                  <img
                    src={imageUrl}
                    alt="SAR Image"
                    className="select-none"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '65vh',
                      objectFit: 'contain',
                      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                      transformOrigin: 'center',
                      imageRendering: 'crisp-edges',
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                    onLoad={calculateImageScale}
                    draggable={false}
                  />

                  {annotationData && getPolygonAnnotations().map((annotation, index) => {
                    const { points, label } = annotation;

                    if (!points || points.length < 3) return null;

                    const cleanPoints = points.filter((point, i) => {
                      if (i === 0) return true;
                      const prev = points[i - 1];
                      return !(point[0] === prev[0] && point[1] === prev[1]);
                    });

                    const scaledPoints = cleanPoints.map(p => [
                      imageScale.offsetX + (p[0] * imageScale.scaleX),
                      imageScale.offsetY + (p[1] * imageScale.scaleY)
                    ]);

                    const pointsStr = scaledPoints.map(p => `${p[0]},${p[1]}`).join(' ');
                    const minX = Math.min(...scaledPoints.map(p => p[0]));
                    const minY = Math.min(...scaledPoints.map(p => p[1]));

                    return (
                      <svg
                        key={index}
                        className="absolute pointer-events-none"
                        style={{
                          left: 0,
                          top: 0,
                          width: '100%',
                          height: '100%',
                          overflow: 'visible'
                        }}
                      >
                        <polygon
                          points={pointsStr}
                          fill={`${annotation.color || '#ef4444'}33`}
                          stroke={annotation.color || '#ef4444'}
                          strokeWidth="2"
                        />
                        <text
                          x={minX}
                          y={minY - 10}
                          fill={annotation.color || '#ef4444'}
                          fontSize="12"
                          fontWeight="600"
                          fontFamily="monospace"
                        >
                          {annotation.drawnBy
                            ? `${index + 1}: ${annotation.label} — ${annotation.drawnBy}`
                            : `${index + 1}: ${annotation.label} (${cleanPoints.length})`}
                        </text>
                      </svg>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Annotation Details Table */}
      {annotationData && isImageLoaded && getPolygonAnnotations().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Polygon Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">Label</th>
                    <th className="px-4 py-3 text-left font-medium">Drawn By</th>
                    <th className="px-4 py-3 text-center font-medium">Points</th>
                    <th className="px-4 py-3 text-right font-medium">Area (px²)</th>
                  </tr>
                </thead>
                <tbody>
                  {getPolygonAnnotations().map((ann, idx) => {
                    const area = calculatePolygonArea(ann.points);
                    return (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-4 py-3 font-mono">
                          <span className="flex items-center gap-2">
                            {ann.color && <div className="w-2.5 h-2.5 rounded-full" style={{ background: ann.color }} />}
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">{ann.label}</td>
                        <td className="px-4 py-3 font-mono text-sm">{ann.drawnBy || '—'}</td>
                        <td className="px-4 py-3 text-center font-mono text-muted-foreground">{ann.points.length}</td>
                        <td className="px-4 py-3 text-right font-mono">{area.toFixed(0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <style>{`
        .saved-polygon-overlay {
          pointer-events: none !important;
        }
      `}</style>
    </div>
  );
};

export default OilSpillValidator;
