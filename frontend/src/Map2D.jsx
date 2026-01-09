import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Map, { useControl, Source, Layer } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { TripsLayer } from '@deck.gl/geo-layers';
import LayerControl from './LayerControl'; 
import 'maplibre-gl/dist/maplibre-gl.css';

// --- CONFIGURATION ---
const ANIMATION_LOOP = 60; 
const TRAIL_LENGTH = 15; 

// 1. BASE MAP STYLE
const BASE_MAP_STYLE = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '&copy; CartoDB'
    }
  },
  layers: [{
    id: 'carto-dark-layer',
    type: 'raster',
    source: 'carto-dark',
    minzoom: 0,
    maxzoom: 22
  }]
};

// 2. DATA CALCULATION HELPER
export const fetchRainDataForCalc = async (lat, lon) => {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=rain,showers&hourly=rain`;
        const res = await fetch(url);
        const data = await res.json();
        console.log(`🌧️ Rain at [${lat}, ${lon}]: ${data.current.rain} mm`);
        return data.current.rain; 
    } catch (e) {
        console.error("Failed to fetch rain calc data", e);
        return 0;
    }
};

function DeckGLOverlay(props) {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

const Map2D = ({ viewState, onViewStateChange, onMouseMove, onZoomOut, windU, windV }) => {
  const [time, setTime] = useState(0);
  const [windPaths, setWindPaths] = useState([]);
  
  // STATES
  const [showWind, setShowWind] = useState(() => {
    const saved = localStorage.getItem('aeroFlareWindState');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [showRain, setShowRain] = useState(false);
  
  // Rain Timestamp (Needed for RainViewer)
  const [rainTimestamp, setRainTimestamp] = useState(null);

  // --- 1. FETCH RAIN TIMESTAMP ---
  useEffect(() => {
    if (showRain && !rainTimestamp) {
        // Fetch latest available timestamp from RainViewer
        fetch('https://api.rainviewer.com/public/weather-maps.json')
            .then(res => res.json())
            .then(data => {
                if (data.radar && data.radar.past) {
                    const lastFrame = data.radar.past[data.radar.past.length - 1];
                    setRainTimestamp(lastFrame.time);
                    console.log("🌧️ Rain Timestamp Loaded:", lastFrame.time);
                }
            })
            .catch(err => console.error("Rain metadata failed", err));
    }
  }, [showRain, rainTimestamp]);


  // --- 2. WIND WORKER ---
  useEffect(() => {
    if (windU.current && windU.current[0] !== 0) {
        const worker = new Worker(new URL('./windWorker.js', import.meta.url));
        worker.postMessage({
            windU: windU.current,
            windV: windV.current,
            animationLoop: ANIMATION_LOOP
        });
        worker.onmessage = (e) => {
            setWindPaths(e.data);
            worker.terminate();
        };
        return () => worker.terminate();
    }
  }, [windU, windV]); 

  // --- 3. ANIMATION LOOP ---
  useEffect(() => {
    let animationFrame;
    const animate = () => {
      setTime(t => (t + 0.5) % ANIMATION_LOOP); 
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // --- 4. HANDLERS ---
  const handleWindToggle = useCallback((newState) => {
    setShowWind(newState);
    localStorage.setItem('aeroFlareWindState', JSON.stringify(newState));
  }, []);

  const handleRainToggle = useCallback((newState) => {
    setShowRain(newState);
  }, []);

  // --- 5. LAYERS ---
  const deckLayers = useMemo(() => [
    new TripsLayer({
      id: 'wind-flow',
      data: windPaths,
      getPath: d => d.path,
      getTimestamps: d => d.path.map(p => p[2]),
      getColor: d => d.color,
      opacity: 0.8,
      widthMinPixels: 2,
      rounded: true,
      fadeTrail: true,
      trailLength: TRAIL_LENGTH, 
      currentTime: time,
      visible: showWind 
    })
  ], [windPaths, time, showWind]);

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, background: "#0f172a" }}>
      
      <LayerControl 
        viewMode="2D"
        setViewMode={onZoomOut} 
        showWind={showWind}
        setShowWind={handleWindToggle}
        showRain={showRain}
        setShowRain={handleRainToggle}
      />

      <Map
        {...viewState}
        pitch={0}
        bearing={0}
        dragRotate={false}
        touchZoomRotate={false}
        onMove={evt => onViewStateChange({ ...evt.viewState, pitch: 0, bearing: 0 })}
        onMouseMove={onMouseMove} 
        mapStyle={BASE_MAP_STYLE} 
        renderWorldCopies={true} 
        minZoom={2} 
        maxZoom={18}
        attributionControl={false}
      >
        {/* RAIN LAYER: Using RainViewer */}
        {showRain && rainTimestamp && (
            <Source 
                id="rain-viewer-source" 
                type="raster" 
                tiles={[
                    `https://tile.cache.rainviewer.com/v2/radar/${rainTimestamp}/256/{z}/{x}/{y}/2/1_1.png`
                ]} 
                tileSize={256}
            >
                <Layer 
                    id="rain-layer"
                    type="raster"
                    paint={{ 'raster-opacity': 0.6 }}
                    // Removed 'beforeId' to prevent MapLibre errors
                />
            </Source>
        )}

        <DeckGLOverlay layers={deckLayers} />
      </Map>
    </div>
  );
};

export default Map2D;