// SARImageViewer.jsx - Enhanced version matching FastAPI backend

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Upload, Play, Eye, EyeOff, Download, Trash2, RefreshCw, 
         ZoomIn, ZoomOut, Home, Square, Info, AlertTriangle, CheckCircle, 
         XCircle, Clock, Loader } from 'lucide-react';

// Enhanced Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Error caught by ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-red-50">
          <div className="text-center p-8 max-w-md">
            <XCircle className="text-red-600 text-6xl mx-auto mb-4" />
            <div className="text-red-600 text-lg mb-2">Component Error</div>
            <div className="text-gray-700 mb-4">{this.state.error?.message}</div>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// OpenSeadragon Viewer Component with enhanced error handling
const OpenSeadragonViewer = React.memo(({ imageId, showDetections, onDetectionClick, viewerKey }) => {
  const viewerRef = useRef(null);
  const osdViewerRef = useRef(null);
  const overlayRef = useRef([]);
  const mountedRef = useRef(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageMetadata, setImageMetadata] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  // Enhanced viewer configuration with better error handling
  const viewerConfig = useMemo(() => ({
    element: null,
    prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/',
    tileSources: `http://localhost:5000/api/dzi/${imageId}.dzi`,
    
    // Performance optimizations
    showNavigationControl: true,
    showZoomControl: true,
    showHomeControl: true,
    showFullPageControl: true,
    showSequenceControl: false,
    showRotationControl: false,
    
    // Enhanced gesture settings
    gestureSettingsMouse: {
      clickToZoom: false,
      dblClickToZoom: true,
      dragToPan: true,
      scrollToZoom: true,
      pinchToZoom: true
    },
    
    // Optimized performance settings
    maxZoomPixelRatio: 3,
    smoothTileEdgesMinZoom: 1.5,
    immediateRender: true,
    blendTime: 0.1,
    alwaysBlend: false,
    
    // Enhanced tile loading with retry logic
    timeout: 120000,
    useCanvas: true,
    imageLoaderLimit: 6,
    maxImageCacheCount: 300,
    
    // Enhanced error handling
    crossOriginPolicy: 'Anonymous',
    ajaxWithCredentials: false,
    loadTilesWithAjax: true,
    ajaxHeaders: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    
    // Optimized for large SAR images
    springStiffness: 8.0,
    animationTime: 0.8,
    constrainDuringPan: true,
    visibilityRatio: 1.0,
    minPixelRatio: 0.5,
    
    // Debug mode (disable in production)
    debugMode: false
  }), [imageId]);

  // Enhanced initialization with retry logic
  useEffect(() => {
    if (!imageId || !mountedRef.current) return;

    const initializeViewer = async () => {
      try {
        setError(null);
        setIsLoading(true);
        setLoadingProgress(0);

        // Clean up existing viewer
        if (osdViewerRef.current) {
          try {
            osdViewerRef.current.destroy();
          } catch (e) {
            console.warn('Error destroying previous viewer:', e);
          }
          osdViewerRef.current = null;
        }

        overlayRef.current = [];

        // Fetch image metadata with retry logic
        try {
          const response = await fetch(`http://localhost:5000/api/images`);
          if (response.ok) {
            const data = await response.json();
            const currentImage = data.images?.find(img => img.id === imageId);
            if (currentImage && mountedRef.current) {
              setImageMetadata(currentImage);
            }
          }
        } catch (e) {
          console.warn('Could not fetch image metadata:', e);
        }

        // Check if DZI file exists before initializing viewer
        const dziResponse = await fetch(`http://localhost:5000/api/dzi/${imageId}.dzi`);
        if (!dziResponse.ok) {
          throw new Error('DZI file not found. Please ensure the image has been processed.');
        }

        // Initialize OpenSeadragon viewer
        if (!window.OpenSeadragon) {
          throw new Error('OpenSeadragon library not loaded');
        }

        const config = {
          ...viewerConfig,
          element: viewerRef.current
        };

        osdViewerRef.current = window.OpenSeadragon(config);

        // Enhanced event handlers with better error handling
        osdViewerRef.current.addHandler('open', () => {
          if (!mountedRef.current) return;
          setIsLoading(false);
          setLoadingProgress(100);
          setRetryCount(0);
          console.log('OpenSeadragon viewer opened successfully');
          
          // Load detections with delay for smooth experience
          if (showDetections) {
            setTimeout(() => {
              if (mountedRef.current) loadDetectionOverlay();
            }, 750);
          }
        });

        osdViewerRef.current.addHandler('open-failed', (event) => {
          if (!mountedRef.current) return;
          setIsLoading(false);
          const errorMsg = retryCount >= 2 
            ? 'Failed to load image after multiple attempts. Please check if the image has been processed.'
            : 'Failed to load image. Retrying...';
          setError(errorMsg);
          console.error('OpenSeadragon open failed:', event);
          
          // Auto-retry logic
          if (retryCount < 2) {
            setTimeout(() => {
              if (mountedRef.current) {
                setRetryCount(prev => prev + 1);
                initializeViewer();
              }
            }, 2000 * (retryCount + 1));
          }
        });

        // Enhanced progress tracking
        let tilesLoaded = 0;
        const maxTiles = 50; // Estimated for progress calculation
        
        osdViewerRef.current.addHandler('tile-loaded', () => {
          if (!mountedRef.current) return;
          tilesLoaded++;
          const progress = Math.min((tilesLoaded / maxTiles) * 90, 90);
          setLoadingProgress(progress);
        });

        osdViewerRef.current.addHandler('animation-finish', () => {
          if (mountedRef.current) {
            setLoadingProgress(100);
          }
        });

        // Enhanced tile error handling
        osdViewerRef.current.addHandler('tile-load-failed', (event) => {
          console.warn('Tile load failed:', event.tile?.url);
          // Don't set global error for individual tile failures
        });

      } catch (err) {
        if (!mountedRef.current) return;
        setIsLoading(false);
        setError(`Viewer initialization failed: ${err.message}`);
        console.error('OpenSeadragon initialization error:', err);
      }
    };

    // Enhanced OpenSeadragon loading with CDN fallback
    if (!window.OpenSeadragon) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/openseadragon.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = initializeViewer;
      script.onerror = () => {
        if (mountedRef.current) {
          setError('Failed to load OpenSeadragon library from CDN');
        }
      };
      document.head.appendChild(script);

      return () => {
        mountedRef.current = false;
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        if (osdViewerRef.current) {
          try {
            osdViewerRef.current.destroy();
          } catch (e) {
            console.warn('Error destroying viewer on cleanup:', e);
          }
        }
      };
    } else {
      initializeViewer();
    }

    return () => {
      mountedRef.current = false;
      if (osdViewerRef.current) {
        try {
          osdViewerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying viewer on cleanup:', e);
        }
      }
    };
  }, [imageId, viewerKey, viewerConfig, retryCount]);

  // Enhanced detection overlay handling
  useEffect(() => {
    if (osdViewerRef.current && osdViewerRef.current.isOpen()) {
      if (showDetections) {
        loadDetectionOverlay();
      } else {
        removeDetectionOverlay();
      }
    }
  }, [showDetections]);

  // Enhanced detection loading with better error handling
  const loadDetectionOverlay = useCallback(async () => {
    if (!osdViewerRef.current || !imageId || !osdViewerRef.current.isOpen() || !mountedRef.current) return;

    try {
      const response = await fetch(`http://localhost:5000/api/detections/${imageId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No detections available for this image yet');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!mountedRef.current) return;

      // Clear existing overlays
      removeDetectionOverlay();

      if (!data.detections || data.detections.length === 0) {
        console.log('No detections found in response');
        return;
      }

      // Enhanced detection overlay rendering
      let overlaysAdded = 0;
      
      data.detections.forEach((detection, index) => {
        if (!mountedRef.current) return;
        
        const coords = detection.coordinates?.normalized;
        
        // Enhanced coordinate validation
        if (!coords || coords.x < 0 || coords.y < 0 || coords.width <= 0 || coords.height <= 0) {
          console.warn('Invalid detection coordinates:', coords);
          return;
        }
        
        try {
          // Create OpenSeadragon rectangle
          const rect = new window.OpenSeadragon.Rect(
            coords.x,
            coords.y,
            coords.width,
            coords.height
          );

          // Enhanced overlay element with better styling
          const element = document.createElement('div');
          element.className = 'detection-overlay';
          
          const confidence = Math.round(detection.confidence * 100);
          const confidenceColor = confidence > 80 ? '#22c55e' : confidence > 60 ? '#f59e0b' : '#ef4444';
          
          element.style.cssText = `
            border: 2px solid ${confidenceColor};
            background: ${confidenceColor}20;
            cursor: pointer;
            box-sizing: border-box;
            pointer-events: auto;
            transition: all 0.2s ease;
            border-radius: 4px;
            backdrop-filter: blur(1px);
            position: relative;
          `;
          
          element.title = `${detection.class_name}: ${confidence}% confidence`;
          
          // Enhanced hover effects
          element.onmouseenter = () => {
            element.style.background = `${confidenceColor}40`;
            element.style.borderWidth = '3px';
            element.style.transform = 'scale(1.02)';
            element.style.zIndex = '1000';
          };
          
          element.onmouseleave = () => {
            element.style.background = `${confidenceColor}20`;
            element.style.borderWidth = '2px';
            element.style.transform = 'scale(1)';
            element.style.zIndex = '999';
          };

          element.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onDetectionClick && mountedRef.current) {
              onDetectionClick(detection, index);
            }
          };

          // Add overlay to viewer
          osdViewerRef.current.addOverlay({
            element: element,
            location: rect,
            placement: window.OpenSeadragon.Placement.TOP_LEFT,
            checkResize: true,
            rotationMode: window.OpenSeadragon.OverlayRotationMode.EXACT
          });

          overlayRef.current.push({ element, detection });
          overlaysAdded++;
        } catch (overlayError) {
          console.error('Failed to add overlay:', overlayError);
        }
      });

      console.log(`Added ${overlaysAdded} detection overlays`);

    } catch (error) {
      if (!mountedRef.current) return;
      console.error('Failed to load detections:', error);
      if (!error.message.includes('404')) {
        setError(`Failed to load detections: ${error.message}`);
      }
    }
  }, [imageId, onDetectionClick]);

  const removeDetectionOverlay = useCallback(() => {
    if (osdViewerRef.current && overlayRef.current.length > 0) {
      overlayRef.current.forEach(({ element }) => {
        try {
          osdViewerRef.current.removeOverlay(element);
        } catch (e) {
          console.warn('Failed to remove overlay:', e);
        }
      });
      overlayRef.current = [];
    }
  }, []);

  // Enhanced viewer control methods
  const zoomIn = useCallback(() => {
    if (osdViewerRef.current?.viewport) {
      osdViewerRef.current.viewport.zoomBy(1.3);
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (osdViewerRef.current?.viewport) {
      osdViewerRef.current.viewport.zoomBy(0.7);
    }
  }, []);

  const goHome = useCallback(() => {
    if (osdViewerRef.current?.viewport) {
      osdViewerRef.current.viewport.goHome();
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (osdViewerRef.current) {
      osdViewerRef.current.setFullScreen(!osdViewerRef.current.isFullScreen());
    }
  }, []);

  // Enhanced retry function
  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setLoadingProgress(0);
    setIsLoading(true);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center p-8 max-w-md">
          <AlertTriangle className="text-red-600 text-6xl mx-auto mb-4" />
          <div className="text-red-600 text-lg mb-2">Viewer Error</div>
          <div className="text-gray-700 mb-4">{error}</div>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={handleRetry}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            {retryCount > 0 && (
              <div className="px-4 py-2 bg-gray-200 text-gray-600 rounded text-sm">
                Attempt {retryCount + 1}/3
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-900">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 z-10">
          <div className="text-center">
            <Loader className="animate-spin text-blue-500 text-4xl mx-auto mb-4" />
            <div className="text-white text-lg mb-4">Loading SAR Image...</div>
            
            {/* Enhanced progress bar */}
            <div className="w-80 bg-gray-700 rounded-full h-3 mb-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            
            <div className="text-gray-400 text-sm">
              {imageMetadata ? 
                `${imageMetadata.dimensions?.width}×${imageMetadata.dimensions?.height} pixels • ${imageMetadata.format}` :
                'Initializing viewer...'
              }
            </div>
            
            {imageMetadata?.file_size_mb && (
              <div className="text-gray-500 text-xs mt-1">
                {imageMetadata.file_size_mb} MB
              </div>
            )}
            
            {retryCount > 0 && (
              <div className="text-yellow-400 text-xs mt-2">
                Retry attempt {retryCount}/2
              </div>
            )}
          </div>
        </div>
      )}
      
      <div ref={viewerRef} className="w-full h-full" />
      
      {/* Enhanced custom toolbar */}
      <div className="absolute top-4 right-4 z-20 bg-black bg-opacity-90 rounded-lg p-2 flex space-x-1 shadow-xl border border-gray-600">
        <button
          onClick={zoomIn}
          className="p-3 text-white hover:bg-white hover:bg-opacity-20 rounded transition-all duration-200 hover:scale-110"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={zoomOut}
          className="p-3 text-white hover:bg-white hover:bg-opacity-20 rounded transition-all duration-200 hover:scale-110"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={goHome}
          className="p-3 text-white hover:bg-white hover:bg-opacity-20 rounded transition-all duration-200 hover:scale-110"
          title="Fit to Screen"
        >
          <Home size={18} />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-3 text-white hover:bg-white hover:bg-opacity-20 rounded transition-all duration-200 hover:scale-110"
          title="Fullscreen"
        >
          <Square size={18} />
        </button>
      </div>
    </div>
  );
});

// Enhanced Detection Info Panel with better styling
const DetectionInfoPanel = React.memo(({ detection, onClose }) => {
  if (!detection) return null;

  const confidence = Math.round(detection.confidence * 100);
  const confidenceColor = confidence > 80 ? 'text-green-600' : confidence > 60 ? 'text-yellow-600' : 'text-red-600';
  const confidenceBg = confidence > 80 ? 'bg-green-100' : confidence > 60 ? 'bg-yellow-100' : 'bg-red-100';

  return (
    <div className="absolute top-4 left-4 z-20 bg-white rounded-xl shadow-2xl p-6 max-w-sm border border-gray-200 backdrop-blur-sm">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
          🚢 Ship Detection
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700">Class:</span> 
          <span className="text-gray-900 capitalize bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
            {detection.class_name}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700">Confidence:</span> 
          <div className={`flex items-center space-x-2 ${confidenceBg} px-3 py-1 rounded-full`}>
            <div className={`w-3 h-3 rounded-full ${
              confidence > 80 ? 'bg-green-500' : 
              confidence > 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className={`font-bold ${confidenceColor}`}>
              {confidence}%
            </span>
          </div>
        </div>
        
        <div>
          <span className="font-medium text-gray-700 block mb-2">Position:</span> 
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg space-y-1 font-mono">
            <div>X: {detection.coordinates?.pixel?.x?.toFixed(0) || 'N/A'}px</div>
            <div>Y: {detection.coordinates?.pixel?.y?.toFixed(0) || 'N/A'}px</div>
            <div>Size: {detection.coordinates?.pixel?.width?.toFixed(0) || 'N/A'} × {detection.coordinates?.pixel?.height?.toFixed(0) || 'N/A'}px</div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700">Source Tile:</span> 
          <span className="text-gray-900 text-sm font-mono bg-blue-100 px-2 py-1 rounded">
            {detection.tile_id}
          </span>
        </div>
      </div>
    </div>
  );
});

// Enhanced status indicator component
const StatusIndicator = ({ status, className = "" }) => {
  const getStatusInfo = (status) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', label: 'Completed' };
      case 'processing':
      case 'converting_to_tiff':
      case 'creating_tiles':
      case 'creating_dzi':
      case 'running_detection':
      case 'finalizing':
        return { icon: Loader, color: 'text-blue-500 animate-spin', label: 'Processing' };
      case 'uploaded':
        return { icon: Clock, color: 'text-yellow-500', label: 'Uploaded' };
      default:
        if (status?.startsWith('error:')) {
          return { icon: XCircle, color: 'text-red-500', label: 'Error' };
        }
        return { icon: Info, color: 'text-gray-500', label: status || 'Unknown' };
    }
  };

  const { icon: Icon, color, label } = getStatusInfo(status);
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Icon size={16} className={color} />
      <span className="text-sm">{label}</span>
    </div>
  );
};

// Main SAR Image Viewer Component with comprehensive enhancements
const SARImageViewer = () => {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [showDetections, setShowDetections] = useState(true);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [detectionInfo, setDetectionInfo] = useState(null);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [error, setError] = useState(null);
  const [viewerKey, setViewerKey] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);

  const SERVER_URL = 'http://localhost:5000';

  // Enhanced polling with better error handling
  useEffect(() => {
    loadImages();
    const interval = setInterval(() => {
      checkProcessingStatus();
      // Refresh images list periodically
      if (!processing) {
        loadImages();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [processing]);

  // Enhanced image loading with better error handling
  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${SERVER_URL}/api/images`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setImages(data.images || []);
      
      // Auto-select first image if none selected
      if (data.images && data.images.length > 0 && !selectedImage) {
        setSelectedImage(data.images[0].id);
        setViewerKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to load images:', error);
      setError(`Failed to connect to server: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedImage]);

  // Enhanced processing status checking
  const checkProcessingStatus = useCallback(async () => {
    if (!selectedImage) return;
    
    try {
      const response = await fetch(`${SERVER_URL}/api/processing-status/${selectedImage}`);
      if (!response.ok) return;
      
      const status = await response.json();
      setProcessingStatus(status.status);
      
      const processingStates = [
        'processing', 'converting_to_tiff', 'creating_tiles', 
        'creating_dzi', 'running_detection', 'finalizing'
      ];
      
      if (processingStates.includes(status.status)) {
        setProcessing(true);
      } else if (status.status === 'completed') {
        setProcessing(false);
        loadDetectionInfo();
        loadImages();
      } else if (status.status?.startsWith('error:')) {
        setProcessing(false);
        setError(`Processing error: ${status.status.replace('error: ', '')}`);
      }
    } catch (err) {
      // Ignore polling errors to prevent spam
      console.warn('Status polling failed:', err.message);
    }
  }, [selectedImage]);

  // Enhanced detection info loading
  const loadDetectionInfo = useCallback(async () => {
    if (!selectedImage) return;
    
    try {
      const response = await fetch(`${SERVER_URL}/api/detections/${selectedImage}`);
      if (response.ok) {
        const data = await response.json();
        setDetectionInfo(data);
        setError(null);
      } else if (response.status !== 404) {
        console.warn('Failed to load detection info:', response.statusText);
      }
    } catch (err) {
      console.warn('Detection info loading failed:', err.message);
    }
  }, [selectedImage]);

  // Enhanced upload handler with better progress tracking
  const handleImageUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Enhanced file validation
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      setError(`File too large. Maximum size is 500MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload JPEG, PNG, TIFF, or BMP files.');
      return;
    }

    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('image_id', imageId);

    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);

      // Enhanced XMLHttpRequest with better error handling
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      };
      
      xhr.onload = async () => {
        try {
          if (xhr.status === 200) {
            const result = JSON.parse(xhr.responseText);
            if (result.success) {
              await loadImages();
              setSelectedImage(imageId);
              setViewerKey(prev => prev + 1);
              setError(null);
            } else {
              setError(result.message || 'Upload failed');
            }
          } else {
            const errorData = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            setError(errorData.detail || `Upload failed: HTTP ${xhr.status}`);
          }
        } catch (parseError) {
          setError(`Upload failed: ${xhr.statusText}`);
        }
        setLoading(false);
        setUploadProgress(0);
      };
      
      xhr.onerror = () => {
        setError('Upload failed: Network error. Please check your connection.');
        setLoading(false);
        setUploadProgress(0);
      };
      
      xhr.ontimeout = () => {
        setError('Upload failed: Request timed out. Please try again.');
        setLoading(false);
        setUploadProgress(0);
      };
      
      xhr.timeout = 300000; // 5 minute timeout
      xhr.open('POST', `${SERVER_URL}/api/upload`);
      xhr.send(formData);
      
    } catch (error) {
      setError(`Upload failed: ${error.message}`);
      setLoading(false);
      setUploadProgress(0);
    }
    
    event.target.value = ''; // Clear the input
  }, [loadImages]);

  // Enhanced process handler matching FastAPI backend
  const handleProcessImage = useCallback(async () => {
    if (!selectedImage) return;
    
    try {
      setProcessing(true);
      setError(null);
      setProcessingStatus('processing');
      
      const response = await fetch(`${SERVER_URL}/api/process`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          image_id: selectedImage,
          confidence_threshold: confidenceThreshold,
          convert_to_tiff: true
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || result.message || 'Processing request failed');
      }
      
      setError(null);
      console.log('Processing started successfully:', result);
      
    } catch (error) {
      setProcessing(false);
      setProcessingStatus('');
      setError(`Processing failed: ${error.message}`);
    }
  }, [selectedImage, confidenceThreshold]);

  // Enhanced delete handler
  const handleDeleteImage = useCallback(async () => {
    if (!selectedImage || !window.confirm('Delete this image and all processed data? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${SERVER_URL}/api/image/${selectedImage}`, { 
        method: 'DELETE' 
      });
      
      if (response.ok) {
        await loadImages();
        setSelectedImage('');
        setDetectionInfo(null);
        setSelectedDetection(null);
        setViewerKey(prev => prev + 1);
        setError(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Delete request failed');
      }
    } catch (error) {
      setError(`Delete failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedImage, loadImages]);

  const handleDetectionClick = useCallback((detection, index) => {
    setSelectedDetection({ ...detection, index });
  }, []);

  const handleImageSelect = useCallback((imageId) => {
    setSelectedImage(imageId);
    setSelectedDetection(null);
    setDetectionInfo(null);
    setProcessingStatus('');
    setViewerKey(prev => prev + 1);
    setTimeout(() => loadDetectionInfo(), 1000);
  }, [loadDetectionInfo]);

  const selectedImageData = useMemo(() =>
    images.find(img => img.id === selectedImage), [images, selectedImage]
  );

  return (
    <ErrorBoundary>
      <div className="w-full h-screen bg-gray-900 flex flex-col">
        {/* Enhanced Header */}
        <div className="bg-gray-800 p-4 flex items-center justify-between flex-shrink-0 border-b border-gray-700 shadow-lg">
          <div className="flex items-center gap-4">
            <h1 className="text-white text-xl font-bold flex items-center gap-2">
              🛡️ SAR Ship Detection
              <span className="text-sm text-gray-400 font-normal">v1.0</span>
            </h1>
            
            <select
              value={selectedImage}
              onChange={(e) => handleImageSelect(e.target.value)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg min-w-80 border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all"
              disabled={processing || loading}
            >
              <option value="">Select an image...</option>
              {images.map(img => (
                <option key={img.id} value={img.id}>
                  {img.id} • {img.dimensions?.width}×{img.dimensions?.height} 
                  {img.processed && ` • ${img.detection_count} ships`}
                  {img.status && img.status !== 'completed' && img.status !== 'uploaded' && ` • ${img.status}`}
                </option>
              ))}
            </select>

            <label className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
              <Upload size={18} />
              Upload SAR Image
              <input
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.tiff,.tif,.bmp"
                onChange={handleImageUpload}
                disabled={loading || processing}
              />
            </label>
          </div>

          {selectedImageData && (
            <div className="text-white text-sm flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-gray-300">Dimensions:</span>
                <span className="font-mono bg-gray-700 px-3 py-1 rounded-full">
                  {selectedImageData.dimensions?.width}×{selectedImageData.dimensions?.height}
                </span>
              </div>
              
              {selectedImageData.tiles && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">Tiles:</span>
                  <span className="font-mono bg-gray-700 px-3 py-1 rounded-full">
                    {selectedImageData.tiles.grid}
                  </span>
                </div>
              )}
              
              <StatusIndicator status={selectedImageData.status} className="text-white" />
              
              {detectionInfo && (
                <div className="bg-green-600 px-4 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  🎯 {detectionInfo.detection_count} ships detected
                </div>
              )}
            </div>
          )}
        </div>

        {/* Enhanced Controls */}
        {selectedImage && (
          <div className="bg-gray-700 p-4 flex items-center justify-between flex-shrink-0 border-b border-gray-600">
            <div className="flex items-center gap-4">
              <button
                onClick={handleProcessImage}
                disabled={processing || loading}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
              >
                {processing ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                {processing ? `Processing (${processingStatus})` : 'Process & Detect'}
              </button>

              <div className="flex items-center gap-2">
                <label className="text-white text-sm">Confidence:</label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-24"
                  disabled={processing}
                />
                <span className="text-white text-sm font-mono bg-gray-600 px-2 py-1 rounded">
                  {Math.round(confidenceThreshold * 100)}%
                </span>
              </div>

              <button
                onClick={() => setShowDetections(!showDetections)}
                className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  showDetections 
                    ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white' 
                    : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white'
                }`}
              >
                {showDetections ? <Eye size={18} /> : <EyeOff size={18} />}
                {showDetections ? 'Hide Detections' : 'Show Detections'}
              </button>

              {detectionInfo && (
                <div className="text-white text-sm bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2">
                  <Info size={16} />
                  Confidence ≥ {Math.round(confidenceThreshold * 100)}% • {detectionInfo.detection_count} detections
                </div>
              )}
            </div>

            <button
              onClick={handleDeleteImage}
              disabled={processing || loading}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        )}

        {/* Enhanced Error Display */}
        {error && (
          <div className="bg-red-600 text-white p-4 flex-shrink-0 border-b border-red-500 shadow-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} />
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-white hover:text-gray-200 text-xl leading-none transition-colors hover:bg-red-700 rounded px-2 py-1"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Upload Progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="bg-blue-600 text-white p-4 flex-shrink-0 shadow-lg">
            <div className="flex items-center gap-4">
              <span className="whitespace-nowrap font-medium">
                Uploading: {uploadProgress.toFixed(1)}%
              </span>
              <div className="flex-1 bg-blue-800 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-white to-blue-100 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-sm">
                {uploadProgress < 50 ? 'Uploading...' : 'Processing...'}
              </span>
            </div>
          </div>
        )}

        {/* Enhanced Main Viewer */}
        <div className="flex-1 relative overflow-hidden">
          {selectedImage ? (
            <>
              <OpenSeadragonViewer
                imageId={selectedImage}
                showDetections={showDetections}
                onDetectionClick={handleDetectionClick}
                viewerKey={viewerKey}
              />
              
              <DetectionInfoPanel
                detection={selectedDetection}
                onClose={() => setSelectedDetection(null)}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center p-8 max-w-lg">
                <Upload size={120} className="mx-auto mb-8 opacity-30" />
                <h2 className="text-3xl font-semibold mb-4 text-gray-300">Upload SAR Image</h2>
                <p className="text-xl text-gray-400 mb-6">Begin advanced ship detection analysis</p>
                <div className="text-sm text-gray-500 space-y-2">
                  <div>✓ Supports: JPG, PNG, TIFF, BMP</div>
                  <div>✓ Maximum size: 500MB</div>
                  <div>✓ High-resolution satellite images</div>
                  <div>✓ Automated ship detection with confidence scoring</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default SARImageViewer;
