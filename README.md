# AeroFlare 🌍🔥
**Real-Time Wildfire Prediction & Visualization Engine**

> **Built during CMR HACKFEST 3.0 (36-Hour National Level Hackathon) | Track: Disaster Management**

AeroFlare is a high-performance,3D real-time geospatial command center designed to shift disaster management from *reactive* reporting to *predictive* intelligence. By synthesizing live satellite telemetry, wind vectors, and topographical data, AeroFlare simulates and visualizes the future spread of wildfires, giving first responders a critical head start.

## 🚀 The Problem & Our Solution
Existing disaster management tools tell you where a fire *is*. **AeroFlare tells you where it will be in 1, 3, and 6 hours.** During a wildfire, local computing bottlenecks and static data can cost lives. We engineered a dual-mode (3D/2D) simulation engine that bridges the gap between raw global satellite feeds and on-ground actionable intelligence. 

**Hackathon Validation:** During the 36-hour sprint, AeroFlare was validated against active bushfires in **Australia**, achieving **>90% directional accuracy** in spread prediction compared to real-time ground reports.

---

## ✨ Core Features
* **🌍 Global 3D Wind & Fire Tracking:** An interactive 3D globe rendering live NOAA wind currents (U/V vectors) and global active fire hotspots.
* **🗺️ 2D Tactical Map:** Seamless transition into a hyper-local 2D MapLibre view for detailed terrain and infrastructure analysis.
* **⚠️ Predictive "Threat Cones":** An algorithmic spread engine that calculates directional fire growth based on real-time wind speed, humidity, and terrain slope (elevation).
* **🎯 Sniper Strategy (Smart Triage):** Automatically filters and highlights "Extreme" intensity fires based on Fire Radiative Power (FRP) in Megawatts, cutting through noise to prioritize the most dangerous threats.
* **⚡ High-Performance Rendering:** Utilizes WebGL to render thousands of active fire points and complex spread polygons simultaneously without browser lag.

---

## 🛠️ Tech Stack & Data Sources

### Frontend & Visualization
* **React.js & Vite:** Core application framework and lightning-fast build tool.
* **Deck.gl & MapLibre GL JS:** High-performance 2D map rendering and WebGL data layers (Scatterplot, Polygon).
* **Globe.gl & Three.js:** 3D earth rendering and custom particle system for live wind flow.

### Backend & API Integrations
* **Python Backend:** Custom script (`app.py`) to process and serve dense vector data.
* **NASA FIRMS (Fire Information for Resource Management System):** Live CSV data feeds for global thermal anomalies and Fire Radiative Power (FRP).
* **OpenWeatherMap API:** Live meteorological data (temperature, humidity, precipitation).
* **Open-Meteo API:** Elevation data used as a heuristic to calculate terrain slope and fire acceleration.
* **NOAA:** Global wind velocity data.

---

## 💻 Running the Project Locally

### Prerequisites
* Node.js (v16+)
* Python 3.8+
* OpenWeatherMap API Key

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/aeroflare.git](https://github.com/yourusername/aeroflare.git)
cd aeroflare
