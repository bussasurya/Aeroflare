import React from "react";

const WindSpeedLegend = ({ viewMode }) => {
  const isFireMode = viewMode === "2D";

  return (
    <div
      style={{
        position: "absolute",
        bottom: "40px",
        left: "20px",
        zIndex: 100,
        width: "320px",
        fontFamily: "'Roboto', 'Helvetica Neue', Arial, sans-serif",
        pointerEvents: "none"
      }}
    >
      {/* Label */}
      <div
        style={{
          color: "#94a3b8",
          fontSize: "11px",
          fontWeight: "600",
          marginBottom: "10px",
          textTransform: "uppercase",
          letterSpacing: "1.5px"
        }}
      >
        {isFireMode ? "Fire Radiative Power (MW)" : "Wind Speed (km/h)"}
      </div>

      {/* Gradient Bar */}
      <div
        style={{
          height: "10px",
          width: "100%",
          borderRadius: "5px",
          background: isFireMode
            ? "linear-gradient(to right, #fbbf24, #ef4444, #ffffff)"
            : "linear-gradient(to right, #ffffff, #60a5fa, #4ade80, #facc15, #ef4444)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
          marginBottom: "6px"
        }}
      />

      {/* Scale Numbers */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "white",
          fontSize: "12px",
          fontWeight: "bold",
          textShadow: "0 1px 2px black"
        }}
      >
        {isFireMode ? (
          <>
            <span>0</span>
            <span>30</span>
            <span>60</span>
            <span>90</span>
            <span>120</span>
            <span>150+</span>
          </>
        ) : (
          <>
            <span>0</span>
            <span>20</span>
            <span>40</span>
            <span>60</span>
            <span>80</span>
            <span>100+</span>
          </>
        )}
      </div>
    </div>
  );
};

export default WindSpeedLegend;
