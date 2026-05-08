// src/SpreadGeometry.js

/**
 * Calculates a destination point given a start point, distance (km), and bearing (degrees).
 * Uses the Haversine formula logic for Earth geometry.
 */
function getDestinationPoint(lat, lon, distanceKm, bearing) {
    const R = 6371; // Earth Radius in km
    const d = distanceKm / R; // Angular distance in radians
    const brng = (bearing * Math.PI) / 180; // Convert bearing to radians
    const lat1 = (lat * Math.PI) / 180;
    const lon1 = (lon * Math.PI) / 180;

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(d) + 
        Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
    );

    const lon2 = lon1 + Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

    return [
        (lon2 * 180) / Math.PI, // Longitude
        (lat2 * 180) / Math.PI  // Latitude
    ];
}

/**
 * Internal Helper: Generates a single fire polygon for a specific time horizon.
 * @param {number} hours - How many hours into the future (e.g., 1, 3, 6)
 */
const generateSingleZone = (lat, lon, speedKmh, windDir, frp, hours) => {
    // 1. Calculate Forward Distance (Head Fire)
    // Ensure we always see *something* (Heat Radiation Zone), even if speed is 0.
    const minZone = frp > 100 ? 1.0 : 0.2; 
    const effectiveSpeed = Math.max(speedKmh, 0.5); 
    
    // Distance = Speed * Time
    const forwardDist = Math.max(effectiveSpeed * hours, minZone);

    // 2. Shape Morphology (L/B Ratio)
    // High Wind = High Ratio (Narrow shape)
    // Low Wind = Low Ratio (Round shape)
    let lbRatio = 1.0 + (0.15 * effectiveSpeed);
    
    // Calculate Flank Width (Side Spread)
    let flankWidth = forwardDist / lbRatio;

    // "Inferno Bulge": High FRP forces the flanks wider (Spotting/Radiation)
    if (frp > 150) flankWidth *= 1.5; 

    // 3. Generate Points
    const points = [];
    const step = 10; // Smoothness (Degrees per step)

    // We scan 360 degrees to draw the ellipse.
    for (let angle = 0; angle <= 360; angle += step) {
        
        const rad = (angle * Math.PI) / 180;

        // Ellipse Math
        // We orient Y-axis as the "Forward" direction (Wind)
        const dy = forwardDist * Math.cos(rad); 
        const dx = flankWidth * Math.sin(rad);  
        let dist = Math.sqrt(dx*dx + dy*dy);

        // 4. "Backing Fire" Logic:
        // The fire spreads much slower upwind (tail) than downwind (head).
        // If angle is towards the rear (90 to 270 relative to nose), squash the distance.
        if (angle > 90 && angle < 270) {
             dist = dist * 0.25; 
        }

        // Rotate to match wind direction
        const bearing = (windDir + angle) % 360;
        points.push(getDestinationPoint(lat, lon, dist, bearing));
    }
    points.push(points[0]); // Close loop

    return points;
};

/**
 * MAIN EXPORT: Generates 3 Isochrone Layers (1hr, 3hr, 6hr)
 * Returns an Array of objects compatible with DeckGL.
 */
export const calculateIsochrones = (lat, lon, speedKmh, windDir, frp = 0) => {
    return [
        {
            // OUTER RING (6 Hours) - Yellow/Watch
            polygon: generateSingleZone(lat, lon, speedKmh, windDir, frp, 6),
            color: [234, 179, 8, 60], // Yellow, transparent
            lineColor: [234, 179, 8, 200],
            label: "6 Hours"
        },
        {
            // MIDDLE RING (3 Hours) - Orange/Warning
            polygon: generateSingleZone(lat, lon, speedKmh, windDir, frp, 3),
            color: [249, 115, 22, 80], // Orange
            lineColor: [249, 115, 22, 255],
            label: "3 Hours"
        },
        {
            // INNER RING (1 Hour) - Red/Critical
            polygon: generateSingleZone(lat, lon, speedKmh, windDir, frp, 1),
            color: [239, 68, 68, 120], // Red, solid
            lineColor: [255, 255, 255, 255], // White outline
            label: "1 Hour"
        }
    ];
};