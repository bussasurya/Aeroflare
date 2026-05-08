import React, { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import * as THREE from "three";
import WindSpeedLegend from "./WindSpeedLegend"; 
import LayerControl from "./LayerControl";
import Map2D from "./Map2D"; 

// --- CONFIGURATION ---
const EARTH_IMAGE = "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"; 
const BORDERS_URL = "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";
// Using a standard public CORS proxy for reliability if local server is down
const API_URL = `http://127.0.0.1:5000/api/wind?t=${Date.now()}`; 

// --- AEROFLARE LOGO ---
const AeroFlareLogo = () => (
  <div style={{
    position: "absolute",
    bottom: "85px", 
    left: "20px",
    zIndex: 200, 
    color: "white",
    fontFamily: "'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontSize: "42px", 
    letterSpacing: "-1px",
    pointerEvents: "none",
    textShadow: "0px 2px 4px rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    gap: "10px"
  }}>
    <div>
        <span style={{ fontWeight: "800" }}>Aero</span>
        <span style={{ fontWeight: "300", opacity: 0.9 }}>Flare</span>
    </div>
  </div>
);

const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
};

function App() {
  const globeDivRef = useRef();
  const globeInstance = useRef(null);
  const tooltipRef = useRef(null);
  
  // --- VIEW STATE ---
  const [viewMode, setViewMode] = useState("3D"); 
  const [mapViewState, setMapViewState] = useState({
    longitude: 78.0,
    latitude: 20.0,
    zoom: 4
  });

  // --- DATA REFS ---
  const windU = useRef(new Float32Array(180 * 360).fill(0)); 
  const windV = useRef(new Float32Array(180 * 360).fill(0));
  const particleSystem = useRef(null); 
  const animationFrameId = useRef(null);
  const globeMeshRef = useRef(null); 

  useEffect(() => {
    // 1. SETUP GLOBE
    if (!globeInstance.current) {
        globeInstance.current = Globe()(globeDivRef.current)
        .globeImageUrl(EARTH_IMAGE) 
        .backgroundColor("#000000")
        .showAtmosphere(true)
        .atmosphereColor("lightskyblue")
        .atmosphereAltitude(0.15)
        .pointOfView({ lat: 20.0, lng: 78.0, altitude: 1.5 })
        .onGlobeReady(() => {
            const scene = globeInstance.current.scene();
            globeMeshRef.current = scene.children.find(obj => obj.type === "Mesh");
        })
        .onZoom(({ lat, lng, altitude }) => {
            // Auto-switch to 2D if zoomed in very close
            if (altitude < 0.25) {
                handleModeChange("2D", { lat, lng });
            }
        });

        fetch(BORDERS_URL).then(res => res.json()).then(countries => {
            globeInstance.current.polygonsData(countries.features)
                   .polygonCapColor(() => 'rgba(0,0,0,0)')
                   .polygonSideColor(() => 'rgba(0,0,0,0)')
                   .polygonStrokeColor(() => 'rgba(255, 255, 255, 0.4)')
                   .polygonAltitude(0.0001);
        });

        // Fetch Wind Data
        fetch(API_URL)
          .then(res => res.json())
          .then(data => {
            data.forEach(p => {
                const latIdx = Math.round(p.lat + 90);
                const lngIdx = Math.round(p.lng + 180) % 360;
                const index = (latIdx * 360) + lngIdx;
                if (index >= 0 && index < windU.current.length) {
                    windU.current[index] = p.u;
                    windV.current[index] = p.v;
                }
            });
            initParticles(globeInstance.current); 
          })
          .catch(err => console.error("Wind Data Fetch Error:", err));

        globeInstance.current.controls().autoRotate = true;
        globeInstance.current.controls().autoRotateSpeed = 0.2;
    }

    const throttledMouseMove = throttle(handle3DMouseMove, 50);
    globeDivRef.current.addEventListener('mousemove', throttledMouseMove);

    return () => {
        if (globeDivRef.current) globeDivRef.current.removeEventListener('mousemove', throttledMouseMove);
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  const handleModeChange = (newMode, coords = null) => {
      if (newMode === viewMode) return;

      if (newMode === "2D") {
          const { lat, lng } = coords || globeInstance.current.pointOfView();
          setMapViewState({
              latitude: lat,
              longitude: lng,
              zoom: 4 
          });
          globeInstance.current.controls().autoRotate = false;
          setViewMode("2D");
      } 
      else {
          setViewMode("3D");
          if (globeInstance.current) {
              const { latitude, longitude } = mapViewState;
              globeInstance.current.pointOfView({
                  lat: latitude,
                  lng: longitude,
                  altitude: 1.5 
              }, 1000); 
              globeInstance.current.controls().autoRotate = true;
          }
      }
  };

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const handle3DMouseMove = (event) => {
      if (viewMode !== "3D" || !tooltipRef.current || !globeInstance.current) {
          if (viewMode !== "3D" && tooltipRef.current) tooltipRef.current.style.display = 'none';
          return;
      }

      const rect = globeDivRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, globeInstance.current.camera());
      const intersects = raycaster.intersectObjects(globeInstance.current.scene().children, true);
      const hit = intersects.find(d => d.object.type === 'Mesh');
      
      if (hit) {
          const point = hit.point;
          const R = globeInstance.current.getGlobeRadius();
          const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, point.y / R))) * 180 / Math.PI);
          const lng = ((Math.atan2(point.x, point.z) * 180 / Math.PI) + 90) % 360;
          const finalLng = lng > 180 ? lng - 360 : lng < -180 ? lng + 360 : lng;
          updateTooltip(finalLng, lat, event.clientX, event.clientY);
      } else {
          tooltipRef.current.style.display = 'none';
      }
  };

  const handle2DMouseMove = (event) => {
      if (!tooltipRef.current) return;
      const { lng, lat } = event.lngLat;
      updateTooltip(lng, lat, event.point.x, event.point.y);
  };

  const updateTooltip = (lng, lat, x, y) => {
      const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
      const lngStr = `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
      tooltipRef.current.style.display = 'block';
      tooltipRef.current.style.left = `${x + 15}px`;
      tooltipRef.current.style.top = `${y + 15}px`;
      tooltipRef.current.innerText = `${lngStr} ${latStr}`;
  };

  const initParticles = (globe) => {
      if (particleSystem.current) {
         if (!globe.scene().getObjectByProperty('uuid', particleSystem.current.uuid)) {
             globe.scene().add(particleSystem.current);
         }
         return;
      }

      const PARTICLE_COUNT = 10000; 
      const TRAIL_LENGTH = 40; 
      const particles = [];
      for(let i=0; i<PARTICLE_COUNT; i++) {
          particles.push({ lat: (Math.random()-0.5)*180, lng: (Math.random()-0.5)*360, alt: 0.015, age: Math.random()*100, trail: [] });
      }

      const totalSegments = PARTICLE_COUNT * (TRAIL_LENGTH - 1);
      const positions = new Float32Array(totalSegments * 2 * 3); 
      const colors = new Float32Array(totalSegments * 2 * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5000);
      
      const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false });
      const trailMesh = new THREE.LineSegments(geometry, material);
      trailMesh.frustumCulled = false; 
      trailMesh.renderOrder = 999;     
      
      globe.scene().add(trailMesh);
      particleSystem.current = trailMesh;

      const animate = () => {
          if (viewMode === "2D") {
              animationFrameId.current = requestAnimationFrame(animate);
              return;
          }

          if (!particleSystem.current || !globe) return;

          const posAttr = trailMesh.geometry.attributes.position.array;
          const colAttr = trailMesh.geometry.attributes.color.array;
          const uArray = windU.current;
          const vArray = windV.current;

          for (let i = 0; i < PARTICLE_COUNT; i++) {
              let p = particles[i];
              const latIdx = Math.round(p.lat + 90);
              const lngIdx = Math.round(p.lng + 180) % 360;
              const index = (latIdx * 360) + lngIdx;
              let u = 0, v = 0;
              if (index >= 0 && index < uArray.length) { u = uArray[index]; v = vArray[index]; }

              p.lng += u * 0.015; p.lat += v * 0.015;
              if (p.lng > 180) p.lng -= 360; if (p.lng < -180) p.lng += 360;
              if (p.lat > 85) p.lat = 85; if (p.lat < -85) p.lat = -85;

              const phi = (90 - p.lat) * (Math.PI / 180);
              const theta = (p.lng + 180) * (Math.PI / 180);
              const R = 100 * (1 + p.alt); 
              const currentX = R * Math.sin(phi) * Math.cos(theta);
              const currentY = R * Math.cos(phi);
              const currentZ = R * Math.sin(phi) * Math.sin(theta);

              p.trail.unshift({ x: currentX, y: currentY, z: currentZ });
              if (p.trail.length > TRAIL_LENGTH) p.trail.pop();

              const particleOffset = i * (TRAIL_LENGTH - 1) * 2 * 3;
              const speed = Math.abs(u) + Math.abs(v);
              let r=0.2, g=0.5, b=1.0; 
              if (speed > 10) { r=1; g=1; b=1; } else if (speed > 5) { r=0.4; g=0.8; b=1.0; }

              for (let j = 0; j < p.trail.length - 1; j++) {
                  const idx = particleOffset + (j * 6);
                  const p1 = p.trail[j];
                  const p2 = p.trail[j + 1];
                  if (Math.abs(p1.x - p2.x) > 100) {
                      posAttr[idx] = 0; posAttr[idx+1] = 0; posAttr[idx+2] = 0; posAttr[idx+3] = 0; posAttr[idx+4] = 0; posAttr[idx+5] = 0;
                  } else {
                      posAttr[idx] = p1.x; posAttr[idx+1] = p1.y; posAttr[idx+2] = p1.z;
                      posAttr[idx+3] = p2.x; posAttr[idx+4] = p2.y; posAttr[idx+5] = p2.z;
                  }
                  const alpha = Math.max(0, 1 - (j / TRAIL_LENGTH)); 
                  colAttr[idx] = r * alpha; colAttr[idx+1] = g * alpha; colAttr[idx+2] = b * alpha; 
                  colAttr[idx+3] = r * alpha * 0.8; colAttr[idx+4] = g * alpha * 0.8; colAttr[idx+5] = b * alpha * 0.8; 
              }
              p.age++;
              if (p.age > 200) { p.lat = (Math.random()-0.5)*180; p.lng = (Math.random()-0.5)*360; p.age = 0; p.trail = []; }
          }

          trailMesh.geometry.attributes.position.needsUpdate = true;
          trailMesh.geometry.attributes.color.needsUpdate = true;
          animationFrameId.current = requestAnimationFrame(animate);
      };
      animate();
  };

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative", backgroundColor: "#000", fontFamily: "'Roboto', 'Helvetica Neue', Arial, sans-serif" }}>
      
      {/* 1. 3D GLOBE */}
      <div 
        ref={globeDivRef} 
        style={{ 
            width: "100%", 
            height: "100%", 
            position: "absolute", 
            top: 0, 
            left: 0, 
            visibility: viewMode === "3D" ? "visible" : "hidden", 
            zIndex: 1
        }} 
      />

      {/* 2. 2D MAP */}
      {viewMode === "2D" && (
          <Map2D 
            viewState={mapViewState} 
            onViewStateChange={setMapViewState} 
            onMouseMove={handle2DMouseMove} 
            onZoomOut={() => handleModeChange("3D")} // Link back to 3D
            windU={windU}
            windV={windV}
          />
      )}

      {/* 3. GLOBAL UI LAYER (Always Visible) */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 100 }}>
        
        {/* Tooltip */}
        <div ref={tooltipRef} style={{
            position: "fixed",
            display: "none",
            background: "rgba(0, 0, 0, 0.7)", 
            padding: "6px 12px",
            borderRadius: "4px",
            color: "white",
            pointerEvents: "none",
            fontSize: "14px",
            fontWeight: "500", 
            whiteSpace: "nowrap",
            textShadow: "0px 1px 3px rgba(0,0,0,0.9)",
            fontFamily: "monospace" 
        }}></div>

        {/* HUD Elements */}
        <AeroFlareLogo />
        <LayerControl viewMode={viewMode} setViewMode={handleModeChange} />
        
        {/* CRITICAL FIX: Pass viewMode to the Legend so it can switch between Wind and Fire */}
        <WindSpeedLegend viewMode={viewMode} />
      </div>

    </div>
  );
}

export default App;