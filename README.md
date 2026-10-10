# 🛡️ Travix - Tourist Safety Monitoring Dashboard

**Travix** is an intelligent tourist safety monitoring and guidance platform that combines AI risk analytics, Aadhaar-based digital identity verification, interactive geofenced zones, and instant 24/7 emergency response.

![Travix Dashboard Preview](frontend/assets/travel2.png)

---

## 🌟 Key Features

1. **Aadhaar Digital Authentication & Audit Ledger**:
   - Secure identity verification for travelers and authorities.
   - Proof-of-work blockchain ledger recording tamper-proof audit trails for verified access.
   - Built-in one-click **Demo User**, **Demo Authority**, and **Guest Mode** access.

2. **AI-Powered Tourist Safety Monitoring**:
   - Machine learning risk prediction across geospatial grids.
   - Real-time heat classification: **Safe Zones**, **Warning/Caution Areas**, and **High Risk Hazards**.
   - Interactive Leaflet cartography with live geolocation and nearest safe zone routing.

3. **Curated Collections & Trip Planner**:
   - Create and organize custom travel collections (e.g., *Delhi Heritage Tour*, *Mountain Treks & Passes*).
   - Add zones directly from the map with live persistence.

4. **Dedicated Emergency Response Center (`/emergency.html`)**:
   - Instant **🔴 SOS Alert** trigger with acoustic alarms.
   - Live location sharing via Web Share API and Google Maps deep-link coordinates.
   - Direct helpline dialers: Police (`112` / `100`), Ambulance (`108`), Fire (`101`), Women Helpline (`1091`), Tourist Helpline (`1363`).
   - Actionable disaster safety guidelines for Fire, Flood, and Earthquakes.

5. **Aira AI Chatbot Assistant**:
   - Built-in virtual safety companion offering travel guidance, location assessment, and instant emergency tips.

---

## 👥 Demo Credentials

For quick testing without external databases:

| Role | Name | Aadhaar Number | DOB |
|---|---|---|---|
| **Tourist User** | Rajesh Kumar | `111122223333` | `1990-05-15` |
| **Tourist User** | Sunita Sharma | `222233334444` | `1985-11-22` |
| **Authority** | Amit Singh | `333344445555` | `2001-01-30` |

*(Or click the **User Demo**, **Authority Demo**, or **Guest Mode** buttons on the login screen).*

---

## 🏗️ Architecture

```
Travix/
├── api/                  # Vercel serverless API handlers (Auth, Zones, Blockchain)
│   ├── request-auth.js
│   ├── get-chain.js
│   ├── map-data.js
│   └── zones.js
├── frontend/             # Modern Vite + Vanilla HTML5/CSS3/ES6 interactive frontend
│   ├── index.html        # Main dashboard
│   ├── emergency.html    # Emergency & SOS response portal
│   ├── script.js         # Core dashboard client logic
│   ├── em.js             # Emergency module logic
│   ├── style.css         # Dashboard styling & theme system
│   ├── em.css            # Emergency center styling
│   ├── components/       # Chatbot and UI components
│   └── vite.config.js    # Multi-page build configuration
├── backend/              # Python Flask AI engine & spatial hazard analyzer
│   ├── app.py            # Flask REST API
│   ├── requirements.txt  # Python dependencies
│   ├── models/           # Scikit-learn / XGBoost risk models
│   └── data/             # Spatial grid, infrastructure, hazards, crime datasets
├── auth_backend/         # Node.js Express Aadhaar & Blockchain Ledger service
│   ├── server.js         # Express server
│   ├── database.js       # SQLite Aadhaar residents registry
│   └── services/         # Blockchain proof-of-work & crypto signing
├── vercel.json           # Vercel deployment & API rewrite configuration
└── .gitignore
```

---

## 🚀 Running Locally

### 1. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### 2. Python Backend (Optional)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 app.py
```
Runs on [http://localhost:5000](http://localhost:5000).

### 3. Auth & Blockchain Backend (Optional)
```bash
cd auth_backend
npm install
npm start
```
Runs on [http://localhost:3000](http://localhost:3000).

---

## ☁️ Deployment

Configured for **Vercel** with full static bundling and serverless API endpoints:
- Production builds run: `cd frontend && npm install && npm run build`
- Output served from: `frontend/dist`
- API routes automatically mapped from `/api/*`

---

## 📄 License
ISC
