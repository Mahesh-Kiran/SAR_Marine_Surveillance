import { useEffect, useRef, useState } from 'react';
import { createOSDAnnotator } from '@annotorious/openseadragon';

const useAnnotationSync = (viewer, viewerId) => {
  const wsRef = useRef(null);
  const annoRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    if (!viewer) return;
    
    // Initialize Annotorious
    annoRef.current = createOSDAnnotator(viewer, {
      drawingEnabled: viewerId === 'viewer3', // Enable only on detection viewer
      style: {
        stroke: '#ff0000',
        strokeWidth: 2,
        fill: 'rgba(255, 0, 0, 0.15)'
      }
    });
    
    // Connect WebSocket
    wsRef.current = new WebSocket('ws://localhost:8000/ws/annotations');
    
    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'init':
          // Load initial annotations
          annoRef.current.setAnnotations(data.annotations);
          break;
          
        case 'create':
          // Add annotation from another client
          annoRef.current.addAnnotation(data.annotation);
          break;
          
        case 'update':
          // Update annotation from another client
          annoRef.current.updateAnnotation(data.annotation);
          break;
          
        case 'delete':
          // Remove annotation from another client
          annoRef.current.removeAnnotation(data.id);
          break;
      }
    };
    
    // Local annotation events
    annoRef.current.on('createAnnotation', (annotation) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'create',
          annotation
        }));
      }
    });
    
    annoRef.current.on('updateAnnotation', (annotation) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'update',
          annotation
        }));
      }
    });
    
    annoRef.current.on('deleteAnnotation', (annotation) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'delete',
          id: annotation.id
        }));
      }
    });
    
    return () => {
      wsRef.current?.close();
      annoRef.current?.destroy();
    };
  }, [viewer, viewerId]);
  
  return { isConnected, annotator: annoRef.current };
};
