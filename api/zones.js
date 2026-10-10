let inMemoryZones = [
    { id: 1, name: 'Tawang Monastery - Verified Safe', type: 'safe', lat: 27.5875, lng: 91.8596, radius: 1500 },
    { id: 2, name: 'Sela Pass - High Altitude Warning', type: 'warning', lat: 27.4891, lng: 92.1032, radius: 2000 }
];

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'POST') {
        const { name, type, lat, lng, radius } = req.body || {};
        if (!name || !type || !lat || !lng) {
            return res.status(400).json({ status: 'error', message: 'Missing zone fields' });
        }
        const newZone = {
            id: Date.now(),
            name,
            type,
            lat: Number(lat),
            lng: Number(lng),
            radius: Number(radius) || 1500
        };
        inMemoryZones.push(newZone);
        return res.status(201).json({ status: 'success', zone: newZone });
    }

    if (req.method === 'DELETE') {
        const id = req.query.id || req.body?.id;
        inMemoryZones = inMemoryZones.filter(z => String(z.id) !== String(id));
        return res.status(200).json({ status: 'success', message: 'Zone deleted' });
    }

    return res.status(200).json(inMemoryZones);
};
