import React, { useState, useEffect, useRef, useCallback } from 'react';

const ImageViewer = ({ src, isLargeFile = false, detectionResults = null, onProcess, processing = false }) => {
  const [dimensions, setDimensions] = useState(null);
  const [isLarge, setIsLarge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [imageDisplayDimensions, setImageDisplayDimensions] = useState(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [imageInfo, setImageInfo] = useState(null);

  const viewerRef = useRef(null);
  const osdViewerRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const imgElementRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  // Determine if image should use large viewer
  const shouldUseLargeViewer = useCallback((imgSrc, fileFlag) => {
    // Always use large viewer for blob URLs (uploaded files) or large file flag
    return fileFlag || (imgSrc && imgSrc.startsWith('blob:'));
  }, []);

  // Enhanced image loading with better error handling
  useEffect(() => {
    setLoading(true);
    setError(null);
    setViewerReady(false);
    setLoadingProgress(0);
    setImageInfo(null);

    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    const shouldBeLarge = shouldUseLargeViewer(src, isLargeFile);

    if (shouldBeLarge) {
      console.log('Large image detected, preparing OpenSeadragon viewer');
      setIsLarge(true);
      setDimensions({ width: 8000, height: 8000 }); // Large placeholder
      
      // Add loading timeout for very large files
      loadingTimeoutRef.current = setTimeout(() => {
        setLoading(false);
      }, 1000);
      
      return;
    }

    // Progressive loading simulation
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 150);

    // Try to load image for dimension detection
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const cleanup = () => {
      clearInterval(progressInterval);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };

    img.onload = () => {
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      const imgSize = (imgWidth * imgHeight * 4) / (1024 * 1024); // Approximate MB

      setDimensions({ width: imgWidth, height: imgHeight });
      setImageInfo({ width: imgWidth, height: imgHeight, estimatedSize: imgSize });

      // Use large viewer for high-resolution images
      const largeThreshold = 4000;
      const isLargeByDimension = imgWidth >= largeThreshold || imgHeight >= largeThreshold || imgSize > 50;
      
      setIsLarge(isLargeByDimension);
      setLoadingProgress(100);
      
      setTimeout(() => {
        setLoading(false);
        cleanup();
      }, 300);
    };
    
    img.onerror = (e) => {
      console.error('Image load error:', e);
      cleanup();
      setError("Failed to load image. Check file format and size.");
      setLoading(false);
    };

    
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('Image loading timeout');
      cleanup();
      setError("Image loading timeout. File may be too large for direct display.");
      setLoading(false);
    }, 30000); 
    
    img.src = src;
    imageRef.current = img;
    
    return cleanup;
  }, [src, isLargeFile, shouldUseLargeViewer]);

  // Optimized OpenSeadragon initialization
  useEffect(() => {
    if (!isLarge || !viewerRef.current || loading) return;

    console.log('Initializing OpenSeadragon for large image...');
    
    const initializeViewer = async () => {
      try {
        const OpenSeadragon = await import('openseadragon');
        
        // Cleanup existing viewer
        if (osdViewerRef.current) {
          try {
            osdViewerRef.current.destroy();
          } catch (e) {
            console.warn('Error destroying previous viewer:', e);
          }
          osdViewerRef.current = null;
        }

        console.log('Creating optimized OpenSeadragon viewer...');
        
        osdViewerRef.current = OpenSeadragon.default({
          element: viewerRef.current,
          prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
          
          // Image source configuration
          tileSources: {
            type: 'image',
            url: src,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            buildPyramid: false
          },

          // Viewer UI configuration
          showNavigator: true,
          navigatorPosition: 'TOP_RIGHT',
          navigatorSizeRatio: 0.2,
          navigatorBackground: 'rgba(0, 0, 0, 0.8)',
          navigatorBorderColor: '#10b981',
          navigatorOpacity: 0.9,

          // Zoom and pan settings optimized for large images
          defaultZoomLevel: 0,
          minZoomLevel: 0.001, // Allow extreme zoom out
          maxZoomLevel: 100,   // Allow extreme zoom in
          zoomPerClick: 2.0,
          zoomPerScroll: 1.5,
          constrainDuringPan: false,
          visibilityRatio: 0.05,

          // Performance optimizations for large images
          immediateRender: false,
          blendTime: 0.2,
          alwaysBlend: true,
          preserveImageSizeOnResize: true,
          preserveViewport: true,

          // Memory and loading optimizations
          imageLoaderLimit: 2,
          maxImageCacheCount: 200,
          timeout: 900000, // 15 minutes
          loadTilesWithAjax: false,
          ajaxWithCredentials: false,

          // Mouse and touch controls
          panHorizontal: true,
          panVertical: true,
          gestureSettingsMouse: {
            scrollToZoom: true,
            clickToZoom: true,
            dblClickToZoom: true,
            pinchToZoom: true,
            flickEnabled: true,
            flickMinSpeed: 120,
            flickMomentum: 0.25
          },

          // Control visibility
          showRotationControl: false,
          showFlipControl: false,
          showFullPageControl: true,
          showHomeControl: true,
          showZoomControl: true,
          showSequenceControl: false,

          // Animation settings
          springStiffness: 6.5,
          animationTime: 0.8,
          smoothTileEdgesMinZoom: 1.5,

          // System settings
          autoHideControls: true,
          mouseNavEnabled: true,
          debugMode: false,
          silenceMultiImageWarnings: true,

          // Large image specific optimizations
          preload: false,
          wrapHorizontal: false,
          wrapVertical: false,
          homeFillsViewer: false,
          showReferenceStrip: false,
          sequenceMode: false
        });

        // Event handlers with comprehensive error handling
        osdViewerRef.current.addHandler('open', (event) => {
          console.log('OpenSeadragon viewer opened successfully');
          setViewerReady(true);
          setError(null);
          
          // Auto-fit the image
          setTimeout(() => {
            if (osdViewerRef.current && osdViewerRef.current.viewport) {
              try {
                osdViewerRef.current.viewport.goHome(true);
                console.log('Image fitted to viewer');
              } catch (e) {
                console.warn('Error fitting image:', e);
              }
            }
          }, 500);
        });

        osdViewerRef.current.addHandler('open-failed', (event) => {
          console.error('OpenSeadragon failed to open image:', event);
          const errorMsg = event.message || event.source || 'Unknown error';
          setError(`Failed to load image: ${errorMsg}. Try using a smaller image or different format.`);
          setViewerReady(false);
        });

        osdViewerRef.current.addHandler('tile-load-failed', (event) => {
          console.warn('Tile load failed:', event);
          // Don't set error for individual tile failures in large images
        });

        osdViewerRef.current.addHandler('zoom', (event) => {
          if (event.zoom) {
            console.log(`Zoom level: ${event.zoom.toFixed(2)}`);
          }
        });

        // Add error recovery
        osdViewerRef.current.addHandler('canvas-key', (event) => {
          if (event.originalEvent.key === 'r' && event.originalEvent.ctrlKey) {
            // Ctrl+R to reset viewer
            event.preventDefaultAction = true;
            if (osdViewerRef.current) {
              osdViewerRef.current.viewport.goHome(true);
            }
          }
        });

      } catch (err) {
        console.error('OpenSeadragon initialization error:', err);
        setError(`Viewer initialization failed: ${err.message}. Your browser may not support large images.`);
        setViewerReady(false);
      }
    };

    initializeViewer().catch(err => {
      console.error('Failed to load OpenSeadragon:', err);
      setError('Failed to load image viewer library. Please refresh and try again.');
    });

    return () => {
      if (osdViewerRef.current) {
        try {
          osdViewerRef.current.destroy();
          osdViewerRef.current = null;
        } catch (err) {
          console.error('Error destroying OpenSeadragon viewer:', err);
        }
      }
    };
  }, [isLarge, src, loading]);

  // Enhanced bounding box rendering
  useEffect(() => {
    if (!isLarge || !osdViewerRef.current || !detectionResults || !showBoundingBoxes || !dimensions || !viewerReady) {
      return;
    }

    console.log('Adding detection overlays to large image viewer');
    
    try {
      osdViewerRef.current.clearOverlays();
      
      detectionResults.detections.forEach((detection, index) => {
        const [x, y, width, height] = detection.bbox;
        
        // Create overlay element
        const overlay = document.createElement('div');
        overlay.className = 'detection-overlay-large';
        overlay.style.cssText = `
          border: 4px solid #10b981;
          background: rgba(16, 185, 129, 0.2);
          pointer-events: none;
          box-sizing: border-box;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.6);
          transition: all 0.3s ease;
        `;
        
        // Create label
        const label = document.createElement('div');
        label.style.cssText = `
          position: absolute;
          top: -35px;
          left: 0;
          background: rgba(16, 185, 129, 0.95);
          color: white;
          padding: 6px 12px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          font-weight: bold;
          white-space: nowrap;
          border-radius: 4px;
          pointer-events: none;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(2px);
        `;
        label.textContent = `SHIP ${index + 1} (${(detection.confidence * 100).toFixed(1)}%)`;
        overlay.appendChild(label);
        
        // Calculate normalized coordinates
        const rect = new osdViewerRef.current.Rect(
          x / dimensions.width,
          y / dimensions.height,
          width / dimensions.width,
          height / dimensions.height
        );
        
        // Add overlay
        osdViewerRef.current.addOverlay({
          element: overlay,
          location: rect
        });
      });
      
      console.log(`Added ${detectionResults.detections.length} detection overlays to large image`);
    } catch (err) {
      console.error('Error adding overlays to large image:', err);
    }
  }, [isLarge, detectionResults, showBoundingBoxes, dimensions, viewerReady]);

  // Standard image handler
  const handleImageLoad = useCallback(() => {
    if (!imgElementRef.current || !containerRef.current || !dimensions) return;

    const imgElement = imgElementRef.current;
    const imgRect = imgElement.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const scaleX = imgElement.clientWidth / dimensions.width;
    const scaleY = imgElement.clientHeight / dimensions.height;
    
    setImageDisplayDimensions({
      width: imgElement.clientWidth,
      height: imgElement.clientHeight,
      offsetX: imgRect.left - containerRect.left,
      offsetY: imgRect.top - containerRect.top,
      scaleX,
      scaleY
    });
  }, [dimensions]);

  useEffect(() => {
    if (!isLarge && imgElementRef.current && dimensions) {
      const timer = setTimeout(handleImageLoad, 100);
      return () => clearTimeout(timer);
    }
  }, [isLarge, dimensions, detectionResults, handleImageLoad]);

  // Loading state
  if (loading) {
    return (
      <div className="w-full">
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/40 rounded-lg">
          <div className="flex items-center justify-between text-base font-mono">
            <div className="flex items-center space-x-4">
              <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-blue-300 uppercase tracking-wide text-lg">
                {isLargeFile ? 'Processing Large SAR Image' : 'Loading SAR Image'}
              </span>
            </div>
            <span className="text-blue-400 text-xl font-bold">{loadingProgress.toFixed(0)}%</span>
          </div>
          
          <div className="mt-4 w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          
          <div className="mt-3 text-sm text-gray-400 font-mono">
            {isLargeFile 
              ? 'Large files (100MB+) require special handling • High-resolution zoom viewer will be enabled'
              : 'Analyzing image format and dimensions...'
            }
          </div>
        </div>

        <div className="w-full h-[700px] flex items-center justify-center bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-600/40 rounded-lg">
          <div className="text-center">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-400 rounded-full animate-spin mx-auto" />
              <div 
                className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-green-400 rounded-full animate-spin mx-auto"
                style={{ animationDirection: 'reverse', animationDuration: '3s' }}
              />
            </div>
            <p className="text-blue-300 font-mono text-2xl uppercase tracking-wider mb-4">
              Satellite Analysis Ready
            </p>
            <p className="text-gray-400 font-mono text-lg">
              {isLargeFile ? 'Preparing high-resolution viewer...' : 'Analyzing image format...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full">
        <div className="w-full h-[700px] flex items-center justify-center bg-gradient-to-br from-red-900/30 to-gray-900/30 border border-red-500/50 rounded-lg">
          <div className="text-center max-w-2xl">
            <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-red-500/40">
              <span className="text-red-400 text-4xl">⚠</span>
            </div>
            <p className="text-red-400 font-mono text-2xl mb-4 uppercase tracking-wide">Image Load Error</p>
            <p className="text-red-300 font-mono text-lg mb-6">{error}</p>
            <div className="text-sm text-gray-400 font-mono bg-gray-800/50 p-6 rounded border border-gray-600/30">
              <p className="mb-4 text-lg">Troubleshooting large SAR images:</p>
              <ul className="text-left space-y-2">
                <li>• Supported formats: TIFF, PNG, JPEG, WebP</li>
                <li>• Maximum recommended size: 200MB</li>
                <li>• Ensure stable internet connection</li>
                <li>• Try refreshing the page</li>
                <li>• Consider using a smaller preview image</li>
                <li>• Press Ctrl+R in viewer to reset</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main viewer
  return (
    <div className="w-full space-y-6">
      {/* Enhanced status panel */}
      <div className="p-6 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-600/40 rounded-lg backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8 text-base font-mono">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${isLarge ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`} />
              <span className="text-gray-300 uppercase tracking-wide text-lg">
                {isLarge ? 'High-Resolution Zoom Mode' : 'Standard View'}
              </span>
            </div>
            
            {dimensions && (
              <span className="text-blue-300 text-lg font-bold">
                {dimensions.width.toLocaleString()} × {dimensions.height.toLocaleString()}
              </span>
            )}

            {imageInfo && isLarge && (
              <span className="text-yellow-300 text-sm">
                ~{imageInfo.estimatedSize.toFixed(1)}MB
              </span>
            )}
            
            {detectionResults && (
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full" />
                <span className="text-green-300 text-lg">
                  {detectionResults.num_detections || detectionResults.objects_detected} Ships Detected
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-6">
            {detectionResults && (
              <button
                onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                className={`px-4 py-2 rounded border font-mono text-sm uppercase tracking-wide transition-all duration-200 ${
                  showBoundingBoxes 
                    ? 'bg-green-500/20 border-green-500/50 text-green-300 hover:bg-green-500/30' 
                    : 'bg-gray-700/30 border-gray-600/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                {showBoundingBoxes ? '◉ Detections' : '○ Detections'}
              </button>
            )}
            
            {isLarge && (
              <div className="flex items-center space-x-3 text-sm font-mono text-blue-300">
                <span className="text-lg">🔍</span>
                <span>Deep Zoom Active</span>
              </div>
            )}
          </div>
        </div>

        {isLarge && (
          <div className="mt-4 pt-4 border-t border-gray-600/30">
            <div className="flex items-center space-x-6 text-sm font-mono text-gray-400">
              <span>• Mouse wheel: Zoom in/out</span>
              <span>• Click+drag: Pan image</span>
              <span>• Double-click: Zoom to point</span>
              <span>• Home button: Reset view</span>
              <span>• Ctrl+R: Reset viewer</span>
            </div>
          </div>
        )}
      </div>

      {/* Main viewer area */}
      {isLarge ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-600/40 bg-black">
          <div 
            ref={viewerRef} 
            className="w-full h-[750px] bg-black"
          />
          
          {/* Overlay UI elements */}
          <div className="absolute top-6 left-6 bg-black/90 px-6 py-3 rounded border border-blue-500/50 backdrop-blur-sm">
            <div className="flex items-center space-x-4">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-blue-300 font-mono text-base uppercase tracking-wide">
                SAR Deep Zoom System
              </span>
            </div>
            {viewerReady ? (
              <div className="text-sm text-gray-400 font-mono mt-2">
                High-resolution viewer active • {dimensions ? `${dimensions.width}×${dimensions.height}` : 'Loading dimensions...'}
              </div>
            ) : (
              <div className="text-sm text-yellow-400 font-mono mt-2">
                Initializing viewer...
              </div>
            )}
          </div>
       
          <div className="absolute bottom-6 right-6">
            <button
              onClick={onProcess}
              disabled={processing}
              className={`px-8 py-4 font-mono font-bold uppercase tracking-wide text-base transition-all duration-300 rounded border-2 ${
                processing 
                  ? 'bg-gray-700/80 border-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 border-blue-400 text-white hover:shadow-lg hover:shadow-blue-500/25'
              }`}
            >
              {processing ? (
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span>Processing</span>
                </div>
              ) : (
                'Analyze Ships'
              )}
            </button>
          </div>
          
          {/* Loading overlay for viewer */}
          {!viewerReady && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-6" />
                <p className="text-blue-300 font-mono text-lg uppercase">Initializing Deep Zoom Viewer</p>
                <p className="text-gray-400 font-mono text-sm mt-2">Large image optimization in progress...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Standard image viewer
        <div 
          ref={containerRef}
          className="relative bg-gradient-to-br from-gray-900/30 to-black/30 border border-gray-600/40 rounded-lg p-8 flex items-center justify-center overflow-hidden min-h-[500px]"
        >
          <img 
            ref={imgElementRef}
            src={src} 
            alt="SAR Image" 
            className="max-w-full max-h-[450px] object-contain rounded shadow-2xl"
            style={{ 
              imageRendering: 'crisp-edges',
              minWidth: '400px',
              minHeight: '200px'
            }}
            onLoad={handleImageLoad}
          />
          
          {/* Bounding boxes for standard view */}
          {detectionResults && showBoundingBoxes && imageDisplayDimensions && (
            <div className="absolute inset-0 pointer-events-none">
              {detectionResults.detections.map((detection, index) => {
                const [x1, y1, x2, y2] = detection.bbox;
                const bboxWidth = x2 - x1;
                const bboxHeight = y2 - y1;
                
                const scaledX = x1 * imageDisplayDimensions.scaleX;
                const scaledY = y1 * imageDisplayDimensions.scaleY;
                const scaledWidth = bboxWidth * imageDisplayDimensions.scaleX;
                const scaledHeight = bboxHeight * imageDisplayDimensions.scaleY;
                
                const left = imageDisplayDimensions.offsetX + scaledX;
                const top = imageDisplayDimensions.offsetY + scaledY;
                
                return (
                  <div
                    key={index}
                    className="absolute border-4 border-green-400 bg-green-400/20 rounded"
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${scaledWidth}px`,
                      height: `${scaledHeight}px`,
                      zIndex: 10,
                      boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)'
                    }}
                  >
                    <div 
                      className="absolute bg-green-400 text-black px-3 py-2 text-sm font-mono font-bold whitespace-nowrap rounded shadow-lg"
                      style={{ top: '-36px', left: '0px' }}
                    >
                      SHIP {index + 1} ({(detection.confidence * 100).toFixed(1)}%)
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Process button for standard view */}
          <div className="absolute bottom-6 right-6 z-20">
            <button
              onClick={onProcess}
              disabled={processing}
              className={`px-8 py-4 font-mono font-bold uppercase tracking-wide text-base transition-all duration-300 rounded border-2 ${
                processing 
                  ? 'bg-gray-700/80 border-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 border-blue-400 text-white hover:shadow-lg hover:shadow-blue-500/25'
              }`}
            >
              {processing ? (
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span>Processing</span>
                </div>
              ) : (
                'Analyze Ships'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageViewer;
