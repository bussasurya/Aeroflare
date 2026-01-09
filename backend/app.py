import os
import requests
import xarray as xr
import numpy as np
import json
from datetime import datetime, timedelta, timezone
from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)
CORS(app)

GRIB_FILENAME = "wind_data.grib2"

def get_latest_noaa_url():
    # NOAA works in UTC, so we keep logic in UTC
    now = datetime.now(timezone.utc)
    current_hour = now.hour
    
    # Determine Latest Stable Run (conservative 5-hour delay)
    if current_hour < 5:
        run_time = now - timedelta(days=1)
        run_hour = 18
    elif current_hour < 11:
        run_time = now
        run_hour = 0
    elif current_hour < 17:
        run_time = now
        run_hour = 6
    elif current_hour < 23:
        run_time = now
        run_hour = 12
    else:
        run_time = now
        run_hour = 18
        
    # Calculate forecast offset
    hours_diff = current_hour - run_hour
    if hours_diff < 0: 
        hours_diff += 24
    
    forecast_step = 3 * round(hours_diff / 3)
    f_str = f"{forecast_step:03d}"

    date_str = run_time.strftime("%Y%m%d")
    run_str = f"{run_hour:02d}"

    # Print logic time in UTC (for debugging)
    print(f"🕒 Logic (UTC): {current_hour:02d}z | Run: {run_str}z | Forecast: +{f_str}h")
    
    url = (
        f"https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl"
        f"?file=gfs.t{run_str}z.pgrb2.0p25.f{f_str}"
        f"&lev_10_m_above_ground=on&var_UGRD=on&var_VGRD=on"
        f"&dir=%2Fgfs.{date_str}%2F{run_str}%2Fatmos"
    )
    
    return url

def download_and_process_data():
    if os.path.exists(GRIB_FILENAME):
        os.remove(GRIB_FILENAME)

    url = get_latest_noaa_url()
    print(f"🌍 Downloading: {url[:80]}...")
    
    try:
        response = requests.get(url, timeout=120)
        
        if response.status_code != 200:
            print(f"❌ Failed (Status {response.status_code})")
            # Try fallback to f000 (Current Analysis)
            url_backup = url.replace(url[-9:-5], "f000")
            print(f"🔄 Trying backup f000...")
            response = requests.get(url_backup, timeout=120)
            
            if response.status_code != 200:
                print(f"❌ Backup also failed! Status: {response.status_code}")
                return None

        with open(GRIB_FILENAME, 'wb') as f:
            f.write(response.content)
        
        file_size_mb = os.path.getsize(GRIB_FILENAME) / (1024*1024)
        print(f"✅ Downloaded {file_size_mb:.2f} MB. Parsing...")

        # Open with cfgrib
        ds = xr.open_dataset(
            GRIB_FILENAME, 
            engine='cfgrib', 
            backend_kwargs={
                'filter_by_keys': {
                    'typeOfLevel': 'heightAboveGround', 
                    'level': 10
                }
            }
        )
        
        # === CRITICAL: TIME CONVERSION TO IST (UTC + 5:30) ===
        ist_offset = timedelta(hours=5, minutes=30)

        # 1. Get Raw UTC Times from File/System
        ref_time_utc = pd.Timestamp(ds.time.values).to_pydatetime().replace(tzinfo=timezone.utc)
        valid_time_utc = pd.Timestamp(ds.valid_time.values).to_pydatetime().replace(tzinfo=timezone.utc) if 'valid_time' in ds else ref_time_utc
        current_time_utc = datetime.now(timezone.utc)

        # 2. Calculate Age
        data_age = current_time_utc - valid_time_utc
        
        # 3. Convert to IST
        ref_time_ist = ref_time_utc + ist_offset
        valid_time_ist = valid_time_utc + ist_offset
        current_time_ist = current_time_utc + ist_offset

        print("=" * 50)
        print(f"📅 REFERENCE TIME (IST): {ref_time_ist.strftime('%Y-%m-%d %I:%M %p')}")
        print(f"📅 VALID TIME (IST):     {valid_time_ist.strftime('%Y-%m-%d %I:%M %p')}")
        print(f"📅 CURRENT TIME (IST):   {current_time_ist.strftime('%Y-%m-%d %I:%M %p')}")
        print(f"⏰ DATA AGE:             {data_age.total_seconds()/3600:.1f} hours old")
        
        if data_age.total_seconds() > 6*3600:
            print("⚠️  WARNING: Data is >6 hours old!")
        
        # === VERIFICATION: Sample Points ===
        # Stockholm (59.3°N, 18.0°E)
        stockholm = ds.sel(latitude=59.3, longitude=18.0, method="nearest")
        speed_stk = float(np.sqrt(stockholm.u10**2 + stockholm.v10**2))
        
        # Mongolia (46.0°N, 103.0°E)
        mongolia = ds.sel(latitude=46.0, longitude=103.0, method="nearest")
        speed_mon = float(np.sqrt(mongolia.u10**2 + mongolia.v10**2))
        
        print(f"🏙️  Stockholm: {speed_stk:.2f} m/s ({speed_stk*3.6:.1f} km/h)")
        print(f"🏜️  Mongolia:  {speed_mon:.2f} m/s ({speed_mon*3.6:.1f} km/h)")
        print("=" * 50)

        # Coarsen for performance
        ds_coarse = ds.isel(latitude=slice(0, None, 4), longitude=slice(0, None, 4))

        # Convert to JSON
        wind_data = []
        lats = ds_coarse.latitude.values
        lons = ds_coarse.longitude.values
        u = ds_coarse.u10.values
        v = ds_coarse.v10.values

        for i in range(len(lats)):
            for j in range(len(lons)):
                u_val = float(u[i,j])
                v_val = float(v[i,j])
                
                # Only include points with significant wind
                if abs(u_val) > 0.1 or abs(v_val) > 0.1:
                    lon_val = float(lons[j])
                    # Convert 0-360 to -180-180 for standard GeoJSON
                    if lon_val > 180:
                        lon_val -= 360
                    
                    wind_data.append({
                        "lat": float(lats[i]),
                        "lng": lon_val,
                        "u": u_val,
                        "v": v_val
                    })
        
        print(f"✅ Processed {len(wind_data)} wind vectors")
        
        return wind_data

    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return None

@app.route('/api/wind', methods=['GET'])
def get_wind():
    data = download_and_process_data()
    return jsonify(data) if data else (jsonify({"error": "Failed to fetch wind data"}), 500)

if __name__ == '__main__':
    app.run(debug=True, port=5000)