const { Blockchain } = require('./blockchain.js');

// Create a single instance of the blockchain to be used by the entire application
const authLedger = new Blockchain();

module.exports = authLedger;