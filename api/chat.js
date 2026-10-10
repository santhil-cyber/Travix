module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body || {};
    const text = String(message || '').toLowerCase().trim();

    let reply = "";

    if (!text) {
        reply = "Hello! I am Aira, your Travix AI safety companion. Ask me anything about regional safety, finding safe zones, travel routes, or emergency help!";
    } else if (text.includes('delhi') || text.includes('new delhi')) {
        reply = "📍 **Delhi Safety Status**:\n• **Verified Safe Zones**: India Gate, Connaught Place, Qutub Minar, and Red Fort are heavily monitored with high security.\n• **Caution Areas**: Exercise extra vigilance in crowded Old Delhi bazaars and avoid isolated stretches of Yamuna riverfront after dark.\n• **Emergency Transit**: Delhi Metro operates secure women-only coaches and CCTV-monitored stations.";
    } else if (text.includes('tawang') || text.includes('arunachal')) {
        reply = "🏔️ **Tawang Monastery Region**:\n• Status: **Verified Safe Zone** (Elevation: 3,048m).\n• Note: Ensure valid Inner Line Permit (ILP) is registered.\n• Weather Advisory: Check road clearance before crossing Sela Pass.";
    } else if (text.includes('sela') || text.includes('pass') || text.includes('altitude')) {
        reply = "⚠️ **Sela Pass Advisory**:\n• Status: **High Altitude Hazard Warning** (13,700 ft).\n• Rapid temperature drops and sudden snow/fog can reduce visibility. Travel during daylight (before 3:30 PM) with acclimatization breaks.";
    } else if (text.includes('safe zone') || text.includes('nearest') || text.includes('find safe')) {
        reply = "🗺️ **Nearest Verified Safe Zones**:\n1. **India Gate Corridor** (Green Zone • 2.5 km radius)\n2. **Connaught Place Central Hub** (Green Zone • 2.0 km radius)\n3. **Qutub Minar Cultural Precinct** (Green Zone • 1.8 km radius)\n4. **Red Fort Tourist Zone** (Green Zone • 2.2 km radius)\n\n👉 *You can inspect live boundaries on the **Locations** map tab.*";
    } else if (text.includes('emergency') || text.includes('sos') || text.includes('help') || text.includes('police') || text.includes('ambulance')) {
        reply = "🚨 **EMERGENCY ASSISTANCE CHANNELS**:\n• **National Emergency**: 112\n• **Police Control Room**: 100\n• **Medical Ambulance**: 108\n• **Women Helpline**: 1091 / 181\n• **Tourist Police Helpline**: 1363\n\n👉 *Click the **Emergency** button in the top navigation to sound an acoustic SOS and broadcast your GPS coordinates instantly.*";
    } else if (text.includes('route') || text.includes('transit') || text.includes('cab') || text.includes('travel')) {
        reply = "🚗 **Safe Travel & Route Guidance**:\n• Prefer well-illuminated major arterial roadways.\n• When booking cabs at night, verify license plate numbers and share trip tracking with trusted contacts.\n• In your Travix Emergency tab, you can access verified emergency transport options.";
    } else if (text.includes('blockchain') || text.includes('aadhaar') || text.includes('privacy') || text.includes('security')) {
        reply = "🔐 **Aadhaar & Blockchain Trust Protocol**:\nTravix verifies digital identity using SHA-256 cryptographic signatures. Each authorization event is sealed in an immutable Proof-of-Work ledger with difficulty 4 mining, ensuring audit records cannot be altered.";
    } else if (text.includes('women') || text.includes('female') || text.includes('solo')) {
        reply = "👩 **Women Traveler Safety Protocols**:\n• 24/7 dedicated helpline: Call **1091** or **181**.\n• Access the Travix Emergency Portal for safe rides, verified female drivers, and instant distress beacons.\n• Metro transit networks provide reserved women coaches at the front of each train.";
    } else {
        reply = `🛡️ **Travix AI Safety Assistant**: I'm monitoring active zones around you. You can ask me to:\n• Check safety conditions for any city or landmark\n• Locate nearest verified green safe zones\n• Recommend secure transit routes\n• Trigger emergency SOS and helpline guidance\n\nHow can I help protect your journey?`;
    }

    return res.status(200).json({ response: reply });
};
