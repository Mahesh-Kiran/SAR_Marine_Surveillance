import React, { useRef, useEffect, useState } from 'react';
import OpenSeadragon from 'openseadragon';

const SimpleOSDViewer = ({
  source,
  overlaySrc,
  overlayOpacity = 0.7,
  width = "100%",
  height = "500px",
  showOverlay = false,
}) => {
  const viewerDiv = useRef(null);
  const osdViewer = useRef(null);

  useEffect(() => {
    if (viewerDiv.current) {
      if (osdViewer.current) {
        osdViewer.current.destroy();
        osdViewer.current = null;
      }
      osdViewer.current = OpenSeadragon({
        element: viewerDiv.current,
        prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
        tileSources: source,
        showNavigationControl: true,
        showZoomControl: true,
        showHomeControl: true,
        showFullPageControl: true,
        showNavigator: true,
        navigatorSizeRatio: 0.15,
        defaultZoomLevel: 0,
        minZoomLevel: 0.1,
        maxZoomLevel: 20,
        timeout: 30000,
        crossOriginPolicy: false,
        ajaxWithCredentials: false
      });

      osdViewer.current.addHandler('open', () => {
        if (showOverlay && overlaySrc) {
          const overlayImg = document.createElement('img');
          overlayImg.src = overlaySrc;
          overlayImg.style.opacity = overlayOpacity;
          overlayImg.style.pointerEvents = 'none';
          overlayImg.onload = () => {
            osdViewer.current.addOverlay({
              element: overlayImg,
              location: new OpenSeadragon.Rect(0, 0, 1, 1)
            });
          };
        }
      });
    }
    return () => {
      if (osdViewer.current) {
        osdViewer.current.destroy();
        osdViewer.current = null;
      }
    };
  }, [source, overlaySrc, overlayOpacity, showOverlay]);

  return (
    <div
      ref={viewerDiv}
      style={{
        width,
        height,
        border: '2px solid #333',
        borderRadius: '12px',
        backgroundColor: '#000'
      }}
    />
  );
};
