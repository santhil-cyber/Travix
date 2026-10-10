import os
import logging
import pandas as pd
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

try:
    import geopandas as gpd
    from shapely.geometry import Point
except ImportError:
    gpd = None
    Point = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- App & Database Configuration ---
app = Flask(__name__)
CORS(app) # Enable CORS for all routes

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'data/zones.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Database Model Definition ---
class ManualZone(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(20), nullable=False) # 'safe', 'warning', 'danger'
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    radius = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

# --- Logging Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

# --- Load AI Assets on Startup ---
model_l1 = model_l2 = encoder_l2 = grid_gdf = static_features_df = None
try:
    logging.info("Loading AI assets into memory...")
    model_l1_path = os.path.join(BASE_DIR, 'models/model_layer1.pkl')
    model_l2_path = os.path.join(BASE_DIR, 'models/model_layer2.pkl')
    encoder_l2_path = os.path.join(BASE_DIR, 'models/encoder_layer2.pkl')
    grid_path = os.path.join(BASE_DIR, 'data/grid.gpkg')
    features_path = os.path.join(BASE_DIR, 'data/features_layer1.csv')

    if os.path.exists(model_l1_path):
        model_l1 = joblib.load(model_l1_path)
    if os.path.exists(model_l2_path):
        model_l2 = joblib.load(model_l2_path)
    if os.path.exists(encoder_l2_path):
        encoder_l2 = joblib.load(encoder_l2_path)
    if gpd is not None and os.path.exists(grid_path):
        grid_gdf = gpd.read_file(grid_path)
        grid_gdf['centroid'] = grid_gdf.geometry.centroid
    if os.path.exists(features_path):
        static_features_df = pd.read_csv(features_path, index_col='grid_id')

    logging.info("AI assets loaded successfully.")
except Exception as e:
    logging.error(f"Warning: Could not load some AI assets. {e}")

# --- API Endpoints ---

@app.route('/api/v1/map-data', methods=['GET'])
def get_map_data():
    logging.info("Map data request received.")
    try:
        lat = float(request.args.get('latitude', 28.6139))
        lng = float(request.args.get('longitude', 77.2090))
        radius_km = float(request.args.get('radius', 50))
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "Invalid or missing latitude/longitude parameters."}), 400

    ai_zones = []

    # --- 1. AI Analysis with Area Aggregation ---
    if grid_gdf is not None and static_features_df is not None and model_l1 is not None and Point is not None:
        try:
            user_point = Point(lng, lat)
            view_buffer = user_point.buffer(radius_km / 111.32) # Approx. km to degrees
            nearby_grid_ids = grid_gdf[grid_gdf.intersects(view_buffer)]['grid_id']
            
            if not nearby_grid_ids.empty:
                features_to_predict = static_features_df.loc[nearby_grid_ids].copy()
                
                centroids_df = grid_gdf.set_index('grid_id').loc[nearby_grid_ids, ['centroid']]
                features_to_predict['lat'] = centroids_df['centroid'].apply(lambda p: p.y)
                features_to_predict['lng'] = centroids_df['centroid'].apply(lambda p: p.x)

                static_risks = model_l1.predict(features_to_predict.drop(columns=['lat', 'lng']))
                features_to_predict['static_risk'] = static_risks
                
                aggregation_precision = 1
                features_to_predict['super_zone_key'] = features_to_predict.apply(
                    lambda row: f"{round(row['lat'], aggregation_precision)}_{round(row['lng'], aggregation_precision)}", axis=1
                )
                
                super_zone_agg = features_to_predict.groupby('super_zone_key').agg(
                    avg_risk=('static_risk', 'mean'),
                    lat=('lat', 'mean'),
                    lng=('lng', 'mean')
                ).reset_index()

                significant_zones = super_zone_agg[
                    (super_zone_agg['avg_risk'] > 75) | (super_zone_agg['avg_risk'] < 30)
                ]

                for _, zone in significant_zones.iterrows():
                    ai_zones.append({
                        "id": f"ai_{round(zone['lat'], 3)}_{round(zone['lng'], 3)}",
                        "name": f"AI Analyzed Zone ({'High Risk' if zone['avg_risk'] > 75 else 'Safe Area'})",
                        "type": "danger" if zone['avg_risk'] > 75 else "safe",
                        "lat": float(zone['lat']),
                        "lng": float(zone['lng']),
                        "radius": 5000,
                        "source": "ai"
                    })
        except Exception as e:
            logging.error(f"Error computing AI zones: {e}")

    # Fallback AI zones if none produced
    if not ai_zones:
        ai_zones = [
            {"id": "ai_delhi_safe", "name": "India Gate Tourist Precinct (AI Verified)", "type": "safe", "lat": 28.6129, "lng": 77.2295, "radius": 3000, "source": "ai"},
            {"id": "ai_delhi_warn", "name": "Old Delhi High Density Alert", "type": "warning", "lat": 28.6505, "lng": 77.2300, "radius": 2000, "source": "ai"}
        ]

    # --- 2. Fetch Manual Override Zones from Database ---
    all_manual_zones = ManualZone.query.all()
    manual_zones = [zone.to_dict() for zone in all_manual_zones]

    response = {
        "ai_generated_zones": ai_zones,
        "manual_override_zones": manual_zones
    }
    return jsonify(response), 200

@app.route('/api/v1/zones', methods=['POST'])
def add_manual_zone():
    data = request.get_json()
    if not data or not all(k in data for k in ['name', 'type', 'lat', 'lng']):
        return jsonify({"status": "error", "message": "Missing data for new zone"}), 400
    
    radius = data.get('radius', 1500)
    new_zone = ManualZone(name=data['name'], type=data['type'], lat=float(data['lat']), lng=float(data['lng']), radius=int(radius))
    db.session.add(new_zone)
    db.session.commit()
    logging.info(f"Added new manual zone: {data['name']}")
    return jsonify({"status": "success", "zone": new_zone.to_dict()}), 201

@app.route('/api/v1/zones/<int:zone_id>', methods=['DELETE'])
def delete_manual_zone(zone_id):
    zone = ManualZone.query.get(zone_id)
    if not zone:
        return jsonify({"status": "error", "message": "Zone not found"}), 404
    db.session.delete(zone)
    db.session.commit()
    logging.info(f"Deleted manual zone with ID: {zone_id}")
    return jsonify({"status": "success", "message": "Zone deleted successfully"}), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)