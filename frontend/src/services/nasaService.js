// frontend/src/services/nasaService.js

export const getHeatmapLayerUrl = () => {
    // 1. STRATEGY: "Guaranteed Smooth Map"
    // We use a Monthly Composite. This merges 30 days of data to erase ALL clouds.
    // We go back 2 months to ensure the map is fully processed and available.
    
    const date = new Date();
    date.setMonth(date.getMonth() - 2); 
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    // Monthly layers are ALWAYS stored as Day "01"
    const dateStr = `${year}-${month}-01`;

    // 2. NASA GIBS "Land Surface Temperature (Monthly)"
    // Layer: MODIS_Terra_Land_Surface_Temp_Monthly
    // Visual: Solid Red/Blue gradients. ZERO patches.
    const url = `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&LAYERS=MODIS_Terra_Land_Surface_Temp_Monthly&VERSION=1.3.0&FORMAT=image/png&TRANSPARENT=true&WIDTH=4096&HEIGHT=2048&CRS=EPSG:4326&BBOX=-90,-180,90,180&TIME=${dateStr}`;
    
    console.log(`🔗 Loading Smooth Monthly Heatmap (${dateStr}):`, url);
    return url;
};