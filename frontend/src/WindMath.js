// src/WindMath.js

// 1. CONSTANTS (Matches standard global weather grid resolution)
const WIDTH = 360;  // 1 degree resolution
const HEIGHT = 180;

// --- CACHE STORAGE (Prevents API Spam & 400 Errors) ---
// Stores weather data so we don't re-fetch the same point instantly.
const WEATHER_CACHE = new Map();

/**
 * Calculates wind details for a specific coordinate
 * based on the invisible U/V grid data
 */
export const getWindAtLocation = (lat, lon, uData, vData) => {
    // If wind data hasn't loaded yet, return placeholder
    if (!uData || !vData || uData.length === 0) {
        return { speed: "0.0", direction: 0, u: 0, v: 0 };
    }

    // 2. SAFETY CHECK: Clamp coordinates to map bounds
    const clampedLat = Math.max(-90, Math.min(90, lat));
    const clampedLon = Math.max(-180, Math.min(180, lon));

    // 3. GRID MAPPING
    const gridX = Math.floor(clampedLon + 180);
    const gridY = Math.floor(clampedLat + 90);

    // Calculate index in the 1D array
    const index = (gridY * WIDTH) + gridX;

    // 4. EXTRACTION
    if (index < 0 || index >= uData.length) return { speed: "0.0", direction: 0 };

    const u = uData[index];
    const v = vData[index];

    // 5. VECTOR MATH (Physics)
    // Speed = Square Root of (U² + V²)
    const speed = Math.sqrt((u * u) + (v * v));
    
    // Direction = ArcTangent of (U, V)
    let angle = Math.atan2(u, v) * (180 / Math.PI);
    if (angle < 0) angle += 360; // Normalize to 0-360 compass

    return {
        speed: speed.toFixed(1), // m/s
        direction: Math.round(angle), // degrees
        u: u,
        v: v
    };
};

/**
 * Returns a text description of the spread risk based on wind speed
 */
export const getSpreadDescription = (speed) => {
    const s = parseFloat(speed);
    if (s < 3) return "Low Spread";
    if (s < 8) return "Moderate Risk";
    if (s < 15) return "Rapid Spread";
    return "EXTREME DANGER";
};

/**
 * Fetches accurate temperature, humidity AND ELEVATION from Open-Meteo API
 * UPDATED: Uses Caching + GMT Timezone to fix crashes.
 */
export const fetchFireWeather = async (lat, lon) => {
    // 1. GENERATE CACHE KEY (Round to 3 decimals to group close points)
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;

    // 2. CHECK CACHE
    if (WEATHER_CACHE.has(key)) {
        return WEATHER_CACHE.get(key); // Return saved data immediately
    }

    try {
        // 3. FETCH (Use 'GMT' to avoid 400 Bad Request errors)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m&timezone=GMT`;
        
        const response = await fetch(url);
        
        // Safety Check
        if (!response.ok) {
            console.warn(`Weather API Error: ${response.status}`);
            return null; 
        }

        const data = await response.json();
        
        if (!data.current) return null;

        const result = {
            temp: data.current.temperature_2m,          // Degrees Celsius
            humidity: data.current.relative_humidity_2m, // Percentage %
            elevation: data.elevation || 0 // Default to 0 if elevation missing
        };

        // 4. SAVE TO CACHE
        WEATHER_CACHE.set(key, result);

        return result;

    } catch (e) {
        console.error("Weather fetch failed", e);
        return null;
    }
};

/**
 * --- SCIENTIFIC RISK CALCULATOR (Legacy/Simple) ---
 * Calculates a Risk Score (0-100) based on Wind, Temp, and Humidity.
 */
export const calculateFireRisk = (windSpeed, temp, humidity) => {
    const v = parseFloat(windSpeed) || 0; // Wind (m/s)
    const t = parseFloat(temp) || 20;     // Temp (°C)
    const h = parseFloat(humidity) || 50; // Humidity (%)

    // SCORING SYSTEM (0 - 100)
    let score = 0;

    // A. Wind Factor (Push)
    if (v > 15) score += 35;       
    else if (v > 8) score += 20;
    else if (v > 3) score += 5;

    // B. Temperature Factor (Heat)
    if (t > 35) score += 35;       
    else if (t > 30) score += 20;
    else if (t > 25) score += 5;

    // C. Humidity Factor (Dryness)
    if (h < 20) score += 30;       
    else if (h < 40) score += 15;  
    else if (h < 60) score += 5;

    // Determine Level & Color
    if (score >= 80) return { level: "CATASTROPHIC", color: "#ffffff", score }; // White
    if (score >= 60) return { level: "EXTREME", color: "#ef4444", score };      // Red
    if (score >= 40) return { level: "HIGH", color: "#f97316", score };         // Orange
    if (score >= 20) return { level: "MODERATE", color: "#eab308", score };     // Yellow
    return { level: "LOW", color: "#84cc16", score };                           // Green
};

/**
 * --- NEW: HYBRID RATE OF SPREAD (ROS) PREDICTION ---
 * Calculates Predicted Speed (km/h) based on Wind, Weather, Terrain AND FIRE POWER (FRP).
 * Updated to fix "Zero Wind Paradox".
 */
export const calculateSpreadPrediction = (windSpeed, temp, humidity, elevation, frp = 0) => {
    const v = parseFloat(windSpeed) || 0; // m/s
    const t = parseFloat(temp) || 20;     // °C
    const h = parseFloat(humidity) || 50; // %
    const e = parseFloat(elevation) || 0; // meters
    const power = parseFloat(frp) || 0;   // MW (New: Fire Intensity)

    // 1. Convert Wind to km/h
    const windKmh = v * 3.6;

    // 2. Fuel Dryness Factor (Inverted Humidity)
    const dryFactor = (100 - h) * 0.01; 

    // 3. TERRAIN SLOPE FACTOR (Heuristic based on Elevation)
    let terrainFactor = 1.0; 
    let terrainDesc = "Flat (0-5°)";

    if (e > 2500) {
        terrainFactor = 4.0; // 45° Slope -> 4.0x Speed (EXTREME)
        terrainDesc = "Extreme (45°+)";
    }
    else if (e > 1500) { 
        terrainFactor = 3.0; // 30° Slope -> 3.0x Speed
        terrainDesc = "Steep (30°)"; 
    }
    else if (e > 800) { 
        terrainFactor = 2.0; // 20° Slope -> 2.0x Speed
        terrainDesc = "Mountain (20°)"; 
    }
    else if (e > 200) { 
        terrainFactor = 1.5; // 10° Slope -> 1.5x Speed
        terrainDesc = "Hilly (10°)"; 
    }

    // 4. BASE FORMULA (Rothermel Model: Wind + Slope)
    // Base Speed (0.1) * Wind Power * Dryness Power * Heat * TERRAIN MULTIPLIER
    let baseRos = 0.1 * (windKmh * 0.8) * (dryFactor * dryFactor) * (1 + t/40) * terrainFactor;

    // 5. NEW: RADIANT HEAT SPREAD (The "Inferno" Factor)
    // If FRP is high, the fire creates its own weather and spreads via radiation/spotting
    // even if wind is zero.
    // 100 MW = +0.5 km/h base expansion
    // 500 MW = +2.5 km/h base expansion
    let radiantSpeed = 0;
    if (power > 50) {
        radiantSpeed = (power / 100) * 0.5;
    }

    // 6. TOTAL CALCULATION
    let totalSpeed = baseRos + radiantSpeed;

    // Reality Caps
    if (totalSpeed < 0.1) totalSpeed = 0.1;
    if (totalSpeed > 35) totalSpeed = 35; // Higher cap for catastrophic events

    // Classification
    let level = "LOW";
    let color = "#84cc16"; // Green

    if (totalSpeed > 3) { level = "MODERATE"; color = "#eab308"; } // Yellow
    if (totalSpeed > 8) { level = "HIGH"; color = "#f97316"; }     // Orange
    if (totalSpeed > 15) { level = "CATASTROPHIC"; color = "#ef4444"; } // Red

    return {
        speed: totalSpeed.toFixed(1),
        unit: "km/h",
        level,
        color,
        terrain: {
            desc: terrainDesc,
            factor: terrainFactor.toFixed(1) + "x"
        }
    };
};