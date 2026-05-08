import React from 'react';

const AlertPanel = ({ alerts, onSelectAlert, selectedAlert, onReset }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      zIndex: 1000,
      width: '280px',
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontFamily: "'Roboto', sans-serif",
      overflow: 'hidden'
    }}>

      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(239, 68, 68, 0.1)',
        borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '13px',
          color: '#ef4444',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          fontWeight: '800'
        }}>
          🚨 Critical Threats
        </h3>
        <span style={{
          fontSize: '10px',
          background: '#ef4444',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '10px',
          fontWeight: 'bold'
        }}>
          {alerts.length} ACTIVE
        </span>
      </div>

      {/* Alert List */}
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {alerts.map((alert, index) => (
          <div
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onSelectAlert(alert);
            }}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) =>
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            }
            onMouseLeave={(e) =>
              e.currentTarget.style.background = 'transparent'
            }
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <span style={{
                fontSize: '12px',
                color: '#fbbf24',
                fontWeight: 'bold'
              }}>
                🔥 {alert.fire.frp.toFixed(0)} MW
              </span>

              <span style={{
                fontSize: '11px',
                color: '#94a3b8'
              }}>
                {(alert.wind.speed * 3.6).toFixed(0)} km/h Wind
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: '#e2e8f0'
            }}>
              <span
                style={{
                  transform: `rotate(${alert.wind.direction}deg)`,
                  display: 'inline-block'
                }}
              >
                ➤
              </span>
              <span>Spreading {getDirectionLabel(alert.wind.direction)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* RESET BUTTON */}
      {selectedAlert && (
        <div style={{ padding: '12px 16px' }}>
          <button
            onClick={onReset}
            style={{
              width: '100%',
              background: 'rgba(239, 68, 68, 0.9)',
              color: '#fff',
              border: 'none',
              padding: '10px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
            onMouseEnter={(e) =>
              e.currentTarget.style.background = 'rgba(239, 68, 68, 1)'
            }
            onMouseLeave={(e) =>
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'
            }
          >
            ← Reset View
          </button>
        </div>
      )}

    </div>
  );
};

// Helper for direction label
const getDirectionLabel = (deg) => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
};

export default AlertPanel;
