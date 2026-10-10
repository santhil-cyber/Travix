module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const chain = [
        { index: 0, timestamp: 1735689600000, hash: '0000a1b2c3d4e5f6', previousHash: '0', data: 'Genesis Block' },
        { index: 1, timestamp: Date.now() - 3600000, hash: '0000b2c3d4e5f6a1', previousHash: '0000a1b2c3d4e5f6', data: { uidHash: 'e3b0c44298fc1c149afbf4c8996fb924', role: 'user', verified: true } },
        { index: 2, timestamp: Date.now() - 1800000, hash: '0000c3d4e5f6a1b2', previousHash: '0000b2c3d4e5f6a1', data: { uidHash: '3a5f22e7d3a0c7104b901df4f6e432a1', role: 'authority', verified: true } }
    ];

    return res.status(200).json({ chain, difficulty: 4 });
};
