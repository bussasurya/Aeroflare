/* eslint-disable no-restricted-globals */

// --- COLOR HELPER ---
const getSpeedColor = (speed) => {
    if (speed < 15) return [255, 255, 255]; 
    if (speed < 30) return [96, 165, 250];  
    if (speed < 50) return [74, 222, 128];  
    if (speed < 80) return [250, 204, 21];  
    return [239, 68, 68];                   
};

// --- PHYSICS HELPER ---
const getInterpolatedWind = (lng, lat, windU, windV) => {
    const normLng = ((lng + 180) % 360 + 360) % 360; 
    const normLat = Math.max(0, Math.min(179, lat + 90));
    const x0 = Math.floor(normLng);
    const x1 = (x0 + 1) % 360;
    const y0 = Math.floor(normLat);
    const y1 = Math.min(179, y0 + 1);
    const dx = normLng - x0;
    const dy = normLat - y0;
    const i00 = (y0 * 360) + x0;
    const i10 = (y0 * 360) + x1;
    const i01 = (y1 * 360) + x0;
    const i11 = (y1 * 360) + x1;

    // Safety check
    if (!windU || !windV || i00 >= windU.length || i11 >= windU.length) return { u: 0, v: 0 };

    const u = (windU[i00]*(1-dx) + windU[i10]*dx)*(1-dy) + (windU[i01]*(1-dx) + windU[i11]*dx)*dy;
    const v = (windV[i00]*(1-dx) + windV[i10]*dx)*(1-dy) + (windV[i01]*(1-dx) + windV[i11]*dx)*dy;
    return { u, v };
};

// --- MAIN GENERATOR ---
self.onmessage = function(e) {
    const { windU, windV, animationLoop } = e.data;
    
    const paths = [];
    const step = 3; // Density
    const cullRate = 0.4; // Culling
    const pathLength = 10; 

    for (let x = 0; x < 360; x += step) {
        for (let y = 0; y < 180; y += step) {
            
            if (Math.random() < cullRate) continue;

            let currLat = y - 90;
            let currLng = x - 180;
            const timeOffset = Math.floor(Math.random() * animationLoop);

            const pathCenter = [];
            const pathLeft = [];
            const pathRight = [];

            const { u: startU, v: startV } = getInterpolatedWind(currLng, currLat, windU, windV);
            const startSpeed = Math.sqrt(startU*startU + startV*startV);
            const color = getSpeedColor(startSpeed);

            let traceLat = currLat;
            let traceLng = currLng;

            for (let i = 0; i < pathLength; i++) {
                const { u, v } = getInterpolatedWind(traceLng, traceLat, windU, windV);
                const latRad = traceLat * (Math.PI / 180);
                const distortion = Math.max(0.1, Math.cos(latRad));
                
                traceLng += (u * 0.15) / distortion; 
                traceLat += v * 0.15;

                if (traceLat > 85) traceLat = 85;
                if (traceLat < -85) traceLat = -85;

                const t = (i + timeOffset) % animationLoop;
                const tFuture = t + animationLoop;

                pathCenter.push([traceLng, traceLat, t]);
                pathCenter.push([traceLng, traceLat, tFuture]);
                pathLeft.push([traceLng - 360, traceLat, t]);
                pathLeft.push([traceLng - 360, traceLat, tFuture]);
                pathRight.push([traceLng + 360, traceLat, t]);
                pathRight.push([traceLng + 360, traceLat, tFuture]);
            }

            const seg = (arr) => [
                { path: arr.filter((_, i) => i % 2 === 0), color }, 
                { path: arr.filter((_, i) => i % 2 !== 0), color }
            ];

            paths.push(...seg(pathCenter));
            paths.push(...seg(pathLeft));
            paths.push(...seg(pathRight));
        }
    }

    // Send data back to main thread
    self.postMessage(paths);
};