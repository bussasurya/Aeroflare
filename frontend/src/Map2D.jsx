import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Map, { useControl, Source, Layer } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer, PolygonLayer } from '@deck.gl/layers'; 
import LayerControl from './LayerControl'; 
import Papa from 'papaparse'; 
import 'maplibre-gl/dist/maplibre-gl.css';

// --- IMPORTS ---
import AlertPanel from './AlertPanel'; 
import { calculateIsochrones } from './SpreadGeometry'; 
import { getWindAtLocation, fetchFireWeather, calculateSpreadPrediction } from './WindMath';

// --- CONSTANTS ---
const OWM_KEY = "2ee1ec2dc8951bb86d4a1babfdc64349"; 
const TEMP_LAYER_URL = `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`;

const PROXY = "https://api.codetabs.com/v1/proxy?quest=";
const NASA_CSV = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_24h.csv";
const FIRE_DATA_URL = `${PROXY}${encodeURIComponent(NASA_CSV)}`;

// --- MAP STYLES ---
const MAP_STYLES = {
  dark: {
    version: 8,
    sources: { 'carto-dark': { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'], tileSize: 256, attribution: '&copy; CartoDB' } },
    layers: [{ id: 'base-layer', type: 'raster', source: 'carto-dark', minzoom: 0, maxzoom: 22 }]
  },
  satellite: {
    version: 8,
    sources: { 'esri-sat': { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: '&copy; Esri' } },
    layers: [{ id: 'base-layer', type: 'raster', source: 'esri-sat', minzoom: 0, maxzoom: 22 }]
  }
};

function DeckGLOverlay(props) {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

const Map2D = ({ viewState, onViewStateChange, onMouseMove, onZoomOut, windU, windV }) => {
  
  // --- STATE ---
  const [extremeFires, setExtremeFires] = useState([]); 
  const [forestFires, setForestFires] = useState([]);   
  const [agriFires, setAgriFires] = useState([]);       
  
  const [alerts, setAlerts] = useState([]); 
  const [selectedAlert, setSelectedAlert] = useState(null); 
  const [hoverInfo, setHoverInfo] = useState(null);

  const [mapStyle, setMapStyle] = useState('dark'); 
  const [showTemp, setShowTemp] = useState(false);
  const [showRain, setShowRain] = useState(false);
  const [showExtremeFire, setShowExtremeFire] = useState(true); 
  const [showForestFire, setShowForestFire] = useState(true); 
  const [showAgriFire, setShowAgriFire] = useState(false); 
  
  const [rainTimestamp, setRainTimestamp] = useState(null);

  // --- FETCH FIRE DATA ---
  useEffect(() => {
    if (extremeFires.length === 0) {
      console.log("🔥 Fetching LIVE Fire Data...");
      Papa.parse(FIRE_DATA_URL, {
        download: true, header: true, dynamicTyping: true, skipEmptyLines: true,
        complete: (results) => {
          const extreme = [], forest = [], agri = [];
          results.data.forEach(d => {
            if (d.confidence >= 80) {
              if (d.frp > 100) extreme.push(d); 
              else if (d.frp > 30) forest.push(d);  
              else agri.push(d);    
            }
          });
          setExtremeFires(extreme); setForestFires(forest); setAgriFires(agri);
        },
        error: (err) => console.error("🔥 Load Failed", err)
      });
    }
  }, [extremeFires.length]); 

  // --- ALERT SCANNER ---
  useEffect(() => {
    if (extremeFires.length > 0 && windU.current && windV.current) {
        console.log("🚨 Scanning threats...");
        const threats = [];
        const topFires = [...extremeFires, ...forestFires].sort((a, b) => b.frp - a.frp).slice(0, 50);

        topFires.forEach(fire => {
            const wind = getWindAtLocation(fire.latitude, fire.longitude, windU.current, windV.current);
            const windSpeedKmh = parseFloat(wind.speed) * 3.6;
            
            if (fire.frp > 50 || windSpeedKmh > 15) {
                threats.push({ fire, wind });
            }
        });
        setAlerts(threats.slice(0, 10));
    }
  }, [extremeFires, forestFires, windU, windV]);

  // --- FETCH RAIN ---
  useEffect(() => {
    if (showRain && !rainTimestamp) {
        fetch('https://api.rainviewer.com/public/weather-maps.json')
            .then(res => res.json()).then(data => { 
              if (data.radar?.past) setRainTimestamp(data.radar.past[data.radar.past.length - 1].time); 
            })
            .catch(err => console.error("Rain fetch failed", err));
    }
  }, [showRain, rainTimestamp]);

  // --- HANDLERS ---
  const handleTempToggle = useCallback((s) => setShowTemp(s), []);
  const handleRainToggle = useCallback((s) => setShowRain(s), []);
  const handleExtremeToggle = useCallback((s) => setShowExtremeFire(s), []);
  const handleForestToggle = useCallback((s) => setShowForestFire(s), []);
  const handleAgriToggle = useCallback((s) => setShowAgriFire(s), []);

  // --- ALERT CLICK ---
  const handleAlertClick = (alert) => {
    const baseSpeed = Math.max(parseFloat(alert.wind.speed) * 3.6, 3.0);
    
    const isochrones = calculateIsochrones(
        alert.fire.latitude, 
        alert.fire.longitude, 
        baseSpeed, 
        alert.wind.direction,
        alert.fire.frp
    );
    
    setSelectedAlert({ ...alert, isochrones });
    
    onViewStateChange({
        longitude: alert.fire.longitude,
        latitude: alert.fire.latitude,
        zoom: 10,
        pitch: 0, 
        bearing: 0, 
        transitionDuration: 1500 
    });
  };

  // --- RESET VIEW ---
  const handleResetView = () => {
    setSelectedAlert(null);
    onViewStateChange({
      longitude: 0,
      latitude: 20,
      zoom: 2,
      pitch: 0,
      bearing: 0,
      transitionDuration: 2000
    });
  };

  // --- FIRE HOVER ---
  const handleFireHover = async (info) => {
    if (info.object) {
        if (hoverInfo && hoverInfo.object === info.object) {
          setHoverInfo(prev => ({ ...prev, x: info.x, y: info.y }));
          return;
        }
        
        const { latitude, longitude, frp } = info.object; 
        const windCalc = getWindAtLocation(latitude, longitude, windU.current, windV.current);
        
        setHoverInfo({
            x: info.x, y: info.y, object: info.object,
            wind: windCalc, weather: null,
            prediction: { level: "LOADING...", speed: "...", color: "#94a3b8" } 
        });

        const weatherData = await fetchFireWeather(latitude, longitude);
        let predCalc = { level: "N/A", speed: "0", color: "#94a3b8", terrain: { factor: "1.0x" } };
        
        if (weatherData) {
            predCalc = calculateSpreadPrediction(
                windCalc.speed, 
                weatherData.temp, 
                weatherData.humidity, 
                weatherData.elevation,
                frp 
            );
        }

        setHoverInfo(prev => {
            if (prev && prev.object === info.object) return { ...prev, weather: weatherData, prediction: predCalc };
            return prev;
        });
    } else {
        setHoverInfo(null);
    }
  };

  // --- DECK.GL LAYERS ---
  const deckLayers = useMemo(() => [
    
    // Selected fire spread zones
    selectedAlert && new PolygonLayer({
        id: 'danger-zones',
        data: selectedAlert.isochrones, 
        getPolygon: d => d.polygon,
        getFillColor: d => d.color,
        getLineColor: d => d.lineColor,
        lineWidthMinPixels: 2,
        pickable: false 
    }),
    
    // Fire points
    new ScatterplotLayer({
      id: 'agri-fires', data: agriFires, getPosition: d => [d.longitude, d.latitude],
      getFillColor: [255, 215, 0], getRadius: 1500, radiusMinPixels: 2, radiusMaxPixels: 10,
      opacity: 0.6, visible: showAgriFire, pickable: true, onHover: handleFireHover
    }),
    new ScatterplotLayer({
      id: 'forest-fires', data: forestFires, getPosition: d => [d.longitude, d.latitude],
      getFillColor: [255, 50, 50], getRadius: d => 2000 + (d.frp * 10), radiusMinPixels: 3, radiusMaxPixels: 20,
      opacity: 0.8, visible: showForestFire, pickable: true, onHover: handleFireHover
    }),
    new ScatterplotLayer({
      id: 'extreme-fires', data: extremeFires, getPosition: d => [d.longitude, d.latitude],
      getFillColor: [255, 255, 255], getRadius: d => 4000 + (d.frp * 20), radiusMinPixels: 5, radiusMaxPixels: 40,
      opacity: 1, visible: showExtremeFire, pickable: true, onHover: handleFireHover
    })
  ], [extremeFires, forestFires, agriFires, showExtremeFire, showForestFire, showAgriFire, selectedAlert]);

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, background: "#0f172a" }}>
      
      <AlertPanel alerts={alerts} onSelectAlert={handleAlertClick} />

      {/* RESET BUTTON - REPOSITIONED BELOW ALERT PANEL */}
      {selectedAlert && (
        <button
          onClick={handleResetView}
          style={{
            position: 'absolute',
            top: '400px', // Pushed down to clear the AlertPanel
            left: '20px', // Aligned with the AlertPanel
            zIndex: 1000,
            background: 'rgba(239, 68, 68, 0.9)', // Red color to match theme
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span style={{ fontSize: '14px' }}>🌍</span> Reset View
        </button>
      )}

      <LayerControl 
        viewMode="2D" setViewMode={onZoomOut} 
        mapStyle={mapStyle} setMapStyle={setMapStyle} 
        showTemp={showTemp} setShowTemp={handleTempToggle}
        showRain={showRain} setShowRain={handleRainToggle}
        showExtremeFire={showExtremeFire} setShowExtremeFire={handleExtremeToggle}
        showForestFire={showForestFire} setShowForestFire={handleForestToggle}
        showAgriFire={showAgriFire} setShowAgriFire={handleAgriToggle}
      />

      <Map
        {...viewState}
        onMove={evt => onViewStateChange(evt.viewState)}
        onMouseMove={onMouseMove} 
        mapStyle={MAP_STYLES[mapStyle]} 
        renderWorldCopies={true} 
        minZoom={2} 
        maxZoom={18} 
        attributionControl={false}
      >
        {showTemp && (
          <Source id="owm-temp" type="raster" tiles={[TEMP_LAYER_URL]} tileSize={256}>
            <Layer id="temp-layer" type="raster" paint={{ 'raster-opacity': 0.6 }} />
          </Source>
        )}
        
        {showRain && rainTimestamp && (
          <Source id="rain" type="raster" tiles={[`https://tile.cache.rainviewer.com/v2/radar/${rainTimestamp}/256/{z}/{x}/{y}/2/1_1.png`]} tileSize={256}>
            <Layer id="rain-layer" type="raster" paint={{ 'raster-opacity': 0.6 }} />
          </Source>
        )}
        
        <DeckGLOverlay layers={deckLayers} />

        {/* TOOLTIP */}
        {hoverInfo && hoverInfo.wind && (
          <div style={{
            position: 'absolute', zIndex: 2000, pointerEvents: 'none',
            left: hoverInfo.x + 15, top: hoverInfo.y + 15,
            background: 'rgba(15, 23, 42, 0.95)', color: '#e2e8f0', padding: '16px',
            borderRadius: '12px', fontFamily: 'Roboto, sans-serif', fontSize: '12px',
            border: `1px solid ${hoverInfo.prediction.color}`, 
            boxShadow: `0 0 25px ${hoverInfo.prediction.color}40`, 
            backdropFilter: 'blur(8px)', minWidth: '240px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                <h4 style={{ margin: 0, color: '#ef4444', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px' }}>
                  🔥 SPREAD ANALYSIS
                </h4>
                <span style={{ background: hoverInfo.prediction.color, color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                  {hoverInfo.prediction.level}
                </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{color:'#f87171', fontWeight:'bold'}}>Spread Speed</div>
              <div style={{textAlign:'right', fontWeight:'bold', color: '#f87171', fontSize:'14px'}}>
                {hoverInfo.prediction.speed} km/h
              </div>
              
              <div style={{height:'1px', background:'rgba(255,255,255,0.1)', gridColumn:'1/-1', margin:'4px 0'}}></div>
              
              <div style={{color:'#38bdf8'}}>Wind</div>
              <div style={{textAlign:'right', fontWeight:'bold', color: '#38bdf8'}}>
                {hoverInfo.wind.speed} m/s
              </div>
              
              <div style={{color:'#a3e635'}}>Temp</div>
              <div style={{textAlign:'right', fontWeight:'bold', color: '#a3e635'}}>
                {hoverInfo.weather ? `${hoverInfo.weather.temp}°C` : '...'}
              </div>
              
              <div style={{color:'#a3e635'}}>Humidity</div>
              <div style={{textAlign:'right', fontWeight:'bold', color: '#a3e635'}}>
                {hoverInfo.weather ? `${hoverInfo.weather.humidity}%` : '...'}
              </div>
              
              <div style={{color:'#d97706'}}>Terrain</div>
              <div style={{textAlign:'right', fontWeight:'bold', color: '#d97706'}}>
                {hoverInfo.prediction.terrain?.factor || '1.0x'}
              </div>
            </div>
          </div>
        )}
      </Map>
    </div>
  );
};

export default Map2D;