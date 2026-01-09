import React from "react";

const WindSpeedLegend = () => {
  return (
    <div style={{
      position: "absolute",
      bottom: "30px", 
      left: "20px",
      zIndex: 100,
      width: "320px",
      fontFamily: "'Roboto', 'Helvetica Neue', Arial, sans-serif",
      pointerEvents: "none"
    }}>
      {/* Label */}
      <div style={{ 
        color: "#94a3b8", 
        fontSize: "12px", 
        fontWeight: "500", 
        marginBottom: "6px",
        textTransform: "uppercase",
        letterSpacing: "1px"
      }}>
        Wind Speed (km/h)
      </div>

      {/* The Gradient Bar (White -> Blue -> Green -> Yellow -> Red) */}
      <div style={{
        height: "10px",
        width: "100%",
        borderRadius: "5px",
        // 🔥 UPDATED COLOR SCALE: White (Slow) -> Red (Fast)
        background: "linear-gradient(to right, #ffffff, #60a5fa, #4ade80, #facc15, #ef4444)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.5)"
      }}></div>

      {/* The Numbers */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        color: "white",
        fontSize: "12px",
        marginTop: "4px",
        fontWeight: "bold",
        textShadow: "0 1px 2px black"
      }}>
        <span>0</span>
        <span>20</span>
        <span>40</span>
        <span>60</span>
        <span>80</span>
        <span>100+</span>
      </div>
    </div>
  );
};

export default WindSpeedLegend;