import pandas as pd
import xgboost as xgb
from sklearn.preprocessing import OneHotEncoder
import joblib
import numpy as np
import os

print("Starting: Model Training...")

# --- Load the Feature Set ---
print("Loading master feature set...")
df = pd.read_csv('data/features_layer1.csv')
os.makedirs('models', exist_ok=True)

# --- 1. Train Layer 1 (Static Risk) Model ---
print("Training Layer 1 (Static Risk) model...")

# --- Define the Static Risk Score (Our Target Variable `y`) ---
weights = {
    'crime_count': 0.15, 
    'avg_crime_severity': 0.25,
    'hazard_count': 0.10, 
    'avg_hazard_risk_level': 0.20,
    'distance_to_police': -0.15, 
    'infra_cctv_camera_count': -0.05,
    'infra_street_light_count': -0.05,
    'hazard_poor_lighting_count': 0.03,
    'hazard_unpaved_road_count': 0.03,
    'hazard_stray_animal_presence_count': 0.03,
    'hazard_waterlogging_count': 0.03,
    'hazard_construction_site_count': 0.03,
    'hazard_traffic_congestion_count': 0.03
}

df['static_risk_score'] = (
    df['crime_count'] * weights['crime_count'] +
    df['avg_crime_severity'] * weights['avg_crime_severity'] +
    df['hazard_count'] * weights['hazard_count'] +
    df['avg_hazard_risk_level'] * weights['avg_hazard_risk_level'] +
    df['distance_to_police'] * -1 * weights['distance_to_police'] +
    df['infra_cctv_camera_count'] * -1 * weights['infra_cctv_camera_count'] +
    df['infra_street_light_count'] * -1 * weights['infra_street_light_count'] +
    df['hazard_poor_lighting_count'] * weights['hazard_poor_lighting_count'] +
    df['hazard_unpaved_road_count'] * weights['hazard_unpaved_road_count'] +
    df['hazard_stray_animal_presence_count'] * weights['hazard_stray_animal_presence_count'] +
    df['hazard_waterlogging_count'] * weights['hazard_waterlogging_count'] +
    df['hazard_construction_site_count'] * weights['hazard_construction_site_count'] +
    df['hazard_traffic_congestion_count'] * weights['hazard_traffic_congestion_count']
)

# Normalize to 0-100
min_score, max_score = df['static_risk_score'].min(), df['static_risk_score'].max()
df['static_risk_score'] = 100 * (df['static_risk_score'] - min_score) / (max_score - min_score)

# Train Layer 1 model
features_l1 = [col for col in df.columns if col not in ['grid_id', 'static_risk_score']]
X1 = df[features_l1]
y1 = df['static_risk_score']

model_l1 = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100, learning_rate=0.1, max_depth=5)
model_l1.fit(X1, y1)

model_l1_path = 'models/model_layer1.pkl'
joblib.dump(model_l1, model_l1_path)
print(f"Layer 1 model trained and saved to '{model_l1_path}'")

# --- 2. Train Layer 2 (Dynamic Risk) Model ---
print("\nTraining Layer 2 (Dynamic Risk) model...")
df['predicted_static_risk'] = model_l1.predict(X1)

time_categories = ['morning', 'afternoon', 'evening', 'night']
dynamic_df_list = []
for time in time_categories:
    temp_df = df[['grid_id', 'predicted_static_risk']].copy()
    temp_df['time_of_day'] = time
    dynamic_df_list.append(temp_df)
dynamic_df = pd.concat(dynamic_df_list)

time_multipliers = {'morning': 0.8, 'afternoon': 0.7, 'evening': 1.2, 'night': 1.8}
dynamic_df['final_risk_score'] = dynamic_df['predicted_static_risk'] * dynamic_df['time_of_day'].map(time_multipliers)

# One-hot encode time of day
X2_categorical = dynamic_df[['time_of_day']]
encoder = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
X2_encoded = encoder.fit_transform(X2_categorical)

X2_numeric = dynamic_df[['predicted_static_risk']]
X2 = np.concatenate([X2_numeric.values, X2_encoded], axis=1)
y2 = dynamic_df['final_risk_score']

# Train Layer 2 model
model_l2 = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100, learning_rate=0.1, max_depth=4)
model_l2.fit(X2, y2)

model_l2_path = 'models/model_layer2.pkl'
encoder_path = 'models/encoder_layer2.pkl'
joblib.dump(model_l2, model_l2_path)
joblib.dump(encoder, encoder_path)

print(f"Layer 2 model trained and saved to '{model_l2_path}'")
print(f"Time of day encoder saved to '{encoder_path}'")
print("-" * 30)
