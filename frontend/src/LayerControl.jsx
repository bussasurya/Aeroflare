import React, { useState } from "react";

const LayerControl = ({ 
  viewMode, 
  setViewMode, 
  
  // --- NEW: MAP STYLE PROPS ---
  mapStyle,
  setMapStyle,

  // --- EXISTING PROPS ---
  showTemp,
  setShowTemp,
  
  showExtremeFire,
  setShowExtremeFire,
  showForestFire,
  setShowForestFire,
  showAgriFire,
  setShowAgriFire
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // --- Event Handlers ---
  const stopProp = (e) => e.stopPropagation();

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  };

  const handleReturnAction = (e) => {
    e.preventDefault(); // Prevent default behavior
    e.stopPropagation(); // Stop bubbling
    
    // Force immediate state updates
    setViewMode("3D");
    setIsMenuOpen(false);
  };

  // --- Sub-Components ---
  const Switch = ({ isOn, activeColor }) => (
    <div style={{
      position: "relative",
      width: "40px",
      height: "22px",
      background: isOn ? (activeColor || "#38bdf8") : "#475569", 
      borderRadius: "20px",
      transition: "background 0.2s ease",
      pointerEvents: "none" 
    }}>
      <div style={{
        position: "absolute",
        top: "3px",
        left: isOn ? "21px" : "3px",
        width: "16px",
        height: "16px",
        background: "white",
        borderRadius: "50%",
        transition: "left 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.3)"
      }}></div>
    </div>
  );

  const LayerOption = ({ label, active, onToggle, color }) => (
    <div 
      onClick={(e) => { 
        e.stopPropagation(); 
        onToggle(!active); 
      }}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 4px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        cursor: "pointer",
        userSelect: "none"
      }}
    >
      <span style={{ fontSize: "13px", fontWeight: "500", color: color || "#f1f5f9" }}>{label}</span>
      <Switch isOn={active} activeColor={color} />
    </div>
  );

  // --- Styles ---
  const containerStyle = {
    position: "absolute",
    top: "20px",
    right: "20px", 
    zIndex: 1000, 
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    fontFamily: "'Roboto', sans-serif",
    pointerEvents: "auto"
  };

  const menuButtonStyle = {
    background: isButtonHovered || isMenuOpen ? "rgba(30, 41, 59, 0.95)" : "rgba(15, 23, 42, 0.9)",
    border: `1px solid ${isMenuOpen ? "#38bdf8" : "rgba(255, 255, 255, 0.2)"}`,
    color: isMenuOpen ? "#38bdf8" : "#e2e8f0",
    borderRadius: "10px", 
    width: "44px",
    height: "44px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backdropFilter: "blur(12px)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    transition: "all 0.2s ease"
  };

  const panelStyle = {
    position: "absolute",
    top: "60px", 
    right: 0,
    width: "260px",
    background: "rgba(15, 23, 42, 0.95)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    padding: "16px",
    display: isMenuOpen ? "block" : "none",
    boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
    backdropFilter: "blur(16px)",
    color: "white",
    animation: "fadeIn 0.2s ease-out",
    transformOrigin: "top right"
  };

  const lineStyle = {
    width: "20px",
    height: "2px",
    background: "currentColor", 
    borderRadius: "2px",
    transition: "all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)"
  };

  return (
    <div style={containerStyle} onMouseDown={stopProp}>
      <style>
        {`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}
      </style>

      {/* BUTTON */}
      <div 
        style={menuButtonStyle} 
        onClick={handleMenuToggle}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
      >
        <div style={{ ...lineStyle, transform: isMenuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }}></div>
        <div style={{ ...lineStyle, opacity: isMenuOpen ? 0 : 1, transform: isMenuOpen ? "translateX(10px)" : "none" }}></div>
        <div style={{ ...lineStyle, transform: isMenuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }}></div>
      </div>

      {/* MENU PANEL */}
      {isMenuOpen && (
        <div style={panelStyle}>
          
          {/* --- NEW: MAP STYLE SWITCHER --- */}
          <div style={{ marginBottom: "15px" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px" }}>Map Style</h3>
            <div style={{ display: "flex", gap: "8px", background: "rgba(0,0,0,0.3)", padding: "4px", borderRadius: "8px" }}>
              <button 
                onClick={(e) => { e.stopPropagation(); setMapStyle('dark'); }}
                style={{ 
                  flex: 1, padding: "6px", border: "none", borderRadius: "6px", 
                  background: mapStyle === 'dark' ? "#38bdf8" : "transparent", 
                  color: mapStyle === 'dark' ? "#fff" : "#94a3b8", 
                  fontSize: "11px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" 
                }}
              >
                DARK
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setMapStyle('satellite'); }}
                style={{ 
                  flex: 1, padding: "6px", border: "none", borderRadius: "6px", 
                  background: mapStyle === 'satellite' ? "#10b981" : "transparent", 
                  color: mapStyle === 'satellite' ? "#fff" : "#94a3b8", 
                  fontSize: "11px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" 
                }}
              >
                SATELLITE
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 style={{ margin: 0, fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px" }}>Active Layers</h3>
            <span style={{ fontSize: "10px", color: "#10b981", fontWeight: "bold" }}>● LIVE</span>
          </div>
          
          {/* 1. Temp Heatmap (Replaced Wind/Rain) */}
          <LayerOption 
            label="🌡️ Temp Heatmap" 
            active={showTemp} 
            onToggle={setShowTemp} 
            color="#f87171"
          />
          
          <div style={{ height: "12px" }}></div>
          <h4 style={{ margin: "0 0 5px 0", fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>
            Fire Detection
          </h4>

          {/* 1. EXTREME (WHITE) */}
          <LayerOption 
            label="High" 
            active={showExtremeFire} 
            onToggle={setShowExtremeFire}
            color="#ffffff" 
          />

          {/* 2. HIGH (RED) */}
          <LayerOption 
            label="Medium" 
            active={showForestFire} 
            onToggle={setShowForestFire}
            color="#ef4444" 
          />
          
          {/* 3. NORMAL (YELLOW) */}
          <LayerOption 
            label="Normal" 
            active={showAgriFire} 
            onToggle={setShowAgriFire}
            color="#fbbf24" 
          />

          {viewMode === "2D" && (
            <div 
                style={{ 
                  marginTop: "15px",
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  color: "#38bdf8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "color 0.2s"
                }} 
                onClick={handleReturnAction}
            >
              <span style={{ fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>🌍</span> Return to Globe
              </span>
              <span style={{ fontSize: "18px" }}>›</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LayerControl;