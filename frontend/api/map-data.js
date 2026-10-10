module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const aiZones = [
        { id: 'ai_1', name: 'India Gate - High Security Tourist Precinct', type: 'safe', lat: 28.6129, lng: 77.2295, radius: 2500, source: 'ai' },
        { id: 'ai_2', name: 'Connaught Place - Monitored Commercial Hub', type: 'safe', lat: 28.6328, lng: 77.2197, radius: 2000, source: 'ai' },
        { id: 'ai_3', name: 'Qutub Minar - Heritage Safety Zone', type: 'safe', lat: 28.5244, lng: 77.1855, radius: 1800, source: 'ai' },
        { id: 'ai_4', name: 'Red Fort - Protected Tourist Corridor', type: 'safe', lat: 28.6562, lng: 77.2410, radius: 2200, source: 'ai' },
        { id: 'ai_5', name: 'Old Delhi - High Density Crowd Caution', type: 'warning', lat: 28.6505, lng: 77.2300, radius: 1500, source: 'ai' },
        { id: 'ai_6', name: 'Yamuna Riverbank - Monsoon Flood Caution', type: 'danger', lat: 28.6700, lng: 77.2600, radius: 3000, source: 'ai' },
        { id: 'ai_7', name: 'Jaipur Amer Fort - Monitored Heritage Area', type: 'safe', lat: 26.9855, lng: 75.8513, radius: 2500, source: 'ai' },
        { id: 'ai_8', name: 'Mumbai Colaba Tourist District', type: 'safe', lat: 18.9220, lng: 72.8347, radius: 2200, source: 'ai' }
    ];

    const manualZones = [
        { id: 1, name: 'Tawang Monastery - Verified Safe', type: 'safe', lat: 27.5875, lng: 91.8596, radius: 1500, source: 'manual' },
        { id: 2, name: 'Sela Pass - High Altitude Warning', type: 'warning', lat: 27.4891, lng: 92.1032, radius: 2000, source: 'manual' }
    ];

    return res.status(200).json({
        ai_generated_zones: aiZones,
        manual_override_zones: manualZones
    });
};
