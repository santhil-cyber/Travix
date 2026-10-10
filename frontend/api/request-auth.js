const crypto = require('crypto');

const DEMO_RESIDENTS = [
    { uid: '111122223333', name: 'Rajesh Kumar', dob: '1990-05-15', role: 'user' },
    { uid: '222233334444', name: 'Sunita Sharma', dob: '1985-11-22', role: 'user' },
    { uid: '333344445555', name: 'Amit Singh', dob: '2001-01-30', role: 'authority' }
];

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { aadhaarNumber, name, dob } = req.body || {};
    if (!aadhaarNumber || !name) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const cleanNum = String(aadhaarNumber).trim();
    const cleanName = String(name).trim().toLowerCase();

    const resident = DEMO_RESIDENTS.find(
        r => r.uid === cleanNum && r.name.toLowerCase() === cleanName
    );

    if (!resident) {
        return res.status(401).json({ error: 'Authentication Failed: Details did not match resident records.' });
    }

    const txnId = `txn-${crypto.randomBytes(6).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(cleanNum).digest('hex');

    return res.status(200).json({
        message: 'Authentication successful!',
        role: resident.role,
        txnId,
        hash
    });
};
