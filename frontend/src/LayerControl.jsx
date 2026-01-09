import React, { useState } from "react";

const LayerControl = ({ 
  viewMode, 
  setViewMode, 
  showWind, 
  setShowWind, 
  showRain, 
  setShowRain 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // --- Event Handlers ---
  const stopProp = (e) => {
    e.stopPropagation();
  };

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleReturnAction = (e) => {
    e.stopPropagation();
    e.preventDefault(); 
    setIsMenuOpen(false); // Close menu when returning
    setViewMode("3D");
  };

  // --- Sub-Components ---

  // Custom Toggle Switch
  const Switch = ({ isOn }) => (
    <div style={{
      position: "relative",
      width: "40px",
      height: "22px",
      background: isOn ? "#38bdf8" : "#475569", 
      borderRadius: "20px",
      transition: "background 0.3s ease",
      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)"
    }}>
      <div style={{
        position: "absolute",
        top: "3px",
        left: isOn ? "21px" : "3px",
        width: "16px",
        height: "16px",
        background: "white",
        borderRadius: "50%",
        transition: "left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.3)"
      }}></div>
    </div>
  );

  // Reusable Row for Menu Items
  const LayerOption = ({ label, active, onToggle }) => (
    <div 
      onClick={(e) => { stopProp(e); onToggle(!active); }}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        cursor: "pointer",
        userSelect: "none"
      }}
    >
      <span style={{ fontSize: "14px", fontWeight: "500", color: "#f1f5f9" }}>{label}</span>
      <Switch isOn={active} />
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
    fontFamily: "'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    pointerEvents: "auto" // Ensures clicks register over canvas
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
    boxShadow: isMenuOpen ? "0 0 15px rgba(56, 189, 248, 0.3)" : "0 4px 10px rgba(0,0,0,0.3)",
    transition: "all 0.2s ease"
  };

  const panelStyle = {
    position: "absolute",
    top: "60px", 
    right: 0,
    width: "250px",
    background: "rgba(15, 23, 42, 0.95)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    padding: "16px",
    display: isMenuOpen ? "block" : "none",
    boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
    backdropFilter: "blur(16px)",
    color: "white",
    animation: "fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)", // Smoother animation
    transformOrigin: "top right"
  };

  const lineStyle = {
    width: "20px",
    height: "2px",
    background: "currentColor", // Inherits color from button
    borderRadius: "2px",
    transition: "all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)"
  };

  return (
    <div 
      style={containerStyle} 
      onDoubleClick={(e) => e.stopPropagation()} 
      onMouseDown={(e) => e.stopPropagation()}
    >
      <style>
        {`@keyframes fadeIn { from { opacity: 0; transform: scale(0.95) translateY(-10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}
      </style>

      {/* HAMBURGER BUTTON */}
      <div 
        style={menuButtonStyle} 
        onClick={handleMenuToggle} 
        onMouseDown={stopProp}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
      >
        <div style={{ ...lineStyle, transform: isMenuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }}></div>
        <div style={{ ...lineStyle, opacity: isMenuOpen ? 0 : 1, transform: isMenuOpen ? "translateX(10px)" : "none" }}></div>
        <div style={{ ...lineStyle, transform: isMenuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }}></div>
      </div>

      {/* MENU PANEL */}
      {isMenuOpen && (
        <div style={panelStyle} onMouseDown={stopProp}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "12px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            paddingBottom: "8px"
          }}>
            <h3 style={{ margin: 0, fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px" }}>
              Map Layers
            </h3>
            <span style={{ fontSize: "10px", color: "#64748b" }}>LIVE</span>
          </div>
          
          {/* Layer Toggles */}
          <LayerOption 
            label="Wind Flow" 
            active={showWind} 
            onToggle={setShowWind} 
          />
          
          <LayerOption 
            label="Rain Forecast" 
            active={showRain} 
            onToggle={setShowRain} 
          />

          {/* Return to Globe Button */}
          {viewMode === "2D" && (
            <div 
                style={{ 
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0 0 0",
                  marginTop: "8px",
                  color: "#38bdf8",
                  cursor: "pointer",
                  transition: "color 0.2s"
                }} 
                onClick={handleReturnAction}
                onMouseEnter={(e) => e.currentTarget.style.color = "#7dd3fc"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#38bdf8"}
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