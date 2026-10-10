const crypto = require('crypto');
const db = require('../database.js'); // Assumes database.js is in the root folder
const { Block } = require('../services/blockchain.js');
const authLedger = require('../services/blockchainService.js');
const cryptoService = require('../services/cryptoService.js');

const handleAuthRequest = async (req, res) => {
    const { aadhaarNumber, name, dob } = req.body;
    if (!aadhaarNumber || !name || !dob) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        // We use the aadhaarNumber from the request body to check the database
        const verificationResult = await new Promise((resolve, reject) => {
            const sql = "SELECT role FROM residents WHERE uid = ? AND name = ? AND dob = ?";
            db.get(sql, [aadhaarNumber, name, dob], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        if (!verificationResult) {
            return res.status(401).json({ error: 'Authentication Failed: Details did not match.' });
        }

        const userRole = verificationResult.role;
        
        const pidXml = cryptoService.createPidXml({ uid: aadhaarNumber, name, dob });
        const signature = cryptoService.signData(pidXml);
        const txnId = `my-txn-${crypto.randomBytes(8).toString('hex')}`;
        
        // --- CHANGE #1: Sanitize the input before hashing ---
        // We trim whitespace to ensure the hash is always consistent.
        const cleanAadhaarNumber = aadhaarNumber.trim();
        const hashedUid = crypto.createHash('sha256').update(cleanAadhaarNumber).digest('hex');

        const blockData = {
            timestamp: Date.now(),
            hashedUid: hashedUid,
            authTxnId: txnId,
            requestPayload: pidXml,
            signature: signature
        };

        const newBlock = new Block(blockData.timestamp, blockData);
        authLedger.addBlock(newBlock);

        res.json({ 
            message: 'Authentication successful!',
            role: userRole 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

const getHistory = (req, res) => {
    const { uid } = req.params;
    
    // --- CHANGE #2: Sanitize the search input before hashing ---
    // We trim whitespace here as well to match the stored hash.
    const cleanUid = uid.trim();
    const hashedUidToSearch = crypto.createHash('sha256').update(cleanUid).digest('hex');
    
    // Filter the chain, skipping the Genesis block
    const history = authLedger.chain.slice(1).filter(block => 
        block.data.hashedUid === hashedUidToSearch
    );
    
    res.json(history);
};

const getChain = (req, res) => {
    res.json(authLedger);
};

module.exports = { handleAuthRequest, getChain, getHistory };