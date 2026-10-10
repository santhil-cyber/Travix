import geopandas as gpd
from shapely.geometry import Polygon
import numpy as np
import os

print("Starting: Creating geographical grid...")

# Using Noida coordinates as per your request.
# You can change these if your dataset covers a different area.
MIN_LON, MIN_LAT = 77.30, 28.45  # Southwest corner of Noida
MAX_LON, MAX_LAT = 77.50, 28.65  # Northeast corner of Noida
GRID_SIZE = 0.002 # Approx. 222 meters

# Ensure the 'data' directory exists
os.makedirs('data', exist_ok=True)

lons = np.arange(MIN_LON, MAX_LON, GRID_SIZE)
lats = np.arange(MIN_LAT, MAX_LAT, GRID_SIZE)

polygons = []
grid_id_counter = 0

for i in range(len(lons)-1):
    for j in range(len(lats)-1):
        polygon = Polygon([
            (lons[i], lats[j]),
            (lons[i+1], lats[j]),
            (lons[i+1], lats[j+1]),
            (lons[i], lats[j+1])
        ])
        polygons.append({'grid_id': grid_id_counter, 'geometry': polygon})
        grid_id_counter += 1

grid_gdf = gpd.GeoDataFrame(polygons, crs="EPSG:4326")

output_path = 'data/grid.gpkg'
grid_gdf.to_file(output_path, driver='GPKG')

print(f"Successfully created {len(grid_gdf)} grid cells.")
print(f"Grid saved to {output_path}")
print("-" * 30)