import pandas as pd
import geopandas as gpd
from scipy.spatial import cKDTree
import numpy as np
import os

print("Starting: Feature Engineering...")

# --- 1. Load All Datasets ---
print("Loading data...")
grid = gpd.read_file('data/grid.gpkg')
crimes_df = pd.read_csv('data/crimes.csv')
infra_df = pd.read_csv('data/infrastructure.csv')
hazards_df = pd.read_csv('data/hazards.csv')

# --- 2. Convert DataFrames to GeoDataFrames for spatial operations ---
crimes_gdf = gpd.GeoDataFrame(
    crimes_df, geometry=gpd.points_from_xy(crimes_df.longitude, crimes_df.latitude), crs="EPSG:4326")
infra_gdf = gpd.GeoDataFrame(
    infra_df, geometry=gpd.points_from_xy(infra_df.longitude, infra_df.latitude), crs="EPSG:4326")
hazards_gdf = gpd.GeoDataFrame(
    hazards_df, geometry=gpd.points_from_xy(hazards_df.longitude, hazards_df.latitude), crs="EPSG:4326")

# --- 3. Aggregate Features by Grid Cell using Spatial Join ---
print("Aggregating features per grid cell...")

joined_crimes = gpd.sjoin(crimes_gdf, grid, how="inner", predicate='within')
joined_infra = gpd.sjoin(infra_gdf, grid, how="inner", predicate='within')
joined_hazards = gpd.sjoin(hazards_gdf, grid, how="inner", predicate='within')

# -------------------- CRIME FEATURES --------------------
print("Processing crime features...")
crime_type_dummies = pd.get_dummies(joined_crimes['crime_type'], prefix='crime')

# Ensure all expected columns exist
expected_crime_cols = [
    'crime_theft',
    'crime_scam',
    'crime_harassment',
    'crime_illegal_entry',
    'crime_vehicle_theft',
    'crime_public_nuisance'
]
for col in expected_crime_cols:
    if col not in crime_type_dummies:
        crime_type_dummies[col] = 0

joined_crimes = pd.concat([joined_crimes, crime_type_dummies], axis=1)

crime_features = joined_crimes.groupby('grid_id').agg(
    crime_count=('crime_id', 'count'),
    avg_crime_severity=('severity', 'mean'),
    crime_theft_count=('crime_theft', 'sum'),
    crime_scam_count=('crime_scam', 'sum'),
    crime_harassment_count=('crime_harassment', 'sum'),
    crime_illegal_entry_count=('crime_illegal_entry', 'sum'),
    crime_vehicle_theft_count=('crime_vehicle_theft', 'sum'),
    crime_public_nuisance_count=('crime_public_nuisance', 'sum')
).reset_index()

# -------------------- INFRASTRUCTURE FEATURES --------------------
print("Processing infrastructure features...")
infra_type_dummies = pd.get_dummies(joined_infra['infra_type'], prefix='infra')

expected_infra_cols = [
    'infra_street_light',
    'infra_cctv_camera',
    'infra_police_post',
    'infra_metro_station',
    'infra_security_guard',
    'infra_hospital'
]
for col in expected_infra_cols:
    if col not in infra_type_dummies:
        infra_type_dummies[col] = 0

joined_infra = pd.concat([joined_infra, infra_type_dummies], axis=1)

infra_features = joined_infra.groupby('grid_id').agg(
    infra_police_post_count=('infra_police_post', 'sum'),
    infra_hospital_count=('infra_hospital', 'sum'),
    infra_street_light_count=('infra_street_light', 'sum'),
    infra_cctv_camera_count=('infra_cctv_camera', 'sum'),
    infra_metro_station_count=('infra_metro_station', 'sum'),
    infra_security_guard_count=('infra_security_guard', 'sum')
).reset_index()

# -------------------- HAZARD FEATURES --------------------
print("Processing hazard features...")
hazard_type_dummies = pd.get_dummies(joined_hazards['hazard_type'], prefix='hazard')

expected_hazard_cols = [
    'hazard_poor_lighting',
    'hazard_unpaved_road',
    'hazard_stray_animal_presence',
    'hazard_waterlogging',
    'hazard_construction_site',
    'hazard_traffic_congestion'
]
for col in expected_hazard_cols:
    if col not in hazard_type_dummies:
        hazard_type_dummies[col] = 0

joined_hazards = pd.concat([joined_hazards, hazard_type_dummies], axis=1)

hazard_features = joined_hazards.groupby('grid_id').agg(
    hazard_count=('hazard_id', 'count'),
    avg_hazard_risk_level=('risk_level', 'mean'),
    hazard_poor_lighting_count=('hazard_poor_lighting', 'sum'),
    hazard_unpaved_road_count=('hazard_unpaved_road', 'sum'),
    hazard_stray_animal_presence_count=('hazard_stray_animal_presence', 'sum'),
    hazard_waterlogging_count=('hazard_waterlogging', 'sum'),
    hazard_construction_site_count=('hazard_construction_site', 'sum'),
    hazard_traffic_congestion_count=('hazard_traffic_congestion', 'sum')
).reset_index()

# --- 4. Calculate Distance Features ---
print("Calculating distance features...")
def calculate_nearest_distance(grid_gdf, points_gdf, column_name):
    if points_gdf.empty:
        grid_gdf[column_name] = np.inf
        return grid_gdf
    grid_centroids = np.array(list(zip(grid_gdf.geometry.centroid.y, grid_gdf.geometry.centroid.x)))
    points = np.array(list(zip(points_gdf.geometry.y, points_gdf.geometry.x)))
    kdtree = cKDTree(points)
    distances, _ = kdtree.query(grid_centroids, k=1)
    grid_gdf[column_name] = distances
    return grid_gdf

police_stations = infra_gdf[infra_gdf['infra_type'] == 'police_post']
hospitals = infra_gdf[infra_gdf['infra_type'] == 'hospital']
grid = calculate_nearest_distance(grid, police_stations, 'distance_to_police')
grid = calculate_nearest_distance(grid, hospitals, 'distance_to_hospital')

# --- 5. Combine All Features and Save ---
print("Combining all features and saving...")
df = grid.merge(crime_features, on='grid_id', how='left')
df = df.merge(infra_features, on='grid_id', how='left')
df = df.merge(hazard_features, on='grid_id', how='left')
df = df.drop(columns=['geometry'])
df = df.fillna(0)

output_path = 'data/features_layer1.csv'
df.to_csv(output_path, index=False)

print(f"Successfully created master feature set with {len(df.columns)} columns.")
print(f"Feature set saved to '{output_path}'")
print("-" * 30)
